import React, { useState } from 'react';
import {
  Download,
  Moon,
  RefreshCw,
  Settings,
  Sun,
} from 'lucide-react';
import { AppSettings, SourceId, SourceStatus } from '../types';
import { formatTimeInTz } from '../utils/sanitize';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface TopBarProps {
  settings: AppSettings;
  lastUpdated: number | null;
  secondsUntilRefresh: number;
  isRefreshing: boolean;
  aiStatusText: string | null;
  sourceStatuses: Record<SourceId, SourceStatus>;
  onManualRefresh: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  settings,
  lastUpdated,
  secondsUntilRefresh,
  isRefreshing,
  aiStatusText,
  sourceStatuses,
  onManualRefresh,
  onToggleTheme,
  onOpenSettings,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const mins = Math.floor(secondsUntilRefresh / 60);
  const secs = secondsUntilRefresh % 60;
  const countdownFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const statusList = Object.values(sourceStatuses);
  const warningCount = statusList.filter((s) => s.status === 'warning' || s.status === 'error').length;

  const isDark = settings.theme === 'dark';

  return (
    <>
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-200 no-print ${
          isDark
            ? 'bg-[#070B14]/90 border-slate-800/80 text-slate-100'
            : 'bg-white/90 border-slate-200 text-slate-900'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title (Single text element wordmark) */}
          <a
            href="#top"
            className="text-lg sm:text-xl font-bold tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-teal-500 rounded"
          >
            WorldPulse
          </a>

          {/* Zone 2: Concise single-line navigation links */}
          <nav
            aria-label="Primary dashboard sections"
            className="hidden lg:flex items-center gap-6 text-sm font-medium"
          >
            <a
              href="#briefing"
              className={`whitespace-nowrap shrink-0 hover:underline underline-offset-4 transition-colors ${
                isDark ? 'text-slate-300 hover:text-teal-400' : 'text-slate-600 hover:text-teal-700'
              }`}
            >
              Daily Briefing
            </a>
            <a
              href="#map-monitor"
              className={`whitespace-nowrap shrink-0 hover:underline underline-offset-4 transition-colors ${
                isDark ? 'text-slate-300 hover:text-teal-400' : 'text-slate-600 hover:text-teal-700'
              }`}
            >
              World Map
            </a>
            <a
              href="#top-stories"
              className={`whitespace-nowrap shrink-0 hover:underline underline-offset-4 transition-colors ${
                isDark ? 'text-slate-300 hover:text-teal-400' : 'text-slate-600 hover:text-teal-700'
              }`}
            >
              Top 10
            </a>
            <a
              href="#disasters"
              className={`whitespace-nowrap shrink-0 hover:underline underline-offset-4 transition-colors ${
                isDark ? 'text-slate-300 hover:text-teal-400' : 'text-slate-600 hover:text-teal-700'
              }`}
            >
              Disasters
            </a>
            <a
              href="#changes-24h"
              className={`whitespace-nowrap shrink-0 hover:underline underline-offset-4 transition-colors ${
                isDark ? 'text-slate-300 hover:text-teal-400' : 'text-slate-600 hover:text-teal-700'
              }`}
            >
              24h Changes
            </a>
          </nav>

          {/* Zone 3: Live Telemetry & Primary Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live status & countdown */}
            <div
              className={`hidden sm:flex items-center gap-2 text-xs font-mono-tabular whitespace-nowrap shrink-0 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
              aria-live="polite"
            >
              <span className="font-semibold text-teal-400">
                {isRefreshing ? 'SYNCING' : 'LIVE'}
              </span>
              <span aria-hidden="true">·</span>
              <span title={`Timezone: ${settings.timezone}`}>
                Updated {formatTimeInTz(lastUpdated, settings.timezone)}
              </span>
              <span aria-hidden="true">·</span>
              <span title="Auto-refresh countdown">Next {countdownFormatted}</span>
              {warningCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    onClick={onOpenSettings}
                    className="text-amber-400 hover:underline whitespace-nowrap"
                    title={`${warningCount} feed source(s) reported a warning. Click to inspect source health.`}
                  >
                    {warningCount} feed notice
                  </button>
                </>
              )}
            </div>

            {aiStatusText && (
              <span className="hidden xl:inline-block text-xs text-teal-400 font-mono-tabular truncate max-w-[180px]">
                {aiStatusText}
              </span>
            )}

            {/* Manual Refresh Button (min 44x44px touch target) */}
            <button
              type="button"
              onClick={onManualRefresh}
              disabled={isRefreshing}
              aria-label="Refresh world data now"
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              } disabled:opacity-50`}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
            </button>

            {/* PWA Install Button (if installable or iOS) */}
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                aria-label="Install WorldPulse PWA"
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Download className="w-4 h-4 text-teal-400" />
                <span className="hidden md:inline">Install App</span>
              </button>
            )}

            {!isInstalled && !isInstallable && isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSModal(true)}
                aria-label="Install WorldPulse on iOS"
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Download className="w-4 h-4 text-teal-400" />
                <span className="hidden md:inline">Install</span>
              </button>
            )}

            {/* Theme Toggle Button (min 44x44px touch target) */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings Button (min 44x44px touch target) */}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open settings and source status"
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* iOS Safari Guided Install Modal */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
        >
          <div
            className={`w-full max-w-sm rounded-2xl p-6 border ${
              isDark
                ? 'bg-[#0F172A] border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <h3 id="ios-install-title" className="text-base font-semibold">
              Install WorldPulse on iPad / iPhone
            </h3>
            <p className={`mt-2 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              1. Tap the <strong>Share</strong> icon in your Safari toolbar.
              <br />
              2. Scroll down and select <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full min-h-[44px] rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
