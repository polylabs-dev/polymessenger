use ml_kem::kem::{Decapsulate, Encapsulate};
use ml_kem::{Encoded, EncodedSizeUser, KemCore, MlKem1024};

use crate::Error;

pub struct KemKeyPair {
    pub public_key: Vec<u8>,
    pub secret_key: Vec<u8>,
}

pub struct KemEncapsResult {
    pub ciphertext: Vec<u8>,
    pub shared_secret: [u8; 32],
}

type Ek = <MlKem1024 as KemCore>::EncapsulationKey;
type Dk = <MlKem1024 as KemCore>::DecapsulationKey;

pub fn mlkem_keygen() -> KemKeyPair {
    let mut rng = rand::thread_rng();
    let (dk, ek) = MlKem1024::generate(&mut rng);
    let ek_encoded: Encoded<Ek> = ek.as_bytes();
    let dk_encoded: Encoded<Dk> = dk.as_bytes();
    KemKeyPair {
        public_key: ek_encoded.as_slice().to_vec(),
        secret_key: dk_encoded.as_slice().to_vec(),
    }
}

pub fn mlkem_encaps(encaps_key_bytes: &[u8]) -> Result<KemEncapsResult, Error> {
    let ek_encoded: &Encoded<Ek> = encaps_key_bytes
        .try_into()
        .map_err(|_| Error::InvalidKeyLength {
            expected: std::mem::size_of::<Encoded<Ek>>(),
            got: encaps_key_bytes.len(),
        })?;
    let ek = Ek::from_bytes(ek_encoded);
    let mut rng = rand::thread_rng();
    let (ct, ss) = ek.encapsulate(&mut rng).unwrap();
    Ok(KemEncapsResult {
        ciphertext: ct.as_slice().to_vec(),
        shared_secret: ss.into(),
    })
}

pub fn mlkem_decaps(
    decaps_key_bytes: &[u8],
    ciphertext_bytes: &[u8],
) -> Result<[u8; 32], Error> {
    let dk_encoded: &Encoded<Dk> = decaps_key_bytes
        .try_into()
        .map_err(|_| Error::InvalidKeyLength {
            expected: std::mem::size_of::<Encoded<Dk>>(),
            got: decaps_key_bytes.len(),
        })?;
    let dk = Dk::from_bytes(dk_encoded);
    let ct = ciphertext_bytes
        .try_into()
        .map_err(|_| Error::Crypto("invalid ciphertext length".into()))?;
    let ss = dk.decapsulate(ct).unwrap();
    Ok(ss.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keygen_encaps_decaps_roundtrip() {
        let kp = mlkem_keygen();
        let encaps = mlkem_encaps(&kp.public_key).unwrap();
        let ss = mlkem_decaps(&kp.secret_key, &encaps.ciphertext).unwrap();
        assert_eq!(ss, encaps.shared_secret);
    }
}
