---
title: "UPF-NF"
excerpt: "In-house user plane function for 5g-sa B2B use cases"
---

This page presents the UPF-NF project. It is a feasability study to make an in-house UPF using DPDK for figuring out the problem of the CPU bottleneck for ultra wide bandwitdh backbone. Recently, the case of 800Gbps has been studied by Alexandre Cassen using gtp-guard. He proved that kernel XDP with eBPF programs can ensure the full 800Gbps backbone capacity. Even if the compelling results obtained with gtp-guard, this study based on DPDK is needed to be ready for future network hardware improvements where the CPU bottleneck can represent a limitation and a kernel by-pass will represent the only solution for this limitation.

# Brief overview on the architecture and technology

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
- nf-lib: it is a container of building blocks that are common to every NF but too small to deserve a library of their own: subscriber and session identity (IDs, keys, subscriber map, UE IP pool), forwarding primitives (GTP-U FIB, relay, tunnel bridge, paired datapath, XDP forwarder) and accounting and policing (token bucket, PGW-CDR sink)
- cdr-lib: the standard to generate CDRs. The logic is taken by gtp-lib  
- ops: It provides a metrics registry, Prometheus text exporter, bounded HTTP/1.0 server, health endpoint, admin/drain socket, and an assembled OpsService that exposes readiness, metrics, and graceful shutdown.
- dpdkpp: the DPDK wrappers. It expose few interfaces to dpdk features wrapped into RAII objects.

# Testbed and laboratory qualification

For testing the correctness and performance of the UPF we need to use a laboratory with a dedicated hardware. Since the UPF is based on DPDK, also the smoking tests have to be done with adequate hardware. We set-up a very simple laboratory based on two machines, that we called DUT [Device Under Test] and TRex [TRex is the cisco traffic generator, used for testing the UPF].

- DUT specs
     - Motherboard: GIGABYTE A520M S2H Motherboard AM4 socket
     - CPU: 4.0 GHz AMD Ryzen3-4100
     - Network Card: 40Gbps ConnectX-3 Pro dual port

- TRex specs
     - Motherboard: Z790 Aorus Elite AX
     - CPU: 5.4 GHz Core i7-13700K
     - Network Card: 40Gbps ConnectX-3 Pro dual port

![labo — assembly](../../assets/images/labo.png)

The set-up is cheap but good for a POC. I focused the test campaign on the ability of the UPF to saturate the hardware capabilities, measuring the latency and the number of Milions Packet per Second (Mpps) taken in charge by the UPF. I also explored some edge scenarios like quota check, traffic control and management with assigned GBR.

I also explored the connection with the control-plane (the SMF mocked using a python script) via 1Gbps interface.
The DUT need a custom set-up optimization for work as best as he can, he have to set-up the hugepages, pinned the CPU for upf specific use, selecting them by their NUMA and Socket affinity.


## Test campaign - main goals

--- correctness
Speed limits set for a user or for a single app were respected exactly. When a user ran out of data allowance, traffic stopped and a report was sent. Sleeping phones had their data held and were woken up. Billing records were produced with the right reasons. Copies of traffic for monitoring were exact. IPv6 worked. Handovers between antennas signalled correctly. Network slices stayed isolated. Only one point is open: how a "total" data allowance should be counted, which is a design choice, not a fault.

--- performance
We measured how much traffic the UPF can move on a small 4-core desktop with a 40 gigabit network card. It filled the whole link in both directions without losing a single packet, and kept doing so with 256 users and all speed limits and data allowances switched on. Delay stayed in the tens of microseconds. Time-critical traffic, such as factory robots, kept its very low delay even while ordinary traffic flooded the link. Guaranteed-bandwidth users received exactly what they were promised, and the link could be throttled to a slower backhaul. A 24-hour endurance run is in progress, with the result due today.

--- control plane
We checked how the UPF talks to its controller, the SMF, which tells it which users exist and what rules apply. Setting up users works at scale: ten thousand users were created without a single refusal. When the controller crashed and restarted, the UPF noticed, cleaned up the old users, and accepted the new ones, with no stale state left behind. An earlier bug, where the UPF answered a restarted controller with old cached replies, is confirmed fixed. IPv6 addresses, per-app rules, handover signals and network-slice names were all accepted correctly. Only one timing measurement, bulk deletion of users, is still to be taken.

