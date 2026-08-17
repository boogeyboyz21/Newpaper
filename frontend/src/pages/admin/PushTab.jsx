import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Send, Bell } from "lucide-react";
import { toast } from "sonner";

export default function PushTab() {
  const [form, setForm] = useState({ title: "", body: "", url: "/" });
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/push/broadcasts").then(({ data }) => setHistory(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/push/broadcast", form);
      toast.success(`Broadcast queued: sent ${data.sent}/${data.total}`);
      setForm({ title: "", body: "", url: "/" });
      load();
    } catch (er) { toast.error(er.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div data-testid="admin-push">
      <h3 className="font-serif-display text-3xl mb-6">Push Notification Console</h3>
      <form onSubmit={send} className="border-2 border-ink surface p-6 max-w-lg space-y-3">
        <div>
          <input data-testid="push-title" maxLength={60} required placeholder="Title (max 60 chars)" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink" />
          <p className="text-[10px] text-ink-soft text-right">{form.title.length}/60</p>
        </div>
        <div>
          <textarea data-testid="push-body" maxLength={120} required rows={2} placeholder="Message (max 120 chars)" value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="w-full border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink" />
          <p className="text-[10px] text-ink-soft text-right">{form.body.length}/120</p>
        </div>
        <input data-testid="push-url" placeholder="Destination path (e.g. /news/123)" value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          className="w-full border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink" />
        <button data-testid="send-push-btn" disabled={busy}
          className="bg-crimson text-white px-4 py-2.5 text-sm font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50">
          <Send size={15} /> {busy ? "Sending…" : "Broadcast to All"}
        </button>
      </form>

      <h4 className="font-body font-bold uppercase tracking-wider text-sm mt-8 mb-3 flex items-center gap-2"><Bell size={15} /> Recent Broadcasts</h4>
      <div className="space-y-2">
        {history.map((b) => (
          <div key={b.id} className="border border-[var(--line)] p-3 text-sm surface">
            <p className="font-semibold">{b.title}</p>
            <p className="text-ink-soft text-xs">{b.body}</p>
            <p className="text-[10px] text-ink-soft mt-1">Sent {b.sent}/{b.total} · {new Date(b.created_at).toLocaleString()}</p>
          </div>
        ))}
        {history.length === 0 && <p className="text-ink-soft text-sm">No broadcasts sent yet.</p>}
      </div>
    </div>
  );
}
