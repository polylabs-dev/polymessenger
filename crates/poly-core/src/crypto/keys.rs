use zeroize::Zeroize;

use super::hash::{blake3_hash, concat_bytes, hkdf_sha3, sha3_512_truncated_32};
use crate::types::{ChainKey, MessageKey, SessionKey};

pub fn derive_session_key(shared_secret: &[u8], session_context: &[u8]) -> SessionKey {
    let okm = hkdf_sha3(shared_secret, session_context, 32);
    let mut key = [0u8; 32];
    key.copy_from_slice(&okm);
    key
}

pub fn derive_session_id(session_key: &SessionKey, session_context: &[u8]) -> [u8; 32] {
    let combined = concat_bytes(&[session_key, session_context]);
    sha3_512_truncated_32(&combined)
}

pub fn derive_message_key(session_key: &SessionKey, session_id: &[u8], sequence: u64) -> [u8; 32] {
    let seq_bytes = sequence.to_le_bytes();
    let info = concat_bytes(&[session_id, &seq_bytes]);
    let okm = hkdf_sha3(session_key, &info, 32);
    let mut key = [0u8; 32];
    key.copy_from_slice(&okm);
    key
}

pub fn derive_nonce(message_key: &[u8; 32], sequence: u64) -> [u8; 12] {
    let seq_bytes = sequence.to_le_bytes();
    let combined = concat_bytes(&[message_key, &seq_bytes]);
    let hash = blake3_hash(&combined);
    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&hash[..12]);
    nonce
}

pub fn advance_chain(chain_key: &ChainKey, index: u64) -> (MessageKey, ChainKey) {
    let idx_bytes = index.to_le_bytes();
    let msg_input = concat_bytes(&[chain_key, &[0x01], &idx_bytes]);
    let chain_input = concat_bytes(&[chain_key, &[0x02], &idx_bytes]);
    let message_key = sha3_512_truncated_32(&msg_input);
    let next_chain_key = sha3_512_truncated_32(&chain_input);
    (message_key, next_chain_key)
}

pub fn derive_ratchet_chains(
    shared_secret: &[u8],
    kem_secret: &[u8],
    is_initiator: bool,
) -> ([u8; 32], ChainKey, ChainKey) {
    let root_material = hkdf_sha3(shared_secret, kem_secret, 64);
    let mut root_key = [0u8; 32];
    root_key.copy_from_slice(&root_material[..32]);
    let chain_seed = &root_material[32..64];

    let send_label = if is_initiator { 0x01u8 } else { 0x02u8 };
    let recv_label = if is_initiator { 0x02u8 } else { 0x01u8 };

    let send_chain = sha3_512_truncated_32(&concat_bytes(&[chain_seed, &[send_label]]));
    let recv_chain = sha3_512_truncated_32(&concat_bytes(&[chain_seed, &[recv_label]]));

    let mut material = root_material;
    material.zeroize();

    (root_key, send_chain, recv_chain)
}

pub fn pad_to_size(data: &[u8], size: usize) -> Vec<u8> {
    let mut padded = vec![0u8; size];
    let copy_len = data.len().min(size);
    padded[..copy_len].copy_from_slice(&data[..copy_len]);
    padded
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_key_deterministic() {
        let ss = [0xABu8; 32];
        let ctx = b"poly-messenger-v1";
        let k1 = derive_session_key(&ss, ctx);
        let k2 = derive_session_key(&ss, ctx);
        assert_eq!(k1, k2);
    }

    #[test]
    fn different_contexts_yield_different_keys() {
        let ss = [0xABu8; 32];
        let k1 = derive_session_key(&ss, b"poly-messenger-v1");
        let k2 = derive_session_key(&ss, b"poly-pass-v1");
        assert_ne!(k1, k2);
    }

    #[test]
    fn session_id_deterministic() {
        let sk = [0x42u8; 32];
        let ctx = b"session-0001";
        let id1 = derive_session_id(&sk, ctx);
        let id2 = derive_session_id(&sk, ctx);
        assert_eq!(id1, id2);
        assert_ne!(id1, [0u8; 32]);
    }

    #[test]
    fn message_key_changes_per_sequence() {
        let sk = [0x42u8; 32];
        let sid = [0x01u8; 32];
        let mk0 = derive_message_key(&sk, &sid, 0);
        let mk1 = derive_message_key(&sk, &sid, 1);
        assert_ne!(mk0, mk1);
    }

    #[test]
    fn nonce_changes_per_sequence() {
        let mk = [0x42u8; 32];
        let n0 = derive_nonce(&mk, 0);
        let n1 = derive_nonce(&mk, 1);
        assert_ne!(n0, n1);
        assert_eq!(n0.len(), 12);
    }

    #[test]
    fn chain_advance_produces_different_keys() {
        let chain = [0xABu8; 32];
        let (mk0, next0) = advance_chain(&chain, 0);
        let (mk1, next1) = advance_chain(&next0, 1);
        assert_ne!(mk0, mk1);
        assert_ne!(next0, next1);
        assert_ne!(mk0, next0);
    }

    #[test]
    fn ratchet_initiator_and_responder_complementary() {
        let ss = [0x42u8; 32];
        let kem_secret = [0xBBu8; 32];
        let (rk_i, send_i, recv_i) = derive_ratchet_chains(&ss, &kem_secret, true);
        let (rk_r, send_r, recv_r) = derive_ratchet_chains(&ss, &kem_secret, false);
        assert_eq!(rk_i, rk_r, "root keys must match");
        assert_eq!(send_i, recv_r, "initiator send = responder recv");
        assert_eq!(recv_i, send_r, "initiator recv = responder send");
    }

    #[test]
    fn pad_to_size_basic() {
        let data = b"short";
        let padded = pad_to_size(data, 16);
        assert_eq!(padded.len(), 16);
        assert_eq!(&padded[..5], data);
        assert!(padded[5..].iter().all(|&b| b == 0));
    }

    #[test]
    fn pad_to_size_truncates() {
        let data = b"this is longer than eight";
        let padded = pad_to_size(data, 8);
        assert_eq!(padded.len(), 8);
        assert_eq!(&padded, &data[..8]);
    }
}
