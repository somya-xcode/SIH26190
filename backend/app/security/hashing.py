import hashlib
from typing import Optional

def compute_sha256(data: bytes) -> str:
    """Compute standard lowercase hexadecimal SHA-256 hash of bytes."""
    return hashlib.sha256(data).hexdigest()

def verify_sha256(data: bytes, expected_hash: str) -> bool:
    """Verify data matches the expected SHA-256 hash (constant time comparison)."""
    calculated = compute_sha256(data)
    return hashlib.sha256(calculated.encode()).digest() == hashlib.sha256(expected_hash.lower().encode()).digest()

def compute_audit_record_hash(
    previous_hash: str,
    user_id: Optional[int],
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    timestamp_iso: str,
    ip_address: Optional[str]
) -> str:
    """
    Compute cryptographic SHA-256 chained hash for audit log integrity.
    Hash = SHA256(previous_hash + "|" + user_id + "|" + action + "|" + resource_type + "|" + resource_id + "|" + timestamp + "|" + ip)
    """
    payload = f"{previous_hash}|{user_id or 'SYSTEM'}|{action}|{resource_type}|{resource_id or 'NONE'}|{timestamp_iso}|{ip_address or '0.0.0.0'}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

GENESIS_AUDIT_HASH = "0000000000000000000000000000000000000000000000000000000000000000"
