import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Overview from "./admin/Overview";
import ArticlesTab from "./admin/ArticlesTab";
import CommentsTab from "./admin/CommentsTab";
import StaffTab from "./admin/StaffTab";
import AuditTab from "./admin/AuditTab";
import PushTab from "./admin/PushTab";
import BillingTab from "./admin/BillingTab";
import SettingsTab from "./admin/SettingsTab";
import PagesTab from "./admin/PagesTab";
import AdsTab from "./admin/AdsTab";
import {
  LayoutDashboard, FileText, MessageSquare, Users, ScrollText, Bell, Receipt, Settings as SettingsIcon, FileEdit, Megaphone,
} from "lucide-react";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, roles: ["editor", "administrator"], C: Overview },
  { key: "articles", label: "Articles", icon: FileText, roles: ["reporter", "editor", "administrator"], C: ArticlesTab },
  { key: "comments", label: "Comments", icon: MessageSquare, roles: ["editor", "administrator"], C: CommentsTab },
  { key: "ads", label: "Advertising", icon: Megaphone, roles: ["administrator"], C: AdsTab },
  { key: "pages", label: "Pages", icon: FileEdit, roles: ["administrator"], C: PagesTab },
  { key: "billing", label: "Billing & GST", icon: Receipt, roles: ["administrator"], C: BillingTab },
  { key: "push", label: "Push", icon: Bell, roles: ["administrator"], C: PushTab },
  { key: "staff", label: "Staff", icon: Users, roles: ["administrator"], C: StaffTab },
  { key: "settings", label: "Settings", icon: SettingsIcon, roles: ["administrator"], C: SettingsTab },
  { key: "audit", label: "Audit Logs", icon: ScrollText, roles: ["administrator"], C: AuditTab },
];

export default function Admin() {
  const { user } = useAuth();
  const available = TABS.filter((t) => t.roles.includes(user.role));
  const [active, setActive] = useState(available[0]?.key);
  const ActiveTab = available.find((t) => t.key === active)?.C || (() => null);

  return (
    <Layout ticker={false}>
      <div className="py-8" data-testid="admin-dashboard">
        <div className="border-b-2 border-ink pb-4 mb-6">
          <span className="cat-tag text-xs">Newsroom · {user.role}</span>
          <h2 className="font-serif-display font-black text-4xl mt-1">Admin Dashboard</h2>
        </div>
        <div className="grid lg:grid-cols-12 gap-8">
          <nav className="lg:col-span-3">
            <ul className="border-2 border-ink surface divide-y divide-[var(--line)]">
              {available.map((t) => {
                const Icon = t.icon;
                return (
                  <li key={t.key}>
                    <button data-testid={`admin-tab-${t.key}`} onClick={() => setActive(t.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold uppercase tracking-wider ${active === t.key ? "bg-navy text-white" : "hover:bg-[var(--line)]/30"}`}>
                      <Icon size={16} /> {t.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="lg:col-span-9"><ActiveTab /></div>
        </div>
      </div>
    </Layout>
  );
}
