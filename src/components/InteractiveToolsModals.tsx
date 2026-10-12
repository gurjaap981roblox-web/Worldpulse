import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  MessageSquare,
  Scale,
  Send,
  Share2,
  X,
} from 'lucide-react';
import {
  AppSettings,
  AskWorldMessage,
  FxRateShift,
  MacroCountryIndicator,
  Snapshot,
  Story,
} from '../types';
import {
  COUNTRY_GAZETTEER,
  formatRelativeTime,
  formatTimeInTz,
  getCountryFlag,
  titleSimilarity,
  TOPIC_COLORS,
} from '../utils/sanitize';
import { askTheWorldQuery } from '../services/llm';
import { AiDisclaimerLine } from './LegalTrustCenter';

const ASK_WORLD_EXAMPLE_QUESTIONS = [
  'What are the top 3 highest-importance stories right now?',
  'What is happening in India and Punjab today?',
  'Which earthquakes or natural disasters were detected in the last 24h?',
  'Are there any active cyberattacks or data breaches reported?',
  'What are the latest conflict or diplomatic developments?',
  'How are global markets, sovereign FX, and economies shifting today?',
];

// ============================================================================
// 1. STORY TIMELINE MODAL (Follows one story across days)
// ============================================================================
interface StoryTimelineModalProps {
  story: Story | null;
  allStories: Story[];
  snapshots: Snapshot[];
  settings: AppSettings;
  onClose: () => void;
  onSelectStory: (story: Story) => void;
}

export const StoryTimelineModal: React.FC<StoryTimelineModalProps> = ({
  story,
  allStories,
  snapshots,
  settings,
  onClose,
  onSelectStory,
}) => {
  if (!story) return null;
  const isDark = settings.theme === 'dark';

  // Find related stories across the feed by cluster key, country+topic, or title similarity
  const relatedTimeline = allStories
    .filter((s) => {
      if (s.id === story.id) return true;
      if (s.eventClusterKey && s.eventClusterKey === story.eventClusterKey) return true;
      if (titleSimilarity(s.headline, story.headline) >= 0.25) return true;
      if (s.country === story.country && s.topic === story.topic) return true;
      return false;
    })
    .sort((a, b) => a.time - b.time);

  // Build multi-day activity progression from snapshots for this story's topic & country
  const dailyProgression = snapshots.slice(-7).map((snap) => ({
    dayKey: snap.dayKey,
    topicCount: snap.topicCounts[story.topic] || 0,
    countryCount: snap.countryCounts[story.country] || 0,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeline-modal-title"
    >
      <div
        className={`w-full max-w-3xl max-h-[88vh] flex flex-col border border-t-2 ${
          isDark
            ? 'bg-[#101217] border-[#222631] border-t-[#E05A2B] text-[#F3F2EE]'
            : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#E05A2B] text-[#181615]'
        }`}
      >
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Multi-Day Event &amp; Cluster Timeline</span>
            </div>
            <h2 id="timeline-modal-title" className="font-editorial text-lg sm:text-xl font-semibold mt-0.5">
              {story.headline}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close timeline modal"
            className="p-2 border border-transparent hover:border-[#E05A2B] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* 7-Day Snapshot Trajectory */}
          <div
            className={`p-4 border ${
              isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
            }`}
          >
            <p className="text-xs font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold mb-3">
              7-Day Historical Snapshot Volume ({getCountryFlag(story.country)} {story.countryName} · {story.topic})
            </p>
            <div className="grid grid-cols-7 gap-2 text-center font-mono-tabular text-xs">
              {dailyProgression.map((d, idx) => (
                <div
                  key={`${d.dayKey}-${idx}`}
                  className={`p-2 border ${
                    isDark ? 'border-[#222631] bg-[#101217]' : 'border-[#DCD5C7] bg-[#FCFAF5]'
                  }`}
                >
                  <div className="text-[10px] opacity-70">{d.dayKey.slice(5)}</div>
                  <div className="text-sm font-bold text-[#E05A2B] mt-1">{d.topicCount}</div>
                  <div className="text-[10px] opacity-70">{story.topic}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chronological Dispatches */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono-tabular uppercase tracking-wider font-semibold text-[#8C93A1]">
              Chronological Dispatches in Cluster ({relatedTimeline.length})
            </h3>
            <ol
              className={`relative border-l-2 border-[#E05A2B]/60 ml-3 pl-5 space-y-4`}
            >
              {relatedTimeline.map((item) => {
                const isAnchor = item.id === story.id;
                return (
                  <li
                    key={item.id}
                    className={`p-3.5 border relative ${
                      isAnchor
                        ? 'border-[#E05A2B] bg-[#E05A2B]/10'
                        : isDark
                        ? 'border-[#222631] bg-[#090A0D]'
                        : 'border-[#DCD5C7] bg-[#EFEAE0]/30'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-[#E05A2B] absolute -left-[27px] top-4" />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular text-[#8C93A1]">
                      <span>
                        {new Date(item.time).toISOString().slice(0, 10)} · {formatTimeInTz(item.time, settings.timezone)} ({formatRelativeTime(item.time)})
                      </span>
                      <span className="text-[#E05A2B] font-semibold">
                        Severity {item.importance.toFixed(1)}/10 · {Math.round(item.confidence * 100)}% conf
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectStory(item);
                        onClose();
                      }}
                      className="text-left font-editorial text-base font-semibold mt-1 hover:text-[#E05A2B] cursor-pointer block"
                    >
                      {item.headline}
                    </button>
                    <p className="text-xs sm:text-sm mt-1 opacity-85 leading-relaxed">
                      {item.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular">
                      {item.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#E05A2B] hover:underline"
                        >
                          <span>{src.name}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. COMPARE TWO COUNTRIES SIDE BY SIDE MODAL
// ============================================================================
interface CompareCountriesModalProps {
  isOpen: boolean;
  initialCountryA?: string;
  initialCountryB?: string;
  stories: Story[];
  macroIndicators: MacroCountryIndicator[];
  fxRates: FxRateShift[];
  snapshots: Snapshot[];
  settings: AppSettings;
  onClose: () => void;
  onSelectStory: (story: Story) => void;
}

export const CompareCountriesModal: React.FC<CompareCountriesModalProps> = ({
  isOpen,
  initialCountryA = 'IN',
  initialCountryB = 'US',
  stories,
  macroIndicators,
  fxRates,
  settings,
  onClose,
  onSelectStory,
}) => {
  const [countryA, setCountryA] = useState(initialCountryA || 'IN');
  const [countryB, setCountryB] = useState(initialCountryB || 'US');

  useEffect(() => {
    if (initialCountryA) setCountryA(initialCountryA);
  }, [initialCountryA]);

  const countryOptions = useMemo(
    () =>
      Object.values(COUNTRY_GAZETTEER)
        .filter((c) => c.code !== 'GL')
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  if (!isOpen) return null;
  const isDark = settings.theme === 'dark';

  const buildStats = (code: string) => {
    const meta = COUNTRY_GAZETTEER[code] || { code, name: code, region: 'Global' };
    const cStories = stories.filter((s) => s.country === code);
    const maxSev = cStories.reduce((m, s) => Math.max(m, s.importance), 0);
    const avgSev =
      cStories.length > 0
        ? cStories.reduce((acc, s) => acc + s.importance, 0) / cStories.length
        : 0;
    const avgSent =
      cStories.length > 0
        ? cStories.reduce((acc, s) => acc + s.sentiment, 0) / cStories.length
        : 0;
    const topics = Array.from(new Set(cStories.map((s) => s.topic)));
    const macro = macroIndicators.find((m) => m.country === code);
    const fx = fxRates.find((f) => f.country === code);

    return {
      meta,
      cStories,
      maxSev,
      avgSev,
      avgSent,
      topics,
      macro,
      fx,
    };
  };

  const statsA = buildStats(countryA);
  const statsB = buildStats(countryB);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-countries-title"
    >
      <div
        className={`w-full max-w-5xl max-h-[90vh] flex flex-col border border-t-2 ${
          isDark
            ? 'bg-[#101217] border-[#222631] border-t-[#E05A2B] text-[#F3F2EE]'
            : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#E05A2B] text-[#181615]'
        }`}
      >
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
              <Scale className="w-3.5 h-3.5" />
              <span>Bilateral Sovereign Intelligence Comparison</span>
            </div>
            <h2 id="compare-countries-title" className="font-editorial text-xl font-semibold mt-0.5">
              Compare Two Countries Side by Side
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close country comparison"
            className="p-2 border border-transparent hover:border-[#E05A2B] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono-tabular uppercase tracking-wider text-[#E05A2B] mb-1">
                Country A
              </label>
              <select
                value={countryA}
                onChange={(e) => setCountryA(e.target.value)}
                className={`w-full min-h-[42px] px-3 py-2 border text-sm font-mono-tabular ${
                  isDark
                    ? 'bg-[#090A0D] border-[#222631] text-[#F3F2EE]'
                    : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615]'
                }`}
              >
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {getCountryFlag(c.code)} {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono-tabular uppercase tracking-wider text-[#E05A2B] mb-1">
                Country B
              </label>
              <select
                value={countryB}
                onChange={(e) => setCountryB(e.target.value)}
                className={`w-full min-h-[42px] px-3 py-2 border text-sm font-mono-tabular ${
                  isDark
                    ? 'bg-[#090A0D] border-[#222631] text-[#F3F2EE]'
                    : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615]'
                }`}
              >
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {getCountryFlag(c.code)} {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Side-by-Side Comparison Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[statsA, statsB].map((st, idx) => (
              <div
                key={`${st.meta.code}-${idx}`}
                className={`p-4 border space-y-4 ${
                  isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/40 border-[#DCD5C7]'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-3 border-[#222631]/60">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{getCountryFlag(st.meta.code)}</span>
                    <div>
                      <h3 className="font-editorial text-lg font-bold">
                        {st.meta.name} ({st.meta.code})
                      </h3>
                      <span className="text-xs font-mono-tabular text-[#8C93A1]">
                        Region: {st.meta.region}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-[#E05A2B]/15 text-[#E05A2B] border border-[#E05A2B]/40 text-xs font-mono-tabular font-semibold">
                    {st.cStories.length} Dispatches
                  </span>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 font-mono-tabular text-xs">
                  <div className={`p-2.5 border ${isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'}`}>
                    <div className="text-[10px] text-[#8C93A1] uppercase">Peak Severity</div>
                    <div className="text-base font-bold text-[#E05A2B] mt-0.5">
                      {st.maxSev > 0 ? `${st.maxSev.toFixed(1)}/10` : 'No data'}
                    </div>
                  </div>
                  <div className={`p-2.5 border ${isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'}`}>
                    <div className="text-[10px] text-[#8C93A1] uppercase">Avg Severity</div>
                    <div className="text-base font-bold mt-0.5">
                      {st.avgSev > 0 ? st.avgSev.toFixed(1) : 'No data'}
                    </div>
                  </div>
                  <div className={`p-2.5 border ${isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'}`}>
                    <div className="text-[10px] text-[#8C93A1] uppercase">Sentiment</div>
                    <div
                      className={`text-base font-bold mt-0.5 ${
                        st.avgSent < -0.2
                          ? 'text-rose-500'
                          : st.avgSent > 0.2
                          ? 'text-emerald-500'
                          : ''
                      }`}
                    >
                      {st.cStories.length > 0 ? st.avgSent.toFixed(2) : 'No data'}
                    </div>
                  </div>
                </div>

                {/* Macro & FX Row */}
                <div className="grid grid-cols-3 gap-2 font-mono-tabular text-xs">
                  <div className={`p-2.5 border ${isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'}`}>
                    <div className="text-[10px] text-[#8C93A1] uppercase">GDP Growth</div>
                    <div className="text-sm font-semibold mt-0.5">
                      {st.macro?.gdpGrowthPct !== null && st.macro?.gdpGrowthPct !== undefined
                        ? `${st.macro.gdpGrowthPct.toFixed(1)}%`
                        : 'No data'}
                    </div>
                  </div>
                  <div className={`p-2.5 border ${isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'}`}>
                    <div className="text-[10px] text-[#8C93A1] uppercase">CPI Inflation</div>
                    <div className="text-sm font-semibold mt-0.5">
                      {st.macro?.cpiInflationPct !== null && st.macro?.cpiInflationPct !== undefined
                        ? `${st.macro.cpiInflationPct.toFixed(1)}%`
                        : 'No data'}
                    </div>
                  </div>
                  <div className={`p-2.5 border ${isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'}`}>
                    <div className="text-[10px] text-[#8C93A1] uppercase">FX vs USD</div>
                    <div className="text-sm font-semibold mt-0.5">
                      {st.fx ? `${st.fx.rate.toFixed(2)} (${st.fx.change1dPct >= 0 ? '+' : ''}${st.fx.change1dPct.toFixed(2)}%)` : st.meta.code === 'US' ? '1.00 (Base)' : 'No data'}
                    </div>
                  </div>
                </div>

                {/* Active Topics */}
                <div>
                  <div className="text-[11px] font-mono-tabular uppercase text-[#8C93A1] mb-1.5">
                    Active Topics
                  </div>
                  {st.topics.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {st.topics.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 text-xs font-mono-tabular border border-[#222631]"
                          style={{ color: TOPIC_COLORS[t]?.hex || '#E05A2B' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs font-mono-tabular text-[#8C93A1]">No data</span>
                  )}
                </div>

                {/* Top Dispatches for this Country */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono-tabular uppercase text-[#8C93A1]">
                    Top Monitored Dispatches
                  </div>
                  {st.cStories.length === 0 ? (
                    <p className="text-xs font-mono-tabular text-[#8C93A1]">
                      No active stories in current window.
                    </p>
                  ) : (
                    st.cStories.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        className={`p-2.5 border text-xs space-y-1 ${
                          isDark ? 'border-[#222631] bg-[#101217]' : 'border-[#DCD5C7] bg-[#FCFAF5]'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono-tabular text-[10px] text-[#8C93A1]">
                          <span className="text-[#E05A2B] font-semibold">
                            {s.topic} · Sev {s.importance.toFixed(1)}
                          </span>
                          <span>{formatRelativeTime(s.time)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectStory(s);
                            onClose();
                          }}
                          className="text-left font-semibold hover:text-[#E05A2B] block cursor-pointer"
                        >
                          {s.headline}
                        </button>
                        {s.sources[0] && (
                          <a
                            href={s.sources[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-mono-tabular text-[#E05A2B] hover:underline"
                          >
                            <span>{s.sources[0].name}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. SHARE STORY AS AN IMAGE CARD WITH SOURCE LINK
// ============================================================================
interface ShareImageCardModalProps {
  story: Story | null;
  settings: AppSettings;
  onClose: () => void;
}

export const ShareImageCardModal: React.FC<ShareImageCardModalProps> = ({
  story,
  settings,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!story || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#090A0D';
    ctx.fillRect(0, 0, width, height);

    // Top Vermilion Editorial Rule
    ctx.fillStyle = '#E05A2B';
    ctx.fillRect(0, 0, width, 10);

    // Inner Border Frame
    ctx.strokeStyle = '#222631';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, width - 72, height - 72);

    // Masthead
    ctx.fillStyle = '#E05A2B';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('WORLDPULSE · GLOBAL SITUATION DISPATCH', 72, 92);

    ctx.fillStyle = '#8C93A1';
    ctx.font = '20px monospace';
    const dateStr = new Date(story.time).toUTCString();
    ctx.fillText(dateStr, width - 72 - ctx.measureText(dateStr).width, 92);

    // Country + Topic + Severity Badge Row
    ctx.fillStyle = '#F3F2EE';
    ctx.font = 'bold 26px monospace';
    const metaLine = `${story.countryName.toUpperCase()} (${story.country})  |  TOPIC: ${story.topic.toUpperCase()}  |  SEVERITY: ${story.importance.toFixed(1)}/10  |  CONFIDENCE: ${Math.round(story.confidence * 100)}%`;
    ctx.fillText(metaLine, 72, 152);

    // Divider line
    ctx.fillStyle = '#222631';
    ctx.fillRect(72, 174, width - 144, 2);

    // Wrap Headline
    const wrapText = (
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      lineHeight: number,
      maxLines: number
    ) => {
      const words = text.split(' ');
      let line = '';
      let currentY = y;
      let linesCount = 0;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line.trim(), x, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
          linesCount++;
          if (linesCount >= maxLines - 1) {
            break;
          }
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), x, currentY);
      return currentY + lineHeight;
    };

    ctx.fillStyle = '#F3F2EE';
    ctx.font = 'bold 42px Georgia, serif';
    const nextY = wrapText(story.headline, 72, 238, width - 144, 52, 3);

    // Wrap Summary
    ctx.fillStyle = '#B8BFC9';
    ctx.font = '26px sans-serif';
    wrapText(story.summary, 72, nextY + 20, width - 144, 38, 3);

    // Bottom Source Attribution Box
    ctx.fillStyle = '#101217';
    ctx.fillRect(72, height - 135, width - 144, 72);
    ctx.strokeStyle = '#E05A2B';
    ctx.lineWidth = 2;
    ctx.strokeRect(72, height - 135, width - 144, 72);

    const primarySource = story.sources[0];
    ctx.fillStyle = '#E05A2B';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(
      `VERIFIED SOURCE: ${primarySource?.name || 'WorldPulse Wire'}`,
      96,
      height - 103
    );

    ctx.fillStyle = '#F3F2EE';
    ctx.font = '18px monospace';
    const srcUrl = primarySource?.url || window.location.origin;
    ctx.fillText(
      srcUrl.length > 85 ? `${srcUrl.slice(0, 82)}...` : srcUrl,
      96,
      height - 76
    );
  }, [story]);

  if (!story) return null;
  const isDark = settings.theme === 'dark';
  const primarySourceUrl = story.sources[0]?.url || window.location.href;
  const shareDeepLink = `${window.location.origin}/?story=${encodeURIComponent(story.id)}&country=${encodeURIComponent(story.country)}`;

  const handleDownloadCard = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `worldpulse-${story.country.toLowerCase()}-${story.id.slice(0, 20)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNativeShare = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current?.toBlob((b) => resolve(b), 'image/png')
      );
      if (blob && navigator.share) {
        const file = new File([blob], 'worldpulse-dispatch.png', { type: 'image/png' });
        await navigator.share({
          title: story.headline,
          text: `${story.headline}\nSource: ${primarySourceUrl}`,
          url: primarySourceUrl,
          files: [file],
        });
        return;
      }
    } catch {
      // fallback to download
    }
    handleDownloadCard();
  };

  const handleCopyDeepLink = () => {
    navigator.clipboard?.writeText(`${story.headline}\nSource: ${primarySourceUrl}\n WorldPulse Link: ${shareDeepLink}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-card-title"
    >
      <div
        className={`w-full max-w-3xl border border-t-2 ${
          isDark
            ? 'bg-[#101217] border-[#222631] border-t-[#E05A2B] text-[#F3F2EE]'
            : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#E05A2B] text-[#181615]'
        }`}
      >
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
          }`}
        >
          <div>
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
              Verified Social &amp; Press Dispatch Card
            </span>
            <h2 id="share-card-title" className="font-editorial text-lg font-semibold">
              Share Story as Image Card with Source Link
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share card modal"
            className="p-2 border border-transparent hover:border-[#E05A2B] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="border border-[#222631] overflow-hidden bg-[#090A0D]">
            <canvas
              ref={canvasRef}
              className="w-full h-auto block"
              aria-label="Generated story image card preview"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCard}
                className="min-h-[42px] px-4 py-2 bg-[#E05A2B] hover:bg-[#c94b20] text-white text-xs font-mono-tabular uppercase tracking-wider font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG Card</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className={`min-h-[42px] px-4 py-2 border text-xs font-mono-tabular uppercase tracking-wider font-semibold inline-flex items-center gap-2 cursor-pointer ${
                  isDark
                    ? 'border-[#222631] bg-[#090A0D] hover:border-[#F3F2EE]'
                    : 'border-[#DCD5C7] bg-[#EFEAE0] hover:border-[#181615]'
                }`}
              >
                <Share2 className="w-4 h-4 text-[#E05A2B]" />
                <span>Share Image &amp; Source</span>
              </button>

              <button
                type="button"
                onClick={handleCopyDeepLink}
                className={`min-h-[42px] px-4 py-2 border text-xs font-mono-tabular inline-flex items-center gap-2 cursor-pointer ${
                  isDark
                    ? 'border-[#222631] bg-[#090A0D] hover:border-[#F3F2EE]'
                    : 'border-[#DCD5C7] bg-[#EFEAE0] hover:border-[#181615]'
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied Source & Deep Link!' : 'Copy Source & Deep Link'}</span>
              </button>
            </div>

            <a
              href={primarySourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono-tabular text-[#E05A2B] hover:underline inline-flex items-center gap-1"
            >
              <span>Open Source Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. "ASK THE WORLD" CHAT MODAL (Answers ONLY from Supabase/monitored stories)
// ============================================================================
interface AskTheWorldModalProps {
  isOpen: boolean;
  stories: Story[];
  settings: AppSettings;
  onClose: () => void;
  onSelectStory: (story: Story) => void;
  initialQuestion?: string;
}

export const AskTheWorldModal: React.FC<AskTheWorldModalProps> = ({
  isOpen,
  stories,
  settings,
  onClose,
  onSelectStory,
  initialQuestion,
}) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AskWorldMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask any question about current world events. I answer strictly from the monitored stories with verified source links, and will state "Not enough data" if the answer is not in the current feed.',
      citations: [],
      createdAt: Date.now(),
    },
  ]);

  const runQuestion = async (rawQ: string) => {
    const q = rawQ.trim();
    if (!q || isLoading) return;

    const userMsg: AskWorldMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: q,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setIsLoading(true);

    try {
      const reply = await askTheWorldQuery(q, stories, settings);
      setMessages((prev) => [...prev, reply]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialQuestion && initialQuestion.trim()) {
      runQuestion(initialQuestion);
    }
  }, [isOpen, initialQuestion]);

  if (!isOpen) return null;
  const isDark = settings.theme === 'dark';

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    await runQuestion(question);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-world-title"
    >
      <div
        className={`w-full max-w-2xl h-[80vh] flex flex-col border border-t-2 ${
          isDark
            ? 'bg-[#101217] border-[#222631] border-t-[#E05A2B] text-[#F3F2EE]'
            : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#E05A2B] text-[#181615]'
        }`}
      >
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Strict Source-Grounded Intelligence Query ({stories.length} Stories Indexed)</span>
            </div>
            <h2 id="ask-world-title" className="font-editorial text-xl font-semibold mt-0.5">
              Ask the World
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Ask the World modal"
            className="p-2 border border-transparent hover:border-[#E05A2B] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 border ${
                msg.role === 'user'
                  ? 'ml-8 border-[#E05A2B]/60 bg-[#E05A2B]/10'
                  : isDark
                  ? 'mr-4 border-[#222631] bg-[#090A0D]'
                  : 'mr-4 border-[#DCD5C7] bg-[#EFEAE0]/50'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono-tabular uppercase tracking-wider text-[#8C93A1] mb-1.5">
                <span>{msg.role === 'user' ? 'Your Query' : 'WorldPulse Grounded Analyst'}</span>
                {msg.notEnoughData && (
                  <span className="text-amber-500 font-semibold">NOT ENOUGH DATA</span>
                )}
              </div>
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-[#222631] space-y-1.5">
                  <div className="text-[10px] font-mono-tabular uppercase text-[#E05A2B] font-semibold">
                    Verified Source Citations:
                  </div>
                  {msg.citations.map((cit, idx) => (
                    <div
                      key={`${cit.storyId}-${idx}`}
                      className="flex items-center justify-between gap-2 text-xs font-mono-tabular"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const found = stories.find((s) => s.id === cit.storyId);
                          if (found) {
                            onSelectStory(found);
                            onClose();
                          }
                        }}
                        className="text-left truncate hover:text-[#E05A2B] cursor-pointer"
                      >
                        • [{cit.country}] {cit.headline}
                      </button>
                      <a
                        href={cit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#E05A2B] hover:underline shrink-0"
                      >
                        <span>{cit.sourceName}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {msg.role === 'assistant' && (
                <AiDisclaimerLine
                  settings={settings}
                  contextLabel="Ask the World Answer"
                  contextExcerpt={msg.text}
                />
              )}
            </div>
          ))}

          {/* 6 Example Questions as Clickable Chips */}
          <div className="pt-2 space-y-2">
            <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#A78BFA] font-semibold">
              Example Questions (Tap to Ask):
            </div>
            <div className="flex flex-wrap gap-2">
              {ASK_WORLD_EXAMPLE_QUESTIONS.map((exQ) => (
                <button
                  key={exQ}
                  type="button"
                  disabled={isLoading}
                  onClick={() => runQuestion(exQ)}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-full border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-xs font-mono-tabular text-left transition-colors cursor-pointer disabled:opacity-50"
                >
                  {exQ}
                </button>
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="p-4 border border-[#222631] flex items-center gap-2 text-xs font-mono-tabular text-[#E05A2B]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking monitored stories &amp; verifying source links...</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleAsk}
          className={`p-4 border-t flex items-center gap-2 ${
            isDark ? 'border-[#222631] bg-[#090A0D]' : 'border-[#DCD5C7] bg-[#EFEAE0]/50'
          }`}
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about active earthquakes, conflicts, economy, India/Punjab, cyber..."
            className={`flex-1 min-h-[44px] px-3.5 py-2 border text-xs sm:text-sm font-mono-tabular focus:outline-none focus:border-[#E05A2B] ${
              isDark
                ? 'bg-[#101217] border-[#222631] text-[#F3F2EE]'
                : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615]'
            }`}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="min-h-[44px] px-4 py-2 bg-[#E05A2B] hover:bg-[#c94b20] text-white text-xs font-mono-tabular uppercase tracking-wider font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 5. PUBLIC READ-ONLY DEVELOPER API & EMBEDDABLE TOP 5 WIDGET MODAL
// ============================================================================
interface DeveloperApiEmbedModalProps {
  isOpen: boolean;
  stories: Story[];
  settings: AppSettings;
  onClose: () => void;
}

export const DeveloperApiEmbedModal: React.FC<DeveloperApiEmbedModalProps> = ({
  isOpen,
  stories,
  settings,
  onClose,
}) => {
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [copiedFeedUrl, setCopiedFeedUrl] = useState(false);
  const [feedCountry, setFeedCountry] = useState<string>('ALL');
  const [feedTopic, setFeedTopic] = useState<string>('ALL');
  const [liveApiPreview, setLiveApiPreview] = useState<string>('');
  const [testingEndpoint, setTestingEndpoint] = useState(false);

  if (!isOpen) return null;
  const isDark = settings.theme === 'dark';
  const origin = window.location.origin;

  const iframeSnippet = `<iframe
  src="${origin}/?embed=1&theme=${settings.theme}"
  width="100%"
  height="420"
  style="border: 1px solid #222631; border-radius: 12px;"
  title="WorldPulse Live Top 5 Dispatches"
  loading="lazy"
></iframe>`;

  const feedQueryParams = new URLSearchParams();
  if (feedCountry !== 'ALL') feedQueryParams.set('country', feedCountry);
  if (feedTopic !== 'ALL') feedQueryParams.set('topic', feedTopic);
  const querySuffix = feedQueryParams.toString() ? `?${feedQueryParams.toString()}` : '';
  const customJsonFeedUrl = `${origin}/api/feed.json${querySuffix}`;
  const customRssFeedUrl = `${origin}/api/feed.xml${querySuffix}`;

  const handleCopyFeedUrl = (urlToCopy: string) => {
    navigator.clipboard?.writeText(urlToCopy);
    setCopiedFeedUrl(true);
    setTimeout(() => setCopiedFeedUrl(false), 2000);
  };

  const handleDownloadCustomJsonFeed = () => {
    const filtered = stories.filter((s) => {
      if (feedCountry !== 'ALL' && s.country !== feedCountry) return false;
      if (feedTopic !== 'ALL' && s.topic !== feedTopic) return false;
      return true;
    });
    const payload = {
      version: 'https://jsonfeed.org/version/1.1',
      title: `WorldPulse Feed (${feedCountry === 'ALL' ? 'Global' : feedCountry} · ${
        feedTopic === 'ALL' ? 'All Topics' : feedTopic
      })`,
      home_page_url: origin,
      feed_url: customJsonFeedUrl,
      items: filtered.map((s) => ({
        id: s.id,
        title: s.headline,
        content_text: s.summary,
        url: s.sources[0]?.url || origin,
        date_published: new Date(s.time || Date.now()).toISOString(),
        tags: [s.country, s.countryName, s.topic],
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worldpulse-feed-${feedCountry.toLowerCase()}-${feedTopic.toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyIframe = () => {
    navigator.clipboard?.writeText(iframeSnippet);
    setCopiedIframe(true);
    setTimeout(() => setCopiedIframe(false), 2000);
  };

  const handleTestEndpoint = async (path: string) => {
    setTestingEndpoint(true);
    try {
      const res = await fetch(path);
      const data = await res.json();
      setLiveApiPreview(JSON.stringify(data, null, 2));
    } catch (err) {
      setLiveApiPreview(
        JSON.stringify({ error: err instanceof Error ? err.message : 'Request failed' }, null, 2)
      );
    } finally {
      setTestingEndpoint(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-api-title"
    >
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col border border-t-2 ${
          isDark
            ? 'bg-[#101217] border-[#222631] border-t-[#E05A2B] text-[#F3F2EE]'
            : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#E05A2B] text-[#181615]'
        }`}
      >
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
              <Code2 className="w-3.5 h-3.5" />
              <span>Section 06 · Open Telemetry &amp; Syndication</span>
            </div>
            <h2 id="dev-api-title" className="font-editorial text-xl font-semibold mt-0.5">
              Public Read-Only Developer API &amp; Embeddable Top 5 Widget
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Developer API modal"
            className="p-2 border border-transparent hover:border-[#E05A2B] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {/* Part 1: Public Read-Only REST API */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono-tabular uppercase tracking-wider font-semibold text-[#E05A2B]">
              1. Public Read-Only JSON Endpoints (CORS Enabled)
            </h3>
            <p className="text-xs sm:text-sm opacity-85">
              Query live stories directly from our read-only Supabase proxy or embed Top 5 dispatches in external dashboards.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono-tabular text-xs">
              <div
                className={`p-3.5 border space-y-2 ${
                  isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-emerald-500 font-bold">GET /api/v1/stories</span>
                  <button
                    type="button"
                    onClick={() => handleTestEndpoint('/api/v1/stories?limit=5')}
                    className="px-2 py-1 bg-[#E05A2B] text-white text-[11px] cursor-pointer"
                  >
                    {testingEndpoint ? 'Testing...' : 'Test Live'}
                  </button>
                </div>
                <p className="text-[11px] text-[#8C93A1]">
                  Query params: <code>?country=IN&amp;topic=Cyber&amp;min_importance=7&amp;limit=25</code>
                </p>
                <pre className="text-[11px] overflow-x-auto p-2 bg-black/40 text-[#F3F2EE]">
                  curl &quot;{origin}/api/v1/stories?country=IN&amp;min_importance=7&quot;
                </pre>
              </div>

              <div
                className={`p-3.5 border space-y-2 ${
                  isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-emerald-500 font-bold">GET /api/v1/top5</span>
                  <button
                    type="button"
                    onClick={() => handleTestEndpoint('/api/v1/top5')}
                    className="px-2 py-1 bg-[#E05A2B] text-white text-[11px] cursor-pointer"
                  >
                    {testingEndpoint ? 'Testing...' : 'Test Live'}
                  </button>
                </div>
                <p className="text-[11px] text-[#8C93A1]">
                  Returns the top 5 highest-severity stories with source links.
                </p>
                <pre className="text-[11px] overflow-x-auto p-2 bg-black/40 text-[#F3F2EE]">
                  curl &quot;{origin}/api/v1/top5&quot;
                </pre>
              </div>
            </div>

            {liveApiPreview && (
              <div className="space-y-1">
                <span className="text-[11px] font-mono-tabular uppercase text-[#8C93A1]">
                  Live Endpoint Response:
                </span>
                <pre className="p-3 bg-[#090A0D] border border-[#222631] text-[#10B981] font-mono-tabular text-xs max-h-44 overflow-auto">
                  {liveApiPreview}
                </pre>
              </div>
            )}
          </div>

          {/* Part 2: Embeddable Top 5 Widget (iframe snippet) */}
          <div className="space-y-3 pt-4 border-t border-[#222631]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono-tabular uppercase tracking-wider font-semibold text-[#E05A2B]">
                2. Embeddable Top 5 Widget (iframe Snippet)
              </h3>
              <button
                type="button"
                onClick={handleCopyIframe}
                className="px-3 py-1.5 bg-[#E05A2B] text-white text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedIframe ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIframe ? 'Copied Snippet!' : 'Copy iframe Code'}</span>
              </button>
            </div>

            <pre className="p-3.5 bg-[#090A0D] border border-[#222631] text-xs font-mono-tabular text-[#F3F2EE] overflow-x-auto">
              {iframeSnippet}
            </pre>

            {/* Live Widget Preview */}
            <div className="p-4 border border-[#222631] bg-[#090A0D] space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#222631] pb-2">
                <span className="text-xs font-mono-tabular font-bold text-[#E05A2B]">
                  WORLDPULSE · LIVE TOP 5 WIDGET PREVIEW
                </span>
                  <span className="text-[11px] font-mono-tabular text-[#8C93A1]">
                  ?embed=1
                </span>
              </div>
              {stories.slice(0, 5).map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 text-xs py-1 border-b border-[#222631]/50 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono-tabular text-[#E05A2B] font-bold">0{i + 1}</span>
                    <span>{getCountryFlag(s.country)}</span>
                    <span className="truncate font-medium text-[#F3F2EE]">{s.headline}</span>
                  </div>
                  {s.sources[0] && (
                    <a
                      href={s.sources[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono-tabular text-[#E05A2B] hover:underline shrink-0"
                    >
                      {s.sources[0].name} ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Part 3: Custom RSS / JSON Feed Generator by Country or Topic */}
          <div className="space-y-3 pt-4 border-t border-[#222631]">
            <h3 className="text-xs font-mono-tabular uppercase tracking-wider font-semibold text-[#E05A2B]">
              3. Custom RSS 2.0 &amp; JSON Feed Builder (By Country or Topic)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-tabular">
              <div>
                <label className="block text-[10px] uppercase text-[#8C93A1] mb-1">
                  Filter Country
                </label>
                <select
                  value={feedCountry}
                  onChange={(e) => setFeedCountry(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 border border-[#222631] bg-[#090A0D] text-[#F3F2EE]"
                >
                  <option value="ALL">All Countries (Global)</option>
                  {Object.values(COUNTRY_GAZETTEER)
                    .filter((c) => c.code !== 'GL')
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {getCountryFlag(c.code)} {c.name} ({c.code})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-[#8C93A1] mb-1">
                  Filter Topic
                </label>
                <select
                  value={feedTopic}
                  onChange={(e) => setFeedTopic(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 border border-[#222631] bg-[#090A0D] text-[#F3F2EE]"
                >
                  <option value="ALL">All Topics</option>
                  {Object.keys(TOPIC_COLORS).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3.5 border border-[#222631] bg-[#090A0D] space-y-2 text-xs font-mono-tabular">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="truncate text-[#10B981]">JSON Feed: {customJsonFeedUrl}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyFeedUrl(customJsonFeedUrl)}
                    className="min-h-[44px] px-3 py-1.5 bg-[#E05A2B] text-white text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedFeedUrl ? 'Copied!' : 'Copy JSON URL'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyFeedUrl(customRssFeedUrl)}
                    className="min-h-[44px] px-3 py-1.5 border border-[#E05A2B] text-[#E05A2B] text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy RSS XML URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCustomJsonFeed}
                    className="min-h-[44px] px-3 py-1.5 border border-[#222631] text-[#F3F2EE] hover:border-[#E05A2B] text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .json</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
