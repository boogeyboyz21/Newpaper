import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import Layout from "../components/Layout";
import ArticleCard from "../components/ArticleCard";
import { UserCircle } from "lucide-react";

export default function Author() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/authors/${id}`).then(({ data }) => setData(data)).catch(() => {}); }, [id]);
  return (
    <Layout ticker={false}>
      <div className="py-10" data-testid="author-page">
        {!data ? <p className="text-ink-soft">Loading…</p> : (
          <>
            <div className="flex items-center gap-4 border-b-2 border-[var(--green-dark)] pb-5 mb-6">
              <span className="w-16 h-16 rounded-full bg-green text-white flex items-center justify-center"><UserCircle size={40} /></span>
              <div>
                <h1 className="font-serif-display font-black text-3xl">{data.name}</h1>
                <p className="cat-tag text-xs mt-1">{data.role} · {data.articles.length} stories</p>
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-x-8">
              {data.articles.map((a) => <ArticleCard key={a.id} article={a} />)}
              {data.articles.length === 0 && <p className="text-ink-soft">No published stories yet.</p>}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
