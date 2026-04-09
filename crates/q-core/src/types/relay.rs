use serde::{Deserialize, Serialize};

use super::RelayId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayPacket {
    pub onion_layers: Vec<u8>,
    pub packet_id: [u8; 32],
    pub hop_index: u8,
    pub total_hops: u8,
    pub timestamp_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayRoute {
    pub route_id: [u8; 32],
    pub hops: Vec<RelayId>,
    pub hop_pubkeys: Vec<Vec<u8>>,
    pub total_hops: u8,
    pub created_at: u64,
    pub expires_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoverTrafficConfig {
    pub rate_per_second: u32,
    pub packet_size: u32,
    pub jitter_ms: u32,
    pub mimicry_profile: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteResult {
    pub packet: RelayPacket,
    pub route_id: [u8; 32],
    pub delivered: bool,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayNode {
    pub relay_id: RelayId,
    pub endpoint_address: Vec<u8>,
    pub region: [u8; 8],
    pub jurisdiction: [u8; 8],
    pub capacity: u32,
    pub pubkey: Vec<u8>,
    pub encryption_pk: Vec<u8>,
    pub registered_at: u64,
    pub last_heartbeat: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteEdge {
    pub hop_index: u8,
    pub established_at: u64,
    pub latency_ms: u32,
    pub bandwidth_mbps: u32,
}
