use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum HealthStatus {
    Healthy = 0,
    Degraded = 1,
    Critical = 2,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformMetrics {
    pub blinded_user_id: [u8; 32],
    pub cohort_ok: bool,
    pub cohort_size: u32,
    pub platform_queries: u64,
    pub active_sessions: u64,
    pub messages_relayed: u64,
    pub relay_latency_avg_ms: u64,
    pub cover_traffic_ratio: f64,
    pub network_throughput: u64,
    pub all_healthy: bool,
    pub content_visible: bool,
    pub all_relays_constant_time: bool,
    pub baseline_deviation: f64,
    pub anomaly_score: f64,
    pub collected_at: u64,
}
