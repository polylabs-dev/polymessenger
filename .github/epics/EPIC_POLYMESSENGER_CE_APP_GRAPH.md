# Epic: PolyMessenger — CE + App Graph Integration

> **Repo**: `polymessenger`
> **Spec**: `specs/POLYMESSENGER_CE_APP_GRAPH_SPEC.md`
> **Priority**: P0
> **Status**: Planned

---

## Summary

Integrate the Cognitive Engine and App Graph into Poly Messenger. This registers all 11 messenger modules (8 circuits + 3 graphs) into the Stratum module graph, wires 9 dependency edges plus 2 cross-graph PolyKit bridges (blind_relay, media_stream), and configures 3 CE meaning domains with noise filtering and 2 SME panels.

---

## Tasks

### Phase 1: App Graph Registration

- [ ] **P1.1** — Implement `polymessenger_app_graph.fl` with 11 module definitions and `make_polymsg_module` helper
- [ ] **P1.2** — Wire 9 `EDGE_REQUIRES` dependency edges in `polymessenger_app_graph_register`
- [ ] **P1.3** — Implement `polymessenger_register_bridge_edges` (2 bridges: PolyKit blind_relay, PolyKit media_stream)
- [ ] **P1.4** — Add `find_polymsg_module_id` helper and `polymsg_app_graph_metrics` store
- [ ] **P1.5** — Add 3 golden tests for graph registration, bridge edges, and module factory

### Phase 2: CE Meaning Domains

- [ ] **P2.1** — Define `ConversationPatternsDomain`, `MessagingSecurityDomain`, `MessagingEngagementDomain` data types with cortex blocks
- [ ] **P2.2** — Implement `register_conversation_patterns_domain` circuit (threshold 70, impact 75)
- [ ] **P2.3** — Implement `register_messaging_security_domain` circuit (threshold 85, impact 95)
- [ ] **P2.4** — Implement `register_messaging_engagement_domain` circuit (threshold 65, impact 60)
- [ ] **P2.5** — Add observation streams (`conversation_pattern_obs`, `messaging_security_obs`, `messaging_engagement_obs`)

### Phase 3: Noise Filter & SME Panels

- [ ] **P3.1** — Define `MessengerNoiseFilterConfig` with delivery receipt, typing indicator, presence flicker suppression
- [ ] **P3.2** — Implement `configure_messenger_noise_filter` (suppress ephemeral UI state, 30s flicker window)
- [ ] **P3.3** — Define `E2EEncryptionHealthPanel` and `RelayOptimizationPanel` data types
- [ ] **P3.4** — Implement `configure_e2e_encryption_health_panel` (4 specializations, 80% calibration floor)
- [ ] **P3.5** — Implement `configure_relay_optimization_panel` (4 specializations, 75% calibration floor)
- [ ] **P3.6** — Implement `polymessenger_register_ce` orchestrator and `full_ce_pipeline_setup` golden test

### Phase 4: Integration & Validation

- [ ] **P4.1** — Verify all 11 modules resolve via `find_polymsg_module_id` after registration
- [ ] **P4.2** — Verify bridge edges connect to live PolyKit blind_relay and media_stream module graphs
- [ ] **P4.3** — Verify CE domains produce observations that flow through noise filter to cortex
- [ ] **P4.4** — Verify SME panels accept and adjudicate crystallization candidates
- [ ] **P4.5** — Run full FLIR codegen (WASM + Rust targets) on both circuit files

---

## Acceptance Criteria

1. `polymessenger_app_graph_register` produces a `CsrStorage` with exactly 11 nodes and 9 edges
2. `polymessenger_register_bridge_edges` adds 2 bridge nodes with `EDGE_BRIDGE_TO` edges
3. All 3 meaning domains register with correct crystallization thresholds (70, 85, 65)
4. Noise filter suppresses delivery receipts, typing indicators, presence flicker, heartbeat probes
5. Both SME panels require min 3 panelists with calibration floors >= 75%
6. `polymessenger_register_ce` orchestrator returns true on successful full pipeline setup
7. All golden tests pass under `fl test --golden`
8. Both files compile to WASM and Rust via `fl build --target wasm,rust`

---

## Files

| File | Description |
|------|-------------|
| `circuits/fl/polymessenger_app_graph.fl` | 11-module app graph, 9 edges, 2 bridges, golden tests |
| `circuits/fl/polymessenger_meaning.fl` | 3 CE domains, noise filter, 2 SME panels, orchestrator, golden tests |
| `specs/POLYMESSENGER_CE_APP_GRAPH_SPEC.md` | Integration spec |
