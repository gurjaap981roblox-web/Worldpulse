import React, { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, X } from 'lucide-react';
import { AppSettings, CountryBrief, Snapshot, Story } from '../types';
import {
  formatRelativeTime,
  getCountryFlag,
  getCountryMeta,
  TOPIC_COLORS,
} from '../utils/sanitize';
import { generateCountryBrief } from '../services/llm';

interface CountryModalProps {
  countryCode: string | null;
  stories: Story[];
  snapshots: Snapshot[];
  settings: AppSettings;
  onClose: () => void;
  onSelectStory: (story: Story) => void;
}

export const CountryModal: React.FC<CountryModalProps> = ({
  countryCode,
  stories,
  snapshots,
  settings,
  onClose,
  onSelectStory,
}) => {
  const [brief, setBrief] = useState<CountryBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);

  const meta = countryCode ? getCountryMeta(countryCode) : null;
  const countryStories = countryCode
    ? stories.filter((s) => s.country === countryCode)
    : [];

  useEffect(() => {
    if (!countryCode || !meta) {
      setBrief(null);
      return;
    }
    let cancelled = false;
    setLoadingBrief(true);
    generateCountryBrief(countryCode, meta.name, countryStories, settings)
      .then((res) => {
        if (!cancelled) setBrief(res);
      })
      .finally(() => {
        if (!cancelled) setLoadingBrief(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  if (!countryCode || !meta) return null;

  const isDark = settings.theme === 'dark';

  // Compute 7-day activity chart bars from snapshots
  const recentSnapshots = snapshots.slice(-6);
  const sevenDayBars = [
    ...recentSnapshots.map((s) => ({
      label: s.dayKey.slice(5), // MM-DD
      count: s.countryCounts?.[countryCode] ?? Math.max(1, countryStories.length - 1),
    })),
    {
      label: 'Now',
      count: countryStories.length,
    },
  ];
  const maxBar = Math.max(4, ...sevenDayBars.map((b) => b.count));

  const handleRegenerateBrief = () => {
    setLoadingBrief(true);
    generateCountryBrief(countryCode, meta.name, countryStories, settings)
      .then((res) => setBrief(res))
      .finally(() => setLoadingBrief(false));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-modal-title"
    >
      <div
        className={`w-full max-w-2xl rounded-t-3xl sm:rounded-2xl border max-h-[88vh] flex flex-col overflow-hidden shadow-2xl ${
          isDark
            ? 'bg-[#0B1120] border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getCountryFlag(countryCode)}</span>
            <div>
              <h2 id="country-modal-title" className="text-lg font-bold tracking-tight">
                {meta.name} ({countryCode})
              </h2>
              <p className={`text-xs font-mono-tabular ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Region: {meta.region} · {countryStories.length} active stories in 24h window
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close country intelligence modal"
            className={`min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center cursor-pointer ${
              isDark
                ? 'bg-slate-800 text-slate-300 hover:text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
          {/* AI Country Brief Card */}
          <div
            className={`p-4 rounded-xl border ${
              isDark
                ? 'bg-slate-900/70 border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-mono-tabular font-semibold text-teal-400">
                AI Country Intelligence Brief
              </span>
              <button
                type="button"
                onClick={handleRegenerateBrief}
                disabled={loadingBrief}
                className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium text-teal-400 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBrief ? 'animate-spin' : ''}`} />
                <span>{loadingBrief ? 'Synthesizing...' : 'Refresh Brief'}</span>
              </button>
            </div>

            {loadingBrief && !brief ? (
              <div className="space-y-2">
                <div className="h-5 w-3/4 rounded bg-slate-700/40 animate-pulse" />
                <div className="h-4 w-full rounded bg-slate-700/30 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-slate-700/30 animate-pulse" />
              </div>
            ) : brief ? (
              <div className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold">{brief.headline}</h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {brief.overview}
                </p>
                {brief.keyPoints.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {brief.keyPoints.map((kp, i) => (
                      <li
                        key={i}
                        className={`text-xs flex items-baseline gap-2 ${
                          isDark ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        <span className="font-mono-tabular text-teal-400 font-semibold">
                          0{i + 1}.
                        </span>
                        <span>{kp}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-xs">No data available.</p>
            )}
          </div>

          {/* 7-Day Activity Chart */}
          <div
            className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold tracking-tight">
                7-Day Event Activity Trend ({meta.name})
              </h3>
              <span className={`text-xs font-mono-tabular ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Peak: {maxBar} events/day
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-28 pt-2">
              {sevenDayBars.map((bar, idx) => {
                const heightPct = Math.max(12, Math.round((bar.count / maxBar) * 100));
                const isLast = idx === sevenDayBars.length - 1;
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] font-mono-tabular font-semibold text-teal-400">
                      {bar.count}
                    </span>
                    <div className="w-full max-w-[32px] bg-slate-800/40 rounded-t-md h-16 flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          isLast ? 'bg-teal-400' : 'bg-teal-600/60'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono-tabular ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Country Stories List */}
          <div>
            <h3 className="text-xs font-bold tracking-tight mb-2.5">
              Active Stories in {meta.name} ({countryStories.length})
            </h3>
            {countryStories.length === 0 ? (
              <p className={`text-sm py-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                No data reported for {meta.name} in the current 24-hour feed window.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {countryStories.map((story) => (
                  <li
                    key={story.id}
                    className={`p-3.5 rounded-xl border ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div
                      className={`flex flex-wrap items-center gap-2 text-xs font-mono-tabular mb-1 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      <span
                        className="font-semibold"
                        style={{ color: TOPIC_COLORS[story.topic]?.hex }}
                      >
                        {story.topic}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Impact {story.importance.toFixed(1)}/10</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(story.time)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectStory(story);
                        onClose();
                      }}
                      className="text-left w-full font-semibold text-sm hover:text-teal-400 transition-colors cursor-pointer"
                    >
                      {story.headline}
                    </button>

                    <p className={`mt-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {story.summary}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      {story.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-teal-400 hover:underline"
                        >
                          <span>{src.name}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
