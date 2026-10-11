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
        className={`border border-t-2 p-5 ${
          isDark
            ? 'bg-[#101217] border-[#222631] border-t-[#F3F2EE]'
            : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#181615]'
        }`}
      >
        <div className="h-5 w-48 bg-stone-500/20 animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 bg-stone-500/10 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!whatChanged) {
    return (
      <section
        id="changes-24h"
        className={`border border-t-2 p-6 ${
          isDark
            ? 'bg-[#101217] border-[#222631] border-t-[#F3F2EE] text-[#8C93A1]'
            : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#181615] text-[#666159]'
        }`}
      >
        <p className="text-sm font-mono-tabular">No data available for 24-hour comparison.</p>
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
      className={`border border-t-2 flex flex-col transition-colors duration-200 ${
        isDark
          ? 'bg-[#101217] border-[#222631] border-t-[#F3F2EE] text-[#F3F2EE]'
          : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#181615] text-[#181615]'
      }`}
    >
      {/* Header & Three Tabs: New, Escalating, Fading */}
      <div
        className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B]">
            <span>Section 06</span>
            <span aria-hidden="true">/</span>
            <span>Snapshot Comparison</span>
          </div>
          <h2
            id="changes-heading"
            className="font-editorial text-lg font-semibold tracking-tight mt-0.5"
          >
            Changed in the Last 24 Hours
          </h2>
        </div>

        {/* 3 Segmented Tabs: New, Escalating, Fading */}
        <div
          role="tablist"
          aria-label="24-hour change categories"
          className={`flex items-center border ${
            isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0] border-[#DCD5C7]'
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
              className={`min-h-[38px] px-3.5 py-1.5 text-xs font-mono-tabular transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.key
                  ? isDark
                    ? 'bg-[#F3F2EE] text-[#090A0D] font-semibold'
                    : 'bg-[#181615] text-[#FCFAF5] font-semibold'
                  : isDark
                  ? 'text-[#8C93A1] hover:text-[#F3F2EE]'
                  : 'text-[#666159] hover:text-[#181615]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Items */}
      <div className="divide-y divide-[#222631]">
        {activeItems.length === 0 ? (
          <p className={`text-sm p-6 text-center ${isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}`}>
            No data recorded in this category for the current window.
          </p>
        ) : (
          <ul className={`divide-y ${isDark ? 'divide-[#222631]' : 'divide-[#DCD5C7]'}`}>
            {activeItems.map((item, idx) => {
              const isDown = activeTab === 'fading' || item.deltaPct < 0;
              const absPct = Math.abs(Math.round(item.deltaPct || 18));
              const topicHex = TOPIC_COLORS[item.topic]?.hex || '#E05A2B';

              return (
                <li
                  key={idx}
                  className="p-4 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div
                      className={`flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular ${
                        isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectCountry(item.country)}
                        className="hover:text-[#E05A2B] hover:underline cursor-pointer"
                      >
                        {getCountryFlag(item.country)} {item.country}
                      </button>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold" style={{ color: topicHex }}>
                        {item.topic}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
                    <p className={`text-xs ${isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}`}>
                      {item.detail}
                    </p>
                  </div>

                  <div
                    className={`font-mono-tabular text-xs font-bold flex items-center gap-0.5 shrink-0 pt-0.5 ${
                      isDown ? 'text-emerald-500' : 'text-rose-500'
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

        {/* Unusual Country Activity & Big Market Moves */}
        <div
          className={`p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 ${
            isDark ? 'bg-[#090A0D]/50' : 'bg-[#EFEAE0]/40'
          }`}
        >
          <div>
            <h3
              className={`text-[11px] font-mono-tabular uppercase tracking-wider font-semibold mb-2 ${
                isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
              }`}
            >
              Unusual Country Activity (24h)
            </h3>
            <ul className="space-y-1.5">
              {whatChanged.unusualCountries.slice(0, 3).map((u, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-2 text-xs"
                >
                  <div className="truncate">
                    <span className="font-semibold">{u.country}</span>
                    <span className={isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}>
                      {' '}
                      — {u.reason}
                    </span>
                  </div>
                  <span className="font-mono-tabular font-semibold text-[#E05A2B] shrink-0 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />+{Math.abs(Math.round(u.deltaPct))}%
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3
              className={`text-[11px] font-mono-tabular uppercase tracking-wider font-semibold mb-2 ${
                isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
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
                        isUp ? 'text-emerald-500' : 'text-rose-500'
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
