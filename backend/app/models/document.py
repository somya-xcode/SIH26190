from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, BigInteger
from sqlalchemy.orm import relationship
from app.database import Base

class Document(Base):
    __tablename__ = "documents"

    document_id = Column(Integer, primary_key=True, index=True)
    document_title = Column(String(255), nullable=False, index=True)
    document_type = Column(String(100), nullable=False, index=True)
    case_id = Column(Integer, ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    assigned_police_station = Column(String(100), nullable=False, index=True)
    access_classification = Column(String(50), default="Confidential", nullable=False, index=True)  # Unclassified, Restricted, Confidential, Secret, Top Secret

    # Security & Storage
    encrypted_file_storage_path = Column(String(500), nullable=False)
    encryption_key_reference = Column(String(100), default="AES-256-GCM:v1", nullable=False)
    sha256_document_hash = Column(String(64), nullable=False, index=True)
    digital_signature = Column(Text, nullable=True)  # ECDSA signature in hex/base64
    
    # Blockchain
    blockchain_transaction_id = Column(String(128), nullable=True, index=True)
    blockchain_block_number = Column(Integer, nullable=True)
    blockchain_verification_status = Column(String(50), default="unsubmitted", nullable=False)  # unsubmitted, pending, confirmed, verified, failed

    # Metadata
    original_filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    last_modified_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    document_status = Column(String(50), default="active", nullable=False, index=True)  # active, archived, deleted

    # Relationships
    case = relationship("Case", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by], back_populates="uploaded_documents")
    access_logs = relationship("DocumentAccess", back_populates="document", cascade="all, delete-orphan")
    shares = relationship("DocumentShare", back_populates="document", cascade="all, delete-orphan")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")

class DocumentAccess(Base):
    __tablename__ = "document_access"

    access_id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    action_performed = Column(String(50), nullable=False, index=True)  # VIEW, DOWNLOAD, VERIFY, SHARE, UPDATE, ARCHIVE, DELETE
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    access_result = Column(String(50), nullable=False)  # SUCCESS, DENIED, FAILED
    reason_for_access = Column(String(255), nullable=True)

    document = relationship("Document", back_populates="access_logs")
    user = relationship("User", back_populates="document_access_logs")

class DocumentShare(Base):
    __tablename__ = "document_sharing"

    share_id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False, index=True)
    shared_by = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    shared_with = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    permission_level = Column(String(50), default="VIEW", nullable=False)  # VIEW, DOWNLOAD, EDIT
    expiration_date = Column(DateTime, nullable=True)
    sharing_status = Column(String(50), default="active", nullable=False, index=True)  # active, revoked, expired
    created_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("Document", back_populates="shares")
    sender = relationship("User", foreign_keys=[shared_by], back_populates="sent_shares")
    recipient = relationship("User", foreign_keys=[shared_with], back_populates="received_shares")

# Alias DocumentSharing for backwards compatibility
DocumentSharing = DocumentShare

class DocumentVersion(Base):
    __tablename__ = "document_versions"

    version_id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    encrypted_file_path = Column(String(500), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    blockchain_tx_id = Column(String(128), nullable=True)
    digital_signature = Column(Text, nullable=True)

    document = relationship("Document", back_populates="versions")
