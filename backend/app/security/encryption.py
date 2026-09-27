import os
import base64
from typing import Tuple, Dict
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

def get_aes_key() -> bytes:
    """Derive 32-byte AES key from settings."""
    raw = settings.aes_master_key.get_secret_value().strip()
    try:
        # Check if hex-encoded (64 chars)
        if len(raw) == 64:
            key = bytes.fromhex(raw)
        else:
            # Check if base64 encoded
            key = base64.b64decode(raw)
    except Exception:
        key = raw.encode()[:32].ljust(32, b'\0')

    if len(key) != 32:
        raise ValueError("AES-256 Master Key must be exactly 32 bytes (64 hex characters or 44 base64 characters).")
    return key

def encrypt_bytes_aes_gcm(plaintext: bytes, associated_data: bytes = None) -> bytes:
    """
    Encrypt plaintext bytes using AES-256-GCM.
    Returns binary format: [12 bytes nonce] + [ciphertext with 16-byte authentication tag].
    """
    key = get_aes_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit unique nonce
    ciphertext_and_tag = aesgcm.encrypt(nonce, plaintext, associated_data)
    return nonce + ciphertext_and_tag

def decrypt_bytes_aes_gcm(encrypted_payload: bytes, associated_data: bytes = None) -> bytes:
    """
    Decrypt binary format [12 bytes nonce] + [ciphertext with 16-byte authentication tag].
    Raises Exception if authentication tag verification fails (tampering detected).
    """
    if len(encrypted_payload) < 28:  # 12 bytes nonce + 16 bytes tag
        raise ValueError("Invalid encrypted payload: data too short.")
    key = get_aes_key()
    aesgcm = AESGCM(key)
    nonce = encrypted_payload[:12]
    ciphertext_and_tag = encrypted_payload[12:]
    return aesgcm.decrypt(nonce, ciphertext_and_tag, associated_data)

def encrypt_to_dict(plaintext: bytes) -> Dict[str, str]:
    """Helper for JSON-serializable encryption dict."""
    encrypted_blob = encrypt_bytes_aes_gcm(plaintext)
    nonce = encrypted_blob[:12]
    ct_and_tag = encrypted_blob[12:]
    ct = ct_and_tag[:-16]
    tag = ct_and_tag[-16:]
    return {
        "nonce": base64.b64encode(nonce).decode("utf-8"),
        "ciphertext": base64.b64encode(ct).decode("utf-8"),
        "tag": base64.b64encode(tag).decode("utf-8"),
    }

def decrypt_from_dict(enc_dict: Dict[str, str]) -> bytes:
    """Helper for decrypting from JSON-serializable encryption dict."""
    nonce = base64.b64decode(enc_dict["nonce"])
    ct = base64.b64decode(enc_dict["ciphertext"])
    tag = base64.b64decode(enc_dict["tag"])
    blob = nonce + ct + tag
    return decrypt_bytes_aes_gcm(blob)
