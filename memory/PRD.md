# The Editorial Wire — PRD

## Original Problem Statement
Production-ready full-stack English newspaper website (broadsheet, NO cryptocurrency). Multi-column grid, dark mode, breaking ticker, categories, real-time threaded comments + moderation, sidebar weather+AQI, emergency alert banner, GA4/privacy analytics toggle, metered paywall + Razorpay India subscriptions with 18% GST invoices (PDF + email), subscriber dashboard, web push, multi-role RBAC (Administrator/Editor/Reporter), audit logs. Later refined to a soft mint-green newspaper template style (rounded cards, pill tags, ad slots, floating pill sticky nav) with Abel body font and a deep-yellow (goldenrod) accent alongside green; admin panel to hold API keys (OpenWeather, Razorpay, GA).

## Architecture
- Backend: FastAPI (modular: auth_routes, content_routes incl. WebSocket comments, weather_routes, payments_routes, admin_routes, push_routes, seed, invoice, database, auth_utils). MongoDB via motor. JWT (bcrypt) auth with Bearer token + cookie. All routes under /api.
- Frontend: React + react-router + Tailwind + shadcn/ui. Context: Auth, Theme(dark). Pages: Home, Category, Article, Search, Login, Register, Plans, Account, Admin(+tabs), Forbidden. Sticky pill Header, Sidebar widgets, Comments (WS), WeatherWidget, EmergencyBanner, PushPrompt, Paywall.
- Fonts: Playfair Display (headlines), Abel (body). Palette: mint-green surfaces, deep goldenrod (--gold-deep) accents on utility bar/tags/section headers, gold gradient buttons, green primary.

## User Personas
- Reader/guest (metered 3 free/month), Subscriber (paid unlimited), Reporter, Editor, Administrator.

## Core Requirements (static)
- News grid + categories (global/business/tech/lifestyle/sports), /news/:id, real-time threaded comments w/ upvote + profanity/spam moderation, weather+AQI (Open-Meteo default, OpenWeather when key set), emergency banner (AQI>150/severe), paywall + Razorpay INR subscriptions (mock until keys added), 18% GST (WB: CGST+SGST; else IGST) PDF invoices, /account dashboard, web push (VAPID), RBAC admin, audit logs, analytics toggle.

## Implemented (2026-08-17)
- Full backend + frontend built; JWT auth with 4 seeded accounts; 18 seeded articles across categories.
- Green-template redesign of landing + shared components; floating pill sticky nav; Abel font; deep-yellow accents.
- Admin Settings tab storing OpenWeather / Razorpay / GA keys (backend uses them at runtime; falls back to env/mock).
- Verified: 45/45 backend pytest pass; frontend E2E flows pass (home, dark mode, weather/AQI/forecast, categories, article, paywall, mock checkout→account+invoice PDF, RBAC 403, comments live, admin push).
- Payments in MOCK mode (no Razorpay keys). Invoice email delivery MOCKED (logged). Web push delivery sends to stored subscriptions (0 in test).

## Backlog / Remaining
- P1: Enter real Razorpay keys via admin Settings to enable live checkout + webhook; add real Resend/SMTP for invoice email.
- P2: Restyle inner pages (Login/Plans/Account/Admin) fully to green-gold theme; recurring subscription mandates (Razorpay Subscriptions API) for true auto-renew; richer article editor (rich text/media upload).
- P2: Word-boundary profanity done; consider configurable filter list in Settings.
