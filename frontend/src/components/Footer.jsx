import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Newspaper, Mail, Twitter, Facebook, Instagram, Youtube, Linkedin, Send, Globe } from "lucide-react";

const socialIcon = (label = "") => {
  const l = label.toLowerCase();
  if (l.includes("twitter") || l === "x") return Twitter;
  if (l.includes("facebook")) return Facebook;
  if (l.includes("instagram")) return Instagram;
  if (l.includes("youtube")) return Youtube;
  if (l.includes("linkedin")) return Linkedin;
  if (l.includes("telegram")) return Send;
  return Globe;
};

export default function Footer() {
  const [email, setEmail] = useState("");
  const [social, setSocial] = useState([]);
  const year = new Date().getFullYear();

  useEffect(() => {
    api.get("/settings").then(({ data }) => setSocial((data.social_links || []).filter((s) => s && s.url))).catch(() => {});
  }, []);

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
          <div className="flex items-center gap-3">
            {social.length > 0 && (
              <div className="flex items-center gap-2" data-testid="footer-social">
                {social.map((s, i) => {
                  const Icon = socialIcon(s.label);
                  return (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title={s.label}
                      data-testid={`footer-social-${i}`}
                      className="w-8 h-8 rounded-full card-2 flex items-center justify-center hover:text-green">
                      <Icon size={15} />
                    </a>
                  );
                })}
              </div>
            )}
            <span className="card-2 pill px-3 py-1.5 text-[11px]">▶ Google Play</span>
            <span className="card-2 pill px-3 py-1.5 text-[11px]"> App Store</span>
          </div>
        </div>
        <p className="text-center text-xs text-ink-soft pb-5">© {year} The Editorial Wire Media Pvt. Ltd. · All rights reserved.</p>
      </div>
    </footer>
  );
}
