import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Medical Store Billing & Management SaaS"
    API_V1_STR: str = "/api/v1"
    
    # Secret key for JWT encryption - can be overridden in .env
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-medical-billing-key-replace-in-production-123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Dual database support:
    # Defaults to zero-setup local SQLite file.
    # In production, set DATABASE_URL to a free Neon or Supabase PostgreSQL connection string!
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./medical_software.db")
    
    # CORS settings to allow frontend access
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
