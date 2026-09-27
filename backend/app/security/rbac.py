from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.document import Document, DocumentShare
from app.models.case import Case, CaseAccess

RANK_HIERARCHY = {
    "Constable": 1,
    "Head Constable": 2,
    "ASI": 3,
    "SI": 4,
    "Inspector": 5,
    "DSP": 6,
    "SP": 7,
    "DIG": 8,
    "IG": 9,
    "DGP": 10,
    "System Administrator": 11,
}

CLASSIFICATION_MIN_RANK = {
    "Unclassified": 1,   # Constable+
    "Restricted": 2,     # Head Constable+
    "Confidential": 4,   # SI+
    "Secret": 5,         # Inspector+
    "Top Secret": 7,     # SP+
}

def get_rank_level(rank_name: str) -> int:
    return RANK_HIERARCHY.get(rank_name, 1)

def has_permission(user: User, required_permission: str) -> bool:
    """Check if the user's role has the required permission."""
    if not user.role:
        return False
    if user.police_rank == "System Administrator":
        return True
    user_perms = {p.permission_name for p in user.role.permissions}
    return required_permission in user_perms

def check_document_access(
    user: User,
    document: Document,
    action: str,  # "VIEW", "DOWNLOAD", "EDIT", "DELETE", "SHARE", "ARCHIVE"
    db: Session,
    reason: Optional[str] = None
) -> bool:
    """
    Police access control rules:
    1. System Administrator has management privileges.
    2. Document uploader has full access.
    3. Explicit sharing grant (active and unexpired) checked.
    4. Assigned officer on the case has access.
    5. Station & Rank level verification based on security classification.
    """
    # 1. System admin check
    if user.police_rank == "System Administrator":
        return True

    # 2. Uploader check
    if document.uploaded_by == user.user_id:
        return True

    # 3. Check explicit share
    active_share = db.query(DocumentShare).filter(
        DocumentShare.document_id == document.document_id,
        DocumentShare.shared_with == user.user_id,
        DocumentShare.sharing_status == "active"
    ).first()

    if active_share:
        if active_share.expiration_date and active_share.expiration_date < datetime.utcnow():
            active_share.sharing_status = "expired"
            db.commit()
        else:
            if action in ("VIEW", "VERIFY"):
                return True
            if action == "DOWNLOAD" and active_share.permission_level in ("DOWNLOAD", "EDIT"):
                return True
            if action == "EDIT" and active_share.permission_level == "EDIT":
                return True

    # 4. Check case assignment
    case = db.query(Case).filter(Case.case_id == document.case_id).first()
    if case and case.assigned_officer_id == user.user_id:
        if action in ("VIEW", "DOWNLOAD", "VERIFY", "SHARE", "EDIT"):
            return True

    # Check explicit case access
    if case:
        case_acc = db.query(CaseAccess).filter(
            CaseAccess.case_id == case.case_id,
            CaseAccess.user_id == user.user_id
        ).first()
        if case_acc:
            if case_acc.expires_at and case_acc.expires_at < datetime.utcnow():
                pass
            else:
                if action in ("VIEW", "DOWNLOAD", "VERIFY"):
                    return True

    # 5. Police station and classification level check
    user_rank_level = get_rank_level(user.police_rank)
    min_required_level = CLASSIFICATION_MIN_RANK.get(document.access_classification, 4)

    # Same station match
    same_station = (user.police_station.lower() == document.assigned_police_station.lower())
    # Senior district/state officials (SP, DIG, IG, DGP) can oversee within jurisdiction
    is_senior_supervisory = user_rank_level >= 7

    if (same_station or is_senior_supervisory) and user_rank_level >= min_required_level:
        if action in ("VIEW", "DOWNLOAD", "VERIFY"):
            return True
        if action in ("EDIT", "SHARE") and user_rank_level >= 4:  # SI and above
            return True
        if action in ("ARCHIVE", "DELETE") and user_rank_level >= 6:  # DSP and above
            return True

    return False
