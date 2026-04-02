# PolyMessenger Cognitive Engine + App Graph Integration Specification

| Field | Value |
|-------|-------|
| **Version** | v0.1.0 |
| **Status** | Draft |
| **Product** | Poly Messenger |
| **Lex Namespace** | `polylabs/polymessenger` |
| **App Graph** | `circuits/fl/polymessenger_app_graph.fl` |
| **CE Meaning** | `circuits/fl/polymessenger_meaning.fl` |
| **Upstream Dependency** | PolyKit v0.12.0+, eStream v0.22.0+ (CE Phase 1+) |
| **New Circuits** | 2 (`polymessenger_app_graph.fl`, `polymessenger_meaning.fl`) |
| **Total Circuits** | 13 (11 existing + 2 new) |

---

## 1. Overview

### Purpose

This specification defines how Poly Messenger integrates with the eStream Cognitive Engine and registers its circuit topology as an App Graph. PolyMessenger composes 11 FL circuits (8 modules + 3 graphs) into a Stratum module graph with CE meaning domains tuned for encrypted messaging workloads.

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| **100% FastLang** | Both new circuits are `.fl` source, compiled via FLIR codegen |
| **Zero-Linkage Compliant** | CE state isolated via HKDF context `poly-messenger-ce-v1` |
| **Composable** | Composes PolyKit CE adapter circuits via `EDGE_BRIDGE_TO` |
| **Lex-Isolated** | All CE observations stay within `polylabs/polymessenger/*` lex namespaces |

---

## 2. App Graph

### Module Inventory (11 modules)

| Module | Circuit File | Partition | SLA |
|--------|-------------|-----------|-----|
| `polymsg_encrypt` | `polymsg_encrypt.fl` | Backend | Premium |
| `polymsg_ratchet` | `polymsg_ratchet.fl` | Backend | Premium |
| `polymsg_relay` | `polymsg_relay.fl` | Backend | Premium |
| `polymsg_classify` | `polymsg_classify.fl` | Backend | Standard |
| `polymsg_incognito` | `polymsg_incognito.fl` | Backend | Premium |
| `polymsg_metering` | `polymsg_metering.fl` | Shared | Standard |
| `polymsg_platform_health` | `polymsg_platform_health.fl` | Shared | Standard |
| `polymsg_rbac` | `polymsg_rbac.fl` | Shared | Standard |
| `polymsg_contact_graph` | `graphs/polymsg_contact_graph.fl` | Backend | Standard |
| `polymsg_conversation_dag` | `graphs/polymsg_conversation_dag.fl` | Backend | Standard |
| `polymsg_relay_graph` | `graphs/polymsg_relay_graph.fl` | Backend | Premium |

### Intra-Graph Edges

- `polymsg_encrypt` → `polymsg_ratchet` (session key derivation)
- `polymsg_relay` → `polymsg_relay_graph` (route selection)
- `polymsg_relay` → `polymsg_encrypt` (onion layer encryption)
- `polymsg_classify` → `polymsg_rbac` (content policy enforcement)
- `polymsg_incognito` → `polymsg_encrypt` (ephemeral session establishment)
- `polymsg_contact_graph` → `polymsg_rbac` (trust and blocking enforcement)
- `polymsg_conversation_dag` → `polymsg_encrypt` (message ordering with encryption)
- `polymsg_metering` → `polymsg_relay` (relay hop accounting)
- `polymsg_platform_health` → `polymsg_relay_graph` (relay health overlay reads)

---

## 3. CE Meaning Domains

### 3.1 `messaging/conversation_patterns`

Tracks conversational dynamics to surface engagement insights and detect anomalies.

| Signal | Description | Crystallization Threshold |
|--------|-------------|--------------------------|
| Response time distribution | Median, p95, p99 response latency per conversation | 70 |
| Group dynamics | Member activity balance, lurker ratio, topic drift | 70 |
| Conversation lifecycle | Thread depth, reply chains, conversation decay rate | 70 |

### 3.2 `messaging/security`

Monitors encryption and relay health for proactive security posture.

| Signal | Description | Crystallization Threshold |
|--------|-------------|--------------------------|
| Ratchet health | Chain advance frequency, skipped key count, DH ratchet rate | 85 |
| Relay trust | Route diversity score, relay load distribution, stale relay count | 80 |
| Encryption failures | Decryption failure rate, tag verification failures, session establishment errors | 90 |

### 3.3 `messaging/engagement`

Aggregate usage metrics for product health and growth signals.

| Signal | Description | Crystallization Threshold |
|--------|-------------|--------------------------|
| Active users | DAU/WAU/MAU trends, session frequency | 65 |
| Volume trends | Messages sent/received per period, media vs text ratio | 65 |
| Feature adoption | Incognito mode usage, group creation rate, call frequency | 60 |

---

## 4. Noise Filter

### Suppression Rules

| Suppressed Event | Reason |
|-----------------|--------|
| Delivery receipts | High-frequency, low-signal (status updates, not conversations) |
| Typing indicators | Ephemeral UI state, no CE value |
| Presence flicker | Online/offline oscillation within 30s window |
| Heartbeat probes | Infrastructure health checks, not user activity |

### Signal Amplification

| Amplified Event | Reason |
|----------------|--------|
| Encryption failures | Immediate security concern — decryption or tag verification failure |
| Relay anomalies | Route degradation, jurisdiction concentration, capacity exhaustion |
| Ratchet stalls | Forward secrecy degraded if chain not advancing |
| Session establishment errors | ML-KEM encapsulation or HKDF derivation failures |

### Configuration

- Dedup window: 500ms (production), 0ms (development)
- Rate limit: 50 observations/s per circuit (production)
- Min signal confidence: 60%

---

## 5. SME Panels

### 5.1 E2E Encryption Health Panel

| Field | Value |
|-------|-------|
| Panel ID | `polymsg_e2e_encryption_health` |
| Domain Scope | `messaging/security` |
| Min Panelists | 3 |
| Specializations | `ratchet_protocol`, `key_exchange`, `forward_secrecy`, `session_management` |
| Calibration Floor | 80% (8000 bps) |
| Review Timeout | 24h |

Advisory triggers: ratchet stall > 60s, skipped key cache > 128 entries, decryption failure rate > 1%, session establishment latency > 200ms.

### 5.2 Relay Network Optimization Panel

| Field | Value |
|-------|-------|
| Panel ID | `polymsg_relay_optimization` |
| Domain Scope | `messaging/security` |
| Min Panelists | 3 |
| Specializations | `route_selection`, `jurisdiction_diversity`, `load_balancing`, `cover_traffic` |
| Calibration Floor | 75% (7500 bps) |
| Review Timeout | 12h |

Advisory triggers: jurisdiction concentration > 40% single country, relay load > 80% capacity, route latency > 500ms, cover traffic ratio < 10%.

---

## 6. Bridge Edges

### Cross-Product Bridges

| Bridge | Source Module | Target | Shared Fields |
|--------|-------------|--------|---------------|
| PolyKit blind_relay | `polymsg_relay` | `polykit_blind_relay` | `relay_config`, `route_policy`, `cover_traffic_config` |
| PolyKit media_stream | `polymsg_encrypt` | `polykit_media_stream` | `stream_config`, `codec_policy`, `bandwidth_allocation` |

---

## 7. Strategic Grant Config

| Grant | Scope |
|-------|-------|
| eStream Platform | CE primitives (SSM hidden state, observation ingestion, cortex advisors), Stratum graph storage, FLIR codegen |
| Paragon Bridge | Future bridge to Paragon compliance framework for regulated messaging use cases |

---

## 8. Circuit Inventory

### New CE Circuits (2)

| Circuit | File | Description |
|---------|------|-------------|
| `polymessenger_app_graph` | `circuits/fl/polymessenger_app_graph.fl` | 11-module app graph, edges, bridges, golden tests |
| `polymessenger_meaning` | `circuits/fl/polymessenger_meaning.fl` | 3 CE domains, noise filter, 2 SME panels, golden tests |

### Existing Circuits (11)

| Group | Circuits | Count |
|-------|----------|-------|
| **crypto** | `polymsg_encrypt`, `polymsg_ratchet` | 2 |
| **relay** | `polymsg_relay` | 1 |
| **policy** | `polymsg_classify`, `polymsg_incognito`, `polymsg_rbac` | 3 |
| **ops** | `polymsg_metering`, `polymsg_platform_health` | 2 |
| **graphs** | `polymsg_contact_graph`, `polymsg_conversation_dag`, `polymsg_relay_graph` | 3 |

### Total: 13 Circuits

| Category | Count |
|----------|-------|
| Existing (pre-CE) | 11 |
| New CE circuits | 2 |
| **Total** | **13** |

---

## 9. Dependencies

| Dependency | Version | Usage |
|------------|---------|-------|
| eStream CE | v0.22.0+ Phase 1+ | SSM hidden state, observation ingestion, cortex advisors |
| PolyKit CE | v0.12.0+ | `polykit_cognitive`, `polykit_noise_filter`, `polykit_sme`, `polykit_app_graph` |
| `polykit_blind_relay` | existing | Bridge target for relay integration |
| `polykit_media_stream` | existing | Bridge target for encrypted media streams |
| `polykit_identity` | existing | SPARK identity for HKDF derivation |
| `polykit_metering` | existing | Per-invocation metering with differential privacy |
