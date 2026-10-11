/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, WifiOff, X } from 'lucide-react';
import {
  AppSettings,
  CityWeather,
  CoinMarket,
  DailyBriefing,
  Snapshot,
  SourceId,
  SourceStatus,
  Story,
  Topic,
  WhatChangedAnalysis,
  WikiTrend,
} from './types';
import {
  clearAllWorldPulseCache,
  loadPersistedDashboardState,
  loadSettings,
  loadSnapshots,
  savePersistedDashboardState,
  saveSettings,
  saveSnapshot,
} from './services/storage';
import {
  fetchAllWorldSources,
  INITIAL_SOURCE_STATUSES,
} from './services/sources';
import {
  buildBaselineStories,
  buildFallbackBriefingAndChanges,
  computeRisingTopics,
  runGeminiPipeline,
  verifyBreakingStoryWithSearch,
} from './services/llm';
import { getCountryFlag } from './utils/sanitize';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { TopBar } from './components/TopBar';
import { HeroBriefing } from './components/HeroBriefing';
import { WorldMapPanel } from './components/WorldMapPanel';
import { TopTenList } from './components/TopTenList';
import { DisastersPanel } from './components/DisastersPanel';
import { WhatChangedPanel } from './components/WhatChangedPanel';
import { RisingTopicsStrip } from './components/RisingTopicsStrip';
import { MarketsTicker } from './components/MarketsTicker';
import { CountryModal } from './components/CountryModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => loadSnapshots());

  // Load cached state immediately for 0ms first paint
  const initialCached = useMemo(() => loadPersistedDashboardState(), []);

  const [stories, setStories] = useState<Story[]>(initialCached?.stories || []);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(
    initialCached?.briefing || null
  );
  const [whatChanged, setWhatChanged] = useState<WhatChangedAnalysis | null>(
    initialCached?.whatChanged || null
  );
  const [coins, setCoins] = useState<CoinMarket[]>(initialCached?.coins || []);
  const [weather, setWeather] = useState<CityWeather[]>(
    initialCached?.weather || []
  );
  const [wikiTrends, setWikiTrends] = useState<WikiTrend[]>(
    initialCached?.wikiTrends || []
  );
  const [lastUpdated, setLastUpdated] = useState<number | null>(
    initialCached?.lastUpdated || null
  );

  const [sourceStatuses, setSourceStatuses] = useState<Record<SourceId, SourceStatus>>(
    INITIAL_SOURCE_STATUSES
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [aiStatusText, setAiStatusText] = useState<string | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(
    settings.refreshIntervalMinutes * 60
  );

  // Interactive Filters & Selection State
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<'All' | Topic>('All');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [verifyingStoryId, setVerifyingStoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'core'>('all');

  const isOnline = useOnlineStatus();
  const statusesRef = useRef(sourceStatuses);
  statusesRef.current = sourceStatuses;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const snapshotsRef = useRef(snapshots);
  snapshotsRef.current = snapshots;

  // Sync dark/light class on root HTML element
  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }
  }, [settings.theme]);

  // Debounce search query (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim().toLowerCase());
    }, 180);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Core refresh workflow: Fetch public sources -> immediate baseline render -> Gemini AI enrichment
  const performRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setAiStatusText('Fetching live global feeds...');

    try {
      const fetched = await fetchAllWorldSources(statusesRef.current);
      setSourceStatuses(fetched.statuses);
      if (fetched.coins.length > 0) setCoins(fetched.coins);
      if (fetched.weather.length > 0) setWeather(fetched.weather);
      if (fetched.wikiTrends.length > 0) setWikiTrends(fetched.wikiTrends);

      if (fetched.rawItems.length > 0) {
        // Step 1: Immediate baseline render so the user sees live data without waiting on LLM
        const fastStories = buildBaselineStories(fetched.rawItems);
        const fastFallback = buildFallbackBriefingAndChanges(
          fastStories,
          snapshotsRef.current,
          fetched.coins
        );

        setStories(fastStories);
        setBriefing((prev) => prev || fastFallback.briefing);
        setWhatChanged((prev) => prev || fastFallback.whatChanged);
        setLastUpdated(Date.now());

        // Step 2: Run Gemini AI Pipeline in background for tagging, clustering & briefing
        const aiResult = await runGeminiPipeline(
          fetched.rawItems,
          snapshotsRef.current,
          fetched.coins,
          settingsRef.current,
          (progressMsg) => setAiStatusText(progressMsg)
        );

        const now = Date.now();
        setStories(aiResult.stories);
        setBriefing(aiResult.briefing);
        setWhatChanged(aiResult.whatChanged);
        setLastUpdated(now);

        const updatedSnapshots = saveSnapshot(aiResult.stories, fetched.coins);
        setSnapshots(updatedSnapshots);

        savePersistedDashboardState({
          stories: aiResult.stories,
          briefing: aiResult.briefing,
          whatChanged: aiResult.whatChanged,
          coins: fetched.coins,
          weather: fetched.weather,
          wikiTrends: fetched.wikiTrends,
          lastUpdated: now,
        });
      }
    } catch (err) {
      console.error('WorldPulse refresh error:', err);
    } finally {
      setIsRefreshing(false);
      setAiStatusText(null);
      setSecondsUntilRefresh(settingsRef.current.refreshIntervalMinutes * 60);
    }
  }, [isRefreshing]);

  // Trigger initial refresh on first load
  useEffect(() => {
    performRefresh();
  }, []);

  // Auto-refresh countdown timer (pauses when tab is hidden)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          performRefresh();
          return settingsRef.current.refreshIntervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [performRefresh]);

  // Update Settings handler
  const handleUpdateSettings = (updated: AppSettings) => {
    setSettings(updated);
    saveSettings(updated);
    if (updated.refreshIntervalMinutes !== settings.refreshIntervalMinutes) {
      setSecondsUntilRefresh(updated.refreshIntervalMinutes * 60);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    handleUpdateSettings({ ...settings, theme: nextTheme });
  };

  // Filter stories by followed topics/regions, map topic chip, and search query
  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      if (!settings.followedTopics.includes(story.topic)) return false;
      if (
        !settings.followedRegions.includes('All') &&
        !settings.followedRegions.includes(story.region)
      ) {
        return false;
      }
      if (selectedTopicFilter !== 'All' && story.topic !== selectedTopicFilter) {
        return false;
      }
      if (debouncedQuery) {
        const hay = `${story.headline} ${story.summary} ${story.countryName} ${story.country} ${story.topic} ${story.sources.map((s) => s.name).join(' ')}`.toLowerCase();
        if (!hay.includes(debouncedQuery)) return false;
      }
      return true;
    });
  }, [stories, settings.followedTopics, settings.followedRegions, selectedTopicFilter, debouncedQuery]);

  // Compute Rising Topics vs 7-day average
  const risingTopics = useMemo(
    () => computeRisingTopics(stories, snapshots),
    [stories, snapshots]
  );

  // Active countries for quick country bar
  const topCountries = useMemo(() => {
    const counts: Record<string, { code: string; name: string; count: number }> = {};
    for (const s of stories) {
      if (s.country === 'GL') continue;
      if (!counts[s.country]) {
        counts[s.country] = { code: s.country, name: s.countryName, count: 0 };
      }
      counts[s.country].count += 1;
    }
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [stories]);

  // Verify story with Google Search Grounding
  const handleVerifyStory = async (story: Story) => {
    setVerifyingStoryId(story.id);
    try {
      const result = await verifyBreakingStoryWithSearch(story, settings);
      setStories((prev) =>
        prev.map((item) =>
          item.id === story.id
            ? {
                ...item,
                verificationNote: result.verificationNote,
                groundedSources: result.groundedSources,
                confidence: Math.min(0.99, item.confidence + 0.1),
                isDeveloping: false,
              }
            : item
        )
      );
      setSelectedStory((prev) =>
        prev && prev.id === story.id
          ? {
              ...prev,
              verificationNote: result.verificationNote,
              groundedSources: result.groundedSources,
              confidence: Math.min(0.99, prev.confidence + 0.1),
              isDeveloping: false,
            }
          : prev
      );
    } catch {
      // ignore error
    } finally {
      setVerifyingStoryId(null);
    }
  };

  // Export Briefing as .TXT
  const handleExportText = () => {
    if (!briefing) return;
    const lines = [
      '====================================================================',
      'WORLDPULSE — AI DAILY BRIEFING & GLOBAL SITUATION REPORT',
      `Generated: ${new Date(briefing.generatedAt).toUTCString()} (${settings.timezone})`,
      '====================================================================',
      '',
      `HEADLINE: ${briefing.headline}`,
      '',
      'KEY HIGHLIGHTS:',
      ...briefing.highlights.map((h, i) => `  ${i + 1}. ${h}`),
      '',
      'FULL BRIEFING:',
      ...briefing.paragraphs,
      '',
      'TOP 10 ACTIVE EVENTS RIGHT NOW:',
      ...filteredStories.slice(0, 10).map(
        (s, i) =>
          `  ${String(i + 1).padStart(2, '0')}. [${s.country} | ${s.topic} | Impact ${s.importance.toFixed(
            1
          )}] ${s.headline}\n      Summary: ${s.summary}\n      Source: ${s.sources[0]?.url || 'N/A'}`
      ),
      '',
      'Note: Summaries are AI-synthesized from live public feeds. Verify via source links.',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worldpulse-briefing-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleClearCache = () => {
    clearAllWorldPulseCache();
    setSnapshots(loadSnapshots());
    performRefresh();
  };

  const isDark = settings.theme === 'dark';

  return (
    <div
      id="top"
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-[#070B14] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
      }`}
    >
      {/* Top Bar */}
      <TopBar
        settings={settings}
        lastUpdated={lastUpdated}
        secondsUntilRefresh={secondsUntilRefresh}
        isRefreshing={isRefreshing}
        aiStatusText={aiStatusText}
        sourceStatuses={sourceStatuses}
        onManualRefresh={performRefresh}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Offline Banner */}
      {!isOnline && (
        <div
          role="status"
          className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs font-medium text-amber-300 flex items-center justify-center gap-2"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            Offline Mode — Displaying cached snapshot data. Live updates will resume automatically when reconnected.
          </span>
        </div>
      )}

      {/* Main Content Container (1440px max-width, 8px spacing grid) */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Search Bar, Quick Country Jump & View Mode Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 no-print">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search
              className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search stories by keyword, country (e.g. India, Japan, Ukraine) or topic..."
              aria-label="Filter stories by keyword, country or topic"
              className={`w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl border text-xs sm:text-sm transition-colors focus:outline-none focus:border-teal-500 ${
                isDark
                  ? 'bg-[#0F172A]/90 border-slate-800 text-slate-100 placeholder:text-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Clear search query"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Active Country Quick-Tap Strip & View Mode Switcher */}
          <div className="flex items-center justify-between md:justify-end gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5">
              {topCountries.slice(0, 6).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedCountryCode(c.code)}
                  className={`min-h-[40px] px-2.5 py-1.5 rounded-lg border text-xs font-mono-tabular font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isDark
                      ? 'bg-[#0F172A]/80 border-slate-800 hover:border-teal-500/50 text-slate-300'
                      : 'bg-white border-slate-200 hover:border-teal-500 text-slate-700'
                  }`}
                  title={`Open ${c.name} Country Brief (${c.count} active stories)`}
                >
                  <span>{getCountryFlag(c.code)}</span>
                  <span>{c.code}</span>
                  <span className="text-teal-400">{c.count}</span>
                </button>
              ))}
            </div>

            {/* Layout Density Switcher: Full Suite vs Core 5 (First Build) */}
            <div
              role="group"
              aria-label="Dashboard panel density"
              className={`flex items-center gap-1 p-1 rounded-xl border shrink-0 ${
                isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'all'
                    ? isDark
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'bg-white text-slate-900 shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Panels
              </button>
              <button
                type="button"
                onClick={() => setViewMode('core')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'core'
                    ? isDark
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'bg-white text-slate-900 shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Core View
              </button>
            </div>
          </div>
        </div>

        {/* Hero Section: AI Daily Briefing */}
        <HeroBriefing
          briefing={briefing}
          isLoading={isRefreshing && stories.length === 0}
          settings={settings}
          totalStories={filteredStories.length}
          countriesCount={new Set(filteredStories.map((s) => s.country)).size}
          onExportText={handleExportText}
          onPrintPdf={handlePrintPdf}
        />

        {/* Markets Ticker & Rising Topics Strips */}
        {viewMode === 'all' && (
          <div className="space-y-4 no-print">
            <MarketsTicker
              coins={coins}
              wikiTrends={wikiTrends}
              isLoading={isRefreshing && coins.length === 0}
              settings={settings}
            />
            <RisingTopicsStrip
              metrics={risingTopics}
              selectedTopicFilter={selectedTopicFilter}
              onSelectTopic={setSelectedTopicFilter}
              settings={settings}
            />
          </div>
        )}

        {/* Tablet-First 12-Column Responsive Grid: Map Left (7 cols), Top 10 Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (7/12 in landscape): Interactive World Map + Disasters/Earthquakes */}
          <div className="lg:col-span-7 space-y-5">
            <WorldMapPanel
              stories={filteredStories}
              selectedTopicFilter={selectedTopicFilter}
              onSelectTopicFilter={setSelectedTopicFilter}
              selectedStory={selectedStory}
              onSelectStory={setSelectedStory}
              onSelectCountry={(code) => setSelectedCountryCode(code)}
              onVerifyStory={handleVerifyStory}
              verifyingStoryId={verifyingStoryId}
              settings={settings}
            />

            <DisastersPanel
              stories={stories}
              weather={weather}
              isLoading={isRefreshing && stories.length === 0}
              onSelectStory={(story) => setSelectedStory(story)}
              onSelectCountry={(code) => setSelectedCountryCode(code)}
              settings={settings}
            />
          </div>

          {/* Right Column (5/12 in landscape): Top 10 Right Now + Changed in Last 24h */}
          <div className="lg:col-span-5 space-y-5">
            <TopTenList
              stories={filteredStories}
              isLoading={isRefreshing && stories.length === 0}
              selectedStoryId={selectedStory?.id || null}
              onSelectStory={(story) => setSelectedStory(story)}
              onSelectCountry={(code) => setSelectedCountryCode(code)}
              settings={settings}
            />

            {viewMode === 'all' && (
              <WhatChangedPanel
                whatChanged={whatChanged}
                isLoading={isRefreshing && !whatChanged}
                onSelectCountry={(code) => setSelectedCountryCode(code)}
                settings={settings}
              />
            )}
          </div>
        </div>
      </main>

      {/* "How this is made" Footer */}
      <footer
        className={`mt-8 border-t py-6 px-4 sm:px-6 text-xs transition-colors duration-200 no-print ${
          isDark
            ? 'border-slate-800/80 bg-[#070B14] text-slate-400'
            : 'border-slate-200 bg-white text-slate-600'
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <p className="font-semibold text-teal-400">How WorldPulse is made</p>
            <p className="leading-relaxed">
              WorldPulse aggregates live open data from USGS Earthquakes, NASA EONET, GDELT 2.0, CoinGecko, Open-Meteo, Wikimedia, and global news RSS feeds (BBC, Al Jazeera, Reuters). Summaries, topic classifications, and daily briefings are generated by Gemini AI through a server-side proxy and can contain errors or omissions. Always verify critical information using the direct source links provided on every story.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0 font-mono-tabular">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-teal-400 underline underline-offset-4 cursor-pointer"
            >
              Source Health & Settings
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={handleExportText}
              className="hover:text-teal-400 underline underline-offset-4 cursor-pointer"
            >
              Export Briefing
            </button>
          </div>
        </div>
      </footer>

      {/* Country View Modal */}
      <CountryModal
        countryCode={selectedCountryCode}
        stories={stories}
        snapshots={snapshots}
        settings={settings}
        onClose={() => setSelectedCountryCode(null)}
        onSelectStory={(story) => setSelectedStory(story)}
      />

      {/* Settings & Source Status Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        sourceStatuses={sourceStatuses}
        onClearCache={handleClearCache}
        onExportText={handleExportText}
        onPrintPdf={handlePrintPdf}
      />
    </div>
  );
}
