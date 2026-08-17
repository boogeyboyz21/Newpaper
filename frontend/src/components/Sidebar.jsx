import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import WeatherWidget from "./WeatherWidget";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { toast } from "sonner";
import { timeAgo } from "./ArticleCard";
import { Facebook, Twitter, Instagram, Youtube, Linkedin, Send, ArrowUpRight } from "lucide-react";

export function AdSlot({ variant = "cream", height = "h-56", size = "300x250" }) {
  const [ad, setAd] = useState(null);
  const [adsense, setAdsense] = useState("");
  useEffect(() => {
    api.get(`/ads/active?size=${size}`).then(({ data }) => {
      if (data.ad) setAd(data.ad);
      else api.get("/settings").then(({ data: s }) => setAdsense(s.adsense_client || "")).catch(() => {});
    }).catch(() => {});
  }, [size]);
  useEffect(() => {
    if (adsense && !document.getElementById("adsense-js")) {
      const sc = document.createElement("script");
      sc.id = "adsense-js"; sc.async = true; sc.crossOrigin = "anonymous";
      sc.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`;
      document.head.appendChild(sc);
    }
    if (adsense) { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {} }
  }, [adsense]);
  if (ad) {
    return (
      <a href={ad.target_url} target="_blank" rel="noopener noreferrer" data-testid="ad-slot-live" className={`block card overflow-hidden ${height}`}>
        <img src={ad.image_url} alt="Advertisement" className="w-full h-full object-cover" />
      </a>
    );
  }
  if (adsense) {
    return (
      <div data-testid="ad-slot-adsense" className={`card overflow-hidden ${height}`}>
        <ins className="adsbygoogle" style={{ display: "block", width: "100%", height: "100%" }}
          data-ad-client={adsense} data-ad-format="auto" data-full-width-responsive="true" />
      </div>
    );
  }
  return (
    <div data-testid="ad-slot" className={`ad-box ${variant === "blue" ? "ad-box-blue" : ""} ${height}`}>
      <span className="text-[10px] uppercase tracking-widest">Advertisement</span>
      <span className="font-serif-display text-2xl mt-1">Advertise Here</span>
    </div>
  );
}

function PopularList({ items, testid }) {
  return (
    <ul data-testid={testid} className="divide-y divide-[var(--line)]">
      {items.map((a) => (
        <li key={a.id} className="p-3">
          <Link to={`/news/${a.id}`} className="flex gap-3 group">
            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 img-zoom">
              <img src={a.image_url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug line-clamp-2 headline-link">{a.title}</p>
              <p className="text-[11px] text-ink-soft mt-1">{a.author_name} · {timeAgo(a.published_at)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const SOCIALS = [
  { Icon: Facebook, label: "Facebook" }, { Icon: Twitter, label: "Twitter" },
  { Icon: Instagram, label: "Instagram" }, { Icon: Youtube, label: "YouTube" },
  { Icon: Linkedin, label: "LinkedIn" }, { Icon: Send, label: "Telegram" },
];

const TAGS = ["Politics", "Economy", "Elections", "Climate", "Markets", "Startups", "AI", "Space", "Health", "Travel", "Football", "Culture"];

function Poll() {
  const OPTS = ["Global", "Business", "Tech", "Lifestyle", "Sports"];
  const [choice, setChoice] = useState(null);
  const [voted, setVoted] = useState(false);
  const results = { Global: 34, Business: 22, Tech: 25, Lifestyle: 9, Sports: 10 };
  return (
    <div className="widget" data-testid="poll-widget">
      <div className="widget-title">Reader Poll</div>
      <div className="p-4">
        <p className="text-sm font-semibold mb-3">Which section do you read most?</p>
        {OPTS.map((o) => (
          <label key={o} className="flex items-center justify-between text-sm py-1.5 cursor-pointer">
            <span className="flex items-center gap-2">
              <input type="radio" name="poll" checked={choice === o} onChange={() => setChoice(o)} data-testid={`poll-${o}`} />
              {o}
            </span>
            {voted && <span className="text-green font-semibold">{results[o]}%</span>}
          </label>
        ))}
        <div className="flex gap-2 mt-3">
          <button data-testid="poll-vote" onClick={() => choice && setVoted(true)} className="pill bg-green text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Vote</button>
          <button data-testid="poll-results" onClick={() => setVoted(true)} className="pill card-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Results</button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [trending, setTrending] = useState([]);
  const [mostRead, setMostRead] = useState([]);
  const [recommended, setRecommended] = useState([]);

  useEffect(() => {
    api.get("/articles/trending").then(({ data }) => setTrending(data.slice(0, 5))).catch(() => {});
    api.get("/articles/most-read").then(({ data }) => setMostRead(data.slice(0, 5))).catch(() => {});
    api.get("/articles?limit=4").then(({ data }) => setRecommended(data.slice(0, 4))).catch(() => {});
  }, []);

  return (
    <aside className="space-y-6 lg:sticky lg:top-40 self-start" data-testid="sidebar">
      <AdSlot variant="cream" height="h-40" />
      <WeatherWidget />

      <div className="widget">
        <div className="p-0">
          <Tabs defaultValue="trending">
            <TabsList className="w-full grid grid-cols-2 rounded-none bg-[var(--surface-2)] border-b border-[var(--line)] p-0 h-auto">
              <TabsTrigger value="trending" data-testid="tab-trending" className="rounded-none py-2.5 data-[state=active]:bg-[var(--green)] data-[state=active]:text-white text-xs uppercase tracking-wider">Popular Posts</TabsTrigger>
              <TabsTrigger value="mostread" data-testid="tab-mostread" className="rounded-none py-2.5 data-[state=active]:bg-[var(--green)] data-[state=active]:text-white text-xs uppercase tracking-wider">Most Read</TabsTrigger>
            </TabsList>
            <TabsContent value="trending" className="mt-0"><PopularList items={trending} testid="trending-list" /></TabsContent>
            <TabsContent value="mostread" className="mt-0"><PopularList items={mostRead} testid="mostread-list" /></TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="widget" data-testid="follow-us">
        <div className="widget-title">Follow Us</div>
        <div className="p-3 grid grid-cols-2 gap-2">
          {SOCIALS.map(({ Icon, label }) => (
            <button key={label} className="flex items-center gap-2 card-2 pill px-3 py-2 text-xs font-semibold hover:bg-green hover:text-white" style={{ transitionProperty: "background-color, color" }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {recommended.length > 0 && (
        <div className="widget" data-testid="recommended-posts">
          <div className="widget-title">Recommended</div>
          <Link to={`/news/${recommended[0].id}`} className="block img-zoom relative">
            <div className="aspect-[16/9] overflow-hidden">
              <img src={recommended[0].image_url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
              <span className="tag text-[9px]">{recommended[0].category}</span>
              <p className="text-white text-sm font-serif-display leading-snug mt-1 line-clamp-2">{recommended[0].title}</p>
            </div>
          </Link>
          <PopularList items={recommended.slice(1)} testid="recommended-list" />
        </div>
      )}

      <div className="widget" data-testid="popular-tags">
        <div className="widget-title">Popular Tags</div>
        <div className="p-3 flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <span key={t} className="card-2 pill px-3 py-1 text-xs hover:bg-green hover:text-white cursor-pointer" style={{ transitionProperty: "background-color, color" }}>{t}</span>
          ))}
        </div>
      </div>

      <Poll />
      <AdSlot variant="blue" height="h-56" />
    </aside>
  );
}
