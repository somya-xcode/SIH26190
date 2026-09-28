from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User
from app.models.role import Role
from app.models.otp import OTPVerification
from app.schemas.auth import (
    SendOTPRequest,
    VerifyOTPRequest,
    RegisterOfficerRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
)
from app.schemas.registration import StartRegistrationRequest, CompleteRegistrationRequest
from app.security.password import hash_password, verify_password
from app.security.jwt import create_access_token, create_refresh_token, decode_token, blacklist_token
from app.services.otp_service import generate_and_dispatch_otp, verify_officer_otp
from app.services.email_service import EmailDeliveryError, EmailNotConfiguredError
from app.services.sms_service import SMSGatewayError, SMSGatewayNotConfiguredError
from app.services.audit_service import audit_service
from app.dependencies import get_client_ip, get_current_user
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/send-otp")
async def send_otp_endpoint(payload: SendOTPRequest, db: Session = Depends(get_db)):
    """Generate and dispatch a cryptographically secure 6-digit OTP via Email."""
    try:
        result = generate_and_dispatch_otp(db, email=payload.email, full_name=payload.full_name or "Officer", mobile_number=payload.mobile_number)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except EmailNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except SMSGatewayNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except EmailDeliveryError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except SMSGatewayError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process OTP dispatch.")

@router.post("/verify-otp")
async def verify_otp_endpoint(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verify the 6-digit OTP code entered by the officer."""
    try:
        verify_officer_otp(db, payload.phone_number or str(payload.email), payload.otp)
        return {"status": "success", "message": "Email address verified successfully."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_officer(
    payload: RegisterOfficerRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Register a new police officer.
    Requires prior successful email OTP verification.
    """
    clean_mobile = "".join(filter(str.isdigit, payload.mobile_number))
    clean_email = payload.email.lower().strip()
    ip = get_client_ip(request)

    # 1. Verify OTP was completed for this email within last 15 minutes
    otp_record = db.query(OTPVerification).filter(
        (OTPVerification.email == clean_email) | (OTPVerification.mobile_number == clean_mobile),
        OTPVerification.verification_status == "verified"
    ).order_by(OTPVerification.verified_at.desc()).first()

    if not otp_record or not otp_record.verified_at or (datetime.now(timezone.utc).replace(tzinfo=None) - otp_record.verified_at) > timedelta(minutes=15):
        raise HTTPException(
            status_code=400,
            detail="Email address not verified or OTP verification expired. Please verify via OTP first."
        )

    # 2. Check duplicates for mobile, email, and police_id
    existing_user = db.query(User).filter(
        or_(
            User.mobile_number == clean_mobile,
            User.email == payload.email.lower(),
            User.police_id == payload.police_id.strip()
        )
    ).first()

    if existing_user:
        if existing_user.mobile_number == clean_mobile:
            detail = "An officer with this mobile number is already registered."
        elif existing_user.email == payload.email.lower():
            detail = "An officer with this email address is already registered."
        else:
            detail = "An officer with this Police ID is already registered."
        raise HTTPException(status_code=400, detail=detail)

    # 3. Resolve role from rank
    role = db.query(Role).filter(Role.role_name == payload.police_rank).first()
    if not role:
        # Default to Constable role (role_id 1) if not explicitly matched
        role = db.query(Role).filter(Role.role_name == "Constable").first()
    role_id = role.role_id if role else 1

    # 4. Create user record
    new_user = User(
        full_name=payload.full_name.strip(),
        mobile_number=clean_mobile,
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        police_id=payload.police_id.strip(),
        police_rank=payload.police_rank.strip(),
        role_id=role_id,
        police_station=payload.police_station.strip(),
        district=payload.district.strip(),
        state=payload.state.strip(),
        account_status="active",  # Activated upon mobile verification
        mobile_verification_status=True,
        created_date=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Invalidate OTP record so it cannot be reused
    otp_record.verification_status = "invalidated"
    db.commit()

    # Chained audit log
    audit_service.record_activity(
        db=db,
        action="OFFICER_REGISTERED",
        resource_type="USER",
        resource_id=str(new_user.user_id),
        user_id=new_user.user_id,
        ip_address=ip,
        details=f"Officer registered: {new_user.full_name} ({new_user.police_rank}), Station: {new_user.police_station}"
    )

    return {
        "status": "success",
        "message": "Registration successful. You can now log in.",
        "user_id": new_user.user_id,
        "full_name": new_user.full_name,
        "police_rank": new_user.police_rank,
    }

@router.post("/start-registration")
async def start_registration(payload: StartRegistrationRequest, db: Session = Depends(get_db)):
    """Initiate officer onboarding by dispatching a phone verification OTP."""
    try:
        return generate_and_dispatch_otp(db, email=payload.email, full_name=payload.full_name or "Officer", mobile_number=payload.phone_number)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except EmailNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except SMSGatewayNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except EmailDeliveryError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except SMSGatewayError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process OTP dispatch.")

@router.post("/complete-registration", status_code=status.HTTP_201_CREATED)
async def complete_registration(
    payload: CompleteRegistrationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Complete officer registration from the frontend registration portal.
    """
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    clean_email = payload.email.lower().strip()
    clean_mobile = "".join(filter(str.isdigit, payload.phone_number))
    verified_cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=15)
    verified_otp = db.query(OTPVerification).filter(
        OTPVerification.mobile_number == clean_mobile,
        OTPVerification.verification_status == "verified",
        OTPVerification.verified_at >= verified_cutoff,
    ).order_by(OTPVerification.verified_at.desc()).first()
    if not verified_otp:
        raise HTTPException(
            status_code=400,
            detail="Email address not verified or OTP verification expired. Please verify via OTP first."
        )

    ip = get_client_ip(request)

    # Check duplicates for mobile, email, and police_id
    existing_user = db.query(User).filter(
        or_(
            User.mobile_number == clean_mobile,
            User.email == payload.email.lower(),
            User.police_id == payload.police_id.strip()
        )
    ).first()

    if existing_user:
        if existing_user.mobile_number == clean_mobile:
            detail = "An officer with this mobile number is already registered."
        elif existing_user.email == payload.email.lower():
            detail = "An officer with this email address is already registered."
        else:
            detail = "An officer with this Police ID is already registered."
        raise HTTPException(status_code=400, detail=detail)

    # Resolve role from rank
    role = db.query(Role).filter(Role.role_name == payload.rank.strip()).first()
    if not role:
        role = db.query(Role).filter(Role.role_name == "Constable").first()
    role_id = role.role_id if role else 1

    new_user = User(
        full_name=payload.full_name.strip(),
        mobile_number=clean_mobile,
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        police_id=payload.police_id.strip(),
        police_rank=payload.rank.strip(),
        role_id=role_id,
        police_station=payload.station.strip(),
        district=payload.district.strip(),
        state="National Capital",
        account_status="active",
        mobile_verification_status=True,
        created_date=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    verified_otp.verification_status = "invalidated"
    db.commit()

    audit_service.record_activity(
        db=db,
        action="OFFICER_REGISTERED",
        resource_type="USER",
        resource_id=str(new_user.user_id),
        user_id=new_user.user_id,
        ip_address=ip,
        details=f"Officer registered: {new_user.full_name} ({new_user.police_rank}), Station: {new_user.police_station}"
    )

    return {
        "status": "success",
        "message": "Registration successful. You can now log in.",
        "user_id": new_user.user_id,
        "full_name": new_user.full_name,
        "police_rank": new_user.police_rank,
    }

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate police officer using either mobile number or email + password.
    Includes account lockout protection after repeated failed attempts.
    """
    ip = get_client_ip(request)
    identifier = payload.username or payload.email or payload.mobile_number
    if not identifier:
        raise HTTPException(status_code=400, detail="Please provide a mobile number or email address.")

    clean_id = str(identifier).strip()
    digits_only = "".join(filter(str.isdigit, clean_id))

    user = db.query(User).filter(
        or_(
            User.email == clean_id.lower(),
            User.mobile_number == digits_only if len(digits_only) >= 10 else False,
            User.police_id == clean_id
        )
    ).first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # If user exists, check lockout
    if user:
        if user.locked_until and user.locked_until > now:
            minutes_left = int((user.locked_until - now).total_seconds() / 60) + 1
            audit_service.record_activity(
                db=db,
                action="LOGIN_LOCKED_ATTEMPT",
                resource_type="USER",
                resource_id=str(user.user_id),
                ip_address=ip,
                details=f"Attempt to login to locked account {user.police_id}"
            )
            raise HTTPException(
                status_code=403,
                detail=f"Account temporarily locked due to multiple failed login attempts. Try again in {minutes_left} minutes."
            )

    # Validate password
    is_valid = user and verify_password(payload.password, user.password_hash)

    if not is_valid:
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.max_login_attempts:
                user.locked_until = now + timedelta(minutes=settings.account_lockout_minutes)
                db.commit()
                audit_service.record_activity(
                    db=db,
                    action="ACCOUNT_LOCKED",
                    resource_type="USER",
                    resource_id=str(user.user_id),
                    ip_address=ip,
                    details=f"Account locked for {settings.account_lockout_minutes} mins after {user.failed_login_attempts} failed attempts"
                )
                raise HTTPException(
                    status_code=403,
                    detail=f"Account has been locked for {settings.account_lockout_minutes} minutes due to {user.failed_login_attempts} failed attempts."
                )
            db.commit()

        audit_service.record_activity(
            db=db,
            action="LOGIN_FAILURE",
            resource_type="AUTH",
            ip_address=ip,
            details=f"Failed login attempt for identifier: {clean_id}"
        )
        raise HTTPException(status_code=401, detail="Invalid mobile number/email or password.")

    # Check account status
    if user.account_status != "active":
        raise HTTPException(
            status_code=403,
            detail=f"Your account is currently '{user.account_status}'. Please contact system administrator."
        )

    if not user.mobile_verification_status:
        raise HTTPException(
            status_code=403,
            detail="Mobile number not verified. Please verify your mobile number first."
        )

    # Reset failed attempts and update last login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = now
    db.commit()

    # Generate JWT tokens
    claims = {
        "user_id": user.user_id,
        "name": user.full_name,
        "rank": user.police_rank,
        "police_station": user.police_station,
        "role_id": user.role_id,
    }
    access_token = create_access_token(subject=str(user.user_id), extra_claims=claims)
    refresh_token = create_refresh_token(subject=str(user.user_id))

    audit_service.record_activity(
        db=db,
        action="LOGIN_SUCCESS",
        resource_type="USER",
        resource_id=str(user.user_id),
        user_id=user.user_id,
        ip_address=ip,
        details=f"Officer {user.full_name} ({user.police_rank}) logged in"
    )

    user_data = {
        "user_id": user.user_id,
        "full_name": user.full_name,
        "email": user.email,
        "mobile_number": user.mobile_number,
        "police_id": user.police_id,
        "police_rank": user.police_rank,
        "police_station": user.police_station,
        "district": user.district,
        "state": user.state,
        "role": user.role.role_name if user.role else user.police_rank,
        "permissions": [p.permission_name for p in user.role.permissions] if user.role else [],
    }

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=user_data,
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access and refresh token pair."""
    try:
        decoded = decode_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")

    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token provided is not a refresh token.")

    user_id = int(decoded.get("sub"))
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or user.account_status != "active":
        raise HTTPException(status_code=401, detail="User account is inactive or not found.")

    claims = {
        "user_id": user.user_id,
        "name": user.full_name,
        "rank": user.police_rank,
        "police_station": user.police_station,
        "role_id": user.role_id,
    }
    new_access = create_access_token(subject=str(user.user_id), extra_claims=claims)
    new_refresh = create_refresh_token(subject=str(user.user_id))

    user_data = {
        "user_id": user.user_id,
        "full_name": user.full_name,
        "police_rank": user.police_rank,
        "police_station": user.police_station,
    }

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="Bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=user_data,
    )

@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke user's current session token and log out."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            decoded = decode_token(token)
            jti = decoded.get("jti")
            exp = decoded.get("exp")
            if jti and exp:
                blacklist_token(db, jti, exp)
        except Exception:
            pass

    audit_service.record_activity(
        db=db,
        action="LOGOUT",
        resource_type="USER",
        resource_id=str(current_user.user_id),
        user_id=current_user.user_id,
        ip_address=get_client_ip(request),
        details="User logged out and token blacklisted"
    )
    return {"status": "success", "message": "Successfully logged out."}

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Dispatch password reset OTP to officer's registered email address."""
    clean_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        # Prevent user enumeration: return success-like response
        return {"status": "success", "message": "If the email is registered, an OTP has been dispatched."}

    try:
        generate_and_dispatch_otp(db, email=clean_email, full_name=user.full_name)
        return {"status": "success", "message": "Password reset OTP dispatched to registered email address."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Verify OTP and update officer password."""
    clean_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    try:
        verify_officer_otp(db, clean_email, payload.otp)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user.password_hash = hash_password(payload.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    audit_service.record_activity(
        db=db,
        action="PASSWORD_RESET_SUCCESS",
        resource_type="USER",
        resource_id=str(user.user_id),
        user_id=user.user_id,
        ip_address=get_client_ip(request),
        details="Password reset via email OTP verification"
    )

    return {"status": "success", "message": "Password has been successfully updated. You can now log in."}


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update officer password when logged in."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()

    audit_service.record_activity(
        db=db,
        action="PASSWORD_CHANGE",
        resource_type="USER",
        resource_id=str(current_user.user_id),
        user_id=current_user.user_id,
        ip_address=get_client_ip(request),
        details="User updated password via settings portal"
    )

    return {"status": "success", "message": "Password changed successfully."}
