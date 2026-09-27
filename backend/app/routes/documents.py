from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.document import Document, DocumentShare
from app.models.user import User
from app.schemas.document import (
    DocumentResponse,
    DocumentShareRequest,
    DocumentShareResponse,
    DocumentVerifyResponse,
)
from app.dependencies import get_current_active_user, require_permission, get_client_ip
from app.security.rbac import check_document_access
from app.services.document_service import document_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document_endpoint(
    request: Request,
    case_id: int = Form(...),
    document_title: str = Form(...),
    document_type: str = Form(...),
    access_classification: str = Form("Confidential"),
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("document:upload")),
    db: Session = Depends(get_db)
):
    """
    Securely upload a police document:
    - Calculates plaintext SHA-256 hash.
    - Generates ECDSA digital signature.
    - Encrypts file with AES-256-GCM before disk storage.
    - Submits SHA-256 hash to blockchain registry.
    - Records immutable chained audit log.
    """
    ip = get_client_ip(request)
    doc = document_service.upload_document(
        db=db,
        user=current_user,
        case_id=case_id,
        document_title=document_title.strip(),
        document_type=document_type.strip(),
        access_classification=access_classification.strip(),
        file=file,
        ip_address=ip
    )
    return doc

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    case_id: Optional[int] = None,
    document_type: Optional[str] = None,
    access_classification: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all documents that the current officer is authorized to view.
    Applies RBAC and station/case/share filters.
    """
    query = db.query(Document).filter(Document.document_status != "deleted")

    if case_id:
        query = query.filter(Document.case_id == case_id)
    if document_type:
        query = query.filter(Document.document_type == document_type)
    if access_classification:
        query = query.filter(Document.access_classification == access_classification)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Document.document_title.ilike(term),
                Document.original_filename.ilike(term),
                Document.sha256_document_hash.ilike(term)
            )
        )

    all_matching = query.order_by(Document.upload_date.desc()).all()

    # Filter by officer access permissions
    accessible = [
        d for d in all_matching
        if check_document_access(current_user, d, "VIEW", db)
    ]

    return accessible[offset:offset + limit]

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document_metadata(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieve document metadata."""
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc or doc.document_status == "deleted":
        raise HTTPException(status_code=404, detail="Document not found.")

    if not check_document_access(current_user, doc, "VIEW", db):
        raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view this document.")

    return doc

@router.get("/{document_id}/download")
async def download_document_endpoint(
    document_id: int,
    request: Request,
    reason: Optional[str] = Query("Official Investigation Review"),
    current_user: User = Depends(require_permission("document:download")),
    db: Session = Depends(get_db)
):
    """
    Download and decrypt document:
    - Verifies permissions.
    - Decrypts AES-256-GCM on-the-fly.
    - Verifies decrypted payload against original SHA-256 hash.
    - Records document access event with IP and reason.
    """
    ip = get_client_ip(request)
    file_bytes, mime_type, filename = document_service.download_document(
        db=db,
        user=current_user,
        document_id=document_id,
        ip_address=ip,
        reason=reason
    )

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": mime_type,
        "X-Document-Integrity": "SHA-256-VERIFIED",
    }
    return Response(content=file_bytes, media_type=mime_type, headers=headers)

@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document_metadata(
    document_id: int,
    document_title: Optional[str] = Form(None),
    access_classification: Optional[str] = Form(None),
    request: Request = None,
    current_user: User = Depends(require_permission("document:edit")),
    db: Session = Depends(get_db)
):
    """Update document title or classification."""
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc or doc.document_status == "deleted":
        raise HTTPException(status_code=404, detail="Document not found.")

    if not check_document_access(current_user, doc, "EDIT", db):
        raise HTTPException(status_code=403, detail="Permission denied to modify this document.")

    if document_title:
        doc.document_title = document_title.strip()
    if access_classification:
        doc.access_classification = access_classification.strip()

    doc.last_modified_date = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(doc)

    audit_service.record_activity(
        db=db,
        action="DOCUMENT_METADATA_UPDATED",
        resource_type="DOCUMENT",
        resource_id=str(doc.document_id),
        user_id=current_user.user_id,
        ip_address=get_client_ip(request) if request else None,
        details=f"Document {doc.document_id} metadata updated"
    )

    return doc

@router.post("/{document_id}/share", response_model=DocumentShareResponse)
async def share_document_endpoint(
    document_id: int,
    payload: DocumentShareRequest,
    request: Request,
    current_user: User = Depends(require_permission("document:share")),
    db: Session = Depends(get_db)
):
    """Explicitly share a document with another police officer."""
    ip = get_client_ip(request)
    share = document_service.share_document(
        db=db,
        user=current_user,
        document_id=document_id,
        shared_with_user_id=payload.shared_with_user_id,
        permission_level=payload.permission_level,
        expiration_date=payload.expiration_date,
        ip_address=ip
    )
    return share

@router.delete("/{document_id}/share/{share_id}")
async def revoke_document_share_endpoint(
    document_id: int,
    share_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Revoke an active document share."""
    ip = get_client_ip(request)
    document_service.revoke_share(
        db=db,
        user=current_user,
        document_id=document_id,
        share_id=share_id,
        ip_address=ip
    )
    return {"status": "success", "message": "Document sharing permission revoked."}

@router.post("/{document_id}/verify", response_model=DocumentVerifyResponse)
async def verify_document_endpoint(
    document_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify document integrity:
    1. Reads and decrypts stored file with AES-256-GCM.
    2. Compares computed SHA-256 hash with database record.
    3. Verifies SHA-256 hash against blockchain transaction record.
    4. Validates ECDSA digital signature.
    """
    ip = get_client_ip(request)
    report = document_service.verify_document_integrity(
        db=db,
        user=current_user,
        document_id=document_id,
        ip_address=ip
    )
    return report

@router.patch("/{document_id}/archive")
async def archive_document(
    document_id: int,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Archive a document."""
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not check_document_access(current_user, doc, "ARCHIVE", db):
        raise HTTPException(status_code=403, detail="Permission denied to archive this document.")

    doc.document_status = "archived"
    doc.last_modified_date = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    audit_service.record_activity(
        db=db,
        action="DOCUMENT_ARCHIVED",
        resource_type="DOCUMENT",
        resource_id=str(doc.document_id),
        user_id=current_user.user_id,
        ip_address=get_client_ip(request),
        details=f"Document '{doc.document_title}' archived"
    )

    return {"status": "success", "message": "Document archived successfully."}
