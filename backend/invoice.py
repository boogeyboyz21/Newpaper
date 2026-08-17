import io
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas


def generate_invoice_pdf(inv: dict) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    navy = colors.HexColor("#0A192F")
    crimson = colors.HexColor("#8B0000")

    c.setFillColor(navy)
    c.rect(0, h - 30 * mm, w, 30 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Times-Bold", 20)
    c.drawString(20 * mm, h - 18 * mm, os.environ.get("COMPANY_NAME", "Editorial Wire"))
    c.setFont("Helvetica", 9)
    c.drawString(20 * mm, h - 24 * mm, "TAX INVOICE")

    c.setFillColor(colors.black)
    y = h - 40 * mm
    c.setFont("Helvetica", 9)
    c.drawString(20 * mm, y, os.environ.get("COMPANY_ADDRESS", ""))
    c.drawString(20 * mm, y - 5 * mm, f"GSTIN: {os.environ.get('COMPANY_GSTIN','')}   State: {os.environ.get('COMPANY_STATE','')}")
    c.drawString(20 * mm, y - 10 * mm, f"SAC: {os.environ.get('COMPANY_SAC','998431')} (Online text based information)")

    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(w - 20 * mm, y, f"Invoice #: {inv['invoice_no']}")
    c.setFont("Helvetica", 9)
    c.drawRightString(w - 20 * mm, y - 5 * mm, f"Date: {inv['date']}")
    c.drawRightString(w - 20 * mm, y - 10 * mm, f"Plan: {inv['plan_label']}")

    y -= 22 * mm
    c.setFillColor(navy)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, y, "Bill To:")
    c.setFillColor(colors.black)
    c.setFont("Helvetica", 9)
    c.drawString(20 * mm, y - 5 * mm, inv.get("customer_name", ""))
    c.drawString(20 * mm, y - 10 * mm, inv.get("customer_email", ""))
    if inv.get("company_name"):
        c.drawString(20 * mm, y - 15 * mm, f"Company: {inv['company_name']}")
    if inv.get("gstin"):
        c.drawString(20 * mm, y - 20 * mm, f"Customer GSTIN: {inv['gstin']}")

    y -= 32 * mm
    c.setFillColor(navy)
    c.rect(20 * mm, y, w - 40 * mm, 8 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(24 * mm, y + 2.5 * mm, "Description")
    c.drawRightString(w - 24 * mm, y + 2.5 * mm, "Amount (INR)")

    c.setFillColor(colors.black)
    c.setFont("Helvetica", 9)

    def row(label, value, bold=False):
        nonlocal y
        y -= 7 * mm
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 9)
        c.drawString(24 * mm, y, label)
        c.drawRightString(w - 24 * mm, y, f"{value:,.2f}")

    row(f"{inv['plan_label']} subscription (taxable value)", inv["base"])
    if inv["igst"] > 0:
        row("IGST @ 18%", inv["igst"])
    else:
        row("CGST @ 9%", inv["cgst"])
        row("SGST @ 9%", inv["sgst"])
    y -= 3 * mm
    c.line(20 * mm, y, w - 20 * mm, y)
    c.setFillColor(crimson)
    row("TOTAL", inv["total"], bold=True)

    c.setFillColor(colors.grey)
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(20 * mm, 20 * mm, "This is a computer generated invoice. Payment processed via Razorpay (INR).")
    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()
