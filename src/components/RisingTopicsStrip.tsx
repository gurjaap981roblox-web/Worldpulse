import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { AppSettings, RisingTopicMetric, Topic } from '../types';
import { TOPIC_COLORS } from '../utils/sanitize';

interface RisingTopicsStripProps {
  metrics: RisingTopicMetric[];
  selectedTopicFilter: 'All' | Topic;
  onSelectTopic: (topic: 'All' | Topic) => void;
  settings: AppSettings;
}

function renderMiniSparkline(points: number[], strokeColor: string): React.ReactNode {
  if (!points || points.length < 2) return null;
  const width = 52;
  const height = 18;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);

  const coords = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
}

export const RisingTopicsStrip: React.FC<RisingTopicsStripProps> = ({
  metrics,
  selectedTopicFilter,
  onSelectTopic,
  settings,
}) => {
  const isDark = settings.theme === 'dark';

  return (
    <section
      aria-label="Rising topics vs 7-day average"
      className={`rounded-2xl border p-3.5 sm:p-4 transition-colors duration-200 ${
        isDark
          ? 'bg-[#0F172A]/85 border-slate-800/80 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <h2 className="text-xs font-bold tracking-tight">
          Rising Topics vs. 7-Day Snapshot Average
        </h2>
        {selectedTopicFilter !== 'All' && (
          <button
            type="button"
            onClick={() => onSelectTopic('All')}
            className="text-xs font-semibold text-teal-400 hover:underline cursor-pointer"
          >
            Clear topic filter ({selectedTopicFilter})
          </button>
        )}
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {metrics.map((m) => {
          const isSelected = selectedTopicFilter === m.topic;
          const colorHex = TOPIC_COLORS[m.topic]?.hex || '#14B8A6';
          const isPositive = m.spikePct >= 0;

          return (
            <button
              key={m.topic}
              type="button"
              onClick={() =>
                onSelectTopic(selectedTopicFilter === m.topic ? 'All' : m.topic)
              }
              className={`min-h-[48px] px-3.5 py-2 rounded-xl border flex items-center gap-3 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSelected
                  ? isDark
                    ? 'bg-teal-500/20 border-teal-500/60 text-white'
                    : 'bg-slate-900 border-slate-900 text-white'
                  : isDark
                  ? 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 text-slate-200'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colorHex }}
                  />
                  <span>{m.topic}</span>
                  <span
                    className={`font-mono-tabular text-[11px] ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    ({m.currentCount})
                  </span>
                </div>
                <div
                  className={`flex items-center gap-0.5 text-[11px] font-mono-tabular font-semibold ${
                    isPositive ? 'text-amber-400' : 'text-teal-400'
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  <span>
                    {isPositive ? '+' : ''}
                    {m.spikePct}% vs 7d
                  </span>
                </div>
              </div>

              {renderMiniSparkline(m.sparkline, colorHex)}
            </button>
          );
        })}
      </div>
    </section>
  );
};
