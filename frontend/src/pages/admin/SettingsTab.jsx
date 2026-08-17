import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { KeyRound, CloudSun, CreditCard, BarChart3 } from "lucide-react";

export default function SettingsTab() {
  const [form, setForm] = useState({
    openweather_key: "", razorpay_key_id: "", razorpay_key_secret: "",
    ga_id: "", analytics_mode: "privacy", adsense_client: "",
  });
  const [secretSet, setSecretSet] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/admin/settings").then(({ data }) => {
      setForm((f) => ({
        ...f,
        openweather_key: data.openweather_key || "",
        razorpay_key_id: data.razorpay_key_id || "",
        ga_id: data.ga_id || "",
        analytics_mode: data.analytics_mode || "privacy",
        adsense_client: data.adsense_client || "",
      }));
      setSecretSet(data.razorpay_key_secret_set);
    }).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form };
    if (!payload.razorpay_key_secret) delete payload.razorpay_key_secret; // don't overwrite with blank
    try {
      await api.put("/admin/settings", payload);
      toast.success("Settings saved. Keys take effect immediately.");
    } catch (er) {
      toast.error(er.response?.data?.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const inputCls = "w-full card-2 pill px-4 py-2.5 text-sm bg-transparent outline-none text-ink";

  return (
    <div data-testid="admin-settings">
      <h3 className="font-serif-display text-3xl mb-2">Site Settings &amp; API Keys</h3>
      <p className="text-sm text-ink-soft mb-6">Add third-party API keys here. Values are used immediately and stored securely in the database.</p>

      <form onSubmit={save} className="space-y-6 max-w-2xl">
        <div className="widget p-5">
          <h4 className="font-body font-bold uppercase tracking-wider text-sm flex items-center gap-2 mb-3"><CloudSun size={16} /> Weather</h4>
          <label className="text-xs text-ink-soft">OpenWeatherMap API Key <span className="opacity-60">(optional — falls back to free Open-Meteo)</span></label>
          <input data-testid="set-openweather" value={form.openweather_key} onChange={upd("openweather_key")} placeholder="e.g. 1a2b3c4d..." className={inputCls} />
        </div>

        <div className="widget p-5">
          <h4 className="font-body font-bold uppercase tracking-wider text-sm flex items-center gap-2 mb-3"><CreditCard size={16} /> Razorpay Payments</h4>
          <label className="text-xs text-ink-soft">Key ID</label>
          <input data-testid="set-rzp-id" value={form.razorpay_key_id} onChange={upd("razorpay_key_id")} placeholder="rzp_live_xxx / rzp_test_xxx" className={inputCls + " mb-3"} />
          <label className="text-xs text-ink-soft">Key Secret {secretSet && <span className="text-green">(currently set — leave blank to keep)</span>}</label>
          <input data-testid="set-rzp-secret" type="password" value={form.razorpay_key_secret} onChange={upd("razorpay_key_secret")} placeholder={secretSet ? "••••••••" : "Enter secret"} className={inputCls} />
          <p className="text-xs text-ink-soft mt-2">Leave both blank to keep the gateway in TEST / MOCK mode.</p>
        </div>

        <div className="widget p-5">
          <h4 className="font-body font-bold uppercase tracking-wider text-sm flex items-center gap-2 mb-3"><BarChart3 size={16} /> Analytics</h4>
          <label className="text-xs text-ink-soft">Mode</label>
          <select data-testid="set-analytics-mode" value={form.analytics_mode} onChange={upd("analytics_mode")} className={inputCls + " mb-3"}>
            <option value="privacy">Privacy-first (cookieless, GDPR)</option>
            <option value="ga4">Google Analytics 4 (anonymized IP)</option>
          </select>
          <label className="text-xs text-ink-soft">GA4 Measurement ID</label>
          <input data-testid="set-ga-id" value={form.ga_id} onChange={upd("ga_id")} placeholder="G-XXXXXXXXXX" className={inputCls + " mb-3"} />
          <label className="text-xs text-ink-soft">Google AdSense Publisher ID (fills empty ad slots)</label>
          <input data-testid="set-adsense" value={form.adsense_client} onChange={upd("adsense_client")} placeholder="ca-pub-XXXXXXXXXXXXXXXX" className={inputCls} />
        </div>

        <button data-testid="save-settings-btn" disabled={busy} className="btn-gold pill px-6 py-3 text-sm uppercase tracking-wider flex items-center gap-2 disabled:opacity-50">
          <KeyRound size={16} /> {busy ? "Saving…" : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
