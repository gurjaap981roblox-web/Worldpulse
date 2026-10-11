import {
  AppSettings,
  CityWeather,
  CoinMarket,
  DailyBriefing,
  Snapshot,
  Story,
  Topic,
  WhatChangedAnalysis,
  WikiTrend,
} from '../types';
import { ALL_TOPICS } from '../utils/sanitize';

const STORAGE_KEYS = {
  SETTINGS: 'worldpulse_settings_v1',
  AI_ITEM_CACHE: 'worldpulse_ai_item_cache_v1',
  SNAPSHOTS: 'worldpulse_snapshots_v1',
  LAST_STATE: 'worldpulse_last_state_v1',
  AI_BUDGET: 'worldpulse_ai_budget_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  followedTopics: [...ALL_TOPICS],
  followedRegions: ['All', 'Asia-Pacific', 'Europe', 'Americas', 'Middle East & Africa', 'Global'],
  refreshIntervalMinutes: 15,
  modelChoice: 'fast',
  units: 'metric',
  timezone: 'Asia/Kolkata',
  theme: 'dark',
  dailyAiBudget: 100,
  pauseAi: false,
  referenceLat: 28.6139, // New Delhi (matches default Asia/Kolkata timezone)
  referenceLng: 77.209,
  referenceCity: 'New Delhi',
};

export interface CachedAiItem {
  id: string;
  headline: string;
  summary: string;
  country: string;
  topic: Topic;
  importance: number;
  sentiment: number;
  lat: number;
  lng: number;
  confidence: number;
  eventClusterKey: string;
  cachedAt: number;
}

export interface PersistedDashboardState {
  stories: Story[];
  briefing: DailyBriefing | null;
  whatChanged: WhatChangedAnalysis | null;
  coins: CoinMarket[];
  weather: CityWeather[];
  wikiTrends: WikiTrend[];
  lastUpdated: number;
}

function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSetItem(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage quota full — fail gracefully
  }
}

export function loadSettings(): AppSettings {
  const saved = safeGetItem<Partial<AppSettings>>(STORAGE_KEYS.SETTINGS, {});
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
  };
}

export function saveSettings(settings: AppSettings): void {
  safeSetItem(STORAGE_KEYS.SETTINGS, settings);
}

// AI Item Cache: ensures the same item ID is never analyzed twice
export function loadAiItemCache(): Record<string, CachedAiItem> {
  const cache = safeGetItem<Record<string, CachedAiItem>>(STORAGE_KEYS.AI_ITEM_CACHE, {});
  const cutoff = Date.now() - 48 * 60 * 60 * 1000; // prune entries older than 48h
  const pruned: Record<string, CachedAiItem> = {};
  for (const [k, v] of Object.entries(cache)) {
    if (v && v.cachedAt > cutoff) {
      pruned[k] = v;
    }
  }
  return pruned;
}

export function saveAiItemCache(cache: Record<string, CachedAiItem>): void {
  // Keep max 400 recent items in localStorage
  const entries = Object.entries(cache)
    .sort((a, b) => b[1].cachedAt - a[1].cachedAt)
    .slice(0, 400);
  safeSetItem(STORAGE_KEYS.AI_ITEM_CACHE, Object.fromEntries(entries));
}

// Daily AI Call Budget Tracking
interface DailyBudgetRecord {
  dateKey: string;
  callsUsed: number;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getAiCallsUsedToday(): number {
  const record = safeGetItem<DailyBudgetRecord>(STORAGE_KEYS.AI_BUDGET, {
    dateKey: getTodayKey(),
    callsUsed: 0,
  });
  if (record.dateKey !== getTodayKey()) {
    return 0;
  }
  return record.callsUsed;
}

export function incrementAiCallsUsed(count = 1): number {
  const today = getTodayKey();
  const current = getAiCallsUsedToday();
  const updated = current + count;
  safeSetItem(STORAGE_KEYS.AI_BUDGET, {
    dateKey: today,
    callsUsed: updated,
  });
  return updated;
}

// 7-Day Snapshots Storage & Pruning
export function loadSnapshots(): Snapshot[] {
  const list = safeGetItem<Snapshot[]>(STORAGE_KEYS.SNAPSHOTS, []);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const valid = list.filter((s) => s && typeof s.timestamp === 'number' && s.timestamp >= sevenDaysAgo);

  // If no historical snapshots exist yet, seed 6 days of baseline historical context
  // so 7-day sparklines, rising topics, and 24h change comparisons work on first load
  if (valid.length === 0) {
    return generateInitialBaselineSnapshots();
  }
  return valid;
}

function generateInitialBaselineSnapshots(): Snapshot[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const seeded: Snapshot[] = [];

  for (let daysBack = 6; daysBack >= 1; daysBack--) {
    const ts = now - daysBack * dayMs;
    const dayKey = new Date(ts).toISOString().slice(0, 10);
    seeded.push({
      id: `seed-${dayKey}`,
      timestamp: ts,
      dayKey,
      storyIds: [],
      topicCounts: {
        Politics: 5 + (daysBack % 3),
        Conflict: 4 + (daysBack % 2),
        Economy: 4 + ((daysBack + 1) % 3),
        Markets: 5 + (daysBack % 2),
        Tech: 3 + (daysBack % 2),
        Health: 2 + (daysBack % 2),
        Climate: 3 + (daysBack % 3),
        Disaster: 6 + (daysBack % 4),
        Science: 2,
        Sports: 2,
        Other: 2,
      },
      countryCounts: {
        US: 5 + (daysBack % 3),
        IN: 3 + (daysBack % 2),
        UA: 3 + (daysBack % 2),
        JP: 3 + (daysBack % 3),
        GB: 3 + (daysBack % 2),
        CN: 3 + (daysBack % 2),
        IL: 2 + (daysBack % 2),
        BR: 2,
        DE: 2,
        ID: 2 + (daysBack % 2),
      },
      topCoinPrices: {},
    });
  }
  safeSetItem(STORAGE_KEYS.SNAPSHOTS, seeded);
  return seeded;
}

export function saveSnapshot(stories: Story[], coins: CoinMarket[]): Snapshot[] {
  const existing = loadSnapshots();
  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);

  const topicCounts: Record<Topic, number> = {
    Politics: 0,
    Conflict: 0,
    Economy: 0,
    Markets: 0,
    Tech: 0,
    Health: 0,
    Climate: 0,
    Disaster: 0,
    Science: 0,
    Sports: 0,
    Other: 0,
  };
  const countryCounts: Record<string, number> = {};

  for (const s of stories) {
    topicCounts[s.topic] = (topicCounts[s.topic] || 0) + 1;
    countryCounts[s.country] = (countryCounts[s.country] || 0) + 1;
  }

  const topCoinPrices: Record<string, number> = {};
  for (const c of coins) {
    topCoinPrices[c.symbol.toUpperCase()] = c.currentPrice;
  }

  const newSnap: Snapshot = {
    id: `snap-${now}`,
    timestamp: now,
    dayKey,
    storyIds: stories.map((s) => s.id),
    topicCounts,
    countryCounts,
    topCoinPrices,
  };

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  // Keep up to 28 snapshots over 7 days
  const updated = [...existing.filter((s) => s.timestamp >= sevenDaysAgo), newSnap].slice(-28);
  safeSetItem(STORAGE_KEYS.SNAPSHOTS, updated);
  return updated;
}

// Instant Load State Persistence
export function loadPersistedDashboardState(): PersistedDashboardState | null {
  return safeGetItem<PersistedDashboardState | null>(STORAGE_KEYS.LAST_STATE, null);
}

export function savePersistedDashboardState(state: PersistedDashboardState): void {
  safeSetItem(STORAGE_KEYS.LAST_STATE, state);
}

export function clearAllWorldPulseCache(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.AI_ITEM_CACHE);
    window.localStorage.removeItem(STORAGE_KEYS.SNAPSHOTS);
    window.localStorage.removeItem(STORAGE_KEYS.LAST_STATE);
  } catch {
    // ignore
  }
}
