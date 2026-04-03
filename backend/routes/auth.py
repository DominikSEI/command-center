from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt
from routes.deps import get_current_user
import os

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

DASHBOARD_USER = os.getenv("DASHBOARD_USER", "admin")
DASHBOARD_PASSWORD = os.getenv("DASHBOARD_PASSWORD", "changeme")

_runtime_password: str | None = None


def get_current_password() -> str:
    return _runtime_password if _runtime_password is not None else DASHBOARD_PASSWORD


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    if body.username != DASHBOARD_USER or body.password != get_current_password():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_access_token({"sub": body.username})
    return {"access_token": token, "token_type": "bearer"}


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.patch("/change-password")
def change_password(body: ChangePasswordRequest, _: str = Depends(get_current_user)):
    global _runtime_password
    if body.old_password != get_current_password():
        raise HTTPException(status_code=401, detail="Altes Passwort falsch")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Neues Passwort muss mindestens 6 Zeichen haben")
    _runtime_password = body.new_password
    return {"ok": True}
