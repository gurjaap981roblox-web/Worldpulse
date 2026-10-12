import React, { useState } from 'react';
import {
  Calendar,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Mic,
  Quote,
  Search,
  User,
} from 'lucide-react';
import { AppSettings, SpeechSummaryResult, Story } from '../types';
import { summarizeSpeechByWhenWhere } from '../services/llm';
import { loadSpeechHistory, saveSpeechToHistory } from '../services/storage';
import { formatTimeInTz } from '../utils/sanitize';
import { AiDisclaimerLine } from './LegalTrustCenter';

interface SpeechArchivePanelProps {
  stories: Story[];
  settings: AppSettings;
}

interface SpeechPreset {
  label: string;
  when: string;
  where: string;
  speaker: string;
}

const SPEECH_PRESETS: SpeechPreset[] = [
  {
    label: 'UN General Assembly · New York',
    when: 'September 2024 UNGA General Debate',
    where: 'United Nations Headquarters, New York',
    speaker: 'António Guterres',
  },
  {
    label: 'Fed Monetary Policy · Jackson Hole',
    when: 'August 2024 Economic Symposium',
    where: 'Jackson Hole, Wyoming',
    speaker: 'Jerome Powell',
  },
  {
    label: 'G20 Leaders Summit · New Delhi',
    when: 'September 2023 G20 Summit',
    where: 'Bharat Mandapam, New Delhi, India',
    speaker: 'Narendra Modi',
  },
  {
    label: 'ECB Policy Press Conference · Frankfurt',
    when: 'Recent ECB Governing Council Meeting',
    where: 'Frankfurt, Germany',
    speaker: 'Christine Lagarde',
  },
  {
    label: 'World Economic Forum · Davos',
    when: 'January 2025 Annual Meeting',
    where: 'Davos, Switzerland',
    speaker: '',
  },
];

export const SpeechArchivePanel: React.FC<SpeechArchivePanelProps> = ({
  stories,
  settings,
}) => {
  const [whenInput, setWhenInput] = useState<string>('');
  const [whereInput, setWhereInput] = useState<string>('');
  const [speakerInput, setSpeakerInput] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [history, setHistory] = useState<SpeechSummaryResult[]>(() => loadSpeechHistory());
  const [activeSpeech, setActiveSpeech] = useState<SpeechSummaryResult | null>(
    () => loadSpeechHistory()[0] || null
  );

  const isDark = settings.theme === 'dark';

  const handleRunLookup = async (
    customWhen?: string,
    customWhere?: string,
    customSpeaker?: string
  ) => {
    const targetWhen = (customWhen !== undefined ? customWhen : whenInput).trim();
    const targetWhere = (customWhere !== undefined ? customWhere : whereInput).trim();
    const targetSpeaker = (customSpeaker !== undefined ? customSpeaker : speakerInput).trim();

    if (!targetWhen && !targetWhere) {
      setErrorMsg('Please enter When (date/timeframe) and Where (city, venue, or summit).');
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);

    try {
      const result = await summarizeSpeechByWhenWhere(
        {
          when: targetWhen,
          where: targetWhere,
          speaker: targetSpeaker,
        },
        stories,
        settings
      );

      setActiveSpeech(result);
      const updatedHistory = saveSpeechToHistory(result);
      setHistory(updatedHistory);
    } catch {
      setErrorMsg('Unable to synthesize speech dossier right now. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRunLookup();
  };

  const handlePresetClick = (preset: SpeechPreset) => {
    setWhenInput(preset.when);
    setWhereInput(preset.where);
    setSpeakerInput(preset.speaker);
    handleRunLookup(preset.when, preset.where, preset.speaker);
  };

  const handleExportSpeech = (speech: SpeechSummaryResult) => {
    const lines = [
      '====================================================================',
      'WORLDPULSE — PUBLIC ADDRESS & SPEECH DOSSIER',
      `Generated: ${new Date(speech.generatedAt).toUTCString()}`,
      '====================================================================',
      '',
      `TITLE: ${speech.speechTitle}`,
      `SPEAKER: ${speech.speaker}`,
      `WHEN: ${speech.when}`,
      `WHERE: ${speech.where}`,
      `CONFIDENCE: ${Math.round(speech.confidence * 100)}%`,
      '',
      'EXECUTIVE SUMMARY:',
      speech.executiveSummary,
      '',
      'KEY TAKEAWAYS:',
      ...(speech.keyTakeaways.length > 0
        ? speech.keyTakeaways.map((k, idx) => `  ${idx + 1}. ${k}`)
        : ['  No data']),
      '',
      'NOTABLE STATEMENTS / QUOTES:',
      ...(speech.notableQuotes.length > 0
        ? speech.notableQuotes.map((q) => `  • "${q}"`)
        : ['  No data']),
      '',
      'POLICY & ECONOMIC IMPACT:',
      speech.policyOrEconomicImpact,
      '',
      'VERIFIED SOURCES:',
      ...(speech.sources.length > 0
        ? speech.sources.map((s) => `  - ${s.title}: ${s.url}`)
        : ['  No external source links returned']),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worldpulse-speech-${speech.id.slice(0, 32)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="speech-dossier"
      aria-labelledby="speech-dossier-heading"
      className={`border border-t-2 transition-colors duration-200 ${
        isDark
          ? 'bg-[#101217] border-[#222631] border-t-[#E05A2B] text-[#F3F2EE]'
          : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#E05A2B] text-[#181615]'
      }`}
    >
      {/* Editorial Section Header */}
      <div
        className={`px-4 sm:px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono-tabular uppercase tracking-widest text-[#E05A2B] font-semibold">
              SECTION 03 · DIPLOMATIC &amp; PUBLIC ADDRESS WIRE
            </span>
            <span
              className={`text-[11px] font-mono-tabular px-1.5 py-0.5 border ${
                isDark
                  ? 'border-[#222631] bg-[#090A0D] text-[#8C93A1]'
                  : 'border-[#DCD5C7] bg-[#EFEAE0] text-[#666159]'
              }`}
            >
              GOOGLE SEARCH GROUNDED
            </span>
          </div>
          <h2
            id="speech-dossier-heading"
            className="font-serif-editorial text-lg sm:text-xl font-semibold tracking-tight mt-0.5"
          >
            Global Speech &amp; Public Address Summarizer
          </h2>
        </div>

        <p
          className={`text-xs font-mono-tabular ${
            isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
          }`}
        >
          Ask <span className="text-[#E05A2B] font-semibold">When</span> &amp;{' '}
          <span className="text-[#E05A2B] font-semibold">Where</span> any speech was delivered to synthesize its verified transcript &amp; impact
        </p>
      </div>

      {/* Query Bar: When + Where + Optional Speaker */}
      <div
        className={`p-4 sm:p-5 border-b ${
          isDark ? 'border-[#222631] bg-[#090A0D]/50' : 'border-[#DCD5C7] bg-[#EFEAE0]/40'
        }`}
      >
        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* WHEN Input */}
          <div className="md:col-span-4">
            <label
              htmlFor="speech-when-input"
              className={`block text-[11px] font-mono-tabular uppercase tracking-wider mb-1 font-semibold ${
                isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
              }`}
            >
              1. When (Date, Month, or Event Timeframe) *
            </label>
            <div className="relative">
              <Calendar
                className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                }`}
              />
              <input
                id="speech-when-input"
                type="text"
                value={whenInput}
                onChange={(e) => setWhenInput(e.target.value)}
                placeholder="e.g. Yesterday, Sept 2024, August 2024..."
                className={`w-full min-h-[44px] pl-9 pr-3 py-2 border text-xs sm:text-sm font-mono-tabular transition-colors focus:outline-none focus:border-[#E05A2B] ${
                  isDark
                    ? 'bg-[#101217] border-[#222631] text-[#F3F2EE] placeholder:text-[#8C93A1]/60'
                    : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615] placeholder:text-[#666159]/60'
                }`}
              />
            </div>
          </div>

          {/* WHERE Input */}
          <div className="md:col-span-4">
            <label
              htmlFor="speech-where-input"
              className={`block text-[11px] font-mono-tabular uppercase tracking-wider mb-1 font-semibold ${
                isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
              }`}
            >
              2. Where (City, Venue, Parliament, or Summit) *
            </label>
            <div className="relative">
              <MapPin
                className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                }`}
              />
              <input
                id="speech-where-input"
                type="text"
                value={whereInput}
                onChange={(e) => setWhereInput(e.target.value)}
                placeholder="e.g. UN New York, Davos, New Delhi, Tokyo..."
                className={`w-full min-h-[44px] pl-9 pr-3 py-2 border text-xs sm:text-sm font-mono-tabular transition-colors focus:outline-none focus:border-[#E05A2B] ${
                  isDark
                    ? 'bg-[#101217] border-[#222631] text-[#F3F2EE] placeholder:text-[#8C93A1]/60'
                    : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615] placeholder:text-[#666159]/60'
                }`}
              />
            </div>
          </div>

          {/* WHO / SPEAKER Input (Optional) */}
          <div className="md:col-span-4 flex flex-col justify-end">
            <label
              htmlFor="speech-speaker-input"
              className={`block text-[11px] font-mono-tabular uppercase tracking-wider mb-1 font-semibold ${
                isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
              }`}
            >
              3. Speaker (Optional — Auto-detects if blank)
            </label>
            <div className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <User
                  className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                    isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                  }`}
                />
                <input
                  id="speech-speaker-input"
                  type="text"
                  value={speakerInput}
                  onChange={(e) => setSpeakerInput(e.target.value)}
                  placeholder="Anyone (or name/role)..."
                  className={`w-full min-h-[44px] pl-9 pr-3 py-2 border text-xs sm:text-sm font-mono-tabular transition-colors focus:outline-none focus:border-[#E05A2B] ${
                    isDark
                      ? 'bg-[#101217] border-[#222631] text-[#F3F2EE] placeholder:text-[#8C93A1]/60'
                      : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615] placeholder:text-[#666159]/60'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={isAnalyzing}
                className="min-h-[44px] px-4 py-2 bg-[#E05A2B] hover:bg-[#c94b20] disabled:opacity-60 text-white text-xs font-mono-tabular uppercase tracking-wider font-semibold flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Summarize</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Error Message */}
        {errorMsg && (
          <p
            role="alert"
            className="mt-2.5 text-xs font-mono-tabular text-red-400"
          >
            {errorMsg}
          </p>
        )}

        {/* Quick 1-Tap Diplomatic & Central Bank Speech Presets */}
        <div className="mt-3.5 pt-3 border-t border-dashed border-[#222631]/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span
            className={`text-[11px] font-mono-tabular uppercase tracking-wider shrink-0 ${
              isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
            }`}
          >
            Quick Lookup:
          </span>
          {SPEECH_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={isAnalyzing}
              onClick={() => handlePresetClick(preset)}
              className={`min-h-[34px] px-2.5 py-1 border text-xs font-mono-tabular transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-[#101217] border-[#222631] hover:border-[#E05A2B] text-[#F3F2EE]'
                  : 'bg-[#FCFAF5] border-[#DCD5C7] hover:border-[#E05A2B] text-[#181615]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton State */}
      {isAnalyzing && (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#E05A2B]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              Searching verified transcripts &amp; grounding public remarks for &ldquo;{whereInput || 'Global'}&rdquo; ({whenInput || 'Recent'})...
            </span>
          </div>
          <div className="h-6 w-2/3 skeleton-shimmer" />
          <div className="h-20 w-full skeleton-shimmer" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-28 skeleton-shimmer" />
            <div className="h-28 skeleton-shimmer" />
          </div>
        </div>
      )}

      {/* Active Speech Dossier Display */}
      {!isAnalyzing && activeSpeech && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Dossier Top Metadata Bar */}
          <div
            className={`pb-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
              isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular">
                <span className="px-2 py-0.5 bg-[#E05A2B]/15 text-[#E05A2B] border border-[#E05A2B]/40 font-semibold">
                  {activeSpeech.found ? 'VERIFIED ADDRESS DOSSIER' : 'UNVERIFIED / NO RECORD'}
                </span>
                <span
                  className={`px-2 py-0.5 border ${
                    isDark
                      ? 'border-[#222631] bg-[#090A0D] text-[#F3F2EE]'
                      : 'border-[#DCD5C7] bg-[#EFEAE0] text-[#181615]'
                  }`}
                >
                  SPEAKER: {activeSpeech.speaker}
                </span>
                <span
                  className={`px-2 py-0.5 border ${
                    isDark
                      ? 'border-[#222631] bg-[#090A0D] text-[#8C93A1]'
                      : 'border-[#DCD5C7] bg-[#EFEAE0] text-[#666159]'
                  }`}
                >
                  WHEN: {activeSpeech.when}
                </span>
                <span
                  className={`px-2 py-0.5 border ${
                    isDark
                      ? 'border-[#222631] bg-[#090A0D] text-[#8C93A1]'
                      : 'border-[#DCD5C7] bg-[#EFEAE0] text-[#666159]'
                  }`}
                >
                  WHERE: {activeSpeech.where}
                </span>
                <span
                  className={`px-2 py-0.5 border ${
                    isDark
                      ? 'border-[#222631] bg-[#090A0D] text-[#10B981]'
                      : 'border-[#DCD5C7] bg-[#EFEAE0] text-[#059669]'
                  }`}
                >
                  CONFIDENCE: {Math.round(activeSpeech.confidence * 100)}%
                </span>
              </div>

              <h3 className="font-serif-editorial text-xl sm:text-2xl font-semibold leading-snug">
                {activeSpeech.speechTitle}
              </h3>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleExportSpeech(activeSpeech)}
                className={`min-h-[38px] px-3 py-1.5 border text-xs font-mono-tabular flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#222631] bg-[#090A0D] hover:border-[#F3F2EE] text-[#F3F2EE]'
                    : 'border-[#DCD5C7] bg-[#EFEAE0] hover:border-[#181615] text-[#181615]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#E05A2B]" />
                <span>Export Dossier (.txt)</span>
              </button>
            </div>
          </div>

          {/* 12-Column Editorial Dossier Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Columns: Executive Summary & Policy/Market Impact */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <h4
                  className={`text-xs font-mono-tabular uppercase tracking-wider font-semibold mb-2 ${
                    isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                  }`}
                >
                  Executive Synthesis
                </h4>
                <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-line">
                  {activeSpeech.executiveSummary}
                </p>
              </div>

              {/* Policy, Diplomatic or Economic Impact */}
              <div
                className={`p-3.5 border-l-2 border-l-[#E05A2B] border ${
                  isDark
                    ? 'bg-[#090A0D] border-[#222631]'
                    : 'bg-[#EFEAE0]/60 border-[#DCD5C7]'
                }`}
              >
                <p className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold mb-1">
                  Geopolitical, Policy &amp; Market Implications
                </p>
                <p className="text-xs sm:text-sm leading-relaxed">
                  {activeSpeech.policyOrEconomicImpact || 'No data'}
                </p>
              </div>

              {/* Notable Quotes */}
              {activeSpeech.notableQuotes.length > 0 && (
                <div>
                  <h4
                    className={`text-xs font-mono-tabular uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5 ${
                      isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                    }`}
                  >
                    <Quote className="w-3.5 h-3.5 text-[#E05A2B]" />
                    <span>Key Statements &amp; Verbatim Excerpts</span>
                  </h4>
                  <div className="space-y-2">
                    {activeSpeech.notableQuotes.map((quote, idx) => (
                      <blockquote
                        key={idx}
                        className={`p-3 border text-xs sm:text-sm font-serif-editorial italic leading-relaxed ${
                          isDark
                            ? 'bg-[#090A0D]/70 border-[#222631] text-[#F3F2EE]'
                            : 'bg-[#EFEAE0]/40 border-[#DCD5C7] text-[#181615]'
                        }`}
                      >
                        &ldquo;{quote}&rdquo;
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 Columns: Numbered Key Takeaways & Grounded Sources */}
            <div className="lg:col-span-5 space-y-4">
              <div
                className={`p-4 border ${
                  isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/40 border-[#DCD5C7]'
                }`}
              >
                <h4
                  className={`text-xs font-mono-tabular uppercase tracking-wider font-semibold mb-3 ${
                    isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                  }`}
                >
                  Key Takeaways ({activeSpeech.keyTakeaways.length})
                </h4>
                {activeSpeech.keyTakeaways.length > 0 ? (
                  <ol className="space-y-2.5">
                    {activeSpeech.keyTakeaways.map((point, index) => (
                      <li key={index} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed">
                        <span className="font-mono-tabular text-xs font-semibold text-[#E05A2B] shrink-0 mt-0.5">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs font-mono-tabular text-[#8C93A1]">No data</p>
                )}
              </div>

              {/* Verified Source Links */}
              <div
                className={`p-4 border ${
                  isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/40 border-[#DCD5C7]'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <h4
                    className={`text-xs font-mono-tabular uppercase tracking-wider font-semibold ${
                      isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                    }`}
                  >
                    Verified Transcript &amp; Press Sources
                  </h4>
                  <span className="text-[11px] font-mono-tabular text-[#8C93A1]">
                    {formatTimeInTz(activeSpeech.generatedAt, settings.timezone)}
                  </span>
                </div>

                {activeSpeech.sources.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {activeSpeech.sources.map((src, idx) => (
                      <a
                        key={`${src.url}-${idx}`}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`min-h-[38px] px-3 py-2 border text-xs font-mono-tabular flex items-center justify-between gap-2 transition-colors ${
                          isDark
                            ? 'bg-[#101217] border-[#222631] hover:border-[#E05A2B] text-[#F3F2EE]'
                            : 'bg-[#FCFAF5] border-[#DCD5C7] hover:border-[#E05A2B] text-[#181615]'
                        }`}
                      >
                        <span className="truncate">{src.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#E05A2B] shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono-tabular text-[#8C93A1]">
                    No direct web source links returned for this query.
                  </p>
                )}
              </div>
            </div>
          </div>

          <AiDisclaimerLine
            settings={settings}
            contextLabel={`Speech Summary: ${activeSpeech.speaker} (${activeSpeech.where})`}
            contextExcerpt={activeSpeech.executiveSummary}
          />
        </div>
      )}

      {/* Empty State when no speech has been queried yet */}
      {!isAnalyzing && !activeSpeech && (
        <div className="p-6 text-center space-y-2">
          <Mic className="w-6 h-6 text-[#E05A2B] mx-auto" />
          <p className="text-sm font-medium">
            Enter <span className="font-mono-tabular text-[#E05A2B]">When</span> and{' '}
            <span className="font-mono-tabular text-[#E05A2B]">Where</span> above (or tap a Quick Lookup preset) to summarize any public speech, parliamentary address, or diplomatic summit remarks.
          </p>
          <p
            className={`text-xs font-mono-tabular ${
              isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
            }`}
          >
            Powered by Gemini Google Search grounding · Strictly factual synthesis with source links
          </p>
        </div>
      )}

      {/* Recent Speech Lookups History Strip */}
      {history.length > 1 && (
        <div
          className={`px-4 sm:px-5 py-3 border-t flex items-center gap-2 overflow-x-auto no-scrollbar ${
            isDark ? 'border-[#222631] bg-[#090A0D]' : 'border-[#DCD5C7] bg-[#EFEAE0]/50'
          }`}
        >
          <span
            className={`text-[11px] font-mono-tabular uppercase tracking-wider shrink-0 ${
              isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
            }`}
          >
            Recent Dossiers ({history.length}):
          </span>
          {history.map((item) => {
            const isSelected = activeSpeech?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSpeech(item)}
                className={`min-h-[34px] px-2.5 py-1 border text-xs font-mono-tabular transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'border-[#E05A2B] bg-[#E05A2B]/15 text-[#E05A2B] font-semibold'
                    : isDark
                    ? 'border-[#222631] bg-[#101217] text-[#8C93A1] hover:text-[#F3F2EE]'
                    : 'border-[#DCD5C7] bg-[#FCFAF5] text-[#666159] hover:text-[#181615]'
                }`}
              >
                {item.speaker} · {item.where} ({item.when})
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
