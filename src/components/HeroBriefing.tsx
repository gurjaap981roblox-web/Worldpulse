import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Printer,
} from 'lucide-react';
import { AppSettings, DailyBriefing, LegalPageId } from '../types';
import { formatTimeInTz, UI_TRANSLATIONS } from '../utils/sanitize';
import { AudioSpeechControls } from './AudioSpeechControls';
import { AiDisclaimerLine } from './LegalTrustCenter';

interface HeroBriefingProps {
  briefing: DailyBriefing | null;
  isLoading: boolean;
  settings: AppSettings;
  totalStories: number;
  countriesCount: number;
  onExportText: () => void;
  onExportMarkdown?: () => void;
  onExportCsv?: () => void;
  onPrintPdf: () => void;
  onOpenLegalPage?: (page: LegalPageId) => void;
}

export const HeroBriefing: React.FC<HeroBriefingProps> = ({
  briefing,
  isLoading,
  settings,
  totalStories,
  countriesCount,
  onExportText,
  onExportMarkdown,
  onExportCsv,
  onPrintPdf,
  onOpenLegalPage,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isDark = settings.theme === 'dark';
  const labels = UI_TRANSLATIONS[settings.language] || UI_TRANSLATIONS.en;

  if (isLoading && !briefing) {
    return (
      <section
        id="briefing"
        aria-label="Daily Briefing loading"
        className="wp-glass-card p-5 sm:p-6"
      >
        <div className="h-4 w-48 skeleton-shimmer rounded mb-3" />
        <div className="h-8 w-3/4 skeleton-shimmer rounded mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-16 skeleton-shimmer rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!briefing) {
    return (
      <section id="briefing" className="wp-glass-card p-6">
        <p className="text-sm font-mono-tabular text-[#9389B0]">
          {labels.collectingData}
        </p>
      </section>
    );
  }

  const fullSpokenText = [
    `WorldPulse Daily Briefing. ${briefing.headline}.`,
    'Key Highlights:',
    ...briefing.highlights.map((h, i) => `Highlight ${i + 1}: ${h}.`),
    ...briefing.paragraphs,
  ].join(' ');

  return (
    <section
      id="briefing"
      aria-labelledby="briefing-heading"
      className="wp-glass-card transition-colors duration-200 overflow-hidden"
    >
      {/* Top Institutional Kicker Bar */}
      <div
        className={`px-5 py-3.5 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-3 ${
          isDark ? 'border-[#8B5CF6]/25' : 'border-[#7C3AED]/20'
        }`}
      >
        <div
          className={`flex flex-wrap items-center gap-2 text-xs font-mono-tabular ${
            isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'
          }`}
        >
          <span className="uppercase tracking-wider font-bold text-[#A78BFA]">
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

        {/* Export Actions: Markdown (.md), CSV, TXT, Print / PDF */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          {onExportMarkdown && (
            <button
              type="button"
              onClick={onExportMarkdown}
              className="wp-btn-secondary px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
              title="Download briefing and top stories as Markdown (.md)"
            >
              <FileCode className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span>.MD</span>
            </button>
          )}
          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="wp-btn-secondary px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
              title="Download visible stories as CSV spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span>CSV</span>
            </button>
          )}
          <button
            type="button"
            onClick={onExportText}
            className="wp-btn-secondary px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            title="Download briefing as plain text (.txt)"
          >
            <FileText className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>TXT</span>
          </button>
          <button
            type="button"
            onClick={onPrintPdf}
            className="wp-btn-secondary px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            title="Print or save briefing as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Lead Editorial Headline & Audio Briefing Toolbar */}
      <div className="p-5 sm:p-6 space-y-5">
        <div className="space-y-3">
          <h1
            id="briefing-heading"
            className="font-editorial text-xl sm:text-2xl md:text-3xl font-bold tracking-tight leading-snug text-balance"
          >
            {briefing.headline}
          </h1>

          {/* Full Browser Audio Briefing Player (Play, Pause, Stop, Speed 0.75x-1.5x, Voice Picker) */}
          <AudioSpeechControls
            text={fullSpokenText}
            settings={settings}
            label="Executive Daily Audio Briefing"
          />
        </div>

        {/* 5 Architectural Ledger Columns for Highlights */}
        <ol
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 rounded-2xl border divide-y md:divide-y-0 md:divide-x overflow-hidden ${
            isDark
              ? 'border-[#8B5CF6]/25 divide-[#8B5CF6]/20 bg-[#050309]/50'
              : 'border-[#7C3AED]/20 divide-[#7C3AED]/15 bg-white/70'
          }`}
        >
          {briefing.highlights.slice(0, 5).map((item, idx) => (
            <li key={idx} className="p-3.5 sm:p-4 flex flex-col justify-between gap-2">
              <span className="font-mono-tabular text-[11px] font-bold text-[#A78BFA]">
                0{idx + 1} / HIGHLIGHT
              </span>
              <p
                className={`text-xs sm:text-[13px] leading-relaxed ${
                  isDark ? 'text-[#F6F4FF]/90' : 'text-[#140E24]/90'
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
            className={`pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-6 text-sm leading-relaxed ${
              isDark
                ? 'border-[#8B5CF6]/25 text-[#F6F4FF]/90'
                : 'border-[#7C3AED]/20 text-[#140E24]/90'
            }`}
          >
            {briefing.paragraphs.map((p, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? 'first-letter:font-editorial first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-2.5 first-letter:leading-none first-letter:text-[#A78BFA]'
                    : ''
                }
              >
                {p}
              </p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between no-print">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="min-h-[44px] px-3 -ml-3 text-xs font-mono-tabular uppercase tracking-wider font-semibold text-[#A78BFA] hover:underline flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>
              {expanded ? 'Collapse Full Synthesis' : 'Read Full 200-Word Synthesis'}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Required One-Line AI Disclaimer + Report Wrong Answer Link */}
        <AiDisclaimerLine
          settings={settings}
          contextLabel="Daily Executive Briefing"
          contextExcerpt={briefing.headline}
          onOpenLegalPage={onOpenLegalPage}
        />
      </div>
    </section>
  );
};
