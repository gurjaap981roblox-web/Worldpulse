import React, { useState } from 'react';
import {
  Bookmark,
  Check,
  Clock,
  Copy,
  Languages,
  Loader2,
  Share2,
} from 'lucide-react';
import { AppLanguage, AppSettings, DateRangeFilter, Story, TranslatedStoryCacheEntry } from '../types';
import {
  formatRelativeTime,
  getCountryFlag,
  TOPIC_COLORS,
  UI_TRANSLATIONS,
} from '../utils/sanitize';
import { getCachedTranslation } from '../services/storage';
import { translateStoryOnDemand } from '../services/llm';
import { StoryTrustSignals } from './StoryTrustSignals';

function formatStoryAge(timestamp: number | undefined | null): string {
  if (!timestamp) return 'Recently';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return '1 hour ago';
  if (diffHr < 24) return `${diffHr} hours ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

interface TopTenListProps {
  stories: Story[];
  isLoading: boolean;
  selectedStoryId: string | null;
  onSelectStory: (story: Story) => void;
  onSelectCountry: (countryCode: string) => void;
  bookmarkedIds?: Set<string>;
  onToggleBookmark?: (story: Story) => void;
  onOpenTimeline?: (story: Story) => void;
  onShareStoryCard?: (story: Story) => void;
  settings: AppSettings;
  dateRangeFilter?: DateRangeFilter;
}

export const TopTenList: React.FC<TopTenListProps> = ({
  stories,
  isLoading,
  selectedStoryId,
  onSelectStory,
  onSelectCountry,
  bookmarkedIds,
  onToggleBookmark,
  onOpenTimeline,
  onShareStoryCard,
  settings,
  dateRangeFilter = '24h',
}) => {
  const isDark = settings.theme === 'dark';
  const labels = UI_TRANSLATIONS[settings.language] || UI_TRANSLATIONS.en;

  const [activeTab, setActiveTab] = useState<'top10' | 'latest'>('top10');
  const [latestLimit, setLatestLimit] = useState<number>(30);

  const now = Date.now();
  const maxAgeMs =
    dateRangeFilter === '7d'
      ? 7 * 24 * 3600 * 1000
      : dateRangeFilter === '30d'
      ? 30 * 24 * 3600 * 1000
      : 24 * 3600 * 1000;

  // 2. Only consider stories from the selected date range (default last 24 hours)
  const storiesInRange = React.useMemo(() => {
    return stories.filter((story) => {
      const storyTime = (story as any).publishedAt || story.time;
      if (storyTime && now - storyTime > maxAgeMs) {
        return false;
      }
      return true;
    });
  }, [stories, maxAgeMs, now]);

  // 1. In the Top 10 scoring, use score = importance * recencyFactor, where recencyFactor = max(0.35, 1 - ageHours/24 * 0.65)
  // 3. If two stories have the same score, show the newer one first
  const topTen = React.useMemo(() => {
    const scored = storiesInRange.map((story) => {
      const storyTime = (story as any).publishedAt || story.time || now;
      const ageMs = Math.max(0, now - storyTime);
      const ageHours = ageMs / (3600 * 1000);
      const recencyFactor = Math.max(0.35, 1 - (ageHours / 24) * 0.65);
      const score = story.importance * recencyFactor;
      return { story, score, time: storyTime };
    });

    scored.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 1e-6) {
        return b.score - a.score;
      }
      return b.time - a.time;
    });

    return scored.slice(0, 10).map((item) => item.story);
  }, [storiesInRange, now]);

  // 5. "Latest" tab lists stories strictly by newest first, 30 at a time
  const latestStories = React.useMemo(() => {
    return [...storiesInRange].sort((a, b) => {
      const timeA = (a as any).publishedAt || a.time || 0;
      const timeB = (b as any).publishedAt || b.time || 0;
      return timeB - timeA;
    });
  }, [storiesInRange]);

  const visibleLatest = React.useMemo(() => {
    return latestStories.slice(0, latestLimit);
  }, [latestStories, latestLimit]);

  const displayStories = activeTab === 'top10' ? topTen : visibleLatest;

  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [localTranslations, setLocalTranslations] = useState<
    Record<string, TranslatedStoryCacheEntry>
  >({});

  const [copiedStoryId, setCopiedStoryId] = useState<string | null>(null);

  const handleCopyStoryLink = (story: Story) => {
    try {
      const shareUrl = `${window.location.origin}/app?country=${story.country}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedStoryId(story.id);
      setTimeout(() => setCopiedStoryId(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleTranslateStory = async (story: Story, targetLang: AppLanguage) => {
    if (targetLang === 'en') return;
    const key = `${story.id}_${targetLang}`;
    const cached = getCachedTranslation(story.id, targetLang);
    if (cached) {
      setLocalTranslations((prev) => ({ ...prev, [key]: cached }));
      return;
    }

    setTranslatingId(key);
    try {
      const res = await translateStoryOnDemand(story, targetLang, settings);
      if (res) {
        setLocalTranslations((prev) => ({ ...prev, [key]: res }));
      }
    } finally {
      setTranslatingId(null);
    }
  };

  return (
    <section
      id="top-stories"
      aria-labelledby="top-ten-heading"
      className="wp-glass-card flex flex-col transition-colors duration-200 overflow-hidden"
    >
      <div
        className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark ? 'border-cyan-500/25' : 'border-cyan-700/20'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#22D3EE] font-semibold">
            <span>Section 03</span>
            <span aria-hidden="true">/</span>
            <span>Priority Ledger</span>
          </div>
          <h2
            id="top-ten-heading"
            className="font-editorial text-lg font-bold tracking-tight mt-0.5"
          >
            {activeTab === 'top10' ? 'Top 10 Global Dispatches' : 'Latest Global Dispatches'}
          </h2>
          {/* 7. Keep a small label on the Top 10 saying "Ranked by importance and recency" */}
          {activeTab === 'top10' && (
            <div className="text-[11px] font-mono-tabular text-[#8FA5C2] mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
              <span>Ranked by importance and recency</span>
            </div>
          )}
        </div>

        {/* 5. Add a "Latest" tab next to Top 10 that lists stories strictly by newest first, 30 at a time */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div
            role="tablist"
            aria-label="Dispatch listing views"
            className={`p-1 rounded-full border flex items-center gap-1 ${
              isDark ? 'border-cyan-500/30 bg-[#0A1830]' : 'border-cyan-700/20 bg-cyan-500/10'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'top10'}
              onClick={() => setActiveTab('top10')}
              className={`px-3 py-1 rounded-full text-xs font-mono-tabular font-semibold transition-colors cursor-pointer ${
                activeTab === 'top10'
                  ? 'bg-cyan-500 text-[#050B16] shadow-sm'
                  : 'text-[#8FA5C2] hover:text-white'
              }`}
            >
              Top 10
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'latest'}
              onClick={() => setActiveTab('latest')}
              className={`px-3 py-1 rounded-full text-xs font-mono-tabular font-semibold transition-colors cursor-pointer ${
                activeTab === 'latest'
                  ? 'bg-cyan-500 text-[#050B16] shadow-sm'
                  : 'text-[#8FA5C2] hover:text-white'
              }`}
            >
              Latest ({latestStories.length})
            </button>
          </div>

          {activeTab === 'top10' ? (
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/35 text-[11px] font-mono-tabular font-semibold text-[#22D3EE]">
              {topTen.length}/10 Ranked
            </span>
          ) : (
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/35 text-[11px] font-mono-tabular font-semibold text-[#22D3EE]">
              {visibleLatest.length} of {latestStories.length}
            </span>
          )}
        </div>
      </div>

      {isLoading && displayStories.length === 0 ? (
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="space-y-2">
              <div className="h-3.5 w-1/2 skeleton-shimmer rounded" />
              <div className="h-5 w-full skeleton-shimmer rounded" />
              <div className="h-4 w-5/6 skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
      ) : displayStories.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm font-mono-tabular text-[#8FA5C2]">
            {labels.collectingData}
          </p>
        </div>
      ) : (
        <>
          <ol className={`divide-y ${isDark ? 'divide-[#22D3EE]/20' : 'divide-[#0284C7]/15'}`}>
            {displayStories.map((story, idx) => {
            const rankStr = String(idx + 1).padStart(2, '0');
            const topicColor = TOPIC_COLORS[story.topic]?.hex || '#22D3EE';
            const isSelected = selectedStoryId === story.id;
            const importancePct = Math.min(100, Math.max(10, Math.round(story.importance * 10)));
            const isBookmarked = bookmarkedIds?.has(story.id) || false;

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
              <li
                key={story.id}
                className={`p-4 sm:p-5 transition-colors duration-150 ${
                  isSelected
                    ? isDark
                      ? 'bg-[#22D3EE]/15'
                      : 'bg-[#0284C7]/10'
                    : isDark
                    ? 'hover:bg-[#22D3EE]/8'
                    : 'hover:bg-[#0284C7]/5'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Rank index */}
                  <span
                    className={`font-editorial text-lg font-extrabold leading-none pt-1 select-none shrink-0 ${
                      idx < 3 ? 'text-[#38BDF8]' : 'text-[#8FA5C2]'
                    }`}
                  >
                    {rankStr}
                  </span>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Metadata row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectCountry(story.country)}
                          className="min-h-[44px] px-2.5 py-1 rounded-full border border-[#22D3EE]/30 font-semibold hover:border-[#38BDF8] inline-flex items-center gap-1.5 cursor-pointer"
                          title={`Open ${story.countryName} Country Dossier`}
                        >
                          <span>{getCountryFlag(story.country)}</span>
                          <span>{story.countryName}</span>
                        </button>

                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                          style={{
                            color: topicColor,
                            borderColor: `${topicColor}55`,
                          }}
                        >
                          {story.topic}
                        </span>

                        {/* 4. Show each story's time (for example "35 min ago") on every Top 10 card */}
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[11px] font-mono-tabular text-[#22D3EE]"
                          title={new Date((story as any).publishedAt || story.time).toLocaleString()}
                        >
                          <Clock className="w-3 h-3 text-[#22D3EE]" />
                          <span>{formatStoryAge((story as any).publishedAt || story.time)}</span>
                        </span>

                        {translated && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#22D3EE] border border-cyan-500/40 text-[10px]">
                            {labels.aiTranslated} (
                            {translated.lang === 'pa' ? 'ਪੰਜਾਬੀ' : 'हिन्दी'})
                          </span>
                        )}
                      </div>

                      {/* Quick Action Icons & Share Buttons (44px touch targets) */}
                      <div className="flex items-center gap-1">
                        {/* Copy Link */}
                        <button
                          type="button"
                          onClick={() => handleCopyStoryLink(story)}
                          aria-label="Copy story share link"
                          title="Copy share link"
                          className="min-h-[44px] min-w-[44px] rounded-full border border-transparent hover:border-cyan-500/40 flex items-center justify-center text-[#8FA5C2] hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedStoryId === story.id ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-[#22D3EE]" />
                          )}
                        </button>

                        {/* WhatsApp Share */}
                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                            story.headline + ' ' + (typeof window !== 'undefined' ? window.location.origin : '') + '/app?country=' + story.country
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Share story on WhatsApp"
                          title="Share on WhatsApp"
                          className="min-h-[44px] min-w-[44px] rounded-full border border-transparent hover:border-cyan-500/40 flex items-center justify-center text-emerald-400 transition-colors cursor-pointer text-xs font-bold font-mono-tabular"
                        >
                          WA
                        </a>

                        {/* X (Twitter) Share */}
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                            story.headline
                          )}&url=${encodeURIComponent(
                            (typeof window !== 'undefined' ? window.location.origin : '') + '/app?country=' + story.country
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Share story on X"
                          title="Share on X"
                          className="min-h-[44px] min-w-[44px] rounded-full border border-transparent hover:border-cyan-500/40 flex items-center justify-center text-cyan-300 transition-colors cursor-pointer text-xs font-bold font-mono-tabular"
                        >
                          X
                        </a>

                        {onToggleBookmark && (
                          <button
                            type="button"
                            onClick={() => onToggleBookmark(story)}
                            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark story'}
                            title={isBookmarked ? 'Saved in Bookmarks' : 'Bookmark story'}
                            className={`min-h-[44px] min-w-[44px] rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                              isBookmarked
                                ? 'border-cyan-400 bg-cyan-500/20 text-[#22D3EE]'
                                : 'border-transparent hover:border-cyan-500/40 text-[#8FA5C2] hover:text-white'
                            }`}
                          >
                            <Bookmark
                              className="w-4 h-4"
                              fill={isBookmarked ? 'currentColor' : 'none'}
                            />
                          </button>
                        )}
                        {onOpenTimeline && (
                          <button
                            type="button"
                            onClick={() => onOpenTimeline(story)}
                            aria-label="Track story timeline across days"
                            title="Timeline view across days"
                            className="min-h-[44px] min-w-[44px] rounded-full border border-transparent hover:border-cyan-500/40 flex items-center justify-center text-[#8FA5C2] hover:text-white transition-colors cursor-pointer"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        {onShareStoryCard && (
                          <button
                            type="button"
                            onClick={() => onShareStoryCard(story)}
                            aria-label="Share story as image card"
                            title="Share story as an image card with source link"
                            className="min-h-[44px] min-w-[44px] rounded-full border border-transparent hover:border-cyan-500/40 flex items-center justify-center text-[#8FA5C2] hover:text-white transition-colors cursor-pointer"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Headline */}
                    <button
                      type="button"
                      onClick={() => onSelectStory(story)}
                      className="text-left w-full group cursor-pointer"
                    >
                      <h3
                        className={`text-sm sm:text-base font-bold leading-snug group-hover:text-[#22D3EE] transition-colors ${
                          idx === 0 ? 'text-base sm:text-lg' : ''
                        }`}
                      >
                        {translated ? translated.headline : story.headline}
                      </h3>
                    </button>

                    {/* Summary */}
                    <p
                      className={`text-xs sm:text-[13px] leading-relaxed ${
                        isDark ? 'text-[#8FA5C2]' : 'text-[#1E3A5F]'
                      }`}
                    >
                      {translated ? translated.summary : story.summary}
                    </p>

                    {/* Importance Bar & On-Demand Hindi/Punjabi Translation */}
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <span className="text-[11px] font-mono-tabular text-[#22D3EE] font-semibold">
                          Importance {story.importance.toFixed(1)}/10
                        </span>
                        <div
                          className={`w-20 h-1.5 rounded-full overflow-hidden ${
                            isDark ? 'bg-white/10' : 'bg-black/10'
                          }`}
                          aria-label={`Importance ${story.importance} out of 10`}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-200"
                            style={{
                              width: `${importancePct}%`,
                              backgroundColor:
                                story.importance >= 8
                                  ? '#F87171'
                                  : story.importance >= 6.5
                                  ? '#38BDF8'
                                  : '#22D3EE',
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {(['hi', 'pa'] as const).map((langCode) => {
                          const tKey = `${story.id}_${langCode}`;
                          const isBusy = translatingId === tKey;
                          const hasTrans = Boolean(
                            localTranslations[tKey] ||
                              getCachedTranslation(story.id, langCode)
                          );
                          return (
                            <button
                              key={langCode}
                              type="button"
                              onClick={() => handleTranslateStory(story, langCode)}
                              disabled={isBusy}
                              className={`min-h-[44px] px-3 py-1 rounded-full border text-[11px] font-mono-tabular inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                hasTrans
                                  ? 'border-cyan-400 bg-cyan-500/20 text-[#22D3EE] font-semibold'
                                  : isDark
                                  ? 'border-cyan-500/25 text-[#8FA5C2] hover:text-white'
                                  : 'border-cyan-700/20 text-[#1E3A5F] hover:text-black'
                              }`}
                            >
                              {isBusy ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Languages className="w-3 h-3" />
                              )}
                              <span>{langCode === 'hi' ? 'हिन्दी' : 'ਪੰਜਾਬੀ'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Trust Signals, Audio Briefing ("Listen"), Source Badges, Diversity Dots, Contradiction Check & Report Issue */}
                    <StoryTrustSignals story={story} settings={settings} showAudio />
                  </div>
                </div>
              </li>
            );
          })}
          </ol>

          {/* 6. Add a "Show more" button under Latest */}
          {activeTab === 'latest' && visibleLatest.length < latestStories.length && (
            <div className="p-4 sm:p-5 text-center border-t border-cyan-500/20">
              <button
                type="button"
                onClick={() => setLatestLimit((prev) => prev + 30)}
                className="px-5 py-2.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-xs font-mono-tabular font-bold text-[#22D3EE] transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <span>Show more</span>
                <span className="opacity-75 font-normal">
                  ({latestStories.length - visibleLatest.length} remaining)
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
