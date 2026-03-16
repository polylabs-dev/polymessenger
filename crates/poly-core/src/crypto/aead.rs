use aes_gcm::{
    aead::{Aead, KeyInit, Payload},
    Aes256Gcm,
};

use crate::Error;

pub fn aes_gcm_encrypt(
    key: &[u8; 32],
    nonce: &[u8; 12],
    plaintext: &[u8],
    aad: &[u8],
) -> Result<(Vec<u8>, [u8; 16]), Error> {
    let cipher = Aes256Gcm::new(key.into());
    let payload = Payload {
        msg: plaintext,
        aad,
    };
    let ciphertext_with_tag = cipher
        .encrypt(nonce.into(), payload)
        .map_err(|e| Error::Crypto(format!("AES-GCM encrypt: {e}")))?;

    let tag_start = ciphertext_with_tag.len() - 16;
    let ciphertext = ciphertext_with_tag[..tag_start].to_vec();
    let mut tag = [0u8; 16];
    tag.copy_from_slice(&ciphertext_with_tag[tag_start..]);
    Ok((ciphertext, tag))
}

pub fn aes_gcm_decrypt(
    key: &[u8; 32],
    nonce: &[u8; 12],
    ciphertext: &[u8],
    tag: &[u8; 16],
    aad: &[u8],
) -> Result<(Vec<u8>, bool), Error> {
    let cipher = Aes256Gcm::new(key.into());
    let mut ct_with_tag = Vec::with_capacity(ciphertext.len() + 16);
    ct_with_tag.extend_from_slice(ciphertext);
    ct_with_tag.extend_from_slice(tag);

    let payload = Payload {
        msg: &ct_with_tag,
        aad,
    };
    match cipher.decrypt(nonce.into(), payload) {
        Ok(plaintext) => Ok((plaintext, true)),
        Err(_) => Ok((vec![], false)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aes_gcm_256_nist_empty() {
        let key = [0u8; 32];
        let nonce = [0u8; 12];
        let (ct, tag) = aes_gcm_encrypt(&key, &nonce, b"", b"").unwrap();
        assert!(ct.is_empty());
        assert_eq!(
            hex::encode(tag),
            "530f8afbc74536b9a963b4f1c4cb738b"
        );
    }

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let key = [0x42u8; 32];
        let nonce = [0x01u8; 12];
        let plaintext = b"Hello, Poly Messenger!";
        let aad = b"session-context";

        let (ct, tag) = aes_gcm_encrypt(&key, &nonce, plaintext, aad).unwrap();
        let (pt, valid) = aes_gcm_decrypt(&key, &nonce, &ct, &tag, aad).unwrap();
        assert!(valid);
        assert_eq!(pt, plaintext);
    }

    #[test]
    fn tampered_tag_fails() {
        let key = [0x42u8; 32];
        let nonce = [0x01u8; 12];
        let (ct, mut tag) = aes_gcm_encrypt(&key, &nonce, b"secret", b"aad").unwrap();
        tag[0] ^= 0xFF;
        let (_, valid) = aes_gcm_decrypt(&key, &nonce, &ct, &tag, b"aad").unwrap();
        assert!(!valid);
    }
}
