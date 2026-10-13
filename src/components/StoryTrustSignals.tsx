import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flag,
  GitCompare,
} from 'lucide-react';
import { AppSettings, Story } from '../types';
import {
  buildReportIssueMailto,
  classifySourceType,
  detectStoryContradiction,
  formatRelativeTime,
  formatTimeInTz,
  UI_TRANSLATIONS,
} from '../utils/sanitize';
import { AudioSpeechControls } from './AudioSpeechControls';

interface StoryTrustSignalsProps {
  story: Story;
  settings: AppSettings;
  showAudio?: boolean;
}

export const StoryTrustSignals: React.FC<StoryTrustSignalsProps> = ({
  story,
  settings,
  showAudio = true,
}) => {
  const [showDiffComparison, setShowDiffComparison] = useState(false);

  const isDark = settings.theme === 'dark';
  const labels = UI_TRANSLATIONS[settings.language] || UI_TRANSLATIONS.en;

  const distinctSourcesCount = Math.min(
    5,
    Math.max(1, new Set(story.sources.map((s) => s.name)).size)
  );
  const contradiction = detectStoryContradiction(story);

  const earliestTime = story.sources.reduce(
    (min, s) => (s.time && s.time < min ? s.time : min),
    story.time
  );
  const latestTime = story.sources.reduce(
    (max, s) => (s.time && s.time > max ? s.time : max),
    story.time
  );

  const reportMailto = buildReportIssueMailto(
    `Story Issue: ${story.headline}`,
    `Story ID: ${story.id}\nHeadline: ${story.headline}\nCountry: ${story.countryName} (${story.country})\nSources: ${story.sources
      .map((s) => `${s.name} (${s.url})`)
      .join(', ')}`
  );

  return (
    <div className="pt-2 space-y-2.5 no-print">
      {/* Row 1: Published & Last-Updated Time, Confirmed/Developing Badge, Source Diversity 5-Dot Meter, Contradiction Tag */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular ${
          isDark ? 'text-[#8FA5C2]' : 'text-[#625680]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              story.isDeveloping
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {story.isDeveloping ? (
              <>
                <Clock className="w-3 h-3" />
                <span>{labels.developing}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>{labels.confirmed}</span>
              </>
            )}
          </span>

          {/* Source diversity meter (e.g. 3/5 dots) */}
          <div
            className="inline-flex items-center gap-1.5"
            title={`Source diversity: ${distinctSourcesCount}/5 distinct outlets corroborate this story`}
          >
            <span>
              {labels.sourceDiversity}: {distinctSourcesCount}/5
            </span>
            <span className="inline-flex items-center gap-1" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((dot) => (
                <span
                  key={dot}
                  className={`w-2 h-2 rounded-full ${
                    dot <= distinctSourcesCount
                      ? 'bg-[#22D3EE] shadow-[0_0_6px_rgba(139,92,246,0.8)]'
                      : isDark
                      ? 'bg-white/15'
                      : 'bg-black/15'
                  }`}
                />
              ))}
            </span>
          </div>

          {/* Published & Updated timestamps + confidence */}
          <span>
            Published: {formatTimeInTz(earliestTime, settings.timezone)} · Updated:{' '}
            {formatRelativeTime(latestTime)} · {Math.round(story.confidence * 100)}% conf
          </span>
        </div>

        {/* Contradiction Tag & Report Issue Button */}
        <div className="flex flex-wrap items-center gap-2">
          {contradiction && (
            <button
              type="button"
              onClick={() => setShowDiffComparison((prev) => !prev)}
              aria-expanded={showDiffComparison}
              className="min-h-[44px] px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/45 text-amber-300 text-[11px] font-mono-tabular font-semibold inline-flex items-center gap-1.5 hover:bg-amber-500/25 cursor-pointer"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{labels.sourcesDiffer}</span>
            </button>
          )}

          {showAudio && (
            <AudioSpeechControls
              text={`${story.countryName}, ${story.topic}. ${story.headline}. ${story.summary}`}
              settings={settings}
              compact
              label={story.headline}
            />
          )}

          <a
            href={reportMailto}
            className={`min-h-[44px] px-3 py-1 rounded-full border text-[11px] font-mono-tabular inline-flex items-center gap-1 transition-colors ${
              isDark
                ? 'border-[#22D3EE]/30 text-[#8FA5C2] hover:text-white hover:border-[#38BDF8]'
                : 'border-[#0284C7]/25 text-[#3F3559] hover:text-black'
            }`}
            title="Report an issue or inaccuracy with this story"
          >
            <Flag className="w-3 h-3 text-[#38BDF8]" />
            <span>Report issue</span>
          </a>
        </div>
      </div>

      {/* Expandable Side-by-Side Contradiction Comparison */}
      {contradiction && showDiffComparison && (
        <div
          className={`p-3.5 rounded-xl border space-y-2 text-xs ${
            isDark
              ? 'bg-[#0A1830] border-amber-500/40 text-[#E6F1FF]'
              : 'bg-amber-50/70 border-amber-500/40 text-[#140E24]'
          }`}
        >
          <div className="flex items-center justify-between font-mono-tabular text-[11px] text-amber-400 font-semibold">
            <span>Side-by-Side Outlet Comparison ({contradiction.reason})</span>
            <button
              type="button"
              onClick={() => setShowDiffComparison(false)}
              className="underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg border border-[#22D3EE]/25 space-y-1">
              <div className="font-mono-tabular font-bold text-[#38BDF8]">
                Outlet A: {contradiction.versionA.source}
              </div>
              <p className="text-xs leading-relaxed">{contradiction.versionA.text}</p>
              <a
                href={contradiction.versionA.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-[#38BDF8] hover:underline"
              >
                <span>Verify Outlet A</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="p-2.5 rounded-lg border border-[#22D3EE]/25 space-y-1">
              <div className="font-mono-tabular font-bold text-[#38BDF8]">
                Outlet B: {contradiction.versionB.source}
              </div>
              <p className="text-xs leading-relaxed">{contradiction.versionB.text}</p>
              <a
                href={contradiction.versionB.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-[#38BDF8] hover:underline"
              >
                <span>Verify Outlet B</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Row 2: Source Links with Source-Type Badges (Wire, Broadcaster, Newspaper, Government/Sensor, Social/Other) */}
      <div className="flex flex-wrap items-center gap-2">
        {story.sources.slice(0, 4).map((src, sIdx) => {
          const sourceType = classifySourceType(src.name);
          return (
            <a
              key={`${src.url}-${sIdx}`}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`min-h-[44px] px-3 py-1.5 rounded-full border text-[11px] font-mono-tabular inline-flex items-center gap-1.5 transition-colors ${
                isDark
                  ? 'bg-[#0A1830]/80 border-[#22D3EE]/30 text-[#E6F1FF] hover:border-[#38BDF8]'
                  : 'bg-white border-[#0284C7]/25 text-[#140E24] hover:border-[#0284C7]'
              }`}
            >
              <span className="font-semibold">{src.name}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-[#22D3EE]/20 text-[#38BDF8] text-[10px]">
                {sourceType}
              </span>
              <ExternalLink className="w-3 h-3 text-[#38BDF8] shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
};
