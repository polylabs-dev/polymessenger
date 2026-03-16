use zeroize::Zeroize;

use crate::crypto::{
    aes_gcm_decrypt, aes_gcm_encrypt, blake3_hash, concat_bytes, hkdf_sha3, mlkem_decaps,
    mlkem_encaps, sha3_512_truncated_32,
};
use crate::types::{DecryptedMessage, EncryptedMessage, SessionEstablishment, SessionRotation};
use crate::{Error, Result};

/// FL circuit: establish_session
/// ML-KEM-1024 key exchange -> session key derivation
pub fn establish_session(
    initiator_sk: &[u8],
    responder_pk: &[u8],
    initiator_id: &[u8; 16],
    responder_id: &[u8; 16],
) -> Result<SessionEstablishment> {
    let kem_result = mlkem_encaps(responder_pk)?;
    let shared_secret = mlkem_decaps(initiator_sk, &kem_result.ciphertext)?;

    let session_context = blake3_hash(&concat_bytes(&[initiator_id, responder_id]));
    let session_key_vec = hkdf_sha3(&shared_secret, &session_context, 32);
    let mut session_key = [0u8; 32];
    session_key.copy_from_slice(&session_key_vec);

    let session_id = sha3_512_truncated_32(&concat_bytes(&[&session_key, &session_context]));

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    Ok(SessionEstablishment {
        session_id,
        session_key,
        kem_ciphertext: kem_result.ciphertext,
        initiator_id: *initiator_id,
        responder_id: *responder_id,
        established_at: now,
    })
}

/// FL circuit: encrypt_message
/// AES-256-GCM encryption under HKDF-derived message key
pub fn encrypt_message(
    plaintext: &[u8],
    session_key: &[u8; 32],
    sender_id: &[u8; 16],
    session_id: &[u8; 32],
    sequence: u64,
) -> Result<EncryptedMessage> {
    let seq_bytes = sequence.to_le_bytes();
    let info = concat_bytes(&[session_id, &seq_bytes]);
    let mk_vec = hkdf_sha3(session_key, &info, 32);
    let mut message_key = [0u8; 32];
    message_key.copy_from_slice(&mk_vec);

    let nonce_seed = blake3_hash(&concat_bytes(&[&message_key, &seq_bytes]));
    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&nonce_seed[..12]);

    let aad = concat_bytes(&[sender_id, session_id, &seq_bytes]);
    let (ciphertext, tag) = aes_gcm_encrypt(&message_key, &nonce, plaintext, &aad)?;

    message_key.zeroize();

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    Ok(EncryptedMessage {
        ciphertext,
        nonce,
        tag,
        sender_id: *sender_id,
        session_id: *session_id,
        sequence,
        timestamp_ms: now,
    })
}

/// FL circuit: decrypt_message
/// AES-256-GCM decryption under HKDF-derived message key
pub fn decrypt_message(
    encrypted: &EncryptedMessage,
    session_key: &[u8; 32],
) -> Result<DecryptedMessage> {
    let seq_bytes = encrypted.sequence.to_le_bytes();
    let info = concat_bytes(&[&encrypted.session_id, &seq_bytes]);
    let mk_vec = hkdf_sha3(session_key, &info, 32);
    let mut message_key = [0u8; 32];
    message_key.copy_from_slice(&mk_vec);

    let aad = concat_bytes(&[&encrypted.sender_id, &encrypted.session_id, &seq_bytes]);
    let (plaintext, tag_valid) = aes_gcm_decrypt(
        &message_key,
        &encrypted.nonce,
        &encrypted.ciphertext,
        &encrypted.tag,
        &aad,
    )?;

    message_key.zeroize();

    if !tag_valid {
        return Err(Error::TagVerificationFailed);
    }

    Ok(DecryptedMessage {
        plaintext,
        sender_id: encrypted.sender_id,
        session_id: encrypted.session_id,
        sequence: encrypted.sequence,
        verified: true,
    })
}

/// FL circuit: rotate_session_key
/// HKDF chain derivation for forward secrecy
pub fn rotate_session_key(
    current_key: &[u8; 32],
    session_id: &[u8; 32],
    rotation_index: u64,
) -> SessionRotation {
    let rotation_context = concat_bytes(&[session_id, &rotation_index.to_le_bytes()]);
    let new_key_vec = hkdf_sha3(current_key, &rotation_context, 32);
    let mut new_key = [0u8; 32];
    new_key.copy_from_slice(&new_key_vec);

    let old_key_hash = sha3_512_truncated_32(current_key);

    SessionRotation {
        session_id: *session_id,
        new_key,
        old_key_hash,
        rotation_index,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::mlkem_keygen;

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let kp = mlkem_keygen();
        let initiator_id = [0x01u8; 16];
        let responder_id = [0x02u8; 16];

        let session =
            establish_session(&kp.secret_key, &kp.public_key, &initiator_id, &responder_id)
                .unwrap();

        let plaintext = b"Hello, secret message!";
        let encrypted = encrypt_message(
            plaintext,
            &session.session_key,
            &initiator_id,
            &session.session_id,
            0,
        )
        .unwrap();

        assert_ne!(encrypted.ciphertext, plaintext);
        assert_ne!(encrypted.tag, [0u8; 16]);

        let decrypted = decrypt_message(&encrypted, &session.session_key).unwrap();
        assert_eq!(decrypted.plaintext, plaintext);
        assert!(decrypted.verified);
    }

    #[test]
    fn session_key_rotation() {
        let key = [0x42u8; 32];
        let session_id = [0x01u8; 32];

        let rotation = rotate_session_key(&key, &session_id, 1);
        assert_ne!(rotation.new_key, key);
        assert_eq!(rotation.old_key_hash, sha3_512_truncated_32(&key));
        assert_eq!(rotation.rotation_index, 1);
    }
}
