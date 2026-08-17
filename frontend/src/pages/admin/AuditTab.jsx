import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function AuditTab() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/admin/audit-logs").then(({ data }) => setLogs(data)).catch(() => {}); }, []);
  return (
    <div data-testid="admin-audit">
      <h3 className="font-serif-display text-3xl mb-2">Audit Logs</h3>
      <p className="text-sm text-ink-soft mb-6">Immutable, read-only record of all staff actions.</p>
      <div className="border-2 border-ink surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-ink-soft">
              <th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Action</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-[var(--line)]" data-testid="audit-row">
                <td className="px-4 py-3 text-xs text-ink-soft whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">{l.admin_email}</td>
                <td className="px-4 py-3"><span className="cat-tag text-[10px]">{l.staff_role}</span></td>
                <td className="px-4 py-3 text-xs font-semibold">{l.action_type}</td>
                <td className="px-4 py-3 text-xs font-mono text-ink-soft">{l.target_article_id || "—"}</td>
                <td className="px-4 py-3 text-xs font-mono text-ink-soft">{l.client_ip}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">No activity recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
