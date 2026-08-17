import React, { useEffect, useState } from "react";
import { api, API } from "../../lib/api";
import { Download } from "lucide-react";

export default function BillingTab() {
  const [invoices, setInvoices] = useState([]);
  useEffect(() => { api.get("/admin/invoices").then(({ data }) => setInvoices(data)).catch(() => {}); }, []);

  const exportCsv = async () => {
    const token = localStorage.getItem("ew_token");
    const res = await fetch(`${API}/admin/gst-export`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "gst-export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const total = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const gst = invoices.reduce((s, i) => s + (i.gst || 0), 0);

  return (
    <div data-testid="admin-billing">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif-display text-3xl">Billing &amp; GST</h3>
        <button data-testid="gst-export-btn" onClick={exportCsv}
          className="bg-navy text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
          <Download size={14} /> Export GST CSV
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border-2 border-ink surface p-4"><p className="font-serif-display text-3xl">{invoices.length}</p><p className="text-xs uppercase text-ink-soft">Invoices</p></div>
        <div className="border-2 border-ink surface p-4"><p className="font-serif-display text-3xl">₹{total.toFixed(0)}</p><p className="text-xs uppercase text-ink-soft">Gross Revenue</p></div>
        <div className="border-2 border-ink surface p-4"><p className="font-serif-display text-3xl">₹{gst.toFixed(0)}</p><p className="text-xs uppercase text-ink-soft">GST Collected</p></div>
      </div>

      <div className="border-2 border-ink surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-ink-soft">
              <th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">GSTIN</th>
              <th className="px-4 py-3">Base</th><th className="px-4 py-3">GST</th><th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} className="border-b border-[var(--line)]" data-testid="billing-row">
                <td className="px-4 py-3 font-mono text-xs">{i.invoice_no}</td>
                <td className="px-4 py-3">{i.customer_name}</td>
                <td className="px-4 py-3 text-ink-soft text-xs">{i.gstin || "—"}</td>
                <td className="px-4 py-3">₹{i.base}</td>
                <td className="px-4 py-3">₹{i.gst}</td>
                <td className="px-4 py-3 font-semibold">₹{i.total}</td>
              </tr>
            ))}
            {invoices.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">No invoices yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
