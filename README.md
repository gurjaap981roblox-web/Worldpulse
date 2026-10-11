# WorldPulse — Live World-Monitoring Dashboard

WorldPulse is a tablet-first, installable Progressive Web App (PWA) and live global situation room that aggregates real-time data from public sources, uses Gemini AI via a secure server-side proxy to normalize, deduplicate, tag, score, and compare global developments, and presents them on a single interactive dashboard.

## Architecture & File Structure

```text
/
├── server.ts                      # Express backend: Gemini AI proxy, rate limiter & RSS proxy
├── vite.config.ts                 # Vite + Tailwind v4 + VitePWA service worker & manifest config
├── src/
│   ├── types.ts                   # Shared TypeScript interfaces
│   ├── hooks/
│   │   └── usePWAInstall.ts       # PWA installation & offline detection hooks
│   ├── utils/
│   │   └── sanitize.ts            # XSS sanitizer, Jaccard deduplicator, 45+ country gazetteer
│   ├── services/
│   │   ├── sources.ts             # Live fetchers for USGS, EONET, GDELT, CoinGecko, Open-Meteo, Wiki, RSS
│   │   ├── llm.ts                 # Gemini AI pipeline wrapper, batching, caching & search grounding
│   │   └── storage.ts             # Safe localStorage cache, 7-day snapshots & daily AI budget store
│   ├── components/
│   │   ├── TopBar.tsx             # Header with LIVE status, countdown, refresh, PWA install & theme toggle
│   │   ├── HeroBriefing.tsx       # AI Daily Briefing card (headline, 5 highlights, 200-word expander)
│   │   ├── WorldMapPanel.tsx      # Interactive Leaflet map, topic filter chips & swipeable bottom sheet
│   │   ├── TopTenList.tsx         # "Top 10 Right Now" ranked list with importance bars & source links
│   │   ├── DisastersPanel.tsx     # USGS Earthquakes, NASA EONET natural events & Open-Meteo alerts
│   │   ├── WhatChangedPanel.tsx   # 24h change analysis (New, Escalating, Fading, unusual countries)
│   │   ├── RisingTopicsStrip.tsx  # 7-day topic spike percentages with SVG sparklines
│   │   ├── MarketsTicker.tsx      # CoinGecko Top 10 ticker & Wikipedia Most Viewed strip
│   │   ├── CountryModal.tsx       # Per-country intelligence view with 7-day chart & AI Country Brief
│   │   └── SettingsModal.tsx      # Settings, daily AI budget, Pause AI switch & source health monitor
│   └── styles/
│       └── theme.css              # Command-center typography, marker pulse animations & print styles
```

## Setup Steps & Secrets

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure Secrets**:
   - In Google AI Studio, open **Settings > Secrets** (or create a `.env` file locally based on `.env.example`) and set:
     - `GEMINI_API_KEY`: Your Gemini API key.
   - The key is read strictly on the server (`server.ts`) via `process.env.GEMINI_API_KEY` and is never exposed to the browser.
3. **Run in Development**:
   ```bash
   npm run dev
   ```
   Opens the full-stack Express + Vite server on `http://localhost:3000`.

## Deployment (Cloud Run / Production)

1. **Build the frontend bundle & PWA service worker**:
   ```bash
   npm run build
   ```
2. **Start the production server**:
   ```bash
   NODE_ENV=production npm start
   ```
   The Express server serves the compiled `dist/` assets on port `3000` and handles `/api/ai/*` and `/api/proxy/*` routes.
