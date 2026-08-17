import csv
import io
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import Optional
from bson import ObjectId
from database import db, serialize
from auth_utils import require_role, hash_password, log_action

router = APIRouter(prefix="/api/admin", tags=["admin"])
STAFF_ROLES = ["reporter", "editor", "administrator"]


# -------- Site settings / API keys (Administrator only) --------
class SettingsInput(BaseModel):
    openweather_key: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    ga_id: Optional[str] = None
    analytics_mode: Optional[str] = None
    adsense_client: Optional[str] = None
    social_links: Optional[list] = None
    menu: Optional[list] = None


@router.get("/settings")
async def get_admin_settings(user=Depends(require_role("administrator"))):
    from database import get_settings
    s = await get_settings()
    return {
        "openweather_key": s.get("openweather_key", ""),
        "razorpay_key_id": s.get("razorpay_key_id", ""),
        "razorpay_key_secret_set": bool(s.get("razorpay_key_secret")),
        "ga_id": s.get("ga_id", ""),
        "analytics_mode": s.get("analytics_mode", "privacy"),
        "adsense_client": s.get("adsense_client", ""),
        "social_links": s.get("social_links", []),
        "menu": s.get("menu", []),
    }


@router.put("/settings")
async def update_admin_settings(data: SettingsInput, request: Request, user=Depends(require_role("administrator"))):
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if upd:
        await db.settings.update_one({"key": "site"}, {"$set": {**upd, "key": "site"}}, upsert=True)
    await log_action(user, "Settings Updated", None, request, {"fields": list(upd.keys())})
    return {"ok": True}


# -------- Staff management (Administrator only) --------
class StaffInput(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str


@router.get("/users")
async def list_users(user=Depends(require_role("administrator"))):
    docs = await db.users.find({}).sort("created_at", -1).to_list(500)
    return [serialize(d) for d in docs]


@router.post("/users")
async def create_user(data: StaffInput, request: Request, user=Depends(require_role("administrator"))):
    if data.role not in STAFF_ROLES + ["subscriber"]:
        raise HTTPException(400, "Invalid role")
    if await db.users.find_one({"email": data.email.lower()}):
        raise HTTPException(400, "Email already exists")
    doc = {"name": data.name, "email": data.email.lower(), "password_hash": hash_password(data.password),
           "role": data.role, "subscription": None, "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.users.insert_one(doc)
    await log_action(user, "Staff Created", str(res.inserted_id), request, {"role": data.role})
    return serialize(await db.users.find_one({"_id": res.inserted_id}))


class RoleInput(BaseModel):
    role: str


@router.patch("/users/{uid}/role")
async def change_role(uid: str, data: RoleInput, request: Request, user=Depends(require_role("administrator"))):
    if data.role not in STAFF_ROLES + ["subscriber"]:
        raise HTTPException(400, "Invalid role")
    await db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"role": data.role}})
    await log_action(user, "Role Changed", uid, request, {"new_role": data.role})
    return {"ok": True}


class PwSetInput(BaseModel):
    password: str


@router.patch("/users/{uid}/password")
async def set_user_password(uid: str, data: PwSetInput, request: Request, user=Depends(require_role("administrator"))):
    if len(data.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    await db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"password_hash": hash_password(data.password)}})
    await log_action(user, "Password Reset", uid, request)
    return {"ok": True}


@router.delete("/users/{uid}")
async def delete_user(uid: str, request: Request, user=Depends(require_role("administrator"))):
    if uid == user["id"]:
        raise HTTPException(400, "Cannot delete yourself")
    await db.users.delete_one({"_id": ObjectId(uid)})
    await log_action(user, "Staff Deleted", uid, request)
    return {"ok": True}


# -------- Comments moderation (Editor/Administrator) --------
@router.get("/comments")
async def all_comments(user=Depends(require_role("editor", "administrator"))):
    docs = await db.comments.find({}).sort("created_at", -1).to_list(500)
    return [serialize(d) for d in docs]


class CommentStatus(BaseModel):
    status: str


@router.patch("/comments/{cid}")
async def moderate_comment(cid: str, data: CommentStatus, request: Request,
                           user=Depends(require_role("editor", "administrator"))):
    if data.status not in ("approved", "hidden", "pending"):
        raise HTTPException(400, "Invalid status")
    await db.comments.update_one({"_id": ObjectId(cid)}, {"$set": {"status": data.status}})
    await log_action(user, f"Comment {data.status}", cid, request)
    return {"ok": True}


@router.delete("/comments/{cid}")
async def delete_comment(cid: str, request: Request, user=Depends(require_role("editor", "administrator"))):
    await db.comments.delete_one({"_id": ObjectId(cid)})
    await log_action(user, "Comment Deleted", cid, request)
    return {"ok": True}


# -------- Audit logs (Administrator, read-only) --------
@router.get("/audit-logs")
async def audit_logs(user=Depends(require_role("administrator"))):
    docs = await db.audit_logs.find({}).sort("timestamp", -1).to_list(500)
    return [serialize(d) for d in docs]


# -------- Billing / GST (Administrator) --------
@router.get("/invoices")
async def all_invoices(user=Depends(require_role("administrator"))):
    docs = await db.invoices.find({}).sort("created_at", -1).to_list(1000)
    return [serialize(d) for d in docs]


@router.get("/gst-export")
async def gst_export(user=Depends(require_role("administrator"))):
    docs = await db.invoices.find({}).sort("created_at", -1).to_list(5000)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Invoice No", "Date", "Customer", "GSTIN", "Base", "CGST", "SGST", "IGST", "Total", "SAC"])
    for d in docs:
        writer.writerow([d.get("invoice_no"), d.get("date"), d.get("customer_name"),
                         d.get("gstin", ""), d.get("base"), d.get("cgst"), d.get("sgst"),
                         d.get("igst"), d.get("total"), "998431"])
    buf.seek(0)
    return StreamingResponse(io.BytesIO(buf.getvalue().encode()), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=gst-export.csv"})


@router.get("/stats")
async def stats(user=Depends(require_role("editor", "administrator"))):
    return {
        "articles": await db.articles.count_documents({}),
        "published": await db.articles.count_documents({"status": "published"}),
        "drafts": await db.articles.count_documents({"status": "draft"}),
        "review": await db.articles.count_documents({"status": "review"}),
        "comments": await db.comments.count_documents({}),
        "pending_comments": await db.comments.count_documents({"status": {"$in": ["pending", "hidden"]}}),
        "subscribers": await db.users.count_documents({"subscription.status": {"$in": ["active", "cancelling"]}}),
        "users": await db.users.count_documents({}),
    }
