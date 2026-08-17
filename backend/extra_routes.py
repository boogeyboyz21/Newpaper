from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from database import db, serialize
from auth_utils import get_current_user, require_role, log_action

router = APIRouter(prefix="/api", tags=["extra"])


def now():
    return datetime.now(timezone.utc).isoformat()


# ---------------- CMS Pages ----------------
class PageInput(BaseModel):
    title: str
    body: str


@router.get("/pages/{slug}")
async def get_page(slug: str):
    doc = await db.pages.find_one({"slug": slug})
    if not doc:
        raise HTTPException(404, "Page not found")
    return serialize(doc)


@router.get("/admin/pages")
async def list_pages(user=Depends(require_role("administrator"))):
    return [serialize(d) for d in await db.pages.find({}).to_list(50)]


@router.put("/admin/pages/{slug}")
async def upsert_page(slug: str, data: PageInput, request: Request, user=Depends(require_role("administrator"))):
    await db.pages.update_one({"slug": slug},
                              {"$set": {"slug": slug, "title": data.title, "body": data.body, "updated_at": now()}},
                              upsert=True)
    await log_action(user, "Page Updated", None, request, {"slug": slug})
    return {"ok": True}


# ---------------- Contact ----------------
class ContactInput(BaseModel):
    name: str
    email: str
    message: str


@router.post("/contact")
async def contact(data: ContactInput):
    await db.contacts.insert_one({"name": data.name, "email": data.email, "message": data.message,
                                  "created_at": now(), "read": False})
    return {"ok": True, "message": "Thanks! Our team will get back to you soon."}


@router.get("/admin/contacts")
async def contacts(user=Depends(require_role("administrator"))):
    return [serialize(d) for d in await db.contacts.find({}).sort("created_at", -1).to_list(200)]


# ---------------- Ad plans (Administrator defines) ----------------
class PlanInput(BaseModel):
    label: str
    size: str
    price: float
    impressions: int


@router.get("/ads/plans")
async def ad_plans():
    return [serialize(d) for d in await db.ad_plans.find({"active": True}).to_list(50)]


@router.post("/admin/ad-plans")
async def create_plan(data: PlanInput, request: Request, user=Depends(require_role("administrator"))):
    res = await db.ad_plans.insert_one({**data.model_dump(), "active": True, "created_at": now()})
    await log_action(user, "Ad Plan Created", None, request)
    return serialize(await db.ad_plans.find_one({"_id": res.inserted_id}))


@router.delete("/admin/ad-plans/{pid}")
async def del_plan(pid: str, user=Depends(require_role("administrator"))):
    await db.ad_plans.update_one({"_id": ObjectId(pid)}, {"$set": {"active": False}})
    return {"ok": True}


# ---------------- Ads: purchase / moderate / serve ----------------
class AdBuy(BaseModel):
    plan_id: str
    image_url: str
    target_url: str
    company: Optional[str] = None


@router.post("/ads/purchase")
async def buy_ad(data: AdBuy, user=Depends(get_current_user)):
    plan = await db.ad_plans.find_one({"_id": ObjectId(data.plan_id)})
    if not plan:
        raise HTTPException(404, "Plan not found")
    doc = {"user_id": user["id"], "user_email": user["email"], "plan_id": str(plan["_id"]),
           "size": plan["size"], "label": plan["label"], "price": plan["price"],
           "impressions": plan["impressions"], "served": 0, "image_url": data.image_url,
           "target_url": data.target_url, "company": data.company, "status": "pending",
           "paid": True, "created_at": now()}
    res = await db.ads.insert_one(doc)
    return {"ok": True, "mock_payment": True, "ad": serialize(await db.ads.find_one({"_id": res.inserted_id}))}


@router.get("/ads/mine")
async def my_ads(user=Depends(get_current_user)):
    return [serialize(d) for d in await db.ads.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)]


@router.get("/admin/ads")
async def all_ads(user=Depends(require_role("administrator"))):
    return [serialize(d) for d in await db.ads.find({}).sort("created_at", -1).to_list(300)]


class AdStatus(BaseModel):
    status: str


@router.patch("/admin/ads/{aid}")
async def moderate_ad(aid: str, data: AdStatus, request: Request, user=Depends(require_role("administrator"))):
    if data.status not in ("live", "rejected", "paused"):
        raise HTTPException(400, "Invalid status")
    await db.ads.update_one({"_id": ObjectId(aid)}, {"$set": {"status": data.status}})
    await log_action(user, f"Ad {data.status}", aid, request)
    return {"ok": True}


@router.get("/ads/active")
async def active_ad(size: str):
    doc = await db.ads.find_one_and_update(
        {"size": size, "status": "live", "$expr": {"$lt": ["$served", "$impressions"]}},
        {"$inc": {"served": 1}})
    if not doc:
        return {"ad": None}
    if doc.get("served", 0) + 1 >= doc.get("impressions", 0):
        await db.ads.update_one({"_id": doc["_id"]}, {"$set": {"status": "completed"}})
    return {"ad": {"image_url": doc["image_url"], "target_url": doc["target_url"]}}


# ---------------- Author public byline page ----------------
@router.get("/authors/{author_id}")
async def author(author_id: str):
    if not ObjectId.is_valid(author_id):
        raise HTTPException(404, "Not found")
    u = await db.users.find_one({"_id": ObjectId(author_id)})
    if not u:
        raise HTTPException(404, "Author not found")
    arts = await db.articles.find({"author_id": author_id, "status": "published"}).sort("published_at", -1).to_list(60)
    return {"id": author_id, "name": u["name"], "role": u.get("role"),
            "articles": [serialize(a) for a in arts]}


# ---------------- Bookmarks ----------------
@router.post("/bookmarks/{article_id}")
async def toggle_bookmark(article_id: str, user=Depends(get_current_user)):
    existing = await db.bookmarks.find_one({"user_id": user["id"], "article_id": article_id})
    if existing:
        await db.bookmarks.delete_one({"_id": existing["_id"]})
        return {"bookmarked": False}
    await db.bookmarks.insert_one({"user_id": user["id"], "article_id": article_id, "created_at": now()})
    return {"bookmarked": True}


@router.get("/bookmarks/ids")
async def bookmark_ids(user=Depends(get_current_user)):
    docs = await db.bookmarks.find({"user_id": user["id"]}).to_list(500)
    return [d["article_id"] for d in docs]


@router.get("/bookmarks")
async def bookmarks(user=Depends(get_current_user)):
    docs = await db.bookmarks.find({"user_id": user["id"]}).sort("created_at", -1).to_list(200)
    out = []
    for d in docs:
        if ObjectId.is_valid(d["article_id"]):
            a = await db.articles.find_one({"_id": ObjectId(d["article_id"])})
            if a:
                out.append(serialize(a))
    return out


# ---------------- Admin house banner (direct live ad) ----------------
class AdminAdInput(BaseModel):
    label: str
    size: str
    image_url: str
    target_url: str
    impressions: int = 100000


@router.post("/admin/ads")
async def create_admin_ad(data: AdminAdInput, request: Request, user=Depends(require_role("administrator"))):
    doc = {"user_id": user["id"], "user_email": user["email"], "plan_id": None,
           "size": data.size, "label": data.label, "price": 0, "impressions": data.impressions,
           "served": 0, "image_url": data.image_url, "target_url": data.target_url,
           "company": "House", "status": "live", "paid": True, "created_at": now()}
    res = await db.ads.insert_one(doc)
    await log_action(user, "House Ad Created", str(res.inserted_id), request)
    return serialize(await db.ads.find_one({"_id": res.inserted_id}))
