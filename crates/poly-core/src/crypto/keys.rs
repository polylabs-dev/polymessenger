use zeroize::Zeroize;

use super::hash::{blake3_hash, concat_bytes, hkdf_sha3, sha3_256};
use crate::types::{ChainKey, MessageKey, SessionKey};

pub fn derive_session_key(shared_secret: &[u8], session_context: &[u8]) -> SessionKey {
    let okm = hkdf_sha3(shared_secret, session_context, 32);
    let mut key = [0u8; 32];
    key.copy_from_slice(&okm);
    key
}

pub fn derive_session_id(session_key: &SessionKey, session_context: &[u8]) -> [u8; 32] {
    let combined = concat_bytes(&[session_key, session_context]);
    sha3_256(&combined)
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
    let message_key = sha3_256(&msg_input);
    let next_chain_key = sha3_256(&chain_input);
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

    let send_chain = sha3_256(&concat_bytes(&[chain_seed, &[send_label]]));
    let recv_chain = sha3_256(&concat_bytes(&[chain_seed, &[recv_label]]));

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
