---
title: "UPF-NF"
excerpt: "In-house user plane function for 5G-SA B2B use cases"
---
This page presents UPF-NF, an in-house feasibility study of a 5G User Plane Function built on DPDK. The question behind it is whether a userspace, poll-mode datapath is a viable foundation for a very high-throughput user plane, where the CPU, rather than the network card, tends to become the limit. 

The UPF-NF explores a complementary route to kernel sockets: the same user-plane model, but in userspace on a DPDK poll-mode datapath. In these pages we present the DPDK datapath end to end and report its measured behaviour as-is on the lab rig we have (a two-node 40 GbE ConnectX-3 setup driven by TRex).

Our mesurements have focused on:

- zero-loss throughput (RFC 2544 binary search)
- small-frame packet rate
- latency under load
- multi-core scaling [Not completed, in progress]

UPF-NF is therefore not a bare GTP forwarder. It implements PFCP on N4 towards the SMF, GTP-U on N3, and the PDR/FAR/QER/URR pipeline that classifies each packet, applies the matching forwarding, QoS and usage rules, and buffers downlink traffic for idle UEs.

# Architecture and technology

UPF-NF is written in C++23 and follows a small set of strict rules: Google C++ style, composition with one type per file, constructor injection, and no raw resource handling. Every resource is owned by an RAII object, including the DPDK features like EAL, mempools, ethdev queues, rings, hash tables, QSBR RCU, meters, the scheduler are wrapped once, in a separate library we call **dpdkpp**, and the UPF never touches the C API directly.

This splits the problem in two: 

* DPDK complexity lives in dpdkpp, 
* UPF logic lives in UPF-NF, 

and neither can tangle with the other. 
The following picture shows how the components are composed into the UPF.

![upf-nf — one assembly, constructor-injected](../../assets/images/upf-nf-assembly.svg)

The boxes on top are the fundamentals bricks. They were designed to be independent and general as possible so that other network functions can be built from the same engines, protocols and libraries. 

The components are:

- **HCS**, a high-concurrency scheduler, an in-house library refined over the years with modern C++. It owns the control-plane side of the UPF: PFCP, the slow path and the ops endpoints. It is not used in the DPDK fast path, where DPDK's own lcore model schedules the work.
- **gtp-lib**, the largest library at about 24K LOC. It holds everything about the 3GPP user plane that is not a datapath: the protocols, the rule model and the reference behaviour. Its five core layers are:
  1. wire: GTP-U encoding and decoding;
  2. pfcp: the N4 codec and endpoint (TS 29.244);
  3. rules: the compact model a datapath executes: PDR, FAR, QER and URR with
     their limits, the QoS class, SDF filters and the session's Network
     Instance;
  4. adapt: maps PFCP messages onto that model;
  5. session: the session table, downlink bindings, buffering state and the
     per-flow sets.
- **nf-lib**, building blocks common to every NF but too small for a library of their own: subscriber and session identity (IDs, keys, subscriber map, UE IP pool), forwarding primitives and accounting and policing (token bucket, PGW-CDR sink).
- **cdr-lib**, the charging library: a clean-room X.690 BER encoder, the TS 32.298 PGW-CDR builder and a TS 32.297 on-disk spool. It is standalone and takes  main value structs, so it depends on nothing and is reused by more than one NF.
- **ops**, the operability surface: a metrics registry, Prometheus text exporter, bounded HTTP/1.0 server, health endpoint, admin/drain socket, and an assembled OpsService exposing readiness, metrics and graceful shutdown.
- **dpdkpp**, the DPDK wrappers: RAII objects over EAL, mempools, ethdev queues, rings, rte_hash tables, a flow table, QSBR RCU, meters and the scheduler.

## The datapaths

The same rule engine runs on three datapaths. The Linux socket datapath is the reference oracle: slow, simple, and the definition of correct behaviour.The DPDK datapath is the subject of this study, and it is gated by differential tests that require every frame it emits to be byte-identical to the oracle's.

On DPDK each lcore runs to completion on its own RX queue. Sessions are sharded by TEID; a frame that lands on the wrong shard is handed over through a ring (own-or-dispatch), so no lock is taken on the fast path. Session lookup is an **rte_hash** table, and rule updates from PFCP are published through QSBR RCU so the fast path never stalls on the control plane. QER rate limits are enforced with DPDK meters; GBR guarantees and port shaping use an **rte_sched** scheduler
lcore per port. Frames the kernel should answer (ARP, ICMP, anything not a session) are punted to the reactor through a net_tap port.

# Testbed and laboratory qualification

Correctness and performance of a DPDK-based UPF can only be tested on real hardware, so even the smoke tests run on the lab rig. The rig is two machines: the DUT (device under test), which runs upf-nf, and the tower, which runs TRex, the Cisco traffic generator, together with the SMF emulator and the bench kit.

![labo — assembly](../../assets/images/labo.png)

- DUT
  - Motherboard: GIGABYTE A520M S2H (AM4)
  - CPU: AMD Ryzen 3 4100, 4 cores / 8 threads, 3.8 GHz base (4.0 GHz boost), 4 MB L3
  - RAM: 7 GB usable, 2 x 1 GB hugepages reserved at boot
  - NIC: Mellanox ConnectX-3 Pro, dual-port 40 GbE (mlx4 PMD)
- Tower (TRex)
  - Motherboard: GIGABYTE Z790 Aorus Elite AX
  - CPU: Intel Core i7-13700K, 8P + 8E cores, up to 5.4 GHz
  - NIC: Mellanox ConnectX-3 Pro, dual-port 40 GbE
- Links
  - Two 40G QSFP+ DAC cables back to back: port 0 is N3 (GTP-U), port 1 is N6.
  - The onboard GbE ports form a management LAN that carries N4 (PFCP), SSH and the metrics scrape.
- Software
  - DUT: upf-nf with the DPDK datapath on DPDK 25.11.3 (with librte_sched).
  - Tower: TRex v2.87, the Python SMF emulator for N4, and the bench scripts.

The mlx4 PMD is bifurcated: there is no vfio, no IOMMU setup and no device binding, and the kernel netdevs stay present next to the DPDK ports. The only driver tuning is the mlx4 steering mode, set on the kernel command line.

The DUT is tuned the usual way for a DPDK box: CPUs 1-3 and 5-7 are isolated with isolcpus and reserved for the datapath lcores, CPUs 0 and 4 keep the
housekeeping threads and the reactor, the governor is pinned to performance, C-states are disabled, irqbalance is off, and interrupt coalescing on the NIC is set to zero.

The setup is cheap, but adequate for a proof of concept. The test campaign focused on the ability of the UPF to saturate the 40 GbE links, measuring the packet rate forwarded in millions of packets per second (Mpps) and the latency under load. Latency is measured by TRex's latency stream, which is only valid below a few Mpps returned, so the latency figures come from runs under that threshold. Beyond throughput, the campaign also exercised the control-plane features that a plain forwarder lacks: URR volume quotas and thresholds with usage reports, QER MBR policing, GBR guarantees through the per-port scheduler, downlink buffering with Downlink Data Notification, and PFCP session management against the SMF emulator over the management GbE link.


# Results

All figures below come from the October 2026 campaign on the rig described above, with two datapath lcores (two TEID shards) unless noted, 1518-byte frames unless noted, and RFC 2544 binary search (60–100 % of line rate, 8 iterations, 10 s trials) for the zero-loss rows.

### Performance

| Test | Result |
|---|---|
| Uplink, 1518 B | 39.42 Gb/s, zero loss |
| Downlink, 1518 B | 39.42 Gb/s at 0.01 % (NIC TX-ring refusals at the search point) |
| Both directions, 1518 B | 19.74 + 19.74 Gb/s at 0.01 % each way |
| 256 sessions, MBR + volume thresholds armed, 75 % load | 29.61 Gb/s, zero loss |
| Uplink, 128 B, 256 sessions | 11.51 Mpps, zero loss (software ceiling ≈ 16 Mpps; NIC-side loss above ≈ 12 Mpps) |
| Latency at 90 % load (avg / p99 / max) | 26 / 40 / 90 µs |
| Delay-critical GBR flow under best-effort saturation, p99.99 | 90 µs (1 shard), 50 µs (2 shards) |
| GBR guarantee under saturation | 30.93 Mb/s delivered on 30 configured |
| Backhaul shaping, 5G cap on the 40G link | 4.811 Gb/s |
| Software scheduler lcore (port TM) | 39.42 Gb/s at 1518 B, +2 µs at 90 %; ≈ 6.4 Mpps at 128 B per scheduler lcore |
| IPv6 outer + inner, uplink 1518 B | 39.23 Gb/s, zero loss |
| 24 h soak at 90 %, every feature armed | 126 G frames each way at 17.76 Gb/s, zero software loss, latency flat |

The link, not the UPF, is the ceiling in the 1518-byte rows: 39.42 Gb/s is
the 40 GbE line rate after GTP-U overhead. The small-frame row is where the
software limit shows.

### Correctness at rate

- QER MBR enforced per session and per flow to within 0.1 %.
- URR volume quotas and thresholds: traffic stopped at the quota and the usage
  report named the right URR; one open design question on how a total-only
  quota is metered (uplink only today), which is a choice, not a fault.
- Downlink buffering for idle UEs with Downlink Data Notification, then
  delivery on resume.
- PGW-CDRs (TS 32.298) with the correct service conditions.
- Mirror: copies equal to delivered at 1, 2 and 4 Mpps; ceiling ≈ 0.75 M
  records/s, bounded by the reactor thread.
- End Marker on handover, with the FORW → BUFF transition verified.
- Network slices by Network Instance isolated under saturation of one slice.

### Control plane (PFCP, N4)

- 10,000 sessions established with zero rejections; 10,000 deleted in 1.62 s.
- SMF restart detected from the Recovery Time Stamp; all stale sessions
  released, new ones accepted; the earlier response-cache replay bug is
  confirmed fixed on the wire.
- IPv6 UE addresses, SDF filters, End Marker triggers and Network Instance
  names accepted and applied.

### Known limits on this rig

- Downlink with one shard tops out at ≈ 2.26 Mpps (27.5 Gb/s at 1518 B),
  independent of the tunnel address family.
- The hardware port shaper is refused by the ConnectX-3; port TM runs in
  software only here.
- The software scheduler is below the 8 Mpps per lcore target at 128 B.
- The DUT-side soak counters (memory, periodic reports) are still to be read.
