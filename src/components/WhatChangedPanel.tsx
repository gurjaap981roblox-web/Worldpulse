import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { AppSettings, WhatChangedAnalysis } from '../types';
import { getCountryFlag, TOPIC_COLORS } from '../utils/sanitize';

interface WhatChangedPanelProps {
  whatChanged: WhatChangedAnalysis | null;
  isLoading: boolean;
  onSelectCountry: (countryCode: string) => void;
  settings: AppSettings;
}

type ChangeTab = 'new' | 'escalating' | 'fading';

export const WhatChangedPanel: React.FC<WhatChangedPanelProps> = ({
  whatChanged,
  isLoading,
  onSelectCountry,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<ChangeTab>('new');
  const isDark = settings.theme === 'dark';

  if (isLoading && !whatChanged) {
    return (
      <section
        id="changes-24h"
        aria-label="What changed in 24h loading"
        className={`rounded-2xl border p-5 ${
          isDark ? 'bg-[#0F172A]/85 border-slate-800/80' : 'bg-white border-slate-200'
        }`}
      >
        <div className="h-5 w-48 rounded bg-slate-700/40 animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 rounded-xl bg-slate-700/30 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!whatChanged) {
    return (
      <section
        id="changes-24h"
        className={`rounded-2xl border p-6 ${
          isDark ? 'bg-[#0F172A]/85 border-slate-800/80 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
        }`}
      >
        <p className="text-sm">No data available for 24-hour comparison.</p>
      </section>
    );
  }

  const activeItems =
    activeTab === 'new'
      ? whatChanged.newItems
      : activeTab === 'escalating'
      ? whatChanged.escalatingItems
      : whatChanged.fadingItems;

  return (
    <section
      id="changes-24h"
      aria-labelledby="changes-heading"
      className={`rounded-2xl border flex flex-col transition-colors duration-200 ${
        isDark
          ? 'bg-[#0F172A]/85 border-slate-800/80 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}
    >
      {/* Header & Three Tabs: New, Escalating, Fading */}
      <div
        className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}
      >
        <div>
          <h2 id="changes-heading" className="text-base font-bold tracking-tight">
            Changed in the Last 24h
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {whatChanged.summaryLine}
          </p>
        </div>

        {/* 3 Segmented Tabs: New, Escalating, Fading */}
        <div
          role="tablist"
          aria-label="24-hour change categories"
          className={`flex items-center gap-1 p-1 rounded-xl border ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          {(
            [
              { key: 'new', label: 'New' },
              { key: 'escalating', label: 'Escalating' },
              { key: 'fading', label: 'Fading' },
            ] as Array<{ key: ChangeTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.key
                  ? isDark
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'bg-white text-slate-900 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Items with Up/Down Arrows and Percentages */}
      <div className="p-4 space-y-3">
        {activeItems.length === 0 ? (
          <p className={`text-sm py-4 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            No data recorded in this category for the current window.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {activeItems.map((item, idx) => {
              const isDown = activeTab === 'fading' || item.deltaPct < 0;
              const absPct = Math.abs(Math.round(item.deltaPct || 18));
              const topicHex = TOPIC_COLORS[item.topic]?.hex || '#14B8A6';

              return (
                <li
                  key={idx}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                    isDark
                      ? 'bg-slate-900/60 border-slate-800/80'
                      : 'bg-slate-50/80 border-slate-200/80'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div
                      className={`flex flex-wrap items-center gap-2 text-xs font-mono-tabular ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectCountry(item.country)}
                        className="hover:text-teal-400 hover:underline cursor-pointer"
                      >
                        {getCountryFlag(item.country)} {item.country}
                      </button>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold" style={{ color: topicHex }}>
                        {item.topic}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {item.detail}
                    </p>
                  </div>

                  {/* Up / Down Arrow + Percentage */}
                  <div
                    className={`font-mono-tabular text-xs font-bold flex items-center gap-0.5 shrink-0 pt-0.5 ${
                      isDown ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isDown ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                    <span>
                      {isDown ? '-' : '+'}
                      {absPct}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Countries with Unusual Activity & Big Market Moves */}
        <div
          className={`pt-3 mt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-4 ${
            isDark ? 'border-slate-800/80' : 'border-slate-200'
          }`}
        >
          {/* Unusual Country Activity */}
          <div>
            <h3
              className={`text-xs font-semibold mb-2 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Countries with Unusual Activity (24h)
            </h3>
            <ul className="space-y-1.5">
              {whatChanged.unusualCountries.slice(0, 3).map((u, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-2 text-xs"
                >
                  <div className="truncate">
                    <span className="font-semibold">{u.country}</span>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                      {' '}
                      — {u.reason}
                    </span>
                  </div>
                  <span className="font-mono-tabular font-semibold text-amber-400 shrink-0 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />+{Math.abs(Math.round(u.deltaPct))}%
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Biggest 24h Market Moves */}
          <div>
            <h3
              className={`text-xs font-semibold mb-2 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Largest 24h Market Moves
            </h3>
            <ul className="space-y-1.5">
              {whatChanged.marketMoves.slice(0, 3).map((m, i) => {
                const isUp = m.change24h >= 0;
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 text-xs font-mono-tabular"
                  >
                    <span>
                      <strong className="font-sans">{m.name}</strong> ({m.symbol}) · $
                      {m.price.toLocaleString()}
                    </span>
                    <span
                      className={`font-semibold flex items-center ${
                        isUp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isUp ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {isUp ? '+' : ''}
                      {m.change24h.toFixed(2)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
