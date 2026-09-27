from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, LargeBinary, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class Case(Base):
    __tablename__ = "cases"
    case_id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String, unique=True, nullable=False)
    case_title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    case_status = Column(String, default="open")

    documents = relationship("Document", back_populates="case")
    access = relationship("CaseAccess", back_populates="case")

class CaseAccess(Base):
    __tablename__ = "case_access"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    access_level = Column(String, nullable=False)
    granted_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    granted_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    case = relationship("Case", back_populates="access")
    user = relationship("User", foreign_keys=[user_id])

class Document(Base):
    __tablename__ = "documents"
    document_id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    document_name = Column(String, nullable=False)
    document_type = Column(String, nullable=False)
    encrypted_file_path = Column(String, nullable=False)
    current_version = Column(Integer, default=1)
    document_status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    case = relationship("Case", back_populates="documents")
    versions = relationship("DocumentVersion", back_populates="document", order_by="DocumentVersion.version_number")

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    version_id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    sha256_hash = Column(String, nullable=False)
    encrypted_file_path = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    blockchain_transaction_id = Column(Integer, ForeignKey("blockchain_transactions.transaction_id"), nullable=True)
    verification_status = Column(String, default="pending")

    document = relationship("Document", back_populates="versions")
    blockchain_tx = relationship("BlockchainTransaction", back_populates="document_version")

    __table_args__ = (UniqueConstraint('document_id', 'version_number', name='_doc_version_uc'),)

class BlockchainTransaction(Base):
    __tablename__ = "blockchain_transactions"
    transaction_id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.document_id"), nullable=False)
    version_id = Column(Integer, ForeignKey("document_versions.version_id"), nullable=False)
    transaction_hash = Column(String, nullable=False)
    block_number = Column(Integer, nullable=True)
    document_hash = Column(String, nullable=False)
    transaction_status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)

    document_version = relationship("DocumentVersion", back_populates="blockchain_tx")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.document_id"), nullable=True)
    case_id = Column(Integer, ForeignKey("cases.case_id"), nullable=True)
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, nullable=False)
    details = Column(String, nullable=True)

    user = relationship("User")
    document = relationship("Document")
    case = relationship("Case")
