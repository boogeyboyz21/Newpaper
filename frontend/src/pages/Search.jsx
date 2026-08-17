import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import Layout from "../components/Layout";
import Sidebar from "../components/Sidebar";
import ArticleCard from "../components/ArticleCard";

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    if (q) api.get(`/articles?search=${encodeURIComponent(q)}&limit=40`).then(({ data }) => setArticles(data)).catch(() => {});
  }, [q]);

  return (
    <Layout>
      <div className="py-8">
        <div className="border-b-2 border-ink pb-4 mb-6">
          <span className="cat-tag text-xs">Search Results</span>
          <h2 className="font-serif-display text-3xl mt-1" data-testid="search-title">"{q}"</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8" data-testid="search-results">
            {articles.length === 0 && <p className="text-ink-soft py-10">No results found.</p>}
            {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
          <div className="lg:col-span-4"><Sidebar /></div>
        </div>
      </div>
    </Layout>
  );
}
