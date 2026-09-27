from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Index
from app.database import Base

class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    otp_id = Column(Integer, primary_key=True, index=True)
    mobile_number = Column(String(20), nullable=False, index=True)
    hashed_otp = Column(String(255), nullable=False)
    otp_expiration_time = Column(DateTime, nullable=False, index=True)
    verification_status = Column(String(20), default="pending", nullable=False)  # pending, verified, expired, invalidated
    number_of_attempts = Column(Integer, default=0, nullable=False)
    created_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    verified_at = Column(DateTime, nullable=True)
    last_attempt_at = Column(DateTime, nullable=True)
