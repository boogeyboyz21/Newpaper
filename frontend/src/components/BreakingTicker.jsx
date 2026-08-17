import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function BreakingTicker() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/articles/breaking").then(({ data }) => setItems(data)).catch(() => {});
  }, []);
  if (!items.length) return null;
  const loop = [...items, ...items];
  return (
    <div data-testid="breaking-ticker" className="card overflow-hidden flex items-stretch">
      <div className="bg-green text-white font-bold uppercase tracking-widest text-[11px] px-4 flex items-center shrink-0 rounded-l-2xl z-10">
        Breaking News
      </div>
      <div className="overflow-hidden flex-1 flex items-center">
        <div className="ticker-track">
          {loop.map((it, i) => (
            <Link key={i} to={`/news/${it.id}`} data-testid="ticker-item" className="text-sm px-6 py-2 hover:text-green">
              <span className="text-green-dark font-bold uppercase text-[10px] mr-2">{it.category}</span>
              {it.title}
              <span className="mx-3 text-green">•</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
