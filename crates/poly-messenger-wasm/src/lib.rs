use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn poly_messenger_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[wasm_bindgen]
pub fn mlkem_keygen_js() -> JsValue {
    let kp = poly_core::crypto::mlkem_keygen();
    serde_wasm_bindgen::to_value(&serde_json::json!({
        "public_key_hex": hex::encode(&kp.public_key),
        "secret_key_len": kp.secret_key.len(),
    })).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn sha3_512_hex(data: &[u8]) -> String {
    hex::encode(poly_core::crypto::sha3_512(data))
}

#[wasm_bindgen]
pub fn derive_session_key_hex(shared_secret: &[u8], context: &[u8]) -> String {
    hex::encode(poly_core::crypto::derive_session_key(shared_secret, context))
}

#[wasm_bindgen]
pub fn encrypt_message(key: &[u8], nonce: &[u8], plaintext: &[u8], aad: &[u8]) -> Result<JsValue, JsValue> {
    if key.len() != 32 {
        return Err(JsValue::from_str("key must be 32 bytes"));
    }
    if nonce.len() != 12 {
        return Err(JsValue::from_str("nonce must be 12 bytes"));
    }
    let key: &[u8; 32] = key.try_into().unwrap();
    let nonce: &[u8; 12] = nonce.try_into().unwrap();

    match poly_core::crypto::aes_gcm_encrypt(key, nonce, plaintext, aad) {
        Ok((ct, tag)) => {
            let result = serde_json::json!({
                "ciphertext": hex::encode(&ct),
                "tag": hex::encode(tag),
            });
            serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
        }
        Err(e) => Err(JsValue::from_str(&e.to_string())),
    }
}
