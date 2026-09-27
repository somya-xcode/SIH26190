import os
import base64
# pyrefly: ignore [missing-import]
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

def _get_key() -> bytes:
    key_b64 = settings.encryption_key.get_secret_value()
    key = base64.b64decode(key_b64)
    if len(key) != 32:
        raise ValueError("Encryption key must be 32 bytes for AES-256.")
    return key

def encrypt_file(plaintext: bytes) -> dict:
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    tag = ciphertext[-16:]
    ct = ciphertext[:-16]
    return {
        "nonce": base64.b64encode(nonce).decode(),
        "ciphertext": base64.b64encode(ct).decode(),
        "tag": base64.b64encode(tag).decode(),
    }

def decrypt_file(enc_dict: dict) -> bytes:
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = base64.b64decode(enc_dict["nonce"])
    ciphertext = base64.b64decode(enc_dict["ciphertext"])
    tag = base64.b64decode(enc_dict["tag"])
    combined = ciphertext + tag
    plaintext = aesgcm.decrypt(nonce, combined, None)
    return plaintext
