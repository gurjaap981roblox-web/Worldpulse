export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: 'v2.4.0',
    date: '2026-10-12',
    title: 'Black & Purple Glow Redesign, Landing Page, Trust Signals & Accessibility Suite',
    highlights: [
      'Added interactive "/" Landing Page with rotating 3D-style glowing globe, live Supabase telemetry counters, Top 3 dispatches, 8+ feature cards, multilingual showcase, FAQ accordion, and "/app" History API routing.',
      'Added Legal & Trust Center (#privacy, #terms, #ai-disclaimer, #cookies, #methodology, #accessibility, #responsible-ai, #contact, #about, #changelog) with DPDP Act & GDPR coverage and a non-tracking Cookie Consent Banner.',
      'Added Accessibility & Lite Mode controls in Settings: font scaling (Small to Extra Large), High-Contrast mode, Atkinson Hyperlegible dyslexia-friendly font, Reduce Motion, Simple-Language AI mode, and Low-Bandwidth Lite Mode.',
      'Upgraded Browser Audio Briefing with play/pause/stop, 0.75x–1.5x speed control, and language-aware voice picker (en-IN, hi-IN, pa-IN) on the Daily Briefing and Top 10 stories.',
      'Added boolean/phrase Search & Filter Bar with date range, source, status, saved localStorage presets, and "Did you mean" suggestions.',
      'Added Trust Signals on every story card: source-type badges (Wire, Broadcaster, Newspaper, Government/Sensor), 5-dot source diversity meter, side-by-side "Sources differ" contradiction detector, and prefilled "Report an issue" mailto links.',
    ],
  },
  {
    version: 'v2.1.0',
    date: '2026-10-11',
    title: 'Live Pulse 16-Card Telemetry Deck & Server-Side AI Protection',
    highlights: [
      'Added Live Pulse section below the World Map reading strictly from Supabase (stories, snapshots, briefings) with 24h counters, hotspots, slow-scrolling ticker, sentiment bar, activity wave, topic donut, and map style switcher.',
      'Protected all /api/ai/* routes with per-IP rate limiting (20 requests/hour), 1,000-character input caps, and a 300-call daily global budget.',
    ],
  },
  {
    version: 'v1.8.0',
    date: '2026-10-10',
    title: 'Supabase Primary Data Engine, Domain Tabs, Accounts & Multilingual Support',
    highlights: [
      'Connected Supabase primary read pipeline for stories, snapshots, and briefings with automatic live wire fallback.',
      'Added India (with 1-tap Punjab filter), Cyber, Health (WHO), and Conflict tracker tabs.',
      'Added English, Hindi (हिन्दी), and Punjabi (ਪੰਜਾਬੀ) language switcher, Story Timeline modal, Country Comparison tool, Share Story Image Card, and Supabase Auth + RLS SQL.',
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-10-08',
    title: 'Initial WorldPulse Global Situation Monitor Launch',
    highlights: [
      'Launched real-time global monitoring map, Top 10 dispatches, AI Executive Daily Briefing, 24h What Changed analysis, Sovereign FX & Macro panel, Disasters monitor, and Speech Archive.',
    ],
  },
];
