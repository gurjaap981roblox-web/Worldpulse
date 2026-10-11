import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ExternalLink,
  Globe,
  Maximize2,
  SearchCheck,
  X,
} from 'lucide-react';
import { AppSettings, Story, Topic } from '../types';
import {
  formatRelativeTime,
  formatTimeInTz,
  getCountryFlag,
  MAP_FILTER_TOPICS,
  TOPIC_COLORS,
} from '../utils/sanitize';

interface WorldMapPanelProps {
  stories: Story[];
  selectedTopicFilter: 'All' | Topic;
  onSelectTopicFilter: (topic: 'All' | Topic) => void;
  selectedStory: Story | null;
  onSelectStory: (story: Story | null) => void;
  onSelectCountry: (countryCode: string) => void;
  onVerifyStory: (story: Story) => Promise<void>;
  verifyingStoryId: string | null;
  settings: AppSettings;
}

export const WorldMapPanel: React.FC<WorldMapPanelProps> = ({
  stories,
  selectedTopicFilter,
  onSelectTopicFilter,
  selectedStory,
  onSelectStory,
  onSelectCountry,
  onVerifyStory,
  verifyingStoryId,
  settings,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Touch swipe state for bottom sheet
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [sheetTranslateY, setSheetTranslateY] = useState(0);

  const isDark = settings.theme === 'dark';

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22, 18],
      zoom: 2,
      minZoom: 1.5,
      maxZoom: 10,
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: true,
    });

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;
    markersLayerRef.current = markersGroup;

    // Ensure proper sizing after mount
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map tiles when theme toggles
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    tileLayerRef.current.setUrl(tileUrl);
  }, [isDark]);

  // Render topic-colored, importance-sized markers with <1h pulse animation
  useEffect(() => {
    const group = markersLayerRef.current;
    if (!group) return;

    group.clearLayers();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    stories.forEach((story) => {
      if (typeof story.lat !== 'number' || typeof story.lng !== 'number') return;
      if (Number.isNaN(story.lat) || Number.isNaN(story.lng)) return;

      const colorHex = TOPIC_COLORS[story.topic]?.hex || '#14B8A6';
      const dotDiameter = Math.round(12 + (story.importance / 10) * 16); // 13px to 28px
      const isUnderOneHour = story.time >= oneHourAgo;
      const isSelected = selectedStory?.id === story.id;
      const srLabel = `${story.topic} in ${story.countryName}: ${story.headline} (Importance ${story.importance.toFixed(1)} out of 10)`;

      const html = `
        <button
          type="button"
          class="wp-marker-btn"
          style="width: 44px; height: 44px; position: relative;"
          aria-label="${srLabel.replace(/"/g, '&quot;')}"
          title="${story.headline.replace(/"/g, '&quot;')}"
        >
          ${
            isUnderOneHour
              ? `<span class="wp-pulse-ring" style="position: absolute; width: ${dotDiameter + 10}px; height: ${dotDiameter + 10}px; border-radius: 9999px; background: ${colorHex}; opacity: 0.45;"></span>`
              : ''
          }
          <span
            style="
              width: ${dotDiameter}px;
              height: ${dotDiameter}px;
              border-radius: 9999px;
              background-color: ${colorHex};
              border: ${isSelected ? '3px solid #ffffff' : '2px solid rgba(7, 11, 20, 0.85)'};
              box-shadow: 0 2px 10px ${colorHex}66;
              display: block;
              position: relative;
              z-index: 2;
            "
          ></span>
        </button>
      `;

      const icon = L.divIcon({
        className: 'wp-custom-marker',
        html,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([story.lat, story.lng], {
        icon,
        keyboard: true,
        title: story.headline,
        alt: srLabel,
      });

      marker.on('click', () => {
        onSelectStory(story);
      });

      marker.addTo(group);
    });
  }, [stories, selectedStory, onSelectStory]);

  // Pan smoothly when a story is selected
  useEffect(() => {
    if (selectedStory && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedStory.lat, selectedStory.lng], Math.max(3, mapInstanceRef.current.getZoom()), {
        duration: 0.6,
      });
    }
  }, [selectedStory]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([22, 18], 2, { duration: 0.6 });
    }
  };

  // Touch handlers for swipeable bottom sheet
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (deltaY > 0) {
      setSheetTranslateY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (sheetTranslateY > 75) {
      onSelectStory(null);
    }
    setSheetTranslateY(0);
    setTouchStartY(null);
  };

  return (
    <section
      id="map-monitor"
      aria-labelledby="map-section-heading"
      className={`rounded-2xl border overflow-hidden flex flex-col relative transition-colors duration-200 ${
        isDark
          ? 'bg-[#0F172A]/85 border-slate-800/80 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}
    >
      {/* Top Map Toolbar & Filter Chips */}
      <div
        className={`p-4 border-b flex flex-col gap-3 ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="map-section-heading" className="text-base font-bold tracking-tight">
              Global Live Activity Map
            </h2>
            <p className={`text-xs font-mono-tabular ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {stories.length} plotted events · Size = Importance (1–10) · Pulse = Under 1h old
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetView}
            className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isDark
                ? 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Reset world map zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
        </div>

        {/* Map Filter Chips (All, Conflict, Disaster, Economy, Markets, Tech, Health, Climate) */}
        <div
          role="tablist"
          aria-label="Filter map markers by topic"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        >
          {MAP_FILTER_TOPICS.map((topic) => {
            const isActive = selectedTopicFilter === topic;
            const colorHex = topic !== 'All' ? TOPIC_COLORS[topic]?.hex : '#14B8A6';

            return (
              <button
                key={topic}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectTopicFilter(topic)}
                className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                      : 'bg-slate-900 text-white'
                    : isDark
                    ? 'bg-slate-900/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/60'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {topic !== 'All' && (
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colorHex }}
                  />
                )}
                <span>{topic}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Leaflet Map Canvas */}
      <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[520px]">
        <div
          ref={mapContainerRef}
          className="w-full h-full z-10"
          role="region"
          aria-label="Interactive world map showing live news and disaster markers"
        />

        {/* Screen-reader accessible summary list of plotted map markers */}
        <div className="sr-only" aria-live="polite">
          <h3>Plotted Map Events</h3>
          <ul>
            {stories.slice(0, 15).map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onSelectStory(s)}>
                  {s.topic} in {s.countryName}: {s.headline} (Importance {s.importance}/10)
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Topic Legend Overlay */}
        <div
          className={`absolute bottom-3 left-3 z-20 rounded-xl px-3 py-2 text-[11px] backdrop-blur-md border pointer-events-none hidden sm:flex items-center gap-3 flex-wrap ${
            isDark
              ? 'bg-[#070B14]/85 border-slate-800 text-slate-300'
              : 'bg-white/90 border-slate-200 text-slate-700'
          }`}
        >
          {(['Conflict', 'Disaster', 'Economy', 'Markets', 'Tech', 'Climate', 'Politics'] as Topic[]).map(
            (t) => (
              <span key={t} className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: TOPIC_COLORS[t].hex }}
                />
                <span>{t}</span>
              </span>
            )
          )}
        </div>

        {/* Swipeable Bottom Sheet when a map dot is tapped */}
        {selectedStory && (
          <div
            role="dialog"
            aria-label="Selected event details"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              transform: `translateY(${sheetTranslateY}px)`,
            }}
            className={`absolute bottom-0 left-0 right-0 z-30 rounded-t-3xl border-t p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-transform duration-200 max-h-[82%] overflow-y-auto ${
              isDark
                ? 'bg-[#0B1120]/95 border-slate-700/80 text-slate-100'
                : 'bg-white/95 border-slate-300 text-slate-900'
            }`}
          >
            {/* Drag Handle Affordance */}
            <div
              aria-hidden="true"
              className={`w-10 h-1.5 rounded-full mx-auto mb-3 ${
                isDark ? 'bg-slate-700' : 'bg-slate-300'
              }`}
            />

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                {/* Unboxed metadata line */}
                <div
                  className={`flex flex-wrap items-center gap-2 text-xs font-mono-tabular ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectCountry(selectedStory.country)}
                    className="font-semibold text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{getCountryFlag(selectedStory.country)}</span>
                    <span>{selectedStory.countryName} ({selectedStory.country})</span>
                  </button>
                  <span aria-hidden="true">·</span>
                  <span style={{ color: TOPIC_COLORS[selectedStory.topic]?.hex }}>
                    {selectedStory.topic}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Importance {selectedStory.importance.toFixed(1)}/10</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {selectedStory.isDeveloping
                      ? 'Developing'
                      : `${Math.round(selectedStory.confidence * 100)}% confidence`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {formatRelativeTime(selectedStory.time)} ({formatTimeInTz(selectedStory.time, settings.timezone)})
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold leading-snug">
                  {selectedStory.headline}
                </h3>

                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {selectedStory.summary}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectStory(null)}
                aria-label="Close story details"
                className={`min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Google Search Verification Result (if verified) */}
            {selectedStory.verificationNote && (
              <div
                className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed ${
                  isDark
                    ? 'bg-teal-950/30 border-teal-500/30 text-teal-200'
                    : 'bg-teal-50 border-teal-200 text-teal-900'
                }`}
              >
                <p className="font-semibold mb-1">Google Search Grounding Verification:</p>
                <p>{selectedStory.verificationNote}</p>
                {selectedStory.groundedSources && selectedStory.groundedSources.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {selectedStory.groundedSources.map((gs, i) => (
                      <a
                        key={i}
                        href={gs.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-teal-400 inline-flex items-center gap-1"
                      >
                        <span>{gs.title}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Source Links & Action Bar */}
            <div
              className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-xs font-mono-tabular ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sources ({selectedStory.sources.length}):
                </span>
                {selectedStory.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[36px] inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:underline"
                  >
                    <span>{src.name}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onVerifyStory(selectedStory)}
                  disabled={verifyingStoryId === selectedStory.id}
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isDark
                      ? 'bg-slate-800 text-teal-300 hover:bg-slate-700 border border-slate-700'
                      : 'bg-slate-100 text-teal-800 hover:bg-slate-200 border border-slate-300'
                  } disabled:opacity-50`}
                >
                  <SearchCheck className="w-4 h-4" />
                  <span>
                    {verifyingStoryId === selectedStory.id
                      ? 'Verifying with Google Search...'
                      : 'Verify via Google Search'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectCountry(selectedStory.country)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isDark
                      ? 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>{selectedStory.countryName} Brief</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
