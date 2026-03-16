use std::collections::HashMap;

use crate::types::{MessageId, MessageLifecycle, MessageNode, ReactionEdge, ReplyToEdge};

enum DagEdge {
    Reply(ReplyToEdge),
    Reaction(ReactionEdge),
}

pub struct MessageDag {
    nodes: HashMap<MessageId, MessageNode>,
    edges: HashMap<MessageId, Vec<(MessageId, DagEdge)>>,
    states: HashMap<MessageId, MessageLifecycle>,
    overlays: HashMap<String, HashMap<MessageId, u64>>,
}

impl MessageDag {
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
            edges: HashMap::new(),
            states: HashMap::new(),
            overlays: HashMap::new(),
        }
    }

    pub fn insert(&mut self, node: MessageNode) {
        let id = node.message_id;
        self.nodes.insert(id, node);
        self.states.insert(id, MessageLifecycle::Sending);
        self.set_overlay("delivery_status", id, 0);
        self.set_overlay("reaction_count", id, 0);
        self.set_overlay("read_status", id, 0);
        self.set_overlay("classification_level", id, 0);
    }

    pub fn add_reply(&mut self, from: MessageId, to: MessageId, reply_type: u8) {
        self.edges
            .entry(from)
            .or_default()
            .push((to, DagEdge::Reply(ReplyToEdge { reply_type })));
    }

    pub fn add_reaction(&mut self, message_id: MessageId, reaction: ReactionEdge) {
        let reactor_id = reaction.reactor_id;
        self.edges
            .entry(reactor_id)
            .or_default()
            .push((message_id, DagEdge::Reaction(reaction)));

        let count = self
            .get_overlay("reaction_count", &message_id)
            .unwrap_or(0);
        self.set_overlay("reaction_count", message_id, count + 1);
    }

    pub fn lookup(&self, id: &MessageId) -> Option<&MessageNode> {
        self.nodes.get(id)
    }

    pub fn transition(&mut self, id: &MessageId, to: MessageLifecycle) -> bool {
        let Some(current) = self.states.get(id) else {
            return false;
        };

        let valid = matches!(
            (current, &to),
            (MessageLifecycle::Sending, MessageLifecycle::Sent)
                | (MessageLifecycle::Sending, MessageLifecycle::Failed)
                | (MessageLifecycle::Sent, MessageLifecycle::Delivered)
                | (MessageLifecycle::Delivered, MessageLifecycle::Read)
                | (MessageLifecycle::Read, MessageLifecycle::Expired)
                | (MessageLifecycle::Sent, MessageLifecycle::Expired)
                | (MessageLifecycle::Delivered, MessageLifecycle::Deleted)
                | (MessageLifecycle::Read, MessageLifecycle::Deleted)
        );

        if valid {
            self.states.insert(*id, to);
        }
        valid
    }

    pub fn state(&self, id: &MessageId) -> Option<MessageLifecycle> {
        self.states.get(id).copied()
    }

    pub fn tombstone(&mut self, id: &MessageId) {
        self.nodes.remove(id);
        self.edges.remove(id);
    }

    pub fn set_overlay(&mut self, name: &str, id: MessageId, value: u64) {
        self.overlays
            .entry(name.to_string())
            .or_default()
            .insert(id, value);
    }

    pub fn get_overlay(&self, name: &str, id: &MessageId) -> Option<u64> {
        self.overlays.get(name)?.get(id).copied()
    }

    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }
}

impl Default for MessageDag {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::MessageNode;

    fn msg_id(n: u8) -> MessageId {
        let mut id = [0u8; 16];
        id[0] = n;
        id
    }

    fn test_node(id: u8) -> MessageNode {
        MessageNode {
            message_id: msg_id(id),
            conversation_id: [0; 16],
            sender_id: [0; 16],
            content_hash: [0; 32],
            content_preview: String::new(),
            sealed_envelope_hash: [0; 32],
            timestamp: 0,
            message_type: 0,
            classification: 0,
        }
    }

    #[test]
    fn lifecycle_transitions() {
        let mut dag = MessageDag::new();
        dag.insert(test_node(1));
        assert!(dag.transition(&msg_id(1), MessageLifecycle::Sent));
        assert!(dag.transition(&msg_id(1), MessageLifecycle::Delivered));
        assert!(dag.transition(&msg_id(1), MessageLifecycle::Read));
        assert!(!dag.transition(&msg_id(1), MessageLifecycle::Sent));
    }
}
