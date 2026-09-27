from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class DocumentResponse(BaseModel):
    document_id: int
    document_title: str
    document_type: str
    case_id: int
    uploaded_by: int
    assigned_police_station: str
    access_classification: str
    sha256_document_hash: str
    blockchain_transaction_id: Optional[str] = None
    blockchain_block_number: Optional[int] = None
    blockchain_verification_status: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    document_status: str
    upload_date: datetime
    last_modified_date: datetime
    has_signature: bool = False

    class Config:
        from_attributes = True

class DocumentShareRequest(BaseModel):
    shared_with_user_id: int = Field(..., description="Target officer user_id")
    permission_level: str = Field(default="VIEW", description="VIEW, DOWNLOAD, or EDIT")
    expiration_date: Optional[datetime] = None

class DocumentShareResponse(BaseModel):
    share_id: int
    document_id: int
    shared_by: int
    shared_with: int
    permission_level: str
    expiration_date: Optional[datetime] = None
    sharing_status: str
    created_timestamp: datetime

    class Config:
        from_attributes = True

class DocumentVerifyResponse(BaseModel):
    document_id: int
    document_title: str
    sha256_hash: str
    local_integrity_verified: bool
    blockchain_verified: bool
    blockchain_transaction_id: Optional[str] = None
    blockchain_block_number: Optional[int] = None
    has_ecdsa_signature: bool
    status: str
    verified_at: str

class DocumentAccessLogResponse(BaseModel):
    access_id: int
    document_id: int
    user_id: int
    action_performed: str
    timestamp: datetime
    ip_address: Optional[str] = None
    access_result: str
    reason_for_access: Optional[str] = None

    class Config:
        from_attributes = True
