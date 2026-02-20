# Poly Messenger

**GitHub**: [polylabs-dev/polymessenger](https://github.com/polylabs-dev/polymessenger)
**Platform**: eStream v0.8.3
**Depends on**: PolyKit v0.3.0, eStream graph/DAG constructs

## Purpose

Post-quantum encrypted real-time messaging with blind relay, lattice amplification, and scatter storage. Fresh build on PolyKit + eStream graph/DAG architecture.

## Zero-Linkage Privacy

HKDF context: `poly-messenger-v1`. User identities are completely isolated from all other Poly products. StreamSight telemetry stays within `polylabs.messenger.*` lex namespace.

## Structure

- `reference/` — Screen designs, hooks, and types extracted from `polyquantum/polymessenger-app` (design reference only)
- `circuits/fl/` — FastLang circuit definitions (encryption, relay, ratchet, metering)
- `circuits/fl/graphs/` — Graph/DAG constructs (contact_network, message_thread, relay_mesh)
- `crates/` — Rust backend crates (poly-core, poly-relay, poly-edge, poly-sdk-backend)
- `packages/` — TypeScript SDKs and console widgets
- `docs/` — Architecture and design documents

## Key Graphs

- `graph contact_network` — contacts, groups, trust, blocking
- `dag message_thread` — message ordering with reply threading, `enforce acyclic`
- `graph relay_mesh` — blind relay topology with `ai_feed relay_selection`

## Commit Convention

Commit to the GitHub issue or epic the work was done under.
