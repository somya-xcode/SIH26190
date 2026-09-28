import secrets
import hashlib
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List
from sqlalchemy.orm import Session

from app.models.otp import OTPVerification
from app.core.config import settings
from app.services.email_service import send_otp_email, EmailNotConfiguredError, EmailDeliveryError
from app.services.sms_service import send_sms, SMSGatewayError

# In-memory tracking for IP/Email rate limiting and cooldowns
_rate_limit_history: Dict[str, List[float]] = {}
_last_request_time: Dict[str, float] = {}

def hash_otp(otp: str, salt: Optional[str] = None) -> str:
    """Hash OTP using cryptographically random salt and SHA-256."""
    if not salt:
        salt = secrets.token_hex(16)
    combined = (salt + otp).encode("utf-8")
    digest = hashlib.sha256(combined).hexdigest()
    return f"{salt}${digest}"

def verify_otp_hash(otp: str, stored_hash: str) -> bool:
    """Verify OTP against salted SHA-256 hash in constant time."""
    try:
        salt, expected_digest = stored_hash.split("$")
    except ValueError:
        return False
    combined = (salt + otp).encode("utf-8")
    actual_digest = hashlib.sha256(combined).hexdigest()
    return hashlib.sha256(actual_digest.encode()).digest() == hashlib.sha256(expected_digest.encode()).digest()

def check_rate_limits(identifier: str) -> None:
    """Enforce rate-limiting and resend cooldowns by phone or email."""
    now = time.time()
    clean_identifier = identifier.lower().strip()

    # Check cooldown
    last_req = _last_request_time.get(clean_identifier)
    if last_req and (now - last_req) < settings.otp_resend_cooldown_seconds:
        remaining = int(settings.otp_resend_cooldown_seconds - (now - last_req))
        raise ValueError(f"Please wait {remaining} seconds before requesting a new OTP.")

    # Check rate limit window
    history = _rate_limit_history.get(clean_identifier, [])
    history = [t for t in history if now - t < settings.otp_rate_limit_window_seconds]
    _rate_limit_history[clean_identifier] = history

    if len(history) >= settings.otp_rate_limit_max_requests:
        raise ValueError("Too many OTP requests for this phone or email address. Please try again later.")

def record_otp_request(identifier: str) -> None:
    now = time.time()
    clean_identifier = identifier.lower().strip()
    _last_request_time[clean_identifier] = now
    history = _rate_limit_history.get(clean_identifier, [])
    history.append(now)
    _rate_limit_history[clean_identifier] = history

def generate_and_dispatch_otp(db: Session, email: Optional[str] = None, full_name: str = "Officer", mobile_number: Optional[str] = None) -> Dict[str, str]:
    """
    Generate a 6-digit OTP, store its salted hash, and dispatch via SMS or email.
    NEVER returns or logs plain OTP.
    """
    clean_email = email.lower().strip() if email else None
    clean_mobile = "".join(filter(str.isdigit, mobile_number or ""))
    if clean_email and ("@" not in clean_email or "." not in clean_email):
        raise ValueError("Invalid email address format.")
    if not clean_email and len(clean_mobile) < 10:
        raise ValueError("A valid phone number or email address is required.")
    if mobile_number and len(clean_mobile) < 10:
        raise ValueError("Invalid phone number.")

    identifier = clean_mobile or clean_email
    check_rate_limits(identifier)

    # Invalidate any previously pending OTP for this email
    db.query(OTPVerification).filter(
        (OTPVerification.email == clean_email if clean_email else False) |
        (OTPVerification.mobile_number == clean_mobile if clean_mobile else False),
        OTPVerification.verification_status == "pending"
    ).update({"verification_status": "invalidated"}, synchronize_session=False)
    db.commit()

    demo_mode = settings.otp_demo_mode and settings.app_env.lower() == "development"
    otp_code = "123456" if demo_mode else f"{secrets.randbelow(10**6):06d}"
    stored_hash = hash_otp(otp_code)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=settings.otp_expiration_seconds)

    record = OTPVerification(
        email=clean_email,
        mobile_number=clean_mobile or None,
        hashed_otp=stored_hash,
        otp_expiration_time=expires_at,
        verification_status="pending",
        number_of_attempts=0,
        created_timestamp=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    record_otp_request(identifier)

    if not demo_mode:
        try:
            if clean_mobile:
                send_sms(clean_mobile, f"Your eSuraksha verification code is {otp_code}. It expires in {settings.otp_expiration_seconds // 60} minutes.")
            elif clean_email:
                send_otp_email(clean_email, otp_code, full_name)
        except (EmailNotConfiguredError, EmailDeliveryError, SMSGatewayError):
            record.verification_status = "invalidated"
            db.commit()
            raise

    res = {
        "status": "success",
        "message": "Demo OTP is ready for this phone number." if demo_mode else (
            f"OTP has been sent to your phone number ending in {clean_mobile[-4:]}."
            if clean_mobile else f"OTP has been sent to your registered email address ({clean_email})."
        ),
        "expires_in_seconds": str(settings.otp_expiration_seconds),
        "resend_after_seconds": str(settings.otp_resend_cooldown_seconds),
        "delivery_status": "ready" if demo_mode else "sent",
        "demo_mode": demo_mode,
    }
    return res

def verify_officer_otp(db: Session, identifier: str, otp_code: str) -> bool:
    """
    Verify officer's entered OTP code using email or mobile number.
    Enforces expiration, attempt limits, and single-use invalidation.
    """
    clean_id = identifier.lower().strip()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    record = db.query(OTPVerification).filter(
        (OTPVerification.email == clean_id) | (OTPVerification.mobile_number == "".join(filter(str.isdigit, clean_id))),
        OTPVerification.verification_status == "pending"
    ).order_by(OTPVerification.created_timestamp.desc()).first()

    if not record:
        raise ValueError("No active OTP request found. Please request a new OTP.")

    if record.number_of_attempts >= settings.otp_max_attempts:
        record.verification_status = "invalidated"
        db.commit()
        raise ValueError("Maximum verification attempts exceeded. Please request a new OTP.")

    if now > record.otp_expiration_time:
        record.verification_status = "expired"
        db.commit()
        raise ValueError("OTP has expired. Please request a new OTP.")

    record.number_of_attempts += 1
    record.last_attempt_at = now

    is_valid = verify_otp_hash(otp_code, record.hashed_otp)
    if not is_valid:
        db.commit()
        remaining = settings.otp_max_attempts - record.number_of_attempts
        raise ValueError(f"Invalid OTP. {remaining} attempt(s) remaining.")

    # Mark verified (single-use)
    record.verification_status = "verified"
    record.verified_at = now
    db.commit()
    return True
