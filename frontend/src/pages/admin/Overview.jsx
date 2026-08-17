import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { FileText, CheckCircle, Clock, MessageSquare, Users } from "lucide-react";

const CARDS = [
  { key: "published", label: "Published", icon: CheckCircle },
  { key: "drafts", label: "Drafts", icon: FileText },
  { key: "review", label: "In Review", icon: Clock },
  { key: "pending_comments", label: "Comments to Moderate", icon: MessageSquare },
  { key: "subscribers", label: "Subscribers", icon: Users },
  { key: "users", label: "Total Users", icon: Users },
];

export default function Overview() {
  const [stats, setStats] = useState({});
  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);
  return (
    <div data-testid="admin-overview">
      <h3 className="font-serif-display text-3xl mb-6">Newsroom Overview</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.key} className="border-2 border-ink surface p-5">
              <Icon size={22} className="text-navy" />
              <p className="font-serif-display text-4xl mt-3">{stats[c.key] ?? 0}</p>
              <p className="text-xs uppercase tracking-wider text-ink-soft mt-1">{c.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
