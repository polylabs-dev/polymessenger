use super::csr::CsrGraph;
use crate::types::{RelayNode, RouteEdge};

pub struct RelayMesh {
    graph: CsrGraph<RelayNode, RouteEdge>,
}

impl RelayMesh {
    pub fn new() -> Self {
        Self {
            graph: CsrGraph::new(),
        }
    }

    pub fn register_relay(&mut self, relay: RelayNode) {
        let id = relay.relay_id;
        self.graph.set_overlay("latency_ns", id, 0);
        self.graph
            .set_overlay("capacity_remaining", id, relay.capacity as u64);
        self.graph.set_overlay("cover_traffic_rate", id, 0);
        self.graph.set_overlay("load_pct", id, 0);
        self.graph.insert_node(id, relay);
    }

    pub fn lookup(&self, id: &[u8; 16]) -> Option<&RelayNode> {
        self.graph.lookup_node(id)
    }

    pub fn update_health(
        &mut self,
        relay_id: [u8; 16],
        latency_ns: u64,
        capacity_remaining: u32,
        load_pct: u8,
        cover_rate: u32,
    ) -> bool {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let node_clone = match self.graph.lookup_node(&relay_id) {
            Some(n) => n.clone(),
            None => return false,
        };

        let staleness = now.saturating_sub(node_clone.last_heartbeat);
        if staleness > 300_000 {
            self.graph.set_overlay("load_pct", relay_id, 100);
            return false;
        }

        self.graph.set_overlay("latency_ns", relay_id, latency_ns);
        self.graph
            .set_overlay("capacity_remaining", relay_id, capacity_remaining as u64);
        self.graph
            .set_overlay("load_pct", relay_id, load_pct as u64);
        self.graph
            .set_overlay("cover_traffic_rate", relay_id, cover_rate as u64);

        let mut updated = node_clone;
        updated.last_heartbeat = now;
        self.graph.update_node(relay_id, updated);
        true
    }

    pub fn active_relays(&self) -> Vec<&RelayNode> {
        self.graph
            .all_nodes()
            .filter_map(|(id, node)| {
                let load = self.graph.get_overlay("load_pct", id).unwrap_or(100);
                if load < 100 {
                    Some(node)
                } else {
                    None
                }
            })
            .collect()
    }

    pub fn select_route(&self, min_hops: u8, security_tier: u8) -> Vec<&RelayNode> {
        let hop_count = match security_tier {
            t if t >= 3 => 5,
            t if t >= 2 => 4,
            _ => min_hops,
        } as usize;

        let mut candidates: Vec<_> = self.active_relays();
        candidates.sort_by_key(|r| {
            let load = self
                .graph
                .get_overlay("load_pct", &r.relay_id)
                .unwrap_or(100);
            let lat = self
                .graph
                .get_overlay("latency_ns", &r.relay_id)
                .unwrap_or(u64::MAX);
            (load, lat)
        });

        let mut selected = Vec::with_capacity(hop_count);
        let mut prev_jurisdiction = [0u8; 8];
        for candidate in &candidates {
            if selected.len() >= hop_count {
                break;
            }
            if candidate.jurisdiction != prev_jurisdiction || selected.is_empty() {
                prev_jurisdiction = candidate.jurisdiction;
                selected.push(*candidate);
            }
        }
        selected
    }

    pub fn node_count(&self) -> usize {
        self.graph.node_count()
    }
}

impl Default for RelayMesh {
    fn default() -> Self {
        Self::new()
    }
}
