import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ExternalLink,
  Flame,
  Globe,
  Maximize2,
  Satellite,
  SearchCheck,
  X,
} from 'lucide-react';
import { AppSettings, MapFocusTarget, MapStyleMode, Story, Topic } from '../types';
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
  mapStyle?: MapStyleMode;
  onChangeMapStyle?: (style: MapStyleMode) => void;
  mapFocusTarget?: MapFocusTarget | null;
  selectedCountryFilter?: string | null;
  onClearCountryFilter?: () => void;
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
  mapStyle = 'dark',
  onChangeMapStyle,
  mapFocusTarget,
  selectedCountryFilter,
  onClearCountryFilter,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [sheetTranslateY, setSheetTranslateY] = useState(0);

  const isDark = settings.theme === 'dark';

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getTileUrls = (styleMode: MapStyleMode, darkTheme: boolean) => {
    if (styleMode === 'satellite') {
      return {
        base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ref: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      };
    }
    if (styleMode === 'heatmap') {
      return {
        base: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        ref: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      };
    }
    // 'dark' or theme-adaptive default
    const useDarkCanvas = styleMode === 'dark' || darkTheme;
    return {
      base: useDarkCanvas
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ref: useDarkCanvas
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    };
  };

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

    const urls = getTileUrls(mapStyle, isDark);

    const tileLayer = L.tileLayer(urls.base, {
      attribution: 'Tiles &copy; Esri, HERE, Garmin, OpenStreetMap',
      maxZoom: 16,
    }).addTo(map);

    const labelLayer = L.tileLayer(urls.ref, {
      maxZoom: 16,
      opacity: 0.85,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;
    labelLayerRef.current = labelLayer;
    markersLayerRef.current = markersGroup;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!tileLayerRef.current || !labelLayerRef.current) return;
    const urls = getTileUrls(mapStyle, isDark);
    tileLayerRef.current.setUrl(urls.base);
    labelLayerRef.current.setUrl(urls.ref);
  }, [isDark, mapStyle]);

  useEffect(() => {
    const group = markersLayerRef.current;
    if (!group) return;

    group.clearLayers();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const reducedMotion = prefersReducedMotion();

    stories.forEach((story) => {
      if (typeof story.lat !== 'number' || typeof story.lng !== 'number') return;
      if (Number.isNaN(story.lat) || Number.isNaN(story.lng)) return;

      const colorHex = TOPIC_COLORS[story.topic]?.hex || '#E05A2B';
      const dotDiameter = Math.round(11 + (story.importance / 10) * 16);
      const isUnderOneHour = story.time >= oneHourAgo && !reducedMotion;
      const isSelected = selectedStory?.id === story.id;
      const srLabel = `${story.topic} in ${story.countryName}: ${story.headline} (Importance ${story.importance.toFixed(1)} out of 10)`;

      const heatRadius = Math.round(54 + story.importance * 9);
      const html =
        mapStyle === 'heatmap'
          ? `
        <button
          type="button"
          class="wp-marker-btn"
          style="width: 44px; height: 44px; position: relative;"
          aria-label="${srLabel.replace(/"/g, '&quot;')}"
          title="${story.headline.replace(/"/g, '&quot;')}"
        >
          <span
            aria-hidden="true"
            style="
              position: absolute;
              width: ${heatRadius}px;
              height: ${heatRadius}px;
              border-radius: 9999px;
              background: radial-gradient(circle, rgba(239,68,68,0.72) 0%, rgba(249,115,22,0.46) 38%, rgba(234,179,8,0.18) 68%, rgba(234,179,8,0) 100%);
              pointer-events: none;
              z-index: 1;
            "
          ></span>
          <span
            style="
              width: ${Math.max(8, Math.round(dotDiameter * 0.55))}px;
              height: ${Math.max(8, Math.round(dotDiameter * 0.55))}px;
              border-radius: 9999px;
              background-color: #FEF08A;
              border: ${isSelected ? '2.5px solid #ffffff' : '1.5px solid #DC2626'};
              display: block;
              position: relative;
              z-index: 2;
            "
          ></span>
        </button>
      `
          : `
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
              border: ${isSelected ? '3px solid #ffffff' : '1.5px solid rgba(9, 10, 13, 0.9)'};
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
  }, [stories, selectedStory, onSelectStory, mapStyle]);

  useEffect(() => {
    if (selectedStory && mapInstanceRef.current) {
      if (prefersReducedMotion()) {
        mapInstanceRef.current.setView(
          [selectedStory.lat, selectedStory.lng],
          Math.max(3, mapInstanceRef.current.getZoom()),
          { animate: false }
        );
      } else {
        mapInstanceRef.current.flyTo(
          [selectedStory.lat, selectedStory.lng],
          Math.max(3, mapInstanceRef.current.getZoom()),
          { duration: 0.6 }
        );
      }
    }
  }, [selectedStory]);

  useEffect(() => {
    if (mapFocusTarget && mapInstanceRef.current) {
      if (prefersReducedMotion()) {
        mapInstanceRef.current.setView(
          [mapFocusTarget.lat, mapFocusTarget.lng],
          mapFocusTarget.zoom,
          { animate: false }
        );
      } else {
        mapInstanceRef.current.flyTo(
          [mapFocusTarget.lat, mapFocusTarget.lng],
          mapFocusTarget.zoom,
          { duration: 0.65 }
        );
      }
    }
  }, [mapFocusTarget]);

  const handleResetView = () => {
    if (onClearCountryFilter) {
      onClearCountryFilter();
    }
    if (mapInstanceRef.current) {
      if (prefersReducedMotion()) {
        mapInstanceRef.current.setView([22, 18], 2, { animate: false });
      } else {
        mapInstanceRef.current.flyTo([22, 18], 2, { duration: 0.6 });
      }
    }
  };

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
      className={`border border-t-2 overflow-hidden flex flex-col relative transition-colors duration-200 ${
        isDark
          ? 'bg-[#101217] border-[#222631] border-t-[#F3F2EE] text-[#F3F2EE]'
          : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#181615] text-[#181615]'
      }`}
    >
      {/* Top Map Masthead & Filter Bar */}
      <div
        className={`p-4 border-b flex flex-col gap-3 ${
          isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B]">
              <span>Section 02</span>
              <span aria-hidden="true">/</span>
              <span>Geospatial Telemetry</span>
            </div>
            <h2
              id="map-section-heading"
              className="font-editorial text-lg font-semibold tracking-tight mt-0.5"
            >
              Global Activity Map ({stories.length} Plotted Dispatches)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {selectedCountryFilter && onClearCountryFilter && (
              <button
                type="button"
                onClick={onClearCountryFilter}
                className="min-h-[44px] px-3 py-1.5 border border-[#E05A2B] bg-[#E05A2B]/15 text-[#E05A2B] text-xs font-mono-tabular font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Clear country filter"
              >
                <span>{getCountryFlag(selectedCountryFilter)}</span>
                <span>Filter: {selectedCountryFilter}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleResetView}
              className={`min-h-[44px] px-3 py-1.5 border text-xs font-mono-tabular flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isDark
                  ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE] hover:border-[#F3F2EE]'
                  : 'bg-[#EFEAE0]/60 border-[#DCD5C7] text-[#666159] hover:text-[#181615] hover:border-[#181615]'
              }`}
              title="Reset world map zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Reset Frame</span>
            </button>
          </div>
        </div>

        {/* Map Filter Chips */}
        <div
          role="tablist"
          aria-label="Filter map markers by topic"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        >
          {MAP_FILTER_TOPICS.map((topic) => {
            const isActive = selectedTopicFilter === topic;
            const colorHex = topic !== 'All' ? TOPIC_COLORS[topic]?.hex : '#E05A2B';

            return (
              <button
                key={topic}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectTopicFilter(topic)}
                className={`min-h-[40px] px-3 py-1.5 border text-xs font-mono-tabular flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-[#F3F2EE] text-[#090A0D] border-[#F3F2EE] font-semibold'
                      : 'bg-[#181615] text-[#FCFAF5] border-[#181615] font-semibold'
                    : isDark
                    ? 'bg-[#090A0D] text-[#8C93A1] border-[#222631] hover:text-[#F3F2EE]'
                    : 'bg-[#EFEAE0]/50 text-[#666159] border-[#DCD5C7] hover:text-[#181615]'
                }`}
              >
                {topic !== 'All' && (
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full shrink-0"
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
      <div className="relative w-full h-[380px] sm:h-[440px] lg:h-[480px]">
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
          className={`absolute bottom-3 left-3 z-20 px-3 py-1.5 text-[11px] font-mono-tabular border pointer-events-none hidden sm:flex items-center gap-3 flex-wrap ${
            isDark
              ? 'bg-[#090A0D]/90 border-[#222631] text-[#8C93A1]'
              : 'bg-[#FCFAF5]/95 border-[#DCD5C7] text-[#666159]'
          }`}
        >
          {(['Conflict', 'Disaster', 'Economy', 'Markets', 'Tech', 'Climate', 'Politics'] as Topic[]).map(
            (t) => (
              <span key={t} className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className="w-2 h-2 rounded-full inline-block"
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
            className={`absolute bottom-0 left-0 right-0 z-30 border-t-2 p-4 sm:p-5 shadow-2xl transition-transform duration-200 max-h-[82%] overflow-y-auto ${
              isDark
                ? 'bg-[#101217]/98 border-t-[#E05A2B] text-[#F3F2EE]'
                : 'bg-[#FCFAF5]/98 border-t-[#E05A2B] text-[#181615]'
            }`}
          >
            <div
              aria-hidden="true"
              className={`w-10 h-1 mx-auto mb-3 ${
                isDark ? 'bg-[#323846]' : 'bg-[#DCD5C7]'
              }`}
            />

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div
                  className={`flex flex-wrap items-center gap-2 text-xs font-mono-tabular ${
                    isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectCountry(selectedStory.country)}
                    className="font-semibold text-[#E05A2B] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{getCountryFlag(selectedStory.country)}</span>
                    <span>{selectedStory.countryName} ({selectedStory.country})</span>
                  </button>
                  <span aria-hidden="true">·</span>
                  <span
                    className="font-semibold"
                    style={{ color: TOPIC_COLORS[selectedStory.topic]?.hex }}
                  >
                    {selectedStory.topic}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Impact {selectedStory.importance.toFixed(1)}/10</span>
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

                <h3 className="font-editorial text-base sm:text-lg font-semibold leading-snug">
                  {selectedStory.headline}
                </h3>

                <p className={`text-sm leading-relaxed ${isDark ? 'text-[#F3F2EE]/85' : 'text-[#181615]/85'}`}>
                  {selectedStory.summary}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectStory(null)}
                aria-label="Close story details"
                className={`min-h-[44px] min-w-[44px] border flex items-center justify-center shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                    : 'bg-[#EFEAE0] border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedStory.verificationNote && (
              <div
                className={`mt-3 p-3 border text-xs leading-relaxed ${
                  isDark
                    ? 'bg-[#090A0D] border-[#222631] text-[#F3F2EE]'
                    : 'bg-[#EFEAE0]/60 border-[#DCD5C7] text-[#181615]'
                }`}
              >
                <p className="font-mono-tabular font-semibold text-[#E05A2B] mb-1">
                  Google Search Grounding Verification:
                </p>
                <p>{selectedStory.verificationNote}</p>
                {selectedStory.groundedSources && selectedStory.groundedSources.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 font-mono-tabular">
                    {selectedStory.groundedSources.map((gs, i) => (
                      <a
                        key={i}
                        href={gs.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-[#E05A2B] inline-flex items-center gap-1"
                      >
                        <span>{gs.title}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div
              className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${
                isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
              }`}
            >
              <div className="flex flex-wrap items-center gap-3 font-mono-tabular">
                <span className={`text-xs ${isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}`}>
                  Sources ({selectedStory.sources.length}):
                </span>
                {selectedStory.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[36px] inline-flex items-center gap-1.5 text-xs font-semibold text-[#E05A2B] hover:underline"
                  >
                    <span>{src.name}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>

              <div className="flex items-center gap-2 font-mono-tabular">
                <button
                  type="button"
                  onClick={() => onVerifyStory(selectedStory)}
                  disabled={verifyingStoryId === selectedStory.id}
                  className={`min-h-[44px] px-3.5 py-2 border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isDark
                      ? 'bg-[#090A0D] border-[#222631] text-[#F3F2EE] hover:border-[#F3F2EE]'
                      : 'bg-[#EFEAE0] border-[#DCD5C7] text-[#181615] hover:border-[#181615]'
                  } disabled:opacity-50`}
                >
                  <SearchCheck className="w-4 h-4 text-[#E05A2B]" />
                  <span>
                    {verifyingStoryId === selectedStory.id
                      ? 'Verifying...'
                      : 'Verify via Google Search'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectCountry(selectedStory.country)}
                  className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isDark
                      ? 'bg-[#F3F2EE] text-[#090A0D] hover:bg-white'
                      : 'bg-[#181615] text-[#FCFAF5] hover:bg-black'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>{selectedStory.countryName} Dossier</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
