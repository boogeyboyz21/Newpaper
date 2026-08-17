import re
from datetime import datetime, timezone
import base64
from typing import Optional, List, Union
from fastapi import APIRouter, HTTPException, Request, Depends, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from bson import ObjectId
from database import db, serialize
from auth_utils import get_current_user, get_optional_user, require_role, log_action

router = APIRouter(prefix="/api", tags=["content"])

CATEGORIES = ["global", "business", "tech", "lifestyle", "sports"]
PROFANITY = ["damn", "hell", "shit", "fuck", "bastard", "asshole", "idiot", "stupid"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------------- Public article feeds ----------------
@router.get("/categories")
async def get_categories():
    labels = {"global": "Global", "business": "Business", "tech": "Tech",
              "lifestyle": "Lifestyle", "sports": "Sports"}
    return [{"slug": c, "label": labels[c]} for c in CATEGORIES]


@router.get("/settings")
async def get_settings():
    import os
    from database import get_settings as gs
    s = await gs()
    mode = s.get("analytics_mode") or os.environ.get("ANALYTICS_MODE", "privacy")
    ga = s.get("ga_id") or os.environ.get("PROCESS_ENV_GA_ID", "")
    return {
        "site_name": "The Editorial Wire",
        "analytics_mode": mode,
        "ga_id": ga if mode == "ga4" else "",
        "adsense_client": s.get("adsense_client", ""),
        "social_links": s.get("social_links", []),
        "menu": s.get("menu", []),
    }


@router.get("/articles/breaking")
async def breaking():
    docs = await db.articles.find({"status": "published", "is_breaking": True}).sort("published_at", -1).to_list(20)
    return [{"id": str(d["_id"]), "title": d["title"], "category": d["category"]} for d in docs]


@router.get("/articles/trending")
async def trending():
    docs = await db.articles.find({"status": "published"}).sort("views", -1).to_list(8)
    return [serialize(d) for d in docs]


@router.get("/articles/most-read")
async def most_read():
    docs = await db.articles.find({"status": "published"}).sort("published_at", -1).to_list(8)
    return [serialize(d) for d in docs]


@router.get("/articles")
async def list_articles(category: Optional[str] = None, search: Optional[str] = None,
                        lead: Optional[bool] = None, premium: Optional[bool] = None, limit: int = 30):
    q = {"status": "published"}
    if category:
        q["category"] = category
    if lead is not None:
        q["is_lead"] = lead
    if premium is not None:
        q["is_premium"] = premium
    if search:
        q["$or"] = [{"title": {"$regex": search, "$options": "i"}},
                    {"excerpt": {"$regex": search, "$options": "i"}}]
    docs = await db.articles.find(q).sort("published_at", -1).to_list(limit)
    return [serialize(d) for d in docs]


@router.get("/articles/{article_id}")
async def get_article(article_id: str):
    if not ObjectId.is_valid(article_id):
        raise HTTPException(404, "Not found")
    doc = await db.articles.find_one({"_id": ObjectId(article_id)})
    if not doc or doc.get("status") != "published":
        raise HTTPException(404, "Article not found")
    await db.articles.update_one({"_id": doc["_id"]}, {"$inc": {"views": 1}})
    doc["views"] = doc.get("views", 0) + 1
    return serialize(doc)


# ---------------- Comments ----------------
class CommentInput(BaseModel):
    body: str
    author_name: Optional[str] = None
    parent_id: Optional[str] = None


def moderate(body: str):
    low = body.lower()
    if any(re.search(rf"\b{re.escape(w)}\b", low) for w in PROFANITY):
        return "hidden", "profanity"
    urls = len(re.findall(r"https?://", low))
    if urls >= 2:
        return "pending", "spam"
    return "approved", None


class WSManager:
    def __init__(self):
        self.rooms = {}

    async def connect(self, article_id, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(article_id, []).append(ws)

    def disconnect(self, article_id, ws):
        if article_id in self.rooms and ws in self.rooms[article_id]:
            self.rooms[article_id].remove(ws)

    async def broadcast(self, article_id, message):
        for ws in list(self.rooms.get(article_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(article_id, ws)


manager = WSManager()


def build_tree(comments):
    by_id = {c["id"]: {**c, "replies": []} for c in comments}
    roots = []
    for c in by_id.values():
        pid = c.get("parent_id")
        if pid and pid in by_id:
            by_id[pid]["replies"].append(c)
        else:
            roots.append(c)
    roots.sort(key=lambda x: x.get("upvotes", 0), reverse=True)
    return roots


@router.get("/articles/{article_id}/comments")
async def get_comments(article_id: str):
    docs = await db.comments.find({"article_id": article_id, "status": "approved"}).sort("created_at", 1).to_list(500)
    return build_tree([serialize(d) for d in docs])


@router.post("/articles/{article_id}/comments")
async def add_comment(article_id: str, data: CommentInput, user=Depends(get_optional_user)):
    if not data.body.strip():
        raise HTTPException(400, "Comment cannot be empty")
    status, reason = moderate(data.body)
    author = user["name"] if user else (data.author_name or "Guest")
    doc = {
        "article_id": article_id,
        "parent_id": data.parent_id,
        "author_name": author,
        "author_id": user["id"] if user else None,
        "is_guest": user is None,
        "body": data.body.strip(),
        "upvotes": 0,
        "status": status,
        "flag_reason": reason,
        "created_at": now_iso(),
    }
    res = await db.comments.insert_one(doc)
    saved = serialize(await db.comments.find_one({"_id": res.inserted_id}))
    if status == "approved":
        await manager.broadcast(article_id, {"type": "new_comment", "comment": saved})
    return {"comment": saved, "moderated": status != "approved"}


@router.post("/comments/{comment_id}/upvote")
async def upvote(comment_id: str):
    if not ObjectId.is_valid(comment_id):
        raise HTTPException(404, "Not found")
    doc = await db.comments.find_one_and_update(
        {"_id": ObjectId(comment_id)}, {"$inc": {"upvotes": 1}}, return_document=True)
    if not doc:
        raise HTTPException(404, "Comment not found")
    saved = serialize(doc)
    await manager.broadcast(doc["article_id"], {"type": "upvote", "comment_id": comment_id, "upvotes": saved["upvotes"]})
    return {"upvotes": saved["upvotes"]}


ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"]


class ReactInput(BaseModel):
    emoji: str


@router.post("/comments/{comment_id}/react")
async def react_comment(comment_id: str, data: ReactInput):
    if not ObjectId.is_valid(comment_id):
        raise HTTPException(404, "Not found")
    if data.emoji not in ALLOWED_REACTIONS:
        raise HTTPException(400, "Unsupported reaction")
    doc = await db.comments.find_one_and_update(
        {"_id": ObjectId(comment_id)}, {"$inc": {f"reactions.{data.emoji}": 1}}, return_document=True)
    if not doc:
        raise HTTPException(404, "Comment not found")
    saved = serialize(doc)
    await manager.broadcast(doc["article_id"], {"type": "react", "comment_id": comment_id, "reactions": saved.get("reactions", {})})
    return {"reactions": saved.get("reactions", {})}


@router.websocket("/ws/comments/{article_id}")
async def ws_comments(websocket: WebSocket, article_id: str):
    await manager.connect(article_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(article_id, websocket)


# ---------------- Newsletter ----------------
class NewsletterInput(BaseModel):
    email: str


@router.post("/newsletter")
async def newsletter(data: NewsletterInput):
    await db.newsletter.update_one({"email": data.email.lower()},
                                   {"$setOnInsert": {"email": data.email.lower(), "created_at": now_iso()}},
                                   upsert=True)
    return {"ok": True, "message": "Subscribed to newsletter"}


# ---------------- Media upload (staff) ----------------
@router.post("/staff/media")
async def upload_media(file: UploadFile = File(...),
                       user=Depends(require_role("reporter", "editor", "administrator"))):
    content = await file.read()
    b64 = base64.b64encode(content).decode()
    res = await db.media.insert_one({"data": b64, "content_type": file.content_type or "image/png",
                                     "by": user["id"], "created_at": now_iso()})
    return {"url": f"/api/media/{res.inserted_id}"}


@router.get("/media/{media_id}")
async def get_media(media_id: str):
    if not ObjectId.is_valid(media_id):
        raise HTTPException(404, "Not found")
    doc = await db.media.find_one({"_id": ObjectId(media_id)})
    if not doc:
        raise HTTPException(404, "Media not found")
    return Response(content=base64.b64decode(doc["data"]),
                    media_type=doc.get("content_type", "image/png"))


# ---------------- Staff article management (RBAC) ----------------
class ArticleInput(BaseModel):
    title: str
    subtitle: Optional[str] = ""
    category: str
    excerpt: str
    body: Union[str, List[str]]
    image_url: str
    author_name: Optional[str] = None
    tags: List[str] = []
    is_lead: bool = False
    is_breaking: bool = False
    is_premium: bool = False


@router.get("/staff/articles")
async def staff_articles(user=Depends(require_role("reporter", "editor", "administrator"))):
    q = {} if user["role"] in ("editor", "administrator") else {"author_id": user["id"]}
    docs = await db.articles.find(q).sort("created_at", -1).to_list(200)
    return [serialize(d) for d in docs]


@router.post("/staff/articles")
async def create_article(data: ArticleInput, request: Request,
                         user=Depends(require_role("reporter", "editor", "administrator"))):
    doc = data.model_dump()
    doc.update({
        "author_id": user["id"],
        "author_name": data.author_name or user["name"],
        "status": "draft",
        "views": 0,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "published_at": None,
    })
    res = await db.articles.insert_one(doc)
    await log_action(user, "Draft Created", str(res.inserted_id), request)
    return serialize(await db.articles.find_one({"_id": res.inserted_id}))


async def _get_owned(article_id, user):
    if not ObjectId.is_valid(article_id):
        raise HTTPException(404, "Not found")
    doc = await db.articles.find_one({"_id": ObjectId(article_id)})
    if not doc:
        raise HTTPException(404, "Article not found")
    if user["role"] == "reporter" and doc.get("author_id") != user["id"]:
        raise HTTPException(403, "You can only edit your own articles")
    return doc


@router.put("/staff/articles/{article_id}")
async def update_article(article_id: str, data: ArticleInput, request: Request,
                         user=Depends(require_role("reporter", "editor", "administrator"))):
    await _get_owned(article_id, user)
    upd = data.model_dump()
    upd["updated_at"] = now_iso()
    await db.articles.update_one({"_id": ObjectId(article_id)}, {"$set": upd})
    await log_action(user, "Article Modified", article_id, request)
    return serialize(await db.articles.find_one({"_id": ObjectId(article_id)}))


@router.post("/staff/articles/{article_id}/submit")
async def submit_review(article_id: str, request: Request,
                        user=Depends(require_role("reporter", "editor", "administrator"))):
    await _get_owned(article_id, user)
    await db.articles.update_one({"_id": ObjectId(article_id)}, {"$set": {"status": "review", "updated_at": now_iso()}})
    await log_action(user, "Submitted for Review", article_id, request)
    return {"ok": True}


@router.post("/staff/articles/{article_id}/publish")
async def publish_article(article_id: str, request: Request,
                          user=Depends(require_role("editor", "administrator"))):
    if not ObjectId.is_valid(article_id):
        raise HTTPException(404, "Not found")
    await db.articles.update_one({"_id": ObjectId(article_id)},
                                 {"$set": {"status": "published", "published_at": now_iso(), "updated_at": now_iso()}})
    await log_action(user, "Published Live", article_id, request)
    try:
        doc = await db.articles.find_one({"_id": ObjectId(article_id)})
        from push_routes import push_all
        await push_all("New story published", doc.get("title", ""), f"/news/{article_id}")
    except Exception:
        pass
    return {"ok": True}


@router.delete("/staff/articles/{article_id}")
async def delete_article(article_id: str, request: Request,
                         user=Depends(require_role("reporter", "editor", "administrator"))):
    doc = await _get_owned(article_id, user)
    if user["role"] == "reporter" and doc.get("status") == "published":
        raise HTTPException(403, "Cannot delete published article")
    await db.articles.delete_one({"_id": ObjectId(article_id)})
    await log_action(user, "Article Deleted", article_id, request)
    return {"ok": True}
