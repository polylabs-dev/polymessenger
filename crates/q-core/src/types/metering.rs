use serde::{Deserialize, Serialize};

use super::UserId;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum MessengerOperation {
    Send = 0,
    Receive = 1,
    Call = 2,
    Relay = 3,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessengerUsage {
    pub user_id: UserId,
    pub sends: u64,
    pub receives: u64,
    pub calls: u64,
    pub relays: u64,
    pub bandwidth_bytes: u64,
    pub period_start_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessengerQuota {
    pub tier: String,
    pub max_sends_per_month: u64,
    pub max_calls_per_month: u64,
    pub max_relay_hops: u64,
    pub max_bandwidth_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaCheckResult {
    pub allowed: bool,
    pub operation: MessengerOperation,
    pub remaining: u64,
    pub reset_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DimensionValues {
    pub executions: u64,
    pub hashes: u64,
    pub bandwidth: u64,
    pub storage: u64,
    pub observables: u64,
    pub proofs: u64,
    pub circuits: u64,
    pub mpc_sessions: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeteringRecord {
    pub user_id: UserId,
    pub operation: String,
    pub dimensions: DimensionValues,
    pub recorded_at: u64,
}
