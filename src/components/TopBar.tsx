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
  const minutesAgo = lastUpdated
    ? Math.max(0, Math.floor((Date.now() - Number(lastUpdated)) / 60000))
    : 0;
  const isOlderThan90Min = minutesAgo >= 90;

  return (
    <>
      <header
        className={`sticky top-0 z-30 border-b transition-colors duration-200 no-print ${
          isDark
            ? 'bg-[#050B16]/90 border-cyan-500/20 text-[#E6F1FF]'
            : 'bg-[#F0F6FC]/95 border-cyan-600/20 text-[#050B16]'
        } backdrop-blur-xl`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Title + Landing Link */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#top"
              className="flex items-center gap-2 font-editorial text-xl sm:text-2xl font-extrabold tracking-tight whitespace-nowrap"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#22D3EE] shadow-[0_0_12px_#22D3EE]" />
              <span>WorldPulse</span>
            </a>

            {onGoToLanding && (
              <button
                type="button"
                onClick={onGoToLanding}
                title="View WorldPulse Landing Page (/)"
                className={`hidden sm:inline-flex min-h-[38px] px-2.5 py-1 rounded-full border text-[11px] font-mono-tabular items-center gap-1 transition-colors cursor-pointer ${
                  isDark
                    ? 'border-cyan-500/30 bg-[#0A1830] text-[#8FA5C2] hover:text-[#22D3EE] hover:border-cyan-400'
                    : 'border-cyan-700/25 bg-white text-[#1E3A5F] hover:text-[#0284C7]'
                }`}
              >
                <Home className="w-3 h-3 text-[#22D3EE]" />
                <span>Landing</span>
              </button>
            )}
          </div>

          {/* Zone 2: Section Navigation Links */}
          <nav
            aria-label="Primary dashboard sections"
            className="hidden xl:flex items-center gap-5 text-xs font-mono-tabular"
          >
            <a href="#briefing" className="hover:text-[#22D3EE] transition-colors">
              01. Briefing
            </a>
            <a href="#map-monitor" className="hover:text-[#22D3EE] transition-colors">
              02. Map
            </a>
            <a href="#top-stories" className="hover:text-[#22D3EE] transition-colors">
              03. Top 10
            </a>
            <a href="#economic-change" className="hover:text-[#22D3EE] transition-colors">
              04. Economy &amp; FX
            </a>
            <a href="#speech-dossier" className="hover:text-[#22D3EE] transition-colors">
              05. Speeches
            </a>
          </nav>

          {/* Zone 3: Compact Glass Controls (Last Updated Badge, Search, Language, Refresh, Theme, Settings) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Last updated badge: turns amber if older than 90 minutes */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-tabular border transition-colors ${
                isOlderThan90Min
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : isDark
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  : 'bg-cyan-50 border-cyan-300 text-cyan-900'
              }`}
              title={`Last refreshed at ${formatTimeInTz(lastUpdated, settings.timezone)}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOlderThan90Min ? 'bg-amber-400' : 'bg-cyan-400 animate-pulse'
                }`}
              />
              <span className="font-semibold whitespace-nowrap">
                {minutesAgo === 0 ? 'Last updated just now' : `Last updated ${minutesAgo}m ago`}
              </span>
            </div>

            <div
              className={`hidden 2xl:flex items-center gap-2 text-xs font-mono-tabular whitespace-nowrap ${
                isDark ? 'text-[#8FA5C2]' : 'text-[#475569]'
              }`}
              aria-live="polite"
            >
              <span className="font-semibold text-[#22D3EE]">
                {isRefreshing ? 'SYNCING' : 'LIVE'}
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
              <span className="hidden 2xl:inline-block text-xs text-[#22D3EE] font-mono-tabular truncate max-w-[160px]">
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
                    ? 'bg-[#0A1830] border-cyan-500/30 text-[#8FA5C2] hover:text-[#22D3EE] hover:border-cyan-400'
                    : 'bg-white border-cyan-700/25 text-[#1E3A5F] hover:text-[#0284C7]'
                }`}
              >
                <Search className="w-4 h-4 text-[#22D3EE]" />
              </button>
            )}

            {/* Language Switcher Pill */}
            {onChangeLanguage && (
              <div
                role="group"
                aria-label="Language switch"
                className={`hidden sm:flex items-center rounded-full border p-0.5 text-xs font-mono-tabular ${
                  isDark ? 'bg-[#0A1830] border-cyan-500/30' : 'bg-white border-cyan-700/25'
                }`}
              >
                {(['en', 'hi', 'pa'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onChangeLanguage(code)}
                    className={`min-h-[36px] px-2.5 rounded-full font-semibold transition-colors cursor-pointer ${
                      settings.language === code
                        ? 'bg-[#22D3EE] text-[#050B16] font-bold shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                        : isDark
                        ? 'text-[#8FA5C2] hover:text-[#22D3EE]'
                        : 'text-[#1E3A5F] hover:text-[#0284C7]'
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
                <Download className="w-3.5 h-3.5 text-[#22D3EE]" />
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
                <Download className="w-3.5 h-3.5 text-[#22D3EE]" />
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
                  ? 'bg-[#0A1830] border-cyan-500/30 text-[#8FA5C2] hover:text-[#22D3EE] hover:border-cyan-400'
                  : 'bg-white border-cyan-700/25 text-[#1E3A5F] hover:text-[#0284C7]'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-cyan-600" />}
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open settings and source status"
              className={`min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#0A1830] border-cyan-500/30 text-[#8FA5C2] hover:text-[#22D3EE] hover:border-cyan-400'
                  : 'bg-white border-cyan-700/25 text-[#1E3A5F] hover:text-[#0284C7]'
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
                  ? 'bg-[#0A1830] border-cyan-500/30 text-[#8FA5C2] hover:text-[#22D3EE]'
                  : 'bg-white border-cyan-700/25 text-[#1E3A5F] hover:text-[#0284C7]'
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
              isDark ? 'border-cyan-500/20 bg-[#0A1830]' : 'border-cyan-700/20 bg-[#E6F1FF]'
            }`}
          >
            <div className="flex flex-wrap gap-2">
              <a
                href="#briefing"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/30 flex items-center hover:bg-cyan-500/10"
              >
                01. Briefing
              </a>
              <a
                href="#map-monitor"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/30 flex items-center hover:bg-cyan-500/10"
              >
                02. Map
              </a>
              <a
                href="#top-stories"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/30 flex items-center hover:bg-cyan-500/10"
              >
                03. Top 10
              </a>
              <a
                href="#economic-change"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/30 flex items-center hover:bg-cyan-500/10"
              >
                04. Economy &amp; FX
              </a>
              <a
                href="#speech-dossier"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/30 flex items-center hover:bg-cyan-500/10"
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
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-cyan-500/40 text-cyan-400 flex items-center gap-1.5 hover:bg-cyan-500/10 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Landing Page (/)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Add to Home Screen Guided Modal for Android & iPhone */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="a2hs-guide-title"
        >
          <div className="wp-glass-card w-full max-w-md p-6 space-y-4 border border-cyan-500/35 shadow-[0_0_50px_rgba(34,211,238,0.2)]">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <h3 id="a2hs-guide-title" className="font-editorial text-lg font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-[#22D3EE]" />
                <span>Add WorldPulse to Home Screen</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                aria-label="Close guide"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8FA5C2] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono-tabular">
              {/* iPhone / iPad */}
              <div className="p-3.5 rounded-xl border border-cyan-500/25 bg-cyan-500/5 space-y-2">
                <div className="font-bold text-[#22D3EE] text-sm">Apple iPhone &amp; iPad (Safari)</div>
                <ol className="list-decimal pl-4 space-y-1 text-[#8FA5C2] leading-relaxed">
                  <li>Tap the <strong>Share</strong> icon (box with upward arrow) at the bottom of Safari.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> in the top-right corner to launch WorldPulse as a standalone app.</li>
                </ol>
              </div>

              {/* Android */}
              <div className="p-3.5 rounded-xl border border-cyan-500/25 bg-cyan-500/5 space-y-2">
                <div className="font-bold text-[#22D3EE] text-sm">Android (Chrome &amp; Edge)</div>
                <ol className="list-decimal pl-4 space-y-1 text-[#8FA5C2] leading-relaxed">
                  <li>Tap the <strong>Three Dots (⋮)</strong> menu in the upper-right corner.</li>
                  <li>Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  <li>Confirm installation to add the WorldPulse app icon to your launcher.</li>
                </ol>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="wp-btn-primary w-full py-2.5 text-xs font-mono-tabular uppercase tracking-wider cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
