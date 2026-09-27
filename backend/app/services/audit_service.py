from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.security.hashing import compute_audit_record_hash, GENESIS_AUDIT_HASH

class AuditService:
    @staticmethod
    def record_activity(
        db: Session,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        details: Optional[str] = None,
    ) -> AuditLog:
        """
        Record activity with cryptographic hash-chaining for immutable tamper-evidence.
        """
        # Get the previous record hash
        last_log = db.query(AuditLog).order_by(AuditLog.log_id.desc()).first()
        prev_hash = last_log.current_record_hash if last_log else GENESIS_AUDIT_HASH

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        now_iso = now.isoformat()

        curr_hash = compute_audit_record_hash(
            previous_hash=prev_hash,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            timestamp_iso=now_iso,
            ip_address=ip_address,
        )

        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            timestamp=now,
            ip_address=ip_address,
            previous_record_hash=prev_hash,
            current_record_hash=curr_hash,
            details=details,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def verify_audit_chain(db: Session) -> Dict[str, Any]:
        """
        Cryptographically verify the entire audit log chain integrity.
        Detects if any record was modified, inserted, or deleted.
        """
        logs: List[AuditLog] = db.query(AuditLog).order_by(AuditLog.log_id.asc()).all()
        if not logs:
            return {"valid": True, "total_records": 0, "message": "Audit log is empty (valid)."}

        expected_prev_hash = GENESIS_AUDIT_HASH
        for idx, entry in enumerate(logs):
            # Check previous hash link
            if entry.previous_record_hash != expected_prev_hash:
                return {
                    "valid": False,
                    "total_records": len(logs),
                    "broken_at_log_id": entry.log_id,
                    "broken_at_index": idx,
                    "reason": f"Hash chain link broken at log ID {entry.log_id}. Previous hash does not match prior record."
                }

            # Recompute current hash
            recomputed = compute_audit_record_hash(
                previous_hash=entry.previous_record_hash,
                user_id=entry.user_id,
                action=entry.action,
                resource_type=entry.resource_type,
                resource_id=entry.resource_id,
                timestamp_iso=entry.timestamp.isoformat(),
                ip_address=entry.ip_address,
            )

            if entry.current_record_hash != recomputed:
                return {
                    "valid": False,
                    "total_records": len(logs),
                    "broken_at_log_id": entry.log_id,
                    "broken_at_index": idx,
                    "reason": f"Tampering detected! Recomputed hash does not match stored hash for log ID {entry.log_id}."
                }

            expected_prev_hash = entry.current_record_hash

        return {
            "valid": True,
            "total_records": len(logs),
            "latest_hash": expected_prev_hash,
            "message": "Audit trail integrity verified: All cryptographic links valid."
        }

audit_service = AuditService()
