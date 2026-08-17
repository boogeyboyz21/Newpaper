import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiError } from "../lib/api";
import Layout from "../components/Layout";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success("Welcome back");
      nav(["reporter", "editor", "administrator"].includes(u.role) ? "/admin" : "/account");
    } catch (err) {
      setError(apiError(err.response?.data?.detail) || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout ticker={false}>
      <div className="py-16 max-w-md mx-auto">
        <div className="border-2 border-ink surface p-8">
          <h2 className="font-serif-display text-3xl text-center">Log In</h2>
          <p className="text-sm text-ink-soft text-center mt-1">Access your Editorial Wire account</p>
          {error && <p data-testid="login-error" className="text-crimson text-sm mt-4 text-center">{error}</p>}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" className="w-full border border-[var(--line)] px-3 py-2.5 bg-transparent outline-none text-ink" />
            <input data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" className="w-full border border-[var(--line)] px-3 py-2.5 bg-transparent outline-none text-ink" />
            <button data-testid="login-submit" disabled={busy}
              className="w-full bg-navy text-white py-3 font-bold uppercase tracking-wider text-sm disabled:opacity-50">
              {busy ? "Signing in…" : "Log In"}
            </button>
          </form>
          <p className="text-sm text-center mt-4 text-ink-soft">
            No account? <Link to="/register" className="text-crimson font-semibold" data-testid="link-register">Register</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
