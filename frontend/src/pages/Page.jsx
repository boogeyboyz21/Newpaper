import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import Layout from "../components/Layout";

export default function Page() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    setPage(null); setErr(false);
    api.get(`/pages/${slug}`).then(({ data }) => setPage(data)).catch(() => setErr(true));
  }, [slug]);
  return (
    <Layout ticker={false}>
      <div className="py-10 max-w-3xl mx-auto" data-testid="cms-page">
        {err ? <p className="text-ink-soft">Page not found.</p> : !page ? <p className="text-ink-soft">Loading…</p> : (
          <>
            <h1 className="font-serif-display font-black text-4xl mb-6 border-b-2 border-[var(--green-dark)] pb-3">{page.title}</h1>
            <div className="article-html" dangerouslySetInnerHTML={{ __html: page.body }} />
          </>
        )}
      </div>
    </Layout>
  );
}
