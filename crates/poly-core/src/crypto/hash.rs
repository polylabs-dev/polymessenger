use sha3::{Digest, Sha3_512};

pub fn sha3_512(data: &[u8]) -> [u8; 64] {
    let mut hasher = Sha3_512::new();
    hasher.update(data);
    hasher.finalize().into()
}

pub fn sha3_512_truncated_32(data: &[u8]) -> [u8; 32] {
    let full = sha3_512(data);
    let mut out = [0u8; 32];
    out.copy_from_slice(&full[..32]);
    out
}

// Customer interop exception per crypto-nist-level5 policy
pub fn blake3_hash(data: &[u8]) -> [u8; 32] {
    blake3::hash(data).into()
}

pub fn hkdf_sha3(ikm: &[u8], info: &[u8], len: usize) -> Vec<u8> {
    use hkdf::Hkdf;
    let hk = Hkdf::<Sha3_512>::new(None, ikm);
    let mut okm = vec![0u8; len];
    hk.expand(info, &mut okm)
        .expect("HKDF output length valid");
    okm
}

pub fn concat_bytes(parts: &[&[u8]]) -> Vec<u8> {
    let total_len: usize = parts.iter().map(|p| p.len()).sum();
    let mut result = Vec::with_capacity(total_len);
    for part in parts {
        result.extend_from_slice(part);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sha3_512_empty() {
        let result = sha3_512(b"");
        assert_eq!(result.len(), 64);
        assert_ne!(result, [0u8; 64]);
    }

    #[test]
    fn sha3_512_truncated_32_consistent() {
        let full = sha3_512(b"test");
        let trunc = sha3_512_truncated_32(b"test");
        assert_eq!(trunc, full[..32]);
    }

    #[test]
    fn blake3_empty() {
        let result = blake3_hash(b"");
        assert_eq!(
            hex::encode(result),
            "af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262"
        );
    }
}
