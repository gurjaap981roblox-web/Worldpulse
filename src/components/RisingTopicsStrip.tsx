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
      className={`border transition-colors duration-200 ${
        isDark
          ? 'bg-[#101217] border-[#222631] text-[#F3F2EE]'
          : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615]'
      }`}
    >
      <div className="flex items-stretch overflow-x-auto no-scrollbar divide-x divide-[#222631]">
        <div
          className={`px-4 py-2.5 shrink-0 flex flex-col justify-center ${
            isDark ? 'bg-[#090A0D]' : 'bg-[#EFEAE0]/60'
          }`}
        >
          <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B] font-semibold">
            7-Day Velocity
          </span>
          <span className="text-xs font-semibold whitespace-nowrap">
            Rising Topics
          </span>
          {selectedTopicFilter !== 'All' && (
            <button
              type="button"
              onClick={() => onSelectTopic('All')}
              className="mt-0.5 text-[11px] font-mono-tabular text-[#E05A2B] underline text-left cursor-pointer"
            >
              Reset ({selectedTopicFilter})
            </button>
          )}
        </div>

        {metrics.map((m) => {
          const isSelected = selectedTopicFilter === m.topic;
          const colorHex = TOPIC_COLORS[m.topic]?.hex || '#E05A2B';
          const isPositive = m.spikePct >= 0;

          return (
            <button
              key={m.topic}
              type="button"
              onClick={() =>
                onSelectTopic(selectedTopicFilter === m.topic ? 'All' : m.topic)
              }
              className={`min-h-[52px] px-4 py-2.5 flex items-center gap-3.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSelected
                  ? isDark
                    ? 'bg-[#F3F2EE] text-[#090A0D]'
                    : 'bg-[#181615] text-[#FCFAF5]'
                  : isDark
                  ? 'hover:bg-[#151820]'
                  : 'hover:bg-[#EFEAE0]/50'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colorHex }}
                  />
                  <span>{m.topic}</span>
                  <span className="font-mono-tabular text-[11px] opacity-70">
                    ({m.currentCount})
                  </span>
                </div>
                <div
                  className={`flex items-center gap-0.5 text-[11px] font-mono-tabular font-semibold ${
                    isSelected
                      ? 'opacity-90'
                      : isPositive
                      ? 'text-[#E05A2B]'
                      : 'text-emerald-500'
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

              {renderMiniSparkline(m.sparkline, isSelected ? '#E05A2B' : colorHex)}
            </button>
          );
        })}
      </div>
    </section>
  );
};
