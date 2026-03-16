use serde::{Deserialize, Serialize};

use super::{ConversationId, MessageId, UserId};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum MessageLifecycle {
    Sending = 0,
    Sent = 1,
    Delivered = 2,
    Read = 3,
    Expired = 4,
    Deleted = 5,
    Failed = 6,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageNode {
    pub message_id: MessageId,
    pub conversation_id: ConversationId,
    pub sender_id: UserId,
    pub content_hash: [u8; 32],
    pub content_preview: String,
    pub sealed_envelope_hash: [u8; 32],
    pub timestamp: u64,
    pub message_type: u8,
    pub classification: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplyToEdge {
    pub reply_type: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReactionEdge {
    pub reactor_id: UserId,
    pub emoji_code: u32,
    pub reacted_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StructuredMessage {
    WorkAssignment {
        epic_id: String,
        task_description: String,
        priority: u8,
    },
    ProgressUpdate {
        task_id: String,
        status: String,
        percent_complete: u8,
    },
    Question {
        context: String,
        question: String,
    },
    Answer {
        question_ref: MessageId,
        answer: String,
    },
    Completion {
        task_id: String,
        summary: String,
        artifacts: Vec<String>,
    },
    SprintNotification {
        sprint_id: String,
        event_type: String,
        details: String,
    },
    CredentialRequest {
        credential_name: String,
        purpose: String,
    },
    Command {
        command: String,
        args: Vec<String>,
    },
    StatusRequest {
        target_agent: String,
    },
    Approval {
        request_ref: MessageId,
        approved: bool,
        reason: String,
    },
    Notification {
        severity: u8,
        title: String,
        body: String,
    },
}
