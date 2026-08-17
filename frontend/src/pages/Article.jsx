import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import Layout from "../components/Layout";
import Sidebar from "../components/Sidebar";
import Comments from "../components/Comments";
import Paywall from "../components/Paywall";
import ArticleCard, { timeAgo } from "../components/ArticleCard";
import { useAuth } from "../context/AuthContext";
import { recordRead, hasHitLimit, remainingFree } from "../lib/meter";
import { Clock, User } from "lucide-react";

export default function Article() {
  const { id } = useParams();
  const { user, isSubscribed } = useAuth();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/articles/${id}`).then(({ data }) => {
      setArticle(data);
      api.get(`/articles?category=${data.category}&limit=4`).then((r) =>
        setRelated(r.data.filter((a) => a.id !== data.id).slice(0, 3))
      );
      const subscribed = isSubscribed();
      if (data.is_premium && !subscribed) {
        if (hasHitLimit(data.id)) setLocked(true);
        else recordRead(data.id);
      }
    }).catch(() => {});
    // eslint-disable-next-line
  }, [id, user]);

  if (!article) return <Layout><div className="py-20 text-center text-ink-soft">Loading…</div></Layout>;

  const paras = Array.isArray(article.body) ? article.body : [article.body];

  return (
    <Layout ticker={false}>
      <div className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <article className="lg:col-span-8" data-testid="article-detail">
          <Link to={`/category/${article.category}`} className="cat-tag text-xs">{article.category}</Link>
          <h1 className="font-serif-display font-black text-3xl sm:text-5xl leading-tight mt-2">
            {article.title}
          </h1>
          {article.subtitle && <p className="font-serif-display italic text-xl text-ink-soft mt-3">{article.subtitle}</p>}
          <div className="flex items-center gap-4 mt-4 pb-4 border-b border-[var(--line)] text-sm text-ink-soft">
            <span className="flex items-center gap-1"><User size={14} /> {article.author_name}</span>
            <span className="flex items-center gap-1"><Clock size={14} /> {timeAgo(article.published_at)}</span>
            <span>{article.views} views</span>
          </div>

          <div className="img-zoom my-6 border border-[var(--line)]">
            <img src={article.image_url} alt={article.title} className="w-full object-cover" />
          </div>

          {!locked && !isSubscribed() && article.is_premium && (
            <div className="mb-4 text-xs uppercase tracking-wider text-navy border border-navy inline-block px-3 py-1" data-testid="meter-banner">
              {remainingFree()} free article{remainingFree() === 1 ? "" : "s"} left this month
            </div>
          )}

          <div className="relative">
            <div className={`font-body text-lg leading-relaxed space-y-5 text-ink ${locked ? "" : ""}`} data-testid="article-body">
              {paras.map((p, i) => (
                <p key={i} className={locked && i >= 2 ? "paywall-blur" : ""}>{p}</p>
              ))}
            </div>
            {locked && <Paywall />}
          </div>

          {!locked && <Comments articleId={article.id} />}
        </article>

        <div className="lg:col-span-4 space-y-8">
          <Sidebar />
          {related.length > 0 && (
            <div className="border-2 border-ink">
              <div className="bg-crimson text-white px-4 py-2 font-body font-bold uppercase tracking-widest text-xs">
                Related Stories
              </div>
              <div className="p-4 space-y-4" data-testid="related-stories">
                {related.map((a) => <ArticleCard key={a.id} article={a} variant="thumb" />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
