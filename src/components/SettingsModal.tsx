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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className={`w-full max-w-3xl rounded-2xl border max-h-[90vh] flex flex-col overflow-hidden shadow-2xl ${
          isDark
            ? 'bg-[#0B1120] border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div>
            <h2 id="settings-modal-title" className="text-lg font-bold tracking-tight">
              WorldPulse Settings & Source Health
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Configure feeds, Gemini AI pipeline budget, regional focus, and units
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className={`min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center cursor-pointer ${
              isDark
                ? 'bg-slate-800 text-slate-300 hover:text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm">
          {/* 1. AI Pipeline Controls: Model Choice, Budget, Pause AI */}
          <section className="space-y-3">
            <h3 className="text-xs font-mono-tabular font-bold text-teal-400">
              01. Gemini AI Pipeline & Daily Budget
            </h3>
            <div
              className={`p-4 rounded-xl border grid grid-cols-1 md:grid-cols-3 gap-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              {/* Model Choice */}
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  AI Tagging Model
                </label>
                <div className="flex gap-2">
                  {(['fast', 'quality'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, modelChoice: m })}
                      className={`min-h-[44px] flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        settings.modelChoice === m
                          ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                          : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-400'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      {m === 'fast' ? 'Fast (Flash Lite)' : 'Quality (3.8 Flash)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily AI Call Budget */}
              <div>
                <label
                  htmlFor="ai-budget-input"
                  className="block text-xs font-semibold mb-1.5 font-mono-tabular"
                >
                  Daily Budget: {callsUsedToday} / {settings.dailyAiBudget} calls used
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
                  className="w-full accent-teal-500 min-h-[44px]"
                />
              </div>

              {/* Pause AI Switch */}
              <div className="flex flex-col justify-between">
                <span className="block text-xs font-semibold mb-1.5">
                  Pause AI Calls
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.pauseAi}
                  onClick={() =>
                    onUpdateSettings({ ...settings, pauseAi: !settings.pauseAi })
                  }
                  className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    settings.pauseAi
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-300'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  {settings.pauseAi ? 'AI Paused (Click to Resume)' : 'AI Active (Click to Pause)'}
                </button>
              </div>
            </div>
          </section>

          {/* 2. Refresh Interval, Theme, Units & Timezone (defaulting to Asia/Kolkata) */}
          <section className="space-y-3">
            <h3 className="text-xs font-mono-tabular font-bold text-teal-400">
              02. Refresh Cadence, Units, Time Zone & Theme
            </h3>
            <div
              className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              {/* Refresh Interval */}
              <div>
                <label htmlFor="refresh-select" className="block text-xs font-semibold mb-1.5">
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
                  className={`w-full min-h-[44px] px-3 rounded-lg border text-xs font-medium ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-100'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes (Default)</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every 60 minutes</option>
                </select>
              </div>

              {/* Time Zone */}
              <div>
                <label htmlFor="tz-select" className="block text-xs font-semibold mb-1.5">
                  Time Zone
                </label>
                <select
                  id="tz-select"
                  value={settings.timezone}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, timezone: e.target.value })
                  }
                  className={`w-full min-h-[44px] px-3 rounded-lg border text-xs font-medium ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-100'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              {/* Units & Reference City */}
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Units (Distance & Temp)
                </label>
                <div className="flex gap-2">
                  {(['metric', 'imperial'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, units: u })}
                      className={`min-h-[44px] flex-1 px-2.5 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                        settings.units === u
                          ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                          : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-400'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      {u === 'metric' ? 'Metric (km, °C)' : 'Imperial (mi, °F)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference City for Earthquake Distance */}
              <div>
                <label htmlFor="city-select" className="block text-xs font-semibold mb-1.5">
                  Distance Reference City
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
                  className={`w-full min-h-[44px] px-3 rounded-lg border text-xs font-medium ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-100'
                      : 'bg-white border-slate-300 text-slate-900'
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
            <h3 className="text-xs font-mono-tabular font-bold text-teal-400">
              03. Topics & Regions to Follow
            </h3>
            <div
              className={`p-4 rounded-xl border space-y-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <span className="block text-xs font-semibold mb-2">Followed Topics</span>
                <div className="flex flex-wrap gap-2">
                  {ALL_TOPICS.map((topic) => {
                    const active = settings.followedTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-teal-500/20 border-teal-500/60 text-teal-300'
                            : isDark
                            ? 'bg-slate-800/60 border-slate-700 text-slate-400'
                            : 'bg-white border-slate-300 text-slate-500'
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold mb-2">Followed Regions</span>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((region) => {
                    const active = settings.followedRegions.includes(region);
                    return (
                      <button
                        key={region}
                        type="button"
                        onClick={() => toggleRegion(region)}
                        className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-teal-500/20 border-teal-500/60 text-teal-300'
                            : isDark
                            ? 'bg-slate-800/60 border-slate-700 text-slate-400'
                            : 'bg-white border-slate-300 text-slate-500'
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
            <h3 className="text-xs font-mono-tabular font-bold text-teal-400">
              04. Live Data Source Status & Last Success Time
            </h3>
            <div
              className={`rounded-xl border overflow-hidden ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b font-mono-tabular ${
                      isDark
                        ? 'bg-slate-900/90 border-slate-800 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Items</th>
                    <th className="py-2.5 px-3 text-right">Last Success ({settings.timezone})</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-200'}`}>
                  {Object.values(sourceStatuses).map((src) => (
                    <tr key={src.id}>
                      <td className="py-2.5 px-3 font-semibold">{src.name}</td>
                      <td className={`py-2.5 px-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {src.category}
                      </td>
                      <td className="py-2.5 px-3">
                        {src.status === 'ok' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : src.status === 'loading' ? (
                          <span className="text-teal-400">Syncing...</span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-amber-400 font-medium"
                            title={src.errorMessage}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Warning ({src.errorMessage || 'Unavailable'})</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">
                        {src.itemCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">
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
            <h3 className="text-xs font-mono-tabular font-bold text-teal-400">
              05. Export Briefing, Cache Control & Privacy Note
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExportText}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-4 h-4 text-teal-400" />
                <span>Export Briefing (.TXT)</span>
              </button>

              <button
                type="button"
                onClick={onPrintPdf}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
              >
                <Printer className="w-4 h-4 text-teal-400" />
                <span>Export / Print Briefing (PDF)</span>
              </button>

              <button
                type="button"
                onClick={onClearCache}
                className="min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Local Cache & Snapshots</span>
              </button>
            </div>

            {/* Privacy Note & Credits */}
            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 ${
                isDark
                  ? 'bg-slate-900/50 border-slate-800 text-slate-400'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <p>
                <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                  Privacy & Security Note:
                </strong>{' '}
                Only public news headlines, snippets, and sensor telemetry from public feeds are sent to the server-side Gemini AI proxy for summarization and classification. Your Gemini API key remains strictly on the server (<code className="font-mono-tabular">process.env.GEMINI_API_KEY</code>) and is never exposed to the browser. Your preferences, 7-day topic snapshots, and item caches are stored strictly in your browser&apos;s local storage.
              </p>
              <p>
                <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                  About & Data-Source Credits:
                </strong>{' '}
                WorldPulse aggregates live open data from USGS Earthquake Hazards Program, NASA EONET, GDELT Project 2.0, CoinGecko API, Open-Meteo, Wikimedia REST API, Google Search Grounding, and public RSS wires (BBC World, Al Jazeera, Reuters). Map tiles by OpenStreetMap &amp; CARTO.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
