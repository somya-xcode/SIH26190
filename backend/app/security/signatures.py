import base64
from ecdsa import SigningKey, VerifyingKey, SECP256k1, BadSignatureError

def generate_ecdsa_keypair() -> dict:
    """Generate a new ECDSA key pair using SECP256k1 curve."""
    sk = SigningKey.generate(curve=SECP256k1)
    vk = sk.verifying_key
    return {
        "private_key_hex": sk.to_string().hex(),
        "public_key_hex": vk.to_string().hex(),
    }

def sign_data_ecdsa(data: bytes, private_key_hex: str) -> str:
    """Sign data or SHA-256 hash using ECDSA private key. Returns base64 signature."""
    try:
        sk = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=SECP256k1)
        signature = sk.sign(data)
        return base64.b64encode(signature).decode("utf-8")
    except Exception as e:
        raise ValueError(f"Failed to sign data with ECDSA: {str(e)}")

def verify_signature_ecdsa(data: bytes, signature_b64: str, public_key_hex: str) -> bool:
    """Verify an ECDSA signature against data/hash with public key."""
    try:
        vk = VerifyingKey.from_string(bytes.fromhex(public_key_hex), curve=SECP256k1)
        signature = base64.b64decode(signature_b64)
        return vk.verify(signature, data)
    except (BadSignatureError, Exception):
        return False
