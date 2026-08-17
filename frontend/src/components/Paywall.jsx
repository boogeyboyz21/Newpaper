import React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

export default function Paywall() {
  return (
    <div data-testid="paywall-overlay" className="absolute inset-x-0 bottom-0 top-1/3 flex items-end justify-center">
      <div className="w-full pt-32" style={{ background: "linear-gradient(to bottom, transparent, var(--paper) 45%)" }}>
        <div className="max-w-md mx-auto card p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green text-white flex items-center justify-center mx-auto mb-4">
            <Lock size={24} />
          </div>
          <h3 className="font-serif-display text-2xl">Subscriber-only article</h3>
          <p className="text-sm text-ink-soft mt-2">
            This premium story is available to subscribers. Reading the rest of The Editorial Wire is free —
            subscribe for unlimited access to premium journalism.
          </p>
          <div className="mt-6 space-y-2">
            <Link data-testid="paywall-plans-btn" to="/plans" className="block btn-gold pill py-3 font-bold uppercase tracking-wider text-sm">
              View Subscription Plans
            </Link>
            <Link data-testid="paywall-login-btn" to="/login" className="block card-2 pill py-3 font-bold uppercase tracking-wider text-sm">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
