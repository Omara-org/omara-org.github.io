---
title: "Composition"
permalink: /composition/
toc: true
toc_sticky: true
toc_label: "On this page"
sidebar:
  nav: "projects"
---

Every network function in this family is built the same way: one engine at the bottom, standalone protocol libraries above it, and a thin assembly on top that consumes only the public interfaces of the layers below. The assembly is the network function. Everything else is shared.

## The three layers

```
L3   upf-nf, gtpu-probe-nf, gtp-router-nf, cgn-nf, bng-nf ...
      │ wiring only: <gtp/...>, <nf/...>, <omadica/core/...>
      │ enforced mechanically by an include-hygiene test
L2   gtp-lib      GTP-U wire codecs (dual-compiled), session table, path
      │           management, the N4 endpoint and PFCP codec, the PDR/FAR/QER/URR
      │           rule model
      nf-lib      what several NFs share: UE IP pool, TEID counter, identities
      cdr-lib     X.690 BER encoder, TS 32.298 PGW-CDR builder, TS 32.297 spool
      omadica-ops metrics, admin socket, operability
      dpdkpp      C++23 RAII bricks over DPDK for the DPDK datapath
L1   omadica-core (HCS)   the engine: executor, pools, rings, CPU affinity,
                          reactor plumbing, AF_XDP ingress and egress, eBPF loader
```

| Layer | Role | Owns |
|---|---|---|
| **L1** engine | Runs things. Knows nothing about GTP or PFCP. | Zero-allocation work-stealing executor, lock-free pools and queues, NUMA-aware placement, epoll plumbing, AF_XDP and eBPF fast path. |
| **L2** libraries | Speak protocols. Know nothing about any particular NF. | Wire codecs, session tables, rule model, N4 endpoint, CDR encoding, operability. |
| **L3** network functions | Decide policy and wire components together. | One assembly header that shows the complete picture, plus a handful of NF-side roles. |

## The five invariants

These hold at every layer. They are what makes the projects composable rather than merely adjacent.

1. **One contract, two compilers.** Anything the kernel and userspace must both agree on is a single C-compatible header, compiled once by clang to eBPF and once by the C++ toolchain. Nothing is duplicated by hand, so nothing can drift.
2. **Bounded everything.** Every queue, pool and table has an explicit bound. Overload is a counted, returned signal, never unbounded memory growth.
3. **Interfaces over reach-ins.** Static contracts are C++20 concepts. Runtime and deployment choices are abstract classes. A network function never touches a library's internals.
4. **Components own their counters; the assembly aggregates.** One injected log and metrics pair, pull-based publication, the owner chooses the cadence.
5. **The NF is the wiring.** One assembly file shows the complete picture. Configuration is parsed into plain values before any component exists, so a bad flag dies before anything is constructed.

## The marginal-cost ledger

The point of the split is measured, not asserted. Each network function keeps a ledger of its own source line count, and every function after the first is held to at most one third of the reference. The reference is UPF-NF.

| Network function | Libraries used | Status |
|---|---|---|
| **UPF-NF** | engine, gtp-lib, nf-lib, cdr-lib, ops, dpdkpp | the reference, the denominator |
| GTP-U usage probe | engine, gtp-lib (session, path) | built, one third of the reference |
| GTP router | plus GTP-C codec, cdr-lib | built |
| GTP proxy | plus the GTP-C proxy map | built |
| I-UPF (N9 relay) | rules with keep-outer-header | built |
| Load generator | wire builders, engine TX | built |
| Mirror and lawful tap | session mirror flag, capture | built |
| CGN | cgn-lib, cdr-lib | built, at the bound |
| BNG | pppoe-lib, cdr-lib | built, over the bound and minuted as such |

The pattern the ledger shows is the one the architecture was designed for: the second network function cost one third of the first, with no new protocol or engine code, and the first was itself an order of magnitude smaller than the monolith it mirrors.

## Where to read next

- [UPF-NF](/projects/upf-nf/), the reference network function, is the best place to see all five invariants at work in one assembly.
- The [practices](/practices/) section will collect the coding rules these invariants translate into, one page per rule.
