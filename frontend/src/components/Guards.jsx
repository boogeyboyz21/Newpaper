import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "./Layout";

export function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Layout ticker={false}><div className="py-24 text-center text-ink-soft">Loading…</div></Layout>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function StaffRoute({ children, roles }) {
  const { user, ready } = useAuth();
  if (!ready) return <Layout ticker={false}><div className="py-24 text-center text-ink-soft">Loading…</div></Layout>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/403" replace />;
  return children;
}
