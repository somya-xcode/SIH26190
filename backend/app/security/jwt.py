import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import TokenBlacklist

def create_access_token(
    subject: str,
    extra_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expire = now + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    jti = str(uuid.uuid4())
    to_encode = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "jti": jti,
        "type": "access",
    }
    if extra_claims:
        to_encode.update(extra_claims)
    return jwt.encode(to_encode, settings.jwt_secret_key.get_secret_value(), algorithm=settings.jwt_algorithm)

def create_refresh_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expire = now + (expires_delta or timedelta(days=settings.refresh_token_expire_days))
    jti = str(uuid.uuid4())
    to_encode = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "jti": jti,
        "type": "refresh",
    }
    return jwt.encode(to_encode, settings.jwt_secret_key.get_secret_value(), algorithm=settings.jwt_algorithm)

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key.get_secret_value(),
            algorithms=[settings.jwt_algorithm]
        )
    except JWTError as e:
        raise ValueError(f"Invalid token: {str(e)}")

def is_token_blacklisted(db: Session, jti: str) -> bool:
    if not jti:
        return False
    return db.query(TokenBlacklist).filter(TokenBlacklist.jti == jti).first() is not None

def blacklist_token(db: Session, jti: str, exp_timestamp: int) -> None:
    expires_at = datetime.fromtimestamp(exp_timestamp, timezone.utc).replace(tzinfo=None)
    item = TokenBlacklist(jti=jti, expires_at=expires_at)
    db.add(item)
    db.commit()
