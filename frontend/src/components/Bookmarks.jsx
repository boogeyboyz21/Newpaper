import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import ArticleCard from "./ArticleCard";
import { Bookmark } from "lucide-react";

export default function Bookmarks() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/bookmarks").then(({ data }) => setItems(data)).catch(() => {}); }, []);
  return (
    <div className="widget" data-testid="bookmarks-widget">
      <div className="widget-title flex items-center gap-2"><Bookmark size={13} /> Saved Articles</div>
      <div className="p-4">
        {items.length === 0 ? (
          <p className="text-ink-soft text-sm">No bookmarks yet. Tap the bookmark icon on any article to save it here.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-6">
            {items.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}
