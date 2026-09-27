from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.case import Case, CaseAccess
from app.models.document import Document
from app.models.user import User
from app.schemas.case import CaseCreate, CaseUpdate, CaseResponse
from app.schemas.document import DocumentResponse
from app.dependencies import get_current_active_user, require_permission, get_client_ip
from app.security.rbac import get_rank_level, check_document_access
from app.services.audit_service import audit_service

router = APIRouter(prefix="/cases", tags=["Cases"])

@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    payload: CaseCreate,
    request: Request,
    current_user: User = Depends(require_permission("case:create")),
    db: Session = Depends(get_db)
):
    """Register a new police case/FIR."""
    # Check duplicate case_number
    existing = db.query(Case).filter(Case.case_number == payload.case_number.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A case with this Case/FIR number already exists.")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    new_case = Case(
        case_number=payload.case_number.strip(),
        case_title=payload.case_title.strip(),
        case_description=payload.case_description.strip() if payload.case_description else None,
        case_type=payload.case_type.strip(),
        assigned_officer_id=payload.assigned_officer_id or current_user.user_id,
        police_station=payload.police_station.strip(),
        district=payload.district.strip(),
        state=payload.state.strip(),
        case_status="Open",
        created_by=current_user.user_id,
        created_date=now,
        last_updated_date=now
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    # Grant creator full access
    creator_access = CaseAccess(
        case_id=new_case.case_id,
        user_id=current_user.user_id,
        access_level="FULL",
        granted_by=current_user.user_id,
        granted_at=now
    )
    db.add(creator_access)
    db.commit()

    audit_service.record_activity(
        db=db,
        action="CASE_CREATED",
        resource_type="CASE",
        resource_id=str(new_case.case_id),
        user_id=current_user.user_id,
        ip_address=get_client_ip(request),
        details=f"Case {new_case.case_number} registered at {new_case.police_station}"
    )

    return new_case

@router.get("", response_model=List[CaseResponse])
async def list_cases(
    status: Optional[str] = None,
    police_station: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List cases accessible to the authenticated officer based on rank, station, and assignment.
    """
    rank_lvl = get_rank_level(current_user.police_rank)
    query = db.query(Case)

    # If senior supervisory official (SP, DIG, IG, DGP, Admin), can view district/state
    if current_user.police_rank != "System Administrator" and rank_lvl < 7:
        # Constable to DSP: see assigned cases or cases within their police station
        query = query.filter(
            or_(
                Case.assigned_officer_id == current_user.user_id,
                Case.created_by == current_user.user_id,
                Case.police_station == current_user.police_station
            )
        )
    elif police_station:
        query = query.filter(Case.police_station.ilike(f"%{police_station}%"))

    if status:
        query = query.filter(Case.case_status == status)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Case.case_number.ilike(term),
                Case.case_title.ilike(term),
                Case.case_type.ilike(term)
            )
        )

    cases = query.order_by(Case.created_date.desc()).offset(offset).limit(limit).all()
    return cases

@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieve details of a specific case."""
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    rank_lvl = get_rank_level(current_user.police_rank)
    # Check access
    if current_user.police_rank != "System Administrator" and rank_lvl < 7:
        if (
            case.assigned_officer_id != current_user.user_id
            and case.created_by != current_user.user_id
            and case.police_station.lower() != current_user.police_station.lower()
        ):
            raise HTTPException(status_code=403, detail="You do not have access to view this case.")

    return case

@router.put("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: int,
    payload: CaseUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update case status, title, description, or assigned officer."""
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    # Only assigned officer, creator, or senior officers (Inspector+) can update
    rank_lvl = get_rank_level(current_user.police_rank)
    if (
        case.assigned_officer_id != current_user.user_id
        and case.created_by != current_user.user_id
        and rank_lvl < 5
        and current_user.police_rank != "System Administrator"
    ):
        raise HTTPException(status_code=403, detail="Permission denied to update this case.")

    if payload.case_title:
        case.case_title = payload.case_title.strip()
    if payload.case_description is not None:
        case.case_description = payload.case_description.strip()
    if payload.case_type:
        case.case_type = payload.case_type.strip()
    if payload.case_status:
        case.case_status = payload.case_status.strip()
    if payload.assigned_officer_id is not None:
        # Check target officer exists
        target = db.query(User).filter(User.user_id == payload.assigned_officer_id).first()
        if not target:
            raise HTTPException(status_code=400, detail="Assigned officer not found.")
        case.assigned_officer_id = payload.assigned_officer_id

    case.last_updated_date = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(case)

    audit_service.record_activity(
        db=db,
        action="CASE_UPDATED",
        resource_type="CASE",
        resource_id=str(case.case_id),
        user_id=current_user.user_id,
        ip_address=get_client_ip(request),
        details=f"Case {case.case_number} status: {case.case_status}"
    )

    return case

@router.get("/{case_id}/documents", response_model=List[DocumentResponse])
async def get_case_documents(
    case_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieve all authorized documents attached to this case."""
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    docs = db.query(Document).filter(
        Document.case_id == case_id,
        Document.document_status != "deleted"
    ).all()

    # Filter documents based on access control
    accessible_docs = [
        d for d in docs
        if check_document_access(current_user, d, "VIEW", db)
    ]
    return accessible_docs
