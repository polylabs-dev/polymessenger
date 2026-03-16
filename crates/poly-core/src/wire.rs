use crate::types::{EncryptedMessage, StructuredMessage};
use crate::{Error, Result};

const MAGIC: u32 = 0x45535452; // "ESTR"
const VERSION: u8 = 1;
const HEADER_SIZE: usize = 16;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum MessengerPacketType {
    /// Agent-to-agent direct message
    AgentMessage = 0xB0,
    /// Agent-to-agent message acknowledgment
    AgentMessageAck = 0xB1,
    /// Agent registry update (online/offline/capabilities)
    AgentRegistryUpdate = 0xB2,
    /// Relay forwarded message (onion-routed)
    RelayForward = 0xB3,
    /// Human-to-agent message
    HumanMessage = 0xB4,
    /// Structured message (work_assignment, progress_update, etc.)
    StructuredMessage = 0xB5,
}

impl MessengerPacketType {
    pub fn from_u8(v: u8) -> Option<Self> {
        match v {
            0xB0 => Some(Self::AgentMessage),
            0xB1 => Some(Self::AgentMessageAck),
            0xB2 => Some(Self::AgentRegistryUpdate),
            0xB3 => Some(Self::RelayForward),
            0xB4 => Some(Self::HumanMessage),
            0xB5 => Some(Self::StructuredMessage),
            _ => None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct WireHeader {
    pub magic: u32,
    pub version: u8,
    pub packet_type: u8,
    pub flags: u16,
    pub payload_len: u32,
    pub nonce: [u8; 4],
}

impl WireHeader {
    pub fn new(packet_type: MessengerPacketType, payload_len: u32) -> Self {
        let mut nonce = [0u8; 4];
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u32;
        nonce.copy_from_slice(&ts.to_le_bytes());

        Self {
            magic: MAGIC,
            version: VERSION,
            packet_type: packet_type as u8,
            flags: 0,
            payload_len,
            nonce,
        }
    }

    pub fn encode(&self) -> [u8; HEADER_SIZE] {
        let mut buf = [0u8; HEADER_SIZE];
        buf[0..4].copy_from_slice(&self.magic.to_be_bytes());
        buf[4] = self.version;
        buf[5] = self.packet_type;
        buf[6..8].copy_from_slice(&self.flags.to_le_bytes());
        buf[8..12].copy_from_slice(&self.payload_len.to_le_bytes());
        buf[12..16].copy_from_slice(&self.nonce);
        buf
    }

    pub fn decode(buf: &[u8; HEADER_SIZE]) -> Result<Self> {
        let magic = u32::from_be_bytes([buf[0], buf[1], buf[2], buf[3]]);
        if magic != MAGIC {
            return Err(Error::Serialization("invalid magic".into()));
        }
        Ok(Self {
            magic,
            version: buf[4],
            packet_type: buf[5],
            flags: u16::from_le_bytes([buf[6], buf[7]]),
            payload_len: u32::from_le_bytes([buf[8], buf[9], buf[10], buf[11]]),
            nonce: [buf[12], buf[13], buf[14], buf[15]],
        })
    }
}

#[derive(Debug, Clone)]
pub struct AgentMessagePayload {
    pub sender_alias: String,
    pub recipient_alias: String,
    pub encrypted: EncryptedMessage,
}

#[derive(Debug, Clone)]
pub struct StructuredMessagePayload {
    pub sender_alias: String,
    pub recipient_alias: String,
    pub session_id: [u8; 32],
    pub message: StructuredMessage,
}

#[derive(Debug, Clone)]
pub struct AgentRegistryPayload {
    pub device_alias: String,
    pub online: bool,
    pub capabilities: Vec<String>,
    pub spark_device_key: [u8; 32],
}

pub fn encode_agent_message(payload: &AgentMessagePayload) -> Result<Vec<u8>> {
    let json = serde_json::to_vec(payload).map_err(|e| Error::Serialization(e.to_string()))?;
    let header = WireHeader::new(MessengerPacketType::AgentMessage, json.len() as u32);
    let mut packet = Vec::with_capacity(HEADER_SIZE + json.len());
    packet.extend_from_slice(&header.encode());
    packet.extend_from_slice(&json);
    Ok(packet)
}

pub fn encode_structured_message(payload: &StructuredMessagePayload) -> Result<Vec<u8>> {
    let json = serde_json::to_vec(payload).map_err(|e| Error::Serialization(e.to_string()))?;
    let header = WireHeader::new(MessengerPacketType::StructuredMessage, json.len() as u32);
    let mut packet = Vec::with_capacity(HEADER_SIZE + json.len());
    packet.extend_from_slice(&header.encode());
    packet.extend_from_slice(&json);
    Ok(packet)
}

pub fn encode_registry_update(payload: &AgentRegistryPayload) -> Result<Vec<u8>> {
    let json = serde_json::to_vec(payload).map_err(|e| Error::Serialization(e.to_string()))?;
    let header = WireHeader::new(
        MessengerPacketType::AgentRegistryUpdate,
        json.len() as u32,
    );
    let mut packet = Vec::with_capacity(HEADER_SIZE + json.len());
    packet.extend_from_slice(&header.encode());
    packet.extend_from_slice(&json);
    Ok(packet)
}

pub fn decode_packet(data: &[u8]) -> Result<(WireHeader, &[u8])> {
    if data.len() < HEADER_SIZE {
        return Err(Error::Serialization("packet too short".into()));
    }
    let mut header_buf = [0u8; HEADER_SIZE];
    header_buf.copy_from_slice(&data[..HEADER_SIZE]);
    let header = WireHeader::decode(&header_buf)?;
    let payload = &data[HEADER_SIZE..];
    let plen = header.payload_len as usize;
    if payload.len() < plen {
        return Err(Error::Serialization("truncated payload".into()));
    }
    Ok((header, &payload[..plen]))
}

// Implement Serialize for the payload types used in JSON encoding
impl serde::Serialize for AgentMessagePayload {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut s = serializer.serialize_struct("AgentMessagePayload", 3)?;
        s.serialize_field("sender_alias", &self.sender_alias)?;
        s.serialize_field("recipient_alias", &self.recipient_alias)?;
        s.serialize_field("encrypted", &self.encrypted)?;
        s.end()
    }
}

impl serde::Serialize for StructuredMessagePayload {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut s = serializer.serialize_struct("StructuredMessagePayload", 4)?;
        s.serialize_field("sender_alias", &self.sender_alias)?;
        s.serialize_field("recipient_alias", &self.recipient_alias)?;
        s.serialize_field("session_id", &self.session_id)?;
        s.serialize_field("message", &self.message)?;
        s.end()
    }
}

impl serde::Serialize for AgentRegistryPayload {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut s = serializer.serialize_struct("AgentRegistryPayload", 4)?;
        s.serialize_field("device_alias", &self.device_alias)?;
        s.serialize_field("online", &self.online)?;
        s.serialize_field("capabilities", &self.capabilities)?;
        s.serialize_field("spark_device_key", &self.spark_device_key)?;
        s.end()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn header_encode_decode_roundtrip() {
        let header = WireHeader::new(MessengerPacketType::AgentMessage, 42);
        let encoded = header.encode();
        let decoded = WireHeader::decode(&encoded).unwrap();
        assert_eq!(decoded.magic, MAGIC);
        assert_eq!(decoded.version, VERSION);
        assert_eq!(decoded.packet_type, MessengerPacketType::AgentMessage as u8);
        assert_eq!(decoded.payload_len, 42);
    }

    #[test]
    fn packet_type_range() {
        assert_eq!(MessengerPacketType::AgentMessage as u8, 0xB0);
        assert_eq!(MessengerPacketType::StructuredMessage as u8, 0xB5);
        for v in 0xB0..=0xB5 {
            assert!(MessengerPacketType::from_u8(v).is_some());
        }
        assert!(MessengerPacketType::from_u8(0xB6).is_none());
    }
}
