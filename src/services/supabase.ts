import { createClient, Session, User } from '@supabase/supabase-js';
import {
  CoinMarket,
  CustomAlertRule,
  DailyBriefing,
  Snapshot,
  Story,
  StorySourceLink,
  SupabaseTableState,
  Topic,
} from '../types';
import {
  ALL_TOPICS,
  getCountryMeta,
  inferCountryFromCoords,
  sanitizeText,
  sanitizeUrl,
} from '../utils/sanitize';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://vtmqvzokyrdbkeszziuh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_oJf-t5OEoh0H9-fwprRVoA_J9gjRFSW';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    },
  }
);

function parseValidTopic(raw: unknown): Topic {
  const str = sanitizeText(raw, 40);
  if (ALL_TOPICS.includes(str as Topic)) {
    return str as Topic;
  }
  const match = ALL_TOPICS.find((t) => t.toLowerCase() === str.toLowerCase());
  return match || 'Other';
}

function parseSupabaseSources(rawSources: unknown, fallbackTime: number): StorySourceLink[] {
  let list: unknown[] = [];
  if (Array.isArray(rawSources)) {
    list = rawSources;
  } else if (typeof rawSources === 'string') {
    try {
      const parsed = JSON.parse(rawSources);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      // ignore invalid json
    }
  }

  const sanitized: StorySourceLink[] = [];
  for (const item of list) {
    if (item && typeof item === 'object') {
      const rec = item as Record<string, unknown>;
      const url = sanitizeUrl(rec.url || rec.link);
      const name = sanitizeText(rec.name || rec.source || 'Source', 80) || 'Source';
      if (url !== '#') {
        sanitized.push({
          name,
          url,
          time: fallbackTime,
        });
      }
    }
  }
  return sanitized;
}

export interface SupabaseFetchResult {
  stories: Story[];
  snapshots: Snapshot[];
  briefing: DailyBriefing | null;
  tableState: SupabaseTableState;
  newestSnapshotTakenAt: number | null;
  coins: CoinMarket[];
}

// Convert snapshot market prices & changes to CoinMarket array
// Prioritizes BNB, BTC, ETH, and SOL (and includes all coins present in snapshot data)
export function convertSnapshotMarketsToCoins(
  snapshot: Snapshot | undefined | null
): CoinMarket[] {
  if (!snapshot || !snapshot.topCoinPrices) return [];
  const prices = snapshot.topCoinPrices;
  const changes = snapshot.topCoinChanges || {};
  const symbols = Object.keys(prices);
  if (symbols.length === 0) return [];

  const COIN_META: Record<string, { id: string; name: string }> = {
    BNB: { id: 'binancecoin', name: 'BNB' },
    BTC: { id: 'bitcoin', name: 'Bitcoin' },
    ETH: { id: 'ethereum', name: 'Ethereum' },
    SOL: { id: 'solana', name: 'Solana' },
    XRP: { id: 'ripple', name: 'XRP' },
    TRX: { id: 'tron', name: 'TRON' },
    DOGE: { id: 'dogecoin', name: 'Dogecoin' },
    ADA: { id: 'cardano', name: 'Cardano' },
    AVAX: { id: 'avalanche-2', name: 'Avalanche' },
    DOT: { id: 'polkadot', name: 'Polkadot' },
    LINK: { id: 'chainlink', name: 'Chainlink' },
    ZEC: { id: 'zcash', name: 'Zcash' },
    USDC: { id: 'usd-coin', name: 'USD Coin' },
    USDT: { id: 'tether', name: 'Tether' },
  };

  // Ensure BNB, BTC, ETH and SOL (all coins present) are included, prioritized first
  const priority = ['BNB', 'BTC', 'ETH', 'SOL'];
  const presentPriority = priority.filter((s) => symbols.includes(s));
  const remaining = symbols.filter(
    (s) => !priority.includes(s) && s !== 'GOLD' && s !== 'XAU'
  );
  const orderedSymbols = [...presentPriority, ...remaining];

  return orderedSymbols.map((sym) => {
    const meta = COIN_META[sym] || {
      id: sym.toLowerCase(),
      name: sym,
    };
    const price = prices[sym];
    const change =
      changes[sym] !== undefined && Number.isFinite(changes[sym])
        ? Number(changes[sym])
        : 0;
    return {
      id: meta.id,
      symbol: sym,
      name: meta.name,
      currentPrice: price,
      change24h: change,
      marketCap: 0,
      sparkline: [price, price],
      url: `https://www.coingecko.com/en/coins/${encodeURIComponent(meta.id)}`,
    };
  });
}

// Read-only fetch from Supabase tables: stories, snapshots, briefings with no-cache
export async function fetchFromSupabasePrimary(): Promise<SupabaseFetchResult> {
  const now = Date.now();
  if (!isSupabaseConfigured) {
    return {
      stories: [],
      snapshots: [],
      briefing: null,
      coins: [],
      newestSnapshotTakenAt: null,
      tableState: {
        storiesCount: 0,
        snapshotsCount: 0,
        briefingsCount: 0,
        storiesEmpty: true,
        snapshotsEmpty: true,
        briefingsEmpty: true,
        usingFallback: true,
        lastCheckedAt: now,
        latestDataTimestamp: null,
        acledConfigured: false,
        error: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Secrets',
      },
    };
  }
  try {
    const [storiesRes, snapshotsRes, briefingsRes] = await Promise.all([
      supabase
        .from('stories')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(200),
      supabase
        .from('snapshots')
        .select('*')
        .order('taken_at', { ascending: false })
        .limit(30),
      supabase
        .from('briefings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const rawStories = Array.isArray(storiesRes.data) ? storiesRes.data : [];
    const rawSnapshots = Array.isArray(snapshotsRes.data) ? snapshotsRes.data : [];
    const rawBriefings = Array.isArray(briefingsRes.data) ? briefingsRes.data : [];

    let latestTimestamp: number | null = null;

    // Normalize & sanitize stories from Supabase
    const stories: Story[] = rawStories.map((row: Record<string, unknown>, idx: number) => {
      const pubTime = row.published_at
        ? new Date(String(row.published_at)).getTime()
        : row.created_at
        ? new Date(String(row.created_at)).getTime()
        : now;
      const validTime = Number.isNaN(pubTime) ? now : pubTime;
      if (!latestTimestamp || validTime > latestTimestamp) {
        latestTimestamp = validTime;
      }

      const headline = sanitizeText(row.headline || row.title || 'Untitled Dispatch', 200);
      const summary = sanitizeText(row.summary || row.description || 'No data', 500);
      const lat = typeof row.lat === 'number' ? row.lat : Number(row.lat) || 0;
      const lng = typeof row.lng === 'number' ? row.lng : Number(row.lng) || 0;

      const rawCountry = sanitizeText(row.country || '', 40);
      const meta =
        rawCountry && rawCountry.length >= 2
          ? getCountryMeta(rawCountry, `${headline} ${summary}`)
          : inferCountryFromCoords(lat, lng);

      const topic = parseValidTopic(row.topic);
      const importance = Math.max(1, Math.min(10, Number(row.importance) || 6));
      const sentiment = Math.max(-1, Math.min(1, Number(row.sentiment) || 0));
      const confidence = Math.max(0, Math.min(1, Number(row.confidence) || 0.8));
      const status = sanitizeText(row.status || 'active', 40);
      const sources = parseSupabaseSources(row.sources, validTime);

      return {
        id: sanitizeText(String(row.id || `sb-story-${idx}-${validTime}`), 100),
        headline,
        summary,
        country: meta.code,
        countryName: meta.name,
        region: meta.region,
        topic,
        importance,
        sentiment,
        lat: lat !== 0 ? lat : meta.lat,
        lng: lng !== 0 ? lng : meta.lng,
        confidence,
        time: validTime,
        sources,
        eventClusterKey: `${meta.code}-${topic}-${headline.slice(0, 24).toLowerCase()}`,
        isDeveloping: status.toLowerCase() === 'developing' || confidence < 0.65,
        aiAnalyzed: true,
        status,
        origin: 'supabase',
      };
    });

    // Normalize & sanitize snapshots from Supabase
    const snapshots: Snapshot[] = rawSnapshots.map((row: Record<string, unknown>, idx: number) => {
      const takenAtRaw = row.taken_at || row.takenAt || row.created_at || row.timestamp;
      const ts = takenAtRaw
        ? (typeof takenAtRaw === 'number' ? takenAtRaw : Date.parse(String(takenAtRaw)))
        : now - idx * 3600_000;
      const validTs = Number.isNaN(ts) ? now : ts;
      if (!latestTimestamp || validTs > latestTimestamp) {
        latestTimestamp = validTs;
      }

      const rawTopics =
        row.topic_counts && typeof row.topic_counts === 'object'
          ? (row.topic_counts as Record<string, number>)
          : row.topicCounts && typeof row.topicCounts === 'object'
          ? (row.topicCounts as Record<string, number>)
          : {};

      const topicCounts: Record<Topic, number> = {
        Politics: Number(rawTopics.Politics) || 0,
        Conflict: Number(rawTopics.Conflict) || 0,
        Economy: Number(rawTopics.Economy) || 0,
        Markets: Number(rawTopics.Markets) || 0,
        Tech: Number(rawTopics.Tech) || 0,
        Cyber: Number(rawTopics.Cyber) || 0,
        Health: Number(rawTopics.Health) || 0,
        Climate: Number(rawTopics.Climate) || 0,
        Disaster: Number(rawTopics.Disaster) || 0,
        Science: Number(rawTopics.Science) || 0,
        Sports: Number(rawTopics.Sports) || 0,
        Other: Number(rawTopics.Other) || 0,
      };

      const countryCounts =
        row.country_counts && typeof row.country_counts === 'object'
          ? (row.country_counts as Record<string, number>)
          : row.countryCounts && typeof row.countryCounts === 'object'
          ? (row.countryCounts as Record<string, number>)
          : {};

      // 1. The snapshots.markets column is an object like {"BTC":{"price":81136,"change24h":-3.1},"ETH":{...}}. Read it as nested objects.
      const rawMarkets =
        row.markets && typeof row.markets === 'object'
          ? (row.markets as Record<string, unknown>)
          : null;

      const topCoinPrices: Record<string, number> = {};
      const topCoinChanges: Record<string, number> = {};

      if (rawMarkets) {
        for (const [key, val] of Object.entries(rawMarkets)) {
          const upperKey = key.toUpperCase();
          if (val !== null && typeof val === 'object') {
            const vObj = val as Record<string, unknown>;
            // 2. For each key, set topCoinPrices[KEY] = Number(value.price) when value is an object with a numeric price (also accept a plain number).
            const p = Number(vObj.price ?? vObj.currentPrice ?? vObj.value);
            if (Number.isFinite(p) && p > 0) {
              topCoinPrices[upperKey] = p;
            }
            // 3. For each key, set topCoinChanges[KEY] = Number(value.change24h) when it is a number.
            const c = Number(vObj.change24h ?? vObj.changePct ?? vObj.change);
            if (Number.isFinite(c)) {
              topCoinChanges[upperKey] = c;
            }
          } else if (val !== null && val !== undefined) {
            // Also accept a plain number
            const num = Number(val);
            if (Number.isFinite(num) && num > 0) {
              topCoinPrices[upperKey] = num;
            }
          }
        }
      }

      // 4. Keep existing support for top_coin_prices / topCoinPrices
      const rawPricesObj =
        row.top_coin_prices && typeof row.top_coin_prices === 'object'
          ? (row.top_coin_prices as Record<string, unknown>)
          : row.topCoinPrices && typeof row.topCoinPrices === 'object'
          ? (row.topCoinPrices as Record<string, unknown>)
          : {};
      for (const [k, v] of Object.entries(rawPricesObj)) {
        const upperK = k.toUpperCase();
        if (v !== null && typeof v === 'object') {
          const p = Number((v as Record<string, unknown>).price);
          if (Number.isFinite(p) && p > 0 && !topCoinPrices[upperK]) {
            topCoinPrices[upperK] = p;
          }
        } else {
          const num = Number(v);
          if (Number.isFinite(num) && num > 0 && !topCoinPrices[upperK]) {
            topCoinPrices[upperK] = num;
          }
        }
      }

      // Keep existing support for top_coin_changes / topCoinChanges
      const rawChangesObj =
        row.top_coin_changes && typeof row.top_coin_changes === 'object'
          ? (row.top_coin_changes as Record<string, unknown>)
          : row.topCoinChanges && typeof row.topCoinChanges === 'object'
          ? (row.topCoinChanges as Record<string, unknown>)
          : {};
      for (const [k, v] of Object.entries(rawChangesObj)) {
        const upperK = k.toUpperCase();
        const num = Number(v);
        if (Number.isFinite(num) && topCoinChanges[upperK] === undefined) {
          topCoinChanges[upperK] = num;
        }
      }

      // Direct flat columns on snapshots table (e.g. btc, btc_price, eth, eth_price, gold, gold_price)
      const directBtc = Number(row.btc_price ?? row.btc ?? row.BTC);
      if (Number.isFinite(directBtc) && directBtc > 0 && !topCoinPrices.BTC) topCoinPrices.BTC = directBtc;
      const directEth = Number(row.eth_price ?? row.eth ?? row.ETH);
      if (Number.isFinite(directEth) && directEth > 0 && !topCoinPrices.ETH) topCoinPrices.ETH = directEth;
      const directGold = Number(row.gold_price ?? row.gold ?? row.xau ?? row.GOLD ?? row.XAU);
      if (Number.isFinite(directGold) && directGold > 0 && !topCoinPrices.GOLD) topCoinPrices.GOLD = directGold;

      const directBtcChg = Number(row.btc_change ?? row.btc_change_24h);
      if (Number.isFinite(directBtcChg) && topCoinChanges.BTC === undefined) topCoinChanges.BTC = directBtcChg;
      const directEthChg = Number(row.eth_change ?? row.eth_change_24h);
      if (Number.isFinite(directEthChg) && topCoinChanges.ETH === undefined) topCoinChanges.ETH = directEthChg;
      const directGoldChg = Number(row.gold_change ?? row.gold_change_24h);
      if (Number.isFinite(directGoldChg) && topCoinChanges.GOLD === undefined) topCoinChanges.GOLD = directGoldChg;

      const rawSourcesHealth =
        row.source_timestamps && typeof row.source_timestamps === 'object'
          ? (row.source_timestamps as Record<string, unknown>)
          : row.sources_health && typeof row.sources_health === 'object'
          ? (row.sources_health as Record<string, unknown>)
          : {};
      const sourceTimestamps: Record<string, number> = {};
      for (const [k, v] of Object.entries(rawSourcesHealth)) {
        const parsed = typeof v === 'number' ? v : Date.parse(String(v));
        if (Number.isFinite(parsed) && parsed > 0) {
          sourceTimestamps[k.toLowerCase()] = parsed;
        }
      }

      return {
        id: sanitizeText(String(row.id || `sb-snap-${idx}`), 80),
        timestamp: validTs,
        takenAt: validTs,
        dayKey: new Date(validTs).toISOString().slice(0, 10),
        storyIds: Array.isArray(row.story_ids)
          ? row.story_ids.map((s) => String(s))
          : [],
        topicCounts,
        countryCounts,
        topCoinPrices,
        topCoinChanges,
        sourceTimestamps,
      };
    });

    // Sort snapshots newest first and derive 24h changes from prior snapshot if not explicitly provided
    snapshots.sort((a, b) => b.timestamp - a.timestamp);
    if (snapshots.length >= 2) {
      const newest = snapshots[0];
      const older = snapshots[1];
      const nextChanges: Record<string, number> = { ...(newest.topCoinChanges || {}) };
      for (const sym of Object.keys(newest.topCoinPrices)) {
        if (
          nextChanges[sym] === undefined &&
          newest.topCoinPrices[sym] &&
          older.topCoinPrices[sym] &&
          older.topCoinPrices[sym] > 0
        ) {
          nextChanges[sym] =
            ((newest.topCoinPrices[sym] - older.topCoinPrices[sym]) /
              older.topCoinPrices[sym]) *
            100;
        }
      }
      newest.topCoinChanges = nextChanges;
    }

    // Normalize & sanitize briefing from Supabase
    let briefing: DailyBriefing | null = null;
    if (rawBriefings.length > 0) {
      const latestB = rawBriefings[0] as Record<string, unknown>;
      const bTime = latestB.created_at
        ? new Date(String(latestB.created_at)).getTime()
        : latestB.generated_at
        ? new Date(String(latestB.generated_at)).getTime()
        : now;
      const validBTime = Number.isNaN(bTime) ? now : bTime;
      if (!latestTimestamp || validBTime > latestTimestamp) {
        latestTimestamp = validBTime;
      }

      const rawHighlights = Array.isArray(latestB.highlights)
        ? latestB.highlights
        : [];
      const rawParagraphs = Array.isArray(latestB.paragraphs)
        ? latestB.paragraphs
        : typeof latestB.content === 'string'
        ? String(latestB.content).split('\n\n')
        : typeof latestB.summary === 'string'
        ? String(latestB.summary).split('\n\n')
        : [];

      briefing = {
        headline: sanitizeText(latestB.headline || latestB.title || 'WorldPulse Daily Briefing', 220),
        highlights: rawHighlights.map((h) => sanitizeText(h, 240)).filter(Boolean),
        paragraphs: rawParagraphs.map((p) => sanitizeText(p, 700)).filter(Boolean),
        generatedAt: validBTime,
        isAiGenerated: true,
        modelUsed: 'Supabase briefings table',
      };
    }

    const storiesEmpty = stories.length === 0;
    const snapshotsEmpty = snapshots.length === 0;
    const briefingsEmpty = !briefing;
    const coins = snapshots.length > 0 ? convertSnapshotMarketsToCoins(snapshots[0]) : [];

    return {
      stories,
      snapshots,
      briefing,
      coins,
      newestSnapshotTakenAt: snapshots.length > 0 ? (snapshots[0].takenAt || snapshots[0].timestamp) : null,
      tableState: {
        storiesCount: stories.length,
        snapshotsCount: snapshots.length,
        briefingsCount: rawBriefings.length,
        storiesEmpty,
        snapshotsEmpty,
        briefingsEmpty,
        usingFallback: storiesEmpty,
        lastCheckedAt: now,
        latestDataTimestamp: latestTimestamp,
        acledConfigured: false,
        error:
          storiesRes.error?.message ||
          snapshotsRes.error?.message ||
          briefingsRes.error?.message,
      },
    };
  } catch (err: unknown) {
    return {
      stories: [],
      snapshots: [],
      briefing: null,
      coins: [],
      newestSnapshotTakenAt: null,
      tableState: {
        storiesCount: 0,
        snapshotsCount: 0,
        briefingsCount: 0,
        storiesEmpty: true,
        snapshotsEmpty: true,
        briefingsEmpty: true,
        usingFallback: true,
        lastCheckedAt: now,
        latestDataTimestamp: null,
        acledConfigured: false,
        error: err instanceof Error ? err.message : 'Supabase connection failed',
      },
    };
  }
}

// ============================================================================
// SUPABASE AUTHENTICATION (Google Sign-In & Email Magic Link)
// ============================================================================
export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
}

export async function signInWithEmailMagicLink(email: string) {
  return supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
}

export async function signOutSupabase() {
  return supabase.auth.signOut();
}

export async function getCurrentSupabaseSession(): Promise<{
  session: Session | null;
  user: User | null;
}> {
  const { data } = await supabase.auth.getSession();
  return {
    session: data.session,
    user: data.session?.user || null,
  };
}

// ============================================================================
// SUPABASE USER TABLES SYNC (user_follows, user_bookmarks, user_alerts, push_subscriptions)
// ============================================================================
export async function syncUserFollowsToSupabase(
  userId: string,
  followedCountries: string[],
  followedTopics: Topic[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('user_follows').upsert(
      {
        user_id: userId,
        countries: followedCountries,
        topics: followedTopics,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Sync failed' };
  }
}

export async function loadUserFollowsFromSupabase(
  userId: string
): Promise<{ countries?: string[]; topics?: Topic[] } | null> {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('countries, topics')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      countries: Array.isArray(data.countries) ? data.countries : undefined,
      topics: Array.isArray(data.topics) ? (data.topics as Topic[]) : undefined,
    };
  } catch {
    return null;
  }
}

export async function syncBookmarkToSupabase(
  userId: string,
  story: Story,
  isBookmarked: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (isBookmarked) {
      const { error } = await supabase.from('user_bookmarks').upsert(
        {
          user_id: userId,
          story_id: story.id,
          story_data: story,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,story_id' }
      );
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('story_id', story.id);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Bookmark sync failed' };
  }
}

export async function loadBookmarksFromSupabase(userId: string): Promise<Story[] | null> {
  try {
    const { data, error } = await supabase
      .from('user_bookmarks')
      .select('story_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !Array.isArray(data)) return null;
    return data
      .map((row: { story_data?: Story }) => row.story_data)
      .filter((s): s is Story => Boolean(s && s.id && s.headline));
  } catch {
    return null;
  }
}

export async function syncAlertsToSupabase(
  userId: string,
  rules: CustomAlertRule[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    await supabase.from('user_alerts').delete().eq('user_id', userId);
    if (rules.length === 0) return { ok: true };
    const rows = rules.map((r) => ({
      id: r.id,
      user_id: userId,
      name: r.name,
      rule_type: r.ruleType,
      min_importance: r.minImportance ?? null,
      topic: r.topic ?? null,
      country: r.country ?? null,
      asset_symbol: r.assetSymbol ?? null,
      move_pct_threshold: r.movePctThreshold ?? null,
      enabled: r.enabled,
      created_at: new Date(r.createdAt).toISOString(),
    }));
    const { error } = await supabase.from('user_alerts').insert(rows);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Alert sync failed' };
  }
}

export async function loadAlertsFromSupabase(userId: string): Promise<CustomAlertRule[] | null> {
  try {
    const { data, error } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !Array.isArray(data)) return null;
    return data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      name: sanitizeText(row.name, 100),
      ruleType: row.rule_type === 'market' ? 'market' : 'story',
      minImportance: row.min_importance ? Number(row.min_importance) : undefined,
      topic: (row.topic as Topic | 'All') || 'All',
      country: row.country ? String(row.country) : 'ALL',
      assetSymbol: row.asset_symbol ? String(row.asset_symbol) : undefined,
      movePctThreshold: row.move_pct_threshold ? Number(row.move_pct_threshold) : undefined,
      enabled: Boolean(row.enabled ?? true),
      createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : Date.now(),
    }));
  } catch {
    return null;
  }
}

export async function savePushSubscriptionToSupabase(
  userId: string,
  subscriptionJson: PushSubscriptionJSON
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscriptionJson.endpoint || 'browser-notification',
        keys: subscriptionJson.keys || {},
        subscription_data: subscriptionJson,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Push sync failed' };
  }
}

// ============================================================================
// EXACT SQL WITH ROW LEVEL SECURITY (RLS) FOR USER TO RUN IN SUPABASE SQL EDITOR
// ============================================================================
export const SUPABASE_RLS_SQL_SCRIPT = `-- WorldPulse User Accounts, Follows, Bookmarks, Alerts & Web Push Tables
-- Run this script in your Supabase Dashboard -> SQL Editor

-- 1. user_follows: stores followed countries (ISO-2 codes) and topics per user
CREATE TABLE IF NOT EXISTS public.user_follows (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  countries TEXT[] NOT NULL DEFAULT '{}',
  topics TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows"
  ON public.user_follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follows"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own follows"
  ON public.user_follows FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows"
  ON public.user_follows FOR DELETE
  USING (auth.uid() = user_id);


-- 2. user_bookmarks: stores saved stories synced to the user's account
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL,
  story_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_id)
);

ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookmarks"
  ON public.user_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks"
  ON public.user_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
  ON public.user_bookmarks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON public.user_bookmarks FOR DELETE
  USING (auth.uid() = user_id);


-- 3. user_alerts: stores custom alert rules (e.g. "importance 8+ in Conflict" or "BTC moves > 5%")
CREATE TABLE IF NOT EXISTS public.user_alerts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('story', 'market')),
  min_importance NUMERIC,
  topic TEXT,
  country TEXT,
  asset_symbol TEXT,
  move_pct_threshold NUMERIC,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts"
  ON public.user_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts"
  ON public.user_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON public.user_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
  ON public.user_alerts FOR DELETE
  USING (auth.uid() = user_id);


-- 4. push_subscriptions: stores Web Push endpoints and encryption keys per user device
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL DEFAULT '{}'::jsonb,
  subscription_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);
`;
