use serde::{Deserialize, Serialize};

use super::{GroupId, UserId};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum MessengerRole {
    User = 0,
    GroupAdmin = 1,
    Moderator = 2,
    Observer = 3,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum Permission {
    CanSend = 0,
    CanModerate = 1,
    CanAdmin = 2,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub user_id: UserId,
    pub spark_id: [u8; 32],
    pub display_name: Vec<u8>,
    pub role: MessengerRole,
    pub signing_pk: Vec<u8>,
    pub encryption_pk: Vec<u8>,
    pub created_at: u64,
    pub last_active: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupInfo {
    pub group_id: GroupId,
    pub name: Vec<u8>,
    pub owner_id: UserId,
    pub max_members: u32,
    pub require_admin_invite: bool,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleAssignment {
    pub user_id: UserId,
    pub group_id: GroupId,
    pub role: MessengerRole,
    pub granted_by: UserId,
    pub granted_at: u64,
    pub expires_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionCheck {
    pub user_id: UserId,
    pub group_id: GroupId,
    pub permission: Permission,
    pub allowed: bool,
    pub checked_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberOfEdge {
    pub role: MessengerRole,
    pub joined_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminOfEdge {
    pub granted_at: u64,
    pub granted_by: UserId,
}
