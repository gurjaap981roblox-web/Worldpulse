import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bookmark,
  Check,
  Clock,
  ExternalLink,
  Globe,
  Languages,
  Loader2,
  MapPin,
  Plus,
  Scale,
  Search,
  Share2,
  ShieldAlert,
  Stethoscope,
  Swords,
} from 'lucide-react';
import {
  AppLanguage,
  AppSettings,
  DashboardTab,
  Story,
  Topic,
  TranslatedStoryCacheEntry,
  WorldRegion,
} from '../types';
import {
  ALL_TOPICS,
  COUNTRY_GAZETTEER,
  formatRelativeTime,
  getCountryFlag,
  isPunjabRelatedText,
  TOPIC_COLORS,
  UI_TRANSLATIONS,
} from '../utils/sanitize';
import { getCachedTranslation } from '../services/storage';
import { translateStoryOnDemand } from '../services/llm';
import { StoryTrustSignals } from './StoryTrustSignals';

interface DomainTabsViewProps {
  activeTab: DashboardTab;
  stories: Story[];
  bookmarks: Story[];
  bookmarkedIds: Set<string>;
  acledInfo: { configured: boolean; message: string };
  punjabOnly: boolean;
  onTogglePunjabOnly: (val: boolean) => void;
  onSelectStory: (story: Story) => void;
  onSelectCountry: (countryCode: string) => void;
  onToggleFollowCountry: (countryCode: string) => void;
  onToggleFollowTopic: (topic: Topic) => void;
  onToggleBookmark: (story: Story) => void;
  onOpenTimeline: (story: Story) => void;
  onShareStoryCard: (story: Story) => void;
  onCompareCountry: (countryCode: string) => void;
  settings: AppSettings;
}

export const DomainTabsView: React.FC<DomainTabsViewProps> = ({
  activeTab,
  stories,
  bookmarks,
  bookmarkedIds,
  acledInfo,
  punjabOnly,
  onTogglePunjabOnly,
  onSelectStory,
  onSelectCountry,
  onToggleFollowCountry,
  onToggleFollowTopic,
  onToggleBookmark,
  onOpenTimeline,
  onShareStoryCard,
  onCompareCountry,
  settings,
}) => {
  const isDark = settings.theme === 'dark';
  const labels = UI_TRANSLATIONS[settings.language] || UI_TRANSLATIONS.en;

  const [countrySearch, setCountrySearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<WorldRegion>('All');
  const [showActiveCountriesOnly, setShowActiveCountriesOnly] = useState(false);

  const [translatingKey, setTranslatingKey] = useState<string | null>(null);
  const [localTranslations, setLocalTranslations] = useState<
    Record<string, TranslatedStoryCacheEntry>
  >({});

  const handleTranslate = async (story: Story, lang: AppLanguage) => {
    if (lang === 'en') return;
    const key = `${story.id}_${lang}`;
    const cached = getCachedTranslation(story.id, lang);
    if (cached) {
      setLocalTranslations((prev) => ({ ...prev, [key]: cached }));
      return;
    }
    setTranslatingKey(key);
    try {
      const res = await translateStoryOnDemand(story, lang, settings);
      if (res) {
        setLocalTranslations((prev) => ({ ...prev, [key]: res }));
      }
    } finally {
      setTranslatingKey(null);
    }
  };

  // All Countries Monitoring Matrix
  const allCountriesDirectory = useMemo(() => {
    const byCode: Record<
      string,
      {
        code: string;
        name: string;
        region: WorldRegion;
        storyCount: number;
        maxImportance: number;
        dominantTopic: Topic | null;
        latestStory: Story | null;
      }
    > = {};

    for (const meta of Object.values(COUNTRY_GAZETTEER)) {
      if (meta.code === 'GL') continue;
      byCode[meta.code] = {
        code: meta.code,
        name: meta.name,
        region: meta.region,
        storyCount: 0,
        maxImportance: 0,
        dominantTopic: null,
        latestStory: null,
      };
    }

    const topicTracker: Record<string, Record<string, number>> = {};

    for (const s of stories) {
      if (s.country === 'GL') continue;
      if (!byCode[s.country]) {
        byCode[s.country] = {
          code: s.country,
          name: s.countryName || s.country,
          region: s.region || 'Global',
          storyCount: 0,
          maxImportance: 0,
          dominantTopic: null,
          latestStory: null,
        };
      }
      const entry = byCode[s.country];
      entry.storyCount += 1;
      if (s.importance > entry.maxImportance) {
        entry.maxImportance = s.importance;
      }
      if (!entry.latestStory || s.time > entry.latestStory.time) {
        entry.latestStory = s;
      }
      if (!topicTracker[s.country]) topicTracker[s.country] = {};
      topicTracker[s.country][s.topic] = (topicTracker[s.country][s.topic] || 0) + 1;
    }

    for (const [code, tCounts] of Object.entries(topicTracker)) {
      const sorted = Object.entries(tCounts).sort((a, b) => b[1] - a[1]);
      if (sorted[0] && byCode[code]) {
        byCode[code].dominantTopic = sorted[0][0] as Topic;
      }
    }

    const q = countrySearch.trim().toLowerCase();
    return Object.values(byCode)
      .filter((c) => {
        if (regionFilter !== 'All' && c.region !== regionFilter) return false;
        if (showActiveCountriesOnly && c.storyCount === 0) return false;
        if (q && !`${c.name} ${c.code} ${c.region}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (b.storyCount !== a.storyCount) return b.storyCount - a.storyCount;
        if (b.maxImportance !== a.maxImportance) return b.maxImportance - a.maxImportance;
        return a.name.localeCompare(b.name);
      });
  }, [stories, countrySearch, regionFilter, showActiveCountriesOnly]);

  // Filter stories for specialized tabs
  const tabStories = useMemo(() => {
    const minImp = settings.minImportance || 1;
    const base = stories.filter((s) => s.importance >= minImp);

    if (activeTab === 'india') {
      const indiaList = base.filter(
        (s) =>
          s.country === 'IN' ||
          /\bindia\b|\bindian\b|\bnew delhi\b|\bmumbai\b|\bpunjab\b|\bchandigarh\b|\bamritsar\b|\bludhiana\b/i.test(
            `${s.headline} ${s.summary}`
          )
      );
      if (punjabOnly) {
        return indiaList.filter((s) =>
          isPunjabRelatedText(`${s.headline} ${s.summary} ${s.sources.map((src) => src.name).join(' ')}`)
        );
      }
      return indiaList;
    }

    if (activeTab === 'cyber') {
      return base.filter(
        (s) =>
          s.topic === 'Cyber' ||
          /cyber|hack|breach|ransomware|vulnerability|zero-day|cve-|malware|ddos|phishing|exploit/i.test(
            `${s.headline} ${s.summary} ${s.sources.map((src) => src.name).join(' ')}`
          )
      );
    }

    if (activeTab === 'health') {
      return base.filter(
        (s) =>
          s.topic === 'Health' ||
          /who\b|world health|outbreak|virus|epidemic|pandemic|vaccine|disease|mpox|cholera|dengue|avian flu|hospital/i.test(
            `${s.headline} ${s.summary} ${s.sources.map((src) => src.name).join(' ')}`
          )
      );
    }

    if (activeTab === 'conflict') {
      return base.filter(
        (s) =>
          s.topic === 'Conflict' ||
          /war|conflict|military|missile|airstrike|ceasefire|troops|shelling|militia|insurgent|acled/i.test(
            `${s.headline} ${s.summary}`
          )
      );
    }

    if (activeTab === 'myfeed') {
      return base.filter(
        (s) =>
          settings.followedCountries.includes(s.country) ||
          settings.followedTopics.includes(s.topic)
      );
    }

    if (activeTab === 'saved') {
      return bookmarks.filter((s) => s.importance >= minImp);
    }

    return base;
  }, [activeTab, stories, bookmarks, punjabOnly, settings.minImportance, settings.followedCountries, settings.followedTopics]);

  if (activeTab === 'overview') {
    return null;
  }

  // Render All Countries Monitoring Grid
  if (activeTab === 'countries') {
    const activeCount = allCountriesDirectory.filter((c) => c.storyCount > 0).length;

    return (
      <section
        aria-labelledby="all-countries-heading"
        className={`border border-t-2 p-4 sm:p-5 space-y-4 transition-colors duration-200 ${
          isDark
            ? 'bg-[#101217] border-[#222631] border-t-[#E05A2B] text-[#F3F2EE]'
            : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#E05A2B] text-[#181615]'
        }`}
      >
        <div
          className={`pb-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
              <Globe className="w-3.5 h-3.5" />
              <span>Global Sovereign Country Monitoring System</span>
            </div>
            <h2
              id="all-countries-heading"
              className="font-editorial text-xl font-semibold tracking-tight mt-0.5"
            >
              All Countries Situation Matrix ({allCountriesDirectory.length} Nations · {activeCount} Active)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C93A1]" />
              <input
                type="search"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search country or ISO (e.g. India, IN, Japan)..."
                className={`min-h-[38px] pl-8 pr-3 py-1.5 border text-xs font-mono-tabular focus:outline-none focus:border-[#E05A2B] ${
                  isDark
                    ? 'bg-[#090A0D] border-[#222631] text-[#F3F2EE]'
                    : 'bg-[#EFEAE0]/50 border-[#DCD5C7] text-[#181615]'
                }`}
              />
            </div>

            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as WorldRegion)}
              aria-label="Filter countries by region"
              className={`min-h-[38px] px-3 py-1.5 border text-xs font-mono-tabular cursor-pointer ${
                isDark
                  ? 'bg-[#090A0D] border-[#222631] text-[#F3F2EE]'
                  : 'bg-[#EFEAE0]/50 border-[#DCD5C7] text-[#181615]'
              }`}
            >
              <option value="All">All Regions</option>
              <option value="Asia-Pacific">Asia-Pacific</option>
              <option value="Europe">Europe</option>
              <option value="Americas">Americas</option>
              <option value="Middle East & Africa">Middle East &amp; Africa</option>
            </select>

            <button
              type="button"
              onClick={() => setShowActiveCountriesOnly((prev) => !prev)}
              className={`min-h-[38px] px-3 py-1.5 border text-xs font-mono-tabular cursor-pointer transition-colors ${
                showActiveCountriesOnly
                  ? 'bg-[#E05A2B] border-[#E05A2B] text-white font-semibold'
                  : isDark
                  ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                  : 'bg-[#EFEAE0]/50 border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
              }`}
            >
              {showActiveCountriesOnly ? 'Showing Active Only' : 'Show Active Only'}
            </button>
          </div>
        </div>

        {/* Country Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[680px] overflow-y-auto pr-1">
          {allCountriesDirectory.map((c) => {
            const isFollowed = settings.followedCountries.includes(c.code);
            const topicColor = c.dominantTopic
              ? TOPIC_COLORS[c.dominantTopic]?.hex || '#E05A2B'
              : '#8C93A1';

            return (
              <div
                key={c.code}
                className={`p-3.5 border flex flex-col justify-between gap-2.5 transition-colors ${
                  c.storyCount > 0
                    ? isDark
                      ? 'bg-[#090A0D] border-[#222631] hover:border-[#E05A2B]'
                      : 'bg-[#FCFAF5] border-[#DCD5C7] hover:border-[#E05A2B]'
                    : isDark
                    ? 'bg-[#090A0D]/50 border-[#222631]/60 opacity-80 hover:opacity-100'
                    : 'bg-[#EFEAE0]/30 border-[#DCD5C7]/60 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectCountry(c.code)}
                      className="text-left group flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-xl">{getCountryFlag(c.code)}</span>
                      <div>
                        <h3 className="text-sm font-semibold group-hover:text-[#E05A2B] transition-colors">
                          {c.name}
                        </h3>
                        <span
                          className={`text-[10px] font-mono-tabular ${
                            isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                          }`}
                        >
                          ISO: {c.code} · {c.region}
                        </span>
                      </div>
                    </button>

                    <span
                      className={`px-2 py-0.5 text-[11px] font-mono-tabular font-semibold border ${
                        c.storyCount > 0
                          ? 'border-[#E05A2B]/50 bg-[#E05A2B]/15 text-[#E05A2B]'
                          : isDark
                          ? 'border-[#222631] text-[#8C93A1]'
                          : 'border-[#DCD5C7] text-[#666159]'
                      }`}
                    >
                      {c.storyCount} {c.storyCount === 1 ? 'story' : 'stories'}
                    </span>
                  </div>

                  {c.latestStory ? (
                    <div className="mt-2.5 space-y-1">
                      <div className="flex items-center gap-2 text-[11px] font-mono-tabular">
                        <span className="font-semibold" style={{ color: topicColor }}>
                          {c.dominantTopic}
                        </span>
                        <span>·</span>
                        <span>Max Sev {c.maxImportance.toFixed(1)}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(c.latestStory.time)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectStory(c.latestStory!)}
                        className="text-left text-xs line-clamp-2 hover:text-[#E05A2B] transition-colors cursor-pointer"
                      >
                        {c.latestStory.headline}
                      </button>
                    </div>
                  ) : (
                    <p
                      className={`mt-2.5 text-xs font-mono-tabular ${
                        isDark ? 'text-[#8C93A1]/70' : 'text-[#666159]/70'
                      }`}
                    >
                      No active high-severity alerts in current cycle.
                    </p>
                  )}
                </div>

                {/* Actions: Dossier, Follow Country, Compare */}
                <div
                  className={`pt-2 border-t flex items-center justify-between gap-1.5 text-[11px] font-mono-tabular ${
                    isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectCountry(c.code)}
                    className="px-2 py-1 border border-transparent hover:border-[#E05A2B] text-[#E05A2B] font-semibold cursor-pointer"
                  >
                    Dossier →
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onCompareCountry(c.code)}
                      className={`px-2 py-1 border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                        isDark
                          ? 'border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                          : 'border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
                      }`}
                      title={`Compare ${c.name} side-by-side`}
                    >
                      <Scale className="w-3 h-3" />
                      <span>Compare</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleFollowCountry(c.code)}
                      className={`px-2 py-1 border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                        isFollowed
                          ? 'border-[#E05A2B] bg-[#E05A2B]/15 text-[#E05A2B] font-semibold'
                          : isDark
                          ? 'border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                          : 'border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
                      }`}
                    >
                      {isFollowed ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      <span>{isFollowed ? 'Following' : 'Follow'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // Render Specialized Story Feeds (India+Punjab, Cyber, WHO Health, Conflict ACLED, My Feed, Saved)
  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'india':
        return {
          kicker: 'REGIONAL DESK · INDIA (IN) & PUNJAB MONITOR',
          title: punjabOnly
            ? 'Punjab Focus Monitor (Chandigarh · Amritsar · Ludhiana · Jalandhar · Patiala)'
            : 'India National & State Situation Monitor (IN)',
          icon: <Globe className="w-4 h-4 text-[#E05A2B]" />,
        };
      case 'cyber':
        return {
          kicker: 'CYBERSECURITY & VULNERABILITY WIRE',
          title: 'Global Cyber Threats, Breaches & Zero-Day Advisories',
          icon: <ShieldAlert className="w-4 h-4 text-cyan-400" />,
        };
      case 'health':
        return {
          kicker: 'WORLD HEALTH ORGANIZATION (WHO) & EPIDEMIOLOGY WIRE',
          title: 'Global Health Outbreaks & WHO Emergency Dispatches',
          icon: <Stethoscope className="w-4 h-4 text-pink-500" />,
        };
      case 'conflict':
        return {
          kicker: 'ARMED CONFLICT & SECURITY TRACKER',
          title: 'Global Conflict & Escalation Monitor',
          icon: <Swords className="w-4 h-4 text-rose-500" />,
        };
      case 'myfeed':
        return {
          kicker: 'PERSONALIZED INTELLIGENCE FEED',
          title: `My Followed Countries (${settings.followedCountries.length}) & Topics (${settings.followedTopics.length})`,
          icon: <Activity className="w-4 h-4 text-[#E05A2B]" />,
        };
      case 'saved':
        return {
          kicker: 'ACCOUNT & LOCAL ARCHIVE',
          title: `Saved Bookmarks (${bookmarks.length})`,
          icon: <Bookmark className="w-4 h-4 text-[#E05A2B]" />,
        };
      default:
        return {
          kicker: 'DISPATCHES',
          title: 'Filtered Dispatches',
          icon: <Globe className="w-4 h-4 text-[#E05A2B]" />,
        };
    }
  };

  const meta = getHeaderMeta();

  return (
    <section
      aria-label={meta.title}
      className={`border border-t-2 p-4 sm:p-5 space-y-4 transition-colors duration-200 ${
        isDark
          ? 'bg-[#101217] border-[#222631] border-t-[#E05A2B] text-[#F3F2EE]'
          : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#E05A2B] text-[#181615]'
      }`}
    >
      {/* Header Bar */}
      <div
        className={`pb-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
            {meta.icon}
            <span>{meta.kicker}</span>
          </div>
          <h2 className="font-editorial text-xl font-semibold tracking-tight mt-0.5">
            {meta.title}
          </h2>
        </div>

        {/* Tab-Specific Quick Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'india' && (
            <div className="flex items-center border border-[#E05A2B]/50">
              <button
                type="button"
                onClick={() => onTogglePunjabOnly(false)}
                className={`min-h-[38px] px-3 py-1.5 text-xs font-mono-tabular cursor-pointer transition-colors ${
                  !punjabOnly
                    ? 'bg-[#E05A2B] text-white font-semibold'
                    : isDark
                    ? 'bg-[#090A0D] text-[#8C93A1] hover:text-[#F3F2EE]'
                    : 'bg-[#FCFAF5] text-[#666159] hover:text-[#181615]'
                }`}
              >
                🇮🇳 All India ({stories.filter((s) => s.country === 'IN').length})
              </button>
              <button
                type="button"
                onClick={() => onTogglePunjabOnly(true)}
                className={`min-h-[38px] px-3 py-1.5 text-xs font-mono-tabular cursor-pointer transition-colors ${
                  punjabOnly
                    ? 'bg-[#E05A2B] text-white font-semibold'
                    : isDark
                    ? 'bg-[#090A0D] text-[#8C93A1] hover:text-[#F3F2EE]'
                    : 'bg-[#FCFAF5] text-[#666159] hover:text-[#181615]'
                }`}
              >
                🌾 {labels.punjabFilter} (ਪੰਜਾਬ)
              </button>
            </div>
          )}

          <span className="text-xs font-mono-tabular text-[#E05A2B] font-semibold">
            {tabStories.length} {tabStories.length === 1 ? 'dispatch' : 'dispatches'}
          </span>
        </div>
      </div>

      {/* Conflict Tab: Explicit ACLED Status Banner */}
      {activeTab === 'conflict' && (
        <div
          className={`p-3 border text-xs font-mono-tabular flex items-center justify-between gap-3 ${
            isDark
              ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1]'
              : 'bg-[#EFEAE0]/60 border-[#DCD5C7] text-[#666159]'
          }`}
        >
          <span>{acledInfo.message}</span>
          <span className="px-2 py-0.5 border border-rose-500/40 text-rose-400 shrink-0">
            {acledInfo.configured ? 'ACLED Live' : 'ACLED Key Skipped'}
          </span>
        </div>
      )}

      {/* My Feed Tab: Followed Countries & Topics Manager Strip */}
      {activeTab === 'myfeed' && (
        <div
          className={`p-3.5 border space-y-3 ${
            isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
          }`}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold mr-1">
              Followed Countries:
            </span>
            {['IN', 'US', 'UA', 'GB', 'JP', 'CN', 'IL', 'DE', 'FR', 'CA', 'AU', 'BR', 'RU', 'SG'].map(
              (code) => {
                const active = settings.followedCountries.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onToggleFollowCountry(code)}
                    className={`px-2 py-1 border text-xs font-mono-tabular inline-flex items-center gap-1 cursor-pointer transition-colors ${
                      active
                        ? 'border-[#E05A2B] bg-[#E05A2B]/15 text-[#E05A2B] font-semibold'
                        : isDark
                        ? 'border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                        : 'border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
                    }`}
                  >
                    <span>{getCountryFlag(code)}</span>
                    <span>{code}</span>
                  </button>
                );
              }
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold mr-1">
              Followed Topics:
            </span>
            {ALL_TOPICS.map((topic) => {
              const active = settings.followedTopics.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => onToggleFollowTopic(topic)}
                  className={`px-2 py-1 border text-xs font-mono-tabular cursor-pointer transition-colors ${
                    active
                      ? 'border-[#E05A2B] bg-[#E05A2B]/15 text-[#E05A2B] font-semibold'
                      : isDark
                      ? 'border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                      : 'border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stories List */}
      {tabStories.length === 0 ? (
        <div className="p-8 text-center space-y-2">
          <p className="text-sm font-mono-tabular text-[#E05A2B] font-semibold">
            {activeTab === 'saved'
              ? 'No bookmarked stories yet. Tap the Bookmark icon on any dispatch to save it here.'
              : activeTab === 'india' && punjabOnly
              ? 'No Punjab-specific dispatches matched in the current window. Switch to "All India" or check back soon.'
              : labels.collectingData}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {tabStories.map((story) => {
            const topicColor = TOPIC_COLORS[story.topic]?.hex || '#E05A2B';
            const isBookmarked = bookmarkedIds.has(story.id);
            const activeTransLang: AppLanguage =
              settings.language !== 'en'
                ? settings.language
                : localTranslations[`${story.id}_pa`]
                ? 'pa'
                : localTranslations[`${story.id}_hi`]
                ? 'hi'
                : 'en';
            const translated =
              activeTransLang !== 'en'
                ? localTranslations[`${story.id}_${activeTransLang}`] ||
                  getCachedTranslation(story.id, activeTransLang)
                : null;

            return (
              <article
                key={story.id}
                className={`p-4 border flex flex-col justify-between gap-3 transition-colors ${
                  isDark
                    ? 'bg-[#090A0D] border-[#222631] hover:border-[#E05A2B]/60'
                    : 'bg-[#FCFAF5] border-[#DCD5C7] hover:border-[#E05A2B]/60'
                }`}
              >
                <div className="space-y-2">
                  {/* Top metadata bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectCountry(story.country)}
                        className="font-semibold hover:text-[#E05A2B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{getCountryFlag(story.country)}</span>
                        <span>{story.countryName} ({story.country})</span>
                      </button>
                      <span>·</span>
                      <span className="font-semibold" style={{ color: topicColor }}>
                        {story.topic}
                      </span>
                      <span>·</span>
                      <span>{formatRelativeTime(story.time)}</span>
                      <span>·</span>
                      <span className="text-emerald-500">
                        {Math.round(story.confidence * 100)}% conf
                      </span>
                      {translated && (
                        <span className="px-1.5 py-0.5 bg-[#E05A2B]/15 text-[#E05A2B] border border-[#E05A2B]/40 text-[10px]">
                          {labels.aiTranslated} ({translated.lang === 'pa' ? 'ਪੰਜਾਬੀ' : 'हिन्दी'})
                        </span>
                      )}
                    </div>

                    {/* Action Icons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleBookmark(story)}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark story'}
                        className={`p-1 cursor-pointer ${
                          isBookmarked ? 'text-[#E05A2B]' : 'text-[#8C93A1] hover:text-[#E05A2B]'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenTimeline(story)}
                        title="Track story timeline across days"
                        className="p-1 text-[#8C93A1] hover:text-[#E05A2B] cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onShareStoryCard(story)}
                        title="Share as image card with source link"
                        className="p-1 text-[#8C93A1] hover:text-[#E05A2B] cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Headline */}
                  <button
                    type="button"
                    onClick={() => onSelectStory(story)}
                    className="text-left w-full group cursor-pointer"
                  >
                    <h3 className="font-editorial text-base font-semibold leading-snug group-hover:text-[#E05A2B] transition-colors">
                      {translated ? translated.headline : story.headline}
                    </h3>
                  </button>

                  {/* Summary */}
                  <p
                    className={`text-xs sm:text-[13px] leading-relaxed ${
                      isDark ? 'text-[#F3F2EE]/80' : 'text-[#181615]/80'
                    }`}
                  >
                    {translated ? translated.summary : story.summary}
                  </p>
                </div>

                {/* Footer: Severity + Translate + Source Links */}
                <div
                  className={`pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular ${
                    isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#E05A2B]">
                      Sev {story.importance.toFixed(1)}/10
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTranslate(story, 'hi')}
                      disabled={translatingKey === `${story.id}_hi`}
                      className="px-1.5 py-0.5 border border-[#222631] hover:border-[#E05A2B] inline-flex items-center gap-1 cursor-pointer"
                    >
                      {translatingKey === `${story.id}_hi` ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Languages className="w-2.5 h-2.5 text-[#E05A2B]" />
                      )}
                      <span>हिन्दी</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTranslate(story, 'pa')}
                      disabled={translatingKey === `${story.id}_pa`}
                      className="px-1.5 py-0.5 border border-[#222631] hover:border-[#E05A2B] inline-flex items-center gap-1 cursor-pointer"
                    >
                      {translatingKey === `${story.id}_pa` ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Languages className="w-2.5 h-2.5 text-[#E05A2B]" />
                      )}
                      <span>ਪੰਜਾਬੀ</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectStory(story)}
                      className="min-h-[44px] px-2.5 inline-flex items-center gap-1 text-[#8C93A1] hover:text-[#E05A2B] cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Map</span>
                    </button>
                  </div>
                </div>

                {/* Trust Signals & Audio Player */}
                <StoryTrustSignals story={story} settings={settings} showAudio />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
