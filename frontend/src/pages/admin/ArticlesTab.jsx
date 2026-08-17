import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Plus, Edit, Trash2, Send, Upload, X } from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "../../components/RichTextEditor";

const CATS = ["global", "business", "tech", "lifestyle", "sports"];
const EMPTY = {
  title: "", subtitle: "", category: "global", excerpt: "", bodyHtml: "",
  image_url: "", tags: "", is_lead: false, is_breaking: false, is_premium: false,
};

const STATUS_STYLE = {
  draft: "text-ink-soft border-[var(--line)]",
  review: "text-amber-600 border-amber-600",
  published: "text-green-700 border-green-700",
};

export default function ArticlesTab() {
  const { user } = useAuth();
  const canPublish = ["editor", "administrator"].includes(user.role);
  const [articles, setArticles] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/staff/articles").then(({ data }) => setArticles(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => setEditing({ ...EMPTY });
  const openEdit = (a) =>
    setEditing({
      ...a,
      bodyHtml: Array.isArray(a.body) ? a.body.map((p) => `<p>${p}</p>`).join("") : (a.body || ""),
      tags: (a.tags || []).join(", "),
    });

  const save = async () => {
    const payload = {
      title: editing.title, subtitle: editing.subtitle, category: editing.category,
      excerpt: editing.excerpt, body: editing.bodyHtml,
      image_url: editing.image_url, tags: editing.tags.split(",").map((t) => t.trim()).filter(Boolean),
      is_lead: editing.is_lead, is_breaking: editing.is_breaking, is_premium: editing.is_premium,
    };
    try {
      if (editing.id) await api.put(`/staff/articles/${editing.id}`, payload);
      else await api.post("/staff/articles", payload);
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    }
  };

  const act = async (path, msg) => {
    try { await api.post(path); toast.success(msg); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Action failed"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this article?")) return;
    try { await api.delete(`/staff/articles/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Delete failed"); }
  };

  return (
    <div data-testid="admin-articles">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif-display text-3xl">Articles</h3>
        <button data-testid="new-article-btn" onClick={openNew}
          className="bg-navy text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
          <Plus size={14} /> New Article
        </button>
      </div>

      <div className="border-2 border-ink surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-ink-soft">
              <th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Author</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-b border-[var(--line)]" data-testid="admin-article-row">
                <td className="px-4 py-3 max-w-xs truncate font-medium">{a.title}</td>
                <td className="px-4 py-3"><span className="cat-tag text-[10px]">{a.category}</span></td>
                <td className="px-4 py-3 text-ink-soft">{a.author_name}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 ${STATUS_STYLE[a.status]}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button data-testid="edit-article-btn" onClick={() => openEdit(a)} className="text-navy hover:text-crimson"><Edit size={15} /></button>
                    {a.status !== "published" && !canPublish && (
                      <button data-testid="submit-review-btn" title="Submit for Review"
                        onClick={() => act(`/staff/articles/${a.id}/submit`, "Submitted for review")}
                        className="text-amber-600"><Send size={15} /></button>
                    )}
                    {canPublish && a.status !== "published" && (
                      <button data-testid="publish-btn" title="Publish Live"
                        onClick={() => act(`/staff/articles/${a.id}/publish`, "Published live")}
                        className="text-green-700"><Upload size={15} /></button>
                    )}
                    <button data-testid="delete-article-btn" onClick={() => del(a.id)} className="text-crimson"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {articles.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-soft">No articles yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex justify-end" onClick={() => setEditing(null)}>
          <div data-testid="article-editor" className="w-full max-w-xl surface h-full overflow-y-auto p-6 slide-down" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-serif-display text-2xl">{editing.id ? "Edit" : "New"} Article</h4>
              <button onClick={() => setEditing(null)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input data-testid="editor-title" placeholder="Headline" value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink font-serif-display text-lg" />
              <input placeholder="Subtitle" value={editing.subtitle}
                onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                className="w-full border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink" />
              <div className="grid grid-cols-2 gap-3">
                <select data-testid="editor-category" value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink">
                  {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input placeholder="Tags (comma separated)" value={editing.tags}
                  onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                  className="border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink" />
              </div>
              <input data-testid="editor-image" placeholder="Image URL" value={editing.image_url}
                onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                className="w-full border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink" />
              <textarea placeholder="Excerpt / summary" rows={2} value={editing.excerpt}
                onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                className="w-full border border-[var(--line)] px-3 py-2 bg-transparent outline-none text-ink" />
              <label className="text-xs text-ink-soft">Article body (rich text + inline images)</label>
              <RichTextEditor value={editing.bodyHtml} onChange={(html) => setEditing({ ...editing, bodyHtml: html })} />
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_lead} onChange={(e) => setEditing({ ...editing, is_lead: e.target.checked })} /> Lead story</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_breaking} onChange={(e) => setEditing({ ...editing, is_breaking: e.target.checked })} /> Breaking</label>
                <label className="flex items-center gap-2" data-testid="premium-checkbox"><input type="checkbox" checked={editing.is_premium} onChange={(e) => setEditing({ ...editing, is_premium: e.target.checked })} /> Subscribers only (premium)</label>
              </div>
              <button data-testid="save-article-btn" onClick={save}
                className="w-full bg-crimson text-white py-3 font-bold uppercase tracking-wider text-sm">
                Save {canPublish ? "" : "Draft"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
