import React from 'react';
import { ArrowDownRight, ArrowUpRight, ExternalLink } from 'lucide-react';
import { AppSettings, CoinMarket, WikiTrend } from '../types';

interface MarketsTickerProps {
  coins: CoinMarket[];
  wikiTrends: WikiTrend[];
  isLoading: boolean;
  settings: AppSettings;
}

export const MarketsTicker: React.FC<MarketsTickerProps> = ({
  coins,
  wikiTrends,
  isLoading,
  settings,
}) => {
  const isDark = settings.theme === 'dark';

  return (
    <section
      aria-label="Live crypto markets and Wikipedia trending topics"
      className={`rounded-2xl border p-3.5 sm:p-4 transition-colors duration-200 ${
        isDark
          ? 'bg-[#0F172A]/85 border-slate-800/80 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}
    >
      {/* Top 10 Crypto Markets Strip */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
        <div className="shrink-0 pr-2 border-r border-slate-700/60">
          <span className="text-xs font-bold tracking-tight block">Markets (24h)</span>
          <a
            href="https://www.coingecko.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono-tabular text-teal-400 hover:underline inline-flex items-center gap-0.5"
          >
            <span>CoinGecko</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        {isLoading && coins.length === 0 ? (
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-10 w-36 rounded-lg bg-slate-700/30 animate-pulse" />
            ))}
          </div>
        ) : coins.length === 0 ? (
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            No data from CoinGecko market feed.
          </span>
        ) : (
          coins.map((c) => {
            const isUp = c.change24h >= 0;
            return (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`min-h-[44px] px-3 py-1.5 rounded-xl border flex items-center gap-3 transition-colors whitespace-nowrap shrink-0 ${
                  isDark
                    ? 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>{c.symbol}</span>
                    <span
                      className={`font-normal text-[11px] ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {c.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono-tabular text-xs">
                    <span>
                      $
                      {c.currentPrice >= 1
                        ? c.currentPrice.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : c.currentPrice.toFixed(4)}
                    </span>
                    <span
                      className={`font-semibold inline-flex items-center ${
                        isUp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isUp ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {isUp ? '+' : ''}
                      {c.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>

      {/* Wikipedia Most Viewed Trending Strip */}
      {wikiTrends.length > 0 && (
        <div
          className={`mt-2.5 pt-2.5 border-t flex items-center gap-3 overflow-x-auto no-scrollbar text-xs ${
            isDark ? 'border-slate-800/80 text-slate-300' : 'border-slate-200 text-slate-700'
          }`}
        >
          <span
            className={`font-mono-tabular text-[11px] font-semibold shrink-0 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Wikipedia Trending:
          </span>
          {wikiTrends.slice(0, 8).map((w) => (
            <a
              key={w.title}
              href={w.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span className="font-mono-tabular text-teal-400">#{w.rank}</span>
              <span className="font-medium">{w.displayTitle}</span>
              <span
                className={`font-mono-tabular text-[11px] ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                ({Math.round(w.views / 1000)}k)
              </span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          ))}
        </div>
      )}
    </section>
  );
};
