import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Layout from "../components/Layout";
import Sidebar from "../components/Sidebar";
import BreakingTicker from "../components/BreakingTicker";
import ArticleCard, { timeAgo } from "../components/ArticleCard";
import { AdSlot } from "../components/Sidebar";
import { Clock, Eye, ArrowUpRight } from "lucide-react";

export default function Home() {
  const [articles, setArticles] = useState([]);
  const [lead, setLead] = useState(null);

  useEffect(() => {
    api.get("/articles?limit=40").then(({ data }) => {
      const leadArticle = data.find((a) => a.is_lead) || data[0];
      setLead(leadArticle);
      setArticles(data.filter((a) => a.id !== leadArticle?.id));
    }).catch(() => {});
  }, []);

  const thumbs = articles.slice(0, 4);
  const feed = articles.slice(4);

  return (
    <Layout ticker={false}>
      {/* Hero */}
      {lead && (
        <section className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 fade-up" data-testid="hero-section">
          <Link to={`/news/${lead.id}`} className="lg:col-span-8 relative rounded-2xl overflow-hidden img-zoom group border border-[var(--line)]">
            <div className="aspect-[16/9] lg:aspect-[16/10] overflow-hidden">
              <img src={lead.image_url} alt={lead.title} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.1) 70%, transparent)" }}>
              <span className="tag text-[10px]">{lead.category}</span>
              <h2 className="font-serif-display font-black text-white text-2xl sm:text-4xl leading-tight mt-3 max-w-2xl">{lead.title}</h2>
              <p className="text-white/80 text-sm mt-2 max-w-xl line-clamp-2 hidden sm:block">{lead.excerpt}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-white/80">
                <span className="pill bg-green px-3 py-1 font-semibold text-white">By {lead.author_name}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(lead.published_at)}</span>
                <span className="flex items-center gap-1"><Eye size={12} /> {lead.views}</span>
              </div>
            </div>
          </Link>
          <div className="lg:col-span-4 grid grid-cols-2 gap-4 content-start">
            {thumbs.map((a) => <ArticleCard key={a.id} article={a} variant="thumb" />)}
          </div>
        </section>
      )}

      {/* Breaking + Advertise strip */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8"><BreakingTicker /></div>
        <div className="lg:col-span-4 ad-box h-full min-h-[52px] py-2"><span className="font-serif-display text-lg">Advertise Here</span></div>
      </div>

      {/* Feed + Sidebar */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-4">
        <div className="lg:col-span-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="tag text-[10px]">Latest Posts</span>
            <span className="h-px flex-1 bg-[var(--line)]" />
          </div>
          <div data-testid="article-feed">
            {feed.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </div>
        <div className="lg:col-span-4"><Sidebar /></div>
      </div>
    </Layout>
  );
}
