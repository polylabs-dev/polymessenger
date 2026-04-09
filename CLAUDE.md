# Q Messenger

**GitHub**: [polylabs-dev/qmessenger](https://github.com/polylabs-dev/qmessenger)
**Platform**: eStream v0.22.0
**Depends on**: QKit v0.3.0, eStream graph/DAG constructs

## Architecture: 100% FastLang

Q Messenger is **100% FL** — no hand-written Rust. All application logic is expressed as FastLang SmartCircuits that compile via FLIR codegen to WASM (browser/Tauri) and Rust (server). The product is a composition of 11 FL circuits over QKit and eStream primitives.

## Purpose

Post-quantum encrypted real-time messaging with blind relay, lattice amplification, and scatter storage. Built on QKit + eStream graph/DAG architecture.

## Zero-Linkage Privacy

HKDF context: `q-messenger-v1`. User identities are completely isolated from all other Q products. StreamSight telemetry stays within `polyqlabs.messenger.*` lex namespace.

## Structure

- `circuits/fl/` — FastLang circuit definitions (11 circuits: encryption, relay, ratchet, classify, incognito, metering, platform health, RBAC)
- `circuits/fl/graphs/` — Graph/DAG constructs (contact_network, conversation_dag, relay_mesh)
- `crates/` — **LEGACY** Rust crates (see note below). Superseded by FL circuits.
- `reference/` — Screen designs, hooks, and types extracted from `polyquantum/qmessenger-app` (design reference only)
- `packages/` — TypeScript SDKs and console widgets
- `docs/` — Architecture and design documents

## FL Circuits (11 total)

| Circuit | File | Purpose |
|---------|------|---------|
| Encrypt | `qmsg_encrypt.fl` | ML-KEM-1024 session establishment, AES-256-GCM encrypt/decrypt, key rotation |
| Ratchet | `qmsg_ratchet.fl` | Double-ratchet forward secrecy (chain advance, init, encrypt, decrypt) |
| Relay | `qmsg_relay.fl` | Blind relay routing, cover traffic, onion forwarding |
| Classify | `qmsg_classify.fl` | Message classification and content policy |
| Incognito | `qmsg_incognito.fl` | Ephemeral identity and session unlinkability |
| Metering | `qmsg_metering.fl` | Per-invocation metering with differential privacy |
| Platform Health | `qmsg_platform_health.fl` | Health checks, anomaly detection, circuit diagnostics |
| RBAC | `qmsg_rbac.fl` | Role-based access control for groups and channels |
| Contact Graph | `graphs/qmsg_contact_graph.fl` | Contact network: contacts, groups, trust, blocking |
| Conversation DAG | `graphs/qmsg_conversation_dag.fl` | Message ordering with reply threading, `enforce acyclic` |
| Relay Graph | `graphs/qmsg_relay_graph.fl` | Blind relay topology with `ai_feed relay_selection` |

## Legacy Rust Crates (DO NOT USE — reference only)

The `crates/` directory contains hand-written Rust code that has been **fully superseded** by the FL circuits in `circuits/fl/`. These crates are retained as reference material but are not part of the build or deployment pipeline.

| Crate | Superseded By |
|-------|---------------|
| `q-core/src/circuit/` | `qmsg_encrypt.fl`, `qmsg_ratchet.fl` |
| `q-core/src/crypto/` | eStream platform crypto primitives (ML-KEM, AES-GCM, SHA3, BLAKE3, HKDF) |
| `q-core/src/types/` | Type definitions within each FL circuit |
| `q-core/src/graph/` | `qmsg_contact_graph.fl`, `qmsg_conversation_dag.fl`, `qmsg_relay_graph.fl` |
| `q-core/src/wire.rs` | eStream platform stream/relay wire protocol |
| `q-sdk/` | FL circuit composition replaces SDK layer |
| `q-messenger-wasm/` | FLIR WASM codegen replaces hand-written WASM bindings |

## Key Graphs

- `graph contact_network` — contacts, groups, trust, blocking
- `dag message_thread` — message ordering with reply threading, `enforce acyclic`
- `graph relay_mesh` — blind relay topology with `ai_feed relay_selection`

## Commit Convention

Commit to the GitHub issue or epic the work was done under.

## Cross-Repo Coordination

This repo is part of the [polylabs-dev](https://github.com/polylabs-dev) organization, coordinated through the **AI Toolkit hub** at `toddrooke/ai-toolkit/`.

For cross-repo context, strategic priorities, and the master work queue:
- `toddrooke/ai-toolkit/CLAUDE-CONTEXT.md` — org map and priorities
- `toddrooke/ai-toolkit/scratch/BACKLOG.md` — master backlog
- `toddrooke/ai-toolkit/repos/polylabs-dev.md` — this org's status summary
