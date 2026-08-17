import React, { useEffect, useState } from "react";
import { api, API } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { Download, CreditCard, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function istDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short",
  }) + " IST";
}

export default function Account() {
  const { user, refresh } = useAuth();
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    api.get("/payments/invoices").then(({ data }) => setInvoices(data)).catch(() => {});
  }, []);

  const sub = user?.subscription;

  const download = async (inv) => {
    try {
      const token = localStorage.getItem("ew_token");
      const res = await fetch(`${API}/payments/invoices/${inv.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.invoice_no.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  const cancel = async () => {
    if (!window.confirm("Cancel subscription? You retain access until the end of the billing period.")) return;
    try {
      const { data } = await api.post("/payments/cancel");
      toast.success(data.message);
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Cancel failed");
    }
  };

  const updateMethod = async () => {
    const { data } = await api.post("/payments/update-method");
    toast.message(data.message);
  };

  const active = sub && ["active", "cancelling"].includes(sub.status);

  return (
    <Layout ticker={false}>
      <div className="py-10" data-testid="account-page">
        <div className="border-b-2 border-ink pb-4 mb-8">
          <span className="cat-tag text-xs">My Account</span>
          <h2 className="font-serif-display font-black text-4xl mt-1">Hello, {user?.name}</h2>
          <p className="text-ink-soft text-sm mt-1">{user?.email} · Role: {user?.role}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Subscription card */}
          <div className="lg:col-span-1">
            <div className="border-2 border-ink surface" data-testid="subscription-card">
              <div className="bg-navy text-white px-4 py-2 font-body font-bold uppercase tracking-widest text-xs">
                Subscription
              </div>
              <div className="p-6">
                {active ? (
                  <>
                    <div className="flex items-center gap-2">
                      {sub.status === "active"
                        ? <CheckCircle2 className="text-green-600" size={20} />
                        : <AlertCircle className="text-amber-500" size={20} />}
                      <span className="font-body font-bold uppercase tracking-wider text-sm" data-testid="sub-status">
                        {sub.status === "active" ? "Active" : "Cancelling"}
                      </span>
                    </div>
                    <p className="font-serif-display text-2xl mt-3">{sub.plan_label} Plan</p>
                    <p className="text-sm text-ink-soft mt-1">₹{sub.amount} / {sub.plan_id === "annual" ? "year" : "month"}</p>
                    <div className="mt-4 text-sm border-t border-[var(--line)] pt-4">
                      <p className="text-ink-soft text-xs uppercase tracking-wider">Next billing</p>
                      <p className="font-semibold" data-testid="next-billing">{istDate(sub.next_billing)}</p>
                    </div>
                    <p className="text-xs text-ink-soft mt-3 flex items-center gap-1">
                      <CreditCard size={12} /> Processed via Razorpay
                    </p>
                    {sub.cancel_at_period_end && (
                      <p className="text-xs text-amber-600 mt-2">Ends after current period (grace access retained).</p>
                    )}
                    <div className="mt-5 space-y-2">
                      <button data-testid="update-method-btn" onClick={updateMethod}
                        className="w-full border-2 border-ink py-2 text-xs font-bold uppercase tracking-wider">
                        Update Payment Method
                      </button>
                      {sub.status === "active" && (
                        <button data-testid="cancel-sub-btn" onClick={cancel}
                          className="w-full text-crimson py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                          <XCircle size={14} /> Cancel Subscription
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-ink-soft text-sm">You don't have an active subscription.</p>
                    <a href="/plans" data-testid="account-subscribe-btn"
                      className="inline-block mt-4 bg-crimson text-white px-6 py-2.5 font-bold uppercase tracking-wider text-sm">
                      View Plans
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoices */}
          <div className="lg:col-span-2">
            <div className="border-2 border-ink surface">
              <div className="bg-navy text-white px-4 py-2 font-body font-bold uppercase tracking-widest text-xs">
                Billing History
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="invoices-table">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-ink-soft">
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-soft">No transactions yet.</td></tr>
                    )}
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-[var(--line)]" data-testid="invoice-row">
                        <td className="px-4 py-3 font-mono text-xs">{inv.invoice_no}</td>
                        <td className="px-4 py-3">{inv.date}</td>
                        <td className="px-4 py-3">{inv.plan_label}</td>
                        <td className="px-4 py-3">₹{inv.total}</td>
                        <td className="px-4 py-3">
                          <button data-testid="download-invoice-btn" onClick={() => download(inv)}
                            className="flex items-center gap-1 text-navy hover:text-crimson">
                            <Download size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
