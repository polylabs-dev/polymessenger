use sha3::{Digest, Sha3_256};

pub fn sha3_256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha3_256::new();
    hasher.update(data);
    hasher.finalize().into()
}

pub fn blake3_hash(data: &[u8]) -> [u8; 32] {
    blake3::hash(data).into()
}

pub fn hkdf_sha3(ikm: &[u8], info: &[u8], len: usize) -> Vec<u8> {
    use hkdf::Hkdf;
    let hk = Hkdf::<Sha3_256>::new(None, ikm);
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
    fn sha3_256_empty() {
        let result = sha3_256(b"");
        assert_eq!(
            hex::encode(result),
            "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a"
        );
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
