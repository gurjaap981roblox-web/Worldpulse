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
  '#accessibility': 'accessibility',
  '#responsible-ai': 'responsible-ai',
  '#contact': 'contact',
  '#about': 'about',
  '#changelog': 'changelog',
};

const LAST_UPDATED_DATE = 'October 12, 2026';

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
          ? 'border-[#8B5CF6]/20 text-[#9389B0]'
          : 'border-[#7C3AED]/20 text-[#625680]'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-[#A78BFA] shrink-0" />
        <span>{labels.aiDisclaimerShort}</span>
        <a
          href="#ai-disclaimer"
          onClick={(e) => {
            if (onOpenLegalPage) {
              e.preventDefault();
              onOpenLegalPage('ai-disclaimer');
            }
          }}
          className="text-[#A78BFA] hover:underline font-semibold ml-1"
        >
          ({labels.aiDisclaimer})
        </a>
      </div>

      <a
        href={mailtoUrl}
        className="inline-flex items-center gap-1 text-[#A78BFA] hover:underline font-semibold"
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
interface LegalTrustModalProps {
  activePage: LegalPageId | null;
  onSelectPage: (page: LegalPageId) => void;
  onClose: () => void;
  onPurgeLocalCache: () => void;
  settings: AppSettings;
}

const LEGAL_NAV_ITEMS: Array<{ id: LegalPageId; labelKey: string; defaultLabel: string }> = [
  { id: 'privacy', labelKey: 'privacyPolicy', defaultLabel: 'Privacy Policy' },
  { id: 'terms', labelKey: 'termsOfUse', defaultLabel: 'Terms of Use' },
  { id: 'ai-disclaimer', labelKey: 'aiDisclaimer', defaultLabel: 'AI Disclaimer' },
  { id: 'cookies', labelKey: 'cookieNotice', defaultLabel: 'Cookie Notice' },
  { id: 'methodology', labelKey: 'sourcesMethodology', defaultLabel: 'Sources & Methodology' },
  { id: 'accessibility', labelKey: 'accessibilityStatement', defaultLabel: 'Accessibility Statement' },
  { id: 'responsible-ai', labelKey: 'responsibleAi', defaultLabel: 'Responsible AI & Transparency' },
  { id: 'contact', labelKey: 'contactGrievance', defaultLabel: 'Contact & Grievance' },
  { id: 'about', labelKey: 'about', defaultLabel: 'About WorldPulse' },
  { id: 'changelog', labelKey: 'changelog', defaultLabel: 'Changelog' },
];

export const LegalTrustModal: React.FC<LegalTrustModalProps> = ({
  activePage,
  onSelectPage,
  onClose,
  onPurgeLocalCache,
  settings,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [cachePurgedNotice, setCachePurgedNotice] = useState(false);

  // Contact & Grievance form state
  const [contactCategory, setContactCategory] = useState('General Feedback');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  // Cookie preference state inside modal
  const [cookiePref, setCookiePref] = useState<CookieConsentChoice>(
    () =>
      loadCookieConsent() || {
        decided: false,
        necessary: true,
        preferences: true,
        updatedAt: Date.now(),
      }
  );

  // Focus trap & Escape key handler
  useEffect(() => {
    if (!activePage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePage, onClose]);

  if (!activePage) return null;

  const isDark = settings.theme === 'dark';
  const labels = UI_TRANSLATIONS[settings.language] || UI_TRANSLATIONS.en;

  const handlePurgeClick = () => {
    onPurgeLocalCache();
    setCachePurgedNotice(true);
    setTimeout(() => setCachePurgedNotice(false), 3000);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(
      `[WorldPulse ${contactCategory}] ${contactSubject || 'User Inquiry'}`
    );
    const body = encodeURIComponent(
      `Category: ${contactCategory}\nSubject: ${contactSubject}\n\nMessage:\n${contactMessage}\n\n---\nSubmitted from WorldPulse Legal & Trust Center`
    );
    window.location.href = `mailto:[EMAIL]?subject=${subject}&body=${body}`;
  };

  const handleSaveCookiePref = (preferencesEnabled: boolean) => {
    const next: CookieConsentChoice = {
      decided: true,
      necessary: true,
      preferences: preferencesEnabled,
      updatedAt: Date.now(),
    };
    setCookiePref(next);
    saveCookieConsent(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-trust-modal-title"
    >
      <div
        ref={modalRef}
        className={`w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl ${
          isDark
            ? 'bg-[#0B0713] border-[#8B5CF6]/40 text-[#F6F4FF]'
            : 'bg-[#F8F6FF] border-[#7C3AED]/30 text-[#140E24]'
        }`}
      >
        {/* Top Modal Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isDark ? 'border-[#8B5CF6]/25 bg-[#050309]' : 'border-[#7C3AED]/20 bg-[#F0EBFF]'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-wider text-[#A78BFA] font-semibold">
              <Scale className="w-3.5 h-3.5" />
              <span>WorldPulse Legal, Trust &amp; Transparency Center</span>
            </div>
            <h2
              id="legal-trust-modal-title"
              className="font-editorial text-xl font-bold tracking-tight mt-0.5"
            >
              {LEGAL_NAV_ITEMS.find((i) => i.id === activePage)?.defaultLabel || 'Legal & Trust'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Legal and Trust modal"
            className={`min-h-[44px] min-w-[44px] rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              isDark
                ? 'border-[#8B5CF6]/35 bg-[#110C1D] text-[#C4BDD9] hover:text-white hover:border-[#A78BFA]'
                : 'border-[#7C3AED]/30 bg-white text-[#3F3559] hover:text-black'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Layout: Sidebar Navigation + Page Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Tabs */}
          <nav
            aria-label="Legal and trust pages"
            className={`md:w-64 shrink-0 border-b md:border-b-0 md:border-r p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto ${
              isDark ? 'border-[#8B5CF6]/20 bg-[#050309]/70' : 'border-[#7C3AED]/15 bg-[#F0EBFF]/60'
            }`}
          >
            {LEGAL_NAV_ITEMS.map((item) => {
              const isSelected = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectPage(item.id)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-left text-xs font-mono-tabular font-semibold transition-all whitespace-nowrap md:whitespace-normal shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-md'
                      : isDark
                      ? 'text-[#C4BDD9] hover:bg-[#8B5CF6]/15 hover:text-white'
                      : 'text-[#3F3559] hover:bg-[#7C3AED]/10 hover:text-black'
                  }`}
                >
                  {labels[item.labelKey] || item.defaultLabel}
                </button>
              );
            })}
          </nav>

          {/* Main Page Content */}
          <div className="flex-1 p-5 sm:p-7 overflow-y-auto space-y-5 text-sm leading-relaxed">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono-tabular border ${
                isDark
                  ? 'border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#A78BFA]'
                  : 'border-[#7C3AED]/25 bg-[#7C3AED]/10 text-[#6D28D9]'
              }`}
            >
              <span>Last updated: {LAST_UPDATED_DATE}</span>
              <span>·</span>
              <span>Plain-Language Edition</span>
            </div>

            {/* 1. PRIVACY POLICY */}
            {activePage === 'privacy' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Privacy Policy (Plain Language)</h3>
                <p>
                  WorldPulse is designed to monitor global events — not to monitor you. We do not use
                  third-party advertising trackers, behavioral profiling, or analytics scripts, and we{' '}
                  <strong>never sell, rent, or trade personal data</strong>.
                </p>

                <div className="space-y-2">
                  <h4 className="font-semibold text-[#A78BFA]">1. What is Stored on Your Device</h4>
                  <p>
                    By default, WorldPulse stores your preferences (theme, language, font size, followed
                    countries/topics, saved filter presets), 7-day story snapshots, bookmarks, and AI
                    summary caches in your browser&apos;s <code>localStorage</code>. All browser storage is
                    wrapped in safe <code>try/catch</code> blocks so the app works even in private/incognito
                    browsing. If you optionally sign in with Supabase Auth, your followed countries,
                    bookmarks, and custom alert rules sync to your private account protected by Row Level
                    Security (RLS).
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-[#A78BFA]">2. What is Sent to the AI Server</h4>
                  <p>
                    When AI synthesis, translation, or &ldquo;Ask the World&rdquo; is used, only public news
                    headlines, short public dispatches, or your question text (capped at 1,000 characters)
                    are sent to our server-side proxy. No personal identity, cookies, or account details
                    are ever sent to the AI model.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-[#A78BFA]">
                    3. India DPDP Act (2023) &amp; EU GDPR Rights
                  </h4>
                  <p>
                    Under India&apos;s <strong>Digital Personal Data Protection Act (DPDP Act, 2023)</strong>{' '}
                    and the <strong>European Union General Data Protection Regulation (GDPR)</strong>, you
                    have the right to access, correct, export, withdraw consent, and erase your data at any
                    time, and to contact our Grievance Officer regarding any privacy concern.
                  </p>
                </div>

                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isDark ? 'border-[#8B5CF6]/30 bg-[#050309]' : 'border-[#7C3AED]/25 bg-white'
                  }`}
                >
                  <h4 className="font-semibold text-[#A78BFA]">
                    4. Delete Your Data Immediately (&ldquo;Purge Local Cache&rdquo;)
                  </h4>
                  <p className="text-xs">
                    You can wipe all locally cached stories, snapshots, speech history, and translations at
                    any time with one click below or from the Settings modal.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePurgeClick}
                      className="min-h-[44px] px-4 py-2 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-mono-tabular font-semibold inline-flex items-center gap-2 hover:bg-rose-500/30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Purge Local Cache Now</span>
                    </button>
                    {cachePurgedNotice && (
                      <span className="text-xs font-mono-tabular text-emerald-400">
                        ✓ Local cache purged!
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectPage('contact')}
                      className="min-h-[44px] px-4 py-2 rounded-full border border-[#8B5CF6]/40 text-xs font-mono-tabular text-[#A78BFA] hover:bg-[#8B5CF6]/15 cursor-pointer"
                    >
                      Contact Privacy / Grievance Officer →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. TERMS OF USE */}
            {activePage === 'terms' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Terms of Use</h3>
                <p>
                  Welcome to WorldPulse. By accessing or using this website and dashboard, you agree to
                  these plain-language Terms of Use.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Informational Purposes Only:</strong> WorldPulse aggregates public news wires,
                    scientific sensors, and market indicators for general situational awareness.
                  </li>
                  <li>
                    <strong>No Professional Advice:</strong> Nothing on WorldPulse constitutes financial,
                    investment, legal, medical, emergency-response, or safety advice. During natural
                    disasters or health outbreaks, always follow official local emergency authorities and
                    WHO/government directives.
                  </li>
                  <li>
                    <strong>No Warranty:</strong> The service is provided &ldquo;as is&rdquo; without
                    warranties of completeness, timeliness, or uninterrupted availability.
                  </li>
                  <li>
                    <strong>Acceptable Use:</strong> You agree not to abuse rate-limited endpoints,
                    scrape automated AI routes, or attempt to disrupt the service.
                  </li>
                  <li>
                    <strong>Third-Party Data Credits:</strong> Headlines, seismic data, satellite events,
                    and market rates remain the property of their respective publishers and public agencies
                    (BBC, Al Jazeera, The Guardian, Reuters, USGS, NASA EONET, GDELT, CoinGecko, European
                    Central Bank, World Bank, Open-Meteo, WHO, and Wikimedia). Every card links directly
                    to the original source.
                  </li>
                </ul>
              </div>
            )}

            {/* 3. AI DISCLAIMER */}
            {activePage === 'ai-disclaimer' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">AI Disclaimer</h3>
                <p>
                  WorldPulse uses server-side large language models (Google Gemini) to summarize public
                  headlines, generate daily briefings, answer &ldquo;Ask the World&rdquo; questions, and
                  translate summaries into Hindi (हिन्दी) and Punjabi (ਪੰਜਾਬੀ).
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>AI Summaries May Be Wrong or Outdated:</strong> Automated summaries and
                    translations can misinterpret numbers, nuance, locations, or developing events.
                  </li>
                  <li>
                    <strong>Always Check Original Sources:</strong> Every story card, briefing item, and
                    Ask the World response includes direct links to the underlying news outlets or sensor
                    agencies. Always verify the primary source before acting on any information.
                  </li>
                  <li>
                    <strong>Not Professional Advice:</strong> AI outputs on WorldPulse are never a
                    substitute for qualified financial, medical, legal, or safety advice.
                  </li>
                  <li>
                    <strong>Deterministic Fallback &amp; Pause AI:</strong> You can disable AI completely at
                    any time using the <strong>Pause AI</strong> switch in Settings.
                  </li>
                </ul>
              </div>
            )}

            {/* 4. COOKIE NOTICE */}
            {activePage === 'cookies' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Cookie Notice &amp; Local Storage Preferences</h3>
                <p>
                  <strong>Zero Tracking or Analytics:</strong> WorldPulse does not use advertising cookies,
                  third-party tracking pixels, or analytics scripts.
                </p>
                <p>
                  We use browser <code>localStorage</code> strictly for two categories:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Strictly Necessary Storage (Always Active):</strong> Keeps essential app state,
                    rate-limit safety caches, and your privacy consent choice working.
                  </li>
                  <li>
                    <strong>Preferences Storage (Optional):</strong> Remembers your theme, font size,
                    language (English/Hindi/Punjabi), bookmarks, and saved filter presets across visits.
                  </li>
                </ul>

                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isDark ? 'border-[#8B5CF6]/30 bg-[#050309]' : 'border-[#7C3AED]/25 bg-white'
                  }`}
                >
                  <div className="text-xs font-mono-tabular font-semibold text-[#A78BFA]">
                    Current Preference Status:{' '}
                    {cookiePref.decided
                      ? cookiePref.preferences
                        ? 'Accepted (Necessary + Preferences)'
                        : 'Necessary Only (Preferences Rejected)'
                      : 'Not decided yet'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveCookiePref(true)}
                      className="min-h-[44px] px-4 py-2 rounded-full bg-[#8B5CF6] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
                    >
                      Accept All (Necessary + Preferences)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCookiePref(false)}
                      className="min-h-[44px] px-4 py-2 rounded-full border border-[#8B5CF6]/40 text-xs font-mono-tabular font-semibold cursor-pointer"
                    >
                      Reject Optional (Necessary Only)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SOURCES & METHODOLOGY */}
            {activePage === 'methodology' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Sources &amp; Methodology</h3>
                <p>
                  WorldPulse combines primary database snapshots from Supabase with real-time public feeds
                  collected on a 30-minute cadence.
                </p>

                <div className="space-y-2">
                  <h4 className="font-semibold text-[#A78BFA]">1. Complete List of Data Sources</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono-tabular">
                    <li className="p-2.5 rounded-xl border border-[#8B5CF6]/20">
                      • <strong>BBC World</strong> — Global Broadcast &amp; Wire RSS
                    </li>
                    <li className="p-2.5 rounded-xl border border-[#8B5CF6]/20">
                      • <strong>Al Jazeera</strong> — International News RSS
                    </li>
                    <li className="p-2.5 rounded-xl border border-[#8B5CF6]/20">
                      • <strong>The Guardian / World</strong> — Global Newspaper Dispatches
                    </li>
                    <li className="p-2.5 rounded-xl border border-[#8B5CF6]/20">
                      • <strong>Reuters / Global Wires</strong> — International Agency Feeds
                    </li>
                    <li className="p-2.5 rounded-xl border border-[#8B5CF6]/20">
                      • <strong>USGS Earthquake Hazards</strong> — M4.5+ Global Seismic Sensors
                    </li>
                    <li className="p-2.5 rounded-xl border border-[#8B5CF6]/20">
                      • <strong>NASA EONET</strong> — Wildfires, Volcanoes &amp; Severe Storms
                    </li>
                    <li className="p-2.5 rounded-xl border border-[#8B5CF6]/20">
                      • <strong>GDELT Project</strong> — Global Event &amp; Media Mention Telemetry
                    </li>
                    <li className="p-2.5 rounded-xl border border-[#8B5CF6]/20">
                      • <strong>CoinGecko</strong> — Digital Asset Prices &amp; 7-Day Sparklines
                    </li>
                    <li className="p-2.5 rounded-xl border border-[#8B5CF6]/20">
                      • <strong>European Central Bank (ECB / Frankfurter)</strong> — Sovereign FX Rates
                    </li>
                    <li className="p-2.5 rounded-xl border border-[#8B5CF6]/20">
                      • <strong>World Bank Open Data</strong> — Sovereign GDP &amp; CPI Inflation
                    </li>
                    <li className="p-2.5 rounded-xl border border-[#8B5CF6]/20">
                      • <strong>Open-Meteo</strong> — Global City Weather &amp; Extreme Wind/Temp
                    </li>
                    <li className="p-2.5 rounded-xl border border-[#8B5CF6]/20">
                      • <strong>Wikimedia REST API</strong> — Most-Read Global Attention Trends
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-[#A78BFA]">
                    2. Collection Cadence &amp; Importance Ranking (1–10)
                  </h4>
                  <p>
                    Stories are collected every 30 minutes (or on manual refresh) and deduplicated using URL
                    normalization and Jaccard title similarity. Importance is scored from <strong>1 to 10</strong>{' '}
                    based on multi-source corroboration, seismic magnitude (for earthquakes), geopolitical or
                    humanitarian impact, and topic severity.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-[#A78BFA]">
                    3. &ldquo;Confirmed&rdquo; vs. &ldquo;Developing&rdquo; Status
                  </h4>
                  <p>
                    A story is marked <strong>Confirmed</strong> when backed by official geophysical/agency
                    sensors (such as USGS, NASA EONET, WHO, ECB) or corroborated by multiple independent
                    news outlets with high confidence (&ge;68%). Single-source breaking reports under 60
                    minutes old or with lower confidence are marked <strong>Developing</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-[#A78BFA]">4. Known Limitations</h4>
                  <p>
                    Public RSS feeds and APIs focus primarily on English-language and major regional
                    dispatches; rural or unindexed local events may appear with a delay. Country coordinates
                    often represent national or regional capitals unless exact sensor coordinates are
                    provided.
                  </p>
                </div>
              </div>
            )}

            {/* 6. ACCESSIBILITY STATEMENT */}
            {activePage === 'accessibility' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Accessibility Statement</h3>
                <p>
                  WorldPulse is committed to making real-time global information accessible to every reader
                  on desktop, 10-inch tablets, and mobile phones, following WCAG 2.1 AA guidelines.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Font Size Scaling:</strong> Switch between Small, Normal, Large, and Extra Large
                    text in Settings.
                  </li>
                  <li>
                    <strong>High-Contrast &amp; Light/Dark Themes:</strong> Toggle High-Contrast mode in
                    Settings for maximum foreground-to-background contrast.
                  </li>
                  <li>
                    <strong>Dyslexia-Friendly Typography:</strong> Enable the free{' '}
                    <em>Atkinson Hyperlegible</em> font in Settings for clearer character distinction.
                  </li>
                  <li>
                    <strong>Reduce Motion &amp; Low-Bandwidth Lite Mode:</strong> Turn off all pulsing rings,
                    tickers, and globe animations, or enable Lite Mode to replace map tiles with fast lists.
                  </li>
                  <li>
                    <strong>Audio Briefing (Text-to-Speech):</strong> Listen to the Daily Briefing and any
                    Top 10 story using built-in browser speech synthesis with speed and voice controls.
                  </li>
                  <li>
                    <strong>Keyboard &amp; Touch Targets:</strong> Every interactive control is at least
                    44&times;44px for tablet touch use, with a visible &ldquo;Skip to main content&rdquo;
                    link, focus rings, and <code>Esc</code> to close modals.
                  </li>
                </ul>
              </div>
            )}

            {/* 7. RESPONSIBLE AI & TRANSPARENCY */}
            {activePage === 'responsible-ai' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Responsible AI &amp; Transparency</h3>
                <p>
                  Our AI layer is built around strict source attribution, cost and rate safety, and user
                  control:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Strict Source Grounding:</strong> In &ldquo;Ask the World&rdquo;, the assistant
                    answers exclusively from the currently monitored story list and returns{' '}
                    <em>&ldquo;Not enough data&rdquo;</em> when an event is not in the verified feed.
                  </li>
                  <li>
                    <strong>Source Diversity &amp; Contradiction Signals:</strong> Every story card shows
                    source-type badges, a 5-dot source diversity meter, and a &ldquo;Sources differ&rdquo;
                    comparison whenever outlets report differing figures.
                  </li>
                  <li>
                    <strong>Simple-Language Mode:</strong> Readers can enable Simple-Language Mode in
                    Settings so AI summaries use short, clear sentences.
                  </li>
                  <li>
                    <strong>Server-Side Key Protection:</strong> API keys never leave our server. All
                    <code>/api/ai/*</code> routes enforce a 20-request/hour per-IP rate limit, a 1,000-char
                    input limit, and a 300-call daily global budget.
                  </li>
                </ul>
              </div>
            )}

            {/* 8. CONTACT & GRIEVANCE */}
            {activePage === 'contact' && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold">Contact &amp; Grievance Redressal</h3>
                <p>
                  In accordance with India&apos;s Information Technology Rules, the Digital Personal Data
                  Protection Act (DPDP Act), and GDPR transparency standards, you may reach our designated
                  Grievance Officer or submit a report using the form below.
                </p>

                {/* Clearly Marked Placeholders as Requested */}
                <div
                  className={`p-4 rounded-xl border font-mono-tabular text-xs space-y-1.5 ${
                    isDark ? 'border-[#8B5CF6]/35 bg-[#050309]' : 'border-[#7C3AED]/30 bg-white'
                  }`}
                >
                  <div className="text-[#A78BFA] font-semibold uppercase tracking-wider mb-1">
                    Designated Grievance Officer &amp; Contact Details
                  </div>
                  <div>
                    <strong>Name:</strong> [GRIEVANCE OFFICER NAME]
                  </div>
                  <div>
                    <strong>Email:</strong> [EMAIL]
                  </div>
                  <div>
                    <strong>Postal Address:</strong> [ADDRESS]
                  </div>
                </div>

                {/* Mailto Contact Form */}
                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="contact-category"
                        className="block text-xs font-mono-tabular font-semibold mb-1"
                      >
                        Inquiry Type
                      </label>
                      <select
                        id="contact-category"
                        value={contactCategory}
                        onChange={(e) => setContactCategory(e.target.value)}
                        className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono-tabular ${
                          isDark
                            ? 'bg-[#050309] border-[#8B5CF6]/30 text-white'
                            : 'bg-white border-[#7C3AED]/25 text-black'
                        }`}
                      >
                        <option value="General Feedback">General Feedback</option>
                        <option value="Inaccurate Story / AI Summary">
                          Inaccurate Story / AI Summary
                        </option>
                        <option value="Privacy / DPDP / GDPR Request">
                          Privacy / DPDP / GDPR Request
                        </option>
                        <option value="Grievance / Legal Notice">Grievance / Legal Notice</option>
                        <option value="Accessibility Barrier">Accessibility Barrier</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="contact-subject"
                        className="block text-xs font-mono-tabular font-semibold mb-1"
                      >
                        Subject
                      </label>
                      <input
                        id="contact-subject"
                        type="text"
                        required
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        placeholder="Brief summary of your request..."
                        className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono-tabular ${
                          isDark
                            ? 'bg-[#050309] border-[#8B5CF6]/30 text-white'
                            : 'bg-white border-[#7C3AED]/25 text-black'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-xs font-mono-tabular font-semibold mb-1"
                    >
                      Details
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Include any story headline, source link, or details..."
                      className={`w-full p-3 rounded-xl border text-xs font-mono-tabular ${
                        isDark
                          ? 'bg-[#050309] border-[#8B5CF6]/30 text-white'
                          : 'bg-white border-[#7C3AED]/25 text-black'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="wp-btn-primary px-5 py-2.5 text-xs font-mono-tabular uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Open in Email Client (mailto:)</span>
                  </button>
                </form>
              </div>
            )}

            {/* 9. ABOUT PAGE */}
            {activePage === 'about' && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold">About WorldPulse</h3>
                <p>
                  <strong>Our Mission:</strong> WorldPulse is a free, calm, and verifiable global situation
                  monitor that brings together news wires, earthquake and climate sensors, sovereign markets,
                  and multilingual briefings (English, हिन्दी, ਪੰਜਾਬੀ) in one place without noise or
                  clickbait.
                </p>

                <div className="space-y-2">
                  <h4 className="font-semibold text-[#A78BFA]">How It Works in 3 Steps</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div
                      className={`p-4 rounded-xl border ${
                        isDark ? 'border-[#8B5CF6]/30 bg-[#050309]' : 'border-[#7C3AED]/20 bg-white'
                      }`}
                    >
                      <div className="text-xs font-mono-tabular font-bold text-[#A78BFA] mb-1">
                        01 / COLLECT
                      </div>
                      <p className="text-xs">
                        Every 30 minutes, we read verified dispatches from Supabase and 12+ global wires,
                        seismic sensors, and market feeds.
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-xl border ${
                        isDark ? 'border-[#8B5CF6]/30 bg-[#050309]' : 'border-[#7C3AED]/20 bg-white'
                      }`}
                    >
                      <div className="text-xs font-mono-tabular font-bold text-[#A78BFA] mb-1">
                        02 / UNDERSTAND
                      </div>
                      <p className="text-xs">
                        Duplicate headlines are merged, source diversity is scored, and AI ranks importance
                        from 1 to 10 with confidence badges.
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-xl border ${
                        isDark ? 'border-[#8B5CF6]/30 bg-[#050309]' : 'border-[#7C3AED]/20 bg-white'
                      }`}
                    >
                      <div className="text-xs font-mono-tabular font-bold text-[#A78BFA] mb-1">
                        03 / SHOW
                      </div>
                      <p className="text-xs">
                        Explore the interactive world map, Top 10 stories, Audio Briefing, What Changed in
                        24h, and Country Dossiers.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-semibold text-[#A78BFA]">Data-Source Summary</h4>
                  <p className="text-xs">
                    Powered by Supabase primary tables plus BBC, Al Jazeera, The Guardian, Reuters, USGS,
                    NASA EONET, GDELT, CoinGecko, European Central Bank, World Bank, Open-Meteo, WHO, and
                    Wikimedia.
                  </p>
                </div>
              </div>
            )}

            {/* 10. CHANGELOG PAGE */}
            {activePage === 'changelog' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">WorldPulse Changelog</h3>
                <p className="text-xs font-mono-tabular text-[#A78BFA]">
                  Maintained in <code>src/data/changelog.ts</code>
                </p>
                <div className="space-y-4">
                  {CHANGELOG_ENTRIES.map((entry) => (
                    <div
                      key={entry.version}
                      className={`p-4 rounded-xl border space-y-2 ${
                        isDark ? 'border-[#8B5CF6]/30 bg-[#050309]' : 'border-[#7C3AED]/20 bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] text-xs font-mono-tabular font-bold">
                          {entry.version}
                        </span>
                        <span className="text-xs font-mono-tabular text-[#9389B0]">
                          {entry.date}
                        </span>
                      </div>
                      <h4 className="font-semibold text-base">{entry.title}</h4>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        {entry.highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. FIRST-VISIT COOKIE & STORAGE CONSENT BANNER
// ============================================================================
interface CookieConsentBannerProps {
  settings: AppSettings;
  onOpenCookiePolicy: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  settings,
  onOpenCookiePolicy,
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
  };

  return (
    <aside
      aria-label="Cookie and local storage consent banner"
      className={`fixed bottom-16 lg:bottom-4 left-4 right-4 z-40 max-w-4xl mx-auto p-4 sm:p-5 rounded-2xl border shadow-2xl no-print ${
        isDark
          ? 'bg-[#0B0713]/95 border-[#8B5CF6]/50 text-[#F6F4FF]'
          : 'bg-[#F8F6FF]/95 border-[#7C3AED]/40 text-[#140E24]'
      } backdrop-blur-xl`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 text-xs leading-relaxed">
          <div className="flex items-center gap-2 font-mono-tabular font-bold text-[#A78BFA] uppercase tracking-wider">
            <Cookie className="w-4 h-4" />
            <span>Storage &amp; Privacy Notice — Zero Analytics or Tracking</span>
          </div>
          <p className={isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'}>
            WorldPulse uses browser <code>localStorage</code> only to save your language, theme,
            bookmarks, and story caches. <strong>No analytics, ad cookies, or tracking scripts are used.</strong>{' '}
            <button
              type="button"
              onClick={onOpenCookiePolicy}
              className="text-[#A78BFA] underline font-semibold cursor-pointer"
            >
              Read Cookie Notice
            </button>
          </p>

          {customizing && (
            <div className="pt-2 flex flex-wrap items-center gap-4 font-mono-tabular">
              <label className="inline-flex items-center gap-2 opacity-80">
                <input type="checkbox" checked disabled className="w-4 h-4 accent-[#8B5CF6]" />
                <span>Necessary (Always On)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefChecked}
                  onChange={(e) => setPrefChecked(e.target.checked)}
                  className="w-4 h-4 accent-[#8B5CF6]"
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
                className="min-h-[44px] px-3 py-2 text-xs font-mono-tabular text-[#A78BFA] hover:underline cursor-pointer"
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

// ============================================================================
// 4. FIRST-VISIT 4-STEP ONBOARDING TOUR MODAL (Skippable & Replayable)
// ============================================================================
interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  isOpen,
  onClose,
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
    onClose();
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
            ? 'bg-[#0B0713] border-[#8B5CF6]/50 text-[#F6F4FF]'
            : 'bg-[#F8F6FF] border-[#7C3AED]/40 text-[#140E24]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] text-xs font-mono-tabular font-bold">
            Welcome Tour · Step {current.step}
          </span>
          <button
            type="button"
            onClick={handleFinish}
            className="min-h-[44px] px-3 text-xs font-mono-tabular text-[#9389B0] hover:text-white cursor-pointer"
          >
            Skip Tour
          </button>
        </div>

        <div className="space-y-2">
          <h3 id="onboarding-tour-title" className="text-xl font-bold">
            {current.title}
          </h3>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'}`}>
            {current.description}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === stepIndex ? 'w-6 bg-[#8B5CF6]' : 'w-2 bg-[#8B5CF6]/30'
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
