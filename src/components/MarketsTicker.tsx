import React from 'react';
import { ArrowDownRight, ArrowUpRight, ExternalLink } from 'lucide-react';
import { AppSettings, CoinMarket, ExtraMarketAsset, FxRateShift, WikiTrend } from '../types';

interface MarketsTickerProps {
  coins: CoinMarket[];
  fxRates: FxRateShift[];
  extraMarkets?: ExtraMarketAsset[];
  wikiTrends: WikiTrend[];
  isLoading: boolean;
  settings: AppSettings;
  snapshotTakenAt?: number | string | null;
}

export const MarketsTicker: React.FC<MarketsTickerProps> = ({
  coins,
  fxRates,
  extraMarkets = [],
  wikiTrends,
  isLoading,
  settings,
  snapshotTakenAt,
}) => {
  const isDark = settings.theme === 'dark';

  const asOfTime = React.useMemo(() => {
    if (!snapshotTakenAt) return null;
    const d = new Date(snapshotTakenAt);
    if (Number.isNaN(d.getTime())) return null;
    try {
      if (settings?.timezone) {
        return new Intl.DateTimeFormat('en-GB', {
          timeZone: settings.timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(d);
      }
    } catch {
      // fallback to local time
    }
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }, [snapshotTakenAt, settings?.timezone]);

  return (
    <section
      aria-label="Live sovereign FX, stock indices, commodities, digital assets, and global attention index"
      className={`border transition-colors duration-200 ${
        isDark
          ? 'bg-[#101217] border-[#222631] text-[#F3F2EE]'
          : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615]'
      }`}
    >
      {/* Row 1: Stock Indices, Gold, Oil, USD/INR, Sovereign FX + Benchmark Digital Assets Ledger Ribbon */}
      <div
        className={`flex items-stretch overflow-x-auto no-scrollbar divide-x ${
          isDark ? 'divide-[#222631]' : 'divide-[#DCD5C7]'
        }`}
      >
        <div
          className={`px-4 py-2 shrink-0 flex flex-col justify-center ${
            isDark ? 'bg-[#090A0D]' : 'bg-[#EFEAE0]/60'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
              Live Tape
            </span>
            {asOfTime && (
              <span className={`text-[10px] font-mono-tabular font-medium ${isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}`}>
                as of {asOfTime}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold whitespace-nowrap">Indices · Gold · Oil · FX · Crypto</span>
        </div>

        {/* Extra Markets: Stock Indices, Gold, Oil, USD/INR */}
        {extraMarkets.map((asset) => {
          const isUp = (asset.changePct ?? 0) >= 0;
          return (
            <a
              key={asset.id}
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-3.5 py-2 flex flex-col justify-center whitespace-nowrap shrink-0 transition-colors ${
                isDark ? 'hover:bg-[#151820]' : 'hover:bg-[#EFEAE0]/50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-mono-tabular">
                <span className="font-bold text-[#E05A2B]">{asset.symbol}</span>
                <span className={isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}>{asset.category}</span>
              </div>
              <div className="flex items-center gap-2 font-mono-tabular text-xs mt-0.5">
                {asset.price !== null ? (
                  <>
                    <span className="font-semibold">
                      {asset.unit === '$' || asset.unit === '₹' ? asset.unit : ''}
                      {asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    {asset.changePct !== null && (
                      <span
                        className={`text-[11px] font-semibold inline-flex items-center ${
                          isUp ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {isUp ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {isUp ? '+' : ''}
                        {asset.changePct.toFixed(2)}%
                      </span>
                    )}
                  </>
                ) : (
                  <span className={isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}>No data</span>
                )}
              </div>
            </a>
          );
        })}

        {/* Key Sovereign FX pairs first */}
        {fxRates.slice(0, 5).map((fx) => {
          const isUp = fx.change1dPct >= 0;
          return (
            <a
              key={fx.pair}
              href={fx.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-3.5 py-2 flex flex-col justify-center whitespace-nowrap shrink-0 transition-colors ${
                isDark ? 'hover:bg-[#151820]' : 'hover:bg-[#EFEAE0]/50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-mono-tabular">
                <span className="font-bold">{fx.pair}</span>
                <span className={isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}>ECB</span>
              </div>
              <div className="flex items-center gap-2 font-mono-tabular text-xs mt-0.5">
                <span className="font-semibold">
                  {fx.rate >= 10 ? fx.rate.toFixed(2) : fx.rate.toFixed(4)}
                </span>
                <span
                  className={`text-[11px] font-semibold inline-flex items-center ${
                    isUp ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {isUp ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {isUp ? '+' : ''}
                  {fx.change1dPct.toFixed(2)}%
                </span>
              </div>
            </a>
          );
        })}

        {/* Digital Asset Benchmarks */}
        {isLoading && coins.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-8 w-28 bg-stone-500/15 animate-pulse" />
            ))}
          </div>
        ) : (
          coins.map((c) => {
            const chg = Number.isFinite(c.change24h) ? c.change24h : 0;
            const isUp = chg >= 0;
            return (
              <a
                key={c.id || c.symbol}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                title={asOfTime ? `${c.name} price as of ${asOfTime}` : undefined}
                className={`px-3.5 py-2 flex flex-col justify-center whitespace-nowrap shrink-0 transition-colors ${
                  isDark ? 'hover:bg-[#151820]' : 'hover:bg-[#EFEAE0]/50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-mono-tabular">
                  <span className="font-bold">{c.symbol}/USD</span>
                  <span className={isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}>{c.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono-tabular text-xs mt-0.5">
                  <span className="font-semibold">
                    $
                    {c.currentPrice >= 1
                      ? c.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : c.currentPrice.toFixed(4)}
                  </span>
                  <span
                    className={`text-[11px] font-semibold inline-flex items-center ${
                      isUp ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {isUp ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {isUp ? '+' : ''}
                    {chg.toFixed(2)}%
                  </span>
                </div>
              </a>
            );
          })
        )}
      </div>

      {/* Row 2: Wikipedia Global Reader Attention Strip */}
      {wikiTrends.length > 0 && (
        <div
          className={`px-4 py-2 border-t flex items-center gap-4 overflow-x-auto no-scrollbar text-xs ${
            isDark
              ? 'border-[#222631] bg-[#090A0D]/50 text-[#8C93A1]'
              : 'border-[#DCD5C7] bg-[#EFEAE0]/40 text-[#666159]'
          }`}
        >
          <span className="font-mono-tabular text-[11px] uppercase tracking-wider font-semibold text-[#E05A2B] shrink-0">
            Wikipedia Most Viewed:
          </span>
          {wikiTrends.slice(0, 8).map((w) => (
            <a
              key={w.title}
              href={w.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`hover:text-[#E05A2B] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                isDark ? 'text-[#F3F2EE]' : 'text-[#181615]'
              }`}
            >
              <span className="font-mono-tabular text-[#E05A2B]">0{w.rank}</span>
              <span className="font-medium">{w.displayTitle}</span>
              <span className="font-mono-tabular text-[11px] opacity-60">
                ({Math.round(w.views / 1000)}k)
              </span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </a>
          ))}
        </div>
      )}
    </section>
  );
};
