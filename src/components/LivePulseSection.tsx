import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Compass,
  Database,
  Flame,
  Filter,
  Globe,
  Layers,
  Moon,
  Pause,
  PieChart,
  Play,
  Radio,
  Satellite,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  AppSettings,
  DailyBriefing,
  LivePulseRegion,
  MapFocusTarget,
  MapStyleMode,
  Snapshot,
  Story,
  SupabaseTableState,
  Topic,
} from '../types';
import {
  ALL_TOPICS,
  formatRelativeTime,
  formatTimeInTz,
  getCountryFlag,
  getCountryMeta,
  sanitizeText,
  TOPIC_COLORS,
} from '../utils/sanitize';

const LAST_VISIT_STORAGE_KEY = 'worldpulse_live_pulse_last_visit_v1';

const REGION_COORDINATES: Record<
  LivePulseRegion,
  { lat: number; lng: number; zoom: number }
> = {
  Asia: { lat: 32.0, lng: 96.0, zoom: 3 },
  Europe: { lat: 51.0, lng: 14.0, zoom: 3.5 },
  Africa: { lat: 2.0, lng: 21.0, zoom: 3 },
  Americas: { lat: 14.0, lng: -78.0, zoom: 2.5 },
  'Middle East': { lat: 27.5, lng: 44.5, zoom: 4 },
  Oceania: { lat: -24.0, lng: 138.0, zoom: 3.5 },
};

const QUICK_FILTER_CHIPS: Array<{
  id: 'India' | Topic;
  label: string;
  type: 'country' | 'topic';
  countryCode?: string;
  topic?: Topic;
}> = [
  { id: 'India', label: 'India', type: 'country', countryCode: 'IN' },
  { id: 'Conflict', label: 'Conflict', type: 'topic', topic: 'Conflict' },
  { id: 'Disaster', label: 'Disaster', type: 'topic', topic: 'Disaster' },
  { id: 'Cyber', label: 'Cyber', type: 'topic', topic: 'Cyber' },
  { id: 'Health', label: 'Health', type: 'topic', topic: 'Health' },
  { id: 'Markets', label: 'Markets', type: 'topic', topic: 'Markets' },
];

const SUPABASE_DATA_SOURCES: Array<{
  id: string;
  label: string;
  matchKeywords: string[];
}> = [
  { id: 'stories', label: 'Supabase Stories', matchKeywords: ['__table_stories__'] },
  { id: 'snapshots', label: 'Supabase Snapshots', matchKeywords: ['__table_snapshots__'] },
  { id: 'briefings', label: 'Supabase Briefings', matchKeywords: ['__table_briefings__'] },
  { id: 'usgs', label: 'USGS Seismic', matchKeywords: ['usgs', 'earthquake'] },
  { id: 'eonet', label: 'NASA EONET', matchKeywords: ['nasa', 'eonet'] },
  { id: 'gdelt', label: 'GDELT 2.0', matchKeywords: ['gdelt'] },
  { id: 'bbc', label: 'BBC World', matchKeywords: ['bbc'] },
  { id: 'reuters', label: 'Reuters', matchKeywords: ['reuters', 'guardian'] },
  { id: 'aljazeera', label: 'Al Jazeera', matchKeywords: ['al jazeera', 'aljazeera'] },
  { id: 'who', label: 'WHO Outbreaks', matchKeywords: ['who', 'world health'] },
  { id: 'cyber', label: 'Cyber Feeds', matchKeywords: ['hacker news', 'bleeping', 'cyber', 'cisa'] },
  { id: 'india', label: 'India / Punjab', matchKeywords: ['hindu', 'tribune', 'indian express', 'ndtv'] },
];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return reduced;
}

function useAnimatedCounter(target: number, reducedMotion: boolean): number {
  const [displayValue, setDisplayValue] = useState<number>(target);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(target);
      return;
    }
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const diff = target - startValue;
    if (diff === 0) return;

    const duration = 550;
    let rafId: number;

    const step = (ts: number) => {
      if (startTimestamp === null) startTimestamp = ts;
      const elapsed = ts - startTimestamp;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + diff * eased));
      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [target, reducedMotion]);

  return reducedMotion ? target : displayValue;
}

interface LivePulseSectionProps {
  supabaseStories: Story[];
  supabaseSnapshots: Snapshot[];
  supabaseBriefing: DailyBriefing | null;
  supabaseState: SupabaseTableState;
  isLoading: boolean;
  selectedTopicFilter: 'All' | Topic;
  onSelectTopicFilter: (topic: 'All' | Topic) => void;
  selectedCountryFilter: string | null;
  onSelectCountryFilter: (countryCode: string | null) => void;
  onSelectStory: (story: Story) => void;
  onPanMap: (target: MapFocusTarget) => void;
  mapStyle: MapStyleMode;
  onChangeMapStyle: (style: MapStyleMode) => void;
  settings: AppSettings;
}

export const LivePulseSection: React.FC<LivePulseSectionProps> = ({
  supabaseStories,
  supabaseSnapshots,
  supabaseBriefing,
  supabaseState,
  isLoading,
  selectedTopicFilter,
  onSelectTopicFilter,
  selectedCountryFilter,
  onSelectCountryFilter,
  onSelectStory,
  onPanMap,
  mapStyle,
  onChangeMapStyle,
  settings,
}) => {
  const isDark = settings.theme === 'dark';
  const reducedMotion = usePrefersReducedMotion();

  const [dismissedBreakingId, setDismissedBreakingId] = useState<string | null>(null);
  const [tickerPaused, setTickerPaused] = useState<boolean>(false);
  const [activeRegion, setActiveRegion] = useState<LivePulseRegion | null>(null);
  const [selectedSourceHealthId, setSelectedSourceHealthId] = useState<string>('stories');

  // 14. "Since you last visited" timestamp from localStorage wrapped in try/catch
  const [previousVisitTs, setPreviousVisitTs] = useState<number | null>(() => {
    try {
      const raw = window.localStorage.getItem(LAST_VISIT_STORAGE_KEY);
      const parsed = raw ? Number(raw) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch {
      return null;
    }
  });

  // Update stored last visit timestamp after initial mount wrapped in try/catch
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(LAST_VISIT_STORAGE_KEY, String(Date.now()));
      } catch {
        // Ignore storage quota or private browsing errors
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleMarkVisitedNow = () => {
    const now = Date.now();
    setPreviousVisitTs(now);
    try {
      window.localStorage.setItem(LAST_VISIT_STORAGE_KEY, String(now));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Filter Supabase stories from the last 24h (or all Supabase stories if timestamps are older)
  const storiesLast24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = supabaseStories.filter((s) => s.time >= cutoff);
    return recent.length > 0 ? recent : supabaseStories;
  }, [supabaseStories]);

  // 2. Four animated counters from the last 24h (Supabase only)
  const rawTotalStories24h = storiesLast24h.length;
  const rawCountriesWithStories24h = useMemo(
    () => new Set(storiesLast24h.map((s) => s.country).filter((c) => c && c !== 'GL')).size,
    [storiesLast24h]
  );
  const rawHighImportance24h = useMemo(
    () => storiesLast24h.filter((s) => s.importance >= 8).length,
    [storiesLast24h]
  );

  const animTotalStories = useAnimatedCounter(rawTotalStories24h, reducedMotion);
  const animCountriesCount = useAnimatedCounter(rawCountriesWithStories24h, reducedMotion);
  const animHighImpCount = useAnimatedCounter(rawHighImportance24h, reducedMotion);

  const newestSupabaseTimestamp = useMemo(() => {
    let newest = supabaseState.latestDataTimestamp || 0;
    for (const s of supabaseStories) {
      if (s.time > newest) newest = s.time;
    }
    if (supabaseBriefing && supabaseBriefing.generatedAt > newest) {
      newest = supabaseBriefing.generatedAt;
    }
    return newest > 0 ? newest : null;
  }, [supabaseStories, supabaseBriefing, supabaseState.latestDataTimestamp]);

  // 3. Hotspot chips: top 5 countries by story count (Supabase only)
  const top5Hotspots = useMemo(() => {
    const map: Record<
      string,
      { code: string; name: string; count: number; lat: number; lng: number }
    > = {};
    for (const s of supabaseStories) {
      if (!s.country || s.country === 'GL') continue;
      if (!map[s.country]) {
        const meta = getCountryMeta(s.country, '');
        map[s.country] = {
          code: s.country,
          name: sanitizeText(s.countryName || meta.name, 40),
          count: 0,
          lat: meta.lat,
          lng: meta.lng,
        };
      }
      map[s.country].count += 1;
    }
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [supabaseStories]);

  // 4. Newest 15 headlines from Supabase for slow-scrolling ticker
  const newest15Headlines = useMemo(() => {
    return [...supabaseStories]
      .sort((a, b) => b.time - a.time)
      .slice(0, 15);
  }, [supabaseStories]);

  // 5. Sentiment bar: share of positive, neutral and negative stories today from sentiment column
  const sentimentBreakdown = useMemo(() => {
    if (storiesLast24h.length === 0) return null;
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    for (const s of storiesLast24h) {
      const val = Number(s.sentiment);
      if (!Number.isFinite(val)) continue;
      if (val > 0.15) positive += 1;
      else if (val < -0.15) negative += 1;
      else neutral += 1;
    }

    const total = positive + neutral + negative;
    if (total === 0) return null;

    const posPct = Math.round((positive / total) * 100);
    const negPct = Math.round((negative / total) * 100);
    const neuPct = Math.max(0, 100 - posPct - negPct);

    return {
      positive,
      neutral,
      negative,
      total,
      posPct,
      neuPct,
      negPct,
    };
  }, [storiesLast24h]);

  // 6. Activity wave: stories per hour for the last 24h as a small area chart, with busiest hour marked
  const activityWaveData = useMemo(() => {
    if (storiesLast24h.length === 0) return null;
    const now = Date.now();
    const currentHourStart = Math.floor(now / 3600_000) * 3600_000;
    const buckets: Array<{ hourTs: number; label: string; count: number }> = [];

    for (let i = 23; i >= 0; i--) {
      const hrTs = currentHourStart - i * 3600_000;
      const d = new Date(hrTs);
      const label = `${String(d.getHours()).padStart(2, '0')}:00`;
      buckets.push({ hourTs: hrTs, label, count: 0 });
    }

    for (const s of storiesLast24h) {
      const diffHours = Math.floor((currentHourStart + 3600_000 - s.time) / 3600_000);
      const bucketIdx = 23 - Math.max(0, Math.min(23, diffHours));
      if (buckets[bucketIdx]) {
        buckets[bucketIdx].count += 1;
      }
    }

    const maxCount = Math.max(...buckets.map((b) => b.count));
    if (maxCount === 0) return null;

    let busiestIdx = 0;
    buckets.forEach((b, idx) => {
      if (b.count >= buckets[busiestIdx].count) {
        busiestIdx = idx;
      }
    });

    return {
      buckets,
      maxCount,
      busiestIdx,
      busiestHour: buckets[busiestIdx],
    };
  }, [storiesLast24h]);

  // 7. Topic mix donut chart with a legend (Supabase only)
  const topicMixData = useMemo(() => {
    if (supabaseStories.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const s of supabaseStories) {
      counts[s.topic] = (counts[s.topic] || 0) + 1;
    }
    const total = supabaseStories.length;
    const items = Object.entries(counts)
      .filter(([, c]) => c > 0)
      .map(([topic, count]) => ({
        topic: topic as Topic,
        count,
        pct: Math.round((count / total) * 100),
        share: count / total,
        color: TOPIC_COLORS[topic as Topic]?.hex || '#64748B',
      }))
      .sort((a, b) => b.count - a.count);

    return items.length > 0 ? { total, items } : null;
  }, [supabaseStories]);

  // 8. Rising topics chips with spike percentages versus the 7-day average, from Supabase snapshots
  const risingTopicsFromSnapshots = useMemo(() => {
    if (supabaseSnapshots.length === 0) return null;
    const sevenDaysCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentSnaps = supabaseSnapshots.filter((sn) => sn.timestamp >= sevenDaysCutoff);
    const snapsToUse = recentSnaps.length > 0 ? recentSnaps : supabaseSnapshots.slice(0, 7);
    if (snapsToUse.length === 0) return null;

    // Current topic counts from Supabase stories or newest snapshot
    const currentCounts: Record<Topic, number> = {
      Politics: 0,
      Conflict: 0,
      Economy: 0,
      Markets: 0,
      Tech: 0,
      Cyber: 0,
      Health: 0,
      Climate: 0,
      Disaster: 0,
      Science: 0,
      Sports: 0,
      Other: 0,
    };

    if (supabaseStories.length > 0) {
      for (const s of supabaseStories) {
        currentCounts[s.topic] = (currentCounts[s.topic] || 0) + 1;
      }
    } else {
      const latestSnap = snapsToUse[0];
      for (const t of ALL_TOPICS) {
        currentCounts[t] = Number(latestSnap.topicCounts?.[t]) || 0;
      }
    }

    const results: Array<{
      topic: Topic;
      current: number;
      sevenDayAvg: number;
      spikePct: number;
    }> = [];

    for (const topic of ALL_TOPICS) {
      const sum = snapsToUse.reduce(
        (acc, sn) => acc + (Number(sn.topicCounts?.[topic]) || 0),
        0
      );
      const avg = sum / snapsToUse.length;
      const cur = currentCounts[topic] || 0;
      if (cur === 0 && avg === 0) continue;
      const baseline = Math.max(avg, 0.5);
      const spikePct = Math.round(((cur - baseline) / baseline) * 100);
      results.push({
        topic,
        current: cur,
        sevenDayAvg: Number(avg.toFixed(1)),
        spikePct,
      });
    }

    const sorted = results.sort((a, b) => b.spikePct - a.spikePct).slice(0, 6);
    return sorted.length > 0 ? sorted : null;
  }, [supabaseSnapshots, supabaseStories]);

  // 10. Breaking banner: story with importance 9+ under 3 hours old (Supabase only)
  const breakingStory = useMemo(() => {
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    const match = supabaseStories
      .filter((s) => s.importance >= 9 && s.time >= threeHoursAgo)
      .sort((a, b) => b.importance - a.importance || b.time - a.time)[0];
    if (!match || match.id === dismissedBreakingId) return null;
    return match;
  }, [supabaseStories, dismissedBreakingId]);

  // 12. Mini markets row: BTC, ETH and gold from the latest Supabase snapshot
  const snapshotMiniMarkets = useMemo(() => {
    if (supabaseSnapshots.length === 0) return null;
    const latest = supabaseSnapshots[0];
    const prices = latest.topCoinPrices || {};
    const changes = latest.topCoinChanges || {};

    const items: Array<{
      symbol: string;
      name: string;
      price: number;
      changePct: number | null;
    }> = [];

    const candidates = [
      { key: 'BTC', label: 'Bitcoin', aliases: ['BTC', 'BITCOIN'] },
      { key: 'ETH', label: 'Ethereum', aliases: ['ETH', 'ETHEREUM'] },
      { key: 'GOLD', label: 'Gold (XAU)', aliases: ['GOLD', 'XAU', 'XAUUSD'] },
    ];

    for (const c of candidates) {
      let foundPrice: number | undefined;
      let foundChange: number | null = null;
      for (const alias of c.aliases) {
        if (typeof prices[alias] === 'number' && prices[alias] > 0) {
          foundPrice = prices[alias];
        }
        if (typeof changes[alias] === 'number' && Number.isFinite(changes[alias])) {
          foundChange = changes[alias];
        }
      }
      if (foundPrice !== undefined) {
        items.push({
          symbol: c.key,
          name: c.label,
          price: foundPrice,
          changePct: foundChange,
        });
      }
    }

    return items.length > 0 ? { timestamp: latest.timestamp, items } : null;
  }, [supabaseSnapshots]);

  // 13. Most mentioned countries: horizontal bar chart of the top 8 (Supabase only)
  const top8Countries = useMemo(() => {
    if (supabaseStories.length === 0) return null;
    const counts: Record<
      string,
      { code: string; name: string; count: number; lat: number; lng: number }
    > = {};
    for (const s of supabaseStories) {
      if (!s.country || s.country === 'GL') continue;
      if (!counts[s.country]) {
        const meta = getCountryMeta(s.country, '');
        counts[s.country] = {
          code: s.country,
          name: sanitizeText(s.countryName || meta.name, 40),
          count: 0,
          lat: meta.lat,
          lng: meta.lng,
        };
      }
      counts[s.country].count += 1;
    }
    const list = Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    if (list.length === 0) return null;
    const maxCount = Math.max(...list.map((c) => c.count), 1);
    return { list, maxCount };
  }, [supabaseStories]);

  // 14. New stories count since last visit (Supabase only)
  const newStoriesSinceLastVisit = useMemo(() => {
    if (!previousVisitTs) return supabaseStories.length;
    return supabaseStories.filter((s) => s.time > previousVisitTs).length;
  }, [supabaseStories, previousVisitTs]);

  // 15. Source health dots derived from Supabase tables & story source attributions
  const sourceHealthList = useMemo(() => {
    const latestSnapSources =
      supabaseSnapshots.length > 0 ? supabaseSnapshots[0].sourceTimestamps || {} : {};

    return SUPABASE_DATA_SOURCES.map((src) => {
      if (src.id === 'stories') {
        const ok = !supabaseState.storiesEmpty && supabaseState.storiesCount > 0;
        const lastTs = ok ? newestSupabaseTimestamp || supabaseState.lastCheckedAt : null;
        return {
          id: src.id,
          label: src.label,
          healthy: ok,
          lastSuccessTs: lastTs,
          count: supabaseState.storiesCount,
        };
      }
      if (src.id === 'snapshots') {
        const ok = !supabaseState.snapshotsEmpty && supabaseState.snapshotsCount > 0;
        const lastTs =
          ok && supabaseSnapshots[0]
            ? supabaseSnapshots[0].timestamp
            : null;
        return {
          id: src.id,
          label: src.label,
          healthy: ok,
          lastSuccessTs: lastTs,
          count: supabaseState.snapshotsCount,
        };
      }
      if (src.id === 'briefings') {
        const ok = !supabaseState.briefingsEmpty && Boolean(supabaseBriefing);
        const lastTs = ok && supabaseBriefing ? supabaseBriefing.generatedAt : null;
        return {
          id: src.id,
          label: src.label,
          healthy: ok,
          lastSuccessTs: lastTs,
          count: supabaseState.briefingsCount,
        };
      }

      // Check if any Supabase story or snapshot recorded this feed source
      let latestMatchTs: number | null = latestSnapSources[src.id] || null;
      let matchCount = 0;

      for (const story of supabaseStories) {
        for (const sLink of story.sources) {
          const lower = sLink.name.toLowerCase();
          if (src.matchKeywords.some((kw) => lower.includes(kw))) {
            matchCount += 1;
            const ts = sLink.time || story.time;
            if (!latestMatchTs || ts > latestMatchTs) {
              latestMatchTs = ts;
            }
          }
        }
      }

      return {
        id: src.id,
        label: src.label,
        healthy: Boolean(latestMatchTs && latestMatchTs > 0),
        lastSuccessTs: latestMatchTs,
        count: matchCount,
      };
    });
  }, [supabaseState, supabaseStories, supabaseSnapshots, supabaseBriefing, newestSupabaseTimestamp]);

  const activeSourceHealth = useMemo(
    () =>
      sourceHealthList.find((s) => s.id === selectedSourceHealthId) ||
      sourceHealthList[0],
    [sourceHealthList, selectedSourceHealthId]
  );

  const handleTapHotspotCountry = (code: string, lat: number, lng: number, name: string) => {
    if (selectedCountryFilter === code) {
      onSelectCountryFilter(null);
      onPanMap({ lat: 22, lng: 18, zoom: 2, label: 'Global', ts: Date.now() });
    } else {
      onSelectCountryFilter(code);
      onPanMap({ lat, lng, zoom: 4.5, label: name, ts: Date.now() });
    }
  };

  const handleTapQuickFilter = (chip: (typeof QUICK_FILTER_CHIPS)[number]) => {
    if (chip.type === 'country' && chip.countryCode) {
      const isAlreadyActive = selectedCountryFilter === chip.countryCode;
      if (isAlreadyActive) {
        onSelectCountryFilter(null);
        onPanMap({ lat: 22, lng: 18, zoom: 2, label: 'Global', ts: Date.now() });
      } else {
        onSelectCountryFilter(chip.countryCode);
        onPanMap({ lat: 22.5, lng: 79.0, zoom: 4.5, label: 'India', ts: Date.now() });
      }
      return;
    }

    if (chip.type === 'topic' && chip.topic) {
      onSelectTopicFilter(selectedTopicFilter === chip.topic ? 'All' : chip.topic);
    }
  };

  const handleTapRegionTab = (region: LivePulseRegion) => {
    if (activeRegion === region) {
      setActiveRegion(null);
      onPanMap({ lat: 22, lng: 18, zoom: 2, label: 'Global', ts: Date.now() });
      return;
    }
    setActiveRegion(region);
    const coords = REGION_COORDINATES[region];
    onPanMap({
      lat: coords.lat,
      lng: coords.lng,
      zoom: coords.zoom,
      label: region,
      ts: Date.now(),
    });
  };

  const cardSurfaceClass = isDark
    ? 'bg-[#090A0D] border-[#222631] text-[#F3F2EE]'
    : 'bg-[#EFEAE0]/55 border-[#DCD5C7] text-[#181615]';

  const mutedTextClass = isDark ? 'text-[#8C93A1]' : 'text-[#666159]';

  return (
    <section
      id="live-pulse"
      aria-labelledby="live-pulse-heading"
      className={`border border-t-2 transition-colors duration-200 ${
        isDark
          ? 'bg-[#101217] border-[#222631] border-t-[#E05A2B] text-[#F3F2EE]'
          : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#E05A2B] text-[#181615]'
      }`}
    >
      {/* 10. Breaking Banner: Red strip when a Supabase story with importance 9+ is under 3 hours old */}
      {breakingStory && (
        <div
          role="region"
          aria-label="Breaking high-severity alert"
          className="bg-rose-700 text-white border-b border-rose-500 px-3 py-1.5 flex items-center justify-between gap-2"
        >
          <button
            type="button"
            onClick={() => onSelectStory(breakingStory)}
            className="min-h-[44px] flex-1 text-left flex flex-wrap items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-bold uppercase tracking-wider bg-black/30 px-2 py-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Breaking · Sev {breakingStory.importance.toFixed(1)}</span>
            </span>
            <span className="font-mono-tabular text-xs opacity-90">
              {getCountryFlag(breakingStory.country)} {sanitizeText(breakingStory.countryName, 40)} ·{' '}
              {formatRelativeTime(breakingStory.time)}
            </span>
            <span className="font-editorial text-sm font-semibold underline decoration-white/60 line-clamp-1">
              {sanitizeText(breakingStory.headline, 160)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDismissedBreakingId(breakingStory.id)}
            aria-label="Dismiss breaking banner"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:bg-rose-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Row: Masthead + 14. "Since you last visited" chip + 16. Map style switch */}
      <div
        className={`p-3.5 sm:p-4 border-b flex flex-col gap-3 ${
          isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B]">
              <Radio className="w-3.5 h-3.5" />
              <span>Section 02B</span>
              <span aria-hidden="true">·</span>
              <span>Supabase Direct Telemetry</span>
            </div>
            <h2
              id="live-pulse-heading"
              className="font-editorial text-lg font-semibold tracking-tight mt-0.5"
            >
              Live Pulse
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 14. "Since you last visited" chip */}
            <button
              type="button"
              onClick={handleMarkVisitedNow}
              title="Tap to mark current Supabase stories as seen"
              className={`min-h-[44px] px-3 py-1.5 border text-xs font-mono-tabular inline-flex items-center gap-2 transition-colors cursor-pointer ${
                newStoriesSinceLastVisit > 0
                  ? 'border-[#E05A2B] bg-[#E05A2B]/15 text-[#E05A2B] font-semibold'
                  : isDark
                  ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                  : 'bg-[#EFEAE0]/60 border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                Since you last visited:{' '}
                <strong>
                  {isLoading
                    ? '...'
                    : supabaseStories.length === 0
                    ? 'Collecting data'
                    : `${newStoriesSinceLastVisit} new`}
                </strong>
              </span>
            </button>

            {/* 16. Map style switch: dark, satellite and heatmap */}
            <div
              role="group"
              aria-label="Map style switch"
              className={`flex items-center border ${
                isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0] border-[#DCD5C7]'
              }`}
            >
              {(
                [
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'satellite', label: 'Satellite', icon: Satellite },
                  { id: 'heatmap', label: 'Heatmap', icon: Flame },
                ] as const
              ).map((mode) => {
                const Icon = mode.icon;
                const active = mapStyle === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChangeMapStyle(mode.id)}
                    className={`min-h-[44px] px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#E05A2B] text-white font-semibold'
                        : isDark
                        ? 'text-[#8C93A1] hover:text-[#F3F2EE]'
                        : 'text-[#666159] hover:text-[#181615]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 11. Region Tabs: Asia, Europe, Africa, Americas, Middle East, Oceania (Tapping one pans the map) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span
            className={`text-[11px] font-mono-tabular uppercase tracking-wider shrink-0 mr-1 inline-flex items-center gap-1 ${mutedTextClass}`}
          >
            <Compass className="w-3.5 h-3.5 text-[#E05A2B]" />
            <span>Regions:</span>
          </span>
          {(
            ['Asia', 'Europe', 'Africa', 'Americas', 'Middle East', 'Oceania'] as LivePulseRegion[]
          ).map((region) => {
            const isActive = activeRegion === region;
            return (
              <button
                key={region}
                type="button"
                onClick={() => handleTapRegionTab(region)}
                className={`min-h-[44px] px-3 py-1.5 border text-xs font-mono-tabular transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-[#F3F2EE] text-[#090A0D] border-[#F3F2EE] font-semibold'
                      : 'bg-[#181615] text-[#FCFAF5] border-[#181615] font-semibold'
                    : isDark
                    ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                    : 'bg-[#EFEAE0]/50 border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
                }`}
              >
                {region}
              </button>
            );
          })}
        </div>

        {/* 9. Quick Filter Chips: India, Conflict, Disaster, Cyber, Health, Markets */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span
            className={`text-[11px] font-mono-tabular uppercase tracking-wider shrink-0 mr-1 inline-flex items-center gap-1 ${mutedTextClass}`}
          >
            <Filter className="w-3.5 h-3.5 text-[#E05A2B]" />
            <span>Quick Filter:</span>
          </span>
          {QUICK_FILTER_CHIPS.map((chip) => {
            const isActive =
              chip.type === 'country'
                ? selectedCountryFilter === chip.countryCode
                : selectedTopicFilter === chip.topic;
            const dotColor =
              chip.type === 'topic' && chip.topic
                ? TOPIC_COLORS[chip.topic]?.hex
                : '#E05A2B';

            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleTapQuickFilter(chip)}
                className={`min-h-[44px] px-3 py-1.5 border text-xs font-mono-tabular inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#E05A2B] border-[#E05A2B] text-white font-semibold'
                    : isDark
                    ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                    : 'bg-[#EFEAE0]/50 border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
                }`}
              >
                {chip.type === 'country' ? (
                  <span>🇮🇳</span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isActive ? '#ffffff' : dotColor }}
                  />
                )}
                <span>{chip.label}</span>
              </button>
            );
          })}

          {(selectedCountryFilter || selectedTopicFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                onSelectCountryFilter(null);
                onSelectTopicFilter('All');
              }}
              className={`min-h-[44px] px-3 py-1.5 border text-xs font-mono-tabular inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                isDark
                  ? 'border-[#222631] text-[#E05A2B] hover:border-[#E05A2B]'
                  : 'border-[#DCD5C7] text-[#E05A2B] hover:border-[#E05A2B]'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Slow-scrolling ticker of the newest 15 headlines (Pause on touch, tap opens story sheet) */}
      <div
        className={`border-b px-3 py-1.5 flex items-center gap-2 ${
          isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/70 border-[#DCD5C7]'
        }`}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-mono-tabular uppercase tracking-wider font-semibold text-[#E05A2B]">
            Newest 15
          </span>
          {!reducedMotion && newest15Headlines.length > 0 && (
            <button
              type="button"
              onClick={() => setTickerPaused((prev) => !prev)}
              aria-label={tickerPaused ? 'Resume headline ticker' : 'Pause headline ticker'}
              className={`min-h-[44px] min-w-[44px] border inline-flex items-center justify-center cursor-pointer ${
                isDark
                  ? 'border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                  : 'border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
              }`}
            >
              {tickerPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex-1 h-8 animate-pulse bg-current/10" />
        ) : newest15Headlines.length === 0 ? (
          <div className={`min-h-[44px] flex items-center text-xs font-mono-tabular ${mutedTextClass}`}>
            Collecting data — awaiting newest Supabase headlines
          </div>
        ) : reducedMotion ? (
          /* Static horizontally scrollable list when prefers-reduced-motion is active */
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar flex-1">
            {newest15Headlines.map((story) => (
              <button
                key={story.id}
                type="button"
                onClick={() => onSelectStory(story)}
                className="min-h-[44px] px-2.5 py-1 text-xs font-mono-tabular inline-flex items-center gap-2 whitespace-nowrap shrink-0 hover:text-[#E05A2B] cursor-pointer"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: TOPIC_COLORS[story.topic]?.hex || '#E05A2B' }}
                />
                <span>{getCountryFlag(story.country)}</span>
                <span className="font-sans font-medium">{sanitizeText(story.headline, 120)}</span>
                <span className={mutedTextClass}>({formatRelativeTime(story.time)})</span>
              </button>
            ))}
          </div>
        ) : (
          <div
            className="overflow-hidden flex-1"
            onTouchStart={() => setTickerPaused(true)}
            onTouchEnd={() => setTickerPaused(false)}
            onPointerDown={() => setTickerPaused(true)}
            onPointerUp={() => setTickerPaused(false)}
          >
            <div className={`wp-live-ticker-track ${tickerPaused ? 'is-paused' : ''}`}>
              {[...newest15Headlines, ...newest15Headlines].map((story, idx) => (
                <button
                  key={`${story.id}-${idx}`}
                  type="button"
                  onClick={() => onSelectStory(story)}
                  className="min-h-[44px] px-3 py-1 text-xs font-mono-tabular inline-flex items-center gap-2 whitespace-nowrap shrink-0 hover:text-[#E05A2B] cursor-pointer"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: TOPIC_COLORS[story.topic]?.hex || '#E05A2B' }}
                  />
                  <span>{getCountryFlag(story.country)}</span>
                  <span className="font-sans font-medium">{sanitizeText(story.headline, 120)}</span>
                  <span className={mutedTextClass}>· {formatRelativeTime(story.time)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Live Pulse Body: Horizontally scrollable cards on phones & responsive grid on tablets */}
      <div className="p-3.5 sm:p-4">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-2 md:grid md:grid-cols-2 md:overflow-visible no-scrollbar">
          {/* CARD 1 — Item 2: Four Animated Counters from the last 24h */}
          <div
            className={`min-w-[285px] sm:min-w-[320px] md:min-w-0 snap-start border p-3.5 flex flex-col justify-between ${cardSurfaceClass}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                24h Supabase Counters
              </span>
              <Activity className="w-3.5 h-3.5 text-[#E05A2B]" />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse bg-current/10" />
                ))}
              </div>
            ) : supabaseStories.length === 0 ? (
              <div className={`py-5 text-center border border-dashed ${isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'}`}>
                <Database className="w-5 h-5 text-[#E05A2B] mx-auto mb-1.5" />
                <p className="text-xs font-mono-tabular font-semibold">Collecting data</p>
                <p className={`text-[11px] mt-0.5 ${mutedTextClass}`}>
                  Supabase stories table is currently empty.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 font-mono-tabular">
                <div className={`p-2.5 border ${isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'}`}>
                  <div className={`text-[11px] ${mutedTextClass}`}>Total Stories (24h)</div>
                  <div className="text-xl font-bold mt-0.5">{animTotalStories}</div>
                </div>
                <div className={`p-2.5 border ${isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'}`}>
                  <div className={`text-[11px] ${mutedTextClass}`}>Countries Active</div>
                  <div className="text-xl font-bold mt-0.5">{animCountriesCount}</div>
                </div>
                <div className={`p-2.5 border ${isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'}`}>
                  <div className={`text-[11px] ${mutedTextClass}`}>Importance 8+</div>
                  <div className="text-xl font-bold text-[#E05A2B] mt-0.5">{animHighImpCount}</div>
                </div>
                <div className={`p-2.5 border ${isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'}`}>
                  <div className={`text-[11px] ${mutedTextClass}`}>Newest Update</div>
                  <div className="text-sm font-bold mt-1 truncate">
                    {newestSupabaseTimestamp
                      ? formatRelativeTime(newestSupabaseTimestamp)
                      : 'Collecting data'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CARD 2 — Item 1: Legend (Topic colors + dot size meaning importance) */}
          <div
            className={`min-w-[285px] sm:min-w-[320px] md:min-w-0 snap-start border p-3.5 flex flex-col justify-between ${cardSurfaceClass}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                Map Legend · Topic &amp; Severity Scale
              </span>
              <Layers className="w-3.5 h-3.5 text-[#E05A2B]" />
            </div>

            <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 text-xs font-mono-tabular">
              {ALL_TOPICS.map((topic) => (
                <div key={topic} className="flex items-center gap-1.5 truncate">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: TOPIC_COLORS[topic]?.hex || '#64748B' }}
                  />
                  <span className="truncate">{topic}</span>
                </div>
              ))}
            </div>

            <div
              className={`mt-3 pt-2.5 border-t flex items-center justify-between gap-2 text-[11px] font-mono-tabular ${
                isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
              }`}
            >
              <span className={mutedTextClass}>Dot Size = Importance:</span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E05A2B] inline-block" />
                  <span>Sev 3</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#E05A2B] inline-block" />
                  <span>Sev 6</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-[#E05A2B] inline-block" />
                  <span>Sev 9+</span>
                </span>
              </div>
            </div>
          </div>

          {/* CARD 3 — Item 3: Hotspot Chips (Top 5 countries by story count, tap to zoom map & filter lists) */}
          <div
            className={`min-w-[285px] sm:min-w-[320px] md:min-w-0 snap-start border p-3.5 flex flex-col justify-between ${cardSurfaceClass}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                Top 5 Hotspots (Tap to Zoom &amp; Filter)
              </span>
              <Globe className="w-3.5 h-3.5 text-[#E05A2B]" />
            </div>

            {isLoading ? (
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-11 w-24 animate-pulse bg-current/10" />
                ))}
              </div>
            ) : top5Hotspots.length === 0 ? (
              <div className={`py-4 text-center border border-dashed ${isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'}`}>
                <p className="text-xs font-mono-tabular font-semibold">Collecting data</p>
                <p className={`text-[11px] mt-0.5 ${mutedTextClass}`}>
                  Top country hotspots appear when Supabase stories arrive.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {top5Hotspots.map((item) => {
                  const isActive = selectedCountryFilter === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() =>
                        handleTapHotspotCountry(item.code, item.lat, item.lng, item.name)
                      }
                      className={`min-h-[44px] px-3 py-1.5 border text-xs font-mono-tabular inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#E05A2B] border-[#E05A2B] text-white font-semibold'
                          : isDark
                          ? 'bg-[#101217] border-[#222631] hover:border-[#F3F2EE]'
                          : 'bg-[#FCFAF5] border-[#DCD5C7] hover:border-[#181615]'
                      }`}
                    >
                      <span>{getCountryFlag(item.code)}</span>
                      <span>{item.name}</span>
                      <span
                        className={`font-bold ${
                          isActive ? 'text-white' : 'text-[#E05A2B]'
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CARD 4 — Item 5: Sentiment Bar (Positive, Neutral, Negative share today from sentiment column) */}
          {(isLoading || sentimentBreakdown) && (
            <div
              className={`min-w-[285px] sm:min-w-[320px] md:min-w-0 snap-start border p-3.5 flex flex-col justify-between ${cardSurfaceClass}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                  Sentiment Distribution (24h)
                </span>
                <span className={`text-[11px] font-mono-tabular ${mutedTextClass}`}>
                  {sentimentBreakdown ? `${sentimentBreakdown.total} stories` : ''}
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-5 w-full animate-pulse bg-current/10" />
                  <div className="h-4 w-3/4 animate-pulse bg-current/10" />
                </div>
              ) : (
                sentimentBreakdown && (
                  <div className="space-y-2.5">
                    <div
                      className="w-full h-4 flex overflow-hidden border border-black/20"
                      role="img"
                      aria-label={`Sentiment: ${sentimentBreakdown.posPct}% positive, ${sentimentBreakdown.neuPct}% neutral, ${sentimentBreakdown.negPct}% negative`}
                    >
                      {sentimentBreakdown.posPct > 0 && (
                        <div
                          style={{ width: `${sentimentBreakdown.posPct}%` }}
                          className="bg-emerald-500 h-full"
                          title={`Positive: ${sentimentBreakdown.posPct}% (${sentimentBreakdown.positive})`}
                        />
                      )}
                      {sentimentBreakdown.neuPct > 0 && (
                        <div
                          style={{ width: `${sentimentBreakdown.neuPct}%` }}
                          className="bg-slate-400 dark:bg-slate-500 h-full"
                          title={`Neutral: ${sentimentBreakdown.neuPct}% (${sentimentBreakdown.neutral})`}
                        />
                      )}
                      {sentimentBreakdown.negPct > 0 && (
                        <div
                          style={{ width: `${sentimentBreakdown.negPct}%` }}
                          className="bg-rose-500 h-full"
                          title={`Negative: ${sentimentBreakdown.negPct}% (${sentimentBreakdown.negative})`}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono-tabular">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Pos {sentimentBreakdown.posPct}%</span>
                      </span>
                      <span className={`inline-flex items-center gap-1.5 ${mutedTextClass}`}>
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span>Neu {sentimentBreakdown.neuPct}%</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>Neg {sentimentBreakdown.negPct}%</span>
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* CARD 5 — Item 6: Activity Wave (Stories per hour for last 24h area chart, busiest hour marked) */}
          {(isLoading || activityWaveData) && (
            <div
              className={`min-w-[285px] sm:min-w-[320px] md:min-w-0 snap-start border p-3.5 flex flex-col justify-between ${cardSurfaceClass}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                  24h Activity Wave (Stories / Hr)
                </span>
                {activityWaveData && (
                  <span className="text-[11px] font-mono-tabular font-semibold text-[#E05A2B]">
                    Peak: {activityWaveData.busiestHour.label} ({activityWaveData.busiestHour.count})
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="h-24 w-full animate-pulse bg-current/10" />
              ) : (
                activityWaveData && (() => {
                  const width = 280;
                  const height = 76;
                  const padX = 8;
                  const padY = 10;
                  const usableW = width - padX * 2;
                  const usableH = height - padY * 2;

                  const pts = activityWaveData.buckets.map((b, i) => {
                    const x = padX + (i / 23) * usableW;
                    const y =
                      padY +
                      usableH -
                      (b.count / Math.max(activityWaveData.maxCount, 1)) * usableH;
                    return { x, y, ...b };
                  });

                  const linePath = pts
                    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                    .join(' ');
                  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${height - padY} L${pts[0].x.toFixed(1)},${height - padY} Z`;
                  const peakPt = pts[activityWaveData.busiestIdx];

                  return (
                    <div>
                      <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="w-full h-20 overflow-visible"
                        role="img"
                        aria-label={`24-hour story activity chart. Busiest hour: ${activityWaveData.busiestHour.label} with ${activityWaveData.busiestHour.count} stories.`}
                      >
                        <defs>
                          <linearGradient id="wpPulseWaveGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#E05A2B" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#E05A2B" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <path d={areaPath} fill="url(#wpPulseWaveGrad)" />
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#E05A2B"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {peakPt && (
                          <g>
                            <circle
                              cx={peakPt.x}
                              cy={peakPt.y}
                              r="4"
                              fill="#E05A2B"
                              stroke={isDark ? '#090A0D' : '#FCFAF5'}
                              strokeWidth="1.5"
                            />
                          </g>
                        )}
                      </svg>
                      <div
                        className={`flex items-center justify-between text-[10px] font-mono-tabular ${mutedTextClass}`}
                      >
                        <span>{activityWaveData.buckets[0]?.label}</span>
                        <span>Busiest: {activityWaveData.busiestHour.label}</span>
                        <span>Now</span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* CARD 6 — Item 7: Topic Mix Donut Chart with Legend */}
          {(isLoading || topicMixData) && (
            <div
              className={`min-w-[285px] sm:min-w-[320px] md:min-w-0 snap-start border p-3.5 flex flex-col justify-between ${cardSurfaceClass}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                  Topic Mix
                </span>
                <PieChart className="w-3.5 h-3.5 text-[#E05A2B]" />
              </div>

              {isLoading ? (
                <div className="h-28 w-full animate-pulse bg-current/10" />
              ) : (
                topicMixData && (() => {
                  const radius = 30;
                  const circumference = 2 * Math.PI * radius;
                  let cumulativeShare = 0;

                  return (
                    <div className="flex items-center gap-3.5">
                      <div className="relative w-20 h-20 shrink-0">
                        <svg
                          viewBox="0 0 80 80"
                          className="w-20 h-20 -rotate-90"
                          role="img"
                          aria-label="Topic distribution donut chart"
                        >
                          {topicMixData.items.map((seg) => {
                            const strokeLen = seg.share * circumference;
                            const strokeOffset = -cumulativeShare * circumference;
                            cumulativeShare += seg.share;
                            return (
                              <circle
                                key={seg.topic}
                                cx="40"
                                cy="40"
                                r={radius}
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth="11"
                                strokeDasharray={`${strokeLen} ${circumference}`}
                                strokeDashoffset={strokeOffset}
                              />
                            );
                          })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono-tabular">
                          <span className="text-xs font-bold">{topicMixData.total}</span>
                          <span className={`text-[9px] ${mutedTextClass}`}>total</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 flex-1 text-xs font-mono-tabular">
                        {topicMixData.items.slice(0, 6).map((item) => (
                          <div key={item.topic} className="flex items-center justify-between gap-1 truncate">
                            <span className="inline-flex items-center gap-1.5 truncate">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="truncate">{item.topic}</span>
                            </span>
                            <span className={mutedTextClass}>{item.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* CARD 7 — Item 8: Rising Topics Chips with Spike % vs 7-Day Average from Snapshots */}
          {(isLoading || risingTopicsFromSnapshots) && (
            <div
              className={`min-w-[285px] sm:min-w-[320px] md:min-w-0 snap-start border p-3.5 flex flex-col justify-between ${cardSurfaceClass}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                  Rising Topics vs 7d Snapshot Avg
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-[#E05A2B]" />
              </div>

              {isLoading ? (
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-11 w-28 animate-pulse bg-current/10" />
                  ))}
                </div>
              ) : (
                risingTopicsFromSnapshots && (
                  <div className="flex flex-wrap gap-1.5">
                    {risingTopicsFromSnapshots.map((item) => {
                      const isSelected = selectedTopicFilter === item.topic;
                      const isPositive = item.spikePct >= 0;
                      return (
                        <button
                          key={item.topic}
                          type="button"
                          onClick={() =>
                            onSelectTopicFilter(isSelected ? 'All' : item.topic)
                          }
                          className={`min-h-[44px] px-2.5 py-1.5 border text-xs font-mono-tabular inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#E05A2B] border-[#E05A2B] text-white font-semibold'
                              : isDark
                              ? 'bg-[#101217] border-[#222631] hover:border-[#F3F2EE]'
                              : 'bg-[#FCFAF5] border-[#DCD5C7] hover:border-[#181615]'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: isSelected
                                ? '#ffffff'
                                : TOPIC_COLORS[item.topic]?.hex,
                            }}
                          />
                          <span>{item.topic}</span>
                          <span
                            className={`font-semibold ${
                              isSelected
                                ? 'text-white'
                                : isPositive
                                ? 'text-emerald-500'
                                : 'text-[#8C93A1]'
                            }`}
                          >
                            {isPositive ? `+${item.spikePct}%` : `${item.spikePct}%`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* CARD 8 — Item 12: Mini Markets Row (BTC, ETH and Gold from latest Supabase snapshot) */}
          {(isLoading || snapshotMiniMarkets) && (
            <div
              className={`min-w-[285px] sm:min-w-[320px] md:min-w-0 snap-start border p-3.5 flex flex-col justify-between ${cardSurfaceClass}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                  Snapshot Mini Markets (BTC · ETH · Gold)
                </span>
                <span className={`text-[10px] font-mono-tabular ${mutedTextClass}`}>
                  {snapshotMiniMarkets
                    ? formatRelativeTime(snapshotMiniMarkets.timestamp)
                    : ''}
                </span>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse bg-current/10" />
                  ))}
                </div>
              ) : (
                snapshotMiniMarkets && (
                  <div className="grid grid-cols-3 gap-2 font-mono-tabular">
                    {snapshotMiniMarkets.items.map((m) => {
                      const up = (m.changePct ?? 0) >= 0;
                      return (
                        <div
                          key={m.symbol}
                          className={`p-2 border ${
                            isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold">{m.symbol}</span>
                            {m.changePct !== null && (
                              <span
                                className={`inline-flex items-center ${
                                  up ? 'text-emerald-500' : 'text-rose-500'
                                }`}
                              >
                                {up ? (
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowDownRight className="w-3.5 h-3.5" />
                                )}
                                <span>{Math.abs(m.changePct).toFixed(1)}%</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs sm:text-sm font-semibold mt-1 truncate">
                            ${m.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* CARD 9 — Item 13: Most Mentioned Countries (Horizontal bar chart of top 8) */}
          {(isLoading || top8Countries) && (
            <div
              className={`min-w-[285px] sm:min-w-[320px] md:min-w-0 snap-start border p-3.5 flex flex-col justify-between md:col-span-2 ${cardSurfaceClass}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                  Most Mentioned Countries (Top 8 in Supabase)
                </span>
                <BarChart3 className="w-3.5 h-3.5 text-[#E05A2B]" />
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-9 w-full animate-pulse bg-current/10" />
                  ))}
                </div>
              ) : (
                top8Countries && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {top8Countries.list.map((c) => {
                      const widthPct = Math.max(
                        8,
                        Math.round((c.count / top8Countries.maxCount) * 100)
                      );
                      const isSelected = selectedCountryFilter === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() =>
                            handleTapHotspotCountry(c.code, c.lat, c.lng, c.name)
                          }
                          className={`min-h-[44px] px-2.5 py-1.5 border text-left flex flex-col justify-center gap-1 transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-[#E05A2B] bg-[#E05A2B]/15'
                              : isDark
                              ? 'border-[#222631] hover:border-[#F3F2EE]'
                              : 'border-[#DCD5C7] hover:border-[#181615]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-mono-tabular">
                            <span className="inline-flex items-center gap-1.5 font-medium truncate">
                              <span>{getCountryFlag(c.code)}</span>
                              <span className="truncate">{c.name}</span>
                            </span>
                            <span className="font-bold text-[#E05A2B]">{c.count}</span>
                          </div>
                          <div
                            className={`w-full h-1.5 overflow-hidden ${
                              isDark ? 'bg-[#222631]' : 'bg-[#DCD5C7]'
                            }`}
                          >
                            <div
                              style={{ width: `${widthPct}%` }}
                              className="h-full bg-[#E05A2B]"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* CARD 10 — Item 15: Source Health Dots (One dot per data source, green or grey, last success time on tap) */}
          <div
            className={`min-w-[285px] sm:min-w-[320px] md:min-w-0 snap-start border p-3.5 flex flex-col justify-between md:col-span-2 ${cardSurfaceClass}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
                Source Health Dots (Tap Source for Last Success Time)
              </span>
              {activeSourceHealth && (
                <span className="text-xs font-mono-tabular">
                  <strong>{activeSourceHealth.label}:</strong>{' '}
                  {activeSourceHealth.lastSuccessTs ? (
                    <span className="text-emerald-500 font-semibold">
                      Last success {formatRelativeTime(activeSourceHealth.lastSuccessTs)} (
                      {formatTimeInTz(activeSourceHealth.lastSuccessTs, settings.timezone)})
                    </span>
                  ) : (
                    <span className={mutedTextClass}>
                      Collecting data — no rows recorded yet
                    </span>
                  )}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {sourceHealthList.map((src) => {
                const isSelected = activeSourceHealth?.id === src.id;
                return (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => setSelectedSourceHealthId(src.id)}
                    aria-pressed={isSelected}
                    className={`min-h-[44px] px-2.5 py-1.5 border text-xs font-mono-tabular inline-flex items-center gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'border-[#F3F2EE] bg-[#101217] font-semibold'
                          : 'border-[#181615] bg-[#FCFAF5] font-semibold'
                        : isDark
                        ? 'border-[#222631] bg-[#101217]/60 text-[#8C93A1] hover:text-[#F3F2EE]'
                        : 'border-[#DCD5C7] bg-[#FCFAF5]/70 text-[#666159] hover:text-[#181615]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        src.healthy ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}
                    />
                    <span>{src.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
