import React from "react";
import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";
import Layout from "../components/Layout";

export default function Forbidden() {
  return (
    <Layout ticker={false}>
      <div className="py-24 text-center" data-testid="forbidden-page">
        <ShieldX size={56} className="mx-auto text-crimson" />
        <h1 className="font-serif-display text-6xl mt-4">403</h1>
        <p className="text-lg text-ink-soft mt-2">Access denied. You don't have permission to view this area.</p>
        <Link to="/" className="inline-block mt-6 bg-navy text-white px-6 py-3 font-bold uppercase tracking-wider text-sm">
          Return Home
        </Link>
      </div>
    </Layout>
  );
}
