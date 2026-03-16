use serde::{Deserialize, Serialize};
use zeroize::{Zeroize, ZeroizeOnDrop};

use super::{Nonce, SessionId, SessionKey, UserId};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedMessage {
    pub ciphertext: Vec<u8>,
    pub nonce: Nonce,
    pub tag: [u8; 16],
    pub sender_id: UserId,
    pub session_id: SessionId,
    pub sequence: u64,
    pub timestamp_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct DecryptedMessage {
    pub plaintext: Vec<u8>,
    #[zeroize(skip)]
    pub sender_id: UserId,
    #[zeroize(skip)]
    pub session_id: SessionId,
    #[zeroize(skip)]
    pub sequence: u64,
    #[zeroize(skip)]
    pub verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct SessionEstablishment {
    #[zeroize(skip)]
    pub session_id: SessionId,
    pub session_key: SessionKey,
    pub kem_ciphertext: Vec<u8>,
    #[zeroize(skip)]
    pub initiator_id: UserId,
    #[zeroize(skip)]
    pub responder_id: UserId,
    #[zeroize(skip)]
    pub established_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct SessionRotation {
    #[zeroize(skip)]
    pub session_id: SessionId,
    pub new_key: SessionKey,
    pub old_key_hash: [u8; 32],
    #[zeroize(skip)]
    pub rotation_index: u64,
}
