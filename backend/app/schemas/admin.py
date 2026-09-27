from typing import List, Dict, Any
from pydantic import BaseModel

class DashboardStatsResponse(BaseModel):
    total_registered_officers: int
    verified_officers: int
    pending_officers: int
    suspended_officers: int
    total_cases: int
    open_cases: int
    closed_cases: int
    total_uploaded_documents: int
    active_documents: int
    archived_documents: int
    blockchain_anchored_documents: int
    blockchain_operational: bool
    recent_document_activity: List[Dict[str, Any]]
    recent_access_logs: List[Dict[str, Any]]
