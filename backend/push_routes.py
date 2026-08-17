import os
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel
from typing import Optional
from database import db, serialize
from auth_utils import require_role, log_action

router = APIRouter(prefix="/api/push", tags=["push"])
logger = logging.getLogger("push")


@router.get("/vapid-public-key")
async def vapid_public():
    return {"public_key": os.environ.get("VAPID_PUBLIC_KEY", "")}


async def push_all(title, body, url="/"):
    """Broadcast a web push to every stored subscription (best-effort)."""
    from pywebpush import webpush
    subs = await db.push_subscriptions.find({}).to_list(5000)
    payload = json.dumps({"title": title[:60], "body": body[:120], "url": url})
    claims = {"sub": os.environ.get("VAPID_SUBJECT", "mailto:admin@example.com")}
    pem = os.environ.get("VAPID_PRIVATE_PEM")
    sent = 0
    for s in subs:
        try:
            webpush(subscription_info={"endpoint": s["endpoint"], "keys": s["keys"]},
                    data=payload, vapid_private_key=pem, vapid_claims=dict(claims))
            sent += 1
        except Exception as e:
            logger.warning(f"push failed: {e}")
    if subs:
        await db.push_broadcasts.insert_one({"title": title, "body": body, "url": url,
                                             "sent": sent, "failed": len(subs) - sent, "total": len(subs),
                                             "by": "system", "created_at": datetime.now(timezone.utc).isoformat()})
    return sent


class SubInput(BaseModel):
    endpoint: str
    keys: dict


@router.post("/subscribe")
async def subscribe(data: SubInput, request: Request):
    await db.push_subscriptions.update_one(
        {"endpoint": data.endpoint},
        {"$set": {"endpoint": data.endpoint, "keys": data.keys,
                  "created_at": datetime.now(timezone.utc).isoformat(),
                  "user_agent": request.headers.get("user-agent", "")}},
        upsert=True,
    )
    return {"ok": True}


class BroadcastInput(BaseModel):
    title: str
    body: str
    url: Optional[str] = "/"


@router.post("/broadcast")
async def broadcast(data: BroadcastInput, request: Request, user=Depends(require_role("administrator"))):
    from pywebpush import webpush, WebPushException
    subs = await db.push_subscriptions.find({}).to_list(5000)
    payload = json.dumps({"title": data.title[:60], "body": data.body[:120], "url": data.url})
    claims = {"sub": os.environ.get("VAPID_SUBJECT", "mailto:admin@example.com")}
    pem = os.environ.get("VAPID_PRIVATE_PEM")
    sent, failed = 0, 0
    for s in subs:
        try:
            webpush(subscription_info={"endpoint": s["endpoint"], "keys": s["keys"]},
                    data=payload, vapid_private_key=pem, vapid_claims=dict(claims))
            sent += 1
        except Exception as e:
            failed += 1
            logger.warning(f"push failed: {e}")
    await db.push_broadcasts.insert_one({
        "title": data.title, "body": data.body, "url": data.url,
        "sent": sent, "failed": failed, "total": len(subs),
        "by": user["email"], "created_at": datetime.now(timezone.utc).isoformat()})
    await log_action(user, "Push Broadcast", None, request, {"title": data.title, "sent": sent})
    return {"ok": True, "sent": sent, "failed": failed, "total": len(subs)}


@router.get("/broadcasts")
async def broadcasts(user=Depends(require_role("administrator"))):
    docs = await db.push_broadcasts.find({}).sort("created_at", -1).to_list(100)
    return [serialize(d) for d in docs]
