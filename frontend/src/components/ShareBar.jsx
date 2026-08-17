import React from "react";
import { Facebook, Linkedin, Send, Link2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const XIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
  </svg>
);

export default function ShareBar({ url, title }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { Icon: XIcon, label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { Icon: Facebook, label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { Icon: Linkedin, label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { Icon: MessageCircle, label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { Icon: Send, label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
  ];
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    catch { toast.error("Copy failed"); }
  };
  return (
    <div className="flex items-center gap-2" data-testid="share-bar">
      <span className="text-xs uppercase tracking-wider text-ink-soft mr-1">Share</span>
      {links.map(({ Icon, label, href }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" data-testid={`share-${label}`}
          title={`Share on ${label}`} className="arrow-btn" style={{ width: 34, height: 34 }}>
          <Icon size={15} />
        </a>
      ))}
      <button onClick={copy} data-testid="share-copy" title="Copy link" className="arrow-btn" style={{ width: 34, height: 34 }}>
        <Link2 size={15} />
      </button>
    </div>
  );
}
