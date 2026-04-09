use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("crypto: {0}")]
    Crypto(String),

    #[error("invalid session: {0}")]
    InvalidSession(String),

    #[error("ratchet: {0}")]
    Ratchet(String),

    #[error("relay: {0}")]
    Relay(String),

    #[error("graph: {0}")]
    Graph(String),

    #[error("rbac: {0}")]
    Rbac(String),

    #[error("metering: {0}")]
    Metering(String),

    #[error("quota exceeded: {0}")]
    QuotaExceeded(String),

    #[error("classification: {0}")]
    Classification(String),

    #[error("serialization: {0}")]
    Serialization(String),

    #[error("tag verification failed")]
    TagVerificationFailed,

    #[error("invalid key length: expected {expected}, got {got}")]
    InvalidKeyLength { expected: usize, got: usize },

    #[error("not found: {0}")]
    NotFound(String),

    #[error("unauthorized: {0}")]
    Unauthorized(String),
}
