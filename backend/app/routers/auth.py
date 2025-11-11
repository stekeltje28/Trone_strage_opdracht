from typing import Callable, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Body, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from ..deps import get_session, get_current_user
from ..models.user import User
from ..schemas.user import RegisterIn, LoginJSONIn, TokenOut, ChangePasswordIn
from ..core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from ..core.settings import settings
from ..core.ratelimit import limiter

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

def _limit(rule: str) -> Callable:
    if limiter:
        return limiter.limit(rule)
    def _noop(func: Callable) -> Callable:
        return func
    return _noop

@router.post("/register", status_code=201)
def register(payload: RegisterIn, session: Session = Depends(get_session)):
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=422, detail="Username is required")
    exists = session.exec(select(User).where(User.username == username)).first()
    if exists:
        raise HTTPException(status_code=409, detail="Username already registered")
    user = User(username=username, hashed_password=get_password_hash(payload.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"id": user.id, "username": user.username}

@router.post("/login", response_model=TokenOut)
@_limit("5/minute")
def login_form(
    request: Request,
    response: Response,
    form: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.username == form.username.strip())).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User inactive")
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id), user.token_version)
    if settings.USE_COOKIES:
        response.set_cookie(
            "refresh_token",
            refresh,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite="lax",
            max_age=60 * 60 * 24 * settings.REFRESH_TOKEN_DAYS,
            path="/api/v1/auth",
        )
        return TokenOut(access_token=access, token_type="bearer")
    return TokenOut(access_token=access, refresh_token=refresh, token_type="bearer")

@router.post("/login-json", response_model=TokenOut)
@_limit("5/minute")
def login_json(
    request: Request,
    response: Response,
    payload: LoginJSONIn,
    session: Session = Depends(get_session),
):
    username = payload.username.strip()
    user = session.exec(select(User).where(User.username == username)).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User inactive")
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id), user.token_version)
    if settings.USE_COOKIES:
        response.set_cookie(
            "refresh_token",
            refresh,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite="lax",
            max_age=60 * 60 * 24 * settings.REFRESH_TOKEN_DAYS,
            path="/api/v1/auth",
        )
        return TokenOut(access_token=access, token_type="bearer")
    return TokenOut(access_token=access, refresh_token=refresh, token_type="bearer")

@router.post("/refresh", response_model=TokenOut)
def refresh_token(
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
    refresh_token_cookie: Optional[str] = Cookie(default=None, alias="refresh_token"),
    refresh_token_body: Optional[str] = Body(default=None, embed=True, alias="refresh_token"),
):
    token = refresh_token_cookie if refresh_token_cookie else refresh_token_body
    if not token:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token required")
    sub = payload.get("sub")
    tv = payload.get("tv")
    if not sub or tv is None:
        raise HTTPException(status_code=401, detail="Invalid refresh payload")
    user = session.get(User, int(sub))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or not found")
    if tv != user.token_version:
        raise HTTPException(status_code=401, detail="Refresh token revoked")
    access = create_access_token(str(user.id))
    user.token_version += 1
    session.add(user)
    session.commit()
    session.refresh(user)
    new_refresh = create_refresh_token(str(user.id), user.token_version)
    if settings.USE_COOKIES:
        response.set_cookie(
            "refresh_token",
            new_refresh,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite="lax",
            max_age=60 * 60 * 24 * settings.REFRESH_TOKEN_DAYS,
            path="/api/v1/auth",
        )
        return TokenOut(access_token=access, token_type="bearer")
    return TokenOut(access_token=access, refresh_token=new_refresh, token_type="bearer")

@router.post("/logout", status_code=204)
def logout(
    request: Request,
    response: Response,
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    current.token_version += 1
    session.add(current)
    session.commit()
    if settings.USE_COOKIES:
        response.delete_cookie("refresh_token", path="/api/v1/auth")
    return Response(status_code=204)

@router.get("/me")
def me(current: User = Depends(get_current_user)):
    return {"id": current.id, "username": current.username, "is_active": current.is_active}

@router.get("/whoami")
def whoami(current: User = Depends(get_current_user)):
    return {"id": current.id, "username": current.username, "is_active": current.is_active}

@router.post("/change-password", status_code=204)
def change_password(
    payload: ChangePasswordIn,
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not verify_password(payload.current_password, current.hashed_password):
        raise HTTPException(status_code=400, detail="Current password incorrect")
    current.hashed_password = get_password_hash(payload.new_password)
    current.token_version += 1
    session.add(current)
    session.commit()
    return Response(status_code=204)
