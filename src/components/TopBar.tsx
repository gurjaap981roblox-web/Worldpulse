import React, { useState } from 'react';
import {
  Download,
  Home,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { AppLanguage, AppSettings, SourceId, SourceStatus } from '../types';
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
  onChangeLanguage?: (lang: AppLanguage) => void;
  onFocusSearch?: () => void;
  onGoToLanding?: () => void;
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
  onChangeLanguage,
  onFocusSearch,
  onGoToLanding,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mins = Math.floor(secondsUntilRefresh / 60);
  const secs = secondsUntilRefresh % 60;
  const countdownFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const statusList = Object.values(sourceStatuses);
  const warningCount = statusList.filter(
    (s) => s.status === 'warning' || s.status === 'error'
  ).length;

  const isDark = settings.theme === 'dark';

  return (
    <>
      <header
        className={`sticky top-0 z-30 border-b transition-colors duration-200 no-print ${
          isDark
            ? 'bg-[#050309]/85 border-[#8B5CF6]/25 text-[#F6F4FF]'
            : 'bg-[#F8F6FF]/90 border-[#7C3AED]/20 text-[#140E24]'
        } backdrop-blur-xl`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Title + Landing Link */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#top"
              className="flex items-center gap-2 font-editorial text-xl sm:text-2xl font-extrabold tracking-tight whitespace-nowrap"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shadow-[0_0_12px_#8B5CF6]" />
              <span>WorldPulse</span>
            </a>

            {onGoToLanding && (
              <button
                type="button"
                onClick={onGoToLanding}
                title="View WorldPulse Landing Page (/)"
                className={`hidden sm:inline-flex min-h-[38px] px-2.5 py-1 rounded-full border text-[11px] font-mono-tabular items-center gap-1 transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#8B5CF6]/30 bg-[#0B0713] text-[#C4BDD9] hover:text-white hover:border-[#A78BFA]'
                    : 'border-[#7C3AED]/25 bg-white text-[#3F3559] hover:text-black'
                }`}
              >
                <Home className="w-3 h-3 text-[#A78BFA]" />
                <span>Landing</span>
              </button>
            )}
          </div>

          {/* Zone 2: Section Navigation Links */}
          <nav
            aria-label="Primary dashboard sections"
            className="hidden xl:flex items-center gap-5 text-xs font-mono-tabular"
          >
            <a href="#briefing" className="hover:text-[#A78BFA] transition-colors">
              01. Briefing
            </a>
            <a href="#map-monitor" className="hover:text-[#A78BFA] transition-colors">
              02. Map
            </a>
            <a href="#top-stories" className="hover:text-[#A78BFA] transition-colors">
              03. Top 10
            </a>
            <a href="#economic-change" className="hover:text-[#A78BFA] transition-colors">
              04. Economy &amp; FX
            </a>
            <a href="#speech-dossier" className="hover:text-[#A78BFA] transition-colors">
              05. Speeches
            </a>
          </nav>

          {/* Zone 3: Compact Glass Controls (Search, Language, Telemetry, Refresh, Theme, Settings) */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`hidden lg:flex items-center gap-2 text-xs font-mono-tabular whitespace-nowrap ${
                isDark ? 'text-[#9389B0]' : 'text-[#625680]'
              }`}
              aria-live="polite"
            >
              <span className="font-semibold text-[#A78BFA]">
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
                    type="button"
                    onClick={onOpenSettings}
                    className="text-amber-400 hover:underline cursor-pointer"
                  >
                    {warningCount} notice
                  </button>
                </>
              )}
            </div>

            {aiStatusText && (
              <span className="hidden 2xl:inline-block text-xs text-[#A78BFA] font-mono-tabular truncate max-w-[160px]">
                {aiStatusText}
              </span>
            )}

            {/* Quick Search Focus Button */}
            {onFocusSearch && (
              <button
                type="button"
                onClick={onFocusSearch}
                aria-label="Jump to story search input"
                title="Search stories (/)"
                className={`min-h-[44px] min-w-[44px] rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[#0B0713] border-[#8B5CF6]/30 text-[#C4BDD9] hover:text-white hover:border-[#A78BFA]'
                    : 'bg-white border-[#7C3AED]/25 text-[#3F3559] hover:text-black'
                }`}
              >
                <Search className="w-4 h-4 text-[#A78BFA]" />
              </button>
            )}

            {/* Language Switcher Pill */}
            {onChangeLanguage && (
              <div
                role="group"
                aria-label="Language switch"
                className={`hidden sm:flex items-center rounded-full border p-0.5 text-xs font-mono-tabular ${
                  isDark ? 'bg-[#0B0713] border-[#8B5CF6]/30' : 'bg-white border-[#7C3AED]/25'
                }`}
              >
                {(['en', 'hi', 'pa'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onChangeLanguage(code)}
                    className={`min-h-[36px] px-2.5 rounded-full font-semibold transition-colors cursor-pointer ${
                      settings.language === code
                        ? 'bg-[#8B5CF6] text-white'
                        : isDark
                        ? 'text-[#C4BDD9] hover:text-white'
                        : 'text-[#3F3559] hover:text-black'
                    }`}
                  >
                    {code === 'en' ? 'EN' : code === 'hi' ? 'हि' : 'ਪੰ'}
                  </button>
                ))}
              </div>
            )}

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={onManualRefresh}
              disabled={isRefreshing}
              aria-label="Refresh world data now"
              className="wp-btn-primary px-3.5 py-2 text-xs font-mono-tabular uppercase tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Syncing' : 'Refresh'}</span>
            </button>

            {/* PWA Install Button */}
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                aria-label="Install WorldPulse PWA"
                className="wp-btn-secondary px-3 py-2 text-xs font-mono-tabular hidden md:flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#A78BFA]" />
                <span>Install</span>
              </button>
            )}

            {!isInstalled && !isInstallable && isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSModal(true)}
                aria-label="Install WorldPulse on iOS"
                className="wp-btn-secondary px-3 py-2 text-xs font-mono-tabular hidden md:flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#A78BFA]" />
                <span>Install</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className={`min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#0B0713] border-[#8B5CF6]/30 text-[#C4BDD9] hover:text-white hover:border-[#A78BFA]'
                  : 'bg-white border-[#7C3AED]/25 text-[#3F3559] hover:text-black'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open settings and source status"
              className={`min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#0B0713] border-[#8B5CF6]/30 text-[#C4BDD9] hover:text-white hover:border-[#A78BFA]'
                  : 'bg-white border-[#7C3AED]/25 text-[#3F3559] hover:text-black'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Phone Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle dashboard navigation menu"
              aria-expanded={mobileMenuOpen}
              className={`xl:hidden min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#0B0713] border-[#8B5CF6]/30 text-[#C4BDD9]'
                  : 'bg-white border-[#7C3AED]/25 text-[#3F3559]'
              }`}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile / Tablet Menu Drawer */}
        {mobileMenuOpen && (
          <div
            className={`xl:hidden px-4 py-3 border-t space-y-3 text-xs font-mono-tabular ${
              isDark ? 'border-[#8B5CF6]/25 bg-[#0B0713]' : 'border-[#7C3AED]/20 bg-[#F0EBFF]'
            }`}
          >
            <div className="flex flex-wrap gap-2">
              <a
                href="#briefing"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-[#8B5CF6]/30 flex items-center"
              >
                01. Briefing
              </a>
              <a
                href="#map-monitor"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-[#8B5CF6]/30 flex items-center"
              >
                02. Map
              </a>
              <a
                href="#top-stories"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-[#8B5CF6]/30 flex items-center"
              >
                03. Top 10
              </a>
              <a
                href="#economic-change"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-[#8B5CF6]/30 flex items-center"
              >
                04. Economy &amp; FX
              </a>
              <a
                href="#speech-dossier"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-[#8B5CF6]/30 flex items-center"
              >
                05. Speeches
              </a>
              {onGoToLanding && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onGoToLanding();
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-[#A78BFA]/50 text-[#A78BFA] flex items-center gap-1"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Landing Page (/)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* iOS Safari Guided Install Modal */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
        >
          <div className="wp-glass-card w-full max-w-sm p-6 space-y-4">
            <h3 id="ios-install-title" className="font-editorial text-lg font-bold">
              Install WorldPulse on iPad / iPhone
            </h3>
            <p className="text-sm leading-relaxed text-[#C4BDD9]">
              1. Tap the <strong>Share</strong> button in Safari.
              <br />
              2. Select <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="wp-btn-primary w-full py-2.5 text-xs font-mono-tabular uppercase tracking-wider cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
