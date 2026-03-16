use poly_core::circuit;
use poly_core::crypto::mlkem_keygen;
use poly_core::graph::contact_network::ContactNetwork;
use poly_core::types::*;
use poly_core::{Error, Result};

pub struct PolyMessengerClient {
    identity: ClientIdentity,
    contact_network: ContactNetwork,
    sessions: std::collections::HashMap<[u8; 32], SessionEstablishment>,
}

struct ClientIdentity {
    user_id: UserId,
    device_alias: String,
    signing_pk: Vec<u8>,
    encryption_pk: Vec<u8>,
    encryption_sk: Vec<u8>,
}

impl PolyMessengerClient {
    pub fn new(device_alias: &str) -> Self {
        let kp = mlkem_keygen();
        let user_id_hash = poly_core::crypto::sha3_256(kp.public_key.as_slice());
        let mut user_id = [0u8; 16];
        user_id.copy_from_slice(&user_id_hash[..16]);

        Self {
            identity: ClientIdentity {
                user_id,
                device_alias: device_alias.to_string(),
                signing_pk: vec![],
                encryption_pk: kp.public_key,
                encryption_sk: kp.secret_key,
            },
            contact_network: ContactNetwork::new(),
            sessions: std::collections::HashMap::new(),
        }
    }

    pub fn user_id(&self) -> &UserId {
        &self.identity.user_id
    }

    pub fn device_alias(&self) -> &str {
        &self.identity.device_alias
    }

    pub fn establish_session(
        &mut self,
        responder_pk: &[u8],
        responder_id: &[u8; 16],
    ) -> Result<SessionEstablishment> {
        let session = circuit::establish_session(
            &self.identity.encryption_sk,
            responder_pk,
            &self.identity.user_id,
            responder_id,
        )?;
        self.sessions
            .insert(session.session_id, session.clone());
        Ok(session)
    }

    pub fn send(
        &self,
        session_id: &[u8; 32],
        plaintext: &[u8],
        sequence: u64,
    ) -> Result<EncryptedMessage> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| Error::InvalidSession("session not found".into()))?;
        circuit::encrypt_message(
            plaintext,
            &session.session_key,
            &self.identity.user_id,
            session_id,
            sequence,
        )
    }

    pub fn receive(
        &self,
        session_id: &[u8; 32],
        encrypted: &EncryptedMessage,
    ) -> Result<DecryptedMessage> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| Error::InvalidSession("session not found".into()))?;
        circuit::decrypt_message(encrypted, &session.session_key)
    }

    pub fn register_agent(&mut self, agent: AgentContact) {
        self.contact_network.register_agent(agent);
    }

    pub fn register_human(&mut self, human: HumanContact) {
        self.contact_network.register_human(human);
    }

    pub fn list_online_agents(&self) -> Vec<(&[u8; 16], &AgentContact)> {
        self.contact_network.online_agents()
    }
}
