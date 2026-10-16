import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Printer,
  Share2,
  Sparkles,
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
  onOpenGeminiSuite?: () => void;
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
  onOpenGeminiSuite,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
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
        <p className="text-sm font-mono-tabular text-[#8FA5C2]">
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

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.origin + '/app');
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  // Requirement 19: Share button on briefing (Web Share API when available, otherwise copy link)
  const handleShareBriefing = async () => {
    const shareTitle = `WorldPulse Executive Briefing: ${briefing.headline}`;
    const shareText = briefing.headline;
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/app` : 'https://worldpulse.app';

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    handleCopyLink();
  };

  const shareText = `WorldPulse Executive Briefing: ${briefing.headline}`;
  const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/app' : 'https://worldpulse.app';
  // Requirement 19: WhatsApp (wa.me) option
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <section
      id="briefing"
      aria-labelledby="briefing-heading"
      aria-live="polite"
      className="wp-glass-card transition-colors duration-200 overflow-hidden"
    >
      {/* Top Institutional Kicker Bar */}
      <div
        className={`px-5 py-3.5 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-3 ${
          isDark ? 'border-cyan-500/25' : 'border-cyan-700/20'
        }`}
      >
        <div
          className={`flex flex-wrap items-center gap-2 text-xs font-mono-tabular ${
            isDark ? 'text-[#8FA5C2]' : 'text-[#1E3A5F]'
          }`}
        >
          <span className="uppercase tracking-wider font-bold text-[#22D3EE]">
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

        {/* Action Controls: Share (Web Share / Copy, WhatsApp wa.me, X) & Export (.MD, CSV, TXT, PDF) */}
        <div className="flex flex-wrap items-center gap-1.5 no-print">
          {/* Requirement 19: Share button (Web Share API, falls back to copy) */}
          <button
            type="button"
            onClick={handleShareBriefing}
            aria-label="Share briefing"
            title="Share briefing (Web Share API or copy link)"
            className="wp-btn-secondary min-h-[44px] px-3.5 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-[#22D3EE]" />}
            <span>{copiedLink ? 'Copied Link' : 'Share'}</span>
          </button>

          {/* Copy Link Direct */}
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Copy direct briefing link"
            title="Copy link to briefing"
            className="wp-btn-secondary min-h-[44px] min-w-[44px] px-2.5 py-1.5 text-xs font-mono-tabular inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[#8FA5C2]" />
          </button>

          {/* Requirement 19: WhatsApp (wa.me) */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share briefing on WhatsApp"
            title="Share on WhatsApp (wa.me)"
            className="wp-btn-secondary min-h-[44px] min-w-[44px] px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <span className="text-emerald-400 font-bold text-xs">WA</span>
          </a>

          {/* Twitter / X */}
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share briefing on X"
            title="Share on X"
            className="wp-btn-secondary min-h-[44px] min-w-[44px] px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <span className="text-cyan-300 font-bold text-xs">X</span>
          </a>
          {onExportMarkdown && (
            <button
              type="button"
              onClick={onExportMarkdown}
              className="wp-btn-secondary px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
              title="Download briefing and top stories as Markdown (.md)"
            >
              <FileCode className="w-3.5 h-3.5 text-[#22D3EE]" />
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
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>CSV</span>
            </button>
          )}
          <button
            type="button"
            onClick={onExportText}
            className="wp-btn-secondary px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            title="Download briefing as plain text (.txt)"
          >
            <FileText className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>TXT</span>
          </button>
          <button
            type="button"
            onClick={onPrintPdf}
            className="wp-btn-secondary px-3 py-1.5 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            title="Print or save briefing as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#22D3EE]" />
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

          {onOpenGeminiSuite && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onOpenGeminiSuite}
                className="px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/25 hover:border-cyan-300 text-xs font-mono-tabular font-bold flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all"
              >
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Launch Situation Room Gemini AI (Chatbot · Voice · Veo 3 Video · Transcribe)</span>
              </button>
            </div>
          )}
        </div>

        {/* 5 Architectural Ledger Columns for Highlights */}
        <ol
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 rounded-2xl border divide-y md:divide-y-0 md:divide-x overflow-hidden ${
            isDark
              ? 'border-cyan-500/25 divide-cyan-500/20 bg-[#050B16]/50'
              : 'border-cyan-700/20 divide-cyan-700/15 bg-white/70'
          }`}
        >
          {briefing.highlights.slice(0, 5).map((item, idx) => (
            <li key={idx} className="p-3.5 sm:p-4 flex flex-col justify-between gap-2">
              <span className="font-mono-tabular text-[11px] font-bold text-[#22D3EE]">
                0{idx + 1} / HIGHLIGHT
              </span>
              <p
                className={`text-xs sm:text-[13px] leading-relaxed ${
                  isDark ? 'text-[#E6F1FF]/90' : 'text-[#050B16]/90'
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
                ? 'border-cyan-500/25 text-[#E6F1FF]/90'
                : 'border-cyan-700/20 text-[#050B16]/90'
            }`}
          >
            {briefing.paragraphs.map((p, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? 'first-letter:font-editorial first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-2.5 first-letter:leading-none first-letter:text-[#22D3EE]'
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
            className="min-h-[44px] px-3 -ml-3 text-xs font-mono-tabular uppercase tracking-wider font-semibold text-[#22D3EE] hover:underline flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
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
