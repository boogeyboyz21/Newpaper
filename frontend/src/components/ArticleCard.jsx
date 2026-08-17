import React from "react";
import { Link } from "react-router-dom";
import { Clock, MessageSquare, Eye, ArrowUpRight, Bookmark } from "lucide-react";
import { useBookmarks } from "../context/BookmarkContext";

function BookmarkBtn({ id, corner }) {
  const bm = useBookmarks();
  const saved = bm?.has(id);
  return (
    <button data-testid="card-bookmark-btn"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); bm?.toggle(id); }}
      title={saved ? "Saved" : "Save for later"}
      className={`${corner ? "absolute top-2 right-2 z-10" : ""} w-8 h-8 rounded-full flex items-center justify-center border ${saved ? "bg-green text-white border-green" : "surface border-[var(--line)] text-ink-soft"} hover:border-green`}>
      <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

export function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ArticleCard({ article, variant = "row" }) {
  if (variant === "thumb") {
    return (
      <Link to={`/news/${article.id}`} data-testid="article-card-thumb" className="group block card overflow-hidden img-zoom relative">
        <BookmarkBtn id={article.id} corner />
        <div className="aspect-[16/10] overflow-hidden">
          <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" />
        </div>
        <div className="p-3">
          <span className="tag text-[9px]">{article.category}</span>
          <h4 className="font-serif-display text-sm leading-snug mt-2 line-clamp-2 headline-link">{article.title}</h4>
          <span className="inline-flex items-center gap-1 text-[11px] text-green font-semibold mt-2">
            See Details <ArrowUpRight size={12} />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <article data-testid="article-card-row" className="card p-3 sm:p-4 flex gap-4 mb-4">
      <Link to={`/news/${article.id}`} className="shrink-0 img-zoom rounded-xl overflow-hidden w-28 sm:w-48">
        <div className="aspect-[4/3] overflow-hidden rounded-xl">
          <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" />
        </div>
      </Link>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <span className="tag text-[9px] self-start">{article.category}</span>
          <BookmarkBtn id={article.id} />
        </div>
        <Link to={`/news/${article.id}`}>
          <h3 className="font-serif-display font-bold text-lg sm:text-xl leading-snug mt-2 headline-link line-clamp-2">{article.title}</h3>
        </Link>
        <p className="text-sm text-ink-soft mt-1 line-clamp-2 hidden sm:block">{article.excerpt}</p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex items-center gap-3 text-[11px] text-ink-soft">
            {article.author_id
              ? <Link to={`/author/${article.author_id}`} className="font-semibold text-green hover:underline" data-testid="byline-link">{article.author_name}</Link>
              : <span className="font-semibold text-green">{article.author_name}</span>}
            <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(article.published_at)}</span>
            <span className="flex items-center gap-1"><Eye size={11} /> {article.views}</span>
          </div>
          <Link to={`/news/${article.id}`} className="arrow-btn shrink-0" data-testid="card-details-btn" aria-label="Read more">
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
