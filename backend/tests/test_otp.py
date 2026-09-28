import pytest
from datetime import datetime, timedelta, timezone
from app.database import Base, engine, SessionLocal
from app.models.otp import OTPVerification
from app.core.config import settings
from app.services.otp_service import (
    generate_and_dispatch_otp,
    hash_otp,
    verify_otp_hash,
    verify_officer_otp,
)

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

def test_demo_otp_is_fixed_and_phone_bound(db_session, monkeypatch):
    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "otp_demo_mode", True)

    result = generate_and_dispatch_otp(
        db_session,
        email="demo.phone.otp@example.test",
        mobile_number="9876500099",
    )

    assert result["demo_mode"] is True
    assert result["delivery_status"] == "ready"
    assert verify_officer_otp(db_session, "9876500099", "123456") is True

def test_demo_otp_is_disabled_outside_development(db_session, monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "otp_demo_mode", True)
    monkeypatch.setattr("app.services.otp_service.send_sms", lambda *_: True)

    result = generate_and_dispatch_otp(
        db_session,
        email="production.phone.otp@example.test",
        mobile_number="9876500088",
    )

    assert result["demo_mode"] is False
    with pytest.raises(ValueError, match="Invalid OTP"):
        verify_officer_otp(db_session, "9876500088", "123456")
