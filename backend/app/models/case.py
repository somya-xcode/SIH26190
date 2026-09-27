from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

class Case(Base):
    __tablename__ = "cases"

    case_id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(64), unique=True, nullable=False, index=True)
    case_title = Column(String(255), nullable=False, index=True)
    case_description = Column(Text, nullable=True)
    case_type = Column(String(100), nullable=False, index=True)  # Criminal, Cybercrime, Narcotics, etc.
    assigned_officer_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True)
    police_station = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    case_status = Column(String(50), default="Open", nullable=False, index=True)  # Open, Under Investigation, Chargesheeted, Closed, Archived
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    created_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id], back_populates="assigned_cases")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_cases")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    case_accesses = relationship("CaseAccess", back_populates="case", cascade="all, delete-orphan")

class CaseAccess(Base):
    __tablename__ = "case_access"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    access_level = Column(String(50), default="READ", nullable=False)  # READ, WRITE, FULL
    granted_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)

    case = relationship("Case", back_populates="case_accesses")
    user = relationship("User", foreign_keys=[user_id])
