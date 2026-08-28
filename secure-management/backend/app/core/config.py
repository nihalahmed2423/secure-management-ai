from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SECURE MANAGEMENT"
    SECRET_KEY: str = "SUPER_SECRET_KEY_FOR_HACKATHON"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 days

    # Database
    DATABASE_URL: str = "sqlite:///./secure_management.db" # Fallback to SQLite for rapid proto

    class Config:
        env_file = ".env"

settings = Settings()
