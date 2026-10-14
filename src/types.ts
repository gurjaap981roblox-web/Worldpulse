export type Topic =
  | 'Politics'
  | 'Conflict'
  | 'Economy'
  | 'Markets'
  | 'Tech'
  | 'Cyber'
  | 'Health'
  | 'Climate'
  | 'Disaster'
  | 'Science'
  | 'Sports'
  | 'Other';

export type AppLanguage = 'en' | 'hi' | 'pa';

export type DashboardTab =
  | 'overview'
  | 'countries'
  | 'india'
  | 'cyber'
  | 'health'
  | 'conflict'
  | 'myfeed'
  | 'saved';

export type MobileNavTab =
  | 'home'
  | 'map'
  | 'changes'
  | 'search'
  | 'saved'
  | 'briefing'
  | 'top10'
  | 'ask'
  | 'more';

export type FontSizeScale = 'small' | 'normal' | 'large' | 'xlarge';

export type LegalPageId =
  | 'privacy'
  | 'terms'
  | 'ai-disclaimer'
  | 'cookies'
  | 'methodology'
  | 'security'
  | 'accessibility'
  | 'responsible-ai'
  | 'contact'
  | 'about'
  | 'changelog';

export type SourceTypeBadge =
  | 'Wire'
  | 'Broadcaster'
  | 'Newspaper'
  | 'Government/Sensor'
  | 'Social/Other';

export type DateRangeFilter = '24h' | '7d' | '30d' | 'custom';

export type StoryStatusFilter = 'all' | 'confirmed' | 'developing';

export interface SavedFilterPreset {
  id: string;
  name: string;
  query: string;
  dateRange: DateRangeFilter;
  customStartDate?: string;
  customEndDate?: string;
  country: string;
  topic: 'All' | Topic;
  source: string;
  status: StoryStatusFilter;
  minImportance: number;
  createdAt: number;
}

export interface CookieConsentChoice {
  decided: boolean;
  necessary: boolean;
  preferences: boolean;
  updatedAt: number;
}

export type MapStyleMode = 'dark' | 'satellite' | 'heatmap';

export type LivePulseRegion =
  | 'Asia'
  | 'Europe'
  | 'Africa'
  | 'Americas'
  | 'Middle East'
  | 'Oceania';

export interface MapFocusTarget {
  lat: number;
  lng: number;
  zoom: number;
  label?: string;
  ts: number;
}

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
  publishedAt?: number;
  sources: StorySourceLink[];
  eventClusterKey: string;
  isDeveloping: boolean;
  aiAnalyzed: boolean;
  magnitude?: number;
  depthKm?: number;
  disasterCategory?: string;
  verificationNote?: string;
  groundedSources?: Array<{ title: string; url: string }>;
  status?: string;
  origin?: 'supabase' | 'fallback';
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
  | 'supabase'
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
  | 'reuters'
  | 'who'
  | 'cyber'
  | 'india';

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
  topCoinChanges?: Record<string, number>;
  sourceTimestamps?: Record<string, number>;
  takenAt?: number;
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

export interface SpeechSummaryResult {
  id: string;
  found: boolean;
  speechTitle: string;
  speaker: string;
  when: string;
  where: string;
  executiveSummary: string;
  keyTakeaways: string[];
  notableQuotes: string[];
  policyOrEconomicImpact: string;
  confidence: number;
  sources: Array<{ title: string; url: string }>;
  generatedAt: number;
}

export interface AppSettings {
  followedTopics: Topic[];
  followedRegions: WorldRegion[];
  followedCountries: string[]; // ISO-2 country codes followed by user
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
  language: AppLanguage;
  minImportance: number; // 1 to 10 ("show 7+ only")
  strictSupabaseOnly: boolean;
  fontSize?: FontSizeScale;
  highContrast?: boolean;
  dyslexiaFont?: boolean;
  reduceMotion?: boolean;
  simpleLanguage?: boolean;
  liteMode?: boolean;
}

export interface ExtraMarketAsset {
  id: string;
  symbol: string;
  name: string;
  category: 'Index' | 'Commodity' | 'FX';
  price: number | null;
  changePct: number | null;
  unit: string;
  asOf: string;
  url: string;
}

export interface SupabaseTableState {
  storiesCount: number;
  snapshotsCount: number;
  briefingsCount: number;
  storiesEmpty: boolean;
  snapshotsEmpty: boolean;
  briefingsEmpty: boolean;
  usingFallback: boolean;
  lastCheckedAt: number | null;
  latestDataTimestamp: number | null;
  acledConfigured: boolean;
  error?: string;
}

export interface CustomAlertRule {
  id: string;
  name: string;
  ruleType: 'story' | 'market';
  minImportance?: number;
  topic?: Topic | 'All';
  country?: string; // ISO-2 or 'ALL'
  assetSymbol?: string; // e.g. 'BTC', 'ETH', 'USD/INR', 'GOLD'
  movePctThreshold?: number; // e.g. 5 for 5%
  enabled: boolean;
  createdAt: number;
  lastTriggeredAt?: number;
}

export interface AskWorldCitation {
  storyId: string;
  headline: string;
  country: string;
  url: string;
  sourceName: string;
}

export interface AskWorldMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  notEnoughData?: boolean;
  citations?: AskWorldCitation[];
  createdAt: number;
}

export interface TranslatedStoryCacheEntry {
  storyId: string;
  lang: AppLanguage;
  headline: string;
  summary: string;
  translatedAt: number;
}

