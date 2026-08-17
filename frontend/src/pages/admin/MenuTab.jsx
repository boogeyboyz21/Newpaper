import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Plus, Trash2, Link2, Menu } from "lucide-react";
import { toast } from "sonner";

export default function MenuTab() {
  const [social, setSocial] = useState([]);
  const [menu, setMenu] = useState([]);

  useEffect(() => {
    api.get("/admin/settings").then(({ data }) => {
      setSocial(data.social_links || []);
      setMenu(data.menu || []);
    }).catch(() => {});
  }, []);

  const save = async () => {
    try {
      await api.put("/admin/settings", { social_links: social, menu });
      toast.success("Menu & social links saved");
    } catch { toast.error("Save failed"); }
  };

  const cls = "card-2 pill px-3 py-2 text-sm bg-transparent outline-none text-ink";

  return (
    <div data-testid="admin-menu">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif-display text-3xl">Menu &amp; Social</h3>
        <button data-testid="save-menu-btn" onClick={save} className="btn-gold pill px-6 py-2.5 text-sm font-bold uppercase tracking-wider">Save</button>
      </div>

      {/* Social links */}
      <h4 className="font-body font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2"><Link2 size={15} /> Social Links</h4>
      <div className="space-y-2 mb-4">
        {social.map((s, i) => (
          <div key={i} className="flex gap-2" data-testid="social-row">
            <input placeholder="Label (e.g. Twitter)" value={s.label} onChange={(e) => setSocial(social.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className={cls + " w-40"} />
            <input placeholder="https://…" value={s.url} onChange={(e) => setSocial(social.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} className={cls + " flex-1"} />
            <button onClick={() => setSocial(social.filter((_, j) => j !== i))} className="text-crimson"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <button data-testid="add-social-btn" onClick={() => setSocial([...social, { label: "", url: "" }])} className="card-2 pill px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1 mb-8"><Plus size={13} /> Add Social Link</button>

      {/* Menu */}
      <h4 className="font-body font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2"><Menu size={15} /> Main Menu &amp; Sub-menus</h4>
      <p className="text-xs text-ink-soft mb-3">Path examples: <code>/category/global</code>, <code>/page/faq</code>, <code>/advertise</code></p>
      <div className="space-y-4">
        {menu.map((m, i) => (
          <div key={i} className="card p-4" data-testid="menu-row">
            <div className="flex gap-2">
              <input placeholder="Menu label" value={m.label} onChange={(e) => setMenu(menu.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className={cls + " w-48"} />
              <input placeholder="Path" value={m.path} onChange={(e) => setMenu(menu.map((x, j) => j === i ? { ...x, path: e.target.value } : x))} className={cls + " flex-1"} />
              <button onClick={() => setMenu(menu.filter((_, j) => j !== i))} className="text-crimson"><Trash2 size={16} /></button>
            </div>
            <div className="ml-6 mt-2 space-y-2">
              {(m.children || []).map((c, k) => (
                <div key={k} className="flex gap-2" data-testid="submenu-row">
                  <span className="text-ink-soft text-xs self-center">↳</span>
                  <input placeholder="Sub label" value={c.label} onChange={(e) => setMenu(menu.map((x, j) => j === i ? { ...x, children: x.children.map((y, z) => z === k ? { ...y, label: e.target.value } : y) } : x))} className={cls + " w-40"} />
                  <input placeholder="Sub path" value={c.path} onChange={(e) => setMenu(menu.map((x, j) => j === i ? { ...x, children: x.children.map((y, z) => z === k ? { ...y, path: e.target.value } : y) } : x))} className={cls + " flex-1"} />
                  <button onClick={() => setMenu(menu.map((x, j) => j === i ? { ...x, children: x.children.filter((_, z) => z !== k) } : x))} className="text-crimson"><Trash2 size={14} /></button>
                </div>
              ))}
              <button data-testid="add-sub-btn" onClick={() => setMenu(menu.map((x, j) => j === i ? { ...x, children: [...(x.children || []), { label: "", path: "" }] } : x))} className="text-xs text-green font-semibold flex items-center gap-1"><Plus size={12} /> Add sub-menu</button>
            </div>
          </div>
        ))}
      </div>
      <button data-testid="add-menu-btn" onClick={() => setMenu([...menu, { label: "", path: "", children: [] }])} className="card-2 pill px-3 py-1.5 mt-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Plus size={13} /> Add Menu Item</button>
    </div>
  );
}
