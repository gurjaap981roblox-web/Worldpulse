/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Bookmark,
  Check,
  Code2,
  Copy,
  Database,
  ExternalLink,
  Globe,
  Languages,
  MessageSquare,
  Scale,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Stethoscope,
  Swords,
  UserCheck,
  WifiOff,
  X,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import {
  AppLanguage,
  AppSettings,
  CityWeather,
  CoinMarket,
  CustomAlertRule,
  DailyBriefing,
  DashboardTab,
  ExtraMarketAsset,
  FxRateShift,
  MacroCountryIndicator,
  MapFocusTarget,
  MapStyleMode,
  MobileNavTab,
  Snapshot,
  SourceId,
  SourceStatus,
  Story,
  SupabaseTableState,
  Topic,
  WhatChangedAnalysis,
  WikiTrend,
} from './types';
import {
  clearAllWorldPulseCache,
  loadBookmarks,
  loadCustomAlerts,
  loadPersistedDashboardState,
  loadSettings,
  loadSnapshots,
  saveBookmarks,
  saveCustomAlerts,
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
import {
  fetchFromSupabasePrimary,
  getCurrentSupabaseSession,
  loadAlertsFromSupabase,
  loadBookmarksFromSupabase,
  loadUserFollowsFromSupabase,
  supabase,
  syncAlertsToSupabase,
  syncBookmarkToSupabase,
  syncUserFollowsToSupabase,
} from './services/supabase';
import { getCountryFlag, UI_TRANSLATIONS } from './utils/sanitize';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { TopBar } from './components/TopBar';
import { HeroBriefing } from './components/HeroBriefing';
import { SpeechArchivePanel } from './components/SpeechArchivePanel';
import { WorldMapPanel } from './components/WorldMapPanel';
import { LivePulseSection } from './components/LivePulseSection';
import { TopTenList } from './components/TopTenList';
import { EconomicChangePanel } from './components/EconomicChangePanel';
import { DisastersPanel } from './components/DisastersPanel';
import { WhatChangedPanel } from './components/WhatChangedPanel';
import { RisingTopicsStrip } from './components/RisingTopicsStrip';
import { MarketsTicker } from './components/MarketsTicker';
import { CountryModal } from './components/CountryModal';
import { SettingsModal } from './components/SettingsModal';
import { DomainTabsView } from './components/DomainTabsView';
import {
  AskTheWorldModal,
  CompareCountriesModal,
  DeveloperApiEmbedModal,
  ShareImageCardModal,
  StoryTimelineModal,
} from './components/InteractiveToolsModals';
import { AccountAlertsModal } from './components/AccountAlertsModal';
import { PhoneBottomNav } from './components/PhoneBottomNav';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => loadSnapshots());
  const [bookmarks, setBookmarks] = useState<Story[]>(() => loadBookmarks());
  const [alertRules, setAlertRules] = useState<CustomAlertRule[]>(() => loadCustomAlerts());

  const initialCached = useMemo(() => loadPersistedDashboardState(), []);

  const [stories, setStories] = useState<Story[]>(initialCached?.stories || []);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(
    initialCached?.briefing || null
  );
  const [whatChanged, setWhatChanged] = useState<WhatChangedAnalysis | null>(
    initialCached?.whatChanged || null
  );
  const [coins, setCoins] = useState<CoinMarket[]>(initialCached?.coins || []);
  const [fxRates, setFxRates] = useState<FxRateShift[]>(
    initialCached?.fxRates || []
  );
  const [extraMarkets, setExtraMarkets] = useState<ExtraMarketAsset[]>(
    initialCached?.extraMarkets || []
  );
  const [macroIndicators, setMacroIndicators] = useState<MacroCountryIndicator[]>(
    initialCached?.macroIndicators || []
  );
  const [weather, setWeather] = useState<CityWeather[]>(
    initialCached?.weather || []
  );
  const [wikiTrends, setWikiTrends] = useState<WikiTrend[]>(
    initialCached?.wikiTrends || []
  );
  const [lastUpdated, setLastUpdated] = useState<number | null>(
    initialCached?.lastUpdated || null
  );
  const [minutesAgo, setMinutesAgo] = useState<number>(0);

  // Supabase Primary Table State & Strict Supabase-only arrays for Live Pulse
  const [supabaseStories, setSupabaseStories] = useState<Story[]>([]);
  const [supabaseSnapshots, setSupabaseSnapshots] = useState<Snapshot[]>([]);
  const [supabaseBriefing, setSupabaseBriefing] = useState<DailyBriefing | null>(null);
  const [supabaseState, setSupabaseState] = useState<SupabaseTableState>({
    storiesCount: 0,
    snapshotsCount: 0,
    briefingsCount: 0,
    storiesEmpty: true,
    snapshotsEmpty: true,
    briefingsEmpty: true,
    usingFallback: true,
    lastCheckedAt: null,
    latestDataTimestamp: null,
    acledConfigured: false,
  });
  const [acledInfo, setAcledInfo] = useState<{ configured: boolean; message: string }>({
    configured: false,
    message:
      'ACLED API key not configured — skipping direct ACLED feed. Displaying verified Conflict dispatches from Supabase & global wires.',
  });

  // Supabase User Session
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [sourceStatuses, setSourceStatuses] = useState<Record<SourceId, SourceStatus>>(
    INITIAL_SOURCE_STATUSES
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [aiStatusText, setAiStatusText] = useState<string | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(
    settings.refreshIntervalMinutes * 60
  );

  // Navigation, Tabs, and Filters
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [activeMobileTab, setActiveMobileTab] = useState<MobileNavTab>('home');
  const [punjabOnly, setPunjabOnly] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<'All' | Topic>('All');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleMode>('dark');
  const [mapFocusTarget, setMapFocusTarget] = useState<MapFocusTarget | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [verifyingStoryId, setVerifyingStoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'core'>('all');

  // Interactive Tool Modals State
  const [timelineStory, setTimelineStory] = useState<Story | null>(null);
  const [shareCardStory, setShareCardStory] = useState<Story | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [compareInitialCountry, setCompareInitialCountry] = useState<string>('IN');
  const [isAskWorldOpen, setIsAskWorldOpen] = useState<boolean>(false);
  const [isAccountAlertsOpen, setIsAccountAlertsOpen] = useState<boolean>(false);
  const [isDevApiOpen, setIsDevApiOpen] = useState<boolean>(false);
  const [copiedDeepLink, setCopiedDeepLink] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isOnline = useOnlineStatus();
  const statusesRef = useRef(sourceStatuses);
  statusesRef.current = sourceStatuses;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const snapshotsRef = useRef(snapshots);
  snapshotsRef.current = snapshots;

  // Check if running in Embeddable Top 5 Widget mode (?embed=top5)
  const isEmbedTop5 = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('embed') === 'top5';
  }, []);

  // Parse Deep Links on initial load (?country=IN&topic=Cyber&min_importance=7&tab=india&punjab=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const countryParam = params.get('country');
    const topicParam = params.get('topic') as Topic | null;
    const minImpParam = params.get('min_importance');
    const tabParam = params.get('tab') as DashboardTab | null;
    const punjabParam = params.get('punjab');
    const qParam = params.get('q');

    if (countryParam && countryParam.length === 2) {
      setSelectedCountryCode(countryParam.toUpperCase());
    }
    if (topicParam) {
      setSelectedTopicFilter(topicParam);
    }
    if (minImpParam) {
      const num = Math.max(1, Math.min(10, Number(minImpParam) || 1));
      setSettings((prev) => ({ ...prev, minImportance: num }));
    }
    if (tabParam) {
      setActiveTab(tabParam);
    }
    if (punjabParam === '1') {
      setActiveTab('india');
      setPunjabOnly(true);
    }
    if (qParam) {
      setSearchInput(qParam);
    }
  }, []);

  // Update "Data updated X min ago" counter every 15 seconds
  useEffect(() => {
    const updateCounter = () => {
      if (!lastUpdated) {
        setMinutesAgo(0);
        return;
      }
      const diffMin = Math.max(0, Math.floor((Date.now() - lastUpdated) / 60000));
      setMinutesAgo(diffMin);
    };
    updateCounter();
    const timer = setInterval(updateCounter, 15000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Listen to Supabase Auth session & sync user tables when signed in
  useEffect(() => {
    getCurrentSupabaseSession().then(({ user }) => {
      setCurrentUser(user);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const usr = session?.user || null;
      setCurrentUser(usr);
      if (usr) {
        loadUserFollowsFromSupabase(usr.id).then((follows) => {
          if (follows) {
            setSettings((prev) => {
              const updated = {
                ...prev,
                followedCountries: follows.countries || prev.followedCountries,
                followedTopics: follows.topics || prev.followedTopics,
              };
              saveSettings(updated);
              return updated;
            });
          }
        });
        loadBookmarksFromSupabase(usr.id).then((remoteBookmarks) => {
          if (remoteBookmarks && remoteBookmarks.length > 0) {
            setBookmarks(remoteBookmarks);
            saveBookmarks(remoteBookmarks);
          }
        });
        loadAlertsFromSupabase(usr.id).then((remoteAlerts) => {
          if (remoteAlerts && remoteAlerts.length > 0) {
            setAlertRules(remoteAlerts);
            saveCustomAlerts(remoteAlerts);
          }
        });
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim().toLowerCase());
    }, 180);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Evaluate Custom Alert Rules and fire Web Push / Browser Notification if matched
  const evaluateAlertRules = useCallback(
    (currentStories: Story[], currentCoins: CoinMarket[]) => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
        return;
      }
      for (const rule of alertRules) {
        if (!rule.enabled) continue;
        if (rule.ruleType === 'story') {
          const minImp = rule.minImportance || 8;
          const match = currentStories.find(
            (s) =>
              s.importance >= minImp &&
              (rule.topic === 'All' || !rule.topic || s.topic === rule.topic) &&
              (rule.country === 'ALL' || !rule.country || s.country === rule.country)
          );
          if (match) {
            new Notification(`WorldPulse Alert: ${rule.name}`, {
              body: `[${match.countryName} · Sev ${match.importance.toFixed(1)}] ${match.headline}`,
              icon: '/icon.svg',
            });
            break;
          }
        } else if (rule.ruleType === 'market') {
          const threshold = rule.movePctThreshold || 5;
          const coinMatch = currentCoins.find(
            (c) =>
              c.symbol.toUpperCase() === (rule.assetSymbol || 'BTC').toUpperCase() &&
              Math.abs(c.change24h) >= threshold
          );
          if (coinMatch) {
            new Notification(`WorldPulse Market Alert: ${rule.name}`, {
              body: `${coinMatch.name} (${coinMatch.symbol}) moved ${coinMatch.change24h.toFixed(2)}% in 24h ($${coinMatch.currentPrice.toLocaleString()})`,
              icon: '/icon.svg',
            });
            break;
          }
        }
      }
    },
    [alertRules]
  );

  // Primary Refresh: 1. Read from Supabase first -> 2. Fallback to live fetch if empty/unreachable
  const performRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setAiStatusText('Querying Supabase primary tables...');

    try {
      // Step 1: Query Supabase (stories, snapshots, briefings)
      const sbResult = await fetchFromSupabasePrimary();
      setSupabaseStories(sbResult.stories);
      setSupabaseSnapshots(sbResult.snapshots);
      setSupabaseBriefing(sbResult.briefing);
      setSupabaseState(sbResult.tableState);

      const updatedStatuses: Record<SourceId, SourceStatus> = {
        ...statusesRef.current,
        supabase: {
          id: 'supabase',
          name: 'Supabase Primary Database',
          category: 'Primary DB',
          status: sbResult.tableState.error ? 'warning' : 'ok',
          lastSuccess: Date.now(),
          itemCount: sbResult.stories.length,
          errorMessage: sbResult.tableState.storiesEmpty
            ? 'Table empty — Collecting data, check back soon'
            : sbResult.tableState.error,
        },
      };
      setSourceStatuses(updatedStatuses);

      // Step 2: Always fetch live market tickers, weather, and fallback feeds
      setAiStatusText(
        sbResult.tableState.storiesEmpty
          ? 'Supabase empty — pulling live fallback feeds...'
          : 'Updating global markets & telemetry...'
      );
      const fetched = await fetchAllWorldSources(updatedStatuses);
      setSourceStatuses({
        ...fetched.statuses,
        supabase: updatedStatuses.supabase,
      });

      if (fetched.coins.length > 0) setCoins(fetched.coins);
      if (fetched.fxRates.length > 0) setFxRates(fetched.fxRates);
      if (fetched.extraMarkets.length > 0) setExtraMarkets(fetched.extraMarkets);
      if (fetched.macroIndicators.length > 0) setMacroIndicators(fetched.macroIndicators);
      if (fetched.weather.length > 0) setWeather(fetched.weather);
      if (fetched.wikiTrends.length > 0) setWikiTrends(fetched.wikiTrends);
      setAcledInfo(fetched.acledInfo);

      // If Supabase has stories, use Supabase as primary!
      if (!sbResult.tableState.storiesEmpty && sbResult.stories.length > 0) {
        const now = sbResult.tableState.latestDataTimestamp || Date.now();
        const activeSnaps =
          sbResult.snapshots.length > 0 ? sbResult.snapshots : snapshotsRef.current;
        const fallbackBC = buildFallbackBriefingAndChanges(
          sbResult.stories,
          activeSnaps,
          fetched.coins
        );

        setStories(sbResult.stories);
        setSnapshots(activeSnaps);
        setBriefing(sbResult.briefing || fallbackBC.briefing);
        setWhatChanged(fallbackBC.whatChanged);
        setLastUpdated(now);
        evaluateAlertRules(sbResult.stories, fetched.coins);
      } else if (settingsRef.current.strictSupabaseOnly) {
        // Strict Supabase mode when tables are empty: show "Collecting data, check back soon" without fallback
        setStories([]);
        setBriefing(sbResult.briefing);
        setLastUpdated(Date.now());
      } else if (fetched.rawItems.length > 0) {
        // Fallback to live feeds when Supabase stories table is empty
        const fastStories = buildBaselineStories(fetched.rawItems);
        const fastFallback = buildFallbackBriefingAndChanges(
          fastStories,
          snapshotsRef.current,
          fetched.coins
        );

        setStories(fastStories);
        setBriefing((prev) => sbResult.briefing || prev || fastFallback.briefing);
        setWhatChanged((prev) => prev || fastFallback.whatChanged);
        setLastUpdated(Date.now());

        const aiResult = await runGeminiPipeline(
          fetched.rawItems,
          snapshotsRef.current,
          fetched.coins,
          settingsRef.current,
          (progressMsg) => setAiStatusText(progressMsg)
        );

        const now = Date.now();
        setStories(aiResult.stories);
        setBriefing(sbResult.briefing || aiResult.briefing);
        setWhatChanged(aiResult.whatChanged);
        setLastUpdated(now);

        const updatedSnapshots = saveSnapshot(aiResult.stories, fetched.coins);
        setSnapshots(updatedSnapshots);
        evaluateAlertRules(aiResult.stories, fetched.coins);

        savePersistedDashboardState({
          stories: aiResult.stories,
          briefing: sbResult.briefing || aiResult.briefing,
          whatChanged: aiResult.whatChanged,
          coins: fetched.coins,
          fxRates: fetched.fxRates,
          extraMarkets: fetched.extraMarkets,
          macroIndicators: fetched.macroIndicators,
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
  }, [isRefreshing, evaluateAlertRules]);

  useEffect(() => {
    performRefresh();
  }, []);

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

  const handleToggleFollowCountry = (countryCode: string) => {
    const exists = settings.followedCountries.includes(countryCode);
    const nextCountries = exists
      ? settings.followedCountries.filter((c) => c !== countryCode)
      : [...settings.followedCountries, countryCode];
    const updated = { ...settings, followedCountries: nextCountries };
    handleUpdateSettings(updated);
    if (currentUser) {
      syncUserFollowsToSupabase(currentUser.id, nextCountries, updated.followedTopics);
    }
  };

  const handleToggleFollowTopic = (topic: Topic) => {
    const exists = settings.followedTopics.includes(topic);
    const nextTopics = exists
      ? settings.followedTopics.filter((t) => t !== topic)
      : [...settings.followedTopics, topic];
    const updated = { ...settings, followedTopics: nextTopics };
    handleUpdateSettings(updated);
    if (currentUser) {
      syncUserFollowsToSupabase(currentUser.id, updated.followedCountries, nextTopics);
    }
  };

  const bookmarkedIds = useMemo(
    () => new Set(bookmarks.map((b) => b.id)),
    [bookmarks]
  );

  const handleToggleBookmark = (story: Story) => {
    const isAlreadySaved = bookmarkedIds.has(story.id);
    const updated = isAlreadySaved
      ? bookmarks.filter((b) => b.id !== story.id)
      : [story, ...bookmarks];
    setBookmarks(updated);
    saveBookmarks(updated);
    if (currentUser) {
      syncBookmarkToSupabase(currentUser.id, story, !isAlreadySaved);
    }
  };

  const handleUpdateAlertRules = (rules: CustomAlertRule[]) => {
    setAlertRules(rules);
    saveCustomAlerts(rules);
    if (currentUser) {
      syncAlertsToSupabase(currentUser.id, rules);
    }
  };

  const filteredStories = useMemo(() => {
    const minImp = settings.minImportance || 1;
    return stories.filter((story) => {
      if (story.importance < minImp) return false;
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
      if (selectedCountryFilter && story.country !== selectedCountryFilter) {
        return false;
      }
      if (debouncedQuery) {
        const hay = `${story.headline} ${story.summary} ${story.countryName} ${story.country} ${story.topic} ${story.sources.map((s) => s.name).join(' ')}`.toLowerCase();
        if (!hay.includes(debouncedQuery)) return false;
      }
      return true;
    });
  }, [
    stories,
    settings.minImportance,
    settings.followedTopics,
    settings.followedRegions,
    selectedTopicFilter,
    selectedCountryFilter,
    debouncedQuery,
  ]);

  const risingTopics = useMemo(
    () => computeRisingTopics(stories, snapshots),
    [stories, snapshots]
  );

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
          `  ${String(i + 1).padStart(2, '0')}. [${s.country} | ${s.topic} | Severity ${s.importance.toFixed(
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

  const handleCopyShareableFilterLink = () => {
    const params = new URLSearchParams();
    if (activeTab !== 'overview') params.set('tab', activeTab);
    if (selectedTopicFilter !== 'All') params.set('topic', selectedTopicFilter);
    if (settings.minImportance > 1) params.set('min_importance', String(settings.minImportance));
    if (punjabOnly) params.set('punjab', '1');
    if (searchInput.trim()) params.set('q', searchInput.trim());
    const link = `${window.location.origin}/${params.toString() ? `?${params.toString()}` : ''}`;
    navigator.clipboard?.writeText(link);
    setCopiedDeepLink(true);
    setTimeout(() => setCopiedDeepLink(false), 2000);
  };

  const handleSelectMobileTab = (mTab: MobileNavTab) => {
    setActiveMobileTab(mTab);
    if (mTab === 'home') {
      setActiveTab('overview');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (mTab === 'map') {
      setActiveTab('overview');
      document.getElementById('map-monitor')?.scrollIntoView({ behavior: 'smooth' });
    } else if (mTab === 'changes') {
      setActiveTab('overview');
      document.getElementById('economic-change')?.scrollIntoView({ behavior: 'smooth' });
    } else if (mTab === 'search') {
      searchInputRef.current?.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (mTab === 'saved') {
      setActiveTab('saved');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isDark = settings.theme === 'dark';
  const labels = UI_TRANSLATIONS[settings.language] || UI_TRANSLATIONS.en;

  // Render Embeddable Top 5 Widget when ?embed=top5 is requested
  if (isEmbedTop5) {
    const topFive = stories.slice(0, 5);
    return (
      <div
        className={`min-h-screen p-4 font-sans ${
          isDark ? 'bg-[#090A0D] text-[#F3F2EE]' : 'bg-[#FCFAF5] text-[#181615]'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#222631] pb-2.5 mb-3">
          <div>
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
              LIVE SYNDICATION WIDGET · {labels.updatedAgo} {minutesAgo} {labels.minAgo}
            </span>
            <h1 className="font-editorial text-lg font-bold">WorldPulse Top 5 Global Dispatches</h1>
          </div>
          <a
            href={window.location.origin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono-tabular text-[#E05A2B] hover:underline"
          >
            Open Full Desk ↗
          </a>
        </div>
        {topFive.length === 0 ? (
          <p className="text-xs font-mono-tabular py-8 text-center text-[#8C93A1]">
            {labels.collectingData}
          </p>
        ) : (
          <ol className="divide-y divide-[#222631]">
            {topFive.map((s, idx) => (
              <li key={s.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-[#8C93A1]">
                    <span className="text-[#E05A2B] font-bold">0{idx + 1}</span>
                    <span>{getCountryFlag(s.country)} {s.country}</span>
                    <span>·</span>
                    <span>{s.topic}</span>
                    <span>·</span>
                    <span>Sev {s.importance.toFixed(1)}</span>
                    <span>·</span>
                    <span>{Math.round(s.confidence * 100)}% conf</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold leading-snug">{s.headline}</p>
                </div>
                {s.sources[0] && (
                  <a
                    href={s.sources[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono-tabular text-[#E05A2B] hover:underline shrink-0 inline-flex items-center gap-1"
                  >
                    <span>{s.sources[0].name}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div
      id="top"
      className={`min-h-screen pb-16 md:pb-0 flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-[#090A0D] text-[#F3F2EE]' : 'bg-[#F6F3EC] text-[#181615]'
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

      {/* Supabase Primary Database Status & "Data updated X min ago" Strip */}
      <div
        className={`border-b px-4 sm:px-6 py-2 text-xs font-mono-tabular transition-colors no-print ${
          isDark
            ? 'bg-[#101217] border-[#222631] text-[#8C93A1]'
            : 'bg-[#EFEAE0]/70 border-[#DCD5C7] text-[#666159]'
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#E05A2B] shrink-0" />
            <span className="font-semibold text-[#E05A2B]">
              {labels.updatedAgo} {minutesAgo} {labels.minAgo}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Supabase (<code>stories</code>: {supabaseState.storiesCount}, <code>snapshots</code>: {supabaseState.snapshotsCount}, <code>briefings</code>: {supabaseState.briefingsCount})
            </span>
            {supabaseState.error && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-rose-500 font-semibold">
                  Error: {supabaseState.error}
                </span>
              </>
            )}
            {(supabaseState.storiesEmpty ||
              supabaseState.snapshotsEmpty ||
              supabaseState.briefingsEmpty) && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-500 font-semibold">
                  {labels.collectingData}
                </span>
                <span className="opacity-75">
                  ({settings.strictSupabaseOnly ? 'Strict Supabase Only' : 'Live Feed Fallback Active'})
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Strict Supabase vs Fallback */}
            <button
              type="button"
              onClick={() => {
                const nextStrict = !settings.strictSupabaseOnly;
                handleUpdateSettings({ ...settings, strictSupabaseOnly: nextStrict });
              }}
              className={`px-2 py-0.5 border text-[11px] cursor-pointer transition-colors ${
                settings.strictSupabaseOnly
                  ? 'border-[#E05A2B] bg-[#E05A2B]/15 text-[#E05A2B] font-semibold'
                  : isDark
                  ? 'border-[#222631] hover:border-[#F3F2EE]'
                  : 'border-[#DCD5C7] hover:border-[#181615]'
              }`}
              title="Toggle between strict Supabase-only view and Live Browser Fallback"
            >
              {settings.strictSupabaseOnly ? 'Mode: Supabase Only' : 'Mode: Supabase + Fallback'}
            </button>

            {/* Language Switcher: English, Hindi, Punjabi */}
            <div className="flex items-center border border-[#222631]">
              {(['en', 'hi', 'pa'] as AppLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleUpdateSettings({ ...settings, language: lang })}
                  className={`px-2 py-0.5 text-[11px] cursor-pointer transition-colors ${
                    settings.language === lang
                      ? 'bg-[#E05A2B] text-white font-semibold'
                      : 'hover:text-[#E05A2B]'
                  }`}
                >
                  {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिन्दी' : 'ਪੰਜਾਬੀ'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div
          role="status"
          className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs font-mono-tabular text-amber-400 flex items-center justify-center gap-2"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            Offline Mode — Displaying cached snapshot data. Live updates will resume automatically when reconnected.
          </span>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Section 2: Domain Navigation Tabs + Section 3/4/5/6 Interactive Tool Triggers */}
        <div
          className={`p-2 border flex flex-wrap items-center justify-between gap-2 no-print ${
            isDark ? 'bg-[#101217] border-[#222631]' : 'bg-[#FCFAF5] border-[#DCD5C7]'
          }`}
        >
          {/* Left: Domain Tabs (Overview, All Countries, India + Punjab, Cyber, WHO Health, Conflict ACLED, My Feed, Saved) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-mono-tabular whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#E05A2B] text-white font-semibold'
                  : 'hover:text-[#E05A2B]'
              }`}
            >
              {labels.overview}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('countries')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'countries'
                  ? 'bg-[#E05A2B] text-white font-semibold'
                  : 'hover:text-[#E05A2B]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{labels.countries}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('india')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'india'
                  ? 'bg-[#E05A2B] text-white font-semibold'
                  : 'hover:text-[#E05A2B]'
              }`}
            >
              <span>🇮🇳</span>
              <span>{labels.india}</span>
            </button>

            {/* Direct 1-Tap Punjab Quick Filter Chip */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('india');
                setPunjabOnly((prev) => (activeTab === 'india' ? !prev : true));
              }}
              className={`min-h-[38px] px-2.5 py-1.5 text-xs font-mono-tabular border whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'india' && punjabOnly
                  ? 'border-[#E05A2B] bg-[#E05A2B]/20 text-[#E05A2B] font-semibold'
                  : isDark
                  ? 'border-[#222631] text-[#8C93A1] hover:border-[#E05A2B]'
                  : 'border-[#DCD5C7] text-[#666159] hover:border-[#E05A2B]'
              }`}
              title="Filter India dispatches specifically for Punjab (Chandigarh, Amritsar, Ludhiana, Jalandhar, Patiala)"
            >
              🌾 {labels.punjabFilter}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cyber')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'cyber'
                  ? 'bg-[#E05A2B] text-white font-semibold'
                  : 'hover:text-[#E05A2B]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>{labels.cyber}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('health')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'health'
                  ? 'bg-[#E05A2B] text-white font-semibold'
                  : 'hover:text-[#E05A2B]'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-pink-500" />
              <span>{labels.health}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('conflict')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'conflict'
                  ? 'bg-[#E05A2B] text-white font-semibold'
                  : 'hover:text-[#E05A2B]'
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-rose-500" />
              <span>{labels.conflict}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('myfeed')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-mono-tabular whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'myfeed'
                  ? 'bg-[#E05A2B] text-white font-semibold'
                  : 'hover:text-[#E05A2B]'
              }`}
            >
              {labels.myfeed}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'saved'
                  ? 'bg-[#E05A2B] text-white font-semibold'
                  : 'hover:text-[#E05A2B]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>
                {labels.saved} ({bookmarks.length})
              </span>
            </button>
          </div>

          {/* Right: Interactive Tool Buttons (Ask the World, Compare Countries, Account & Alerts, Dev API) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setIsAskWorldOpen(true)}
              className="min-h-[38px] px-3 py-1.5 bg-[#E05A2B] hover:bg-[#c94b20] text-white text-xs font-mono-tabular font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{labels.askWorld}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCompareOpen(true)}
              className={`min-h-[38px] px-2.5 py-1.5 border text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isDark
                  ? 'border-[#222631] bg-[#090A0D] hover:border-[#E05A2B]'
                  : 'border-[#DCD5C7] bg-[#EFEAE0]/60 hover:border-[#E05A2B]'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-[#E05A2B]" />
              <span>{labels.compareCountries}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAccountAlertsOpen(true)}
              className={`min-h-[38px] px-2.5 py-1.5 border text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isDark
                  ? 'border-[#222631] bg-[#090A0D] hover:border-[#E05A2B]'
                  : 'border-[#DCD5C7] bg-[#EFEAE0]/60 hover:border-[#E05A2B]'
              }`}
            >
              {currentUser ? (
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Bell className="w-3.5 h-3.5 text-[#E05A2B]" />
              )}
              <span>{labels.alertsAndAccount}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDevApiOpen(true)}
              className={`min-h-[38px] px-2.5 py-1.5 border text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isDark
                  ? 'border-[#222631] bg-[#090A0D] hover:border-[#E05A2B]'
                  : 'border-[#DCD5C7] bg-[#EFEAE0]/60 hover:border-[#E05A2B]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-[#E05A2B]" />
              <span>{labels.devApi}</span>
            </button>
          </div>
        </div>

        {/* Search Bar, Importance Slider ("Show 7+ only"), Active Country Dossiers & Deep Link Copy */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 no-print">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                }`}
              />
              <input
                ref={searchInputRef}
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Filter by keyword, country (e.g. India, Punjab, Ukraine) or topic..."
                aria-label="Filter stories by keyword, country or topic"
                className={`w-full min-h-[44px] pl-10 pr-9 py-2 border text-xs sm:text-sm font-mono-tabular transition-colors focus:outline-none focus:border-[#E05A2B] ${
                  isDark
                    ? 'bg-[#101217] border-[#222631] text-[#F3F2EE] placeholder:text-[#8C93A1]/70'
                    : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615] placeholder:text-[#666159]/70'
                }`}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label="Clear search query"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8C93A1] hover:text-[#E05A2B] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Importance Slider ("Show 7+ only") */}
            <div
              className={`min-h-[44px] px-3 py-1.5 border flex items-center gap-3 text-xs font-mono-tabular shrink-0 ${
                isDark ? 'bg-[#101217] border-[#222631]' : 'bg-[#FCFAF5] border-[#DCD5C7]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#E05A2B] shrink-0" />
              <label htmlFor="importance-slider" className="whitespace-nowrap">
                {labels.minImportance}: <strong className="text-[#E05A2B]">{settings.minImportance}+</strong>
              </label>
              <input
                id="importance-slider"
                type="range"
                min={1}
                max={9}
                step={1}
                value={settings.minImportance}
                onChange={(e) =>
                  handleUpdateSettings({ ...settings, minImportance: Number(e.target.value) })
                }
                className="w-20 accent-[#E05A2B] cursor-pointer"
              />
              <button
                type="button"
                onClick={() =>
                  handleUpdateSettings({
                    ...settings,
                    minImportance: settings.minImportance === 7 ? 1 : 7,
                  })
                }
                className={`px-2 py-1 border text-[11px] cursor-pointer transition-colors ${
                  settings.minImportance >= 7
                    ? 'bg-[#E05A2B] border-[#E05A2B] text-white font-semibold'
                    : isDark
                    ? 'border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                    : 'border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
                }`}
              >
                {labels.show7Plus}
              </button>
            </div>
          </div>

          {/* Active Country Dossier Strip, Shareable Deep Link & View Switcher */}
          <div className="flex items-center justify-between xl:justify-end gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1">
              {topCountries.slice(0, 5).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedCountryCode(c.code)}
                  className={`min-h-[40px] px-2.5 py-1.5 border text-xs font-mono-tabular font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isDark
                      ? 'bg-[#101217] border-[#222631] hover:border-[#F3F2EE] text-[#F3F2EE]'
                      : 'bg-[#FCFAF5] border-[#DCD5C7] hover:border-[#181615] text-[#181615]'
                  }`}
                  title={`Open ${c.name} Country Dossier (${c.count} active dispatches)`}
                >
                  <span>{getCountryFlag(c.code)}</span>
                  <span>{c.code}</span>
                  <span className="text-[#E05A2B] font-semibold">{c.count}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopyShareableFilterLink}
              className={`min-h-[40px] px-2.5 py-1.5 border text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-[#101217] border-[#222631] hover:border-[#E05A2B]'
                  : 'bg-[#FCFAF5] border-[#DCD5C7] hover:border-[#E05A2B]'
              }`}
              title="Copy shareable deep link for current tab and filters"
            >
              {copiedDeepLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#E05A2B]" />
              )}
              <span>{copiedDeepLink ? 'Copied Link' : 'Deep Link'}</span>
            </button>

            <div
              role="group"
              aria-label="Dashboard panel density"
              className={`flex items-center border shrink-0 ${
                isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0] border-[#DCD5C7]'
              }`}
            >
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`min-h-[40px] px-3 py-1.5 text-xs font-mono-tabular transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'all'
                    ? isDark
                      ? 'bg-[#F3F2EE] text-[#090A0D] font-semibold'
                      : 'bg-[#181615] text-[#FCFAF5] font-semibold'
                    : isDark
                    ? 'text-[#8C93A1] hover:text-[#F3F2EE]'
                    : 'text-[#666159] hover:text-[#181615]'
                }`}
              >
                Full Desk
              </button>
              <button
                type="button"
                onClick={() => setViewMode('core')}
                className={`min-h-[40px] px-3 py-1.5 text-xs font-mono-tabular transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'core'
                    ? isDark
                      ? 'bg-[#F3F2EE] text-[#090A0D] font-semibold'
                      : 'bg-[#181615] text-[#FCFAF5] font-semibold'
                    : isDark
                    ? 'text-[#8C93A1] hover:text-[#F3F2EE]'
                    : 'text-[#666159] hover:text-[#181615]'
                }`}
              >
                Core View
              </button>
            </div>
          </div>
        </div>

        {/* Specialized Domain Tab View when a tab other than Overview is active */}
        <DomainTabsView
          activeTab={activeTab}
          stories={stories}
          bookmarks={bookmarks}
          bookmarkedIds={bookmarkedIds}
          acledInfo={acledInfo}
          punjabOnly={punjabOnly}
          onTogglePunjabOnly={setPunjabOnly}
          onSelectStory={(story) => setSelectedStory(story)}
          onSelectCountry={(code) => setSelectedCountryCode(code)}
          onToggleFollowCountry={handleToggleFollowCountry}
          onToggleFollowTopic={handleToggleFollowTopic}
          onToggleBookmark={handleToggleBookmark}
          onOpenTimeline={(story) => setTimelineStory(story)}
          onShareStoryCard={(story) => setShareCardStory(story)}
          onCompareCountry={(code) => {
            setCompareInitialCountry(code);
            setIsCompareOpen(true);
          }}
          settings={settings}
        />

        {/* Live Sovereign FX, Stock Indices, Gold, Oil, Crypto Markets & Wikipedia Tape */}
        {viewMode === 'all' && (
          <div className="space-y-3 no-print">
            <MarketsTicker
              coins={coins}
              fxRates={fxRates}
              extraMarkets={extraMarkets}
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

        {/* Section 01: Hero AI Daily Briefing (with Voice Briefing) */}
        <HeroBriefing
          briefing={briefing}
          isLoading={isRefreshing && stories.length === 0}
          settings={settings}
          totalStories={filteredStories.length}
          countriesCount={new Set(filteredStories.map((s) => s.country)).size}
          onExportText={handleExportText}
          onPrintPdf={handlePrintPdf}
        />

        {/* Diplomatic & Public Address Speech Summarizer (Ask When & Where) */}
        <SpeechArchivePanel
          stories={stories}
          settings={settings}
        />

        {/* Tablet-First 12-Column Architectural Grid (All Existing Panels Preserved) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (7/12): Map Monitor + Live Pulse + Economic & FX Change + Disasters */}
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
              mapStyle={mapStyle}
              onChangeMapStyle={setMapStyle}
              mapFocusTarget={mapFocusTarget}
              selectedCountryFilter={selectedCountryFilter}
              onClearCountryFilter={() => setSelectedCountryFilter(null)}
            />

            <LivePulseSection
              supabaseStories={supabaseStories}
              supabaseSnapshots={supabaseSnapshots}
              supabaseBriefing={supabaseBriefing}
              supabaseState={supabaseState}
              isLoading={isRefreshing && supabaseState.lastCheckedAt === null}
              selectedTopicFilter={selectedTopicFilter}
              onSelectTopicFilter={setSelectedTopicFilter}
              selectedCountryFilter={selectedCountryFilter}
              onSelectCountryFilter={setSelectedCountryFilter}
              onSelectStory={(story) => setSelectedStory(story)}
              onPanMap={(target) => setMapFocusTarget(target)}
              mapStyle={mapStyle}
              onChangeMapStyle={setMapStyle}
              settings={settings}
            />

            <EconomicChangePanel
              fxRates={fxRates}
              macroIndicators={macroIndicators}
              coins={coins}
              stories={stories}
              isLoading={isRefreshing && fxRates.length === 0}
              onSelectCountry={(code) => setSelectedCountryCode(code)}
              onSelectStory={(story) => setSelectedStory(story)}
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

          {/* Right Column (5/12): Top 10 Dispatches + Changed in Last 24h */}
          <div className="lg:col-span-5 space-y-5">
            <TopTenList
              stories={filteredStories}
              isLoading={isRefreshing && stories.length === 0}
              selectedStoryId={selectedStory?.id || null}
              onSelectStory={(story) => setSelectedStory(story)}
              onSelectCountry={(code) => setSelectedCountryCode(code)}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              onOpenTimeline={(story) => setTimelineStory(story)}
              onShareStoryCard={(story) => setShareCardStory(story)}
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

      {/* "How this is made" Institutional Colophon Footer */}
      <footer
        className={`mt-10 border-t py-6 px-4 sm:px-6 text-xs transition-colors duration-200 no-print ${
          isDark
            ? 'border-[#222631] bg-[#090A0D] text-[#8C93A1]'
            : 'border-[#DCD5C7] bg-[#EFEAE0]/50 text-[#666159]'
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <p className="font-mono-tabular uppercase tracking-wider font-semibold text-[#E05A2B]">
              Colophon &amp; Methodology — How WorldPulse is Made
            </p>
            <p className="leading-relaxed">
              WorldPulse reads primary global intelligence from Supabase (<code>stories</code>, <code>snapshots</code>, <code>briefings</code>) with automatic fallback to live public feeds (USGS Earthquakes, NASA EONET, WHO Disease Outbreaks, Cyber Threat Advisories, ECB FX, World Bank, CoinGecko, Open-Meteo, Wikimedia, and BBC / Al Jazeera / Reuters / India &amp; Punjab RSS wires). All AI synthesis, "Ask the World" grounding, and Hindi/Punjabi translations run through our server-side Gemini proxy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0 font-mono-tabular">
            <button
              type="button"
              onClick={() => setIsAccountAlertsOpen(true)}
              className="hover:text-[#E05A2B] underline underline-offset-4 cursor-pointer"
            >
              Supabase Auth &amp; RLS SQL
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsDevApiOpen(true)}
              className="hover:text-[#E05A2B] underline underline-offset-4 cursor-pointer"
            >
              Developer API &amp; Widget
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-[#E05A2B] underline underline-offset-4 cursor-pointer"
            >
              Source Health &amp; Settings
            </button>
          </div>
        </div>
      </footer>

      {/* Phone Bottom Navigation Bar (Home, Map, Changes, Search, Saved) */}
      <PhoneBottomNav
        activeMobileTab={activeMobileTab}
        savedCount={bookmarks.length}
        onSelectMobileTab={handleSelectMobileTab}
        settings={settings}
      />

      {/* Country View Modal */}
      <CountryModal
        countryCode={selectedCountryCode}
        stories={stories}
        snapshots={snapshots}
        settings={settings}
        onClose={() => setSelectedCountryCode(null)}
        onSelectStory={(story) => setSelectedStory(story)}
      />

      {/* Story Timeline Modal */}
      <StoryTimelineModal
        story={timelineStory}
        allStories={stories}
        snapshots={snapshots}
        settings={settings}
        onClose={() => setTimelineStory(null)}
        onSelectStory={(story) => setSelectedStory(story)}
      />

      {/* Compare Two Countries Side-by-Side Modal */}
      <CompareCountriesModal
        isOpen={isCompareOpen}
        initialCountryA={compareInitialCountry}
        initialCountryB={compareInitialCountry === 'IN' ? 'US' : 'IN'}
        stories={stories}
        macroIndicators={macroIndicators}
        fxRates={fxRates}
        snapshots={snapshots}
        settings={settings}
        onClose={() => setIsCompareOpen(false)}
        onSelectStory={(story) => setSelectedStory(story)}
      />

      {/* Share Story as Image Card Modal */}
      <ShareImageCardModal
        story={shareCardStory}
        settings={settings}
        onClose={() => setShareCardStory(null)}
      />

      {/* "Ask the World" Grounded Chat Modal */}
      <AskTheWorldModal
        isOpen={isAskWorldOpen}
        stories={stories}
        settings={settings}
        onClose={() => setIsAskWorldOpen(false)}
        onSelectStory={(story) => setSelectedStory(story)}
      />

      {/* Accounts, Custom Alerts, Web Push & RLS SQL Modal */}
      <AccountAlertsModal
        isOpen={isAccountAlertsOpen}
        onClose={() => setIsAccountAlertsOpen(false)}
        user={currentUser}
        alertRules={alertRules}
        onUpdateAlertRules={handleUpdateAlertRules}
        settings={settings}
      />

      {/* Public Read-Only Developer API & Embeddable Top 5 Widget Modal */}
      <DeveloperApiEmbedModal
        isOpen={isDevApiOpen}
        stories={stories}
        settings={settings}
        onClose={() => setIsDevApiOpen(false)}
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
