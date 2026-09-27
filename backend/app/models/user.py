from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from ..database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    mobile_number = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    police_id = Column(String(50), unique=True, nullable=False, index=True)
    police_rank = Column(String(50), nullable=False, index=True)
    police_station = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    account_status = Column(String(20), default="pending", nullable=False, index=True)  # pending, active, suspended, rejected
    mobile_verification_status = Column(Boolean, default=False, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)

    role_id = Column(Integer, ForeignKey("roles.role_id"), nullable=False, default=1)
    role = relationship("Role", back_populates="users")

    # Relationships
    assigned_cases = relationship("Case", foreign_keys="Case.assigned_officer_id", back_populates="assigned_officer")
    created_cases = relationship("Case", foreign_keys="Case.created_by", back_populates="creator")
    uploaded_documents = relationship("Document", foreign_keys="Document.uploaded_by", back_populates="uploader")
    document_access_logs = relationship("DocumentAccess", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    sent_shares = relationship("DocumentShare", foreign_keys="DocumentShare.shared_by", back_populates="sender")
    received_shares = relationship("DocumentShare", foreign_keys="DocumentShare.shared_with", back_populates="recipient")

class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
