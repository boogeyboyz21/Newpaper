import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { resetMeter } from "../lib/meter";
import Layout from "../components/Layout";
import { Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Plans() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [plans, setPlans] = useState([]);
  const [mock, setMock] = useState(true);
  const [selected, setSelected] = useState(null);
  const [gst, setGst] = useState({ company_name: "", gstin: "", state: "West Bengal" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/payments/plans").then(({ data }) => {
      setPlans(data.plans);
      setMock(data.mock_mode);
    });
  }, []);

  const startCheckout = async (planId) => {
    if (!user) {
      toast.error("Please log in to subscribe");
      nav("/login");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/payments/create-order", {
        plan_id: planId,
        company_name: gst.company_name || null,
        gstin: gst.gstin || null,
        state: gst.state,
      });

      const finalize = async (payment) => {
        await api.post("/payments/verify", {
          order_id: data.order_id,
          razorpay_payment_id: payment?.razorpay_payment_id,
          razorpay_signature: payment?.razorpay_signature,
        });
        resetMeter();
        await refresh();
        toast.success("Subscription activated! Enjoy unlimited access.");
        nav("/account");
      };

      if (data.mock_mode) {
        // MOCK checkout: simulate a successful Razorpay payment
        toast.message("Processing test payment (Razorpay mock)…");
        setTimeout(() => finalize({ razorpay_payment_id: "pay_mock", razorpay_signature: "mock" }), 900);
      } else {
        const ok = await loadRazorpay();
        if (!ok) return toast.error("Failed to load Razorpay");
        const rzp = new window.Razorpay({
          key: data.key_id,
          amount: data.amount,
          currency: "INR",
          name: "The Editorial Wire",
          description: `${data.plan} subscription`,
          order_id: data.order_id,
          prefill: { name: user.name, email: user.email },
          theme: { color: "#0A192F" },
          handler: (resp) => finalize(resp),
        });
        rzp.open();
      }
    } catch (e) {
      toast.error("Could not start checkout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout ticker={false}>
      <div className="py-12" data-testid="plans-page">
        <div className="text-center border-b-2 border-ink pb-4 mb-8">
          <span className="cat-tag text-xs">Subscribe</span>
          <h2 className="font-serif-display font-black text-4xl sm:text-5xl mt-1">Choose Your Plan</h2>
          <p className="text-ink-soft mt-2">Unlimited access to independent journalism. Prices in INR (incl. 18% GST).</p>
          {mock && <p className="text-xs text-navy mt-2 uppercase tracking-wider">Razorpay running in TEST / MOCK mode</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((p) => (
            <div key={p.id} data-testid={`plan-${p.id}`}
              className={`border-2 p-8 surface ${p.id === "annual" ? "border-crimson" : "border-ink"}`}>
              {p.id === "annual" && <span className="bg-crimson text-white text-[10px] px-2 py-1 uppercase tracking-wider">Best Value</span>}
              <h3 className="font-serif-display text-3xl mt-2">{p.label}</h3>
              <div className="flex items-end gap-1 mt-2">
                <span className="font-serif-display text-5xl">₹{p.base}</span>
                <span className="text-ink-soft mb-2">/{p.period}</span>
              </div>
              <p className="text-xs text-ink-soft mt-1">+ ₹{p.gst} GST · Total ₹{p.total}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {["Unlimited article access", "Ad-light reading experience", "GST tax invoice", "Cancel anytime"].map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check size={16} className="text-navy" /> {f}</li>
                ))}
              </ul>
              <button data-testid={`subscribe-${p.id}`} disabled={busy} onClick={() => startCheckout(p.id)}
                className={`w-full mt-6 py-3 font-bold uppercase tracking-wider text-sm text-white disabled:opacity-50 ${p.id === "annual" ? "bg-crimson" : "bg-navy"}`}>
                {busy ? "Processing…" : `Subscribe ${p.label}`}
              </button>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-8 border border-[var(--line)] p-6 surface">
          <h4 className="font-body font-bold uppercase tracking-wider text-sm flex items-center gap-2">
            <ShieldCheck size={16} /> GST Invoice Details (optional)
          </h4>
          <p className="text-xs text-ink-soft mt-1">Add company details for a GST-compliant tax invoice.</p>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <input data-testid="gst-company" value={gst.company_name} onChange={(e) => setGst({ ...gst, company_name: e.target.value })}
              placeholder="Company name" className="border border-[var(--line)] px-3 py-2 text-sm bg-transparent outline-none text-ink" />
            <input data-testid="gst-number" value={gst.gstin} onChange={(e) => setGst({ ...gst, gstin: e.target.value })}
              placeholder="GSTIN" className="border border-[var(--line)] px-3 py-2 text-sm bg-transparent outline-none text-ink" />
            <input data-testid="gst-state" value={gst.state} onChange={(e) => setGst({ ...gst, state: e.target.value })}
              placeholder="State" className="border border-[var(--line)] px-3 py-2 text-sm bg-transparent outline-none text-ink" />
          </div>
          <p className="text-xs text-ink-soft mt-2">
            West Bengal → 9% CGST + 9% SGST · Other states → 18% IGST · SAC 998431
          </p>
        </div>
      </div>
    </Layout>
  );
}
