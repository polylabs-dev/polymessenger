use serde::{Deserialize, Serialize};

use super::{SessionId, UserId};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncognitoConfig {
    pub session_id: SessionId,
    pub cover_rate_per_second: u32,
    pub mimicry_profile: u8,
    pub jitter_range_ms: u32,
    pub max_session_duration_ms: u64,
    pub route_rotation_interval_ms: u64,
    pub padding_size: u32,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncognitoSession {
    pub session_id: SessionId,
    pub user_id: UserId,
    pub activated_at: u64,
    pub expires_at: u64,
    pub cover_packets_sent: u64,
    pub real_packets_sent: u64,
    pub cover_ratio: f64,
    pub route_rotations: u64,
    pub active: bool,
    pub metadata_leak_detected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoverPacket {
    pub packet_id: [u8; 32],
    pub session_id: SessionId,
    pub payload: Vec<u8>,
    pub generated_at: u64,
    pub jitter_applied_ms: u32,
}
