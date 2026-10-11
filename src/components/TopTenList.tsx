import React from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { AppSettings, Story } from '../types';
import {
  formatRelativeTime,
  getCountryFlag,
  TOPIC_COLORS,
} from '../utils/sanitize';

interface TopTenListProps {
  stories: Story[];
  isLoading: boolean;
  selectedStoryId: string | null;
  onSelectStory: (story: Story) => void;
  onSelectCountry: (countryCode: string) => void;
  settings: AppSettings;
}

export const TopTenList: React.FC<TopTenListProps> = ({
  stories,
  isLoading,
  selectedStoryId,
  onSelectStory,
  onSelectCountry,
  settings,
}) => {
  const isDark = settings.theme === 'dark';
  const topTen = stories.slice(0, 10);

  return (
    <section
      id="top-stories"
      aria-labelledby="top-ten-heading"
      className={`rounded-2xl border flex flex-col transition-colors duration-200 ${
        isDark
          ? 'bg-[#0F172A]/85 border-slate-800/80 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}
    >
      <div
        className={`p-4 border-b flex items-center justify-between gap-2 ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}
      >
        <div>
          <h2 id="top-ten-heading" className="text-base font-bold tracking-tight">
            Top 10 Right Now
          </h2>
          <p className={`text-xs font-mono-tabular ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Ranked by global importance & multi-source corroboration
          </p>
        </div>
        <span className="text-xs font-mono-tabular text-teal-400">
          {topTen.length}/10 active
        </span>
      </div>

      {isLoading && topTen.length === 0 ? (
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="space-y-2">
              <div className="h-3.5 w-1/2 rounded bg-slate-700/30 animate-pulse" />
              <div className="h-5 w-full rounded bg-slate-700/40 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-slate-700/20 animate-pulse" />
            </div>
          ))}
        </div>
      ) : topTen.length === 0 ? (
        <div className="p-8 text-center">
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            No data matches the current filter criteria.
          </p>
        </div>
      ) : (
        <ol className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
          {topTen.map((story, idx) => {
            const rankStr = String(idx + 1).padStart(2, '0');
            const topicColor = TOPIC_COLORS[story.topic]?.hex || '#14B8A6';
            const isSelected = selectedStoryId === story.id;
            const importancePct = Math.min(100, Math.max(10, Math.round(story.importance * 10)));

            return (
              <li
                key={story.id}
                className={`p-4 transition-colors duration-150 ${
                  isSelected
                    ? isDark
                      ? 'bg-teal-500/10'
                      : 'bg-teal-50/80'
                    : isDark
                    ? 'hover:bg-slate-800/40'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Rank number */}
                  <span
                    className={`font-mono-tabular text-sm font-bold pt-0.5 select-none shrink-0 ${
                      idx < 3 ? 'text-teal-400' : isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {rankStr}
                  </span>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Clean unboxed metadata row */}
                    <div
                      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono-tabular ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectCountry(story.country)}
                        className="font-semibold hover:text-teal-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        title={`Open ${story.countryName} Country Intelligence`}
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
                        {story.sources.length} {story.sources.length === 1 ? 'source' : 'sources'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(story.time)}</span>
                      <span aria-hidden="true">·</span>
                      <span className={story.isDeveloping ? 'text-amber-400' : 'text-teal-400'}>
                        {story.isDeveloping
                          ? 'Developing'
                          : `${Math.round(story.confidence * 100)}% verified`}
                      </span>
                    </div>

                    {/* Headline (tappable to focus on map) */}
                    <button
                      type="button"
                      onClick={() => onSelectStory(story)}
                      className="text-left w-full group cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-500 rounded"
                    >
                      <h3 className="text-sm sm:text-[15px] font-semibold leading-snug group-hover:text-teal-400 transition-colors">
                        {story.headline}
                      </h3>
                    </button>

                    {/* 2-Line Summary */}
                    <p
                      className={`text-xs sm:text-[13px] leading-relaxed line-clamp-2 ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {story.summary}
                    </p>

                    {/* Importance Bar & Direct Source Links */}
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                      {/* Importance Bar */}
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <span
                          className={`text-[11px] font-mono-tabular ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          Impact {story.importance.toFixed(1)}
                        </span>
                        <div
                          className={`w-20 h-1.5 rounded-full overflow-hidden ${
                            isDark ? 'bg-slate-800' : 'bg-slate-200'
                          }`}
                          aria-label={`Importance ${story.importance} out of 10`}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-200"
                            style={{
                              width: `${importancePct}%`,
                              backgroundColor: topicColor,
                            }}
                          />
                        </div>
                      </div>

                      {/* Source links & Map focus button */}
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <button
                          type="button"
                          onClick={() => onSelectStory(story)}
                          className={`inline-flex items-center gap-1 hover:text-teal-400 cursor-pointer ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                          title="Locate on World Map"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Map</span>
                        </button>
                        {story.sources.slice(0, 3).map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-teal-400 hover:underline whitespace-nowrap"
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
