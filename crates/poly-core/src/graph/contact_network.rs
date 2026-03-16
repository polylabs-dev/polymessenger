use serde::{Deserialize, Serialize};

use super::csr::CsrGraph;
use crate::types::{
    AgentContact, BlockedEdge, ContactNode, GroupMemberEdge, GroupNode, HumanContact, KnowsEdge,
    UserId,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContactEdge {
    Knows(KnowsEdge),
    Blocked(BlockedEdge),
    GroupMember(GroupMemberEdge),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContactNodeType {
    Contact(ContactNode),
    Group(GroupNode),
    Agent(AgentContact),
    Human(HumanContact),
}

pub struct ContactNetwork {
    graph: CsrGraph<ContactNodeType, ContactEdge>,
}

impl ContactNetwork {
    pub fn new() -> Self {
        Self {
            graph: CsrGraph::new(),
        }
    }

    pub fn add_contact(&mut self, owner_id: UserId, contact: ContactNode) {
        let contact_id = contact.contact_id;
        self.graph
            .insert_node(contact_id, ContactNodeType::Contact(contact));
        let edge = KnowsEdge {
            established_at: 0,
            verified: false,
        };
        self.graph
            .insert_edge(owner_id, contact_id, ContactEdge::Knows(edge));
        self.graph.set_overlay("trust_level", contact_id, 0);
        self.graph.set_overlay("message_count", contact_id, 0);
        self.graph.set_overlay("unread_count", contact_id, 0);
        self.graph.set_overlay("online_status", contact_id, 0);
    }

    pub fn register_agent(&mut self, agent: AgentContact) {
        let mut id = [0u8; 16];
        let hash = crate::crypto::sha3_512_truncated_32(agent.device_alias.as_bytes());
        id.copy_from_slice(&hash[..16]);
        self.graph.insert_node(id, ContactNodeType::Agent(agent));
    }

    pub fn register_human(&mut self, human: HumanContact) {
        let mut id = [0u8; 16];
        id.copy_from_slice(&human.spark_biometric_key[..16]);
        self.graph.insert_node(id, ContactNodeType::Human(human));
    }

    pub fn lookup(&self, id: &UserId) -> Option<&ContactNodeType> {
        self.graph.lookup_node(id)
    }

    pub fn block_contact(&mut self, owner_id: UserId, contact_id: UserId, reason: u8) {
        self.graph.remove_edge(&owner_id, &contact_id);
        let edge = BlockedEdge {
            blocked_at: 0,
            reason,
        };
        self.graph
            .insert_edge(owner_id, contact_id, ContactEdge::Blocked(edge));
        self.graph.set_overlay("trust_level", contact_id, 0);
        self.graph.set_overlay("online_status", contact_id, 0);
    }

    pub fn create_group(&mut self, creator_id: UserId, group: GroupNode) {
        let group_id = group.group_id;
        self.graph
            .insert_node(group_id, ContactNodeType::Group(group));
        let edge = GroupMemberEdge {
            role: 2,
            joined_at: 0,
        };
        self.graph
            .insert_edge(creator_id, group_id, ContactEdge::GroupMember(edge));
    }

    pub fn online_agents(&self) -> Vec<(&[u8; 16], &AgentContact)> {
        self.graph
            .all_nodes()
            .filter_map(|(id, node)| {
                if let ContactNodeType::Agent(agent) = node {
                    if agent.online {
                        return Some((id, agent));
                    }
                }
                None
            })
            .collect()
    }

    pub fn node_count(&self) -> usize {
        self.graph.node_count()
    }
}

impl Default for ContactNetwork {
    fn default() -> Self {
        Self::new()
    }
}
