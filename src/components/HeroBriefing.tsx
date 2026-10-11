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
        className={`rounded-2xl border p-5 sm:p-6 ${
          isDark ? 'bg-[#0F172A]/85 border-slate-800/80' : 'bg-white border-slate-200'
        }`}
      >
        <div className="h-4 w-48 rounded bg-slate-700/40 animate-pulse mb-3" />
        <div className="h-7 w-3/4 rounded bg-slate-700/40 animate-pulse mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-5 rounded bg-slate-700/30 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!briefing) {
    return (
      <section
        id="briefing"
        className={`rounded-2xl border p-6 ${
          isDark ? 'bg-[#0F172A]/85 border-slate-800/80 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
        }`}
      >
        <p className="text-sm">No data available for Daily Briefing. Tap Refresh to fetch live feeds.</p>
      </section>
    );
  }

  return (
    <section
      id="briefing"
      aria-labelledby="briefing-heading"
      className={`rounded-2xl border p-5 sm:p-6 transition-colors duration-200 ${
        isDark
          ? 'bg-[#0F172A]/85 border-slate-800/80 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}
    >
      {/* Top quiet unboxed metadata line */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div
          className={`flex flex-wrap items-center gap-2 text-xs font-mono-tabular ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span className="font-semibold text-teal-400">AI Daily Briefing</span>
          <span aria-hidden="true">·</span>
          <span>{formatTimeInTz(briefing.generatedAt, settings.timezone)} ({settings.timezone})</span>
          <span aria-hidden="true">·</span>
          <span>{totalStories} active events</span>
          <span aria-hidden="true">·</span>
          <span>{countriesCount} countries</span>
          <span aria-hidden="true">·</span>
          <span>
            {briefing.isAiGenerated
              ? `Synthesized via ${briefing.modelUsed || 'Gemini'}`
              : settings.pauseAi
              ? 'AI Paused (Baseline Synthesis)'
              : 'Live Telemetry Synthesis'}
          </span>
        </div>

        {/* Export actions */}
        <div className="flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={onExportText}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isDark
                ? 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Download briefing as plain text"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Text</span>
          </button>
          <button
            type="button"
            onClick={onPrintPdf}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isDark
                ? 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Print or save briefing as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Save PDF</span>
          </button>
        </div>
      </div>

      {/* 1-Line Headline */}
      <h1
        id="briefing-heading"
        className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight leading-snug mb-4 text-balance"
      >
        {briefing.headline}
      </h1>

      {/* 5 Bullet Highlights */}
      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2.5 mb-4">
        {briefing.highlights.slice(0, 5).map((item, idx) => (
          <li
            key={idx}
            className={`text-sm leading-relaxed flex items-baseline gap-2.5 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            <span className="font-mono-tabular text-xs font-semibold text-teal-400 shrink-0">
              0{idx + 1}.
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* Expandable 200-word full briefing */}
      {expanded && (
        <div
          className={`mt-4 pt-4 border-t space-y-3 text-sm leading-relaxed max-w-[75ch] ${
            isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
          }`}
        >
          {briefing.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between no-print">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="min-h-[44px] px-3 -ml-3 rounded-lg text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>{expanded ? 'Hide full briefing' : 'Read full briefing (~200 words)'}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </section>
  );
};
