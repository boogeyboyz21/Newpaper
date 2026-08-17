import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { UserPlus, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["reporter", "editor", "administrator", "subscriber"];

export default function StaffTab() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "reporter" });
  const load = () => api.get("/admin/users").then(({ data }) => setUsers(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try { await api.post("/admin/users", form); toast.success("Staff created"); setForm({ name: "", email: "", password: "", role: "reporter" }); load(); }
    catch (er) { toast.error(er.response?.data?.detail || "Failed"); }
  };
  const changeRole = async (id, role) => {
    try { await api.patch(`/admin/users/${id}/role`, { role }); toast.success("Role updated"); load(); }
    catch { toast.error("Failed"); }
  };
  const del = async (id) => {
    if (!window.confirm("Delete user?")) return;
    try { await api.delete(`/admin/users/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };
  const setPassword = async (id, name) => {
    const pw = window.prompt(`Set a new password for ${name} (min 6 chars):`);
    if (!pw) return;
    try { await api.patch(`/admin/users/${id}/password`, { password: pw }); toast.success("Password updated"); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div data-testid="admin-staff">
      <h3 className="font-serif-display text-3xl mb-6">Staff & Permissions</h3>

      <form onSubmit={create} className="border-2 border-ink surface p-4 mb-6 grid sm:grid-cols-5 gap-3">
        <input data-testid="staff-name" required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink text-sm" />
        <input data-testid="staff-email" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink text-sm" />
        <input data-testid="staff-password" required placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink text-sm" />
        <select data-testid="staff-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink text-sm">
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button data-testid="create-staff-btn" className="bg-navy text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1"><UserPlus size={14} /> Add</button>
      </form>

      <div className="border-2 border-ink surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-ink-soft">
              <th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--line)]" data-testid="staff-row">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} data-testid="role-select"
                    className="border border-[var(--line)] px-2 py-1 bg-transparent outline-none text-ink text-xs">
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button data-testid="set-password-btn" title="Set password" onClick={() => setPassword(u.id, u.name)} className="text-green"><KeyRound size={15} /></button>
                    <button data-testid="delete-staff-btn" onClick={() => del(u.id)} className="text-crimson"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
