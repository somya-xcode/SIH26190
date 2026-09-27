import secrets
import hashlib
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List
from sqlalchemy.orm import Session

from app.models.otp import OTPVerification
from app.core.config import settings
from app.services.sms_service import send_sms, SMSGatewayNotConfiguredError, SMSGatewayError

# In-memory tracking for IP/Phone rate limiting and cooldowns
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

def check_rate_limits(phone_number: str) -> None:
    """Enforce rate-limiting and resend cooldowns."""
    now = time.time()

    # Check cooldown
    last_req = _last_request_time.get(phone_number)
    if last_req and (now - last_req) < settings.otp_resend_cooldown_seconds:
        remaining = int(settings.otp_resend_cooldown_seconds - (now - last_req))
        raise ValueError(f"Please wait {remaining} seconds before requesting a new OTP.")

    # Check rate limit window
    history = _rate_limit_history.get(phone_number, [])
    history = [t for t in history if now - t < settings.otp_rate_limit_window_seconds]
    _rate_limit_history[phone_number] = history

    if len(history) >= settings.otp_rate_limit_max_requests:
        raise ValueError("Too many OTP requests for this phone number. Please try again later.")

def record_otp_request(phone_number: str) -> None:
    now = time.time()
    _last_request_time[phone_number] = now
    history = _rate_limit_history.get(phone_number, [])
    history.append(now)
    _rate_limit_history[phone_number] = history

def generate_and_dispatch_otp(db: Session, mobile_number: str) -> Dict[str, str]:
    """
    Generate cryptographically secure 6-digit OTP, store salted hash, and dispatch via real SMS.
    NEVER returns or logs plain OTP.
    """
    clean_mobile = "".join(filter(str.isdigit, mobile_number))
    if len(clean_mobile) < 10:
        raise ValueError("Invalid mobile number format. Minimum 10 digits required.")

    check_rate_limits(clean_mobile)

    # Invalidate any previously pending OTP for this number
    db.query(OTPVerification).filter(
        OTPVerification.mobile_number == clean_mobile,
        OTPVerification.verification_status == "pending"
    ).update({"verification_status": "invalidated"})
    db.commit()

    # Generate cryptographically secure 6-digit OTP
    otp_code = f"{secrets.randbelow(10**6):06d}"
    stored_hash = hash_otp(otp_code)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=settings.otp_expiration_seconds)

    record = OTPVerification(
        mobile_number=clean_mobile,
        hashed_otp=stored_hash,
        otp_expiration_time=expires_at,
        verification_status="pending",
        number_of_attempts=0,
        created_timestamp=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    record_otp_request(clean_mobile)

    message = f"DocGuard Police Verification: Your OTP is {otp_code}. Valid for {settings.otp_expiration_seconds // 60} minutes. Never share this code."

    # Dispatch via real SMS gateway
    sms_status = "sent"
    warning = None
    try:
        send_sms(clean_mobile, message)
    except SMSGatewayNotConfiguredError as e:
        sms_status = "simulated_dispatch"
        warning = str(e)
    except SMSGatewayError as e:
        sms_status = "failed"
        warning = str(e)

    res = {
        "status": "success",
        "message": "OTP has been sent to your registered mobile number.",
        "expires_in_seconds": str(settings.otp_expiration_seconds),
        "sms_delivery_status": sms_status,
    }
    if warning:
        res["gateway_notice"] = warning
    return res

def verify_officer_otp(db: Session, mobile_number: str, otp_code: str) -> bool:
    """
    Verify officer's entered OTP code.
    Enforces expiration, attempt limits, and single-use invalidation.
    """
    clean_mobile = "".join(filter(str.isdigit, mobile_number))
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    record = db.query(OTPVerification).filter(
        OTPVerification.mobile_number == clean_mobile,
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
