from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class CaseCreate(BaseModel):
    case_number: str = Field(..., min_length=3, max_length=64, description="Unique FIR/Case number")
    case_title: str = Field(..., min_length=3, max_length=255)
    case_description: Optional[str] = None
    case_type: str = Field(..., description="e.g. Criminal, Cybercrime, Narcotics, Financial Fraud")
    assigned_officer_id: Optional[int] = None
    police_station: str = Field(..., min_length=2, max_length=100)
    district: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)

class CaseUpdate(BaseModel):
    case_title: Optional[str] = None
    case_description: Optional[str] = None
    case_type: Optional[str] = None
    case_status: Optional[str] = None  # Open, Under Investigation, Chargesheeted, Closed, Archived
    assigned_officer_id: Optional[int] = None

class CaseResponse(BaseModel):
    case_id: int
    case_number: str
    case_title: str
    case_description: Optional[str] = None
    case_type: str
    assigned_officer_id: Optional[int] = None
    police_station: str
    district: str
    state: str
    case_status: str
    created_by: int
    created_date: datetime
    last_updated_date: datetime

    class Config:
        from_attributes = True
