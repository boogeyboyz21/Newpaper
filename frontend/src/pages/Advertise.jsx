import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Layout from "../components/Layout";
import { Megaphone } from "lucide-react";

export default function Advertise() {
  const [plans, setPlans] = useState([]);
  useEffect(() => { api.get("/ads/plans").then(({ data }) => setPlans(data)).catch(() => {}); }, []);
  return (
    <Layout ticker={false}>
      <div className="py-12 max-w-4xl mx-auto" data-testid="advertise-page">
        <div className="text-center">
          <span className="tag text-[10px] inline-flex items-center gap-1"><Megaphone size={12} /> Advertise</span>
          <h1 className="font-serif-display font-black text-4xl mt-3">Reach engaged readers</h1>
          <p className="text-ink-soft mt-2 text-sm">Promote your brand across The Editorial Wire. Choose a banner plan, upload your creative, and go live after approval.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {plans.map((p) => (
            <div key={p.id} className="card p-6" data-testid="advertise-plan">
              <h3 className="font-serif-display text-2xl">{p.label}</h3>
              <p className="text-ink-soft text-sm mt-1">Banner size {p.size}</p>
              <p className="font-serif-display text-4xl mt-3">₹{p.price}</p>
              <p className="text-xs text-ink-soft">for {p.impressions.toLocaleString()} impressions</p>
              <Link to="/account" className="btn-gold pill block text-center mt-5 py-2.5 font-bold uppercase tracking-wider text-sm">Purchase in Dashboard</Link>
            </div>
          ))}
          {plans.length === 0 && <p className="text-ink-soft">No ad plans available right now.</p>}
        </div>
      </div>
    </Layout>
  );
}
