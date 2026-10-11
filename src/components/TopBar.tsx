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
        className={`sticky top-0 z-30 border-b transition-colors duration-200 no-print ${
          isDark
            ? 'bg-[#090A0D]/95 border-[#222631] text-[#F3F2EE]'
            : 'bg-[#F6F3EC]/95 border-[#DCD5C7] text-[#181615]'
        } backdrop-blur-md`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title (Single text element wordmark in editorial serif) */}
          <a
            href="#top"
            className="font-editorial text-xl sm:text-2xl font-bold tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#E05A2B]"
          >
            WorldPulse
          </a>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Primary dashboard sections"
            className="hidden lg:flex items-center gap-6 text-xs font-mono-tabular uppercase tracking-wider"
          >
            <a
              href="#briefing"
              className={`whitespace-nowrap shrink-0 hover:text-[#E05A2B] transition-colors ${
                isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
              }`}
            >
              01. Briefing
            </a>
            <a
              href="#map-monitor"
              className={`whitespace-nowrap shrink-0 hover:text-[#E05A2B] transition-colors ${
                isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
              }`}
            >
              02. Map
            </a>
            <a
              href="#top-stories"
              className={`whitespace-nowrap shrink-0 hover:text-[#E05A2B] transition-colors ${
                isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
              }`}
            >
              03. Top 10
            </a>
            <a
              href="#economic-change"
              className={`whitespace-nowrap shrink-0 hover:text-[#E05A2B] transition-colors ${
                isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
              }`}
            >
              04. Economy &amp; FX
            </a>
            <a
              href="#speech-dossier"
              className={`whitespace-nowrap shrink-0 hover:text-[#E05A2B] transition-colors ${
                isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
              }`}
            >
              05. Speeches
            </a>
          </nav>

          {/* Zone 3: Telemetry & Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div
              className={`hidden sm:flex items-center gap-2 text-xs font-mono-tabular whitespace-nowrap shrink-0 ${
                isDark ? 'text-[#8C93A1]' : 'text-[#666159]'
              }`}
              aria-live="polite"
            >
              <span className="font-semibold text-[#E05A2B]">
                {isRefreshing ? 'SYNCING' : 'LIVE'}
              </span>
              <span aria-hidden="true">·</span>
              <span title={`Timezone: ${settings.timezone}`}>
                {formatTimeInTz(lastUpdated, settings.timezone)}
              </span>
              <span aria-hidden="true">·</span>
              <span title="Auto-refresh countdown">T-{countdownFormatted}</span>
              {warningCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    onClick={onOpenSettings}
                    className="text-amber-500 hover:underline whitespace-nowrap cursor-pointer"
                    title={`${warningCount} feed source(s) reported a warning`}
                  >
                    {warningCount} notice
                  </button>
                </>
              )}
            </div>

            {aiStatusText && (
              <span className="hidden xl:inline-block text-xs text-[#E05A2B] font-mono-tabular truncate max-w-[170px]">
                {aiStatusText}
              </span>
            )}

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={onManualRefresh}
              disabled={isRefreshing}
              aria-label="Refresh world data now"
              className={`min-h-[44px] px-3.5 py-2 text-xs font-mono-tabular uppercase tracking-wider font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-[#F3F2EE] text-[#090A0D] hover:bg-white'
                  : 'bg-[#181615] text-[#FCFAF5] hover:bg-black'
              } disabled:opacity-50`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing' : 'Refresh'}</span>
            </button>

            {/* PWA Install Button */}
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                aria-label="Install WorldPulse PWA"
                className={`min-h-[44px] px-3 py-2 text-xs font-mono-tabular font-medium border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-[#101217] border-[#222631] text-[#F3F2EE] hover:border-[#F3F2EE]'
                    : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615] hover:border-[#181615]'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-[#E05A2B]" />
                <span className="hidden md:inline">Install</span>
              </button>
            )}

            {!isInstalled && !isInstallable && isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSModal(true)}
                aria-label="Install WorldPulse on iOS"
                className={`min-h-[44px] px-3 py-2 text-xs font-mono-tabular font-medium border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-[#101217] border-[#222631] text-[#F3F2EE] hover:border-[#F3F2EE]'
                    : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#181615] hover:border-[#181615]'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-[#E05A2B]" />
                <span className="hidden md:inline">Install</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to archival paper light theme' : 'Switch to obsidian dark theme'}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#101217] border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE] hover:border-[#F3F2EE]'
                  : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#666159] hover:text-[#181615] hover:border-[#181615]'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open settings and source status"
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#101217] border-[#222631] text-[#8C93A1] hover:text-[#F3F2EE] hover:border-[#F3F2EE]'
                  : 'bg-[#FCFAF5] border-[#DCD5C7] text-[#666159] hover:text-[#181615] hover:border-[#181615]'
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
        >
          <div
            className={`w-full max-w-sm border border-t-2 p-6 ${
              isDark
                ? 'bg-[#101217] border-[#222631] border-t-[#F3F2EE] text-[#F3F2EE]'
                : 'bg-[#FCFAF5] border-[#DCD5C7] border-t-[#181615] text-[#181615]'
            }`}
          >
            <h3 id="ios-install-title" className="font-editorial text-lg font-semibold">
              Install WorldPulse on iPad / iPhone
            </h3>
            <p className={`mt-2 text-sm leading-relaxed ${isDark ? 'text-[#8C93A1]' : 'text-[#666159]'}`}>
              1. Tap the <strong>Share</strong> button in Safari.
              <br />
              2. Select <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className={`mt-4 w-full min-h-[44px] text-xs font-mono-tabular uppercase tracking-wider font-semibold cursor-pointer ${
                isDark ? 'bg-[#F3F2EE] text-[#090A0D]' : 'bg-[#181615] text-[#FCFAF5]'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
