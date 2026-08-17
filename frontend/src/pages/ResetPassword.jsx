import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api, apiError } from "../lib/api";
import Layout from "../components/Layout";
import PasswordStrength, { scorePassword } from "../components/PasswordStrength";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (scorePassword(pw) < 2) return toast.error("Please choose a stronger password");
    if (pw !== confirm) return toast.error("Passwords do not match");
    try {
      await api.post("/auth/reset-password", { token, new_password: pw });
      toast.success("Password reset. Please log in.");
      nav("/login");
    } catch (er) { toast.error(apiError(er.response?.data?.detail) || "Failed"); }
  };

  return (
    <Layout ticker={false}>
      <div className="py-16 max-w-md mx-auto">
        <div className="card p-8" data-testid="reset-page">
          <h2 className="font-serif-display text-3xl text-center">Set a New Password</h2>
          {!token ? (
            <p className="text-crimson text-sm text-center mt-4">Missing reset token. Use the link from your email.</p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <input data-testid="reset-password" type="password" required value={pw} onChange={(e) => setPw(e.target.value)}
                  placeholder="New password" className="w-full card-2 pill px-4 py-2.5 bg-transparent outline-none text-ink" />
                <PasswordStrength password={pw} />
              </div>
              <input data-testid="reset-confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password" className="w-full card-2 pill px-4 py-2.5 bg-transparent outline-none text-ink" />
              <button data-testid="reset-submit" className="w-full btn-gold pill py-3 font-bold uppercase tracking-wider text-sm">Reset Password</button>
            </form>
          )}
          <p className="text-sm text-center mt-4 text-ink-soft"><Link to="/login" className="text-green font-semibold">Back to Login</Link></p>
        </div>
      </div>
    </Layout>
  );
}
