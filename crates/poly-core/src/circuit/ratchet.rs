use zeroize::Zeroize;

use crate::crypto::{
    aes_gcm_decrypt, aes_gcm_encrypt, blake3_hash, concat_bytes, hkdf_sha3, mlkem_decaps,
    mlkem_encaps, mlkem_keygen, sha3_512_truncated_32,
};
use crate::types::{
    ChainKey, MessageKey, RatchetDecryptResult, RatchetEncryptResult, RatchetHeader, RatchetState,
};
use crate::{Error, Result};

/// FL circuit: advance_chain
/// Derives message key and next chain key from current chain
pub fn advance_chain(chain_key: &ChainKey, index: u64) -> (MessageKey, ChainKey) {
    let idx_bytes = index.to_le_bytes();
    let msg_input = concat_bytes(&[chain_key, &[0x01], &idx_bytes]);
    let chain_input = concat_bytes(&[chain_key, &[0x02], &idx_bytes]);
    (sha3_512_truncated_32(&msg_input), sha3_512_truncated_32(&chain_input))
}

/// FL circuit: init_ratchet
/// Initialize a new double ratchet from session establishment.
/// The shared_secret comes from the session establishment KEM exchange --
/// both sides already hold the same value. The ratchet derives root key
/// and chain keys from it deterministically.
pub fn init_ratchet(
    shared_secret: &[u8; 32],
    our_pk: &[u8],
    our_sk: &[u8],
    their_pk: &[u8],
    is_initiator: bool,
) -> Result<RatchetState> {
    let (first, second) = if our_pk < their_pk {
        (our_pk, their_pk)
    } else {
        (their_pk, our_pk)
    };
    let context = concat_bytes(&[first, second]);
    let context_hash = blake3_hash(&context);

    let root_material = hkdf_sha3(shared_secret, &context_hash, 64);
    let mut root_key = [0u8; 32];
    root_key.copy_from_slice(&root_material[..32]);
    let chain_seed = &root_material[32..64];

    let (send_label, recv_label) = if is_initiator {
        (0x01u8, 0x02u8)
    } else {
        (0x02u8, 0x01u8)
    };

    let send_chain_key = sha3_512_truncated_32(&concat_bytes(&[chain_seed, &[send_label]]));
    let recv_chain_key = sha3_512_truncated_32(&concat_bytes(&[chain_seed, &[recv_label]]));

    Ok(RatchetState {
        root_key,
        send_chain_key,
        recv_chain_key,
        send_chain_index: 0,
        recv_chain_index: 0,
        our_ratchet_keypair_pk: our_pk.to_vec(),
        our_ratchet_keypair_sk: our_sk.to_vec(),
        their_ratchet_pubkey: their_pk.to_vec(),
        previous_send_count: 0,
        skipped_keys: vec![],
    })
}

/// FL circuit: ratchet_encrypt
/// Advance the send chain and encrypt
pub fn ratchet_encrypt(
    state: &RatchetState,
    plaintext: &[u8],
) -> Result<(RatchetEncryptResult, RatchetState)> {
    let (mut message_key, next_chain_key) =
        advance_chain(&state.send_chain_key, state.send_chain_index);

    let nonce_seed = blake3_hash(&concat_bytes(&[
        &message_key,
        &state.send_chain_index.to_le_bytes(),
    ]));
    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&nonce_seed[..12]);

    let header = RatchetHeader {
        ratchet_pubkey: state.our_ratchet_keypair_pk.clone(),
        previous_chain_length: state.previous_send_count,
        message_index: state.send_chain_index,
    };

    let aad = concat_bytes(&[
        &header.ratchet_pubkey,
        &header.message_index.to_le_bytes(),
    ]);
    let (ciphertext, tag) = aes_gcm_encrypt(&message_key, &nonce, plaintext, &aad)?;

    message_key.zeroize();

    let new_state = RatchetState {
        root_key: state.root_key,
        send_chain_key: next_chain_key,
        recv_chain_key: state.recv_chain_key,
        send_chain_index: state.send_chain_index + 1,
        recv_chain_index: state.recv_chain_index,
        our_ratchet_keypair_pk: state.our_ratchet_keypair_pk.clone(),
        our_ratchet_keypair_sk: state.our_ratchet_keypair_sk.clone(),
        their_ratchet_pubkey: state.their_ratchet_pubkey.clone(),
        previous_send_count: state.previous_send_count,
        skipped_keys: state.skipped_keys.clone(),
    };

    Ok((
        RatchetEncryptResult {
            header,
            ciphertext,
            nonce,
            tag,
        },
        new_state,
    ))
}

/// FL circuit: ratchet_decrypt
/// Perform DH ratchet step if new pubkey, then decrypt
pub fn ratchet_decrypt(
    state: &RatchetState,
    header: &RatchetHeader,
    ciphertext: &[u8],
    nonce: &[u8; 12],
    tag: &[u8; 16],
) -> Result<RatchetDecryptResult> {
    let their_pk_hash = sha3_512_truncated_32(&header.ratchet_pubkey);
    let current_pk_hash = sha3_512_truncated_32(&state.their_ratchet_pubkey);

    let working_state = if their_pk_hash != current_pk_hash {
        let kem_result = mlkem_encaps(&header.ratchet_pubkey)?;
        let kem_secret = mlkem_decaps(&state.our_ratchet_keypair_sk, &kem_result.ciphertext)?;

        let root_material = hkdf_sha3(&state.root_key, &kem_secret, 64);
        let mut new_root = [0u8; 32];
        new_root.copy_from_slice(&root_material[..32]);
        let new_recv_chain: [u8; 32] = sha3_512_truncated_32(&root_material[32..64]);

        let new_kp = mlkem_keygen();
        let kem_result2 = mlkem_encaps(&header.ratchet_pubkey)?;
        let kem_secret2 = mlkem_decaps(&new_kp.secret_key, &kem_result2.ciphertext)?;

        let send_material = hkdf_sha3(&new_root, &kem_secret2, 64);
        let mut final_root = [0u8; 32];
        final_root.copy_from_slice(&send_material[..32]);
        let new_send_chain: [u8; 32] = sha3_512_truncated_32(&send_material[32..64]);

        RatchetState {
            root_key: final_root,
            send_chain_key: new_send_chain,
            recv_chain_key: new_recv_chain,
            send_chain_index: 0,
            recv_chain_index: 0,
            our_ratchet_keypair_pk: new_kp.public_key,
            our_ratchet_keypair_sk: new_kp.secret_key,
            their_ratchet_pubkey: header.ratchet_pubkey.clone(),
            previous_send_count: state.send_chain_index,
            skipped_keys: state.skipped_keys.clone(),
        }
    } else {
        state.clone()
    };

    let (mut message_key, next_recv_chain) =
        advance_chain(&working_state.recv_chain_key, header.message_index);

    let aad = concat_bytes(&[
        &header.ratchet_pubkey,
        &header.message_index.to_le_bytes(),
    ]);
    let (plaintext, tag_valid) = aes_gcm_decrypt(&message_key, nonce, ciphertext, tag, &aad)?;

    message_key.zeroize();

    if !tag_valid {
        return Err(Error::TagVerificationFailed);
    }

    let updated = RatchetState {
        root_key: working_state.root_key,
        send_chain_key: working_state.send_chain_key,
        recv_chain_key: next_recv_chain,
        send_chain_index: working_state.send_chain_index,
        recv_chain_index: header.message_index + 1,
        our_ratchet_keypair_pk: working_state.our_ratchet_keypair_pk.clone(),
        our_ratchet_keypair_sk: working_state.our_ratchet_keypair_sk.clone(),
        their_ratchet_pubkey: working_state.their_ratchet_pubkey.clone(),
        previous_send_count: working_state.previous_send_count,
        skipped_keys: working_state.skipped_keys.clone(),
    };

    Ok(RatchetDecryptResult {
        plaintext,
        updated_state: Some(updated),
        verified: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chain_advance_produces_independent_keys() {
        let chain_key = [0x42u8; 32];
        let (msg_key, next_chain) = advance_chain(&chain_key, 0);
        assert_ne!(msg_key, chain_key);
        assert_ne!(next_chain, chain_key);
        assert_ne!(msg_key, next_chain);
    }

    #[test]
    fn ratchet_encrypt_decrypt_roundtrip() {
        let shared_secret = [0x42u8; 32];
        let alice_kp = mlkem_keygen();
        let bob_kp = mlkem_keygen();

        let alice_state = init_ratchet(
            &shared_secret,
            &alice_kp.public_key,
            &alice_kp.secret_key,
            &bob_kp.public_key,
            true,
        )
        .unwrap();

        let plaintext = b"Double ratchet test message";
        let (encrypted, alice_next) = ratchet_encrypt(&alice_state, plaintext).unwrap();

        assert_ne!(encrypted.ciphertext.as_slice(), plaintext.as_slice());
        assert_eq!(encrypted.header.message_index, 0);
        assert_eq!(alice_next.send_chain_index, 1);

        let bob_state = init_ratchet(
            &shared_secret,
            &bob_kp.public_key,
            &bob_kp.secret_key,
            &alice_kp.public_key,
            false,
        )
        .unwrap();

        let decrypted = ratchet_decrypt(
            &bob_state,
            &encrypted.header,
            &encrypted.ciphertext,
            &encrypted.nonce,
            &encrypted.tag,
        )
        .unwrap();

        assert_eq!(decrypted.plaintext, plaintext);
        assert!(decrypted.verified);
    }
}
