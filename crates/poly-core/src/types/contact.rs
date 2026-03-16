use serde::{Deserialize, Serialize};

use super::{GroupId, UserId};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactNode {
    pub contact_id: UserId,
    pub user_id: [u8; 32],
    pub display_name: Vec<u8>,
    pub phone_number: String,
    pub email: String,
    pub signing_pubkey: Vec<u8>,
    pub encryption_pubkey: Vec<u8>,
    pub security_tier: u8,
    pub verified_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupNode {
    pub group_id: GroupId,
    pub name: Vec<u8>,
    pub creator_id: UserId,
    pub max_members: u32,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowsEdge {
    pub established_at: u64,
    pub verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockedEdge {
    pub blocked_at: u64,
    pub reason: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupMemberEdge {
    pub role: u8,
    pub joined_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentContact {
    pub device_alias: String,
    pub spark_device_key: [u8; 32],
    pub capabilities: Vec<String>,
    pub online: bool,
    pub last_seen: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HumanContact {
    pub spark_biometric_key: [u8; 32],
    pub display_name: String,
    pub devices: Vec<String>,
    pub online: bool,
    pub last_seen: u64,
}
