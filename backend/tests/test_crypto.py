import pytest
from app.security.encryption import encrypt_bytes_aes_gcm, decrypt_bytes_aes_gcm
from app.security.hashing import compute_sha256, verify_sha256, compute_audit_record_hash, GENESIS_AUDIT_HASH
from app.security.signatures import generate_ecdsa_keypair, sign_data_ecdsa, verify_signature_ecdsa

def test_aes_256_gcm_roundtrip():
    secret_data = b"CONFIDENTIAL_POLICE_CASE_REPORT_SECTION_302_IPC"
    encrypted = encrypt_bytes_aes_gcm(secret_data)
    assert len(encrypted) > len(secret_data)
    # Ensure ciphertext is not plaintext
    assert secret_data not in encrypted

    # Decrypt and verify
    decrypted = decrypt_bytes_aes_gcm(encrypted)
    assert decrypted == secret_data

def test_aes_256_gcm_tamper_detection():
    secret_data = b"CONFIDENTIAL_RECORD"
    encrypted = bytearray(encrypt_bytes_aes_gcm(secret_data))
    
    # Tamper with a single byte in ciphertext
    encrypted[-1] ^= 0xFF

    with pytest.raises(Exception):
        decrypt_bytes_aes_gcm(bytes(encrypted))

def test_sha256_integrity():
    content = b"FIR Content 2026 Delhi Police"
    digest = compute_sha256(content)
    assert len(digest) == 64
    assert verify_sha256(content, digest) is True
    assert verify_sha256(b"Tampered Content", digest) is False

def test_ecdsa_signature_verification():
    keys = generate_ecdsa_keypair()
    data = b"Document_SHA256_Hash_To_Sign"
    signature = sign_data_ecdsa(data, keys["private_key_hex"])
    
    assert verify_signature_ecdsa(data, signature, keys["public_key_hex"]) is True
    assert verify_signature_ecdsa(b"Forged_Data", signature, keys["public_key_hex"]) is False

def test_audit_log_hash_chain():
    prev_hash = GENESIS_AUDIT_HASH
    curr_hash_1 = compute_audit_record_hash(
        previous_hash=prev_hash,
        user_id=1,
        action="LOGIN",
        resource_type="USER",
        resource_id="1",
        timestamp_iso="2026-09-27T10:00:00",
        ip_address="127.0.0.1"
    )
    assert len(curr_hash_1) == 64

    curr_hash_2 = compute_audit_record_hash(
        previous_hash=curr_hash_1,
        user_id=1,
        action="UPLOAD",
        resource_type="DOCUMENT",
        resource_id="101",
        timestamp_iso="2026-09-27T10:05:00",
        ip_address="127.0.0.1"
    )
    assert len(curr_hash_2) == 64
    assert curr_hash_2 != curr_hash_1
