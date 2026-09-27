from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserResponse, UserUpdate, UserStatusUpdate
from app.dependencies import get_current_active_user, require_admin, get_client_ip
from app.services.audit_service import audit_service

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Return profile and permissions for the currently authenticated police officer."""
    return current_user

@router.get("", response_model=List[UserResponse])
async def list_users(
    police_station: Optional[str] = None,
    police_rank: Optional[str] = None,
    account_status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List officers. Police officers can search by station or rank.
    """
    query = db.query(User)

    # Restrict lower ranks to view officers in their own station unless senior rank
    if current_user.police_rank not in ("System Administrator", "SP", "DIG", "IG", "DGP"):
        query = query.filter(User.police_station == current_user.police_station)
    elif police_station:
        query = query.filter(User.police_station.ilike(f"%{police_station}%"))

    if police_rank:
        query = query.filter(User.police_rank == police_rank)
    if account_status:
        query = query.filter(User.account_status == account_status)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(term),
                User.police_id.ilike(term),
                User.email.ilike(term),
                User.mobile_number.ilike(term)
            )
        )

    users = query.offset(offset).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieve details of a specific officer."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Officer not found.")
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update officer profile. Officers can update self, admins can update any."""
    if current_user.user_id != user_id and current_user.police_rank != "System Administrator":
        raise HTTPException(status_code=403, detail="Permission denied to update this profile.")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Officer not found.")

    if payload.full_name:
        user.full_name = payload.full_name.strip()
    if payload.police_station:
        user.police_station = payload.police_station.strip()
    if payload.district:
        user.district = payload.district.strip()
    if payload.state:
        user.state = payload.state.strip()
    if payload.police_rank and current_user.police_rank == "System Administrator":
        user.police_rank = payload.police_rank.strip()
        role = db.query(Role).filter(Role.role_name == payload.police_rank).first()
        if role:
            user.role_id = role.role_id

    db.commit()
    db.refresh(user)

    audit_service.record_activity(
        db=db,
        action="USER_PROFILE_UPDATED",
        resource_type="USER",
        resource_id=str(user.user_id),
        user_id=current_user.user_id,
        ip_address=get_client_ip(request),
        details=f"Profile updated for user {user.user_id}"
    )

    return user

@router.patch("/{user_id}/status")
async def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: update officer account status (active, suspended, rejected)."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Officer not found.")

    if payload.account_status not in ("active", "suspended", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Invalid account status value.")

    old_status = user.account_status
    user.account_status = payload.account_status
    db.commit()

    audit_service.record_activity(
        db=db,
        action="USER_STATUS_CHANGED",
        resource_type="USER",
        resource_id=str(user.user_id),
        user_id=current_user.user_id,
        ip_address=get_client_ip(request),
        details=f"Account status changed from {old_status} to {payload.account_status} by Admin"
    )

    return {
        "status": "success",
        "message": f"Officer account status updated to '{payload.account_status}'.",
        "user_id": user.user_id,
        "new_status": user.account_status,
    }
