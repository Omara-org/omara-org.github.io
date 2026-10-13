---
title: "About"
permalink: /about/
---

**Own your core.**

We build open infrastructure for mobile core networks: the high-performance substrate that 5G network functions are made of. We start where the packets do, in the Linux kernel with eBPF and XDP data paths, in DPDK where the NIC is owned outright, and in a lock-free, zero-allocation C++23 runtime engineered for the latency budgets of a real telecom network, where a signalling storm must become counted backpressure and never an outage.

The goal is simple to state and hard to do: make the mobile core something an operator can build, not just buy. The fastest layers of a 5G core, the user-plane data path and the GTP tunnelling engine underneath it, are re-implemented inside every vendor appliance and shared by no one. We are building those layers as open, embeddable, measurable libraries, so that a network operator with strong engineers and commodity hardware can own the network it runs.

## How we build

Everything is grounded in the 3GPP specifications (TS 29.281, TS 29.244, TS 23.501 and their siblings) and in measurement. Every queue and pool has an explicit bound, overload is a counted and returned signal, and performance is demonstrated on calibrated harnesses rather than asserted. The engine ships the plumbing, not a framework: the reactor, the wiring and the network functions stay yours to write.

The [composition](/composition/) page describes the layered stack this leads to. The [projects](/projects/) pages describe what has been built on it.

## Get in touch

The code behind this site lives on [GitHub](https://github.com/Omara-org/omara-org.github.io). Open an issue there to start a conversation.
