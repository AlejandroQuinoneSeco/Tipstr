# ⚽ Tipstr — World Cup 2026 Prediction App

A full-stack real-time football prediction app built for the FIFA World Cup 2026. Users predict match scores, Spain-specific stats, and FIFA awards across all 104 matches and compete on a live leaderboard.

**[🚀 Live Demo](https://tipstr.vercel.app)**

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend / Auth | Supabase (PostgreSQL + Auth + Realtime) |
| State Management | Zustand + TanStack Query |
| Deployment | Vercel |
| External API | football-data.org |

---

## ✨ Features

- **Real-time leaderboard** — Points update instantly as results come in via Supabase Realtime
- **Automatic result sync** — Next.js API route polls football-data.org every 5 minutes and writes to Supabase
- **Role-based access** — Admin approval flow for new users, admin panel for managing rounds and squads
- **Progressive round unlock** — Admin opens each knockout round when teams are known
- **Prediction locking** — Once saved, predictions are locked; users can only view others' picks after locking their own
- **Spain special section** — Top scorers, group classification, red cards, total goals
- **FIFA Awards** — Ballon d'Or, Golden Boot, Golden Glove, Best Young Player and more
- **Scalable scoring** — Higher points for harder-to-predict rounds (3pts groups → 10pts final)
- **Row Level Security** — All Supabase tables protected with RLS policies

## 🗄️ Database Schema

```
profiles          — User accounts with roles and lock states
matches           — All 104 official FIFA 2026 matches
results           — Match scores (manual or API-synced)
predictions       — User score predictions per match
award_predictions — User predictions for FIFA awards
award_results     — Official award results (admin)
spain_predictions — Spain-specific predictions
spain_results     — Official Spain results (admin)
open_phases       — Controls which knockout rounds are open
spain_squad       — Editable Spain squad for autocomplete
```

## 🏗️ Project Structure

```
src/
├── app/
│   ├── (auth)/login/     # Authentication page
│   ├── (app)/            # Protected app routes
│   │   ├── partidos/     # Match predictions
│   │   ├── grupos/       # Group standings
│   │   ├── espana/       # Spain-specific predictions
│   │   ├── premios/      # FIFA award predictions
│   │   ├── ver/          # View others' predictions
│   │   ├── ranking/      # Live leaderboard
│   │   └── admin/        # Admin panel
│   └── api/sync-results/ # API route for football-data.org proxy
├── components/
│   ├── ui/               # Reusable UI components (Flag, inputs)
│   ├── matches/          # Match card and list components
│   ├── ranking/          # Leaderboard table
│   ├── admin/            # Admin panel components
│   └── layout/           # AppShell with navigation
├── lib/
│   ├── supabase/         # Client and server Supabase instances
│   ├── scoring/          # Pure scoring functions
│   └── data/             # Match data and constants
├── store/                # Zustand auth store
└── types/                # TypeScript interfaces
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [football-data.org](https://football-data.org) free API token

### Setup

```bash
# Clone
git clone https://github.com/AlejandroQuinoneSeco/tipstr
cd tipstr

# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Fill in your Supabase URL, anon key, and football-data token

# Run database migrations
# Copy contents of supabase/migrations/001_initial_schema.sql
# and run in Supabase SQL Editor

# Run matches seeder (see below)
# Start dev server
npm run dev
```

### Seed matches

After running the migration, seed the 104 official matches by running the seed script in Supabase SQL Editor or via the admin panel.

## 📊 Scoring System

| Event | Points |
|-------|--------|
| Exact score (groups) | 3 pts |
| Correct winner (groups) | 1 pt |
| Exact score (Round of 32 / Last 16) | 5 pts |
| Correct winner (Round of 32 / Last 16) | 2 pts |
| Exact score (Quarter-finals) | 6 pts |
| Correct winner (Quarter-finals) | 3 pts |
| Exact score (Semi-finals) | 8 pts |
| Correct winner (Semi-finals) | 4 pts |
| Exact score (Final) | 10 pts |
| Correct winner (Final) | 5 pts |
| FIFA Champion | 12 pts |
| Ballon d'Or / Golden Boot | 10 pts each |
| Golden Glove / Best Young / Best Coach | 8 pts each |
| Spain top scorer | 10 pts |

## 📝 License

MIT — feel free to fork and adapt for your own tournament predictions.

---

Built by [Alejandro Quiñones Seco](https://linkedin.com/in/alejandro-quinones-seco)
