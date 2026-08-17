import os
import io
import hmac
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from database import db, serialize
from auth_utils import get_current_user
from invoice import generate_invoice_pdf

router = APIRouter(prefix="/api/payments", tags=["payments"])
logger = logging.getLogger("payments")

PLANS = {
    "monthly": {"label": "Monthly", "amount": 199, "period": "month", "days": 30},
    "annual": {"label": "Annual", "amount": 1499, "period": "year", "days": 365},
}
KEY_ID = os.environ.get("PROCESS_ENV_RAZORPAY_KEY_ID", "")
KEY_SECRET = os.environ.get("PROCESS_ENV_RAZORPAY_KEY_SECRET", "")


async def _keys():
    """Resolve Razorpay keys from admin settings, falling back to env."""
    from database import get_settings
    s = await get_settings()
    kid = s.get("razorpay_key_id") or KEY_ID
    ksec = s.get("razorpay_key_secret") or KEY_SECRET
    return kid, ksec, not (kid and ksec)


def _rzp_client(kid, ksec):
    import razorpay
    return razorpay.Client(auth=(kid, ksec))


def compute_gst(base: float, state: Optional[str]):
    home = os.environ.get("COMPANY_STATE", "West Bengal").lower()
    intra = (state or home).strip().lower() == home
    gst = round(base * 0.18, 2)
    if intra:
        half = round(gst / 2, 2)
        return {"cgst": half, "sgst": half, "igst": 0.0, "gst": gst}
    return {"cgst": 0.0, "sgst": 0.0, "igst": gst, "gst": gst}


class OrderInput(BaseModel):
    plan_id: str
    company_name: Optional[str] = None
    gstin: Optional[str] = None
    state: Optional[str] = None


@router.get("/plans")
async def plans():
    kid, ksec, mock = await _keys()
    out = []
    for pid, p in PLANS.items():
        gst = compute_gst(p["amount"], None)
        out.append({"id": pid, **p, "base": p["amount"], "gst": gst["gst"],
                    "total": round(p["amount"] + gst["gst"], 2)})
    return {"plans": out, "mock_mode": mock, "key_id": kid}


@router.get("/config")
async def config():
    kid, ksec, mock = await _keys()
    return {"mock_mode": mock, "key_id": kid}


@router.post("/create-order")
async def create_order(data: OrderInput, user=Depends(get_current_user)):
    plan = PLANS.get(data.plan_id)
    if not plan:
        raise HTTPException(400, "Invalid plan")
    gst = compute_gst(plan["amount"], data.state)
    total = round(plan["amount"] + gst["gst"], 2)
    amount_paise = int(round(total * 100))
    kid, ksec, mock = await _keys()
    if mock:
        order_id = f"order_mock_{ObjectId()}"
    else:
        rzp = _rzp_client(kid, ksec)
        o = rzp.order.create({"amount": amount_paise, "currency": "INR", "payment_capture": 1})
        order_id = o["id"]
    doc = {
        "order_id": order_id, "user_id": user["id"], "plan_id": data.plan_id,
        "base": plan["amount"], **gst, "total": total, "amount_paise": amount_paise,
        "currency": "INR", "status": "created", "company_name": data.company_name,
        "gstin": data.gstin, "state": data.state or os.environ.get("COMPANY_STATE"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(doc)
    return {"order_id": order_id, "amount": amount_paise, "currency": "INR",
            "key_id": kid, "mock_mode": mock, "total": total, "breakdown": gst,
            "plan": plan["label"]}


class VerifyInput(BaseModel):
    order_id: str
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


async def _activate(user_id, order):
    plan = PLANS[order["plan_id"]]
    next_billing = datetime.now(timezone.utc) + timedelta(days=plan["days"])
    sub = {
        "status": "active", "plan_id": order["plan_id"], "plan_label": plan["label"],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "next_billing": next_billing.isoformat(), "amount": plan["amount"],
        "cancel_at_period_end": False, "auto_renew": True,
        "payment_method": "Razorpay UPI Autopay / Card mandate",
    }
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"subscription": sub, "role_paid": True}})
    return sub


async def _create_invoice(user, order):
    count = await db.invoices.count_documents({}) + 1
    inv = {
        "invoice_no": f"EW/{datetime.now().year}/{count:05d}",
        "date": datetime.now(timezone.utc).strftime("%d %b %Y"),
        "user_id": user["id"], "customer_name": user["name"], "customer_email": user["email"],
        "company_name": order.get("company_name"), "gstin": order.get("gstin"),
        "plan_label": PLANS[order["plan_id"]]["label"], "base": order["base"],
        "cgst": order["cgst"], "sgst": order["sgst"], "igst": order["igst"],
        "gst": order["gst"], "total": order["total"], "order_id": order["order_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.invoices.insert_one(inv)
    inv_id = str(res.inserted_id)
    # Deliver GST invoice by email (Resend managed). Best-effort, non-blocking failure.
    try:
        from email_utils import send_invoice_email
        await send_invoice_email(user["email"], user["name"], inv)
    except Exception as e:
        logger.warning(f"invoice email failed: {e}")
    return inv_id


@router.post("/verify")
async def verify(data: VerifyInput, user=Depends(get_current_user)):
    order = await db.orders.find_one({"order_id": data.order_id, "user_id": user["id"]})
    if not order:
        raise HTTPException(404, "Order not found")
    kid, ksec, mock = await _keys()
    if not mock:
        body = f"{data.order_id}|{data.razorpay_payment_id}"
        expected = hmac.new(ksec.encode(), body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, data.razorpay_signature or ""):
            raise HTTPException(400, "Signature verification failed")
    await db.orders.update_one({"order_id": data.order_id},
                               {"$set": {"status": "paid", "payment_id": data.razorpay_payment_id or f"pay_mock_{ObjectId()}"}})
    sub = await _activate(user["id"], order)
    inv_id = await _create_invoice(user, order)
    return {"ok": True, "subscription": sub, "invoice_id": inv_id}


@router.post("/webhook")
async def webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    if secret:
        expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(400, "Invalid webhook signature")
    import json
    try:
        event = json.loads(payload.decode())
    except Exception:
        event = {}
    etype = event.get("event")
    logger.info(f"[WEBHOOK] received event: {etype}")
    if etype in ("payment.captured", "subscription.activated"):
        entity = event.get("payload", {}).get("payment", {}).get("entity", {})
        oid = entity.get("order_id")
        if oid:
            order = await db.orders.find_one({"order_id": oid})
            if order:
                await db.orders.update_one({"order_id": oid}, {"$set": {"status": "paid"}})
                await _activate(order["user_id"], order)
    return {"status": "processed", "event": etype}


@router.get("/invoices")
async def my_invoices(user=Depends(get_current_user)):
    docs = await db.invoices.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return [serialize(d) for d in docs]


@router.get("/invoices/{invoice_id}/pdf")
async def invoice_pdf(invoice_id: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(404, "Not found")
    inv = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not inv or (inv["user_id"] != user["id"] and user["role"] != "administrator"):
        raise HTTPException(404, "Invoice not found")
    pdf = generate_invoice_pdf(inv)
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={inv['invoice_no'].replace('/','-')}.pdf"})


@router.post("/cancel")
async def cancel(user=Depends(get_current_user)):
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    sub = u.get("subscription")
    if not sub or sub.get("status") != "active":
        raise HTTPException(400, "No active subscription")
    sub["cancel_at_period_end"] = True
    sub["status"] = "cancelling"
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"subscription": sub}})
    return {"ok": True, "message": "Subscription will end after the current billing period (grace access retained).", "subscription": sub}


@router.post("/update-method")
async def update_method(user=Depends(get_current_user)):
    _, _, mock = await _keys()
    return {"ok": True, "message": "Redirect to payment method update portal.", "mock_mode": mock}
