import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Plus, Trash2, Check, X, Pause } from "lucide-react";
import { toast } from "sonner";

const ST = {
  pending: "text-amber-600 border-amber-600",
  live: "text-green-700 border-green-700",
  rejected: "text-[var(--alert)] border-[var(--alert)]",
  paused: "text-ink-soft border-[var(--line)]",
  completed: "text-ink-soft border-[var(--line)]",
};

export default function AdsTab() {
  const [plans, setPlans] = useState([]);
  const [ads, setAds] = useState([]);
  const [form, setForm] = useState({ label: "", size: "300x250", price: "", impressions: "" });
  const [house, setHouse] = useState({ label: "", size: "300x250", image_url: "", target_url: "", impressions: 100000 });

  const load = () => {
    api.get("/ads/plans").then(({ data }) => setPlans(data)).catch(() => {});
    api.get("/admin/ads").then(({ data }) => setAds(data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const createPlan = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/ad-plans", { label: form.label, size: form.size, price: Number(form.price), impressions: Number(form.impressions) });
      toast.success("Plan created"); setForm({ label: "", size: "300x250", price: "", impressions: "" }); load();
    } catch { toast.error("Failed"); }
  };
  const delPlan = async (id) => { await api.delete(`/admin/ad-plans/${id}`); load(); };
  const setStatus = async (id, status) => { await api.patch(`/admin/ads/${id}`, { status }); toast.success(`Ad ${status}`); load(); };
  const addHouse = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/ads", { ...house, impressions: Number(house.impressions) });
      toast.success("House banner is live"); setHouse({ ...house, label: "", image_url: "", target_url: "" }); load();
    } catch { toast.error("Failed"); }
  };

  const cls = "card-2 pill px-3 py-2 text-sm bg-transparent outline-none text-ink";

  return (
    <div data-testid="admin-ads">
      <h3 className="font-serif-display text-3xl mb-6">Advertising</h3>

      <h4 className="font-body font-bold uppercase tracking-wider text-sm mb-3">Ad Plans (size · price · impressions)</h4>
      <form onSubmit={createPlan} className="card p-4 mb-4 grid sm:grid-cols-5 gap-3">
        <input data-testid="plan-label" required placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={cls} />
        <select data-testid="plan-size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} className={cls}>
          <option value="300x250">300x250</option><option value="728x90">728x90</option><option value="160x600">160x600</option>
        </select>
        <input data-testid="plan-price" required type="number" placeholder="Price ₹" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={cls} />
        <input data-testid="plan-impressions" required type="number" placeholder="Impressions" value={form.impressions} onChange={(e) => setForm({ ...form, impressions: e.target.value })} className={cls} />
        <button data-testid="create-plan-btn" className="btn-gold pill text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1"><Plus size={14} /> Add</button>
      </form>
      <div className="flex flex-wrap gap-2 mb-8">
        {plans.map((p) => (
          <span key={p.id} className="card-2 pill px-3 py-1.5 text-xs flex items-center gap-2" data-testid="plan-chip">
            {p.label} · {p.size} · ₹{p.price} · {p.impressions.toLocaleString()}
            <button onClick={() => delPlan(p.id)} className="text-[var(--alert)]"><Trash2 size={13} /></button>
          </span>
        ))}
      </div>

      <h4 className="font-body font-bold uppercase tracking-wider text-sm mb-3">House Banner (goes live instantly)</h4>
      <form onSubmit={addHouse} className="card p-4 mb-8 grid sm:grid-cols-5 gap-3">
        <input data-testid="house-label" required placeholder="Label" value={house.label} onChange={(e) => setHouse({ ...house, label: e.target.value })} className={cls} />
        <select data-testid="house-size" value={house.size} onChange={(e) => setHouse({ ...house, size: e.target.value })} className={cls}>
          <option value="300x250">300x250</option><option value="728x90">728x90</option><option value="160x600">160x600</option>
        </select>
        <input data-testid="house-image" required placeholder="Banner image URL" value={house.image_url} onChange={(e) => setHouse({ ...house, image_url: e.target.value })} className={cls} />
        <input data-testid="house-target" required placeholder="Website link" value={house.target_url} onChange={(e) => setHouse({ ...house, target_url: e.target.value })} className={cls} />
        <button data-testid="house-add-btn" className="btn-gold pill text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1"><Plus size={14} /> Go Live</button>
      </form>

      <h4 className="font-body font-bold uppercase tracking-wider text-sm mb-3">Purchased Ads (approve to go live)</h4>
      <div className="space-y-3">
        {ads.map((a) => (
          <div key={a.id} className="card p-4 flex items-center gap-4" data-testid="ad-row">
            <img src={a.image_url} alt="" className="w-24 h-16 object-cover rounded-lg card-2" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{a.label} · {a.size}</p>
              <p className="text-xs text-ink-soft truncate">{a.user_email} → {a.target_url}</p>
              <p className="text-xs text-ink-soft">₹{a.price} · {a.served}/{a.impressions} served</p>
            </div>
            <span className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 ${ST[a.status] || ""}`}>{a.status}</span>
            <div className="flex gap-2">
              <button data-testid="approve-ad-btn" title="Approve" onClick={() => setStatus(a.id, "live")} className="text-green-700"><Check size={16} /></button>
              <button data-testid="pause-ad-btn" title="Pause" onClick={() => setStatus(a.id, "paused")} className="text-amber-600"><Pause size={16} /></button>
              <button data-testid="reject-ad-btn" title="Reject" onClick={() => setStatus(a.id, "rejected")} className="text-[var(--alert)]"><X size={16} /></button>
            </div>
          </div>
        ))}
        {ads.length === 0 && <p className="text-ink-soft text-sm">No ads purchased yet.</p>}
      </div>
    </div>
  );
}
