from pydantic import BaseModel, EmailStr, Field

class StartRegistrationRequest(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=15)

class CompleteRegistrationRequest(BaseModel):
    full_name: str = Field(..., min_length=1)
    email: EmailStr
    phone_number: str = Field(..., min_length=10, max_length=15)
    police_id: str = Field(..., min_length=1)
    rank: str = Field(...)
    station: str = Field(...)
    district: str = Field(...)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
