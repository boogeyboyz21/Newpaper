import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiError } from "../lib/api";
import Layout from "../components/Layout";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success("Account created");
      nav("/account");
    } catch (err) {
      setError(apiError(err.response?.data?.detail) || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Layout ticker={false}>
      <div className="py-16 max-w-md mx-auto">
        <div className="border-2 border-ink surface p-8">
          <h2 className="font-serif-display text-3xl text-center">Create Account</h2>
          <p className="text-sm text-ink-soft text-center mt-1">Read 3 free articles a month — or go unlimited</p>
          {error && <p data-testid="register-error" className="text-crimson text-sm mt-4 text-center">{error}</p>}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input data-testid="register-name" required value={form.name} onChange={upd("name")}
              placeholder="Full name" className="w-full border border-[var(--line)] px-3 py-2.5 bg-transparent outline-none text-ink" />
            <input data-testid="register-email" type="email" required value={form.email} onChange={upd("email")}
              placeholder="Email" className="w-full border border-[var(--line)] px-3 py-2.5 bg-transparent outline-none text-ink" />
            <input data-testid="register-password" type="password" required minLength={6} value={form.password} onChange={upd("password")}
              placeholder="Password (min 6 chars)" className="w-full border border-[var(--line)] px-3 py-2.5 bg-transparent outline-none text-ink" />
            <button data-testid="register-submit" disabled={busy}
              className="w-full bg-crimson text-white py-3 font-bold uppercase tracking-wider text-sm disabled:opacity-50">
              {busy ? "Creating…" : "Register"}
            </button>
          </form>
          <p className="text-sm text-center mt-4 text-ink-soft">
            Have an account? <Link to="/login" className="text-crimson font-semibold" data-testid="link-login">Log In</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
