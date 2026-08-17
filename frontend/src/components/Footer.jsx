import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Newspaper, Mail } from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const year = new Date().getFullYear();

  const subscribe = async (e) => {
    e.preventDefault();
    try {
      await api.post("/newsletter", { email });
      toast.success("Subscribed to the newsletter");
      setEmail("");
    } catch {
      toast.error("Subscription failed");
    }
  };

  return (
    <footer className="mt-14">
      {/* Newsletter band */}
      <div className="surface-2 border-y border-[var(--line)]" data-testid="newsletter-band">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <span className="inline-flex items-center gap-2 tag text-[10px]"><Mail size={12} /> Newsletter</span>
          <h3 className="font-serif-display font-black text-3xl sm:text-4xl mt-3">Subscribe to our Newsletter</h3>
          <p className="text-sm text-ink-soft mt-2">
            Join thousands of readers. Get the day's essential stories, analysis and briefings delivered to your inbox every morning.
          </p>
          <form onSubmit={subscribe} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input data-testid="footer-newsletter-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
              placeholder="Enter your email address" className="flex-1 card-2 pill px-4 py-2.5 text-sm bg-transparent outline-none text-ink" />
            <button data-testid="footer-newsletter-btn" className="pill bg-green text-white px-6 py-2.5 text-sm font-bold uppercase tracking-wider">Subscribe</button>
          </form>
        </div>
      </div>

      {/* Ad grid */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`ad-box h-24 ${i % 2 ? "ad-box-blue" : ""}`}>
            <span className="text-[10px] uppercase tracking-widest">Advertisement</span>
            <span className="font-serif-display text-lg">Advertise Here</span>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="surface border-t border-[var(--line)]">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-green flex items-center justify-center text-white"><Newspaper size={18} /></span>
            <span className="font-serif-display font-black text-xl">The Editorial Wire</span>
          </Link>
          <ul className="flex flex-wrap items-center gap-4 text-xs text-ink-soft">
            {[["FAQ", "/page/faq"], ["Privacy Policy", "/page/privacy"], ["Terms", "/page/terms"], ["Advertise", "/advertise"], ["Contact Us", "/contact"]].map(([l, to]) => (
              <li key={l}><Link to={to} className="hover:text-green">{l}</Link></li>
            ))}
          </ul>
          <div className="flex gap-2">
            <span className="card-2 pill px-3 py-1.5 text-[11px]">▶ Google Play</span>
            <span className="card-2 pill px-3 py-1.5 text-[11px]"> App Store</span>
          </div>
        </div>
        <p className="text-center text-xs text-ink-soft pb-5">© {year} The Editorial Wire Media Pvt. Ltd. · All rights reserved.</p>
      </div>
    </footer>
  );
}
