import hashlib
import os
from pathlib import Path

STORAGE_ROOT = Path(__file__).resolve().parents[2] / "storage" / "documents"

def ensure_storage_dir():
    os.makedirs(STORAGE_ROOT, exist_ok=True)

def sha256_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def get_document_path(document_id: int, version: int) -> Path:
    ensure_storage_dir()
    filename = f"doc_{document_id}_v{version}.json"
    return STORAGE_ROOT / filename
