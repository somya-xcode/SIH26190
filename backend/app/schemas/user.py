from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

class PermissionResponse(BaseModel):
    permission_id: int
    permission_name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class RoleResponse(BaseModel):
    role_id: int
    role_name: str
    rank_level: int
    description: Optional[str] = None
    permissions: List[PermissionResponse] = []

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    user_id: int
    full_name: str
    mobile_number: str
    email: EmailStr
    police_id: str
    police_rank: str
    police_station: str
    district: str
    state: str
    account_status: str
    mobile_verification_status: bool
    created_date: datetime
    last_login: Optional[datetime] = None
    role: Optional[RoleResponse] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    police_station: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    police_rank: Optional[str] = None

class UserStatusUpdate(BaseModel):
    account_status: str  # "active", "suspended", "rejected"
