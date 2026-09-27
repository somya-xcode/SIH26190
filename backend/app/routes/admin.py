from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.case import Case
from app.models.document import Document, DocumentAccess
from app.schemas.admin import DashboardStatsResponse
from app.dependencies import require_admin
from app.blockchain.client import blockchain_service

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_statistics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieve comprehensive administrator dashboard statistics.
    Accessible only to authorized System Administrators.
    """
    # Officers metrics
    total_officers = db.query(func.count(User.user_id)).scalar() or 0
    verified_officers = db.query(func.count(User.user_id)).filter(User.mobile_verification_status == True).scalar() or 0
    pending_officers = db.query(func.count(User.user_id)).filter(User.account_status == "pending").scalar() or 0
    suspended_officers = db.query(func.count(User.user_id)).filter(User.account_status == "suspended").scalar() or 0

    # Cases metrics
    total_cases = db.query(func.count(Case.case_id)).scalar() or 0
    open_cases = db.query(func.count(Case.case_id)).filter(Case.case_status == "Open").scalar() or 0
    closed_cases = db.query(func.count(Case.case_id)).filter(Case.case_status == "Closed").scalar() or 0

    # Documents metrics
    total_docs = db.query(func.count(Document.document_id)).scalar() or 0
    active_docs = db.query(func.count(Document.document_id)).filter(Document.document_status == "active").scalar() or 0
    archived_docs = db.query(func.count(Document.document_id)).filter(Document.document_status == "archived").scalar() or 0
    anchored_docs = db.query(func.count(Document.document_id)).filter(Document.blockchain_transaction_id.isnot(None)).scalar() or 0

    # Recent document activity
    recent_docs = db.query(Document).order_by(Document.upload_date.desc()).limit(10).all()
    recent_doc_list = [
        {
            "document_id": d.document_id,
            "document_title": d.document_title,
            "case_id": d.case_id,
            "document_type": d.document_type,
            "uploaded_by": d.uploaded_by,
            "upload_date": d.upload_date.isoformat(),
            "blockchain_status": d.blockchain_verification_status,
        }
        for d in recent_docs
    ]

    # Recent document access history
    recent_access = db.query(DocumentAccess).order_by(DocumentAccess.timestamp.desc()).limit(10).all()
    recent_access_list = [
        {
            "access_id": a.access_id,
            "document_id": a.document_id,
            "user_id": a.user_id,
            "action": a.action_performed,
            "timestamp": a.timestamp.isoformat(),
            "ip_address": a.ip_address,
            "result": a.access_result,
            "reason": a.reason_for_access,
        }
        for a in recent_access
    ]

    return DashboardStatsResponse(
        total_registered_officers=total_officers,
        verified_officers=verified_officers,
        pending_officers=pending_officers,
        suspended_officers=suspended_officers,
        total_cases=total_cases,
        open_cases=open_cases,
        closed_cases=closed_cases,
        total_uploaded_documents=total_docs,
        active_documents=active_docs,
        archived_documents=archived_docs,
        blockchain_anchored_documents=anchored_docs,
        blockchain_operational=blockchain_service.is_operational(),
        recent_document_activity=recent_doc_list,
        recent_access_logs=recent_access_list,
    )
