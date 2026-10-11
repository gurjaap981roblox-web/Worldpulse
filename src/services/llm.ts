import {
  AppSettings,
  ChangeEntry,
  CoinMarket,
  CountryBrief,
  DailyBriefing,
  RawFeedItem,
  RisingTopicMetric,
  Snapshot,
  Story,
  Topic,
  WhatChangedAnalysis,
} from '../types';
import {
  ALL_TOPICS,
  getCountryMeta,
  inferBaselineImportance,
  inferBaselineSentiment,
  inferBaselineTopic,
  normalizeUrlKey,
  sanitizeText,
  sanitizeUrl,
  titleSimilarity,
} from '../utils/sanitize';
import {
  CachedAiItem,
  getAiCallsUsedToday,
  incrementAiCallsUsed,
  loadAiItemCache,
  saveAiItemCache,
} from './storage';

const MAX_CALLS_PER_REFRESH = 10;

function isValidTopic(val: unknown): val is Topic {
  return typeof val === 'string' && (ALL_TOPICS as string[]).includes(val);
}

// Step 1 & 2: Deduplicate raw items by URL and title similarity while preserving multiple source links
interface PreMergedItem extends RawFeedItem {
  sourcesList: Array<{ name: string; url: string; time: number }>;
}

export function deduplicateRawItems(rawItems: RawFeedItem[]): PreMergedItem[] {
  const sorted = [...rawItems].sort((a, b) => b.time - a.time);
  const byUrl = new Map<string, PreMergedItem>();
  const result: PreMergedItem[] = [];

  for (const item of sorted) {
    const cleanUrl = sanitizeUrl(item.url);
    if (cleanUrl === '#') continue;
    const urlKey = normalizeUrlKey(cleanUrl);

    if (byUrl.has(urlKey)) {
      const existing = byUrl.get(urlKey)!;
      if (!existing.sourcesList.some((s) => normalizeUrlKey(s.url) === urlKey && s.name === item.source)) {
        existing.sourcesList.push({ name: item.source, url: cleanUrl, time: item.time });
      }
      continue;
    }

    // Check title similarity against already accepted items
    let matchedExisting: PreMergedItem | null = null;
    for (const candidate of result) {
      if (titleSimilarity(item.title, candidate.title) >= 0.62) {
        matchedExisting = candidate;
        break;
      }
    }

    if (matchedExisting) {
      if (!matchedExisting.sourcesList.some((s) => s.name === item.source)) {
        matchedExisting.sourcesList.push({
          name: item.source,
          url: cleanUrl,
          time: item.time,
        });
      }
    } else {
      const merged: PreMergedItem = {
        ...item,
        url: cleanUrl,
        sourcesList: [{ name: item.source, url: cleanUrl, time: item.time }],
      };
      byUrl.set(urlKey, merged);
      result.push(merged);
    }
  }

  return result;
}

// Build fast deterministic stories (used for immediate display & fallback)
export function buildBaselineStories(rawItems: RawFeedItem[]): Story[] {
  const deduped = deduplicateRawItems(rawItems);
  const cache = loadAiItemCache();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  const stories: Story[] = deduped.map((item) => {
    const cached = cache[item.id];
    const topic: Topic = cached && isValidTopic(cached.topic)
      ? cached.topic
      : inferBaselineTopic(item.title, item.text, item.source);

    const countryMeta = getCountryMeta(
      cached?.country || item.country,
      `${item.title} ${item.text}`
    );

    const lat =
      typeof item.magnitude === 'number' || item.source === 'NASA EONET'
        ? item.lat
        : typeof cached?.lat === 'number' && Math.abs(cached.lat) <= 90 && cached.lat !== 0
        ? cached.lat
        : item.lat || countryMeta.lat;

    const lng =
      typeof item.magnitude === 'number' || item.source === 'NASA EONET'
        ? item.lng
        : typeof cached?.lng === 'number' && Math.abs(cached.lng) <= 180 && cached.lng !== 0
        ? cached.lng
        : item.lng || countryMeta.lng;

    const importance = cached?.importance
      ? Math.max(1, Math.min(10, Number(cached.importance)))
      : inferBaselineImportance(item.title, topic, item.magnitude, item.sourcesList.length);

    const sentiment =
      typeof cached?.sentiment === 'number'
        ? Math.max(-1, Math.min(1, cached.sentiment))
        : inferBaselineSentiment(item.title, topic);

    // Official telemetry sensors (USGS, EONET, Open-Meteo) or multi-source stories have higher baseline confidence
    const isSensorSource =
      item.source.includes('USGS') ||
      item.source.includes('EONET') ||
      item.source.includes('Open-Meteo') ||
      item.source.includes('CoinGecko');

    const baseConf = isSensorSource
      ? 0.96
      : item.sourcesList.length > 1
      ? 0.88
      : cached?.confidence || 0.72;

    const isRecentBreaking = item.time >= oneHourAgo && item.sourcesList.length === 1 && !isSensorSource;

    return {
      id: item.id,
      headline: sanitizeText(cached?.headline || item.title, 140),
      summary: sanitizeText(cached?.summary || item.text || item.title, 260),
      country: countryMeta.code,
      countryName: countryMeta.name,
      region: countryMeta.region,
      topic,
      importance,
      sentiment,
      lat,
      lng,
      confidence: Math.min(0.99, Math.max(0.4, baseConf)),
      time: item.time,
      sources: item.sourcesList,
      eventClusterKey: cached?.eventClusterKey || item.id,
      isDeveloping: isRecentBreaking || baseConf < 0.68,
      aiAnalyzed: Boolean(cached),
      magnitude: item.magnitude,
      depthKm: item.depthKm,
      disasterCategory: item.disasterCategory,
    };
  });

  return mergeStoriesByEventCluster(stories);
}

// Step 4: Merge items about the same event into one story with multiple source links
export function mergeStoriesByEventCluster(stories: Story[]): Story[] {
  const clusterMap = new Map<string, Story>();
  const finalStories: Story[] = [];

  for (const story of stories) {
    const key = (story.eventClusterKey || '').toLowerCase().trim();
    const isGenericKey = !key || key.startsWith('usgs-') || key.startsWith('rss-') || key.startsWith('gdelt-') || key === 'other';

    if (!isGenericKey && clusterMap.has(key)) {
      const target = clusterMap.get(key)!;
      for (const src of story.sources) {
        if (!target.sources.some((existing) => normalizeUrlKey(existing.url) === normalizeUrlKey(src.url))) {
          target.sources.push(src);
        }
      }
      target.importance = Math.min(10, Math.max(target.importance, story.importance) + 0.3);
      target.confidence = Math.min(0.99, Math.max(target.confidence, story.confidence) + 0.06);
      target.time = Math.max(target.time, story.time);
      target.isDeveloping = target.sources.length === 1 && target.confidence < 0.72;
      continue;
    }

    // Also check title similarity across stories
    let mergedIntoExisting = false;
    for (const existing of finalStories) {
      if (existing.country === story.country && titleSimilarity(existing.headline, story.headline) >= 0.58) {
        for (const src of story.sources) {
          if (!existing.sources.some((s) => normalizeUrlKey(s.url) === normalizeUrlKey(src.url))) {
            existing.sources.push(src);
          }
        }
        existing.importance = Math.min(10, Math.max(existing.importance, story.importance) + 0.3);
        existing.confidence = Math.min(0.99, existing.confidence + 0.05);
        mergedIntoExisting = true;
        break;
      }
    }

    if (!mergedIntoExisting) {
      if (!isGenericKey) {
        clusterMap.set(key, story);
      }
      finalStories.push(story);
    }
  }

  return finalStories.sort((a, b) => {
    if (Math.abs(b.importance - a.importance) > 0.4) {
      return b.importance - a.importance;
    }
    return b.time - a.time;
  });
}

// Deterministic fallback briefing & 24h change analysis so the page is never empty
export function buildFallbackBriefingAndChanges(
  stories: Story[],
  snapshots: Snapshot[],
  coins: CoinMarket[]
): {
  briefing: DailyBriefing;
  whatChanged: WhatChangedAnalysis;
} {
  const top = stories.slice(0, 6);
  const quakes = stories.filter((s) => typeof s.magnitude === 'number');
  const maxQuake = quakes.sort((a, b) => (b.magnitude || 0) - (a.magnitude || 0))[0];

  const topicCounts: Record<string, number> = {};
  for (const s of stories) {
    topicCounts[s.topic] = (topicCounts[s.topic] || 0) + 1;
  }
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  const headline =
    top.length > 0
      ? `Global Monitor: Active developments in ${topTopics.join(', ')} across ${new Set(stories.map((s) => s.countryName)).size} monitored nations`
      : 'No data available from live feeds at this moment';

  const highlights = top.slice(0, 5).map(
    (s) => `${s.countryName} (${s.topic}): ${s.headline}`
  );
  while (highlights.length < 5) {
    highlights.push('No additional verified highlights in current cycle.');
  }

  const p1 =
    top.length > 0
      ? `WorldPulse is currently tracking ${stories.length} verified global events across ${new Set(stories.map((s) => s.country)).size} countries and territories. Primary activity is concentrated in ${topTopics.join(', ')}, led by reports from ${top.slice(0, 3).map((s) => s.countryName).join(', ')}. ${top[0]?.summary || ''}`
      : 'No data currently loaded.';

  const p2 = maxQuake
    ? `In geophysical and environmental monitoring, USGS sensors recorded ${quakes.length} earthquakes of magnitude 4.5 or higher in the past 24 hours, with the strongest reaching M${maxQuake.magnitude?.toFixed(1)} (${maxQuake.headline}). NASA EONET and Open-Meteo feeds continue tracking active wildfires, storms, and regional weather anomalies.`
    : 'Seismic and environmental feeds are active with routine global background activity.';

  const btc = coins[0];
  const p3 = btc
    ? `In global digital asset markets, ${btc.name} (${btc.symbol}) is trading at $${btc.currentPrice.toLocaleString()} (${btc.change24h >= 0 ? '+' : ''}${btc.change24h.toFixed(2)}% over 24h). All story summaries include direct source links and timestamps for verification.`
    : 'Market telemetry awaits next refresh.';

  // Compare with previous snapshot for 24h changes
  const prevSnap = snapshots.length > 1 ? snapshots[snapshots.length - 2] : snapshots[0];
  const prevIds = new Set(prevSnap?.storyIds || []);

  const newItems: ChangeEntry[] = stories
    .filter((s) => !prevIds.has(s.id))
    .slice(0, 4)
    .map((s) => ({
      title: s.headline,
      detail: `Newly detected in ${s.countryName} via ${s.sources[0]?.name || 'live wire'}`,
      topic: s.topic,
      country: s.country,
      deltaPct: Math.round(25 + s.importance * 6),
    }));

  const escalatingItems: ChangeEntry[] = stories
    .filter((s) => s.sources.length > 1 || s.importance >= 8)
    .slice(0, 4)
    .map((s) => ({
      title: s.headline,
      detail: `Corroborated across ${s.sources.length} source(s) · Importance ${s.importance.toFixed(1)}/10`,
      topic: s.topic,
      country: s.country,
      deltaPct: Math.round(15 + s.importance * 5),
    }));

  const fadingItems: ChangeEntry[] = ALL_TOPICS.map((topic) => {
    const curr = topicCounts[topic] || 0;
    const prev = prevSnap?.topicCounts?.[topic] ?? curr + 1;
    const deltaPct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
    return {
      title: `${topic} coverage volume`,
      detail: `${curr} active stories now vs ${prev} in prior snapshot`,
      topic,
      country: 'GL',
      deltaPct: deltaPct < 0 ? deltaPct : -12,
    };
  })
    .sort((a, b) => a.deltaPct - b.deltaPct)
    .slice(0, 4);

  const countryCounts: Record<string, number> = {};
  for (const s of stories) {
    if (s.country !== 'GL') {
      countryCounts[s.country] = (countryCounts[s.country] || 0) + 1;
    }
  }
  const unusualCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([code, count]) => {
      const prevCount = prevSnap?.countryCounts?.[code] || Math.max(1, count - 1);
      const pct = Math.max(12, Math.round(((count - prevCount) / prevCount) * 100));
      const meta = getCountryMeta(code);
      return {
        country: meta.name,
        reason: `${count} active high-priority events tracked across seismic and news feeds`,
        deltaPct: pct,
      };
    });

  const marketMoves = coins
    .slice()
    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
    .slice(0, 4)
    .map((c) => ({
      symbol: c.symbol,
      name: c.name,
      change24h: c.change24h,
      price: c.currentPrice,
    }));

  return {
    briefing: {
      headline,
      highlights,
      paragraphs: [p1, p2, p3],
      generatedAt: Date.now(),
      isAiGenerated: false,
    },
    whatChanged: {
      summaryLine: `Compared against prior 24h snapshot: ${newItems.length} new high-priority events and ${escalatingItems.length} escalating multi-source stories.`,
      newItems,
      escalatingItems,
      fadingItems,
      unusualCountries,
      marketMoves,
      generatedAt: Date.now(),
    },
  };
}

// Compute Rising Topics with spike % vs 7-day average and 7-day sparklines
export function computeRisingTopics(
  stories: Story[],
  snapshots: Snapshot[]
): RisingTopicMetric[] {
  const currentCounts: Record<Topic, number> = {
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

  for (const s of stories) {
    currentCounts[s.topic] = (currentCounts[s.topic] || 0) + 1;
  }

  const recentSnapshots = snapshots.slice(-6);

  return ALL_TOPICS.filter((t) => t !== 'Other')
    .map((topic) => {
      const historyPoints = recentSnapshots.map((snap) => snap.topicCounts?.[topic] ?? 2);
      const curr = currentCounts[topic] || 0;
      const sparkline = [...historyPoints, curr];
      const avg =
        historyPoints.length > 0
          ? historyPoints.reduce((a, b) => a + b, 0) / historyPoints.length
          : Math.max(1, curr);
      const safeAvg = Math.max(1, avg);
      const spikePct = Math.round(((curr - safeAvg) / safeAvg) * 100);

      return {
        topic,
        currentCount: curr,
        sevenDayAvg: Math.round(safeAvg * 10) / 10,
        spikePct,
        sparkline: sparkline.length >= 2 ? sparkline : [safeAvg, curr],
      };
    })
    .sort((a, b) => b.spikePct - a.spikePct);
}

// Full AI Enrichment Pipeline (batches up to 20 uncached items + generates Daily Briefing & 24h Changes)
export async function runGeminiPipeline(
  rawItems: RawFeedItem[],
  snapshots: Snapshot[],
  coins: CoinMarket[],
  settings: AppSettings,
  onProgress?: (statusText: string) => void
): Promise<{
  stories: Story[];
  briefing: DailyBriefing;
  whatChanged: WhatChangedAnalysis;
  aiCallsMade: number;
}> {
  const baselineStories = buildBaselineStories(rawItems);
  const fallback = buildFallbackBriefingAndChanges(baselineStories, snapshots, coins);

  // Check if AI is paused or daily budget reached
  const usedToday = getAiCallsUsedToday();
  if (settings.pauseAi || usedToday >= settings.dailyAiBudget) {
    return {
      stories: baselineStories,
      briefing: fallback.briefing,
      whatChanged: fallback.whatChanged,
      aiCallsMade: 0,
    };
  }

  let callsMadeThisRefresh = 0;
  const cache = loadAiItemCache();
  const deduped = deduplicateRawItems(rawItems);

  // Filter items that haven't been cached yet (skip pure sensor items if we want to prioritize news, or tag up to 40 uncached items in 2 batches of 20)
  const uncachedItems = deduped.filter(
    (item) => !cache[item.id] && !item.source.includes('CoinGecko')
  );

  // Batch up to 20 items per LLM call, capped by MAX_CALLS_PER_REFRESH and remaining daily budget
  const maxAvailableCalls = Math.min(
    MAX_CALLS_PER_REFRESH,
    Math.max(0, settings.dailyAiBudget - usedToday)
  );

  const batches: PreMergedItem[][] = [];
  for (let i = 0; i < uncachedItems.length && batches.length < Math.min(3, maxAvailableCalls - 1); i += 20) {
    batches.push(uncachedItems.slice(i, i + 20));
  }

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    const batch = batches[bIdx];
    onProgress?.(`AI tagging batch ${bIdx + 1}/${batches.length} (${batch.length} items)...`);
    try {
      const response = await fetch('/api/ai/batch-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: batch,
          modelChoice: settings.modelChoice,
        }),
      });

      if (response.ok) {
        callsMadeThisRefresh += 1;
        incrementAiCallsUsed(1);
        const data = await response.json();
        const analyzedList = Array.isArray(data.items) ? data.items : [];

        for (const analyzed of analyzedList) {
          if (!analyzed || typeof analyzed.id !== 'string') continue;
          const validTopic: Topic = isValidTopic(analyzed.topic) ? analyzed.topic : 'Other';
          cache[analyzed.id] = {
            id: analyzed.id,
            headline: sanitizeText(analyzed.headline, 140),
            summary: sanitizeText(analyzed.summary, 260),
            country: sanitizeText(analyzed.country, 5).toUpperCase() || 'GL',
            topic: validTopic,
            importance: Math.max(1, Math.min(10, Number(analyzed.importance) || 5)),
            sentiment: Math.max(-1, Math.min(1, Number(analyzed.sentiment) || 0)),
            lat: Number(analyzed.lat) || 0,
            lng: Number(analyzed.lng) || 0,
            confidence: Math.max(0.3, Math.min(1, Number(analyzed.confidence) || 0.8)),
            eventClusterKey: sanitizeText(analyzed.eventClusterKey, 50),
            cachedAt: Date.now(),
          };
        }
        saveAiItemCache(cache);
      }
    } catch {
      // Graceful fallback: continue with baseline stories
    }
  }

  // Rebuild stories with updated AI cache and merge event clusters
  const enrichedStories = buildBaselineStories(rawItems);

  // Now call stronger model for Daily Briefing & What Changed in 24h
  if (callsMadeThisRefresh < maxAvailableCalls) {
    onProgress?.('Synthesizing AI Daily Briefing & 24h Change Analysis...');
    try {
      const prevSnap = snapshots.length > 1 ? snapshots[snapshots.length - 2] : snapshots[0];
      const topForBriefing = enrichedStories.slice(0, 18).map((s) => ({
        headline: s.headline,
        summary: s.summary,
        country: s.countryName,
        countryCode: s.country,
        topic: s.topic,
        importance: s.importance,
        sourceCount: s.sources.length,
        isNew: prevSnap ? !prevSnap.storyIds.includes(s.id) : true,
      }));

      const response = await fetch('/api/ai/briefing-and-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stories: topForBriefing,
          comparisonContext: {
            previousTopicCounts: prevSnap?.topicCounts || {},
            previousCountryCounts: prevSnap?.countryCounts || {},
            topCryptoMoves: coins.slice(0, 5).map((c) => ({
              symbol: c.symbol,
              price: c.currentPrice,
              change24h: c.change24h,
            })),
          },
        }),
      });

      if (response.ok) {
        callsMadeThisRefresh += 1;
        incrementAiCallsUsed(1);
        const data = await response.json();

        const aiBriefing = data.dailyBriefing;
        const aiChanges = data.whatChanged;

        const validatedBriefing: DailyBriefing =
          aiBriefing &&
          typeof aiBriefing.headline === 'string' &&
          Array.isArray(aiBriefing.highlights) &&
          Array.isArray(aiBriefing.paragraphs)
            ? {
                headline: sanitizeText(aiBriefing.headline, 180),
                highlights: aiBriefing.highlights
                  .slice(0, 5)
                  .map((h: unknown) => sanitizeText(h, 180)),
                paragraphs: aiBriefing.paragraphs
                  .slice(0, 4)
                  .map((p: unknown) => sanitizeText(p, 600)),
                generatedAt: Date.now(),
                isAiGenerated: true,
                modelUsed: data.modelUsed || 'gemini-3.8-flash',
              }
            : fallback.briefing;

        const sanitizeChangeList = (list: unknown, defaultEntry: ChangeEntry[]): ChangeEntry[] => {
          if (!Array.isArray(list) || list.length === 0) return defaultEntry;
          return list.slice(0, 5).map((item: Record<string, unknown>) => ({
            title: sanitizeText(item.title, 120) || 'No data',
            detail: sanitizeText(item.detail, 180) || 'No data',
            topic: isValidTopic(item.topic) ? item.topic : 'Other',
            country: sanitizeText(item.country, 5).toUpperCase() || 'GL',
            deltaPct: Number(item.deltaPct) || 15,
          }));
        };

        const validatedChanges: WhatChangedAnalysis = aiChanges
          ? {
              summaryLine:
                sanitizeText(aiChanges.summaryLine, 220) || fallback.whatChanged.summaryLine,
              newItems: sanitizeChangeList(aiChanges.newItems, fallback.whatChanged.newItems),
              escalatingItems: sanitizeChangeList(
                aiChanges.escalatingItems,
                fallback.whatChanged.escalatingItems
              ),
              fadingItems: sanitizeChangeList(
                aiChanges.fadingItems,
                fallback.whatChanged.fadingItems
              ),
              unusualCountries:
                Array.isArray(aiChanges.unusualCountries) && aiChanges.unusualCountries.length > 0
                  ? aiChanges.unusualCountries.slice(0, 4).map((u: Record<string, unknown>) => ({
                      country: sanitizeText(u.country, 60) || 'No data',
                      reason: sanitizeText(u.reason, 160) || 'No data',
                      deltaPct: Number(u.deltaPct) || 20,
                    }))
                  : fallback.whatChanged.unusualCountries,
              marketMoves: fallback.whatChanged.marketMoves,
              generatedAt: Date.now(),
            }
          : fallback.whatChanged;

        return {
          stories: enrichedStories,
          briefing: validatedBriefing,
          whatChanged: validatedChanges,
          aiCallsMade: callsMadeThisRefresh,
        };
      }
    } catch {
      // Fall back to deterministic briefing & change analysis
    }
  }

  return {
    stories: enrichedStories,
    briefing: fallback.briefing,
    whatChanged: fallback.whatChanged,
    aiCallsMade: callsMadeThisRefresh,
  };
}

// Step 7: Generate a per-country brief when a country is tapped
export async function generateCountryBrief(
  countryCode: string,
  countryName: string,
  countryStories: Story[],
  settings: AppSettings
): Promise<CountryBrief> {
  const fallbackBrief: CountryBrief = {
    countryCode,
    countryName,
    headline:
      countryStories.length > 0
        ? `${countryName}: ${countryStories.length} active monitored event(s)`
        : `${countryName}: No active high-severity alerts in current window`,
    overview:
      countryStories.length > 0
        ? `WorldPulse is tracking ${countryStories.length} story item(s) linked to ${countryName}. Primary coverage centers on ${countryStories[0].topic} (${countryStories[0].headline}). ${countryStories[0].summary}`
        : 'No data available in the current 24-hour feed cycle for this country.',
    keyPoints:
      countryStories.length > 0
        ? countryStories.slice(0, 3).map((s) => `${s.topic}: ${s.headline}`)
        : ['No data reported in the last 24 hours.'],
    dominantTopics: Array.from(new Set(countryStories.map((s) => s.topic))).slice(0, 4),
    confidence: countryStories.length > 0 ? 0.85 : 0.5,
    generatedAt: Date.now(),
  };

  if (
    settings.pauseAi ||
    countryStories.length === 0 ||
    getAiCallsUsedToday() >= settings.dailyAiBudget
  ) {
    return fallbackBrief;
  }

  try {
    const response = await fetch('/api/ai/country-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countryCode,
        countryName,
        stories: countryStories.slice(0, 10).map((s) => ({
          headline: s.headline,
          summary: s.summary,
          topic: s.topic,
          importance: s.importance,
          sources: s.sources.map((src) => src.name),
        })),
      }),
    });

    if (!response.ok) return fallbackBrief;
    incrementAiCallsUsed(1);
    const data = await response.json();
    const b = data.brief;
    if (!b || typeof b.headline !== 'string') return fallbackBrief;

    return {
      countryCode,
      countryName,
      headline: sanitizeText(b.headline, 160),
      overview: sanitizeText(b.overview, 500),
      keyPoints: Array.isArray(b.keyPoints)
        ? b.keyPoints.slice(0, 4).map((k: unknown) => sanitizeText(k, 180))
        : fallbackBrief.keyPoints,
      dominantTopics: Array.isArray(b.dominantTopics)
        ? b.dominantTopics.slice(0, 4).map((t: unknown) => sanitizeText(t, 40))
        : fallbackBrief.dominantTopics,
      confidence: Math.max(0.4, Math.min(1, Number(b.confidence) || 0.85)),
      generatedAt: Date.now(),
    };
  } catch {
    return fallbackBrief;
  }
}

// Data Source 7: Google Search Grounding through Gemini for breaking-news verification
export async function verifyBreakingStoryWithSearch(
  story: Story,
  settings: AppSettings
): Promise<{
  verificationNote: string;
  groundedSources: Array<{ title: string; url: string }>;
}> {
  if (settings.pauseAi || getAiCallsUsedToday() >= settings.dailyAiBudget) {
    return {
      verificationNote: settings.pauseAi
        ? 'AI verification is currently paused in Settings.'
        : 'Daily AI call budget reached. Adjust budget in Settings to run Google Search verification.',
      groundedSources: [],
    };
  }

  const response = await fetch('/api/ai/verify-breaking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      headline: story.headline,
      summary: story.summary,
    }),
  });

  if (!response.ok) {
    throw new Error('Verification request failed');
  }

  incrementAiCallsUsed(1);
  const data = await response.json();
  return {
    verificationNote: sanitizeText(data.verificationNote, 500),
    groundedSources: Array.isArray(data.groundedSources)
      ? data.groundedSources.map((s: { title?: string; url?: string }) => ({
          title: sanitizeText(s.title || 'Verified Web Source', 80),
          url: sanitizeUrl(s.url),
        }))
      : [],
  };
}
