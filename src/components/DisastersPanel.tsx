import React, { useMemo, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { AppSettings, CityWeather, Story } from '../types';
import {
  formatDistance,
  formatRelativeTime,
  formatTemperature,
  getCountryFlag,
  haversineKm,
} from '../utils/sanitize';

interface DisastersPanelProps {
  stories: Story[];
  weather: CityWeather[];
  isLoading: boolean;
  onSelectStory: (story: Story) => void;
  onSelectCountry: (countryCode: string) => void;
  settings: AppSettings;
}

type DisasterSortMode = 'time' | 'distance' | 'magnitude';

export const DisastersPanel: React.FC<DisastersPanelProps> = ({
  stories,
  weather,
  isLoading,
  onSelectStory,
  onSelectCountry,
  settings,
}) => {
  const [sortMode, setSortMode] = useState<DisasterSortMode>('time');
  const isDark = settings.theme === 'dark';

  const disasterStories = useMemo(() => {
    const filtered = stories.filter(
      (s) =>
        s.topic === 'Disaster' ||
        typeof s.magnitude === 'number' ||
        Boolean(s.disasterCategory)
    );

    return filtered
      .map((s) => {
        const distanceKm = haversineKm(
          settings.referenceLat,
          settings.referenceLng,
          s.lat,
          s.lng
        );
        return {
          story: s,
          distanceKm,
        };
      })
      .sort((a, b) => {
        if (sortMode === 'distance') {
          return a.distanceKm - b.distanceKm;
        }
        if (sortMode === 'magnitude') {
          const magA = a.story.magnitude ?? a.story.importance;
          const magB = b.story.magnitude ?? b.story.importance;
          return magB - magA;
        }
        return b.story.time - a.story.time;
      });
  }, [stories, sortMode, settings.referenceLat, settings.referenceLng]);

  return (
    <section
      id="disasters"
      aria-labelledby="disasters-heading"
      className={`border border-t-2 flex flex-col transition-colors duration-200 ${
        isDark
          ? 'bg-[#101217] border-[#222631] border-t-[#F3F2EE] text-[#F3F2EE]'
          : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#181615] text-[#181615]'
      }`}
    >
      {/* Header + Sort Controls */}
      <div
        className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B]">
            <span>Section 05</span>
            <span aria-hidden="true">/</span>
            <span>USGS M4.5+ · NASA EONET · Open-Meteo</span>
          </div>
          <h2
            id="disasters-heading"
            className="font-editorial text-lg font-semibold tracking-tight mt-0.5"
          >
            Seismic, Natural Events &amp; Weather Telemetry
          </h2>
        </div>

        {/* Sort segmented buttons */}
        <div
          role="group"
          aria-label="Sort disasters by"
          className={`flex items-center border ${
            isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0] border-[#DCD5C7]'
          }`}
        >
          {(
            [
              { key: 'time', label: 'Latest' },
              { key: 'magnitude', label: 'Magnitude' },
              { key: 'distance', label: `Near ${settings.referenceCity}` },
            ] as Array<{ key: DisasterSortMode; label: string }>
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSortMode(tab.key)}
              className={`min-h-[38px] px-3 py-1 text-xs font-mono-tabular transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sortMode === tab.key
                  ? isDark
                    ? 'bg-[#F3F2EE] text-[#090A0D] font-semibold'
                    : 'bg-[#181615] text-[#FCFAF5] font-semibold'
                  : isDark
                  ? 'text-[#8C93A1] hover:text-[#F3F2EE]'
                  : 'text-[#666159] hover:text-[#181615]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Disasters Ledger */}
      {isLoading && disasterStories.length === 0 ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-14 bg-stone-500/10 animate-pulse" />
          ))}
        </div>
      ) : disasterStories.length === 0 ? (
        <div className="p-6 text-center">
          <p className={`text-sm font-mono-tabular ${isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}`}>
            No data available from seismic or natural event sensors right now.
          </p>
        </div>
      ) : (
        <ul
          className={`divide-y max-h-[420px] overflow-y-auto ${
            isDark ? 'divide-[#222631]' : 'divide-[#DCD5C7]'
          }`}
        >
          {disasterStories.slice(0, 14).map(({ story, distanceKm }) => {
            const hasMag = typeof story.magnitude === 'number';
            const src = story.sources[0];

            return (
              <li
                key={story.id}
                className={`p-4 transition-colors ${
                  isDark ? 'hover:bg-[#151820]' : 'hover:bg-[#EFEAE0]/50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-16 shrink-0 text-right font-mono-tabular">
                    {hasMag ? (
                      <div>
                        <span
                          className={`text-sm font-bold ${
                            (story.magnitude || 0) >= 6.0
                              ? 'text-rose-500'
                              : (story.magnitude || 0) >= 5.2
                              ? 'text-[#E05A2B]'
                              : 'text-amber-500'
                          }`}
                        >
                          M{story.magnitude?.toFixed(1)}
                        </span>
                        {typeof story.depthKm === 'number' && (
                          <div className={`text-[11px] ${isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}`}>
                            {story.depthKm} km
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-[#E05A2B]">
                        {story.disasterCategory?.split(' ')[0] || 'Event'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div
                      className={`flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular ${
                        isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectCountry(story.country)}
                        className="hover:text-[#E05A2B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{getCountryFlag(story.country)}</span>
                        <span>{story.countryName}</span>
                      </button>
                      <span aria-hidden="true">·</span>
                      <span>{formatDistance(distanceKm, settings.units)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(story.time)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{Math.round(story.confidence * 100)}% sensor</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectStory(story)}
                      className="text-left w-full cursor-pointer group"
                    >
                      <h3 className="text-sm font-semibold group-hover:text-[#E05A2B] transition-colors">
                        {story.headline}
                      </h3>
                    </button>

                    <div className="flex items-center gap-3 pt-0.5 text-[11px] font-mono-tabular">
                      <button
                        type="button"
                        onClick={() => onSelectStory(story)}
                        className={`inline-flex items-center gap-1 hover:text-[#E05A2B] cursor-pointer ${
                          isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                        }`}
                      >
                        <MapPin className="w-3 h-3" />
                        <span>
                          {story.lat.toFixed(1)}°, {story.lng.toFixed(1)}°
                        </span>
                      </button>
                      {src && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[#E05A2B] hover:underline"
                        >
                          <span>{src.name}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Open-Meteo Top 10 Global Cities Weather Grid */}
      {weather.length > 0 && (
        <div
          className={`p-4 border-t ${
            isDark ? 'border-[#222631] bg-[#090A0D]/50' : 'border-[#DCD5C7] bg-[#EFEAE0]/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2.5 font-mono-tabular">
            <span className={`text-[11px] uppercase tracking-wider font-semibold ${isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}`}>
              Open-Meteo Top 10 Global Cities Surface Telemetry
            </span>
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#E05A2B] hover:underline inline-flex items-center gap-1"
            >
              <span>Open-Meteo</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div
            className={`grid grid-cols-2 sm:grid-cols-5 border-t border-l ${
              isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
            }`}
          >
            {weather.map((w) => (
              <button
                key={w.city}
                type="button"
                onClick={() => onSelectCountry(w.country)}
                className={`p-2.5 border-r border-b text-left transition-colors cursor-pointer ${
                  w.isSevere
                    ? isDark
                      ? 'bg-rose-950/30 border-[#222631]'
                      : 'bg-rose-50 border-[#DCD5C7]'
                    : isDark
                    ? 'bg-[#101217] border-[#222631] hover:bg-[#151820]'
                    : 'bg-[#FCFAF5] border-[#DCD5C7] hover:bg-[#EFEAE0]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-xs font-semibold truncate">
                  <span className="truncate">
                    {getCountryFlag(w.country)} {w.city}
                  </span>
                  <span className="font-mono-tabular text-[#E05A2B]">
                    {formatTemperature(w.tempC, settings.units)}
                  </span>
                </div>
                <div
                  className={`mt-1 text-[11px] font-mono-tabular truncate ${
                    w.isSevere
                      ? 'text-rose-500 font-semibold'
                      : isDark
                      ? 'text-[#8C93A1]'
                      : 'text-[#666159]'
                  }`}
                >
                  {w.alertText || w.conditionLabel}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
