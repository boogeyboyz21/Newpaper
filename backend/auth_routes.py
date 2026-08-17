import os
import secrets
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from database import db, serialize
from auth_utils import (
    hash_password, verify_password, create_access_token, get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

LOCK_LIMIT = 5


class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


def _set_cookie(response: Response, token: str):
    response.set_cookie("access_token", token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


@router.post("/register")
async def register(data: RegisterInput, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "name": data.name,
        "email": email,
        "password_hash": hash_password(data.password),
        "role": "subscriber",
        "subscription": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    token = create_access_token(uid, email)
    _set_cookie(response, token)
    user = serialize(await db.users.find_one({"_id": res.inserted_id}))
    return {"user": user, "token": token}


@router.post("/login")
async def login(data: LoginInput, request: Request, response: Response):
    email = data.email.lower()
    ident = f"{request.client.host}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    if attempt and attempt.get("count", 0) >= LOCK_LIMIT:
        last = attempt.get("last")
        locked = True
        if last:
            try:
                if datetime.now(timezone.utc) - datetime.fromisoformat(last) > timedelta(minutes=15):
                    await db.login_attempts.delete_one({"identifier": ident})
                    locked = False
            except Exception:
                locked = False
        if locked:
            raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"count": 1}, "$set": {"last": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    token = create_access_token(str(user["_id"]), email)
    _set_cookie(response, token)
    return {"user": serialize(user), "token": token}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


class ChangePwInput(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(data: ChangePwInput, user: dict = Depends(get_current_user)):
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not u or not verify_password(data.current_password, u["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    await db.users.update_one({"_id": u["_id"]}, {"$set": {"password_hash": hash_password(data.new_password)}})
    return {"ok": True}


class ForgotInput(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
async def forgot_password(data: ForgotInput):
    u = await db.users.find_one({"email": data.email.lower()})
    if u:
        token = secrets.token_urlsafe(32)
        expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        await db.reset_tokens.insert_one({"token": token, "user_id": str(u["_id"]), "expires": expires, "used": False})
        link = f"{os.environ.get('FRONTEND_URL', '')}/reset-password?token={token}"
        try:
            from email_utils import send_reset_email
            await send_reset_email(u["email"], u.get("name", "there"), link)
        except Exception:
            pass
    return {"ok": True, "message": "If that email is registered, a password reset link has been sent."}


class ResetInput(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
async def reset_password(data: ResetInput):
    rt = await db.reset_tokens.find_one({"token": data.token, "used": False})
    if not rt or datetime.fromisoformat(rt["expires"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    await db.users.update_one({"_id": ObjectId(rt["user_id"])}, {"$set": {"password_hash": hash_password(data.new_password)}})
    await db.reset_tokens.update_one({"_id": rt["_id"]}, {"$set": {"used": True}})
    return {"ok": True}
