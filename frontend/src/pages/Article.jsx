import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import Layout from "../components/Layout";
import Sidebar from "../components/Sidebar";
import Comments from "../components/Comments";
import Paywall from "../components/Paywall";
import ArticleCard, { timeAgo } from "../components/ArticleCard";
import { useAuth } from "../context/AuthContext";
import { Clock, User, Eye, Lock } from "lucide-react";

function BodyHtml({ body, className }) {
  if (Array.isArray(body)) {
    return (
      <div className={className}>
        {body.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    );
  }
  return <div className={className} dangerouslySetInnerHTML={{ __html: body || "" }} />;
}

export default function Article() {
  const { id } = useParams();
  const { user, isSubscribed } = useAuth();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/articles/${id}`).then(({ data }) => {
      setArticle(data);
      api.get(`/articles?category=${data.category}&limit=4`).then((r) =>
        setRelated(r.data.filter((a) => a.id !== data.id).slice(0, 3))
      );
    }).catch(() => {});
  }, [id, user]);

  if (!article) return <Layout><div className="py-20 text-center text-ink-soft">Loading…</div></Layout>;

  const locked = article.is_premium && !isSubscribed();

  return (
    <Layout ticker={false}>
      <div className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <article className="lg:col-span-8" data-testid="article-detail">
          <div className="flex items-center gap-2">
            <Link to={`/category/${article.category}`} className="tag text-[10px]">{article.category}</Link>
            {article.is_premium && (
              <span className="tag text-[10px] flex items-center gap-1" data-testid="premium-badge"><Lock size={10} /> Premium</span>
            )}
          </div>
          <h1 className="font-serif-display font-black text-3xl sm:text-5xl leading-tight mt-3">{article.title}</h1>
          {article.subtitle && <p className="font-serif-display italic text-xl text-ink-soft mt-3">{article.subtitle}</p>}
          <div className="flex items-center gap-4 mt-4 pb-4 border-b border-[var(--line)] text-sm text-ink-soft">
            <span className="flex items-center gap-1"><User size={14} /> {article.author_name}</span>
            <span className="flex items-center gap-1"><Clock size={14} /> {timeAgo(article.published_at)}</span>
            <span className="flex items-center gap-1"><Eye size={14} /> {article.views}</span>
          </div>

          <div className="img-zoom my-6 rounded-2xl overflow-hidden border border-[var(--line)]">
            <img src={article.image_url} alt={article.title} className="w-full object-cover" />
          </div>

          {locked ? (
            <div className="relative">
              <BodyHtml body={article.body} className="article-html max-h-72 overflow-hidden paywall-blur" />
              <Paywall />
            </div>
          ) : (
            <>
              <BodyHtml body={article.body} className="article-html" data-testid="article-body" />
              <Comments articleId={article.id} />
            </>
          )}
        </article>

        <div className="lg:col-span-4 space-y-8">
          <Sidebar />
          {related.length > 0 && (
            <div className="widget" data-testid="related-stories">
              <div className="widget-title">Related Stories</div>
              <div className="p-4 space-y-4">
                {related.map((a) => <ArticleCard key={a.id} article={a} variant="thumb" />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
