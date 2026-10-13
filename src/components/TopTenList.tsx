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
import { AppLanguage, AppSettings, Story, TranslatedStoryCacheEntry } from '../types';
import {
  formatRelativeTime,
  getCountryFlag,
  TOPIC_COLORS,
  UI_TRANSLATIONS,
} from '../utils/sanitize';
import { getCachedTranslation } from '../services/storage';
import { translateStoryOnDemand } from '../services/llm';
import { StoryTrustSignals } from './StoryTrustSignals';

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
}) => {
  const isDark = settings.theme === 'dark';
  const topTen = stories.slice(0, 10);
  const labels = UI_TRANSLATIONS[settings.language] || UI_TRANSLATIONS.en;

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
        className={`p-4 sm:p-5 border-b flex items-center justify-between gap-2 ${
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
            Top 10 Global Dispatches
          </h2>
        </div>
        <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/35 text-xs font-mono-tabular font-semibold text-[#22D3EE]">
          {topTen.length}/10 Ranked
        </span>
      </div>

      {isLoading && topTen.length === 0 ? (
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="space-y-2">
              <div className="h-3.5 w-1/2 skeleton-shimmer rounded" />
              <div className="h-5 w-full skeleton-shimmer rounded" />
              <div className="h-4 w-5/6 skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
      ) : topTen.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm font-mono-tabular text-[#8FA5C2]">
            {labels.collectingData}
          </p>
        </div>
      ) : (
        <ol className={`divide-y ${isDark ? 'divide-[#22D3EE]/20' : 'divide-[#0284C7]/15'}`}>
          {topTen.map((story, idx) => {
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
      )}
    </section>
  );
};
