from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from jose import jwt
from passlib.context import CryptContext
from .settings import settings

pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")
ALG = "HS256"

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(sub: str) -> str:
    issued_at = now_utc()
    exp = issued_at + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)
    payload: Dict[str, Any] = {
        "sub": str(sub),
        "type": "access",
        "iat": issued_at,
        "exp": exp,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALG)

def create_refresh_token(sub: str, token_version: int) -> str:
    issued_at = now_utc()
    exp = issued_at + timedelta(days=settings.REFRESH_TOKEN_DAYS)
    payload: Dict[str, Any] = {
        "sub": str(sub),
        "type": "refresh",
        "tv": int(token_version),
        "iat": issued_at,
        "exp": exp,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALG)

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALG])
