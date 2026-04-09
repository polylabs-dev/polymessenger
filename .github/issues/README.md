# Q Messenger — Issue Tracker

> **GitHub org**: [polylabs-dev](https://github.com/polylabs-dev) | **Repo**: [polylabs-dev/qmessenger](https://github.com/polylabs-dev/qmessenger)
> **Architecture**: [ARCHITECTURE.md v3.0](../../docs/ARCHITECTURE.md)

## Migration Context

Q Messenger consolidates work from three source repos into a single fresh build:

| Source Repo | Version | What It Contains | Disposition |
|-------------|---------|------------------|-------------|
| `polyquantum/qmessenger` | v0.8.1 | Backend: 4 `.flir.yaml` circuits, 5 Rust crates, ESF schemas, Incognito specs | **Reference only** — redesign on v0.9.1 |
| `polyquantum/qmessenger-app` | v0.8.0 | Mobile: React Native 0.74.2, 25 screens, 16 hooks, 64 services, 28 components | **Selective extraction** — screens/hooks/types |
| `polylabs-dev/qmessenger` | v0.9.1 target | Fresh build: ARCHITECTURE.md v3.0, 42 reference files, zero implementation | **Canonical repo** |

Supersedes `polyquantum/qmessenger/.github/issues/014-monorepo-consolidation.md`.

---

## Epic 01: FastLang Circuits — Design Fresh

Write all graph/DAG constructs and circuits from scratch using ARCHITECTURE.md v3.0 pseudocode as blueprint.

| # | Issue | Priority | Status |
|---|-------|----------|--------|
| 001 | `qmsg_contact_graph.fl` — `graph contact_network` (ContactNode, GroupNode, KnowsEdge, BlockedEdge, GroupMemberEdge, overlays: trust_level/last_message_ns/unread_count, ai_feed contact_recommendation) | P0 | Open |
| 002 | `qmsg_conversation_dag.fl` — `dag message_thread` (MessageNode, ReplyToEdge, ReactionEdge, state_machine message_lifecycle: DRAFT→SENDING→SENT→DELIVERED→READ→EXPIRED→DELETED, enforce acyclic) | P0 | Open |
| 003 | `qmsg_relay_graph.fl` — `graph relay_mesh` (RelayNode, RouteEdge, overlays: latency_ns/capacity_remaining/cover_traffic_rate/load_pct, ai_feed relay_selection) | P0 | Open |
| 004 | `qmsg_encrypt.fl` — PQ Double Ratchet (ML-KEM-1024 / ML-DSA-87 / ChaCha20-Poly1305) | P0 | Open |
| 005 | `qmsg_relay.fl` — Blind relay routing with VRF path selection | P0 | Open |
| 006 | `qmsg_ratchet.fl` — Session ratchet state progression on Stratum | P1 | Open |
| 007 | `qmsg_metering.fl` — 8-dimension metering with per-product lex isolation | P1 | Open |
| 008 | `qmsg_classify.fl` — Message classification and scatter policy | P1 | Open |

**New constructs** (not in old codebase):
- Stratum storage layer (KV paths for contacts, sessions, messages — replaces HashMap)
- Cortex AI governance (visibility annotations on message data, contact trust scoring)
- Scatter-CAS backed relay mailboxes (replaces in-memory `Vec<StoredMessage>`)
- QKit profiles (shared RBAC, group_hierarchy, metering from qkit/)

## Epic 02: Rust Crates — Scaffold on v0.9.1

| # | Issue | Priority | Status |
|---|-------|----------|--------|
| 009 | `q-core` — Core types, graph/DAG bindings, Stratum client, scatter-cas client | P0 | Open |
| 010 | `poly-relay` — Blind relay server with VRF routing, scatter-cas mailboxes, PoVC discard attestation | P0 | Open |
| 011 | `poly-edge` — Edge node: collect/reassemble, cover traffic generator, mimicry profiles | P1 | Open |
| 012 | `q-sdk-backend` — Backend service SDK for relay orchestration and metering | P1 | Open |

## Epic 03: Mobile App — React Native 0.76+

| # | Issue | Priority | Status |
|---|-------|----------|--------|
| 013 | Project scaffold: RN 0.76+, React Navigation v7, monorepo setup | P0 | Open |
| 014 | Design system: centralized tokens, Reanimated 3 animations | P0 | Open |
| 015 | QKit SDK integration (`@polyqlabs/qkit-react-native`) | P0 | Open |
| 016 | SPARK auth flow (device-bound ML-DSA-87 keys, visual key unlock) | P0 | Open |
| 017 | Chat screen (adapt from reference/screens/ChatScreen — 1667 lines of UX logic) | P0 | Open |
| 018 | Conversations list screen (adapt from reference/screens/ConversationsScreen) | P0 | Open |
| 019 | Contact management screens | P1 | Open |
| 020 | Group creation and management screens | P1 | Open |
| 021 | Voice/video call screens (adapt from reference/screens/CallScreen) | P1 | Open |
| 022 | Settings and profile screens | P2 | Open |
| 023 | Guardian recovery ceremony screen (adapt from reference/screens/GuardianRecoveryScreen) | P2 | Open |

## Epic 04: Selective Extraction

Bring over valuable components from polyquantum repos. The 42 files already in `reference/` remain as design reference.

### Extract (high value)

| # | Issue | Source | What to Extract |
|---|-------|--------|-----------------|
| 024 | ESF schemas → FastLang types | `qmessenger/schemas/` | `messaging.esf.yaml`, `contacts.esf.yaml`, `platform.esf.yaml`, `qmessenger.spark-actions.yaml` — wire format definitions translate to FL type shapes |
| 025 | Incognito specs → architecture docs | `qmessenger/specs/` | `POLY_INCOGNITO.md` (VRF scatter, erasure coding, traffic mimicry profiles), `INCOGNITO_ACTIVATION.md` (.escd stealth delivery) |
| 026 | Native modules → platform bridges | `qmessenger-app/android/`, `ios/` | CallKit (iOS + Android ConnectionService), ScreenProtection (FLAG_SECURE), QUIC bridge — OS-level patterns don't change with eStream version |
| 027 | Spark visual identity components | `qmessenger-app/src/components/spark/` | SparkScanner, SparkDisplay, RelationshipSpark — visual identity concepts |
| 028 | Test journey specs → test scaffolding | `qmessenger/crates/poly-test/` | p2p_messaging, relay_routing, blind_connection, session_establishment journey scenarios |

### Already Extracted (in reference/)

- 21 screen files (business logic, state management, data requirements)
- 16 hook files (API signatures: useMessaging, useCall, useGroupCall, useThresholdSigning, useGuardianRecovery, useSubscription)
- 6 type definition files (messaging.ts, group.ts, platform.ts, prime.ts, threshold.ts, subscription.ts)

### Do NOT Extract (redesign from scratch)

| Component | Why Not |
|-----------|---------|
| 5 Rust crates (q-core, poly-relay, poly-edge, q-sdk-backend, poly-test) | v0.8.1, flat structs, HashMap storage, stub servers, zero graph/DAG |
| 4 `.flir.yaml` circuits | Translate intent to `.fl`, don't port the YAML |
| 64 service files | Tightly coupled to v0.8.0 `@estream/react-native` SDK |
| 4 SDK packages | v0.8.x wrappers — rebase on QKit + eStream v0.9.1 |
| Navigation, design system, animations | Build properly with React Navigation v7, design tokens, Reanimated 3 |
| Build/test infrastructure | RN 0.74.2 outdated — fresh project on RN 0.76+ |

## Epic 05: Enterprise

| # | Issue | Priority | Status |
|---|-------|----------|--------|
| 029 | Admin console widget: user management, compliance controls | P2 | Open |
| 030 | Data retention policies via lex governance | P2 | Open |
| 031 | Compliance export (eDiscovery-compatible, PoVC-attested) | P2 | Open |
| 032 | Marketplace .escx packaging for self-hosted deployment | P2 | Open |
| 033 | Enterprise RBAC integration (group_hierarchy.fl, rbac.fl from QKit) | P2 | Open |

## Epic 06: Metering & Billing

| # | Issue | Priority | Status |
|---|-------|----------|--------|
| 034 | 8D metering integration (per-message, per-relay-hop, per-storage-byte) | P1 | Open |
| 035 | Tier enforcement: Free/Premium/Pro/Enterprise limits | P1 | Open |
| 036 | Incognito progressive enablement (Premium: scatter routing, Pro: full mimicry) | P1 | Open |

---

## Upstream Dependencies

| Dependency | Source | Status |
|-----------|--------|--------|
| QKit shared circuits | `polylabs-dev/qkit/` | Active development |
| SPARK auth SDK | `estream/crates/estream-spark/` | Available |
| Scatter-CAS | `estream/crates/estream-scatter-cas/` | Available |
| Stratum storage | eStream v0.9.1 | Available |
| Cortex AI governance | eStream v0.9.1 | Available |
| StreamSight observability | eStream v0.9.1 | Available |
