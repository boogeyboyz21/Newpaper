import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import Layout from "../components/Layout";
import Sidebar from "../components/Sidebar";
import ArticleCard from "../components/ArticleCard";

const LABELS = { global: "Global", business: "Business", tech: "Tech", lifestyle: "Lifestyle", sports: "Sports" };
const DESC = {
  global: "Politics & World News",
  business: "Markets & Economy",
  tech: "Science & Innovation",
  lifestyle: "Culture, Food & Travel",
  sports: "Scores, Analysis & Stories",
};

export default function Category() {
  const { slug } = useParams();
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    api.get(`/articles?category=${slug}&limit=40`).then(({ data }) => setArticles(data)).catch(() => {});
  }, [slug]);

  return (
    <Layout>
      <div className="py-8">
        <div className="text-center border-b-2 border-ink pb-4 mb-6">
          <span className="cat-tag text-xs">{DESC[slug]}</span>
          <h2 className="font-serif-display font-black text-4xl sm:text-5xl mt-1" data-testid="category-title">
            {LABELS[slug] || slug}
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8" data-testid="category-feed">
            {articles.length === 0 && <p className="text-ink-soft py-10">No stories in this section yet.</p>}
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
          <div className="lg:col-span-4"><Sidebar /></div>
        </div>
      </div>
    </Layout>
  );
}
