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
      className={`rounded-2xl border flex flex-col transition-colors duration-200 ${
        isDark
          ? 'bg-[#0F172A]/85 border-slate-800/80 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}
    >
      {/* Header + Sort Controls */}
      <div
        className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}
      >
        <div>
          <h2 id="disasters-heading" className="text-base font-bold tracking-tight">
            Earthquakes, Natural Events & Severe Weather
          </h2>
          <p className={`text-xs font-mono-tabular ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            USGS M4.5+ · NASA EONET · Open-Meteo · Distance from {settings.referenceCity}
          </p>
        </div>

        {/* Sort segmented buttons */}
        <div
          role="group"
          aria-label="Sort disasters by"
          className={`flex items-center gap-1 p-1 rounded-xl border ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          {(
            [
              { key: 'time', label: 'Latest' },
              { key: 'magnitude', label: 'Magnitude' },
              { key: 'distance', label: 'Distance' },
            ] as Array<{ key: DisasterSortMode; label: string }>
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSortMode(tab.key)}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sortMode === tab.key
                  ? isDark
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'bg-white text-slate-900 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Disasters List */}
      {isLoading && disasterStories.length === 0 ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-14 rounded-xl bg-slate-700/30 animate-pulse" />
          ))}
        </div>
      ) : disasterStories.length === 0 ? (
        <div className="p-6 text-center">
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            No data available from seismic or natural event sensors right now.
          </p>
        </div>
      ) : (
        <ul
          className={`divide-y max-h-[420px] overflow-y-auto ${
            isDark ? 'divide-slate-800/80' : 'divide-slate-100'
          }`}
        >
          {disasterStories.slice(0, 14).map(({ story, distanceKm }) => {
            const hasMag = typeof story.magnitude === 'number';
            const src = story.sources[0];

            return (
              <li
                key={story.id}
                className={`p-4 transition-colors ${
                  isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Numeric Magnitude or Category Indicator */}
                  <div className="w-14 shrink-0 text-right font-mono-tabular">
                    {hasMag ? (
                      <div>
                        <span
                          className={`text-sm font-bold ${
                            (story.magnitude || 0) >= 6.0
                              ? 'text-rose-400'
                              : (story.magnitude || 0) >= 5.2
                              ? 'text-orange-400'
                              : 'text-amber-400'
                          }`}
                        >
                          M{story.magnitude?.toFixed(1)}
                        </span>
                        {typeof story.depthKm === 'number' && (
                          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {story.depthKm}km
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-orange-400">
                        {story.disasterCategory?.split(' ')[0] || 'Event'}
                      </span>
                    )}
                  </div>

                  {/* Event details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div
                      className={`flex flex-wrap items-center gap-2 text-xs font-mono-tabular ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectCountry(story.country)}
                        className="hover:text-teal-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{getCountryFlag(story.country)}</span>
                        <span>{story.countryName}</span>
                      </button>
                      <span aria-hidden="true">·</span>
                      <span>{formatDistance(distanceKm, settings.units)} away</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(story.time)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{Math.round(story.confidence * 100)}% sensor confidence</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectStory(story)}
                      className="text-left w-full cursor-pointer group"
                    >
                      <h3 className="text-sm font-semibold group-hover:text-teal-400 transition-colors">
                        {story.headline}
                      </h3>
                    </button>

                    <div className="flex items-center gap-3 pt-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => onSelectStory(story)}
                        className={`inline-flex items-center gap-1 hover:text-teal-400 cursor-pointer ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>View on map ({story.lat.toFixed(1)}°, {story.lng.toFixed(1)}°)</span>
                      </button>
                      {src && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-teal-400 hover:underline"
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

      {/* Open-Meteo Top 10 Global Cities Weather & Severe Alert Strip */}
      {weather.length > 0 && (
        <div
          className={`p-4 border-t ${
            isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-200 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Open-Meteo Top 10 Global Cities Telemetry
            </span>
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono-tabular text-teal-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Open-Meteo Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {weather.map((w) => (
              <button
                key={w.city}
                type="button"
                onClick={() => onSelectCountry(w.country)}
                className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  w.isSevere
                    ? isDark
                      ? 'bg-rose-950/30 border-rose-500/40'
                      : 'bg-rose-50 border-rose-200'
                    : isDark
                    ? 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-xs font-semibold truncate">
                  <span className="truncate">
                    {getCountryFlag(w.country)} {w.city}
                  </span>
                  <span className="font-mono-tabular text-teal-400">
                    {formatTemperature(w.tempC, settings.units)}
                  </span>
                </div>
                <div
                  className={`mt-1 text-[11px] truncate ${
                    w.isSevere
                      ? 'text-rose-400 font-medium'
                      : isDark
                      ? 'text-slate-400'
                      : 'text-slate-500'
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
