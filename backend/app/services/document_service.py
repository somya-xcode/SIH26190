import io
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple, List
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.case import Case
from app.models.document import Document, DocumentAccess, DocumentShare, DocumentVersion
from app.models.blockchain import BlockchainTransaction
from app.security.encryption import encrypt_bytes_aes_gcm, decrypt_bytes_aes_gcm
from app.security.hashing import compute_sha256, verify_sha256
from app.security.signatures import generate_ecdsa_keypair, sign_data_ecdsa, verify_signature_ecdsa
from app.security.rbac import check_document_access, has_permission
from app.storage.file_storage import save_encrypted_file, read_encrypted_file, delete_encrypted_file
from app.blockchain.client import blockchain_service
from app.services.audit_service import audit_service

ALLOWED_MIME_TYPES = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "text/plain": "txt",
    "application/json": "json",
}

class DocumentService:
    @staticmethod
    def upload_document(
        db: Session,
        user: User,
        case_id: int,
        document_title: str,
        document_type: str,
        access_classification: str,
        file: UploadFile,
        ip_address: Optional[str] = None
    ) -> Document:
        # 1. Verify case exists
        case = db.query(Case).filter(Case.case_id == case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found.")

        # 2. Check upload permission
        if not has_permission(user, "document:upload") and user.police_rank != "System Administrator":
            audit_service.record_activity(
                db=db,
                action="DOCUMENT_UPLOAD_DENIED",
                resource_type="DOCUMENT",
                user_id=user.user_id,
                ip_address=ip_address,
                details=f"Permission denied for user {user.user_id} on case {case_id}"
            )
            raise HTTPException(status_code=403, detail="Permission denied to upload documents.")

        # 3. Read plaintext file bytes
        file_bytes = file.file.read()
        file_size = len(file_bytes)
        max_bytes = settings.max_file_size_mb * 1024 * 1024
        if file_size > max_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size of {settings.max_file_size_mb} MB."
            )
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Cannot upload an empty file.")

        # 4. Compute original plaintext SHA-256 hash
        sha256_hash = compute_sha256(file_bytes)

        # 5. Generate ECDSA digital signature for integrity proof
        keys = generate_ecdsa_keypair()
        digital_sig = sign_data_ecdsa(sha256_hash.encode("utf-8"), keys["private_key_hex"])

        # 6. Encrypt file with AES-256-GCM (produces 12-byte IV + ciphertext + 16-byte tag)
        encrypted_bytes = encrypt_bytes_aes_gcm(file_bytes)

        # 7. Store encrypted file to disk
        storage_rel_path = save_encrypted_file(
            encrypted_bytes=encrypted_bytes,
            original_filename=file.filename or "document.bin",
            case_id=case_id
        )

        # 8. Create Document record
        doc = Document(
            document_title=document_title,
            document_type=document_type,
            case_id=case_id,
            uploaded_by=user.user_id,
            assigned_police_station=user.police_station,
            access_classification=access_classification or "Confidential",
            encrypted_file_storage_path=storage_rel_path,
            encryption_key_reference="AES-256-GCM:v1",
            sha256_document_hash=sha256_hash,
            digital_signature=digital_sig,
            original_filename=file.filename or "document.bin",
            mime_type=file.content_type or "application/octet-stream",
            file_size_bytes=file_size,
            document_status="active",
            upload_date=datetime.now(timezone.utc).replace(tzinfo=None),
            last_modified_date=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # 9. Register initial DocumentVersion
        doc_version = DocumentVersion(
            document_id=doc.document_id,
            version_number=1,
            sha256_hash=sha256_hash,
            encrypted_file_path=storage_rel_path,
            uploaded_by=user.user_id,
            uploaded_at=datetime.now(timezone.utc).replace(tzinfo=None),
            digital_signature=digital_sig
        )
        db.add(doc_version)
        db.commit()

        # 10. Anchor SHA-256 hash to blockchain
        bc_record = blockchain_service.record_document_hash(
            document_id=doc.document_id,
            sha256_hash=sha256_hash,
            uploader_id=user.user_id,
            document_type=document_type
        )
        doc.blockchain_transaction_id = bc_record.get("transaction_id")
        doc.blockchain_block_number = bc_record.get("block_number")
        doc.blockchain_verification_status = bc_record.get("status", "pending")
        db.commit()

        # Store in blockchain_transactions table
        bc_tx = BlockchainTransaction(
            document_id=doc.document_id,
            transaction_hash=doc.blockchain_transaction_id or "PENDING",
            block_number=doc.blockchain_block_number,
            document_hash=sha256_hash,
            network=bc_record.get("network", "Private-Ledger"),
            transaction_status=doc.blockchain_verification_status,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
            confirmed_at=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        db.add(bc_tx)
        db.commit()

        # 11. Record DocumentAccess event
        access_log = DocumentAccess(
            document_id=doc.document_id,
            user_id=user.user_id,
            action_performed="UPLOAD",
            ip_address=ip_address,
            access_result="SUCCESS",
            reason_for_access="Initial document upload"
        )
        db.add(access_log)
        db.commit()

        # 12. Create immutable chained audit log
        audit_service.record_activity(
            db=db,
            action="DOCUMENT_UPLOAD",
            resource_type="DOCUMENT",
            resource_id=str(doc.document_id),
            user_id=user.user_id,
            ip_address=ip_address,
            details=f"Document '{document_title}' uploaded for Case {case.case_number}. Hash: {sha256_hash}"
        )

        return doc

    @staticmethod
    def download_document(
        db: Session,
        user: User,
        document_id: int,
        ip_address: Optional[str] = None,
        reason: Optional[str] = "Case Review"
    ) -> Tuple[bytes, str, str]:
        doc = db.query(Document).filter(Document.document_id == document_id).first()
        if not doc or doc.document_status == "deleted":
            raise HTTPException(status_code=404, detail="Document not found.")

        # Check access permission
        has_access = check_document_access(user, doc, "DOWNLOAD", db, reason)
        if not has_access:
            access_log = DocumentAccess(
                document_id=doc.document_id,
                user_id=user.user_id,
                action_performed="DOWNLOAD",
                ip_address=ip_address,
                access_result="DENIED",
                reason_for_access=reason or "Unauthorized attempt"
            )
            db.add(access_log)
            db.commit()

            audit_service.record_activity(
                db=db,
                action="DOCUMENT_DOWNLOAD_UNAUTHORIZED",
                resource_type="DOCUMENT",
                resource_id=str(doc.document_id),
                user_id=user.user_id,
                ip_address=ip_address,
                details=f"Unauthorized download attempt by user {user.user_id} ({user.police_rank})"
            )
            raise HTTPException(status_code=403, detail="Access denied: You do not have permission to download this document.")

        # Read encrypted bytes
        encrypted_bytes = read_encrypted_file(doc.encrypted_file_storage_path)

        # Decrypt with AES-256-GCM
        try:
            decrypted_bytes = decrypt_bytes_aes_gcm(encrypted_bytes)
        except Exception as e:
            audit_service.record_activity(
                db=db,
                action="DOCUMENT_DECRYPTION_FAILED",
                resource_type="DOCUMENT",
                resource_id=str(doc.document_id),
                user_id=user.user_id,
                ip_address=ip_address,
                details="Cryptographic AES-GCM tag verification failure"
            )
            raise HTTPException(status_code=500, detail="Document decryption failed: integrity check failed.")

        # Verify SHA-256 integrity check against stored metadata
        if not verify_sha256(decrypted_bytes, doc.sha256_document_hash):
            audit_service.record_activity(
                db=db,
                action="DOCUMENT_INTEGRITY_TAMPERING_DETECTED",
                resource_type="DOCUMENT",
                resource_id=str(doc.document_id),
                user_id=user.user_id,
                ip_address=ip_address,
                details="Decrypted document SHA-256 hash does not match original registered hash!"
            )
            raise HTTPException(
                status_code=409,
                detail="Critical security alert: Document integrity check failed! File may have been tampered with."
            )

        # Log document access
        access_log = DocumentAccess(
            document_id=doc.document_id,
            user_id=user.user_id,
            action_performed="DOWNLOAD",
            ip_address=ip_address,
            access_result="SUCCESS",
            reason_for_access=reason
        )
        db.add(access_log)
        db.commit()

        audit_service.record_activity(
            db=db,
            action="DOCUMENT_DOWNLOAD",
            resource_type="DOCUMENT",
            resource_id=str(doc.document_id),
            user_id=user.user_id,
            ip_address=ip_address,
            details=f"Document downloaded by {user.full_name} ({user.police_rank}). Reason: {reason}"
        )

        return decrypted_bytes, doc.mime_type, doc.original_filename

    @staticmethod
    def verify_document_integrity(
        db: Session,
        user: User,
        document_id: int,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        doc = db.query(Document).filter(Document.document_id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")

        # Verify file can be read and decrypted
        encrypted_bytes = read_encrypted_file(doc.encrypted_file_storage_path)
        decrypted_bytes = decrypt_bytes_aes_gcm(encrypted_bytes)

        # Check local SHA-256
        calculated_hash = compute_sha256(decrypted_bytes)
        local_hash_match = (calculated_hash.lower() == doc.sha256_document_hash.lower())

        # Check Blockchain Registry
        blockchain_verification = blockchain_service.verify_document_hash(doc.sha256_document_hash)

        # Check digital signature presence
        has_signature = bool(doc.digital_signature)

        is_fully_verified = local_hash_match and blockchain_verification.get("verified", False)

        # Log verification access
        access_log = DocumentAccess(
            document_id=doc.document_id,
            user_id=user.user_id,
            action_performed="VERIFY",
            ip_address=ip_address,
            access_result="SUCCESS" if is_fully_verified else "FAILED",
            reason_for_access="Cryptographic integrity verification check"
        )
        db.add(access_log)
        db.commit()

        audit_service.record_activity(
            db=db,
            action="DOCUMENT_VERIFY",
            resource_type="DOCUMENT",
            resource_id=str(doc.document_id),
            user_id=user.user_id,
            ip_address=ip_address,
            details=f"Verification result: {'PASSED' if is_fully_verified else 'FAILED'}"
        )

        return {
            "document_id": doc.document_id,
            "document_title": doc.document_title,
            "sha256_hash": doc.sha256_document_hash,
            "local_integrity_verified": local_hash_match,
            "blockchain_verified": blockchain_verification.get("verified", False),
            "blockchain_transaction_id": doc.blockchain_transaction_id,
            "blockchain_block_number": doc.blockchain_block_number,
            "has_ecdsa_signature": has_signature,
            "status": "VERIFIED" if is_fully_verified else "TAMPERED_OR_UNCONFIRMED",
            "verified_at": datetime.now(timezone.utc).isoformat()
        }

    @staticmethod
    def share_document(
        db: Session,
        user: User,
        document_id: int,
        shared_with_user_id: int,
        permission_level: str = "VIEW",
        expiration_date: Optional[datetime] = None,
        ip_address: Optional[str] = None
    ) -> DocumentShare:
        doc = db.query(Document).filter(Document.document_id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")

        # Check permission to share
        if not check_document_access(user, doc, "SHARE", db):
            raise HTTPException(status_code=403, detail="You do not have permission to share this document.")

        recipient = db.query(User).filter(User.user_id == shared_with_user_id).first()
        if not recipient:
            raise HTTPException(status_code=404, detail="Target officer not found.")

        share = DocumentShare(
            document_id=document_id,
            shared_by=user.user_id,
            shared_with=shared_with_user_id,
            permission_level=permission_level,
            expiration_date=expiration_date,
            sharing_status="active",
            created_timestamp=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        db.add(share)
        db.commit()
        db.refresh(share)

        audit_service.record_activity(
            db=db,
            action="DOCUMENT_SHARE",
            resource_type="DOCUMENT",
            resource_id=str(document_id),
            user_id=user.user_id,
            ip_address=ip_address,
            details=f"Shared with Officer {recipient.full_name} ({recipient.police_rank}) with level {permission_level}"
        )

        return share

    @staticmethod
    def revoke_share(
        db: Session,
        user: User,
        document_id: int,
        share_id: int,
        ip_address: Optional[str] = None
    ) -> bool:
        share = db.query(DocumentShare).filter(
            DocumentShare.share_id == share_id,
            DocumentShare.document_id == document_id
        ).first()
        if not share:
            raise HTTPException(status_code=404, detail="Share record not found.")

        # Verify user is sender or admin
        if share.shared_by != user.user_id and user.police_rank != "System Administrator":
            raise HTTPException(status_code=403, detail="You cannot revoke this share.")

        share.sharing_status = "revoked"
        db.commit()

        audit_service.record_activity(
            db=db,
            action="DOCUMENT_SHARE_REVOKED",
            resource_type="DOCUMENT",
            resource_id=str(document_id),
            user_id=user.user_id,
            ip_address=ip_address,
            details=f"Revoked sharing permission for share ID {share_id}"
        )
        return True

document_service = DocumentService()
