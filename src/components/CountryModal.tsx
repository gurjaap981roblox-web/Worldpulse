import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, RefreshCw, X } from 'lucide-react';
import { AppSettings, CountryBrief, Snapshot, Story } from '../types';
import {
  formatRelativeTime,
  getCountryFlag,
  getCountryMeta,
  TOPIC_COLORS,
} from '../utils/sanitize';
import { generateCountryBrief } from '../services/llm';
import { AiDisclaimerLine } from './LegalTrustCenter';

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
  const [copiedLink, setCopiedLink] = useState(false);

  const meta = countryCode ? getCountryMeta(countryCode) : null;
  const countryStories = countryCode
    ? stories.filter((s) => s.country === countryCode)
    : [];

  // SEO Requirement 1 & 2: Update unique title, meta description, and synchronize query URL /app?country=XX
  useEffect(() => {
    if (!countryCode || !meta) return;
    const prevTitle = document.title;
    const descEl = document.querySelector('meta[name="description"]');
    const prevDesc = descEl?.getAttribute('content') || '';
    const newTitle = `${meta.name} (${countryCode}) Live Situation Dossier – WorldPulse`;
    const newDesc = `Live intelligence dossier for ${meta.name}. Verified global news dispatches, seismic sensors, and real-time telemetry on WorldPulse.`;
    document.title = newTitle;
    if (descEl) descEl.setAttribute('content', newDesc);

    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('country') !== countryCode) {
        url.searchParams.set('country', countryCode);
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    } catch {
      // ignore
    }

    return () => {
      document.title = prevTitle;
      if (descEl && prevDesc) descEl.setAttribute('content', prevDesc);
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('country')) {
          url.searchParams.delete('country');
          window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
        }
      } catch {
        // ignore
      }
    };
  }, [countryCode, meta?.name]);

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

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/app?country=${countryCode}`
    : `https://worldpulse-rw7q.onrender.com/app?country=${countryCode}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${meta.name} Live Situation Dossier on WorldPulse: ${shareUrl}`
  )}`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${meta.name} (${countryCode}) Live Situation Dossier – WorldPulse`
  )}&url=${encodeURIComponent(shareUrl)}`;

  const recentSnapshots = snapshots.slice(-6);
  const sevenDayBars = [
    ...recentSnapshots.map((s) => ({
      label: s.dayKey.slice(5),
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-modal-title"
    >
      <div
        className={`w-full max-w-2xl border max-h-[88vh] flex flex-col overflow-hidden rounded-2xl shadow-[0_0_50px_rgba(34,211,238,0.18)] ${
          isDark
            ? 'bg-[#0A1830] border-cyan-500/35 text-[#E6F1FF]'
            : 'bg-[#F0F6FC] border-cyan-600/30 text-[#050B16]'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
            isDark ? 'border-cyan-500/20 bg-[#050B16]/60' : 'border-cyan-700/20 bg-white/70'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0">{getCountryFlag(countryCode)}</span>
            <div className="min-w-0">
              <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-cyan-400 font-bold">
                Sovereign Country Dossier
              </div>
              <h2 id="country-modal-title" className="font-editorial text-xl font-bold tracking-tight truncate">
                {meta.name} ({countryCode})
              </h2>
              <p className={`text-xs font-mono-tabular truncate ${isDark ? 'text-[#8FA5C2]' : 'text-[#475569]'}`}>
                Region: {meta.region} · {countryStories.length} active dispatches in 24h
              </p>
            </div>
          </div>

          {/* Actions: Share buttons + Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="Copy country share link"
              title="Copy share link"
              className="min-h-[44px] min-w-[44px] rounded-full border border-cyan-500/25 hover:border-cyan-400 flex items-center justify-center text-cyan-300 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* WhatsApp Share */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share country dossier on WhatsApp"
              title="Share on WhatsApp"
              className="min-h-[44px] min-w-[44px] rounded-full border border-cyan-500/25 hover:border-cyan-400 flex items-center justify-center text-emerald-400 transition-colors cursor-pointer text-xs font-bold font-mono-tabular"
            >
              WA
            </a>

            {/* X Share */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share country dossier on X"
              title="Share on X"
              className="min-h-[44px] min-w-[44px] rounded-full border border-cyan-500/25 hover:border-cyan-400 flex items-center justify-center text-cyan-300 transition-colors cursor-pointer text-xs font-bold font-mono-tabular"
            >
              X
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close country intelligence modal"
              className="min-h-[44px] min-w-[44px] rounded-full border border-cyan-500/25 hover:border-cyan-400 flex items-center justify-center text-[#8FA5C2] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
          {/* AI Country Brief Card */}
          <div
            className={`p-4 rounded-xl border ${
              isDark
                ? 'bg-[#050B16]/80 border-cyan-500/25'
                : 'bg-white border-cyan-700/20'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-mono-tabular uppercase tracking-wider font-semibold text-cyan-400">
                AI Country Assessment
              </span>
              <button
                type="button"
                onClick={handleRegenerateBrief}
                disabled={loadingBrief}
                className="min-h-[36px] px-2.5 py-1 text-xs font-mono-tabular text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBrief ? 'animate-spin' : ''}`} />
                <span>{loadingBrief ? 'Synthesizing...' : 'Re-run Brief'}</span>
              </button>
            </div>

            {loadingBrief && !brief ? (
              <div className="space-y-2">
                <div className="h-5 w-3/4 bg-cyan-500/20 rounded animate-pulse" />
                <div className="h-4 w-full bg-cyan-500/15 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-cyan-500/15 rounded animate-pulse" />
              </div>
            ) : brief ? (
              <div className="space-y-2.5">
                <h3 className="font-editorial text-base font-semibold text-white">{brief.headline}</h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#E6F1FF]/85' : 'text-[#050B16]/85'}`}>
                  {brief.overview}
                </p>
                {brief.keyPoints.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {brief.keyPoints.map((kp, i) => (
                      <li
                        key={i}
                        className={`text-xs flex items-baseline gap-2 ${
                          isDark ? 'text-[#8FA5C2]' : 'text-[#475569]'
                        }`}
                      >
                        <span className="font-mono-tabular text-cyan-400 font-semibold">
                          0{i + 1}.
                        </span>
                        <span>{kp}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <AiDisclaimerLine
                  settings={settings}
                  contextLabel={`Country Brief: ${meta.name} (${countryCode})`}
                  contextExcerpt={`${brief.headline} — ${brief.overview}`}
                />
              </div>
            ) : (
              <p className="text-xs font-mono-tabular text-[#8FA5C2]">No data available.</p>
            )}
          </div>

          {/* 7-Day Activity Chart */}
          <div
            className={`p-4 rounded-xl border ${
              isDark ? 'bg-[#050B16]/80 border-cyan-500/25' : 'bg-white border-cyan-700/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3 font-mono-tabular">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-cyan-400">
                7-Day Dispatch Volume ({meta.name})
              </h3>
              <span className={`text-xs ${isDark ? 'text-[#8FA5C2]' : 'text-[#475569]'}`}>
                Peak: {maxBar} events/day
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-28 pt-2">
              {sevenDayBars.map((bar, idx) => {
                const heightPct = Math.max(12, Math.round((bar.count / maxBar) * 100));
                const isLast = idx === sevenDayBars.length - 1;
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] font-mono-tabular font-semibold text-cyan-400">
                      {bar.count}
                    </span>
                    <div
                      className={`w-full max-w-[32px] h-16 rounded-t flex items-end overflow-hidden ${
                        isDark ? 'bg-cyan-950/40' : 'bg-cyan-100'
                      }`}
                    >
                      <div
                        className={`w-full transition-all duration-300 rounded-t ${
                          isLast ? 'bg-[#22D3EE] shadow-[0_0_8px_#22D3EE]' : isDark ? 'bg-cyan-700/60' : 'bg-cyan-600/60'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono-tabular ${
                        isDark ? 'text-[#8FA5C2]' : 'text-[#475569]'
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
            <h3 className="text-xs font-mono-tabular uppercase tracking-wider font-semibold mb-2.5 text-cyan-400">
              Active Dispatches in {meta.name} ({countryStories.length})
            </h3>
            {countryStories.length === 0 ? (
              <p className={`text-sm py-4 font-mono-tabular ${isDark ? 'text-[#8FA5C2]' : 'text-[#475569]'}`}>
                No data reported for {meta.name} in the current 24-hour feed window.
              </p>
            ) : (
              <ul className={`border rounded-xl overflow-hidden divide-y ${isDark ? 'border-cyan-500/20 divide-cyan-500/15' : 'border-cyan-700/20 divide-cyan-700/15'}`}>
                {countryStories.map((story) => (
                  <li key={story.id} className="p-3.5 hover:bg-cyan-500/5 transition-colors">
                    <div
                      className={`flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular mb-1 ${
                        isDark ? 'text-[#8FA5C2]' : 'text-[#475569]'
                      }`}
                    >
                      <span
                        className="font-semibold px-2 py-0.5 rounded-full text-[10px]"
                        style={{
                          backgroundColor: `${TOPIC_COLORS[story.topic]?.hex || '#22D3EE'}22`,
                          color: TOPIC_COLORS[story.topic]?.hex || '#22D3EE',
                        }}
                      >
                        {story.topic}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#8FA5C2]">Severity {story.importance.toFixed(1)}/10</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#8FA5C2]">{formatRelativeTime(story.time)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectStory(story);
                        onClose();
                      }}
                      className="text-left w-full font-semibold text-sm hover:text-[#22D3EE] transition-colors cursor-pointer"
                    >
                      {story.headline}
                    </button>

                    <p className={`mt-1 text-xs leading-relaxed ${isDark ? 'text-[#E6F1FF]/80' : 'text-[#050B16]/80'}`}>
                      {story.summary}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-mono-tabular">
                      {story.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-cyan-400 hover:underline"
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
