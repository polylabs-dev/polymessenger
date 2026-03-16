use serde::{Deserialize, Serialize};
use zeroize::{Zeroize, ZeroizeOnDrop};

use super::{ChainKey, MessageKey};

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct RatchetState {
    pub root_key: [u8; 32],
    pub send_chain_key: ChainKey,
    pub recv_chain_key: ChainKey,
    #[zeroize(skip)]
    pub send_chain_index: u64,
    #[zeroize(skip)]
    pub recv_chain_index: u64,
    pub our_ratchet_keypair_pk: Vec<u8>,
    pub our_ratchet_keypair_sk: Vec<u8>,
    pub their_ratchet_pubkey: Vec<u8>,
    #[zeroize(skip)]
    pub previous_send_count: u64,
    pub skipped_keys: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RatchetHeader {
    pub ratchet_pubkey: Vec<u8>,
    pub previous_chain_length: u64,
    pub message_index: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RatchetEncryptResult {
    pub header: RatchetHeader,
    pub ciphertext: Vec<u8>,
    pub nonce: [u8; 12],
    pub tag: [u8; 16],
}

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct RatchetDecryptResult {
    pub plaintext: Vec<u8>,
    #[zeroize(skip)]
    pub updated_state: Option<RatchetState>,
    #[zeroize(skip)]
    pub verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct SkippedKeyEntry {
    pub ratchet_pubkey_hash: [u8; 32],
    #[zeroize(skip)]
    pub message_index: u64,
    pub message_key: MessageKey,
}
