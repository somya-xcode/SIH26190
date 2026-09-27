import os
from typing import List
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Secure Digital Document Management System for Police Departments"
    app_env: str = os.getenv("APP_ENV", "development")
    debug: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("APP_PORT", "8000"))

    # Database
    database_url: str = Field(
        default=os.getenv(
            "DATABASE_URL",
            "sqlite:///./docguard.db"
        )
    )

    # JWT & Auth
    secret_key: SecretStr = Field(default=SecretStr(os.getenv("SECRET_KEY", "b49a7e6b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f")))
    jwt_secret_key: SecretStr = Field(default=SecretStr(os.getenv("JWT_SECRET_KEY", "c72e9a1b0d3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b")))
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # Account Lockout
    max_login_attempts: int = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
    account_lockout_minutes: int = int(os.getenv("ACCOUNT_LOCKOUT_MINUTES", "15"))

    # AES-256-GCM Master Key (Hex encoded 32 bytes = 64 hex chars)
    aes_master_key: SecretStr = Field(
        default=SecretStr(os.getenv("AES_MASTER_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"))
    )

    # File Storage
    upload_dir: str = os.getenv("UPLOAD_DIR", "./uploads/documents")
    max_file_size_mb: int = int(os.getenv("MAX_FILE_SIZE_MB", "50"))

    # SMS Gateway Integration (Fast2SMS, Twilio, Msg91)
    sms_provider: str = os.getenv("SMS_PROVIDER", "fast2sms").lower()
    sms_api_key: SecretStr = Field(default=SecretStr(os.getenv("SMS_API_KEY", "")))
    sms_sender_id: str = os.getenv("SMS_SENDER_ID", "DOCGRD")
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: SecretStr = Field(default=SecretStr(os.getenv("TWILIO_AUTH_TOKEN", "")))
    twilio_phone_number: str = os.getenv("TWILIO_PHONE_NUMBER", "")

    # OTP Controls
    otp_expiration_seconds: int = int(os.getenv("OTP_EXPIRY_SECONDS", "300"))  # 5 minutes
    otp_max_attempts: int = int(os.getenv("OTP_MAX_ATTEMPTS", "3"))
    otp_resend_cooldown_seconds: int = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))
    otp_rate_limit_window_seconds: int = int(os.getenv("OTP_RATE_LIMIT_WINDOW_SECONDS", "900"))
    otp_rate_limit_max_requests: int = int(os.getenv("OTP_RATE_LIMIT_MAX_REQUESTS", "5"))

    # Blockchain
    blockchain_enabled: bool = os.getenv("BLOCKCHAIN_ENABLED", "false").lower() in ("true", "1", "yes")
    web3_provider_url: str = os.getenv("WEB3_PROVIDER_URL", "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID")
    blockchain_private_key: SecretStr = Field(default=SecretStr(os.getenv("BLOCKCHAIN_PRIVATE_KEY", "")))
    blockchain_contract_address: str = os.getenv("BLOCKCHAIN_CONTRACT_ADDRESS", "0x0000000000000000000000000000000000000000")
    blockchain_chain_id: int = int(os.getenv("BLOCKCHAIN_CHAIN_ID", "11155111"))

    # CORS
    frontend_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
