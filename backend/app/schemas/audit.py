from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    log_id: int
    user_id: Optional[int] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    timestamp: datetime
    ip_address: Optional[str] = None
    previous_record_hash: str
    current_record_hash: str
    details: Optional[str] = None

    class Config:
        from_attributes = True

class AuditChainVerifyResponse(BaseModel):
    valid: bool
    total_records: int
    latest_hash: Optional[str] = None
    broken_at_log_id: Optional[int] = None
    broken_at_index: Optional[int] = None
    reason: Optional[str] = None
    message: str
