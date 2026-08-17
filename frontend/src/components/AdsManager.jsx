import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { resetMeter } from "../lib/meter";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";

const ST = {
  pending: "text-amber-600 border-amber-600",
  live: "text-green-700 border-green-700",
  rejected: "text-[var(--alert)] border-[var(--alert)]",
  paused: "text-ink-soft border-[var(--line)]",
  completed: "text-ink-soft border-[var(--line)]",
};

export default function AdsManager() {
  const [plans, setPlans] = useState([]);
  const [mine, setMine] = useState([]);
  const [form, setForm] = useState({ plan_id: "", image_url: "", target_url: "", company: "" });

  const load = () => {
    api.get("/ads/plans").then(({ data }) => { setPlans(data); if (data[0] && !form.plan_id) setForm((f) => ({ ...f, plan_id: data[0].id })); }).catch(() => {});
    api.get("/ads/mine").then(({ data }) => setMine(data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const buy = async (e) => {
    e.preventDefault();
    if (!form.plan_id) return toast.error("Select a plan");
    try {
      await api.post("/ads/purchase", form);
      toast.success("Ad purchased (test payment). Pending admin approval.");
      setForm({ ...form, image_url: "", target_url: "", company: "" });
      load();
    } catch (er) { toast.error(er.response?.data?.detail || "Purchase failed"); }
  };

  const cls = "w-full card-2 pill px-4 py-2.5 text-sm bg-transparent outline-none text-ink";

  return (
    <div className="widget" data-testid="ads-manager">
      <div className="widget-title flex items-center gap-2"><Megaphone size={13} /> My Advertisements</div>
      <div className="p-5">
        <form onSubmit={buy} className="grid sm:grid-cols-2 gap-3">
          <select data-testid="ad-plan-select" value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })} className={cls}>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.label} · {p.size} · ₹{p.price} · {p.impressions.toLocaleString()} views</option>)}
          </select>
          <input data-testid="ad-company" placeholder="Company (optional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={cls} />
          <input data-testid="ad-image" required placeholder="Banner image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={cls} />
          <input data-testid="ad-target" required placeholder="Click-through URL" value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} className={cls} />
          <button data-testid="buy-ad-btn" className="btn-gold pill py-2.5 text-sm font-bold uppercase tracking-wider sm:col-span-2">Purchase &amp; Submit for Approval</button>
        </form>

        <div className="mt-5 space-y-2">
          {mine.map((a) => (
            <div key={a.id} className="card-2 rounded-xl p-3 flex items-center gap-3" data-testid="my-ad-row">
              <img src={a.image_url} alt="" className="w-16 h-11 object-cover rounded-md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{a.label} · {a.size}</p>
                <p className="text-xs text-ink-soft">₹{a.price} · {a.served}/{a.impressions} impressions</p>
              </div>
              <span className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 ${ST[a.status] || ""}`}>{a.status}</span>
            </div>
          ))}
          {mine.length === 0 && <p className="text-ink-soft text-sm">No ads yet. Purchase a banner above to promote your brand.</p>}
        </div>
      </div>
    </div>
  );
}
