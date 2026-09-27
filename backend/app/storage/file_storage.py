import os
import uuid
import re
from pathlib import Path
from app.core.config import settings

def get_storage_base_dir() -> Path:
    storage_dir = Path(settings.upload_dir).resolve()
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal or unsafe characters."""
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    clean = clean.strip('._')
    return clean or "unnamed_document"

def save_encrypted_file(encrypted_bytes: bytes, original_filename: str, case_id: int) -> str:
    """
    Save encrypted blob to secure disk storage.
    Returns relative path to file.
    """
    base_dir = get_storage_base_dir()
    case_folder = base_dir / f"case_{case_id}"
    case_folder.mkdir(parents=True, exist_ok=True)

    safe_name = sanitize_filename(original_filename)
    unique_id = uuid.uuid4().hex[:12]
    stored_filename = f"{unique_id}_{safe_name}.enc"
    file_path = case_folder / stored_filename

    with open(file_path, "wb") as f:
        f.write(encrypted_bytes)

    # Return relative path for portability across environments
    return str(file_path.relative_to(base_dir))

def read_encrypted_file(relative_path: str) -> bytes:
    """Read encrypted file bytes from disk using relative path."""
    base_dir = get_storage_base_dir()
    full_path = (base_dir / relative_path).resolve()

    # Prevent directory traversal escape
    if not str(full_path).startswith(str(base_dir)):
        raise PermissionError("Attempted path traversal attack detected.")

    if not full_path.exists():
        raise FileNotFoundError(f"Stored encrypted document not found at: {relative_path}")

    with open(full_path, "rb") as f:
        return f.read()

def delete_encrypted_file(relative_path: str) -> bool:
    """Safely delete encrypted file from disk."""
    base_dir = get_storage_base_dir()
    full_path = (base_dir / relative_path).resolve()
    if not str(full_path).startswith(str(base_dir)):
        raise PermissionError("Attempted path traversal attack detected.")
    if full_path.exists():
        os.remove(full_path)
        return True
    return False
