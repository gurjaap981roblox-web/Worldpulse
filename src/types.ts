export type Topic =
  | 'Politics'
  | 'Conflict'
  | 'Economy'
  | 'Markets'
  | 'Tech'
  | 'Health'
  | 'Climate'
  | 'Disaster'
  | 'Science'
  | 'Sports'
  | 'Other';

export type WorldRegion =
  | 'All'
  | 'Asia-Pacific'
  | 'Europe'
  | 'Americas'
  | 'Middle East & Africa'
  | 'Global';

export interface RawFeedItem {
  id: string;
  source: string;
  title: string;
  text: string;
  url: string;
  time: number;
  country: string;
  lat: number;
  lng: number;
  magnitude?: number;
  depthKm?: number;
  disasterCategory?: string;
}

export interface StorySourceLink {
  name: string;
  url: string;
  time: number;
}

export interface Story {
  id: string;
  headline: string;
  summary: string;
  country: string; // ISO-2 code or 'GL'
  countryName: string;
  region: WorldRegion;
  topic: Topic;
  importance: number; // 1 to 10
  sentiment: number; // -1 to 1
  lat: number;
  lng: number;
  confidence: number; // 0 to 1
  time: number;
  sources: StorySourceLink[];
  eventClusterKey: string;
  isDeveloping: boolean;
  aiAnalyzed: boolean;
  magnitude?: number;
  depthKm?: number;
  disasterCategory?: string;
  verificationNote?: string;
  groundedSources?: Array<{ title: string; url: string }>;
}

export interface DailyBriefing {
  headline: string;
  highlights: string[];
  paragraphs: string[];
  generatedAt: number;
  isAiGenerated: boolean;
  modelUsed?: string;
}

export interface ChangeEntry {
  title: string;
  detail: string;
  topic: Topic;
  country: string;
  deltaPct: number;
}

export interface WhatChangedAnalysis {
  summaryLine: string;
  newItems: ChangeEntry[];
  escalatingItems: ChangeEntry[];
  fadingItems: ChangeEntry[];
  unusualCountries: Array<{
    country: string;
    reason: string;
    deltaPct: number;
  }>;
  marketMoves: Array<{
    symbol: string;
    name: string;
    change24h: number;
    price: number;
  }>;
  generatedAt: number;
}

export interface RisingTopicMetric {
  topic: Topic;
  currentCount: number;
  sevenDayAvg: number;
  spikePct: number;
  sparkline: number[]; // 7 points
}

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  change24h: number;
  marketCap: number;
  sparkline: number[];
  url: string;
}

export interface FxRateShift {
  pair: string;
  symbol: string;
  currencyName: string;
  country: string;
  rate: number;
  change1dPct: number;
  change7dPct: number;
  sparkline: number[];
  asOf: string;
  url: string;
}

export interface MacroCountryIndicator {
  country: string;
  countryName: string;
  gdpGrowthPct: number | null;
  gdpDeltaPct: number | null;
  cpiInflationPct: number | null;
  cpiDeltaPct: number | null;
  period: string;
  url: string;
}

export interface CityWeather {
  city: string;
  country: string;
  lat: number;
  lng: number;
  tempC: number;
  windKmh: number;
  weatherCode: number;
  conditionLabel: string;
  isSevere: boolean;
  alertText?: string;
}

export interface WikiTrend {
  title: string;
  displayTitle: string;
  views: number;
  rank: number;
  url: string;
}

export type SourceId =
  | 'usgs'
  | 'eonet'
  | 'gdelt'
  | 'coingecko'
  | 'fx'
  | 'worldbank'
  | 'openmeteo'
  | 'wikipedia'
  | 'bbc'
  | 'aljazeera'
  | 'reuters';

export interface SourceStatus {
  id: SourceId;
  name: string;
  category: string;
  status: 'ok' | 'warning' | 'error' | 'loading';
  lastSuccess: number | null;
  itemCount: number;
  errorMessage?: string;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  dayKey: string; // YYYY-MM-DD
  storyIds: string[];
  topicCounts: Record<Topic, number>;
  countryCounts: Record<string, number>;
  topCoinPrices: Record<string, number>;
}

export interface CountryBrief {
  countryCode: string;
  countryName: string;
  headline: string;
  overview: string;
  keyPoints: string[];
  dominantTopics: string[];
  confidence: number;
  generatedAt: number;
}

export interface AppSettings {
  followedTopics: Topic[];
  followedRegions: WorldRegion[];
  refreshIntervalMinutes: number;
  modelChoice: 'fast' | 'quality';
  units: 'metric' | 'imperial';
  timezone: string; // defaults to 'Asia/Kolkata'
  theme: 'dark' | 'light';
  dailyAiBudget: number;
  pauseAi: boolean;
  referenceLat: number;
  referenceLng: number;
  referenceCity: string;
}
