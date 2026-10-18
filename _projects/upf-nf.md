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

![upf-nf — one assembly, constructor-injected](../../assets/images/upf-nf-assembly.svg)
