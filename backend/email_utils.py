import os
import logging
import httpx
from html import escape

logger = logging.getLogger("email")
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "The Editorial Wire")
APP_URL = os.environ.get("FRONTEND_URL", "")


def _assert_safe(subject: str, html: str):
    low = html.lower()
    if "<form" in low or "<input" in low:
        raise ValueError("No forms/inputs allowed in email")


async def send_email(to: str, subject: str, html: str):
    if not EMAIL_KEY:
        logger.info(f"[EMAIL skipped - no key configured] to {to}: {subject}")
        return None
    _assert_safe(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                             headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        r.raise_for_status()
        return r.json().get("id")
    except Exception as e:
        logger.error(f"email send failed: {e}")
        return None


async def send_invoice_email(to: str, name: str, inv: dict):
    link = f"{APP_URL}/account"
    html = (
        '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif;color:#1a1a1a">'
        '<h2 style="font-family:Georgia,serif;color:#1b5e2a">The Editorial Wire</h2>'
        f'<p>Hi {escape(name)}, thank you for subscribing. Your GST tax invoice '
        f'<strong>{escape(str(inv["invoice_no"]))}</strong> is ready.</p>'
        '<table style="border-collapse:collapse;margin:12px 0;font-size:14px">'
        f'<tr><td style="padding:4px 14px 4px 0">Plan</td><td style="padding:4px 0">{escape(str(inv["plan_label"]))}</td></tr>'
        f'<tr><td style="padding:4px 14px 4px 0">Taxable value</td><td style="padding:4px 0">Rs {inv["base"]}</td></tr>'
        f'<tr><td style="padding:4px 14px 4px 0">GST @ 18%</td><td style="padding:4px 0">Rs {inv["gst"]}</td></tr>'
        f'<tr><td style="padding:4px 14px 4px 0"><strong>Total paid</strong></td><td style="padding:4px 0"><strong>Rs {inv["total"]}</strong></td></tr>'
        '</table>'
        f'<p><a href="{link}" style="background:#2f8241;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none">Download your PDF invoice</a></p>'
        '<p style="font-size:12px;color:#888">Sent by The Editorial Wire. We never ask for your password or card details by email.</p>'
        '</td></tr></table>'
    )
    return await send_email(to, f"Your Editorial Wire invoice {inv['invoice_no']}", html)


async def send_reset_email(to: str, name: str, link: str):
    html = (
        '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif;color:#1a1a1a">'
        '<h2 style="font-family:Georgia,serif;color:#1b5e2a">The Editorial Wire</h2>'
        f'<p>Hi {escape(name)}, we received a request to reset your password.</p>'
        f'<p><a href="{link}" style="background:#2f8241;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset your password</a></p>'
        '<p style="font-size:12px;color:#888">This link expires in 1 hour. If you did not request this, you can safely ignore this email. We never ask for your password by email.</p>'
        '</td></tr></table>'
    )
    return await send_email(to, "Reset your Editorial Wire password", html)
