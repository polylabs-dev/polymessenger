use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum ContentCategory {
    Safe = 0,
    Spam = 1,
    Phishing = 2,
    MalwareLink = 3,
    Harassment = 4,
    Nsfw = 5,
    Scam = 6,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum ModerationAction {
    Allow = 0,
    Warn = 1,
    Quarantine = 2,
    Block = 3,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentClassification {
    pub message_hash: [u8; 32],
    pub category: u8,
    pub confidence: u16,
    pub subcategories: [u8; 4],
    pub classified_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModerationResult {
    pub message_hash: [u8; 32],
    pub action: u8,
    pub reason_code: u16,
    pub user_overridable: bool,
    pub expires_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhishingSignal {
    pub url_hash: [u8; 32],
    pub domain_similarity: u16,
    pub link_mismatch: bool,
    pub urgency_score: u16,
    pub credential_request: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpamSignal {
    pub message_hash: [u8; 32],
    pub repetition_score: u16,
    pub sender_reputation: u16,
    pub bulk_pattern: bool,
    pub contact_age_hours: u64,
}
