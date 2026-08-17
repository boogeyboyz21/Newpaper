import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Moon, Sun, Search, User, Menu, X, LogOut, LayoutDashboard, Newspaper, Lock, ChevronDown, Home as HomeIcon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const CATEGORIES = [
  { slug: "global", label: "Global" },
  { slug: "business", label: "Business" },
  { slug: "tech", label: "Tech" },
  { slug: "lifestyle", label: "Lifestyle" },
  { slug: "sports", label: "Sports" },
];
const STAFF = ["reporter", "editor", "administrator"];
const TOP_LINKS = [
  { label: "FAQ", to: "/page/faq" },
  { label: "Privacy Policy", to: "/page/privacy" },
  { label: "Terms", to: "/page/terms" },
  { label: "Advertise", to: "/advertise" },
  { label: "Contact Us", to: "/contact" },
];

const DEFAULT_MENU = [
  { label: "Home", path: "/", children: [] },
  ...CATEGORIES.map((c) => ({ label: c.label, path: `/category/${c.slug}`, children: [] })),
];

export default function Header() {
  const { dark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [customMenu, setCustomMenu] = useState([]);
  const [openIdx, setOpenIdx] = useState(null);       // desktop dropdown
  const [mobileIdx, setMobileIdx] = useState(null);   // mobile expanded item
  const navRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 130);
    window.addEventListener("scroll", onScroll);
    api.get("/settings").then(({ data }) => setCustomMenu(data.menu || [])).catch(() => {});
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOpenIdx(null); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });

  const doSearch = (e) => {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const menuItems = (customMenu && customMenu.length ? customMenu : DEFAULT_MENU)
    .filter((m) => m && m.label);

  const isHome = (m) => m.path === "/" || (m.label || "").trim().toLowerCase() === "home";

  const closeMobile = () => { setMenuOpen(false); setMobileIdx(null); };

  return (
    <header className="sticky top-0 z-50" style={{ backgroundColor: "var(--paper)" }}>
      {/* utility bar */}
      <div className={`bg-gold-gradient ${scrolled ? "hidden" : ""}`} style={{ color: "var(--gold-ink)", borderBottom: "2px solid var(--green-dark)" }}>
        <div className="max-w-7xl mx-auto px-4 h-9 flex items-center justify-between text-[11px]">
          <ul className="hidden sm:flex items-center gap-4">
            {TOP_LINKS.map((l) => <li key={l.label}><Link to={l.to} className="hover:opacity-80">{l.label}</Link></li>)}
          </ul>
          <div className="flex items-center gap-3">
            <span data-testid="header-date">{today}</span>
            <button data-testid="dark-mode-toggle" onClick={toggle} className="flex items-center gap-1 hover:opacity-80">
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* logo + advertise banner */}
      <div className={`max-w-7xl mx-auto px-4 py-4 flex items-center gap-6 ${scrolled ? "hidden" : ""}`}>
        <Link to="/" data-testid="masthead-logo" className="flex items-center gap-2 shrink-0">
          <span className="w-11 h-11 rounded-full bg-green flex items-center justify-center text-white"><Newspaper size={22} /></span>
          <div className="leading-none">
            <h1 className="font-serif-display font-black text-2xl sm:text-3xl text-ink">The Editorial Wire</h1>
            <p className="text-[10px] uppercase tracking-[0.28em] text-ink-soft mt-1">Independent Journalism</p>
          </div>
        </Link>
        <div className="ad-box hidden md:flex flex-1 h-20">
          <span className="text-[10px] uppercase tracking-widest">Advertisement</span>
          <span className="font-serif-display text-xl">Advertise Here</span>
        </div>
      </div>

      {/* floating pill nav */}
      <div className={`max-w-7xl mx-auto px-4 ${scrolled ? "py-2" : "pb-3"}`}>
        <nav ref={navRef} className="nav-pill px-3 sm:px-4 py-2 flex items-center justify-between gap-3" data-testid="sticky-nav">
          <button className="md:hidden" onClick={() => setMenuOpen((m) => !m)} data-testid="mobile-menu-toggle">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <ul className="hidden md:flex items-center">
            {menuItems.map((c, i) => {
              const kids = (c.children || []).filter((k) => k && k.label);
              const testSlug = (c.path || c.label).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
              return (
                <li key={i} className="flex items-center relative">
                  {i > 0 && <span className="nav-divider px-1">|</span>}
                  {kids.length ? (
                    <>
                      <button data-testid={`nav-menu-${testSlug}`} onClick={() => setOpenIdx(openIdx === i ? null : i)}
                        className="flex items-center gap-1 px-2 py-1 text-[15px] font-semibold uppercase tracking-wide hover:text-green"
                        style={{ transitionProperty: "color" }}>
                        {c.label} <ChevronDown size={14} className={`transition-transform ${openIdx === i ? "rotate-180" : ""}`} style={{ transitionProperty: "transform" }} />
                      </button>
                      {openIdx === i && (
                        <ul className="absolute top-full left-0 mt-2 min-w-[180px] card shadow-lg py-1.5 z-50" data-testid={`nav-dropdown-${testSlug}`}>
                          {c.path && (
                            <li><Link to={c.path} onClick={() => setOpenIdx(null)} className="block px-4 py-2 text-sm font-semibold hover:text-green hover:bg-[var(--surface-2)]">{c.label}</Link></li>
                          )}
                          {kids.map((k, j) => (
                            <li key={j}><Link to={k.path || "#"} onClick={() => setOpenIdx(null)} className="block px-4 py-2 text-sm hover:text-green hover:bg-[var(--surface-2)]">{k.label}</Link></li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link to={c.path || "/"} data-testid={`nav-menu-${testSlug}`}
                      className="flex items-center gap-1 px-2 py-1 text-[15px] font-semibold uppercase tracking-wide hover:text-green"
                      style={{ transitionProperty: "color" }}>
                      {isHome(c) && <HomeIcon size={16} />} {c.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            {showSearch ? (
              <form onSubmit={doSearch} className="flex items-center card-2 pill overflow-hidden">
                <input autoFocus data-testid="header-search-input" value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…" className="px-3 py-1.5 text-sm bg-transparent outline-none w-28 sm:w-40 text-ink" />
                <button type="submit" data-testid="header-search-btn" className="bg-green text-white px-3 py-1.5 rounded-full m-0.5"><Search size={14} /></button>
              </form>
            ) : (
              <button data-testid="search-toggle" onClick={() => setShowSearch(true)} className="p-1.5 hover:text-green" aria-label="Search"><Search size={19} /></button>
            )}
            {user && user !== false ? (
              <>
                {STAFF.includes(user.role) && (
                  <Link data-testid="nav-admin" to="/admin" className="btn-gold pill px-3 py-1.5 text-xs uppercase tracking-wider flex items-center gap-1">
                    <LayoutDashboard size={13} /> <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                )}
                <Link data-testid="nav-account" to="/account" className="btn-gold pill px-3 py-1.5 text-xs uppercase tracking-wider flex items-center gap-1">
                  <User size={13} /> <span className="hidden sm:inline">{user.name?.split(" ")[0]}</span>
                </Link>
                <button data-testid="nav-logout" onClick={logout} className="pill px-2 py-1.5 text-ink-soft hover:text-[var(--alert)]"><LogOut size={15} /></button>
              </>
            ) : (
              <>
                <Link data-testid="nav-login" to="/login" className="btn-gold pill px-4 py-1.5 text-xs uppercase tracking-wider flex items-center gap-1.5"><Lock size={12} /> Login</Link>
                <Link data-testid="nav-subscribe" to="/register" className="btn-gold pill px-4 py-1.5 text-xs uppercase tracking-wider flex items-center gap-1.5"><User size={12} /> Register</Link>
              </>
            )}
          </div>
        </nav>

        {menuOpen && (
          <ul className="md:hidden nav-pill mt-2 px-4 py-2 space-y-1" data-testid="mobile-menu">
            {menuItems.map((c, i) => {
              const kids = (c.children || []).filter((k) => k && k.label);
              return (
                <li key={i}>
                  {kids.length ? (
                    <>
                      <button onClick={() => setMobileIdx(mobileIdx === i ? null : i)} data-testid={`mobile-menu-item-${i}`}
                        className="w-full flex items-center justify-between py-2 font-semibold uppercase text-sm">
                        {c.label} <ChevronDown size={15} className={mobileIdx === i ? "rotate-180" : ""} style={{ transitionProperty: "transform" }} />
                      </button>
                      {mobileIdx === i && (
                        <ul className="pl-3 pb-1 space-y-1">
                          {c.path && <li><Link to={c.path} onClick={closeMobile} className="block py-1.5 text-sm">{c.label}</Link></li>}
                          {kids.map((k, j) => (
                            <li key={j}><Link to={k.path || "#"} onClick={closeMobile} className="block py-1.5 text-sm text-ink-soft">↳ {k.label}</Link></li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link to={c.path || "/"} onClick={closeMobile} className="flex items-center gap-2 py-2 font-semibold uppercase text-sm" data-testid={`mobile-menu-item-${i}`}>{isHome(c) && <HomeIcon size={15} />} {c.label}</Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </header>
  );
}
