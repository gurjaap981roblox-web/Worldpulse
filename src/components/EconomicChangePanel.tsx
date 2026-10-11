import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ExternalLink } from 'lucide-react';
import {
  AppSettings,
  CoinMarket,
  FxRateShift,
  MacroCountryIndicator,
  Story,
} from '../types';
import { formatRelativeTime, getCountryFlag } from '../utils/sanitize';

interface EconomicChangePanelProps {
  fxRates: FxRateShift[];
  macroIndicators: MacroCountryIndicator[];
  coins: CoinMarket[];
  stories: Story[];
  isLoading: boolean;
  onSelectCountry: (countryCode: string) => void;
  onSelectStory: (story: Story) => void;
  settings: AppSettings;
}

type EconTab = 'fx' | 'macro' | 'wire';

function renderFxSparkline(points: number[], isUp: boolean): React.ReactNode {
  if (!points || points.length < 2) return null;
  const width = 64;
  const height = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 0.0001;

  const coords = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      <polyline
        fill="none"
        stroke={isUp ? '#10B981' : '#EF4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
}

export const EconomicChangePanel: React.FC<EconomicChangePanelProps> = ({
  fxRates,
  macroIndicators,
  coins,
  stories,
  isLoading,
  onSelectCountry,
  onSelectStory,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<EconTab>('fx');
  const isDark = settings.theme === 'dark';

  const econStories = stories.filter(
    (s) => s.topic === 'Economy' || s.topic === 'Markets'
  );

  return (
    <section
      id="economic-change"
      aria-labelledby="economic-change-heading"
      className={`border border-t-2 transition-colors duration-200 ${
        isDark
          ? 'bg-[#101217] border-[#222631] border-t-[#F3F2EE] text-[#F3F2EE]'
          : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#181615] text-[#181615]'
      }`}
    >
      {/* Editorial Section Masthead */}
      <div
        className={`px-4 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B]">
            <span>Section 04</span>
            <span aria-hidden="true">/</span>
            <span>Macroeconomic &amp; Sovereign FX Ledger</span>
          </div>
          <h2
            id="economic-change-heading"
            className="font-editorial text-lg font-semibold tracking-tight mt-0.5"
          >
            Economic &amp; Currency Change Monitor
          </h2>
        </div>

        {/* Segmented Institutional Ledger Tabs */}
        <div
          role="tablist"
          aria-label="Economic change views"
          className={`flex items-center border ${
            isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0] border-[#DCD5C7]'
          }`}
        >
          {(
            [
              { key: 'fx', label: 'Sovereign FX (7d Δ)' },
              { key: 'macro', label: 'G20 GDP & CPI' },
              { key: 'wire', label: `Macro Wire (${econStories.length})` },
            ] as Array<{ key: EconTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`min-h-[40px] px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

      {/* Tab 1: Sovereign FX Rate Shifts (ECB / Frankfurter Live) */}
      {activeTab === 'fx' && (
        <div className="overflow-x-auto">
          {isLoading && fxRates.length === 0 ? (
            <div className="p-4 space-y-2.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-9 bg-stone-500/10 animate-pulse" />
              ))}
            </div>
          ) : fxRates.length === 0 ? (
            <div className="p-6 text-xs font-mono-tabular text-[#8C93A1]">
              No data from ECB Foreign Exchange feed.
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b font-mono-tabular text-[11px] uppercase tracking-wider ${
                      isDark
                        ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1]'
                        : 'bg-[#EFEAE0]/60 border-[#DCD5C7] text-[#666159]'
                    }`}
                  >
                    <th className="py-2.5 px-4 font-medium">Pair / Currency</th>
                    <th className="py-2.5 px-3 font-medium text-right">Spot Rate</th>
                    <th className="py-2.5 px-3 font-medium text-right">24h Δ</th>
                    <th className="py-2.5 px-3 font-medium text-right">7d Δ</th>
                    <th className="py-2.5 px-4 font-medium text-right">7d Trend</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y font-mono-tabular ${
                    isDark ? 'divide-[#222631]' : 'divide-[#DCD5C7]'
                  }`}
                >
                  {fxRates.map((fx) => {
                    const is1dUp = fx.change1dPct >= 0;
                    const is7dUp = fx.change7dPct >= 0;
                    return (
                      <tr
                        key={fx.pair}
                        className={`transition-colors ${
                          isDark ? 'hover:bg-[#151820]' : 'hover:bg-[#EFEAE0]/50'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-sans">
                          <button
                            type="button"
                            onClick={() => onSelectCountry(fx.country)}
                            className="text-left group cursor-pointer flex items-center gap-2"
                          >
                            <span>{getCountryFlag(fx.country)}</span>
                            <div>
                              <div className="font-mono-tabular font-semibold group-hover:text-[#E05A2B] transition-colors">
                                {fx.pair}
                              </div>
                              <div
                                className={`text-[11px] ${
                                  isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                                }`}
                              >
                                {fx.currencyName}
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {fx.rate >= 10 ? fx.rate.toFixed(2) : fx.rate.toFixed(4)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-medium ${
                            is1dUp ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          <span className="inline-flex items-center justify-end gap-0.5">
                            {is1dUp ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            {is1dUp ? '+' : ''}
                            {fx.change1dPct.toFixed(2)}%
                          </span>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-semibold ${
                            is7dUp ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {is7dUp ? '+' : ''}
                          {fx.change7dPct.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex justify-end">
                            {renderFxSparkline(fx.sparkline, is7dUp)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div
                className={`px-4 py-2.5 border-t flex items-center justify-between text-[11px] font-mono-tabular ${
                  isDark
                    ? 'border-[#222631] bg-[#090A0D]/60 text-[#8C93A1]'
                    : 'border-[#DCD5C7] bg-[#EFEAE0]/40 text-[#666159]'
                }`}
              >
                <span>Base: USD · Reference Date: {fxRates[0]?.asOf || 'Latest'}</span>
                <a
                  href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#E05A2B] underline inline-flex items-center gap-1"
                >
                  <span>ECB Reference Feed</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: G20 Sovereign Macroeconomic Indicators (World Bank Live) */}
      {activeTab === 'macro' && (
        <div className="overflow-x-auto">
          {macroIndicators.length === 0 ? (
            <div className="p-6 text-xs font-mono-tabular text-[#8C93A1]">
              No data from World Bank macroeconomic feed.
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b font-mono-tabular text-[11px] uppercase tracking-wider ${
                      isDark
                        ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1]'
                        : 'bg-[#EFEAE0]/60 border-[#DCD5C7] text-[#666159]'
                    }`}
                  >
                    <th className="py-2.5 px-4 font-medium">Economy</th>
                    <th className="py-2.5 px-3 font-medium text-right">Real GDP YoY</th>
                    <th className="py-2.5 px-3 font-medium text-right">GDP Shift</th>
                    <th className="py-2.5 px-3 font-medium text-right">CPI Inflation</th>
                    <th className="py-2.5 px-4 font-medium text-right">CPI Shift</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y font-mono-tabular ${
                    isDark ? 'divide-[#222631]' : 'divide-[#DCD5C7]'
                  }`}
                >
                  {macroIndicators.map((row) => {
                    const gdpUp = (row.gdpDeltaPct ?? 0) >= 0;
                    const cpiDown = (row.cpiDeltaPct ?? 0) <= 0; // Lower inflation is positive disinflation
                    return (
                      <tr
                        key={row.country}
                        className={`transition-colors ${
                          isDark ? 'hover:bg-[#151820]' : 'hover:bg-[#EFEAE0]/50'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-sans">
                          <button
                            type="button"
                            onClick={() => onSelectCountry(row.country)}
                            className="font-semibold hover:text-[#E05A2B] inline-flex items-center gap-2 cursor-pointer"
                          >
                            <span>{getCountryFlag(row.country)}</span>
                            <span>{row.countryName}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {row.gdpGrowthPct !== null ? `${row.gdpGrowthPct.toFixed(1)}%` : 'No data'}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right ${
                            row.gdpDeltaPct === null
                              ? 'text-[#8C93A1]'
                              : gdpUp
                              ? 'text-emerald-500'
                              : 'text-rose-500'
                          }`}
                        >
                          {row.gdpDeltaPct !== null
                            ? `${row.gdpDeltaPct >= 0 ? '+' : ''}${row.gdpDeltaPct.toFixed(1)} pp`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {row.cpiInflationPct !== null
                            ? `${row.cpiInflationPct.toFixed(1)}%`
                            : 'No data'}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right ${
                            row.cpiDeltaPct === null
                              ? 'text-[#8C93A1]'
                              : cpiDown
                              ? 'text-emerald-500'
                              : 'text-amber-500'
                          }`}
                        >
                          {row.cpiDeltaPct !== null
                            ? `${row.cpiDeltaPct >= 0 ? '+' : ''}${row.cpiDeltaPct.toFixed(1)} pp`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div
                className={`px-4 py-2.5 border-t flex items-center justify-between text-[11px] font-mono-tabular ${
                  isDark
                    ? 'border-[#222631] bg-[#090A0D]/60 text-[#8C93A1]'
                    : 'border-[#DCD5C7] bg-[#EFEAE0]/40 text-[#666159]'
                }`}
              >
                <span>Indicators: NY.GDP.MKTP.KD.ZG &amp; FP.CPI.TOTL.ZG (pp = percentage points)</span>
                <a
                  href="https://data.worldbank.org/indicator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#E05A2B] underline inline-flex items-center gap-1"
                >
                  <span>World Bank Open Data</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Live Economic & Central Bank Wire + Top Crypto Benchmarks */}
      {activeTab === 'wire' && (
        <div className="divide-y divide-[#222631]">
          {/* Benchmark Digital Assets Summary Bar */}
          {coins.length > 0 && (
            <div
              className={`p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b ${
                isDark
                  ? 'bg-[#090A0D]/60 border-[#222631]'
                  : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
              }`}
            >
              {coins.slice(0, 4).map((c) => {
                const isUp = c.change24h >= 0;
                return (
                  <a
                    key={c.id}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-mono-tabular text-xs group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold group-hover:text-[#E05A2B]">{c.symbol}/USD</span>
                      <span className={isUp ? 'text-emerald-500' : 'text-rose-500'}>
                        {isUp ? '+' : ''}
                        {c.change24h.toFixed(2)}%
                      </span>
                    </div>
                    <div className={`text-[11px] mt-0.5 ${isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}`}>
                      ${c.currentPrice.toLocaleString()}
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Economic & Markets Dispatches */}
          {econStories.length === 0 ? (
            <div className="p-6 text-xs text-[#8C93A1]">
              No active economic or market stories in current filter window.
            </div>
          ) : (
            <ul className={`divide-y ${isDark ? 'divide-[#222631]' : 'divide-[#DCD5C7]'}`}>
              {econStories.slice(0, 6).map((story) => (
                <li key={story.id} className="p-3.5 space-y-1">
                  <div
                    className={`flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular ${
                      isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectCountry(story.country)}
                      className="font-semibold hover:text-[#E05A2B] cursor-pointer"
                    >
                      {getCountryFlag(story.country)} {story.countryName}
                    </button>
                    <span>·</span>
                    <span className="text-amber-500 font-semibold">{story.topic}</span>
                    <span>·</span>
                    <span>Impact {story.importance.toFixed(1)}/10</span>
                    <span>·</span>
                    <span>{formatRelativeTime(story.time)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectStory(story)}
                    className="text-left w-full text-sm font-semibold hover:text-[#E05A2B] transition-colors cursor-pointer"
                  >
                    {story.headline}
                  </button>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono-tabular">
                    {story.sources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#E05A2B] hover:underline inline-flex items-center gap-1"
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
      )}
    </section>
  );
};
