import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../lib/api";
import Layout from "../components/Layout";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSent(true);
      toast.success(data.message);
    } catch (er) { toast.error(apiError(er.response?.data?.detail) || "Failed"); }
  };
  return (
    <Layout ticker={false}>
      <div className="py-16 max-w-md mx-auto">
        <div className="card p-8" data-testid="forgot-page">
          <h2 className="font-serif-display text-3xl text-center">Forgot Password</h2>
          {sent ? (
            <p className="text-sm text-ink-soft text-center mt-4" data-testid="forgot-sent">
              If that email is registered, a reset link is on its way. Check your inbox (link valid for 1 hour).
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <input data-testid="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Your account email" className="w-full card-2 pill px-4 py-2.5 bg-transparent outline-none text-ink" />
              <button data-testid="forgot-submit" className="w-full btn-gold pill py-3 font-bold uppercase tracking-wider text-sm">Send Reset Link</button>
            </form>
          )}
          <p className="text-sm text-center mt-4 text-ink-soft">
            <Link to="/login" className="text-green font-semibold">Back to Login</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
