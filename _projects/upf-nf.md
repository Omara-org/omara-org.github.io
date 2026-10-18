---
title: "UPF-NF"
excerpt: "In-house user plane function for 5g-sa B2B use cases"
---

This page presents the UPF-NF project. It is a feasability study to make an in-house UPF using DPDK for figuring out the problem of the CPU bottleneck for ultra wide bandwitdh backbone. Recently, the case of 800Gbps has been studied by Alexandre Cassen using gtp-guard. He proved that kernel XDP with eBPF programs can ensure the full 800Gbps backbone capacity. Even if the compelling results obtained with gtp-guard, this study based on DPDK is needed to be ready for future network hardware improvements where the CPU bottleneck can represent a limitation and a kernel by-pass will represent the only solution for this limitation.

# Brief overview on the architecture and technology used

The UPF-NF is written totally in C++ std=20, using rigid good coding practice policies. All the implementation are RAII to prevent as much as possible the memory leaks, and the DPDK parts needed for this project (a famous library written in C) have been wrapped into C++ RAII objects. In this way, we can use the DPDK C++ wrappers library (that we called DPDKPP) for easily managing the non trivial features of DPDK, and split the complexity of the problem out in two:

* DPDK complexity
* UPF logic complexity

In this way, we focus a lot of time writing an independent C++ DPDK wrappers, focus all the implementation on the DPDK, and, in a second moment, we used the easy interfaces of DPDKPP for building the UPF. The results is a complete decorrelation of the two level of complexity preventing as much as possible bugs due to tangled implementation of dpdk with upf business logic.

The following picture shows how the different components are composed to create the UPF.

![upf-nf — one assembly, constructor-injected](../../assets/images/upf-nf-assembly.svg)

On top, you can see the components. They are the bricks which can be used to create your NFs, and in this case we create an UPF. I tried to create the bricks as much independent and general as possible in order to be used, also in the future, to create other network function based on the same engines/libraries/protocols. The main goal of the project is the feasibility study of upf based on dpdk, but as secondary goal I tried to generalize the minimal briks to create NFs and make them independent. In this way, we can easily compose the brick (+ minimal effort for the specific NF) for creating new service making easily to follow the 3GPP network release.

The components are:
- HCS: it is an high concurrency scheduler. I start this project during my years in Siemens, and year by year I refined it using the new features of modern C++. It is not used in the dpdk fast-path where dpdk has his own managing object for scheduling the task on the lcores. It is used for managing the traffic to and from the control plane.
- gtp-lib: It is the most larger library, with its 24K LOC. It holds everything about the 3GPP user plane that is not a datapath: the protocols, the rule model and the reference behaviour. It is based on five layers:
     1. The wire layer encodes and decodes GTP-U 
     2. The PFCP layer is the N4 codec and endpoint for TS 29.244
     3. The rules layer is the compact model a datapath can execute: PDR, FAR, QER and URR with their limits, the QoS class, SDF filters and the session's Network Instance. 
     4. The adapt layer maps PFCP messages onto that model. 
     5. The session layer keeps the session table, downlink bindings, buffering state and the per-flow sets.
- nf-lib: It is a container of other protocols that, somehow are common to each NF, but cannot be classified of deserved a separate library e.g. Subscriber and sessions identity, forwording primitives, account and policies
- cdr-lib: the standard to generate CDRs. The logic is taken by gtp-lib  
- ops: 
- dpdkpp: the DPDK wrappers. It expose few interfaces to dpdk features wrapped into RAII objects.