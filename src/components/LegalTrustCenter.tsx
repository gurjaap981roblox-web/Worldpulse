import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Cookie,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  HelpCircle,
  History,
  Info,
  Mail,
  Scale,
  Shield,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  AppSettings,
  CookieConsentChoice,
  LegalPageId,
} from '../types';
import { CHANGELOG_ENTRIES } from '../data/changelog';
import {
  loadCookieConsent,
  saveCookieConsent,
  setOnboardingCompleted,
} from '../services/storage';
import { buildReportIssueMailto, UI_TRANSLATIONS } from '../utils/sanitize';

export const LEGAL_PAGE_HASHES: Record<string, LegalPageId> = {
  '#privacy': 'privacy',
  '#terms': 'terms',
  '#ai-disclaimer': 'ai-disclaimer',
  '#cookies': 'cookies',
  '#methodology': 'methodology',
  '#security': 'security',
  '#accessibility': 'accessibility',
  '#responsible-ai': 'responsible-ai',
  '#contact': 'contact',
  '#about': 'about',
  '#changelog': 'changelog',
};

export const LAST_UPDATED_DATE = 'October 12, 2026';

// ============================================================================
// 1. ONE-LINE AI DISCLAIMER + REPORT ISSUE LINK (Used under every AI output)
// ============================================================================
interface AiDisclaimerLineProps {
  settings: AppSettings;
  contextLabel: string;
  contextExcerpt?: string;
  onOpenLegalPage?: (page: LegalPageId) => void;
}

export const AiDisclaimerLine: React.FC<AiDisclaimerLineProps> = ({
  settings,
  contextLabel,
  contextExcerpt = '',
  onOpenLegalPage,
}) => {
  const isDark = settings.theme === 'dark';
  const labels = UI_TRANSLATIONS[settings.language] || UI_TRANSLATIONS.en;
  const mailtoUrl = buildReportIssueMailto(
    `AI Output Review: ${contextLabel}`,
    contextExcerpt || contextLabel
  );

  return (
    <div
      className={`mt-2.5 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular no-print ${
        isDark
          ? 'border-[#22D3EE]/20 text-[#8FA5C2]'
          : 'border-[#0284C7]/20 text-[#625680]'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
        <span>{labels.aiDisclaimerShort}</span>
        <a
          href="#ai-disclaimer"
          onClick={(e) => {
            if (onOpenLegalPage) {
              e.preventDefault();
              onOpenLegalPage('ai-disclaimer');
            }
          }}
          className="text-[#38BDF8] hover:underline font-semibold ml-1"
        >
          ({labels.aiDisclaimer})
        </a>
      </div>

      <a
        href={mailtoUrl}
        className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline font-semibold"
        title="Report inaccurate AI summary or wrong answer via email"
      >
        <Mail className="w-3 h-3" />
        <span>{labels.reportIssue}</span>
      </a>
    </div>
  );
};

// ============================================================================
// 2. LEGAL & TRUST CENTER MODAL (All 10 Pages + Hash Routing Support)
// ============================================================================
export interface LegalTrustModalProps {
  activePage: LegalPageId | null;
  onSelectPage: (page: LegalPageId) => void;
  onClose: () => void;
  onPurgeLocalCache?: () => void;
  onPurgeCache?: () => void;
  onExportJsonBackup?: () => void;
  settings: AppSettings;
  stories?: any[];
}

export const LEGAL_NAV_ITEMS: Array<{ id: LegalPageId; labelKey: string; defaultLabel: string }> = [
  { id: 'privacy', labelKey: 'privacyPolicy', defaultLabel: 'Privacy Policy' },
  { id: 'terms', labelKey: 'termsOfUse', defaultLabel: 'Terms of Use' },
  { id: 'ai-disclaimer', labelKey: 'aiDisclaimer', defaultLabel: 'AI Disclaimer' },
  { id: 'cookies', labelKey: 'cookieNotice', defaultLabel: 'Cookie Notice' },
  { id: 'methodology', labelKey: 'sourcesMethodology', defaultLabel: 'Sources & Methodology' },
  { id: 'security', labelKey: 'securityPolicy', defaultLabel: 'Security Architecture & SSRF Policy' },
  { id: 'accessibility', labelKey: 'accessibilityStatement', defaultLabel: 'Accessibility Statement' },
  { id: 'responsible-ai', labelKey: 'responsibleAi', defaultLabel: 'Responsible AI & Transparency' },
  { id: 'contact', labelKey: 'contactGrievance', defaultLabel: 'Contact & Grievance' },
  { id: 'about', labelKey: 'about', defaultLabel: 'About WorldPulse' },
  { id: 'changelog', labelKey: 'changelog', defaultLabel: 'Changelog' },
];

// Note: LegalTrustModal is code-split and imported lazily from ./LegalTrustModal


// ============================================================================
// 4. FIRST-VISIT 4-STEP ONBOARDING TOUR MODAL (Skippable & Replayable)
// ============================================================================
export interface OnboardingTourModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: () => void;
  settings: AppSettings;
}

const TOUR_STEPS = [
  {
    step: '01 / 04',
    title: 'Interactive World Map & Live Pulse',
    description:
      'Tap any pulsing country dot or hotspot chip to filter dispatches, inspect seismic events, or switch between Dark, Satellite, and Heatmap views.',
    targetAnchor: '#map-monitor',
  },
  {
    step: '02 / 04',
    title: 'Top 10 Global Dispatches & Audio Briefing',
    description:
      'Every story is ranked 1–10 for importance with source-type badges, a 5-dot source diversity meter, instant Hindi/Punjabi translation, and browser voice playback.',
    targetAnchor: '#top-stories',
  },
  {
    step: '03 / 04',
    title: 'Ask the World (Source-Grounded Q&A)',
    description:
      'Ask any question about current world events. The assistant answers strictly from monitored dispatches with clickable source citations.',
    targetAnchor: '#briefing',
  },
  {
    step: '04 / 04',
    title: 'Accessibility, Lite Mode & Custom Alerts',
    description:
      'Use Settings to adjust font size, enable High-Contrast or Dyslexia-Friendly fonts, turn on Low-Bandwidth Lite Mode, or replay this tour anytime.',
    targetAnchor: '#top',
  },
];

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  isOpen = true,
  onClose,
  onComplete,
  settings,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const isDark = settings.theme === 'dark';
  const current = TOUR_STEPS[stepIndex];

  const handleFinish = () => {
    setOnboardingCompleted(true);
    if (onComplete) onComplete();
    else if (onClose) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tour-title"
    >
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl ${
          isDark
            ? 'bg-[#050B16] border-[#22D3EE]/50 text-[#E6F1FF]'
            : 'bg-[#F0F6FC] border-[#0284C7]/40 text-[#140E24]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-[#22D3EE]/20 text-[#38BDF8] text-xs font-mono-tabular font-bold">
            Welcome Tour · Step {current.step}
          </span>
          <button
            type="button"
            onClick={handleFinish}
            className="min-h-[44px] px-3 text-xs font-mono-tabular text-[#8FA5C2] hover:text-white cursor-pointer"
          >
            Skip Tour
          </button>
        </div>

        <div className="space-y-2">
          <h3 id="onboarding-tour-title" className="text-xl font-bold">
            {current.title}
          </h3>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-[#8FA5C2]' : 'text-[#3F3559]'}`}>
            {current.description}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === stepIndex ? 'w-6 bg-[#22D3EE]' : 'w-2 bg-[#22D3EE]/30'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => i - 1)}
                className="wp-btn-secondary px-4 py-2 text-xs font-mono-tabular cursor-pointer"
              >
                Back
              </button>
            )}
            {stepIndex < TOUR_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIndex((i) => i + 1)}
                className="wp-btn-primary px-5 py-2 text-xs font-mono-tabular cursor-pointer"
              >
                Next Step
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="wp-btn-primary px-5 py-2 text-xs font-mono-tabular cursor-pointer"
              >
                Start Exploring
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FirstVisitOnboardingTour = OnboardingTourModal;
export const LEGAL_HASH_TO_ID = LEGAL_PAGE_HASHES;

export interface LegalFooterLinksProps {
  settings: AppSettings;
  onOpenLegalPage: (page: LegalPageId) => void;
  className?: string;
}

export const LegalFooterLinks: React.FC<LegalFooterLinksProps> = ({
  settings,
  onOpenLegalPage,
  className = '',
}) => {
  const isDark = settings.theme === 'dark';
  return (
    <footer
      className={`py-6 px-4 border-t no-print ${
        isDark ? 'border-[#22D3EE]/20 bg-[#050B16] text-[#8FA5C2]' : 'border-[#0284C7]/20 bg-[#F0F6FC] text-[#625680]'
      } text-xs ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-wide text-[#22D3EE]">WORLDPULSE</span>
          <span>© 2026 WorldPulse Intel · Open Public Telemetry</span>
        </div>

        {/* Requirement 20: Explicit footer links to Privacy, Terms, Cookies, Accessibility, Security, JSON feed & RSS feed */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono-tabular">
          <button
            type="button"
            onClick={() => onOpenLegalPage('privacy')}
            className="hover:text-[#38BDF8] transition-colors cursor-pointer text-[11px] underline sm:no-underline"
          >
            Privacy
          </button>
          <button
            type="button"
            onClick={() => onOpenLegalPage('terms')}
            className="hover:text-[#38BDF8] transition-colors cursor-pointer text-[11px] underline sm:no-underline"
          >
            Terms
          </button>
          <button
            type="button"
            onClick={() => onOpenLegalPage('cookies')}
            className="hover:text-[#38BDF8] transition-colors cursor-pointer text-[11px] underline sm:no-underline"
          >
            Cookies
          </button>
          <button
            type="button"
            onClick={() => onOpenLegalPage('accessibility')}
            className="hover:text-[#38BDF8] transition-colors cursor-pointer text-[11px] underline sm:no-underline"
          >
            Accessibility
          </button>
          <a
            href="/.well-known/security.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#38BDF8] transition-colors cursor-pointer text-[11px] text-cyan-300"
          >
            Security (/.well-known/security.txt)
          </a>
          <a
            href="/api/feed.json"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#38BDF8] transition-colors cursor-pointer text-[11px] text-cyan-300"
          >
            JSON Feed
          </a>
          <a
            href="/api/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#38BDF8] transition-colors cursor-pointer text-[11px] text-cyan-300"
          >
            RSS Feed
          </a>

          {/* Remaining legal items */}
          {LEGAL_NAV_ITEMS.filter(
            (i) => !['privacy', 'terms', 'cookies', 'accessibility', 'security'].includes(i.id)
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenLegalPage(item.id)}
              className="hover:text-[#38BDF8] transition-colors cursor-pointer text-[11px]"
            >
              {item.defaultLabel}
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
};


// ============================================================================
// 3. FIRST-VISIT COOKIE & STORAGE CONSENT BANNER
// ============================================================================
export interface CookieConsentBannerProps {
  settings: AppSettings;
  onOpenCookiePolicy: () => void;
  onSaveConsent?: (choice: CookieConsentChoice) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  settings,
  onOpenCookiePolicy,
  onSaveConsent,
}) => {
  const [consent, setConsent] = useState<CookieConsentChoice | null>(() =>
    loadCookieConsent()
  );
  const [customizing, setCustomizing] = useState(false);
  const [prefChecked, setPrefChecked] = useState(true);

  if (consent?.decided) return null;

  const isDark = settings.theme === 'dark';

  const handleSave = (preferences: boolean) => {
    const choice: CookieConsentChoice = {
      decided: true,
      necessary: true,
      preferences,
      updatedAt: Date.now(),
    };
    saveCookieConsent(choice);
    setConsent(choice);
    if (onSaveConsent) {
      onSaveConsent(choice);
    }
  };

  return (
    <aside
      aria-label="Cookie and local storage consent banner"
      className={`fixed bottom-16 lg:bottom-4 left-4 right-4 z-40 max-w-4xl mx-auto p-4 sm:p-5 rounded-2xl border shadow-2xl no-print ${
        isDark
          ? 'bg-[#050B16]/95 border-[#22D3EE]/50 text-[#E6F1FF]'
          : 'bg-[#F0F6FC]/95 border-[#0284C7]/40 text-[#140E24]'
      } backdrop-blur-xl`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 text-xs leading-relaxed">
          <div className="flex items-center gap-2 font-mono-tabular font-bold text-[#38BDF8] uppercase tracking-wider">
            <Cookie className="w-4 h-4" />
            <span>Storage &amp; Privacy Notice — Zero Analytics or Tracking</span>
          </div>
          <p className={isDark ? 'text-[#8FA5C2]' : 'text-[#3F3559]'}>
            WorldPulse uses browser <code>localStorage</code> only to save your language, theme,
            bookmarks, and story caches. <strong>No analytics, ad cookies, or tracking scripts are used.</strong>{' '}
            <button
              type="button"
              onClick={onOpenCookiePolicy}
              className="text-[#38BDF8] underline font-semibold cursor-pointer"
            >
              Read Cookie Notice
            </button>
          </p>

          {customizing && (
            <div className="pt-2 flex flex-wrap items-center gap-4 font-mono-tabular">
              <label className="inline-flex items-center gap-2 opacity-80">
                <input type="checkbox" checked disabled className="w-4 h-4 accent-[#22D3EE]" />
                <span>Necessary (Always On)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefChecked}
                  onChange={(e) => setPrefChecked(e.target.checked)}
                  className="w-4 h-4 accent-[#22D3EE]"
                />
                <span>Preferences (Theme, Language &amp; Saved Filters)</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!customizing ? (
            <>
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="wp-btn-primary px-4 py-2 text-xs font-mono-tabular cursor-pointer"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="wp-btn-secondary px-4 py-2 text-xs font-mono-tabular cursor-pointer"
              >
                Reject Optional
              </button>
              <button
                type="button"
                onClick={() => setCustomizing(true)}
                className="min-h-[44px] px-3 py-2 text-xs font-mono-tabular text-[#38BDF8] hover:underline cursor-pointer"
              >
                Customize
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleSave(prefChecked)}
              className="wp-btn-primary px-4 py-2 text-xs font-mono-tabular cursor-pointer"
            >
              Save Choice
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};


