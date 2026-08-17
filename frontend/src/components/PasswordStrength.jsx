import React from "react";

export function scorePassword(pw) {
  let s = 0;
  if (!pw) return 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}
const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["#C62828", "#EF6C00", "#F9A825", "#2F8241", "#1B5E2A"];

export default function PasswordStrength({ password }) {
  const s = scorePassword(password);
  if (!password) return null;
  return (
    <div data-testid="pw-strength" className="mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: i < s ? COLORS[s] : "var(--line)" }} />
        ))}
      </div>
      <p className="text-[11px] mt-1" style={{ color: COLORS[s] }}>{LABELS[s]}</p>
    </div>
  );
}
