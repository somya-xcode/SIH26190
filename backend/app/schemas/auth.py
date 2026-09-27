from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any

class SendOTPRequest(BaseModel):
    mobile_number: str = Field(..., min_length=10, max_length=15, description="Officer's mobile number")

class VerifyOTPRequest(BaseModel):
    mobile_number: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")

class RegisterOfficerRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    mobile_number: str = Field(..., min_length=10, max_length=15)
    email: EmailStr
    police_id: str = Field(..., min_length=2, max_length=50)
    police_rank: str = Field(..., description="Constable, SI, Inspector, SP, etc.")
    police_station: str = Field(..., min_length=2, max_length=100)
    district: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, description="Minimum 8 characters password")

class LoginRequest(BaseModel):
    # Allows login with either mobile number or email address
    username: Optional[str] = Field(None, description="Mobile number or Email address")
    email: Optional[EmailStr] = None
    mobile_number: Optional[str] = None
    password: str = Field(..., min_length=1)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: Dict[str, Any]

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    mobile_number: str = Field(..., min_length=10, max_length=15)

class ResetPasswordRequest(BaseModel):
    mobile_number: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)
