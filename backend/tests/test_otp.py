import pytest
from datetime import datetime, timedelta, timezone
from app.database import Base, engine, SessionLocal
from app.models.otp import OTPVerification
from app.services.otp_service import hash_otp, verify_otp_hash, verify_officer_otp

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_otp_hash_and_verify():
    otp = "654321"
    hashed = hash_otp(otp)
    assert verify_otp_hash(otp, hashed) is True
    assert verify_otp_hash("000000", hashed) is False

def test_otp_verification_workflow(db_session):
    phone = "9876500001"
    otp = "123456"
    hashed = hash_otp(otp)
    exp = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=5)

    rec = OTPVerification(
        mobile_number=phone,
        hashed_otp=hashed,
        otp_expiration_time=exp,
        verification_status="pending",
        number_of_attempts=0
    )
    db_session.add(rec)
    db_session.commit()

    # Wrong OTP increments attempts
    with pytest.raises(ValueError) as exc:
        verify_officer_otp(db_session, phone, "999999")
    assert "Invalid OTP" in str(exc.value)

    # Correct OTP marks verified
    success = verify_officer_otp(db_session, phone, otp)
    assert success is True

    # Re-use attempt fails
    with pytest.raises(ValueError):
        verify_officer_otp(db_session, phone, otp)
