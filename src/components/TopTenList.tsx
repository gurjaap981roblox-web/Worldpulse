import React, { useState } from 'react';
import {
  Bookmark,
  Clock,
  ExternalLink,
  Languages,
  Loader2,
  MapPin,
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
      className={`border border-t-2 flex flex-col transition-colors duration-200 ${
        isDark
          ? 'bg-[#101217] border-[#222631] border-t-[#F3F2EE] text-[#F3F2EE]'
          : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#181615] text-[#181615]'
      }`}
    >
      <div
        className={`p-4 border-b flex items-center justify-between gap-2 ${
          isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B]">
            <span>Section 03</span>
            <span aria-hidden="true">/</span>
            <span>Priority Ledger</span>
          </div>
          <h2
            id="top-ten-heading"
            className="font-editorial text-lg font-semibold tracking-tight mt-0.5"
          >
            Top 10 Global Dispatches
          </h2>
        </div>
        <span className="text-xs font-mono-tabular text-[#E05A2B]">
          {topTen.length}/10 Ranked
        </span>
      </div>

      {isLoading && topTen.length === 0 ? (
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="space-y-2">
              <div className="h-3.5 w-1/2 bg-stone-500/15 animate-pulse" />
              <div className="h-5 w-full bg-stone-500/20 animate-pulse" />
              <div className="h-4 w-5/6 bg-stone-500/10 animate-pulse" />
            </div>
          ))}
        </div>
      ) : topTen.length === 0 ? (
        <div className="p-8 text-center">
          <p className={`text-sm font-mono-tabular ${isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}`}>
            {labels.collectingData}
          </p>
        </div>
      ) : (
        <ol className={`divide-y ${isDark ? 'divide-[#222631]' : 'divide-[#DCD5C7]'}`}>
          {topTen.map((story, idx) => {
            const rankStr = String(idx + 1).padStart(2, '0');
            const topicColor = TOPIC_COLORS[story.topic]?.hex || '#E05A2B';
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
                className={`p-4 transition-colors duration-150 ${
                  isSelected
                    ? isDark
                      ? 'bg-[#151820]'
                      : 'bg-[#EFEAE0]'
                    : isDark
                    ? 'hover:bg-[#151820]/60'
                    : 'hover:bg-[#EFEAE0]/50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Rank index */}
                  <span
                    className={`font-editorial text-lg font-bold leading-none pt-0.5 select-none shrink-0 ${
                      idx < 3 ? 'text-[#E05A2B]' : isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                    }`}
                  >
                    {rankStr}
                  </span>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Metadata row */}
                    <div
                      className={`flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular ${
                        isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <button
                          type="button"
                          onClick={() => onSelectCountry(story.country)}
                          className="font-semibold hover:text-[#E05A2B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          title={`Open ${story.countryName} Country Dossier`}
                        >
                          <span>{getCountryFlag(story.country)}</span>
                          <span>{story.country}</span>
                        </button>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold" style={{ color: topicColor }}>
                          {story.topic}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {story.sources.length} {story.sources.length === 1 ? 'src' : 'srcs'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatRelativeTime(story.time)}</span>
                        <span aria-hidden="true">·</span>
                        <span className={story.isDeveloping ? 'text-amber-500' : ''}>
                          {story.isDeveloping
                            ? 'Developing'
                            : `${Math.round(story.confidence * 100)}% conf`}
                        </span>
                        {translated && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="px-1.5 py-0.5 bg-[#E05A2B]/15 text-[#E05A2B] border border-[#E05A2B]/40 text-[10px]">
                              {labels.aiTranslated} ({translated.lang === 'pa' ? 'ਪੰਜਾਬੀ' : 'हिन्दी'})
                            </span>
                          </>
                        )}
                      </div>

                      {/* Quick Action Icons: Bookmark, Timeline, Share Card */}
                      <div className="flex items-center gap-1">
                        {onToggleBookmark && (
                          <button
                            type="button"
                            onClick={() => onToggleBookmark(story)}
                            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark story'}
                            title={isBookmarked ? 'Saved in Bookmarks' : 'Bookmark story'}
                            className={`p-1 transition-colors cursor-pointer ${
                              isBookmarked
                                ? 'text-[#E05A2B]'
                                : 'hover:text-[#E05A2B]'
                            }`}
                          >
                            <Bookmark
                              className="w-3.5 h-3.5"
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
                            className="p-1 hover:text-[#E05A2B] transition-colors cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onShareStoryCard && (
                          <button
                            type="button"
                            onClick={() => onShareStoryCard(story)}
                            aria-label="Share story as image card"
                            title="Share story as an image card with source link"
                            className="p-1 hover:text-[#E05A2B] transition-colors cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Headline */}
                    <button
                      type="button"
                      onClick={() => onSelectStory(story)}
                      className="text-left w-full group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E05A2B]"
                    >
                      <h3
                        className={`text-sm sm:text-[15px] font-semibold leading-snug group-hover:text-[#E05A2B] transition-colors ${
                          idx === 0 ? 'font-editorial text-base sm:text-[17px]' : ''
                        }`}
                      >
                        {translated ? translated.headline : story.headline}
                      </h3>
                    </button>

                    {/* 2-Line Summary */}
                    <p
                      className={`text-xs sm:text-[13px] leading-relaxed line-clamp-3 ${
                        isDark ? 'text-[#F3F2EE]/80' : 'text-[#181615]/80'
                      }`}
                    >
                      {translated ? translated.summary : story.summary}
                    </p>

                    {/* Importance Bar, On-Demand Hindi/Punjabi Translation & Direct Source Links */}
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-[130px]">
                        <span
                          className={`text-[11px] font-mono-tabular ${
                            isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                          }`}
                        >
                          Severity {story.importance.toFixed(1)}
                        </span>
                        <div
                          className={`w-16 h-1 overflow-hidden ${
                            isDark ? 'bg-[#222631]' : 'bg-[#DCD5C7]'
                          }`}
                          aria-label={`Importance ${story.importance} out of 10`}
                        >
                          <div
                            className="h-full transition-all duration-200"
                            style={{
                              width: `${importancePct}%`,
                              backgroundColor: topicColor,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular">
                        {/* On-demand Hindi / Punjabi AI translation buttons */}
                        <button
                          type="button"
                          onClick={() => handleTranslateStory(story, 'hi')}
                          disabled={translatingId === `${story.id}_hi`}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 border hover:border-[#E05A2B] cursor-pointer ${
                            isDark
                              ? 'border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                              : 'border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
                          }`}
                          title="Translate summary to Hindi (हिन्दी)"
                        >
                          {translatingId === `${story.id}_hi` ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Languages className="w-2.5 h-2.5 text-[#E05A2B]" />
                          )}
                          <span>हिन्दी</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTranslateStory(story, 'pa')}
                          disabled={translatingId === `${story.id}_pa`}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 border hover:border-[#E05A2B] cursor-pointer ${
                            isDark
                              ? 'border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                              : 'border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
                          }`}
                          title="Translate summary to Punjabi (ਪੰਜਾਬੀ)"
                        >
                          {translatingId === `${story.id}_pa` ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Languages className="w-2.5 h-2.5 text-[#E05A2B]" />
                          )}
                          <span>ਪੰਜਾਬੀ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectStory(story)}
                          className={`inline-flex items-center gap-1 hover:text-[#E05A2B] cursor-pointer ${
                            isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                          }`}
                          title="Locate on World Map"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>Locate</span>
                        </button>
                        {story.sources.slice(0, 3).map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-[#E05A2B] hover:underline whitespace-nowrap"
                          >
                            <span>{src.name}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
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
