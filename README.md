# FitMirror — AI Virtual Try-On Studio ✨

> Open the mirror. Hold up a dress. See it on you, live.

FitMirror is an AI-powered virtual try-on web app. Point your camera at any
outfit (or upload a photo), and get a **natural-looking preview of you wearing
it** — plus an instant **AI Style Report** (fit, size, color harmony, styling
tips) and a personal **Wardrobe** to save your favorite looks.

Built as a production-ready Next.js 16 app with an **Admin control panel** for
analytics, users, payments and API provider settings.

---

## ✨ Features

### For users
- **Magic Mirror** — camera-first live try-on. Auto-detects you and the outfit
  (no uploads, no forms). 2-second countdown snap + VLM verification.
- **AI Style Report** — fit score, size recommendation, color-harmony score,
  occasion tags, flattering notes and styling tips on every try-on.
- **Discover** — curated garment gallery (one-tap load into the mirror).
- **Wardrobe** — save looks you love with notes.
- **History** — every try-on this session, privately.
- **Quick Try / Surprise me / Try another outfit** — fast re-tries without
  re-doing your photo.
- **No sign-up** — anonymous browser session. Private by default.

### For admins
- **Password-gated Admin console** (default password: `fitmirror2024`).
- **Dashboard** — total users / try-ons / revenue, 14-day trend chart,
  plan-distribution donut, top garments, recent users.
- **Users** — full table with inline plan upgrades (Free / Pro / Premium).
- **Payments** — record (mock) payments that auto-upgrade a user's plan.
- **API & Settings** — toggle AI providers (VLM / image-gen / LLM), edit model
  names, add custom API keys, change the admin password.

---

## 🧱 Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router) + TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Fonts | Fraunces (display) + Plus Jakarta Sans (body) |
| Motion | Framer Motion |
| Database | Prisma ORM + SQLite |
| Server state | TanStack Query |
| Client state | Zustand |
| Charts | Recharts |
| Auth | Anonymous cookie session + httpOnly admin cookie |
| AI | `z-ai-web-dev-sdk` (VLM × 2 + LLM + image generation) |

---

## 🚀 Getting started

```bash
# install
bun install

# set up the database
bun run db:push

# start the dev server (port 3000)
bun run dev
```

Open <http://localhost:3000>.

### Admin access
Open the **Admin** tab → password `fitmirror2024`. Change it immediately from
**Admin → API & Settings → Admin password**.

---

## 🧠 How the try-on pipeline works

A **VLM-guided generation pipeline** (cost-effective — no heavy GPU try-on
model required):

1. **Vision model** analyzes your photo → body type, pose, skin tone, hair,
   build, face.
2. **Vision model** analyzes the garment → type, color, pattern, fabric,
   neckline, length, fit, formality, occasions.
3. **LLM** reasons a `StyleReport` (fit score, size, color harmony, styling
   tips) from both.
4. **Image generation** renders a photorealistic, identity-aware full-body
   preview (768×1344).

A `/api/detect` endpoint uses the vision model to verify each captured frame
("I can see you!" / "Got it — I can see your outfit!") for the live Magic
Mirror experience.

---

## 💸 Pricing model

| Plan | Price | Try-ons/day |
|---|---|---|
| Free | $0 | 3 |
| Pro | $9.99/mo | 50 |
| Premium | $19.99/mo | unlimited |

Per-try-on cost ≈ $0.04–0.06 at scale. Break-even at ~3% free → paid
conversion.

---

## 🔌 API endpoints

### User
- `POST /api/tryon` — generate a try-on
- `GET /api/usage` — daily quota
- `GET/POST/DELETE /api/wardrobe` — saved looks
- `GET /api/history` — recent try-ons
- `GET /api/discover` — curated garments
- `POST /api/detect` — VLM frame verification

### Admin (protected)
- `POST /api/admin/auth` · `POST /api/admin/logout` · `GET /api/admin/session`
- `GET /api/admin/analytics` · `GET /api/admin/users` · `POST /api/admin/upgrade`
- `GET /api/admin/payments` · `POST /api/admin/payment`
- `GET/PUT /api/admin/settings`

---

## 📁 Project structure

```
prisma/schema.prisma          # Session, TryOn, WardrobeItem, UsageLog, AdminSetting, Payment
src/lib/                      # db, session, usage, images, ai-tryon, admin, store, types
src/app/api/                  # tryon, usage, wardrobe, history, discover, detect, admin/*
src/app/page.tsx              # single-route app (tabs: mirror/discover/wardrobe/history/upload/admin)
src/components/fitmirror/     # magic-mirror, studio, report-card, admin-panel, hero, etc.
public/discover/              # 8 curated garment photos
```

---

## 🔒 Notes

- Try-on previews are **AI-rendered approximations**. Always verify fit &
  fabric in person before purchasing.
- The SQLite DB and `.env` are gitignored — not committed.
- Default admin password should be changed before any real deployment.

---

Built with ❤️ using Next.js & Z.ai.
