import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Printer } from 'lucide-react';
import { AppSettings, DailyBriefing } from '../types';
import { formatTimeInTz } from '../utils/sanitize';

interface HeroBriefingProps {
  briefing: DailyBriefing | null;
  isLoading: boolean;
  settings: AppSettings;
  totalStories: number;
  countriesCount: number;
  onExportText: () => void;
  onPrintPdf: () => void;
}

export const HeroBriefing: React.FC<HeroBriefingProps> = ({
  briefing,
  isLoading,
  settings,
  totalStories,
  countriesCount,
  onExportText,
  onPrintPdf,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isDark = settings.theme === 'dark';

  if (isLoading && !briefing) {
    return (
      <section
        id="briefing"
        aria-label="Daily Briefing loading"
        className={`border border-t-2 p-5 sm:p-6 ${
          isDark
            ? 'bg-[#101217] border-[#222631] border-t-[#F3F2EE]'
            : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#181615]'
        }`}
      >
        <div className="h-4 w-48 bg-stone-500/15 animate-pulse mb-3" />
        <div className="h-8 w-3/4 bg-stone-500/20 animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-16 bg-stone-500/10 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!briefing) {
    return (
      <section
        id="briefing"
        className={`border border-t-2 p-6 ${
          isDark
            ? 'bg-[#101217] border-[#222631] border-t-[#F3F2EE] text-[#8C93A1]'
            : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#181615] text-[#666159]'
        }`}
      >
        <p className="text-sm font-mono-tabular">
          No data available for Daily Briefing. Trigger Refresh to pull live feeds.
        </p>
      </section>
    );
  }

  return (
    <section
      id="briefing"
      aria-labelledby="briefing-heading"
      className={`border border-t-2 transition-colors duration-200 ${
        isDark
          ? 'bg-[#101217] border-[#222631] border-t-[#F3F2EE] text-[#F3F2EE]'
          : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#181615] text-[#181615]'
      }`}
    >
      {/* Top Institutional Kicker Bar */}
      <div
        className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
        }`}
      >
        <div
          className={`flex flex-wrap items-center gap-2 text-xs font-mono-tabular ${
            isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
          }`}
        >
          <span className="uppercase tracking-wider font-semibold text-[#E05A2B]">
            Section 01 / Executive Daily Briefing
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {formatTimeInTz(briefing.generatedAt, settings.timezone)} ({settings.timezone})
          </span>
          <span aria-hidden="true">·</span>
          <span>{totalStories} active dispatches</span>
          <span aria-hidden="true">·</span>
          <span>{countriesCount} sovereign territories</span>
          <span aria-hidden="true">·</span>
          <span>
            {briefing.isAiGenerated
              ? `Model: ${briefing.modelUsed || 'Gemini'}`
              : settings.pauseAi
              ? 'AI Paused (Deterministic Ledger)'
              : 'Live Telemetry Synthesis'}
          </span>
        </div>

        {/* Export actions */}
        <div className="flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={onExportText}
            className={`min-h-[38px] px-3 py-1.5 border text-xs font-mono-tabular flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isDark
                ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE] hover:border-[#F3F2EE]'
                : 'bg-[#EFEAE0]/60 border-[#DCD5C7] text-[#666159] hover:text-[#181615] hover:border-[#181615]'
            }`}
            title="Download briefing as plain text"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>TXT</span>
          </button>
          <button
            type="button"
            onClick={onPrintPdf}
            className={`min-h-[38px] px-3 py-1.5 border text-xs font-mono-tabular flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isDark
                ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE] hover:border-[#F3F2EE]'
                : 'bg-[#EFEAE0]/60 border-[#DCD5C7] text-[#666159] hover:text-[#181615] hover:border-[#181615]'
            }`}
            title="Print or save briefing as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Lead Editorial Headline */}
      <div className="p-5 sm:p-6">
        <h1
          id="briefing-heading"
          className="font-editorial text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-snug mb-5 text-balance"
        >
          {briefing.headline}
        </h1>

        {/* 5 Architectural Ledger Columns for Highlights */}
        <ol
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 border-t border-b divide-y md:divide-y-0 md:divide-x ${
            isDark
              ? 'border-[#222631] divide-[#222631]'
              : 'border-[#DCD5C7] divide-[#DCD5C7]'
          }`}
        >
          {briefing.highlights.slice(0, 5).map((item, idx) => (
            <li key={idx} className="p-3.5 sm:p-4 flex flex-col justify-between gap-2">
              <span className="font-mono-tabular text-[11px] font-semibold text-[#E05A2B]">
                0{idx + 1} / HIGHLIGHT
              </span>
              <p
                className={`text-xs sm:text-[13px] leading-relaxed ${
                  isDark ? 'text-[#F3F2EE]/90' : 'text-[#181615]/90'
                }`}
              >
                {item}
              </p>
            </li>
          ))}
        </ol>

        {/* Expandable 200-word full editorial briefing */}
        {expanded && (
          <div
            className={`mt-5 pt-5 border-t grid grid-cols-1 md:grid-cols-3 gap-6 text-sm leading-relaxed ${
              isDark ? 'border-[#222631] text-[#F3F2EE]/90' : 'border-[#DCD5C7] text-[#181615]/90'
            }`}
          >
            {briefing.paragraphs.map((p, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? 'first-letter:font-editorial first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-2.5 first-letter:leading-none first-letter:text-[#E05A2B]'
                    : ''
                }
              >
                {p}
              </p>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between no-print">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="min-h-[40px] px-3 -ml-3 text-xs font-mono-tabular uppercase tracking-wider font-semibold text-[#E05A2B] hover:underline flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>
              {expanded ? 'Collapse Full Synthesis' : 'Read Full 200-Word Synthesis'}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </section>
  );
};
