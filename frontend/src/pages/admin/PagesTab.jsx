import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import RichTextEditor from "../../components/RichTextEditor";
import { toast } from "sonner";
import { Mail } from "lucide-react";

const SLUGS = [
  { slug: "faq", label: "FAQ" },
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "terms", label: "Terms of Service" },
];

export default function PagesTab() {
  const [slug, setSlug] = useState("faq");
  const [page, setPage] = useState({ title: "", body: "" });
  const [contacts, setContacts] = useState([]);

  const load = (s) => api.get(`/pages/${s}`).then(({ data }) => setPage({ title: data.title, body: data.body })).catch(() => setPage({ title: SLUGS.find(x => x.slug === s)?.label || s, body: "" }));
  useEffect(() => { load(slug); }, [slug]);
  useEffect(() => { api.get("/admin/contacts").then(({ data }) => setContacts(data)).catch(() => {}); }, []);

  const save = async () => {
    try { await api.put(`/admin/pages/${slug}`, page); toast.success("Page saved"); }
    catch { toast.error("Save failed"); }
  };

  return (
    <div data-testid="admin-pages">
      <h3 className="font-serif-display text-3xl mb-6">Content Pages</h3>
      <div className="flex gap-2 mb-4">
        {SLUGS.map((s) => (
          <button key={s.slug} data-testid={`page-tab-${s.slug}`} onClick={() => setSlug(s.slug)}
            className={`pill px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${slug === s.slug ? "bg-green text-white" : "card-2"}`}>{s.label}</button>
        ))}
      </div>
      <input data-testid="page-title" value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value })}
        className="w-full card-2 pill px-4 py-2.5 mb-3 bg-transparent outline-none text-ink font-serif-display text-lg" />
      <RichTextEditor value={page.body} onChange={(html) => setPage({ ...page, body: html })} />
      <button data-testid="save-page-btn" onClick={save} className="btn-gold pill mt-4 px-6 py-2.5 text-sm font-bold uppercase tracking-wider">Save Page</button>

      <h4 className="font-body font-bold uppercase tracking-wider text-sm mt-10 mb-3 flex items-center gap-2"><Mail size={15} /> Contact Messages</h4>
      <div className="space-y-2" data-testid="contact-messages">
        {contacts.map((c) => (
          <div key={c.id} className="card p-3 text-sm">
            <p className="font-semibold">{c.name} <span className="text-ink-soft font-normal">· {c.email}</span></p>
            <p className="text-ink-soft mt-1">{c.message}</p>
          </div>
        ))}
        {contacts.length === 0 && <p className="text-ink-soft text-sm">No messages yet.</p>}
      </div>
    </div>
  );
}
