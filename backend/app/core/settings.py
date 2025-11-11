from __future__ import annotations
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    APP_NAME: str = "Stage API"
    VERSION: str = "1.0.0"

    SECRET_KEY: str = "dev-only-change-me"
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 7
    REQUIRE_AUTH: bool = False

    DATABASE_URL: str = "sqlite:///./app.db"
    DB_ECHO: bool = False

    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    USE_COOKIES: bool = False
    COOKIE_SECURE: bool = False
    ALLOWED_HOSTS: List[str] = ["*"]
    FORCE_HTTPS: bool = False
    ENABLE_HSTS: bool = False
    CSP: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @field_validator("CORS_ORIGINS", "ALLOWED_HOSTS", mode="before")
    @classmethod
    def _parse_list_csv_or_json(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return []
            if s.startswith("["):
                import json
                return json.loads(s)
            return [part.strip() for part in s.split(",") if part.strip()]
        return v

settings = Settings()
