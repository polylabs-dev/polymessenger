# Poly Messenger Architecture

**Version**: 3.0
**Date**: February 2026
**Platform**: eStream v0.8.3
**Upstream**: PolyKit v0.3.0, eStream graph/DAG constructs
**Build Pipeline**: FastLang (.fl) → ESCIR → Rust/WASM codegen → .escd

---

## Overview

Poly Messenger is a post-quantum encrypted real-time messaging platform with blind relay, lattice amplification, and scatter-distributed storage. All cryptographic operations run in WASM (Rust). TypeScript is a DOM binding layer only.

This repo is a fresh build on the PolyKit + eStream graph/DAG architecture. Screen designs, hooks, and types are extracted from the original `polyquantum/polymessenger-app` (in `reference/`) as a starting point.

---

## Zero-Linkage Privacy

- **HKDF context**: `poly-messenger-v1` — independent from all other Poly products
- **Lex namespace**: `esn/global/org/polylabs/messenger`
- **user_id**: Derived from Poly Messenger-specific ML-DSA-87 public key. Cannot be linked to Poly Data, Poly Mail, or any other product identity.
- **StreamSight**: `polylabs.messenger.*` — no cross-product telemetry
- **Metering**: Own `metering_graph` instance under `polylabs.messenger.metering`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Poly Messenger Client                           │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  React Native UI (from reference/screens/)                      │  │
│  │  ChatScreen │ ConversationsScreen │ GroupCallScreen │ ...       │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                                │                                      │
│  ┌────────────────────────────┴───────────────────────────────────┐  │
│  │  Hooks Layer (from reference/hooks/)                             │  │
│  │  useMessaging │ useWebRTC │ useGroupCall │ usePrimeSigner │ ... │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                                │                                      │
│  ┌────────────────────────────┴───────────────────────────────────┐  │
│  │  Graph/DAG Layer (WASM)                                          │  │
│  │                                                                   │  │
│  │  graph contact_network   — contacts, groups, trust              │  │
│  │  dag message_thread      — message ordering + threading         │  │
│  │  graph relay_mesh        — blind relay topology                 │  │
│  │  graph user_graph        — per-product identity (from PolyKit) │  │
│  │  graph metering_graph    — per-product metering (from PolyKit) │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                                │                                      │
│  ┌────────────────────────────┴───────────────────────────────────┐  │
│  │  FastLang Circuits (WASM via .escd)                              │  │
│  │  polymsg_encrypt │ polymsg_relay │ polymsg_ratchet              │  │
│  │  polymsg_metering │ polymsg_classify                            │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                                │                                      │
│  ┌────────────────────────────┴───────────────────────────────────┐  │
│  │  eStream SDK (@estream/react-native)                             │  │
│  │  Wire protocol: QUIC/UDP :5000 │ WebTransport :4433             │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Graph/DAG Constructs

### Contact Network (`polymsg_contact_graph.fl`)

Contacts, groups, and trust relationships form a graph. This replaces flat contact lists with a relational model that supports trust verification, group membership, and blocking.

```fastlang
data ContactNode : app v1 {
    contact_id: bytes(16),
    user_id: bytes(32),
    display_name: bytes(128),
    phone_number: string,
    email: string,
    signing_pubkey: bytes(2592),
    encryption_pubkey: bytes(1568),
    security_tier: u8,
    verified_at: u64,
}
    store graph
    govern lex esn/global/org/polylabs/messenger
    cortex {
        redact [phone_number, email]
        obfuscate [display_name, user_id]
        infer on_write
        on_anomaly alert "messenger-security"
    }

data GroupNode : app v1 {
    group_id: bytes(16),
    name: bytes(128),
    creator_id: bytes(16),
    max_members: u32,
    created_at: u64,
}
    store graph
    govern lex esn/global/org/polylabs/messenger
    cortex {
        obfuscate [creator_id]
        infer on_write
    }

type KnowsEdge = struct {
    established_at: u64,
    verified: bool,
}

type BlockedEdge = struct {
    blocked_at: u64,
    reason: u8,
}

type GroupMemberEdge = struct {
    role: u8,
    joined_at: u64,
}

graph contact_network {
    node ContactNode
    node GroupNode
    edge KnowsEdge
    edge BlockedEdge
    edge GroupMemberEdge

    overlay trust_level: u8 curate delta_curate
    overlay last_message_ns: u64 bitmask delta_curate
    overlay message_count: u64 bitmask delta_curate
    overlay online_status: u8 curate delta_curate
    overlay unread_count: u32 bitmask delta_curate

    storage csr {
        hot @bram,
        warm @ddr,
        cold @nvme,
    }

    ai_feed contact_recommendation {
        model cortex_eslm
        features [trust_level, message_frequency, mutual_contacts, verification_status]
        anomaly_threshold 0.85
    }

    observe contact_network: [trust_level, message_count, online_status] threshold: {
        anomaly_score 0.85
        baseline_window 120
    }
}

series contact_series: contact_network
    merkle_chain true
    lattice_imprint true
    witness_attest true
```

Key circuits: `add_contact`, `verify_contact`, `block_contact`, `create_group`, `join_group`, `leave_group`.

### Message Thread DAG (`polymsg_conversation_dag.fl`)

Messages form a DAG within each conversation. Replies create parent edges. This enables threading, ordering, and causal consistency for offline/CRDT scenarios.

```fastlang
data MessageNode : app v1 {
    message_id: bytes(16),
    conversation_id: bytes(16),
    sender_id: bytes(16),
    content_hash: bytes(32),
    content_preview: string,
    sealed_envelope_hash: bytes(32),
    timestamp: u64,
    message_type: u8,
    classification: u8,
}
    store dag
    govern lex esn/global/org/polylabs/messenger
    cortex {
        redact [content_hash, content_preview]
        infer on_write
        on_anomaly alert "messenger-security"
        on_classification auto_apply
    }

type ReplyToEdge = struct {
    reply_type: u8,
}

type ReactionEdge = struct {
    reactor_id: bytes(16),
    emoji_code: u32,
    reacted_at: u64,
}

state_machine message_lifecycle {
    initial SENDING
    persistence wal
    terminal [DELETED, EXPIRED]
    li_anomaly_detection true

    SENDING -> SENT when relay_confirmed
    SENDING -> FAILED when relay_failed guard retry_limit_reached
    SENT -> DELIVERED when recipient_acked
    DELIVERED -> READ when recipient_read
    READ -> EXPIRED when expiration_reached guard has_expiration
    SENT -> EXPIRED when expiration_reached guard has_expiration
    DELIVERED -> DELETED when sender_deleted
    READ -> DELETED when sender_deleted
}

dag message_thread {
    node MessageNode
    edge ReplyToEdge
    edge ReactionEdge

    enforce acyclic
    sign ml_dsa_87

    overlay read_status: u8 curate delta_curate
    overlay expiration_ns: u64 curate delta_curate
    overlay reaction_count: u32 bitmask delta_curate
    overlay delivery_status: u8 curate delta_curate
    overlay classification_level: u8 curate delta_curate

    storage merkle_csr {
        hot @bram,
        warm @ddr,
        cold @nvme,
    }

    attest povc {
        witness threshold(2, 3)
    }

    ai_feed message_anomaly {
        model cortex_eslm
        features [send_rate, burst_pattern, reply_depth, conversation_velocity]
        anomaly_threshold 0.8
    }

    observe message_thread: [delivery_status, expiration_ns, classification_level] threshold: {
        anomaly_score 0.8
        baseline_window 60
    }
}

series message_series: message_thread
    merkle_chain true
    lattice_imprint true
    witness_attest true
```

Key circuits: `send_message`, `receive_message`, `mark_read`, `add_reaction`, `delete_message`, `expire_messages`.

### Relay Mesh (`polymsg_relay_graph.fl`)

The blind relay network is a graph. Relay nodes and routes are typed with real-time overlays for latency, capacity, and cover traffic. The AI feed selects optimal routes.

```fastlang
data RelayNode : app v1 {
    relay_id: bytes(16),
    endpoint_address: bytes(256),
    region: bytes(8),
    jurisdiction: bytes(8),
    capacity: u32,
    pubkey: bytes(2592),
    encryption_pk: bytes(1568),
    registered_at: u64,
    last_heartbeat: u64,
}
    store graph
    govern lex esn/global/org/polylabs/messenger/relay
    cortex {
        redact [endpoint_address]
        obfuscate [jurisdiction]
        infer on_read
        on_anomaly alert "messenger-ops"
    }

type RouteEdge = struct {
    hop_index: u8,
    established_at: u64,
    latency_ms: u32,
    bandwidth_mbps: u32,
}

graph relay_mesh {
    node RelayNode
    edge RouteEdge

    overlay latency_ns: u64 bitmask delta_curate
    overlay capacity_remaining: u32 bitmask delta_curate
    overlay cover_traffic_rate: u32 bitmask delta_curate
    overlay load_pct: u8 curate delta_curate

    storage csr {
        hot @bram,
        warm @ddr,
        cold @nvme,
    }

    ai_feed relay_selection {
        model cortex_eslm
        features [latency_ns, load_pct, capacity_remaining, jurisdiction_diversity, cover_traffic_rate]
        anomaly_threshold 0.8
    }

    observe relay_mesh: [latency_ns, load_pct, capacity_remaining] threshold: {
        anomaly_score 0.8
        baseline_window 30
    }
}

series relay_series: relay_mesh
    merkle_chain true
    lattice_imprint true
    witness_attest true
```

Key circuits: `register_relay`, `select_route`, `update_relay_health`, `rotate_route`.

---

## Stratum & Cortex Integration

Poly Messenger's three graph/DAG constructs — `contact_network`, `message_thread`, and `relay_mesh` — compose Stratum storage bindings and Cortex AI governance at the data-declaration level. Every node type declares its storage tier, lex governance path, and Cortex visibility policy inline.

### Stratum Storage Bindings

#### Contact Network & Relay Mesh (Graph — CSR)

| Tier | Backing | Purpose |
|------|---------|---------|
| `hot @bram` | Block RAM (FPGA) / L1 cache | Online status overlays, active relay health, trust levels |
| `warm @ddr` | DDR5 DRAM | Full contact graph, group membership, relay topology |
| `cold @nvme` | NVMe SSD / scatter-cas | Archived contacts, historical trust data, decommissioned relays |

#### Message Thread (DAG — Merkle-CSR)

The conversation DAG uses `storage merkle_csr` instead of plain `csr` — every node insertion is hash-chained into a Merkle tree, providing cryptographic proof of message ordering and integrity. Combined with `sign ml_dsa_87` (ML-DSA-87 PQ signature on every DAG mutation) and `attest povc { witness threshold(2, 3) }` (2-of-3 witness attestation), this creates a triple-verified causal history.

| Tier | Backing | Purpose |
|------|---------|---------|
| `hot @bram` | Block RAM (FPGA) / L1 cache | Active conversation DAG heads, delivery status overlays |
| `warm @ddr` | DDR5 DRAM | Full message DAGs for active conversations |
| `cold @nvme` | NVMe SSD / scatter-cas | Expired/deleted message tombstones, archived conversations |

#### Series

All three constructs produce `merkle_chain true`, `lattice_imprint true`, `witness_attest true` series — tamper-evident, lattice-timestamped, PoVC-witnessed audit logs for every graph/DAG mutation.

### Cortex Visibility Policies

Each `data` declaration carries a `cortex {}` block governing what the Cortex AI inference layer can access:

| Data Type | Graph | Policy | Effect |
|-----------|-------|--------|--------|
| **ContactNode** | `contact_network` | `redact [phone_number, email]`, `obfuscate [display_name, user_id]`, `infer on_write`, `on_anomaly alert "messenger-security"` | PII is fully stripped or hashed. Cortex sees contact patterns (trust levels, verification status, mutual contacts) but not identity. Anomalies route to security team. |
| **GroupNode** | `contact_network` | `obfuscate [creator_id]`, `infer on_write` | Creator identity hashed for group creation pattern analysis. |
| **MessageNode** | `message_thread` | `redact [content_hash, content_preview]`, `infer on_write`, `on_anomaly alert "messenger-security"`, `on_classification auto_apply` | Message content is fully opaque to Cortex. Inference operates on metadata only (send rate, burst patterns, reply depth). Classification labels auto-apply from inference. |
| **RelayNode** | `relay_mesh` | `redact [endpoint_address]`, `obfuscate [jurisdiction]`, `infer on_read`, `on_anomaly alert "messenger-ops"` | Relay endpoints are stripped. Jurisdiction is hashed. Cortex reads relay health for route optimization but cannot reconstruct the network topology. |

### Inference Triggers

- **`infer on_write`** (ContactNode, GroupNode, MessageNode): Cortex runs inference on every mutation — new contacts, group changes, message sends. The `contact_recommendation` AI feed scores trust patterns; the `message_anomaly` AI feed detects burst patterns and conversation velocity anomalies.
- **`infer on_read`** (RelayNode): Cortex inference triggers on relay health reads, enabling real-time route scoring via the `relay_selection` AI feed without requiring write-path latency.
- **Anomaly thresholds**: Contact network at 0.85 (120s window), message thread at 0.8 (60s window), relay mesh at 0.8 (30s window) — progressively tighter for lower-latency constructs.

### Feedback Handlers

- **`on_anomaly alert "messenger-security"`**: Contact and message anomalies (unusual contact addition patterns, message bursts, verification failures) route to the messenger security team via StreamSight.
- **`on_anomaly alert "messenger-ops"`**: Relay anomalies (load spikes, latency degradation, heartbeat failures) route to the messenger ops team.
- **`on_classification auto_apply`**: MessageNode classification labels (e.g., spam detection, content policy) auto-apply from Cortex inference without human review — the `classification_level` overlay updates in-band.
- **State machine integration**: `message_lifecycle` transitions feed into anomaly detection (`li_anomaly_detection true`). Rapid SENDING→FAILED cycles or mass deletion triggers Cortex scoring.

### Quantum State (.q) Capability

All graph/DAG data is `.q`-ready. The merkle-CSR message DAG with ML-DSA-87 signing provides the cryptographic substrate for quantum-state snapshots. When hardware targets support it, each series can checkpoint into `.q` quantum-committed snapshots — lattice-imprinted, witness-attested point-in-time states verifiable against the merkle chain without full replay. For the relay mesh, `.q` snapshots capture topology state for forensic analysis of routing decisions.

---

## Security Tiers

| Tier | Price | Messages/mo | Scatter | Amplification | Incognito |
|------|-------|-------------|---------|---------------|-----------|
| FREE | $0 | 100 | No | None | No |
| PERSONAL | $4.99 | 10,000 | Yes | (2,5) | Basic |
| PROFESSIONAL | $19.99 | Unlimited | Yes | (3,7) | Full |
| ENTERPRISE | Custom | Unlimited | Yes | (5,9)+ | Custom |

Tier enforcement via PolyKit `metering_graph` + `subscription_lifecycle` state machine. Each tier unlocks progressively more relay hops, scatter breadth, and cover traffic.

---

## What Gets Rebuilt vs Extracted

### Extracted from `polyquantum/polymessenger-app` (in `reference/`)

- 21 screen components (React Native UI designs)
- 14 hooks (messaging, WebRTC, calls, PRIME, threshold, etc.)
- 7 type definition files (messaging, prime, threshold, subscription, etc.)

### Rebuilt on PolyKit + Graph

- All crypto moves into FastLang circuits composing PolyKit profiles
- Identity types (`SecurityTier`, `PrimeIdentity`, `DeviceInfo`) use PolyKit `user_graph` instead of standalone structs (~350 lines deleted)
- Threshold types (`ThresholdConfig`, `Guardian`, `RecoveryRequest`) use PolyKit `user_graph` guardian edges (~340 lines deleted)
- Metering types (`ResourceDimension`, `MeterReading`) use PolyKit `metering_graph` (~475 lines deleted)
- Subscription types (`TierLimits`, `TIER_PRICING`) use PolyKit `subscription_lifecycle` (~190 lines deleted)
- Contact management uses `contact_network` graph instead of flat ESLite tables
- Message storage uses `message_thread` DAG instead of flat arrays
- Relay selection uses `relay_mesh` graph with `ai_feed` instead of random selection

### Backend Crates (from `polyquantum/polymessenger`)

- `poly-core` — refactored to import PolyKit types, delete duplicates
- `poly-relay` — refactored to operate on `relay_mesh` graph
- `poly-edge` — edge node deployment (minimal changes)
- `poly-sdk-backend` — platform SDK for third-party integration → feeds into `@polysdk/messenger`

---

## Directory Structure

```
polymessenger/
├── reference/
│   ├── screens/        21 React Native screen components (design reference)
│   ├── hooks/          14 hooks (functional reference)
│   └── types/          7 type files (to be replaced by PolyKit graph types)
├── circuits/fl/
│   ├── polymsg_encrypt.fl
│   ├── polymsg_relay.fl
│   ├── polymsg_ratchet.fl
│   ├── polymsg_metering.fl
│   ├── polymsg_classify.fl
│   └── graphs/
│       ├── polymsg_contact_graph.fl
│       ├── polymsg_conversation_dag.fl
│       └── polymsg_relay_graph.fl
├── crates/
│   ├── poly-core/
│   ├── poly-relay/
│   ├── poly-edge/
│   └── poly-sdk-backend/
├── packages/
│   ├── sdk-browser/
│   ├── sdk-mobile/
│   └── poly-messages-widget/
├── docs/
│   └── ARCHITECTURE.md
├── CLAUDE.md
└── Cargo.toml
```

---

## Roadmap

### Phase 1: Core Messaging (Q2 2026)
- `contact_network` graph + `message_thread` DAG
- FastLang circuits for encryption, relay, ratchet
- React Native app with extracted screen designs
- SPARK auth (`poly-messenger-v1`)
- Basic blind relay (single hop)

### Phase 2: Calls & Groups (Q3 2026)
- WebRTC with PQ key exchange
- Group messaging via `contact_network` graph
- `relay_mesh` graph with multi-hop routing
- Incognito progressive activation

### Phase 3: Platform SDK (Q4 2026)
- `@polysdk/messenger` marketplace component
- Console widget (`poly-messages-widget`)
- Third-party app integration

### Phase 4: Enterprise (Q1 2027)
- Enterprise admin via lex bridge (opt-in)
- Compliance archival
- Custom relay infrastructure
- DLP integration
