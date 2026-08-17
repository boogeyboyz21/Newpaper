import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Eye, EyeOff, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

const STYLE = {
  approved: "text-green-700 border-green-700",
  hidden: "text-crimson border-crimson",
  pending: "text-amber-600 border-amber-600",
};

export default function CommentsTab() {
  const [comments, setComments] = useState([]);
  const load = () => api.get("/admin/comments").then(({ data }) => setComments(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    try { await api.patch(`/admin/comments/${id}`, { status }); toast.success(`Comment ${status}`); load(); }
    catch { toast.error("Failed"); }
  };
  const del = async (id) => {
    if (!window.confirm("Delete comment?")) return;
    try { await api.delete(`/admin/comments/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Failed"); }
  };

  return (
    <div data-testid="admin-comments">
      <h3 className="font-serif-display text-3xl mb-6">Comments Moderation</h3>
      <p className="text-sm text-ink-soft mb-4">Automated profanity/spam filters flag comments as <em>hidden</em> or <em>pending</em>. Review below.</p>
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="border-2 border-ink surface p-4" data-testid="moderation-row">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{c.author_name}</span>
                {c.is_guest && <span className="text-[10px] uppercase border border-[var(--line)] px-1">Guest</span>}
                <span className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 ${STYLE[c.status]}`}>{c.status}</span>
                {c.flag_reason && <span className="text-[10px] uppercase text-crimson">⚑ {c.flag_reason}</span>}
              </div>
              <div className="flex items-center gap-3">
                <button data-testid="approve-comment-btn" title="Approve" onClick={() => setStatus(c.id, "approved")} className="text-green-700"><Check size={16} /></button>
                <button data-testid="hide-comment-btn" title="Hide" onClick={() => setStatus(c.id, "hidden")} className="text-amber-600"><EyeOff size={16} /></button>
                <button data-testid="delete-comment-btn" title="Delete" onClick={() => del(c.id)} className="text-crimson"><Trash2 size={16} /></button>
              </div>
            </div>
            <p className="text-sm mt-2 text-ink">{c.body}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-ink-soft">No comments yet.</p>}
      </div>
    </div>
  );
}
