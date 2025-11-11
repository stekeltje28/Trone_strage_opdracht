from __future__ import annotations

import logging
import sys
import traceback
import uuid
from typing import Iterable, List

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .core.settings import settings
from .core.ratelimit import limiter, SlowAPIMiddleware, RateLimitExceeded
from .db import create_db_and_tables
from .routers import health, pets, appointments

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("app")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        resp = await call_next(request)
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "no-referrer")
        resp.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        csp = getattr(settings, "CSP", None)
        if csp:
            resp.headers.setdefault("Content-Security-Policy", csp)
        if getattr(settings, "ENABLE_HSTS", False):
            resp.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=63072000; includeSubDomains; preload",
            )
        return resp


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = rid
        resp = await call_next(request)
        resp.headers["X-Request-ID"] = rid
        return resp


def _normalize_origins(value) -> List[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return [str(v).strip() for v in value if str(v).strip()]
    s = str(value).strip()
    if not s:
        return []
    return [item.strip() for item in s.split(",") if item.strip()]


middleware: List[Middleware] = []

allowed_hosts: Iterable[str] = getattr(settings, "ALLOWED_HOSTS", ["*"])
middleware.append(Middleware(TrustedHostMiddleware, allowed_hosts=list(allowed_hosts)))

if getattr(settings, "FORCE_HTTPS", False):
    middleware.append(Middleware(HTTPSRedirectMiddleware))

middleware.append(Middleware(GZipMiddleware, minimum_size=1024))
middleware.append(Middleware(RequestIDMiddleware))
middleware.append(Middleware(SecurityHeadersMiddleware))

if SlowAPIMiddleware:
    middleware.append(Middleware(SlowAPIMiddleware))

_app_title = getattr(settings, "APP_NAME", getattr(settings, "app_name", "API"))
_app_version = getattr(settings, "VERSION", getattr(settings, "version", "1.0.0"))

app = FastAPI(title=_app_title, version=_app_version, middleware=middleware)

if limiter:
    app.state.limiter = limiter

_default_cors = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]
allow_origins = _normalize_origins(getattr(settings, "CORS_ORIGINS", _default_cors))
if not allow_origins:
    allow_origins = _default_cors

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
    expose_headers=["X-Request-ID"],
)

if RateLimitExceeded:
    @app.exception_handler(RateLimitExceeded)
    async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return PlainTextResponse(str(exc), status_code=429)

app.include_router(health.router)
app.include_router(pets.router)
app.include_router(appointments.router)

try:
    from .routers import auth
    app.include_router(auth.router)
    logger.info("🔐 Auth router loaded.")
except Exception as e:
    print("⚠️  Failed to load auth router:", e, file=sys.stderr)
    traceback.print_exc()


@app.on_event("startup")
def on_startup() -> None:
    logger.info("🚀 Starting up application...")
    create_db_and_tables()
    logger.info("✅ Database tables verified or created.")
    logger.info("🗺️ Registered routes:")
    for r in app.router.routes:
        try:
            path = getattr(r, "path", "")
            methods = ", ".join(sorted((r.methods or [])))
            logger.info("   %s  →  %s", path, methods)
        except Exception:
            pass
    logger.info("✅ Startup complete.")
