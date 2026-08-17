import React, { useState } from "react";
import { api, apiError } from "../lib/api";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import PasswordStrength, { scorePassword } from "./PasswordStrength";

export default function ChangePassword() {
  const [f, setF] = useState({ current_password: "", new_password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const cls = "w-full card-2 pill px-4 py-2.5 text-sm bg-transparent outline-none text-ink";

  const submit = async (e) => {
    e.preventDefault();
    if (scorePassword(f.new_password) < 2) return toast.error("Please choose a stronger password (add length, numbers or symbols)");
    if (f.new_password !== f.confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      await api.post("/auth/change-password", { current_password: f.current_password, new_password: f.new_password });
      toast.success("Password updated");
      setF({ current_password: "", new_password: "", confirm: "" });
    } catch (er) {
      toast.error(apiError(er.response?.data?.detail) || "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="widget" data-testid="change-password">
      <div className="widget-title flex items-center gap-2"><KeyRound size={13} /> Change Password</div>
      <form onSubmit={submit} className="p-5 grid sm:grid-cols-3 gap-3">
        <input data-testid="cp-current" type="password" required placeholder="Current password" value={f.current_password} onChange={upd("current_password")} className={cls} />
        <input data-testid="cp-new" type="password" required minLength={6} placeholder="New password" value={f.new_password} onChange={upd("new_password")} className={cls} />
        <input data-testid="cp-confirm" type="password" required placeholder="Confirm new password" value={f.confirm} onChange={upd("confirm")} className={cls} />
        <div className="sm:col-span-3"><PasswordStrength password={f.new_password} /></div>
        <button data-testid="cp-submit" disabled={busy} className="btn-gold pill py-2.5 text-sm font-bold uppercase tracking-wider sm:col-span-3">
          {busy ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
