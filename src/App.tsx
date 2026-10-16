/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Bookmark,
  Check,
  Code2,
  Copy,
  Database,
  ExternalLink,
  Globe,
  Home,
  MessageSquare,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Swords,
  RefreshCw,
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
  CookieConsentChoice,
  CustomAlertRule,
  DailyBriefing,
  DashboardTab,
  DateRangeFilter,
  ExtraMarketAsset,
  FxRateShift,
  LegalPageId,
  MacroCountryIndicator,
  MapFocusTarget,
  MapStyleMode,
  MobileNavTab,
  SavedFilterPreset,
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
  hasCompletedOnboardingTour,
  hasEnteredAppBefore,
  loadBookmarks,
  loadCookieConsent,
  loadCustomAlerts,
  loadFilterPresets,
  loadPersistedDashboardState,
  loadSettings,
  loadSnapshots,
  markEnteredApp,
  saveBookmarks,
  saveCookieConsent,
  saveCustomAlerts,
  saveFilterPresets,
  savePersistedDashboardState,
  saveSettings,
  saveSnapshot,
  setOnboardingTourCompleted,
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
  convertSnapshotMarketsToCoins,
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
import {
  evaluateSearchQuery,
  getCountryFlag,
  UI_TRANSLATIONS,
} from './utils/sanitize';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { usePWAUpdate } from './hooks/usePWAUpdate';
import { TopBar } from './components/TopBar';
import { HeroBriefing } from './components/HeroBriefing';
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
import {
  CookieConsentBanner,
  FirstVisitOnboardingTour,
  LEGAL_HASH_TO_ID,
  LegalFooterLinks,
} from './components/LegalTrustCenter';
import { SearchAndFilterBar } from './components/SearchAndFilterBar';
import { LandingPage } from './components/LandingPage';

// Speed Requirement 6: Code-split heavy panels with React.lazy and Suspense
const SpeechArchivePanel = lazy(() =>
  import('./components/SpeechArchivePanel').then((m) => ({ default: m.SpeechArchivePanel }))
);
const WorldMapPanel = lazy(() =>
  import('./components/WorldMapPanel').then((m) => ({ default: m.WorldMapPanel }))
);
const LegalTrustModal = lazy(() =>
  import('./components/LegalTrustModal').then((m) => ({ default: m.LegalTrustModal }))
);

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => loadSnapshots());
  const [bookmarks, setBookmarks] = useState<Story[]>(() => loadBookmarks());
  const [alertRules, setAlertRules] = useState<CustomAlertRule[]>(() => loadCustomAlerts());
  const [filterPresets, setFilterPresets] = useState<SavedFilterPreset[]>(() =>
    loadFilterPresets()
  );
  const [cookieConsent, setCookieConsent] = useState<CookieConsentChoice | null>(() =>
    loadCookieConsent()
  );
  const [showOnboardingTour, setShowOnboardingTour] = useState<boolean>(
    () => !hasCompletedOnboardingTour()
  );

  // Determine whether to show the Landing Page (/) or Main App (/app)
  // Requirement 1: Always show the landing page at / for everyone (remove the "returning visitor skips it" shortcut). The dashboard is only at /app.
  const [showLandingPage, setShowLandingPage] = useState<boolean>(() => {
    try {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (
        path.startsWith('/app') ||
        params.has('embed') ||
        params.has('country') ||
        params.has('topic') ||
        params.has('tab') ||
        params.has('punjab') ||
        params.has('q')
      ) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  });

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
  const { needRefresh, reloadToUpdate } = usePWAUpdate();

  // Supabase Primary Table State & Strict Supabase-only arrays for Live Pulse
  const [supabaseStories, setSupabaseStories] = useState<Story[]>([]);
  const [supabaseSnapshots, setSupabaseSnapshots] = useState<Snapshot[]>([]);

  // Markets ticker coins: prioritize Supabase snapshot coins (BNB, BTC, ETH, SOL, all coins present), only use fallback when Supabase has none
  const activeCoins = useMemo(() => {
    const snap =
      supabaseSnapshots.length > 0
        ? supabaseSnapshots[0]
        : snapshots.length > 0
        ? snapshots[0]
        : null;
    if (snap) {
      const sbCoins = convertSnapshotMarketsToCoins(snap);
      if (sbCoins.length > 0) return sbCoins;
    }
    return coins;
  }, [supabaseSnapshots, snapshots, coins]);

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
  const [activeMobileTab, setActiveMobileTab] = useState<MobileNavTab>('briefing');
  const [showMobileMoreDrawer, setShowMobileMoreDrawer] = useState<boolean>(false);
  const [punjabOnly, setPunjabOnly] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('24h');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<'All' | Topic>('All');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleMode>('dark');
  const [mapFocusTarget, setMapFocusTarget] = useState<MapFocusTarget | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [verifyingStoryId, setVerifyingStoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'core'>('all');

  // Legal & Trust Modal State (supports #privacy, #terms, etc.)
  const [activeLegalPage, setActiveLegalPage] = useState<LegalPageId | null>(null);

  // Interactive Tool Modals State
  const [timelineStory, setTimelineStory] = useState<Story | null>(null);
  const [shareCardStory, setShareCardStory] = useState<Story | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [compareInitialCountry, setCompareInitialCountry] = useState<string>('IN');
  const [isAskWorldOpen, setIsAskWorldOpen] = useState<boolean>(false);
  const [askWorldInitialQuestion, setAskWorldInitialQuestion] = useState<string | undefined>(
    undefined
  );
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

  // Listen to URL hash changes for Legal & Trust pages (#privacy, #terms, etc.) and popstate for / vs /app
  useEffect(() => {
    const checkHashAndPath = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash && LEGAL_HASH_TO_ID[hash]) {
        setActiveLegalPage(LEGAL_HASH_TO_ID[hash]);
      }
      if (window.location.pathname.startsWith('/app')) {
        setShowLandingPage(false);
      }
    };
    checkHashAndPath();
    window.addEventListener('hashchange', checkHashAndPath);
    window.addEventListener('popstate', checkHashAndPath);
    return () => {
      window.removeEventListener('hashchange', checkHashAndPath);
      window.removeEventListener('popstate', checkHashAndPath);
    };
  }, []);

  const handleOpenLegalPage = (page: LegalPageId) => {
    setActiveLegalPage(page);
    try {
      window.history.replaceState(null, '', `#${page}`);
    } catch {
      // ignore history errors in sandboxed iframes
    }
  };

  const handleCloseLegalPage = () => {
    setActiveLegalPage(null);
    try {
      if (window.location.hash && LEGAL_HASH_TO_ID[window.location.hash.toLowerCase()]) {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search
        );
      }
    } catch {
      // ignore
    }
  };

  const handleEnterAppFromLanding = (initialQuestion?: string) => {
    markEnteredApp();
    setShowLandingPage(false);
    try {
      if (!window.location.pathname.startsWith('/app')) {
        window.history.pushState(null, '', '/app' + window.location.search);
      }
    } catch {
      // ignore history errors in iframe
    }
    if (initialQuestion && initialQuestion.trim()) {
      setAskWorldInitialQuestion(initialQuestion.trim());
      setIsAskWorldOpen(true);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGoToLanding = () => {
    setShowLandingPage(true);
    try {
      window.history.pushState(null, '', '/');
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  // Apply Theme, Font Size, High Contrast, Dyslexia Font, Reduce Motion, and Lite Mode classes on <html>
  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }

    html.classList.remove(
      'wp-font-small',
      'wp-font-normal',
      'wp-font-large',
      'wp-font-xlarge'
    );
    html.classList.add(`wp-font-${settings.fontSize || 'normal'}`);

    html.classList.toggle('wp-high-contrast', Boolean(settings.highContrast));
    html.classList.toggle('wp-dyslexia-font', Boolean(settings.dyslexiaFont));
    html.classList.toggle('wp-reduce-motion', Boolean(settings.reduceMotion));
    html.classList.toggle('wp-lite-mode', Boolean(settings.liteMode));
  }, [
    settings.theme,
    settings.fontSize,
    settings.highContrast,
    settings.dyslexiaFont,
    settings.reduceMotion,
    settings.liteMode,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 160);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Requirement 16: Keyboard shortcuts: "/" to focus search, and "Esc" to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      const isInputActive = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape') {
        if (selectedCountryCode) {
          setSelectedCountryCode(null);
        } else if (selectedStory) {
          setSelectedStory(null);
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (activeLegalPage) {
          handleCloseLegalPage();
        } else if (timelineStory) {
          setTimelineStory(null);
        } else if (shareCardStory) {
          setShareCardStory(null);
        } else if (isCompareOpen) {
          setIsCompareOpen(false);
        } else if (isAskWorldOpen) {
          setIsAskWorldOpen(false);
        } else if (isAccountAlertsOpen) {
          setIsAccountAlertsOpen(false);
        } else if (isDevApiOpen) {
          setIsDevApiOpen(false);
        } else if (showMobileMoreDrawer) {
          setShowMobileMoreDrawer(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedCountryCode,
    selectedStory,
    isSettingsOpen,
    activeLegalPage,
    timelineStory,
    shareCardStory,
    isCompareOpen,
    isAskWorldOpen,
    isAccountAlertsOpen,
    isDevApiOpen,
    showMobileMoreDrawer,
  ]);

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

      // Markets data: prioritize Supabase snapshot coins (BNB, BTC, ETH, SOL, all coins present), only use fallback when Supabase has none
      const activeSnapshotCoins =
        sbResult.coins && sbResult.coins.length > 0
          ? sbResult.coins
          : fetched.coins;
      if (activeSnapshotCoins.length > 0) setCoins(activeSnapshotCoins);
      if (fetched.fxRates.length > 0) setFxRates(fetched.fxRates);
      if (fetched.extraMarkets.length > 0) setExtraMarkets(fetched.extraMarkets);
      if (fetched.macroIndicators.length > 0) setMacroIndicators(fetched.macroIndicators);
      if (fetched.weather.length > 0) setWeather(fetched.weather);
      if (fetched.wikiTrends.length > 0) setWikiTrends(fetched.wikiTrends);
      setAcledInfo(fetched.acledInfo);

      // If Supabase has stories, use Supabase as primary!
      const newestSnapshotTime =
        sbResult.newestSnapshotTakenAt ||
        (sbResult.snapshots.length > 0 ? (sbResult.snapshots[0].takenAt || sbResult.snapshots[0].timestamp) : null) ||
        (snapshotsRef.current.length > 0 ? (snapshotsRef.current[0].takenAt || snapshotsRef.current[0].timestamp) : null);

      if (!sbResult.tableState.storiesEmpty && sbResult.stories.length > 0) {
        const activeSnaps =
          sbResult.snapshots.length > 0 ? sbResult.snapshots : snapshotsRef.current;
        const fallbackBC = buildFallbackBriefingAndChanges(
          sbResult.stories,
          activeSnaps,
          activeSnapshotCoins
        );

        setStories(sbResult.stories);
        setSnapshots(activeSnaps);
        setBriefing(sbResult.briefing || fallbackBC.briefing);
        setWhatChanged(fallbackBC.whatChanged);
        setLastUpdated(newestSnapshotTime || sbResult.tableState.latestDataTimestamp || Date.now());
        evaluateAlertRules(sbResult.stories, activeSnapshotCoins);

        savePersistedDashboardState({
          stories: sbResult.stories,
          briefing: sbResult.briefing || fallbackBC.briefing,
          whatChanged: fallbackBC.whatChanged,
          coins: activeSnapshotCoins,
          fxRates: fetched.fxRates,
          extraMarkets: fetched.extraMarkets,
          macroIndicators: fetched.macroIndicators,
          weather: fetched.weather,
          wikiTrends: fetched.wikiTrends,
          lastUpdated: newestSnapshotTime || Date.now(),
        });
      } else if (settingsRef.current.strictSupabaseOnly) {
        setStories([]);
        setBriefing(sbResult.briefing);
        setLastUpdated(newestSnapshotTime || Date.now());
      } else if (fetched.rawItems.length > 0) {
        const fastStories = buildBaselineStories(fetched.rawItems);
        const fastFallback = buildFallbackBriefingAndChanges(
          fastStories,
          snapshotsRef.current,
          fetched.coins
        );

        setStories(fastStories);
        setBriefing((prev) => sbResult.briefing || prev || fastFallback.briefing);
        setWhatChanged((prev) => prev || fastFallback.whatChanged);
        setLastUpdated(newestSnapshotTime || Date.now());

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
        setLastUpdated(newestSnapshotTime || now);

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

  // Requirement 8: Re-fetch when the tab becomes visible again (visibilitychange event)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performRefresh();
        setSecondsUntilRefresh(settingsRef.current.refreshIntervalMinutes * 60);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

  const handleSaveFilterPreset = (preset: SavedFilterPreset) => {
    const updated = [preset, ...filterPresets].slice(0, 12);
    setFilterPresets(updated);
    saveFilterPresets(updated);
  };

  const handleDeleteFilterPreset = (id: string) => {
    const updated = filterPresets.filter((p) => p.id !== id);
    setFilterPresets(updated);
    saveFilterPresets(updated);
  };

  const handleApplyFilterPreset = (preset: SavedFilterPreset) => {
    setSearchInput(preset.query || '');
    setSelectedTopicFilter(preset.topic || 'All');
    setSelectedCountryFilter(preset.country || null);
    setDateRangeFilter(preset.dateRange || '24h');
    if (preset.minImportance) {
      handleUpdateSettings({ ...settings, minImportance: preset.minImportance });
    }
  };

  const handleClearAllFilters = () => {
    setSearchInput('');
    setDebouncedQuery('');
    setSelectedTopicFilter('All');
    setSelectedCountryFilter(null);
    setDateRangeFilter('24h');
    setPunjabOnly(false);
    if (settings.minImportance > 1) {
      handleUpdateSettings({ ...settings, minImportance: 1 });
    }
  };

  const filteredStories = useMemo(() => {
    const minImp = settings.minImportance || 1;
    const now = Date.now();
    const maxAgeMs =
      dateRangeFilter === '24h'
        ? 24 * 3600 * 1000
        : dateRangeFilter === '7d'
        ? 7 * 24 * 3600 * 1000
        : 30 * 24 * 3600 * 1000;

    return stories.filter((story) => {
      if (story.importance < minImp) return false;
      const storyTime = (story as any).publishedAt || story.time;
      if (storyTime && now - storyTime > maxAgeMs) {
        return false;
      }
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
        if (!evaluateSearchQuery(story, debouncedQuery)) return false;
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
    dateRangeFilter,
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

  const handleExportMarkdown = () => {
    if (!briefing) return;
    const lines = [
      `# WorldPulse — AI Daily Briefing & Global Situation Report`,
      `**Generated:** ${new Date(briefing.generatedAt).toUTCString()} (${settings.timezone})`,
      '',
      `## ${briefing.headline}`,
      '',
      `### Key Highlights`,
      ...briefing.highlights.map((h) => `- ${h}`),
      '',
      `### Full Executive Synthesis`,
      ...briefing.paragraphs.map((p) => `${p}\n`),
      `### Top 10 Active Dispatches`,
      ...filteredStories.slice(0, 10).map(
        (s, i) =>
          `${i + 1}. **[${s.country} · ${s.topic} · Sev ${s.importance.toFixed(1)}] ${
            s.headline
          }**\n   - ${s.summary}\n   - Source: [${s.sources[0]?.name || 'Link'}](${
            s.sources[0]?.url || '#'
          })`
      ),
      '',
      `---`,
      `*AI-generated summary from verified public sources. Verify original reporting before making decisions.*`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worldpulse-briefing-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = [
      'rank',
      'id',
      'country',
      'country_name',
      'topic',
      'importance',
      'confidence',
      'sentiment',
      'published_at',
      'headline',
      'summary',
      'primary_source',
      'primary_url',
    ];
    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };
    const rows = filteredStories.map((s, idx) =>
      [
        idx + 1,
        s.id,
        s.country,
        s.countryName,
        s.topic,
        s.importance.toFixed(1),
        Math.round(s.confidence * 100) + '%',
        s.sentiment.toFixed(2),
        new Date((s as any).publishedAt || s.time).toISOString(),
        s.headline,
        s.summary,
        s.sources[0]?.name || '',
        s.sources[0]?.url || '',
      ]
        .map(escapeCsv)
        .join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worldpulse-stories-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  // Requirement 9: "Clear app cache and reload", unregistering SW, clearing caches and reloading
  const handleClearCache = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
      clearAllWorldPulseCache();
    } catch (err) {
      console.warn('Error clearing caches:', err);
    } finally {
      window.location.reload();
    }
  };

  const handleCopyShareableFilterLink = () => {
    const params = new URLSearchParams();
    if (activeTab !== 'overview') params.set('tab', activeTab);
    if (selectedTopicFilter !== 'All') params.set('topic', selectedTopicFilter);
    if (settings.minImportance > 1) params.set('min_importance', String(settings.minImportance));
    if (punjabOnly) params.set('punjab', '1');
    if (searchInput.trim()) params.set('q', searchInput.trim());
    const link = `${window.location.origin}/app${params.toString() ? `?${params.toString()}` : ''}`;
    navigator.clipboard?.writeText(link);
    setCopiedDeepLink(true);
    setTimeout(() => setCopiedDeepLink(false), 2000);
  };

  const handleSelectMobileTab = (mTab: MobileNavTab) => {
    setActiveMobileTab(mTab);
    if (mTab === 'briefing' || mTab === 'home') {
      setShowMobileMoreDrawer(false);
      setActiveTab('overview');
      document.getElementById('briefing')?.scrollIntoView({ behavior: 'smooth' });
    } else if (mTab === 'map') {
      setShowMobileMoreDrawer(false);
      setActiveTab('overview');
      document.getElementById('map-monitor')?.scrollIntoView({ behavior: 'smooth' });
    } else if (mTab === 'top10') {
      setShowMobileMoreDrawer(false);
      setActiveTab('overview');
      document.getElementById('top-stories')?.scrollIntoView({ behavior: 'smooth' });
    } else if (mTab === 'ask') {
      setShowMobileMoreDrawer(false);
      setIsAskWorldOpen(true);
    } else if (mTab === 'more') {
      setShowMobileMoreDrawer((prev) => !prev);
    } else if (mTab === 'changes') {
      setShowMobileMoreDrawer(false);
      setActiveTab('overview');
      document.getElementById('economic-change')?.scrollIntoView({ behavior: 'smooth' });
    } else if (mTab === 'search') {
      setShowMobileMoreDrawer(false);
      searchInputRef.current?.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (mTab === 'saved') {
      setShowMobileMoreDrawer(false);
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
          isDark ? 'bg-[#0A1830] text-[#E6F1FF]' : 'bg-[#F0F6FC] text-[#140E24]'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#22D3EE]/25 pb-2.5 mb-3">
          <div>
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#38BDF8] font-semibold">
              LIVE SYNDICATION WIDGET · {labels.updatedAgo} {minutesAgo} {labels.minAgo}
            </span>
            <h1 className="font-editorial text-lg font-bold">WorldPulse Top 5 Global Dispatches</h1>
          </div>
          <a
            href={`${window.location.origin}/app`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono-tabular text-[#38BDF8] hover:underline"
          >
            Open Full Desk ↗
          </a>
        </div>
        {topFive.length === 0 ? (
          <p className="text-xs font-mono-tabular py-8 text-center text-[#8FA5C2]">
            {labels.collectingData}
          </p>
        ) : (
          <ol className="divide-y divide-[#22D3EE]/20">
            {topFive.map((s, idx) => (
              <li key={s.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-[#8FA5C2]">
                    <span className="text-[#38BDF8] font-bold">0{idx + 1}</span>
                    <span>
                      {getCountryFlag(s.country)} {s.country}
                    </span>
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
                    className="text-[11px] font-mono-tabular text-[#38BDF8] hover:underline shrink-0 inline-flex items-center gap-1"
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

  // Render Landing Page at `/` when `showLandingPage` is active
  if (showLandingPage) {
    return (
      <>
        {/* Requirement 4: PWA Update Bar */}
        {needRefresh && (
          <div
            role="alert"
            onClick={reloadToUpdate}
            className="sticky top-0 z-50 w-full bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 text-center text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>New version available. Tap to refresh</span>
          </div>
        )}

        <LandingPage
          stories={stories}
          briefing={briefing}
          settings={settings}
          onEnterApp={handleEnterAppFromLanding}
          onOpenLegalPage={handleOpenLegalPage}
          onChangeLanguage={(lang: AppLanguage) => handleUpdateSettings({ ...settings, language: lang })}
          onToggleTheme={handleToggleTheme}
        />

        {/* Legal & Trust Center Modal accessible from Landing Page footer */}
        <LegalTrustModal
          activePage={activeLegalPage}
          onSelectPage={handleOpenLegalPage}
          onClose={handleCloseLegalPage}
          settings={settings}
          stories={stories}
          onPurgeCache={handleClearCache}
          onExportJsonBackup={handleExportMarkdown}
        />

        {/* Cookie Consent Banner */}
        {!cookieConsent && (
          <CookieConsentBanner
            settings={settings}
            onSaveConsent={(choice: CookieConsentChoice) => {
              saveCookieConsent(choice);
              setCookieConsent(choice);
            }}
            onOpenCookiePolicy={() => handleOpenLegalPage('cookies')}
          />
        )}
      </>
    );
  }

  return (
    <div
      id="top"
      className={`min-h-screen pb-20 md:pb-0 flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-[#050B16] text-[#E6F1FF]' : 'bg-[#F0F6FC] text-[#050B16]'
      }`}
    >
      {/* Requirement 4: PWA Update Bar */}
      {needRefresh && (
        <div
          role="alert"
          onClick={reloadToUpdate}
          className="sticky top-0 z-50 w-full bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 text-center text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>New version available. Tap to refresh</span>
        </div>
      )}

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
        onChangeLanguage={(lang) => handleUpdateSettings({ ...settings, language: lang })}
        onFocusSearch={() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        onGoToLanding={handleGoToLanding}
      />

      {/* Supabase Primary Database Status & "Data updated X min ago" Strip */}
      <div
        className={`border-b px-4 sm:px-6 py-2 text-xs font-mono-tabular transition-colors no-print ${
          isDark
            ? 'bg-[#0A1830] border-cyan-500/20 text-[#8FA5C2]'
            : 'bg-[#E2ECF7] border-cyan-700/20 text-[#1E3A5F]'
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span
              className={`font-semibold ${
                minutesAgo >= 90
                  ? 'text-amber-300 bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 rounded-full'
                  : 'text-cyan-300'
              }`}
            >
              {labels.updatedAgo} {minutesAgo} {labels.minAgo}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Supabase (<code>stories</code>: {supabaseState.storiesCount},{' '}
              <code>snapshots</code>: {supabaseState.snapshotsCount},{' '}
              <code>briefings</code>: {supabaseState.briefingsCount})
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
                <span className="text-amber-400 font-semibold">
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
              className={`min-h-[36px] px-2.5 py-1 rounded-full border text-[11px] cursor-pointer transition-colors ${
                settings.strictSupabaseOnly
                  ? 'border-[#22D3EE] bg-[#22D3EE]/20 text-[#38BDF8] font-semibold'
                  : isDark
                  ? 'border-[#22D3EE]/25 hover:border-[#38BDF8]'
                  : 'border-[#0284C7]/25 hover:border-[#0284C7]'
              }`}
              title="Toggle between strict Supabase-only view and Live Browser Fallback"
            >
              {settings.strictSupabaseOnly ? 'Mode: Supabase Only' : 'Mode: Supabase + Fallback'}
            </button>

            {/* Language Switcher: English, Hindi, Punjabi */}
            <div className="flex items-center rounded-full border border-cyan-500/30 p-0.5">
              {(['en', 'hi', 'pa'] as AppLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleUpdateSettings({ ...settings, language: lang })}
                  className={`min-h-[32px] px-2.5 py-0.5 rounded-full text-[11px] cursor-pointer transition-colors ${
                    settings.language === lang
                      ? 'bg-[#22D3EE] text-[#050B16] font-bold'
                      : 'hover:text-[#22D3EE]'
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
            Offline, showing saved data — Live updates will resume automatically when reconnected.
          </span>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Section 2: Domain Navigation Tabs + Interactive Tool Triggers */}
        <div
          className={`p-2.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2 no-print ${
            isDark
              ? 'bg-[#0A1830]/85 border-cyan-500/25'
              : 'bg-white/90 border-cyan-700/20'
          }`}
        >
          {/* Left: Domain Tabs (Overview, All Countries, India + Punjab, Cyber, WHO Health, Conflict ACLED, My Feed, Saved) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-mono-tabular whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#22D3EE] text-[#050B16] font-bold shadow-[0_0_16px_rgba(34,211,238,0.4)]'
                  : 'hover:text-[#22D3EE]'
              }`}
            >
              {labels.overview}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('countries')}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'countries'
                  ? 'bg-[#22D3EE] text-[#050B16] font-bold shadow-[0_0_16px_rgba(34,211,238,0.4)]'
                  : 'hover:text-[#22D3EE]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{labels.countries}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('india')}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'india'
                  ? 'bg-[#22D3EE] text-[#050B16] font-bold shadow-[0_0_16px_rgba(34,211,238,0.4)]'
                  : 'hover:text-[#22D3EE]'
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
              className={`min-h-[44px] px-3 py-1.5 rounded-full text-xs font-mono-tabular border whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'india' && punjabOnly
                  ? 'border-cyan-400 bg-cyan-500/25 text-white font-semibold'
                  : isDark
                  ? 'border-cyan-500/25 text-[#8FA5C2] hover:border-cyan-400'
                  : 'border-cyan-700/25 text-[#1E3A5F] hover:border-cyan-700'
              }`}
              title="Filter India dispatches specifically for Punjab (Chandigarh, Amritsar, Ludhiana, Jalandhar, Patiala)"
            >
              🌾 {labels.punjabFilter}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cyber')}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'cyber'
                  ? 'bg-[#22D3EE] text-[#050B16] font-bold shadow-[0_0_16px_rgba(34,211,238,0.4)]'
                  : 'hover:text-[#22D3EE]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>{labels.cyber}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('health')}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'health'
                  ? 'bg-[#22D3EE] text-[#050B16] font-bold shadow-[0_0_16px_rgba(34,211,238,0.4)]'
                  : 'hover:text-[#22D3EE]'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-pink-500" />
              <span>{labels.health}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('conflict')}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'conflict'
                  ? 'bg-[#22D3EE] text-[#050B16] font-bold shadow-[0_0_16px_rgba(34,211,238,0.4)]'
                  : 'hover:text-[#22D3EE]'
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-rose-500" />
              <span>{labels.conflict}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('myfeed')}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-mono-tabular whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'myfeed'
                  ? 'bg-[#22D3EE] text-[#050B16] font-bold shadow-[0_0_16px_rgba(34,211,238,0.4)]'
                  : 'hover:text-[#22D3EE]'
              }`}
            >
              {labels.myfeed}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'saved'
                  ? 'bg-[#22D3EE] text-[#050B16] font-bold shadow-[0_0_16px_rgba(34,211,238,0.4)]'
                  : 'hover:text-[#22D3EE]'
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
              onClick={() => {
                setAskWorldInitialQuestion(undefined);
                setIsAskWorldOpen(true);
              }}
              className="wp-btn-primary min-h-[44px] px-4 py-1.5 text-xs font-mono-tabular font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{labels.askWorld}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCompareOpen(true)}
              className="wp-btn-secondary min-h-[44px] px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>{labels.compareCountries}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAccountAlertsOpen(true)}
              className="wp-btn-secondary min-h-[44px] px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              {currentUser ? (
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Bell className="w-3.5 h-3.5 text-[#22D3EE]" />
              )}
              <span>{labels.alertsAndAccount}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDevApiOpen(true)}
              className="wp-btn-secondary min-h-[44px] px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>{labels.devApi}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar (Boolean AND/OR, Quotes, Date Range 24h/7d/30d, Presets, Did You Mean, Clear All) */}
        <SearchAndFilterBar
          stories={stories}
          filteredCount={filteredStories.length}
          searchInput={searchInput}
          onChangeSearchInput={setSearchInput}
          dateRange={dateRangeFilter}
          onChangeDateRange={setDateRangeFilter}
          selectedTopic={selectedTopicFilter}
          onSelectTopic={setSelectedTopicFilter}
          selectedCountry={selectedCountryFilter}
          onSelectCountry={setSelectedCountryFilter}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          presets={filterPresets}
          onSavePreset={handleSaveFilterPreset}
          onDeletePreset={handleDeleteFilterPreset}
          onApplyPreset={handleApplyFilterPreset}
          onClearAllFilters={handleClearAllFilters}
          onCopyDeepLink={handleCopyShareableFilterLink}
          copiedDeepLink={copiedDeepLink}
          searchInputRef={searchInputRef}
        />

        {/* Active Country Dossier Strip & View Density Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#8FA5C2] mr-1">
              Active Country Dossiers:
            </span>
            {topCountries.slice(0, 6).map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setSelectedCountryCode(c.code)}
                className={`min-h-[44px] px-3 py-1.5 rounded-full border text-xs font-mono-tabular font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-[#0A1830] border-cyan-500/25 hover:border-cyan-400 text-[#E6F1FF]'
                    : 'bg-white border-cyan-700/25 hover:border-cyan-700 text-[#050B16]'
                }`}
                title={`Open ${c.name} Country Dossier (${c.count} active dispatches)`}
              >
                <span>{getCountryFlag(c.code)}</span>
                <span>{c.code}</span>
                <span className="text-cyan-400 font-semibold">{c.count}</span>
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Dashboard panel density"
            className={`flex items-center rounded-full border p-0.5 shrink-0 ${
              isDark ? 'bg-[#0A1830] border-cyan-500/25' : 'bg-white border-cyan-700/25'
            }`}
          >
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`min-h-[38px] px-3.5 py-1 rounded-full text-xs font-mono-tabular transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-[#22D3EE] text-[#050B16] font-bold'
                  : 'text-[#8FA5C2] hover:text-white'
              }`}
            >
              Full Desk
            </button>
            <button
              type="button"
              onClick={() => setViewMode('core')}
              className={`min-h-[38px] px-3.5 py-1 rounded-full text-xs font-mono-tabular transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'core'
                  ? 'bg-[#22D3EE] text-[#050B16] font-bold'
                  : 'text-[#8FA5C2] hover:text-white'
              }`}
            >
              Core View
            </button>
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
        {viewMode === 'all' && !settings.liteMode && (
          <div className="space-y-3 no-print">
            <MarketsTicker
              coins={activeCoins}
              fxRates={fxRates}
              extraMarkets={extraMarkets}
              wikiTrends={wikiTrends}
              isLoading={isRefreshing && activeCoins.length === 0}
              settings={settings}
              snapshotTakenAt={
                supabaseSnapshots.length > 0
                  ? (supabaseSnapshots[0].takenAt || supabaseSnapshots[0].timestamp)
                  : (snapshots.length > 0 ? (snapshots[0].takenAt || snapshots[0].timestamp) : null)
              }
            />
            <RisingTopicsStrip
              metrics={risingTopics}
              selectedTopicFilter={selectedTopicFilter}
              onSelectTopic={setSelectedTopicFilter}
              settings={settings}
            />
          </div>
        )}

        {/* Section 01: Hero AI Daily Briefing (with Voice Briefing, Speed Control, Voice Picker, MD/CSV Export, AI Disclaimer) */}
        <HeroBriefing
          briefing={briefing}
          isLoading={isRefreshing && stories.length === 0}
          settings={settings}
          totalStories={filteredStories.length}
          countriesCount={new Set(filteredStories.map((s) => s.country)).size}
          onExportText={handleExportText}
          onExportMarkdown={handleExportMarkdown}
          onExportCsv={handleExportCsv}
          onPrintPdf={handlePrintPdf}
          onOpenLegalPage={handleOpenLegalPage}
        />

        {/* Diplomatic & Public Address Speech Summarizer (Ask When & Where) */}
        <Suspense
          fallback={
            <div className="wp-glass-card rounded-2xl p-6 min-h-[140px] flex items-center justify-center animate-pulse">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <SpeechArchivePanel stories={stories} settings={settings} />
        </Suspense>

        {/* Tablet-First 12-Column Architectural Grid (All Existing Panels Preserved) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (7/12): Map Monitor + Live Pulse + Economic & FX Change + Disasters */}
          <div className="lg:col-span-7 space-y-5">
            {!settings.liteMode && (
              <Suspense
                fallback={
                  <div className="wp-glass-card rounded-2xl p-6 min-h-[420px] flex flex-col items-center justify-center gap-3 animate-pulse">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono-tabular text-cyan-300">Loading Geospatial Telemetry Map...</span>
                  </div>
                }
              >
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
              </Suspense>
            )}

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
              coins={activeCoins}
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
              dateRangeFilter={dateRangeFilter}
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

      {/* Institutional Colophon & Legal / Trust Center Footer */}
      <footer
        className={`mt-10 border-t py-8 px-4 sm:px-6 text-xs transition-colors duration-200 no-print ${
          isDark
            ? 'border-cyan-500/20 bg-[#050B16] text-[#8FA5C2]'
            : 'border-cyan-700/20 bg-[#F0F6FC] text-[#1E3A5F]'
        }`}
      >
        <div className="max-w-[1440px] mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-3xl">
              <p className="font-mono-tabular uppercase tracking-wider font-semibold text-cyan-400">
                Colophon &amp; Methodology — How WorldPulse is Made
              </p>
              <p className="leading-relaxed">
                WorldPulse reads primary global intelligence from Supabase (<code>stories</code>,{' '}
                <code>snapshots</code>, <code>briefings</code>) with automatic fallback to live
                public feeds (USGS Earthquakes, NASA EONET, WHO Disease Outbreaks, Cyber Threat
                Advisories, ECB FX, World Bank, CoinGecko, Open-Meteo, Wikimedia, and BBC / Al
                Jazeera / Reuters / India &amp; Punjab RSS wires). All AI synthesis, &ldquo;Ask
                the World&rdquo; grounding, and Hindi/Punjabi translations run through our
                server-side Gemini proxy.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0 font-mono-tabular">
              <button
                type="button"
                onClick={handleGoToLanding}
                className="min-h-[44px] px-3 py-1.5 rounded-full border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 cursor-pointer"
              >
                Landing Page (/)
              </button>
              <button
                type="button"
                onClick={() => setIsAccountAlertsOpen(true)}
                className="min-h-[44px] px-3 py-1.5 rounded-full border border-cyan-500/30 hover:border-cyan-400 cursor-pointer"
              >
                Supabase Auth &amp; RLS SQL
              </button>
              <button
                type="button"
                onClick={() => setIsDevApiOpen(true)}
                className="min-h-[44px] px-3 py-1.5 rounded-full border border-cyan-500/30 hover:border-cyan-400 cursor-pointer"
              >
                Developer API &amp; Widget
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="min-h-[44px] px-3 py-1.5 rounded-full border border-cyan-500/30 hover:border-cyan-400 cursor-pointer"
              >
                Source Health &amp; Settings
              </button>
            </div>
          </div>

          {/* All Legal & Trust Page Links */}
          <div className="pt-4 border-t border-cyan-500/20">
            <LegalFooterLinks settings={settings} onOpenLegalPage={handleOpenLegalPage} />
          </div>
        </div>
      </footer>

      {/* Mobile "More" Quick Sheet when user taps "More" in PhoneBottomNav */}
      {showMobileMoreDrawer && (
        <div className="md:hidden fixed inset-x-0 bottom-14 z-40 p-4 border-t border-cyan-500/35 bg-[#050B16]/98 backdrop-blur-xl space-y-3 no-print">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono-tabular uppercase tracking-wider text-cyan-400 font-semibold">
              More Sections &amp; Tools
            </span>
            <button
              type="button"
              onClick={() => setShowMobileMoreDrawer(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8FA5C2] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono-tabular">
            <button
              type="button"
              onClick={() => handleSelectMobileTab('saved')}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/30 bg-[#0A1830] text-left flex items-center gap-2 hover:border-cyan-400"
            >
              <Bookmark className="w-4 h-4 text-cyan-400" />
              <span>Saved ({bookmarks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMobileTab('changes')}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/30 bg-[#0A1830] text-left flex items-center gap-2 hover:border-cyan-400"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Economy &amp; 24h</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMobileMoreDrawer(false);
                setIsSettingsOpen(true);
              }}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/30 bg-[#0A1830] text-left flex items-center gap-2 hover:border-cyan-400"
            >
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Settings &amp; A11y</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMobileMoreDrawer(false);
                handleOpenLegalPage('privacy');
              }}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/30 bg-[#0A1830] text-left flex items-center gap-2 hover:border-cyan-400"
            >
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Legal &amp; Trust</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMobileMoreDrawer(false);
                handleGoToLanding();
              }}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/30 bg-[#0A1830] text-left flex items-center gap-2 col-span-2 hover:border-cyan-400"
            >
              <Home className="w-4 h-4 text-cyan-400" />
              <span>Open WorldPulse Landing Page (/)</span>
            </button>
          </div>
        </div>
      )}

      {/* Phone Bottom Navigation Bar (Briefing, Map, Top 10, Ask, More) */}
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
        onClose={() => {
          setIsAskWorldOpen(false);
          setAskWorldInitialQuestion(undefined);
        }}
        onSelectStory={(story) => setSelectedStory(story)}
        initialQuestion={askWorldInitialQuestion}
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
        onExportMarkdown={handleExportMarkdown}
        onExportCsv={handleExportCsv}
        onPrintPdf={handlePrintPdf}
        onReplayOnboardingTour={() => {
          setOnboardingTourCompleted(false);
          setShowOnboardingTour(true);
        }}
      />

      {/* Legal & Trust Center Modal (Privacy, Terms, AI Disclaimer, Cookies, Sources, A11y, Responsible AI, Contact, About, Changelog) */}
      <Suspense fallback={null}>
        <LegalTrustModal
          activePage={activeLegalPage}
          onSelectPage={handleOpenLegalPage}
          onClose={handleCloseLegalPage}
          settings={settings}
          stories={stories}
          onPurgeCache={handleClearCache}
          onExportJsonBackup={handleExportMarkdown}
        />
      </Suspense>

      {/* First-Visit 3-Step Onboarding Tour (Map, Daily Briefing, Ask the World) */}
      {showOnboardingTour && (
        <FirstVisitOnboardingTour
          settings={settings}
          onComplete={() => {
            setOnboardingTourCompleted(true);
            setShowOnboardingTour(false);
          }}
        />
      )}

      {/* First-Visit Cookie Consent Banner */}
      {!cookieConsent && (
        <CookieConsentBanner
          settings={settings}
          onSaveConsent={(choice: CookieConsentChoice) => {
            saveCookieConsent(choice);
            setCookieConsent(choice);
          }}
          onOpenCookiePolicy={() => handleOpenLegalPage('cookies')}
        />
      )}
    </div>
  );
}
