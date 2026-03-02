use estream_test::{
    Journey, JourneyParty, JourneyStep, StepAction, JourneyMetrics,
    assert_metric_emitted, assert_blinded, assert_povc_witness,
};
use estream_test::convoy::{ConvoyContext, ConvoyResult};
use estream_test::stratum::{StratumVerifier, CsrTier, SeriesMerkleChain};
use estream_test::cortex::{CortexVisibility, RedactPolicy, ObfuscatePolicy};
use estream_test::blind_relay::{RelayHop, CoverTrafficConfig};

pub struct PolymessengerJourney;

impl Journey for PolymessengerJourney {
    fn name(&self) -> &str {
        "polymessenger_e2e"
    }

    fn description(&self) -> &str {
        "End-to-end journey for Polymessenger: send, blind relay, receive, cover traffic, read receipts, session isolation"
    }

    fn parties(&self) -> Vec<JourneyParty> {
        vec![
            JourneyParty::new("alice")
                .with_spark_context("poly-messenger-v1")
                .with_role("sender"),
            JourneyParty::new("bob")
                .with_spark_context("poly-messenger-v1")
                .with_role("recipient"),
            JourneyParty::new("charlie")
                .with_spark_context("poly-messenger-v1")
                .with_role("observer"),
        ]
    }

    fn steps(&self) -> Vec<JourneyStep> {
        vec![
            // Step 1: Alice sends an encrypted message
            JourneyStep::new("alice_sends_message")
                .party("alice")
                .action(StepAction::Execute(|ctx: &mut ConvoyContext| {
                    let bob_id = ctx.party_id("bob");

                    let session = ctx.polymessenger().establish_session(
                        &bob_id,
                        "ml-kem-1024",
                    )?;

                    ctx.set("session_id", &session.id);
                    ctx.set("session_epoch", &session.epoch.to_string());

                    let msg = ctx.polymessenger().send(
                        &session.id,
                        "Meeting at 3pm — bring the lattice proofs",
                    )?;

                    ctx.set("message_id", &msg.id);

                    assert!(msg.encrypted);
                    assert_eq!(msg.kem_algo, "ml-kem-1024");
                    assert!(msg.ciphertext_len > 0);

                    assert_metric_emitted!(ctx, "polymessenger.message.sent", {
                        "kem_algo" => "ml-kem-1024",
                        "encrypted" => "true",
                    });

                    assert_povc_witness!(ctx, "polymessenger.send", {
                        witness_type: "message_dispatch",
                        session_id: &session.id,
                    });

                    Ok(())
                }))
                .timeout_ms(8_000),

            // Step 2: Blind relay routes the message through mix nodes
            JourneyStep::new("blind_relay_routes")
                .party("alice")
                .depends_on(&["alice_sends_message"])
                .action(StepAction::Execute(|ctx: &mut ConvoyContext| {
                    let message_id = ctx.get::<String>("message_id");

                    let relay_trace = ctx.polymessenger().trace_relay(&message_id)?;

                    assert!(relay_trace.hop_count >= 3, "Minimum 3 relay hops required");
                    for hop in &relay_trace.hops {
                        assert!(hop.blinded, "Each hop must use blinded routing");
                        assert!(hop.padding_applied, "Uniform padding required");
                    }

                    assert!(relay_trace.cover_traffic_injected);
                    assert!(relay_trace.timing_jitter_applied);

                    // No relay node should see both sender and recipient
                    for hop in &relay_trace.hops {
                        assert!(
                            !(hop.knows_sender && hop.knows_recipient),
                            "No single hop may know both sender and recipient"
                        );
                    }

                    assert_blinded!(ctx, "polymessenger.relay.routed", {
                        field: "sender_id",
                        blinding: "onion_layer",
                    });

                    assert_blinded!(ctx, "polymessenger.relay.routed", {
                        field: "recipient_id",
                        blinding: "onion_layer",
                    });

                    assert_metric_emitted!(ctx, "polymessenger.relay.routed", {
                        "hop_count" => &relay_trace.hop_count.to_string(),
                        "cover_traffic" => "true",
                    });

                    Ok(())
                }))
                .timeout_ms(10_000),

            // Step 3: Bob receives and decrypts the message
            JourneyStep::new("bob_receives_message")
                .party("bob")
                .depends_on(&["blind_relay_routes"])
                .action(StepAction::Execute(|ctx: &mut ConvoyContext| {
                    let session_id = ctx.get::<String>("session_id");

                    let inbox = ctx.polymessenger().poll_inbox(&session_id)?;
                    assert!(!inbox.messages.is_empty());

                    let msg = &inbox.messages[0];
                    let decrypted = ctx.polymessenger().decrypt(msg)?;

                    assert_eq!(decrypted.plaintext, "Meeting at 3pm — bring the lattice proofs");
                    assert!(decrypted.signature_valid);
                    assert_eq!(decrypted.kem_algo, "ml-kem-1024");

                    assert_metric_emitted!(ctx, "polymessenger.message.received", {
                        "decrypted" => "true",
                        "signature_valid" => "true",
                    });

                    assert_povc_witness!(ctx, "polymessenger.receive", {
                        witness_type: "message_delivery",
                        session_id: &session_id,
                    });

                    Ok(())
                }))
                .timeout_ms(8_000),

            // Step 4: Verify cover traffic indistinguishability
            JourneyStep::new("verify_cover_traffic")
                .party("charlie")
                .depends_on(&["bob_receives_message"])
                .action(StepAction::Execute(|ctx: &mut ConvoyContext| {
                    let traffic_analysis = ctx.polymessenger().analyze_traffic_pattern()?;

                    assert!(
                        traffic_analysis.real_vs_cover_distinguishable == false,
                        "Cover traffic must be indistinguishable from real traffic"
                    );

                    assert!(traffic_analysis.uniform_packet_sizes);
                    assert!(traffic_analysis.timing_variance_within_threshold);
                    assert!(traffic_analysis.sample_size >= 100);

                    assert_metric_emitted!(ctx, "polymessenger.cover_traffic.verified", {
                        "distinguishable" => "false",
                        "uniform_sizes" => "true",
                    });

                    Ok(())
                }))
                .timeout_ms(15_000),

            // Step 5: Alice receives read receipt from Bob
            JourneyStep::new("alice_read_receipt")
                .party("alice")
                .depends_on(&["verify_cover_traffic"])
                .action(StepAction::Execute(|ctx: &mut ConvoyContext| {
                    let message_id = ctx.get::<String>("message_id");
                    let session_id = ctx.get::<String>("session_id");

                    let receipt = ctx.polymessenger().poll_receipt(
                        &session_id,
                        &message_id,
                    )?;

                    assert!(receipt.delivered);
                    assert!(receipt.read);
                    assert!(receipt.pq_signed);

                    assert_blinded!(ctx, "polymessenger.receipt", {
                        field: "reader_id",
                        blinding: "hmac_sha3",
                    });

                    assert_metric_emitted!(ctx, "polymessenger.receipt.received", {
                        "read" => "true",
                    });

                    Ok(())
                }))
                .timeout_ms(8_000),

            // Step 6: Verify session isolation and Stratum storage
            JourneyStep::new("verify_session_isolation")
                .party("alice")
                .depends_on(&["alice_read_receipt"])
                .action(StepAction::Execute(|ctx: &mut ConvoyContext| {
                    let session_id = ctx.get::<String>("session_id");

                    // Sessions between different pairs must be cryptographically isolated
                    let charlie_id = ctx.party_id("charlie");
                    let other_session = ctx.polymessenger().establish_session(
                        &charlie_id,
                        "ml-kem-1024",
                    )?;

                    assert_ne!(session_id, other_session.id);
                    assert_ne!(
                        ctx.polymessenger().session_key_fingerprint(&session_id)?,
                        ctx.polymessenger().session_key_fingerprint(&other_session.id)?,
                    );

                    // Stratum verification
                    let stratum = StratumVerifier::new(ctx);
                    let csr = stratum.verify_csr_tiers(&session_id)?;
                    assert!(csr.tier_matches(CsrTier::Ephemeral));
                    assert!(csr.shard_distribution_valid);

                    let merkle = stratum.verify_series_merkle_chain(&session_id)?;
                    assert!(merkle.chain_intact);
                    assert!(merkle.root_hash_valid);

                    assert_metric_emitted!(ctx, "polymessenger.session.isolated", {
                        "csr_tier" => "ephemeral",
                    });

                    Ok(())
                }))
                .timeout_ms(10_000),

            // Step 7: Verify blind telemetry and Cortex visibility
            JourneyStep::new("verify_blind_telemetry")
                .party("alice")
                .depends_on(&["verify_session_isolation"])
                .action(StepAction::Execute(|ctx: &mut ConvoyContext| {
                    let telemetry = ctx.streamsight().drain_telemetry("poly-messenger-v1");

                    for event in &telemetry {
                        assert_blinded!(ctx, &event.event_type, {
                            field: "user_id",
                            blinding: "hmac_sha3",
                        });

                        assert_blinded!(ctx, &event.event_type, {
                            field: "message_content",
                            blinding: "absent",
                        });

                        assert_blinded!(ctx, &event.event_type, {
                            field: "session_key",
                            blinding: "absent",
                        });
                    }

                    let cortex = CortexVisibility::new(ctx);
                    cortex.assert_redacted("polymessenger", RedactPolicy::ContentFields)?;
                    cortex.assert_obfuscated("polymessenger", ObfuscatePolicy::PartyIdentifiers)?;

                    assert!(telemetry.len() >= 6, "Expected at least 6 telemetry events");

                    for event in &telemetry {
                        assert!(
                            event.namespace.starts_with("poly-messenger-v1"),
                            "Telemetry leaked outside poly-messenger-v1 namespace: {}",
                            event.namespace
                        );
                    }

                    Ok(())
                }))
                .timeout_ms(5_000),
        ]
    }

    fn metrics(&self) -> JourneyMetrics {
        JourneyMetrics {
            expected_events: vec![
                "polymessenger.message.sent",
                "polymessenger.relay.routed",
                "polymessenger.message.received",
                "polymessenger.cover_traffic.verified",
                "polymessenger.receipt.received",
                "polymessenger.session.isolated",
            ],
            max_duration_ms: 75_000,
            required_povc_witnesses: 3,
            lex_namespace: "poly-messenger-v1",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use estream_test::convoy::ConvoyRunner;

    #[tokio::test]
    async fn run_polymessenger_journey() {
        let runner = ConvoyRunner::new()
            .with_blind_relay()
            .with_streamsight("poly-messenger-v1")
            .with_stratum()
            .with_cortex();

        runner.run(PolymessengerJourney).await.expect("Polymessenger journey failed");
    }
}
