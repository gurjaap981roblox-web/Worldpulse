import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  Trash2,
  X,
} from 'lucide-react';
import {
  AppSettings,
  SourceId,
  SourceStatus,
  Topic,
  WorldRegion,
} from '../types';
import { ALL_TOPICS, formatTimeInTz } from '../utils/sanitize';
import { getAiCallsUsedToday } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updated: AppSettings) => void;
  sourceStatuses: Record<SourceId, SourceStatus>;
  onClearCache: () => void;
  onExportText: () => void;
  onPrintPdf: () => void;
}

const REGIONS: WorldRegion[] = [
  'Asia-Pacific',
  'Europe',
  'Americas',
  'Middle East & Africa',
  'Global',
];

const TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

const REFERENCE_CITIES = [
  { city: 'New Delhi', lat: 28.6139, lng: 77.209 },
  { city: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { city: 'London', lat: 51.5074, lng: -0.1278 },
  { city: 'New York', lat: 40.7128, lng: -74.006 },
  { city: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { city: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { city: 'Sydney', lat: -33.8688, lng: 151.2093 },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  sourceStatuses,
  onClearCache,
  onExportText,
  onPrintPdf,
}) => {
  if (!isOpen) return null;

  const isDark = settings.theme === 'dark';
  const callsUsedToday = getAiCallsUsedToday();

  const toggleTopic = (topic: Topic) => {
    const exists = settings.followedTopics.includes(topic);
    const next = exists
      ? settings.followedTopics.filter((t) => t !== topic)
      : [...settings.followedTopics, topic];
    if (next.length > 0) {
      onUpdateSettings({ ...settings, followedTopics: next });
    }
  };

  const toggleRegion = (region: WorldRegion) => {
    const exists = settings.followedRegions.includes(region);
    const next = exists
      ? settings.followedRegions.filter((r) => r !== region)
      : [...settings.followedRegions, region];
    if (next.length > 0) {
      onUpdateSettings({ ...settings, followedRegions: next });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className={`w-full max-w-3xl border border-t-2 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl ${
          isDark
            ? 'bg-[#101217] border-[#222631] border-t-[#F3F2EE] text-[#F3F2EE]'
            : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#181615] text-[#181615]'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between ${
            isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
          }`}
        >
          <div>
            <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#E05A2B]">
              System Configuration &amp; Telemetry
            </div>
            <h2 id="settings-modal-title" className="font-editorial text-xl font-bold tracking-tight">
              WorldPulse Settings &amp; Source Health
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className={`min-h-[44px] min-w-[44px] border flex items-center justify-center cursor-pointer ${
              isDark
                ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE]'
                : 'bg-[#EFEAE0] border-[#DCD5C7] text-[#666159] hover:text-[#181615]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm">
          {/* 1. AI Pipeline Controls */}
          <section className="space-y-3">
            <h3 className="text-xs font-mono-tabular uppercase tracking-wider font-bold text-[#E05A2B]">
              01. Gemini AI Pipeline &amp; Daily Budget
            </h3>
            <div
              className={`p-4 border grid grid-cols-1 md:grid-cols-3 gap-4 ${
                isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
              }`}
            >
              <div>
                <label className="block text-xs font-mono-tabular font-semibold mb-1.5">
                  AI Tagging Model
                </label>
                <div className="flex gap-1">
                  {(['fast', 'quality'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, modelChoice: m })}
                      className={`min-h-[44px] flex-1 px-3 py-2 text-xs font-mono-tabular font-semibold border transition-colors cursor-pointer ${
                        settings.modelChoice === m
                          ? isDark
                            ? 'bg-[#F3F2EE] border-[#F3F2EE] text-[#090A0D]'
                            : 'bg-[#181615] border-[#181615] text-[#FCFAF5]'
                          : isDark
                          ? 'bg-[#101217] border-[#222631] text-[#8C93A1]'
                          : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#666159]'
                      }`}
                    >
                      {m === 'fast' ? 'Fast (Flash Lite)' : 'Quality (3.8 Flash)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="ai-budget-input"
                  className="block text-xs font-semibold mb-1.5 font-mono-tabular"
                >
                  Daily Budget: {callsUsedToday} / {settings.dailyAiBudget} calls
                </label>
                <input
                  id="ai-budget-input"
                  type="range"
                  min={10}
                  max={250}
                  step={10}
                  value={settings.dailyAiBudget}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      dailyAiBudget: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#E05A2B] min-h-[44px]"
                />
              </div>

              <div className="flex flex-col justify-between">
                <span className="block text-xs font-mono-tabular font-semibold mb-1.5">
                  Pause AI Calls
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.pauseAi}
                  onClick={() =>
                    onUpdateSettings({ ...settings, pauseAi: !settings.pauseAi })
                  }
                  className={`min-h-[44px] px-4 py-2 text-xs font-mono-tabular font-semibold border transition-colors cursor-pointer ${
                    settings.pauseAi
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : isDark
                      ? 'bg-[#101217] border-[#222631] text-[#F3F2EE]'
                      : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615]'
                  }`}
                >
                  {settings.pauseAi ? 'AI Paused (Resume)' : 'AI Active (Pause)'}
                </button>
              </div>
            </div>
          </section>

          {/* 2. Refresh Interval, Theme, Units & Timezone */}
          <section className="space-y-3">
            <h3 className="text-xs font-mono-tabular uppercase tracking-wider font-bold text-[#E05A2B]">
              02. Refresh Cadence, Units, Time Zone &amp; Theme
            </h3>
            <div
              className={`p-4 border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${
                isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
              }`}
            >
              <div>
                <label htmlFor="refresh-select" className="block text-xs font-mono-tabular font-semibold mb-1.5">
                  Auto-Refresh Interval
                </label>
                <select
                  id="refresh-select"
                  value={settings.refreshIntervalMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      refreshIntervalMinutes: Number(e.target.value),
                    })
                  }
                  className={`w-full min-h-[44px] px-3 border text-xs font-mono-tabular ${
                    isDark
                      ? 'bg-[#101217] border-[#222631] text-[#F3F2EE]'
                      : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615]'
                  }`}
                >
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes (Default)</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every 60 minutes</option>
                </select>
              </div>

              <div>
                <label htmlFor="tz-select" className="block text-xs font-mono-tabular font-semibold mb-1.5">
                  Time Zone
                </label>
                <select
                  id="tz-select"
                  value={settings.timezone}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, timezone: e.target.value })
                  }
                  className={`w-full min-h-[44px] px-3 border text-xs font-mono-tabular ${
                    isDark
                      ? 'bg-[#101217] border-[#222631] text-[#F3F2EE]'
                      : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615]'
                  }`}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono-tabular font-semibold mb-1.5">
                  Units (Distance &amp; Temp)
                </label>
                <div className="flex gap-1">
                  {(['metric', 'imperial'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, units: u })}
                      className={`min-h-[44px] flex-1 px-2 py-2 text-xs font-mono-tabular font-semibold border cursor-pointer ${
                        settings.units === u
                          ? isDark
                            ? 'bg-[#F3F2EE] border-[#F3F2EE] text-[#090A0D]'
                            : 'bg-[#181615] border-[#181615] text-[#FCFAF5]'
                          : isDark
                          ? 'bg-[#101217] border-[#222631] text-[#8C93A1]'
                          : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#666159]'
                      }`}
                    >
                      {u === 'metric' ? 'Metric (km/°C)' : 'Imperial (mi/°F)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="city-select" className="block text-xs font-mono-tabular font-semibold mb-1.5">
                  Reference City
                </label>
                <select
                  id="city-select"
                  value={settings.referenceCity}
                  onChange={(e) => {
                    const found = REFERENCE_CITIES.find((c) => c.city === e.target.value);
                    if (found) {
                      onUpdateSettings({
                        ...settings,
                        referenceCity: found.city,
                        referenceLat: found.lat,
                        referenceLng: found.lng,
                      });
                    }
                  }}
                  className={`w-full min-h-[44px] px-3 border text-xs font-mono-tabular ${
                    isDark
                      ? 'bg-[#101217] border-[#222631] text-[#F3F2EE]'
                      : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615]'
                  }`}
                >
                  {REFERENCE_CITIES.map((c) => (
                    <option key={c.city} value={c.city}>
                      {c.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 3. Topics & Regions to Follow */}
          <section className="space-y-3">
            <h3 className="text-xs font-mono-tabular uppercase tracking-wider font-bold text-[#E05A2B]">
              03. Topics &amp; Regions to Follow
            </h3>
            <div
              className={`p-4 border space-y-4 ${
                isDark ? 'bg-[#090A0D] border-[#222631]' : 'bg-[#EFEAE0]/50 border-[#DCD5C7]'
              }`}
            >
              <div>
                <span className="block text-xs font-mono-tabular font-semibold mb-2">
                  Followed Topics
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_TOPICS.map((topic) => {
                    const active = settings.followedTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`min-h-[38px] px-3 py-1.5 text-xs font-mono-tabular font-semibold border transition-colors cursor-pointer ${
                          active
                            ? isDark
                              ? 'bg-[#F3F2EE] border-[#F3F2EE] text-[#090A0D]'
                              : 'bg-[#181615] border-[#181615] text-[#FCFAF5]'
                            : isDark
                            ? 'bg-[#101217] border-[#222631] text-[#8C93A1]'
                            : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#666159]'
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-mono-tabular font-semibold mb-2">
                  Followed Regions
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {REGIONS.map((region) => {
                    const active = settings.followedRegions.includes(region);
                    return (
                      <button
                        key={region}
                        type="button"
                        onClick={() => toggleRegion(region)}
                        className={`min-h-[38px] px-3 py-1.5 text-xs font-mono-tabular font-semibold border transition-colors cursor-pointer ${
                          active
                            ? isDark
                              ? 'bg-[#F3F2EE] border-[#F3F2EE] text-[#090A0D]'
                              : 'bg-[#181615] border-[#181615] text-[#FCFAF5]'
                            : isDark
                            ? 'bg-[#101217] border-[#222631] text-[#8C93A1]'
                            : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#666159]'
                        }`}
                      >
                        {region}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 4. Data Source Status Table */}
          <section className="space-y-3">
            <h3 className="text-xs font-mono-tabular uppercase tracking-wider font-bold text-[#E05A2B]">
              04. Live Data Source Status &amp; Last Success Time
            </h3>
            <div
              className={`border overflow-hidden ${
                isDark ? 'border-[#222631]' : 'border-[#DCD5C7]'
              }`}
            >
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b font-mono-tabular text-[11px] uppercase tracking-wider ${
                      isDark
                        ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1]'
                        : 'bg-[#EFEAE0] border-[#DCD5C7] text-[#666159]'
                    }`}
                  >
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Records</th>
                    <th className="py-2.5 px-3 text-right">Last Sync ({settings.timezone})</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-mono-tabular ${isDark ? 'divide-[#222631]' : 'divide-[#DCD5C7]'}`}>
                  {Object.values(sourceStatuses).map((src) => (
                    <tr key={src.id}>
                      <td className="py-2.5 px-3 font-sans font-semibold">{src.name}</td>
                      <td className={`py-2.5 px-3 ${isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}`}>
                        {src.category}
                      </td>
                      <td className="py-2.5 px-3">
                        {src.status === 'ok' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : src.status === 'loading' ? (
                          <span className="text-[#E05A2B]">Syncing...</span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-amber-500 font-medium"
                            title={src.errorMessage}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Notice ({src.errorMessage || 'Unavailable'})</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">{src.itemCount}</td>
                      <td className="py-2.5 px-3 text-right">
                        {formatTimeInTz(src.lastSuccess, settings.timezone)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. Cache, Export & Privacy Note */}
          <section className="space-y-3">
            <h3 className="text-xs font-mono-tabular uppercase tracking-wider font-bold text-[#E05A2B]">
              05. Export Briefing, Cache Control &amp; Privacy Note
            </h3>
            <div className="flex flex-wrap items-center gap-2.5 font-mono-tabular">
              <button
                type="button"
                onClick={onExportText}
                className={`min-h-[44px] px-4 py-2 text-xs font-semibold border flex items-center gap-2 cursor-pointer ${
                  isDark
                    ? 'bg-[#090A0D] border-[#222631] text-[#F3F2EE] hover:border-[#F3F2EE]'
                    : 'bg-[#EFEAE0] border-[#DCD5C7] text-[#181615] hover:border-[#181615]'
                }`}
              >
                <FileText className="w-4 h-4 text-[#E05A2B]" />
                <span>Export Briefing (.TXT)</span>
              </button>

              <button
                type="button"
                onClick={onPrintPdf}
                className={`min-h-[44px] px-4 py-2 text-xs font-semibold border flex items-center gap-2 cursor-pointer ${
                  isDark
                    ? 'bg-[#090A0D] border-[#222631] text-[#F3F2EE] hover:border-[#F3F2EE]'
                    : 'bg-[#EFEAE0] border-[#DCD5C7] text-[#181615] hover:border-[#181615]'
                }`}
              >
                <Printer className="w-4 h-4 text-[#E05A2B]" />
                <span>Print / Save PDF</span>
              </button>

              <button
                type="button"
                onClick={onClearCache}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold border border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Purge Local Cache &amp; Snapshots</span>
              </button>
            </div>

            <div
              className={`p-4 border text-xs leading-relaxed space-y-2 ${
                isDark
                  ? 'bg-[#090A0D] border-[#222631] text-[#8C93A1]'
                  : 'bg-[#EFEAE0]/50 border-[#DCD5C7] text-[#666159]'
              }`}
            >
              <p>
                <strong className={isDark ? 'text-[#F3F2EE]' : 'text-[#181615]'}>
                  Privacy &amp; Security Note:
                </strong>{' '}
                Only public news headlines, snippets, and sensor telemetry from public feeds are sent to the server-side Gemini AI proxy for summarization and classification. Your Gemini API key remains strictly on the server (<code className="font-mono-tabular">process.env.GEMINI_API_KEY</code>) and is never exposed to the browser. Your preferences, 7-day topic snapshots, and item caches are stored strictly in your browser&apos;s local storage.
              </p>
              <p>
                <strong className={isDark ? 'text-[#F3F2EE]' : 'text-[#181615]'}>
                  About &amp; Data-Source Credits:
                </strong>{' '}
                WorldPulse aggregates live open data from USGS Earthquake Hazards Program, NASA EONET, ECB Foreign Exchange Reference Rates, World Bank Open Data, GDELT Project 2.0, CoinGecko API, Open-Meteo, Wikimedia REST API, Google Search Grounding, and public RSS wires (BBC World, Al Jazeera, Reuters). Map tiles by Esri &amp; OpenStreetMap.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
