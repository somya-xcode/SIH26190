from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit import AuditLog
from app.models.document import Document, DocumentAccess
from app.models.user import User
from app.schemas.audit import AuditLogResponse, AuditChainVerifyResponse
from app.schemas.document import DocumentAccessLogResponse
from app.dependencies import get_current_active_user, require_permission
from app.services.audit_service import audit_service
from app.security.rbac import check_document_access

router = APIRouter(tags=["Audit & Integrity"])

@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    resource_type: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(require_permission("audit:view")),
    db: Session = Depends(get_db)
):
    """
    Retrieve system audit logs containing cryptographic hash-chaining verification tokens.
    """
    query = db.query(AuditLog)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if action:
        query = query.filter(AuditLog.action == action)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    logs = query.order_by(AuditLog.log_id.desc()).offset(offset).limit(limit).all()
    return logs

@router.get("/audit-logs/verify-chain", response_model=AuditChainVerifyResponse)
async def verify_audit_trail_chain(
    current_user: User = Depends(require_permission("audit:view")),
    db: Session = Depends(get_db)
):
    """
    Cryptographically verify the entire audit log hash chain.
    Confirms zero tampering, insertion, or deletion of audit logs.
    """
    report = audit_service.verify_audit_chain(db)
    return report

@router.get("/audit-logs/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: int,
    current_user: User = Depends(require_permission("audit:view")),
    db: Session = Depends(get_db)
):
    """Retrieve a single audit log entry by ID."""
    entry = db.query(AuditLog).filter(AuditLog.log_id == log_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Audit log entry not found.")
    return entry

@router.get("/documents/{document_id}/history", response_model=List[DocumentAccessLogResponse])
async def get_document_access_history(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve full chronological access and activity history for a specific document.
    """
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not check_document_access(current_user, doc, "VIEW", db):
        raise HTTPException(status_code=403, detail="Permission denied to view history for this document.")

    access_logs = db.query(DocumentAccess).filter(
        DocumentAccess.document_id == document_id
    ).order_by(DocumentAccess.timestamp.desc()).all()

    return access_logs
