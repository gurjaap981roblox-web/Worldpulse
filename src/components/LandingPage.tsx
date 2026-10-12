import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Globe,
  Headphones,
  Languages,
  Layers,
  Lock,
  Mail,
  Menu,
  MessageSquare,
  Mic,
  Moon,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Volume2,
  X,
} from 'lucide-react';
import {
  AppLanguage,
  AppSettings,
  DailyBriefing,
  LegalPageId,
  Story,
  SupabaseTableState,
} from '../types';
import {
  formatRelativeTime,
  getCountryFlag,
  TOPIC_COLORS,
  UI_TRANSLATIONS,
} from '../utils/sanitize';
import { isReturningVisitor } from '../services/storage';

interface LandingPageProps {
  stories: Story[];
  supabaseStories: Story[];
  briefing: DailyBriefing | null;
  supabaseState: SupabaseTableState;
  isLoading: boolean;
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onOpenDashboard: (initialQuestion?: string, selectedStory?: Story) => void;
  onOpenLegalPage: (page: LegalPageId) => void;
}

const CITY_NODES = [
  { lat: 28.61, lng: 77.2, label: 'New Delhi' },
  { lat: 30.73, lng: 76.77, label: 'Chandigarh' },
  { lat: 51.5, lng: -0.12, label: 'London' },
  { lat: 40.71, lng: -74.0, label: 'New York' },
  { lat: 35.68, lng: 139.76, label: 'Tokyo' },
  { lat: 1.35, lng: 103.81, label: 'Singapore' },
  { lat: -33.86, lng: 151.2, label: 'Sydney' },
  { lat: 48.85, lng: 2.35, label: 'Paris' },
  { lat: 30.04, lng: 31.23, label: 'Cairo' },
  { lat: -23.55, lng: -46.63, label: 'São Paulo' },
  { lat: 50.45, lng: 30.52, label: 'Kyiv' },
  { lat: 25.2, lng: 55.27, label: 'Dubai' },
];

// Lightweight Canvas 3D-Style Glowing Rotating Globe with Pulsing City Dots
const GlowingOrbGlobe: React.FC<{ reduceMotion: boolean; isDark: boolean }> = ({
  reduceMotion,
  isDark,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let rotation = 0.6;
    const prefersReduce =
      reduceMotion ||
      (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    const drawFrame = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.39;

      ctx.clearRect(0, 0, w, h);

      // Outer purple atmospheric halo
      const outerGrad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.25);
      outerGrad.addColorStop(0, isDark ? 'rgba(139, 92, 246, 0.32)' : 'rgba(124, 58, 237, 0.22)');
      outerGrad.addColorStop(0.6, isDark ? 'rgba(91, 33, 182, 0.14)' : 'rgba(139, 92, 246, 0.08)');
      outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Core 3D Sphere body
      const sphereGrad = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.3,
        radius * 0.1,
        cx,
        cy,
        radius
      );
      if (isDark) {
        sphereGrad.addColorStop(0, '#2e1065');
        sphereGrad.addColorStop(0.55, '#0f0720');
        sphereGrad.addColorStop(1, '#050309');
      } else {
        sphereGrad.addColorStop(0, '#ede9fe');
        sphereGrad.addColorStop(0.65, '#ddd6fe');
        sphereGrad.addColorStop(1, '#c4b5fd');
      }

      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Glowing rim border
      ctx.strokeStyle = isDark ? 'rgba(167, 139, 250, 0.55)' : 'rgba(124, 58, 237, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Latitude rings
      ctx.strokeStyle = isDark ? 'rgba(167, 139, 250, 0.14)' : 'rgba(109, 40, 217, 0.16)';
      ctx.lineWidth = 1;
      for (const latDeg of [-60, -30, 0, 30, 60]) {
        const latRad = (latDeg * Math.PI) / 180;
        const yOffset = Math.sin(latRad) * radius;
        const ringRx = Math.cos(latRad) * radius;
        const ringRy = ringRx * 0.22;
        ctx.beginPath();
        ctx.ellipse(cx, cy - yOffset, ringRx, ringRy, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Longitude meridians
      for (let i = 0; i < 6; i++) {
        const angle = rotation + (i * Math.PI) / 6;
        const rx = Math.abs(Math.sin(angle)) * radius;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, radius, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Project & draw pulsing city dots on front hemisphere
      CITY_NODES.forEach((city, idx) => {
        const latRad = (city.lat * Math.PI) / 180;
        const lngRad = (city.lng * Math.PI) / 180 + rotation;

        const z = Math.cos(latRad) * Math.cos(lngRad);
        if (z > -0.1) {
          const x = cx + Math.cos(latRad) * Math.sin(lngRad) * radius;
          const y = cy - Math.sin(latRad) * radius;
          const alpha = Math.max(0.25, (z + 0.1) / 1.1);
          const pulse = prefersReduce ? 1 : 0.75 + 0.45 * Math.sin(time * 0.004 + idx);

          // Outer glow ring
          ctx.fillStyle = `rgba(167, 139, 250, ${0.28 * alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, 6 * pulse, 0, Math.PI * 2);
          ctx.fill();

          // Bright city core dot
          ctx.fillStyle = isDark
            ? `rgba(245, 243, 255, ${alpha})`
            : `rgba(109, 40, 217, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (!prefersReduce) {
        rotation += 0.0032;
        animId = window.requestAnimationFrame(drawFrame);
      }
    };

    drawFrame(0);
    return () => {
      if (animId) window.cancelAnimationFrame(animId);
    };
  }, [reduceMotion, isDark]);

  return (
    <div className="relative flex items-center justify-center select-none pointer-events-none">
      <canvas
        ref={canvasRef}
        width={420}
        height={420}
        aria-label="Interactive 3D glowing world globe visualization"
        className="w-[270px] h-[270px] sm:w-[360px] sm:h-[360px] md:w-[410px] md:h-[410px]"
      />
    </div>
  );
};

const TRUSTED_SOURCES_LIST = [
  'BBC',
  'Al Jazeera',
  'Guardian',
  'Reuters',
  'USGS',
  'NASA',
  'CoinGecko',
  'ECB',
  'World Bank',
  'GDELT',
];

const FAQ_ITEMS = [
  {
    q: 'Is WorldPulse completely free to use?',
    a: 'Yes. WorldPulse is 100% free for readers. All public feeds, browser audio briefings, country dossiers, and filter presets work without any subscription or credit card.',
  },
  {
    q: 'How often does the global data update?',
    a: 'Primary dispatches and snapshots are collected every 30 minutes (and you can trigger a live sync anytime from the top bar). High-priority earthquake and weather sensors update in near real time.',
  },
  {
    q: 'Is the AI summary always right?',
    a: 'No AI system is infallible. AI summaries and translations may occasionally miss nuance or context. That is why every single story card and briefing links directly to the original publisher or agency so you can verify the source.',
  },
  {
    q: 'Where does the data come from?',
    a: 'We read from our primary Supabase intelligence tables backed by BBC World, Al Jazeera, The Guardian, Reuters, USGS Earthquake Hazards, NASA EONET, GDELT, CoinGecko, the European Central Bank, World Bank, Open-Meteo, WHO, and Wikimedia.',
  },
  {
    q: 'Does it work on phones and 10-inch tablets?',
    a: 'Yes. Every button is at least 44px tall for touch accuracy, and WorldPulse can be installed as a Progressive Web App (PWA) on iOS, Android, iPad, and desktop with Low-Bandwidth Lite Mode support.',
  },
  {
    q: 'Do you store or sell my personal data?',
    a: 'Never. Your theme, language, bookmarks, and filter presets stay in your browser localStorage. We use zero advertising trackers or analytics scripts, and you can purge your local cache with one click.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  stories,
  supabaseStories,
  briefing,
  supabaseState,
  isLoading,
  settings,
  onUpdateSettings,
  onOpenDashboard,
  onOpenLegalPage,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroQuestion, setHeroQuestion] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const returningUser = useMemo(() => isReturningVisitor(), []);

  const isDark = settings.theme === 'dark';
  const labels = UI_TRANSLATIONS[settings.language] || UI_TRANSLATIONS.en;

  // Use Supabase stories when populated, otherwise gracefully fall back to monitored stories
  const activeStories = supabaseStories.length > 0 ? supabaseStories : stories;
  const top3Stories = activeStories.slice(0, 3);

  const stats = useMemo(() => {
    const totalStories = supabaseState.storiesCount || activeStories.length;
    const countriesCount = new Set(activeStories.map((s) => s.country)).size;
    const lastUpdatedStr = supabaseState.latestDataTimestamp
      ? formatRelativeTime(supabaseState.latestDataTimestamp)
      : activeStories[0]?.time
      ? formatRelativeTime(activeStories[0].time)
      : 'Just now';
    return {
      totalStories,
      countriesCount,
      lastUpdatedStr,
      sourcesMonitored: 14,
    };
  }, [supabaseState, activeStories]);

  const handleHeroAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenDashboard(heroQuestion.trim() || 'What are the most important global events today?');
  };

  const handleLanguageChange = (lang: AppLanguage) => {
    onUpdateSettings({ ...settings, language: lang });
  };

  return (
    <div
      className={`min-h-screen wp-grain-bg transition-colors duration-200 ${
        isDark ? 'bg-[#050309] text-[#F6F4FF]' : 'bg-[#F8F6FF] text-[#140E24]'
      }`}
    >
      {/* Skip to content link */}
      <a href="#landing-main" className="wp-skip-link">
        {labels.skipToContent}
      </a>

      {/* =====================================================================
          SECTION 1: FLOATING PILL NAVBAR WITH CURVED PURPLE GLOW ARC
         ===================================================================== */}
      <header className="sticky top-4 z-40 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto wp-pill-navbar px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 font-editorial text-lg sm:text-xl font-extrabold tracking-tight shrink-0"
          >
            <span className="w-3 h-3 rounded-full bg-[#8B5CF6] shadow-[0_0_14px_#8B5CF6]" />
            <span>WorldPulse</span>
          </a>

          {/* Desktop Section Links */}
          <nav
            aria-label="Landing page navigation"
            className="hidden md:flex items-center gap-6 text-xs font-mono-tabular"
          >
            <a href="#how-it-works" className="hover:text-[#A78BFA] transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-[#A78BFA] transition-colors">
              Features
            </a>
            <a href="#languages" className="hover:text-[#A78BFA] transition-colors">
              Languages
            </a>
            <a href="#faq" className="hover:text-[#A78BFA] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Controls: Language Switch, Theme Toggle, Open Dashboard Pill */}
          <div className="hidden sm:flex items-center gap-2">
            <div
              role="group"
              aria-label="Switch interface language"
              className={`flex items-center rounded-full border p-0.5 text-xs font-mono-tabular ${
                isDark ? 'border-[#8B5CF6]/35 bg-[#050309]' : 'border-[#7C3AED]/30 bg-white'
              }`}
            >
              {(
                [
                  { code: 'en', label: 'EN' },
                  { code: 'hi', label: 'हिन्दी' },
                  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
                ] as const
              ).map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleLanguageChange(l.code)}
                  className={`min-h-[38px] px-2.5 rounded-full font-semibold transition-colors cursor-pointer ${
                    settings.language === l.code
                      ? 'bg-[#8B5CF6] text-white'
                      : isDark
                      ? 'text-[#C4BDD9] hover:text-white'
                      : 'text-[#3F3559] hover:text-black'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  theme: settings.theme === 'dark' ? 'light' : 'dark',
                })
              }
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className={`min-h-[44px] min-w-[44px] rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#8B5CF6]/35 bg-[#050309] text-[#C4BDD9] hover:text-white'
                  : 'border-[#7C3AED]/30 bg-white text-[#3F3559] hover:text-black'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => onOpenDashboard()}
              className="wp-btn-primary px-5 py-2 text-xs font-mono-tabular inline-flex items-center gap-2 cursor-pointer"
            >
              <span>{returningUser ? 'Welcome back · Open dashboard' : 'Open dashboard'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDashboard()}
              className="wp-btn-primary px-3.5 py-2 text-xs font-mono-tabular cursor-pointer"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="min-h-[44px] min-w-[44px] rounded-full border border-[#8B5CF6]/40 flex items-center justify-center cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Phone Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden mt-2 max-w-6xl mx-auto wp-glass-card p-4 space-y-3">
            <div className="flex flex-col gap-2 text-sm font-mono-tabular">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-3 rounded-xl hover:bg-[#8B5CF6]/15"
              >
                How it works
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-3 rounded-xl hover:bg-[#8B5CF6]/15"
              >
                Features
              </a>
              <a
                href="#languages"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-3 rounded-xl hover:bg-[#8B5CF6]/15"
              >
                Languages
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-3 rounded-xl hover:bg-[#8B5CF6]/15"
              >
                FAQ
              </a>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#8B5CF6]/20">
              <div className="flex gap-1">
                {(['en', 'hi', 'pa'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleLanguageChange(code)}
                    className={`min-h-[44px] px-3 rounded-full text-xs font-mono-tabular ${
                      settings.language === code
                        ? 'bg-[#8B5CF6] text-white'
                        : 'border border-[#8B5CF6]/30'
                    }`}
                  >
                    {code === 'en' ? 'English' : code === 'hi' ? 'हिन्दी' : 'ਪੰਜਾਬੀ'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    theme: settings.theme === 'dark' ? 'light' : 'dark',
                  })
                }
                aria-label="Toggle theme"
                className="min-h-[44px] min-w-[44px] rounded-full border border-[#8B5CF6]/35 flex items-center justify-center"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </header>

      <main id="landing-main" className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20 space-y-24">
        {/* =====================================================================
            SECTION 2: HERO WITH GLOWING 3D ORB/GLOBE & ASK THE WORLD INPUT
           ===================================================================== */}
        <section className="relative text-center pt-4 sm:pt-8">
          {/* Background Ambient Purple Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-[340px] sm:w-[620px] h-[340px] rounded-full bg-[#8B5CF6]/20 blur-[110px]"
          />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            {/* Small Live Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#8B5CF6]/45 bg-[#8B5CF6]/15 text-xs font-mono-tabular text-[#A78BFA] shadow-[0_0_24px_rgba(139,92,246,0.25)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{labels.liveBadge}</span>
            </div>

            {/* Returning Visitor Prominent Banner */}
            {returningUser && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => onOpenDashboard()}
                  className="min-h-[44px] px-4 py-1.5 rounded-full bg-[#8B5CF6]/20 border border-[#A78BFA]/50 text-xs font-mono-tabular text-[#F6F4FF] inline-flex items-center gap-2 hover:bg-[#8B5CF6]/30 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
                  <span>Returning visitor detected — Jump straight to your live dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Big Centred Headline */}
            <h1 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08] text-balance">
              {labels.heroHeadline}
            </h1>

            {/* Short Subheading about the last 24 hours */}
            <p
              className={`text-base sm:text-lg max-w-2xl mx-auto leading-relaxed ${
                isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'
              }`}
            >
              {labels.heroSubhead}
            </p>

            {/* Primary & Secondary Action Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onOpenDashboard()}
                className="wp-btn-primary px-7 py-3 text-sm font-mono-tabular inline-flex items-center gap-2 cursor-pointer"
              >
                <span>{labels.openDashboard}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#how-it-works"
                className="wp-btn-secondary px-6 py-3 text-sm font-mono-tabular inline-flex items-center gap-2"
              >
                <span>{labels.seeHowItWorks}</span>
              </a>
            </div>

            {/* Rounded "Ask the world anything…" Input */}
            <form
              onSubmit={handleHeroAskSubmit}
              className="max-w-xl mx-auto pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <div className="relative flex-1">
                <MessageSquare className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#A78BFA]" />
                <input
                  type="text"
                  value={heroQuestion}
                  onChange={(e) => setHeroQuestion(e.target.value)}
                  placeholder={labels.askWorldPlaceholder}
                  aria-label="Ask the world anything"
                  className={`w-full min-h-[48px] pl-11 pr-4 py-2.5 rounded-full border text-sm font-mono-tabular focus:outline-none ${
                    isDark
                      ? 'bg-[#0B0713]/90 border-[#8B5CF6]/45 text-white placeholder:text-[#9389B0]'
                      : 'bg-white border-[#7C3AED]/35 text-black placeholder:text-[#625680]'
                  }`}
                />
              </div>
              <button
                type="submit"
                className="wp-btn-primary px-6 py-2.5 text-xs font-mono-tabular uppercase tracking-wider shrink-0 cursor-pointer"
              >
                Ask WorldPulse →
              </button>
            </form>
          </div>

          {/* Glowing 3D-Style Rotating Globe Centrepiece Below Text */}
          <div className="mt-6 flex justify-center">
            <GlowingOrbGlobe
              reduceMotion={Boolean(settings.reduceMotion)}
              isDark={isDark}
            />
          </div>
        </section>

        {/* =====================================================================
            SECTION 3: PRODUCT PREVIEW (Framed Live Preview with Float & Glow)
           ===================================================================== */}
        <section aria-label="Live dashboard preview" className="relative">
          <div className="text-center mb-6 space-y-1">
            <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#A78BFA] font-semibold">
              LIVE SITUATION DESK PREVIEW
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              A calm command centre for the entire planet
            </h2>
          </div>

          <div className="wp-glass-card wp-float-preview p-4 sm:p-6 border border-[#8B5CF6]/45 shadow-[0_0_55px_-10px_rgba(139,92,246,0.4)]">
            {/* Mock Browser Frame Top Bar */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#8B5CF6]/20 text-xs font-mono-tabular">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-[#A78BFA] font-semibold">
                  worldpulse.app/app · Live Telemetry
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenDashboard()}
                className="min-h-[44px] px-3 py-1 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] hover:bg-[#8B5CF6]/30 cursor-pointer"
              >
                Enter Interactive View →
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Left Preview: Executive Briefing + Mini Map Status */}
              <div
                className={`lg:col-span-7 p-4 rounded-2xl border flex flex-col justify-between space-y-4 ${
                  isDark ? 'bg-[#050309]/80 border-[#8B5CF6]/25' : 'bg-white border-[#7C3AED]/20'
                }`}
              >
                <div className="space-y-2">
                  <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#A78BFA] font-semibold">
                    Executive Daily Briefing · Live Synthesis
                  </div>
                  <h3 className="text-base sm:text-lg font-bold leading-snug">
                    {briefing?.headline ||
                      top3Stories[0]?.headline ||
                      'Monitoring live global dispatches, seismic activity, and sovereign market shifts'}
                  </h3>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'}`}>
                    {briefing?.highlights?.[0] ||
                      top3Stories[0]?.summary ||
                      'Real-time dispatches verified across international news wires and public sensors.'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#8B5CF6]/15 text-xs font-mono-tabular">
                  <div className="p-2.5 rounded-xl bg-[#8B5CF6]/10">
                    <div className="text-[10px] text-[#A78BFA]">STORIES</div>
                    <div className="text-base font-bold">{stats.totalStories}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#8B5CF6]/10">
                    <div className="text-[10px] text-[#A78BFA]">COUNTRIES</div>
                    <div className="text-base font-bold">{stats.countriesCount}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#8B5CF6]/10">
                    <div className="text-[10px] text-[#A78BFA]">UPDATED</div>
                    <div className="text-xs font-bold truncate">{stats.lastUpdatedStr}</div>
                  </div>
                </div>
              </div>

              {/* Right Preview: Live Priority Dispatches */}
              <div
                className={`lg:col-span-5 p-4 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-[#050309]/80 border-[#8B5CF6]/25' : 'bg-white border-[#7C3AED]/20'
                }`}
              >
                <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#A78BFA] font-semibold">
                  Top Priority Dispatches
                </div>
                {top3Stories.length === 0 ? (
                  <p className="text-xs font-mono-tabular py-6 text-[#9389B0]">
                    {labels.collectingData}
                  </p>
                ) : (
                  top3Stories.map((st, i) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onOpenDashboard(undefined, st)}
                      className="w-full text-left p-2.5 rounded-xl border border-[#8B5CF6]/20 hover:border-[#A78BFA] transition-colors block cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono-tabular text-[#A78BFA]">
                        <span>
                          0{i + 1} · {getCountryFlag(st.country)} {st.countryName} · {st.topic}
                        </span>
                        <span>{st.importance.toFixed(1)}/10</span>
                      </div>
                      <div className="text-xs font-semibold line-clamp-1 mt-0.5">
                        {st.headline}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 4: LIVE STATS STRIP (Real Numbers from Supabase)
           ===================================================================== */}
        <section aria-label="Live global statistics">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Stories Collected (24h)',
                value: isLoading && stats.totalStories === 0 ? '—' : stats.totalStories.toLocaleString(),
                sub: 'Deduplicated & ranked 1–10',
              },
              {
                label: 'Countries Covered',
                value: isLoading && stats.countriesCount === 0 ? '—' : stats.countriesCount.toLocaleString(),
                sub: 'Sovereign dossiers active',
              },
              {
                label: 'Last Updated Time',
                value: stats.lastUpdatedStr,
                sub: '30-minute automated sync',
              },
              {
                label: 'Sources Monitored',
                value: `${stats.sourcesMonitored}+`,
                sub: 'Wires, sensors & central banks',
              },
            ].map((item) => (
              <div key={item.label} className="wp-glass-card p-5 text-center space-y-1">
                <div className="text-xs font-mono-tabular uppercase tracking-wider text-[#A78BFA]">
                  {item.label}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono-tabular">
                  {item.value}
                </div>
                <div className="text-[11px] text-[#9389B0]">{item.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================================
            SECTION 5: "POWERED BY TRUSTED DATA" STRIP
           ===================================================================== */}
        <section aria-label="Powered by trusted data sources" className="text-center space-y-4">
          <div className="text-xs font-mono-tabular uppercase tracking-widest text-[#A78BFA] font-semibold">
            POWERED BY PUBLIC WIRES &amp; SCIENTIFIC SENSORS
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {TRUSTED_SOURCES_LIST.map((srcName) => (
              <span
                key={srcName}
                className={`px-4 py-2 rounded-full border text-xs font-mono-tabular font-bold tracking-wider uppercase ${
                  isDark
                    ? 'bg-[#0B0713] border-[#8B5CF6]/30 text-[#C4BDD9]'
                    : 'bg-white border-[#7C3AED]/25 text-[#3F3559]'
                }`}
              >
                {srcName}
              </span>
            ))}
          </div>
          <div>
            <button
              type="button"
              onClick={() => onOpenLegalPage('methodology')}
              className="min-h-[44px] px-4 py-2 text-xs font-mono-tabular text-[#A78BFA] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Inspect full Sources &amp; Methodology</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* =====================================================================
            SECTION 6: LIVE TOP 3 STORIES FROM SUPABASE
           ===================================================================== */}
        <section aria-label="Live top stories" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#A78BFA] font-semibold">
                LIVE TELEMETRY DISPATCHES
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                Top 3 stories happening right now
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenDashboard()}
              className="wp-btn-secondary px-4 py-2 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>View all stories in /app</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {top3Stories.length === 0 ? (
            <div className="wp-glass-card p-8 text-center text-sm font-mono-tabular text-[#9389B0]">
              {labels.collectingData}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {top3Stories.map((story) => (
                <article
                  key={story.id}
                  className="wp-glass-card wp-glass-card-lift p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular">
                      <span className="font-semibold text-[#A78BFA]">
                        {getCountryFlag(story.country)} {story.countryName}
                      </span>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                        style={{
                          borderColor: `${TOPIC_COLORS[story.topic]?.hex || '#8B5CF6'}66`,
                          color: TOPIC_COLORS[story.topic]?.hex || '#A78BFA',
                        }}
                      >
                        {story.topic}
                      </span>
                    </div>

                    <h3 className="text-base font-bold leading-snug">{story.headline}</h3>
                    <p
                      className={`text-xs leading-relaxed line-clamp-3 ${
                        isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'
                      }`}
                    >
                      {story.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#8B5CF6]/20 flex items-center justify-between text-xs font-mono-tabular">
                    <span>
                      Importance <strong>{story.importance.toFixed(1)}/10</strong> ·{' '}
                      {story.sources.length} {story.sources.length === 1 ? 'source' : 'sources'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenDashboard(undefined, story)}
                      className="min-h-[44px] px-3 text-[#A78BFA] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* =====================================================================
            SECTION 7: HOW IT WORKS IN 3 STEPS
           ===================================================================== */}
        <section id="how-it-works" className="space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#A78BFA] font-semibold">
              ARCHITECTURE &amp; PIPELINE
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              How WorldPulse works in 3 steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                step: '01 · COLLECT',
                title: 'Gather global feeds every 30 minutes',
                desc: 'We read verified stories from Supabase alongside international news wires, USGS seismic sensors, NASA EONET satellite events, and sovereign FX/crypto markets.',
              },
              {
                step: '02 · UNDERSTAND',
                title: 'AI tags, ranks 1–10 & verifies sources',
                desc: 'Duplicate headlines are clustered, source diversity is measured across outlets, and AI scores importance from 1 to 10 while flagging developing vs. confirmed stories.',
              },
              {
                step: '03 · SHOW',
                title: 'Explore map, briefing & 24h changes',
                desc: 'Inspect the interactive world map, read or listen to the Daily Briefing in English, Hindi, or Punjabi, and see what escalated or faded in the last 24 hours.',
              },
            ].map((item) => (
              <div key={item.step} className="wp-glass-card p-6 space-y-2.5">
                <div className="text-xs font-mono-tabular font-bold text-[#A78BFA]">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'}`}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================================
            SECTION 8: FEATURE GRID (8 CARDS + 2 HIGHLIGHTED WIDE CARDS)
           ===================================================================== */}
        <section id="features" className="space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#A78BFA] font-semibold">
              BUILT FOR CLARITY
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Everything you need to track the world
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Live Interactive Map',
                desc: 'Dark, satellite, and heatmap views with pulsing severity markers and regional zoom.',
              },
              {
                title: 'Top 10 Global Dispatches',
                desc: 'Ranked 1–10 by impact with source-type badges and a 5-dot source diversity meter.',
              },
              {
                title: 'Daily AI Briefing',
                desc: '5 executive highlights and a 200-word synthesis exportable to Markdown, CSV, TXT, or PDF.',
              },
              {
                title: 'What Changed in 24h',
                desc: 'Tracks newly emerging stories, escalating crises, fading topics, and unusual country spikes.',
              },
              {
                title: 'Markets, FX & Macro',
                desc: 'Sovereign exchange rates (USD/INR, EUR, JPY), World Bank GDP/CPI, gold, oil, and crypto.',
              },
              {
                title: 'Country Dossiers',
                desc: 'Tap any nation for a 7-day volume chart, AI country brief, and side-by-side comparisons.',
              },
              {
                title: 'Ask the World Q&A',
                desc: 'Strict source-grounded answers with clickable citations — never invents facts.',
              },
              {
                title: 'Diplomatic Speech Archive',
                desc: 'Summarize major public addresses, central bank remarks, and UN summits by date & place.',
              },
            ].map((feat) => (
              <div key={feat.title} className="wp-glass-card wp-glass-card-lift p-5 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#A78BFA]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold">{feat.title}</h3>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'}`}>
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Two Highlighted Wide Cards: Hindi/Punjabi & Listen to the Briefing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="wp-glass-card p-6 border border-[#A78BFA]/45 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] text-xs font-mono-tabular font-semibold">
                <Languages className="w-3.5 h-3.5" />
                <span>Multilingual Intelligence · English · हिन्दी · ਪੰਜਾਬੀ</span>
              </div>
              <h3 className="text-xl font-bold">
                Native support for English, Hindi, and Punjabi
              </h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'}`}>
                Switch the entire dashboard interface or translate any global dispatch on demand into
                Hindi (हिन्दी) or Punjabi (ਪੰਜਾਬੀ), complete with a dedicated India &amp; Punjab
                quick filter.
              </p>
            </div>

            <div className="wp-glass-card p-6 border border-[#A78BFA]/45 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] text-xs font-mono-tabular font-semibold">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hands-Free Audio Briefing</span>
              </div>
              <h3 className="text-xl font-bold">
                Listen to the Daily Briefing &amp; Top 10 stories
              </h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'}`}>
                Use built-in browser text-to-speech with play, pause, stop, 0.75x–1.5x speed
                control, and automatic voice selection for English (en-IN), Hindi (hi-IN), and
                Punjabi (pa-IN).
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 9: LANGUAGES SECTION (Sample Headline in Each Script)
           ===================================================================== */}
        <section id="languages" className="space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#A78BFA] font-semibold">
              THREE SCRIPTS · ONE GLOBAL FEED
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Read the world in English, हिन्दी, or ਪੰਜਾਬੀ
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                code: 'en' as AppLanguage,
                name: 'English',
                scriptTag: 'Latin Script',
                sample:
                  'Global central banks and energy markets react as seismic sensors and diplomatic wires report new developments across 40+ nations.',
              },
              {
                code: 'hi' as AppLanguage,
                name: 'हिन्दी (Hindi)',
                scriptTag: 'देवनागरी लिपि',
                sample:
                  'वैश्विक केंद्रीय बैंक और ऊर्जा बाज़ारों में हलचल; 40 से अधिक देशों से प्रमुख राजनयिक और भूकंपीय अपडेट दर्ज किए गए।',
              },
              {
                code: 'pa' as AppLanguage,
                name: 'ਪੰਜਾਬੀ (Punjabi)',
                scriptTag: 'ਗੁਰਮੁਖੀ ਲਿਪੀ',
                sample:
                  'ਗਲੋਬਲ ਕੇਂਦਰੀ ਬੈਂਕਾਂ ਅਤੇ ਊਰਜਾ ਬਾਜ਼ਾਰਾਂ ਵਿੱਚ ਹਲਚਲ; 40 ਤੋਂ ਵੱਧ ਦੇਸ਼ਾਂ ਤੋਂ ਪ੍ਰਮੁੱਖ ਕੂਟਨੀਤਕ ਅਤੇ ਭੂਚਾਲ ਸਬੰਧੀ ਖਬਰਾਂ ਦਰਜ।',
              },
            ].map((item) => (
              <div key={item.code} className="wp-glass-card p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono-tabular">
                    <span className="font-bold text-[#A78BFA]">{item.name}</span>
                    <span className="text-[#9389B0]">{item.scriptTag}</span>
                  </div>
                  <p className="text-sm leading-relaxed font-medium">&ldquo;{item.sample}&rdquo;</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleLanguageChange(item.code);
                    onOpenDashboard();
                  }}
                  className="wp-btn-secondary w-full py-2 text-xs font-mono-tabular cursor-pointer"
                >
                  Open Dashboard in {item.name}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================================
            SECTION 10: TRUST SECTION (Verification & AI Transparency)
           ===================================================================== */}
        <section className="wp-glass-card p-6 sm:p-8 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#A78BFA] font-semibold">
                VERIFICATION &amp; TRANSPARENCY
              </span>
              <h2 className="text-2xl font-bold">
                AI-generated summaries — always check the original sources
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenLegalPage('methodology')}
                className="wp-btn-secondary px-4 py-2 text-xs font-mono-tabular cursor-pointer"
              >
                Methodology
              </button>
              <button
                type="button"
                onClick={() => onOpenLegalPage('privacy')}
                className="wp-btn-secondary px-4 py-2 text-xs font-mono-tabular cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => onOpenLegalPage('ai-disclaimer')}
                className="wp-btn-secondary px-4 py-2 text-xs font-mono-tabular cursor-pointer"
              >
                AI Disclaimer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
            <div className="p-4 rounded-xl border border-[#8B5CF6]/25 space-y-1">
              <div className="font-mono-tabular font-bold text-[#A78BFA]">
                Direct Source Attribution
              </div>
              <p className={isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'}>
                Every story card displays source-type badges (Wire, Broadcaster, Newspaper,
                Government/Sensor) and links directly to the original report.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[#8B5CF6]/25 space-y-1">
              <div className="font-mono-tabular font-bold text-[#A78BFA]">
                Confidence &amp; Contradiction Checks
              </div>
              <p className={isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'}>
                We show a 5-dot source diversity meter, a confidence score, and a &ldquo;Sources
                differ&rdquo; tag when outlets report varying figures.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[#8B5CF6]/25 space-y-1">
              <div className="font-mono-tabular font-bold text-[#A78BFA]">
                One-Click Issue Reporting
              </div>
              <p className={isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'}>
                Spot an inaccurate summary? Every AI briefing and story card includes a prefilled
                &ldquo;Report wrong answer / issue&rdquo; button.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 11: FAQ ACCORDION (6+ Questions, Keyboard Accessible)
           ===================================================================== */}
        <section id="faq" className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#A78BFA] font-semibold">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Common questions about WorldPulse
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={item.q} className="wp-glass-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full min-h-[52px] px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#A78BFA] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#A78BFA] shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div
                      className={`px-5 pb-4 text-xs sm:text-sm leading-relaxed border-t border-[#8B5CF6]/15 pt-3 ${
                        isDark ? 'text-[#C4BDD9]' : 'text-[#3F3559]'
                      }`}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* =====================================================================
            SECTION 12: FINAL CALL-TO-ACTION BANNER WITH GLOWING PURPLE GRADIENT
           ===================================================================== */}
        <section className="rounded-3xl p-8 sm:p-12 text-center border border-[#A78BFA]/45 bg-gradient-to-br from-[#2E1065]/80 via-[#1E1B4B]/70 to-[#0B0713] shadow-[0_0_60px_-10px_rgba(139,92,246,0.5)] space-y-5">
          <span className="text-xs font-mono-tabular uppercase tracking-widest text-[#A78BFA] font-semibold">
            READY WHEN YOU ARE
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Explore the live world dashboard now
          </h2>
          <p className="text-sm sm:text-base text-[#DDD6FE] max-w-xl mx-auto">
            No sign-up required. Instant access to the global map, Top 10 dispatches, audio
            briefing, and sovereign market telemetry.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onOpenDashboard()}
              className="wp-btn-primary px-8 py-3.5 text-sm font-mono-tabular inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Open dashboard (/app)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      {/* =====================================================================
          SECTION 13: MULTI-COLUMN FOOTER (Product, Legal, Company + Language)
         ===================================================================== */}
      <footer
        className={`border-t py-12 px-4 sm:px-6 text-xs ${
          isDark
            ? 'border-[#8B5CF6]/25 bg-[#050309] text-[#9389B0]'
            : 'border-[#7C3AED]/20 bg-[#F0EBFF] text-[#625680]'
        }`}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Brand & Language Switch */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-editorial text-lg font-bold text-[#F6F4FF]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
              <span className={isDark ? 'text-white' : 'text-[#140E24]'}>WorldPulse</span>
            </div>
            <p className="leading-relaxed">
              Live global situation monitor aggregating verified public news wires, seismic sensors,
              and sovereign markets with transparent AI synthesis.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(['en', 'hi', 'pa'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleLanguageChange(code)}
                  className={`min-h-[44px] px-3 py-1.5 rounded-full font-mono-tabular border cursor-pointer ${
                    settings.language === code
                      ? 'bg-[#8B5CF6] border-[#A78BFA] text-white font-semibold'
                      : 'border-[#8B5CF6]/30 hover:border-[#A78BFA]'
                  }`}
                >
                  {code === 'en' ? 'English' : code === 'hi' ? 'हिन्दी' : 'ਪੰਜਾਬੀ'}
                </button>
              ))}
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-2">
            <div className="font-mono-tabular uppercase tracking-wider font-bold text-[#A78BFA]">
              Product
            </div>
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenDashboard()}
                  className="min-h-[44px] flex items-center hover:text-[#A78BFA] cursor-pointer"
                >
                  Live Dashboard (/app)
                </button>
              </li>
              <li>
                <a href="#how-it-works" className="min-h-[44px] flex items-center hover:text-[#A78BFA]">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#features" className="min-h-[44px] flex items-center hover:text-[#A78BFA]">
                  Features &amp; Audio Briefing
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegalPage('methodology')}
                  className="min-h-[44px] flex items-center hover:text-[#A78BFA] cursor-pointer"
                >
                  {labels.sourcesMethodology}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Trust */}
          <div className="space-y-2">
            <div className="font-mono-tabular uppercase tracking-wider font-bold text-[#A78BFA]">
              Legal &amp; Trust
            </div>
            <ul className="space-y-1">
              <li>
                <a
                  href="#privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenLegalPage('privacy');
                  }}
                  className="min-h-[44px] flex items-center hover:text-[#A78BFA]"
                >
                  {labels.privacyPolicy}
                </a>
              </li>
              <li>
                <a
                  href="#terms"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenLegalPage('terms');
                  }}
                  className="min-h-[44px] flex items-center hover:text-[#A78BFA]"
                >
                  {labels.termsOfUse}
                </a>
              </li>
              <li>
                <a
                  href="#ai-disclaimer"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenLegalPage('ai-disclaimer');
                  }}
                  className="min-h-[44px] flex items-center hover:text-[#A78BFA]"
                >
                  {labels.aiDisclaimer}
                </a>
              </li>
              <li>
                <a
                  href="#cookies"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenLegalPage('cookies');
                  }}
                  className="min-h-[44px] flex items-center hover:text-[#A78BFA]"
                >
                  {labels.cookieNotice}
                </a>
              </li>
              <li>
                <a
                  href="#accessibility"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenLegalPage('accessibility');
                  }}
                  className="min-h-[44px] flex items-center hover:text-[#A78BFA]"
                >
                  {labels.accessibilityStatement}
                </a>
              </li>
              <li>
                <a
                  href="#responsible-ai"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenLegalPage('responsible-ai');
                  }}
                  className="min-h-[44px] flex items-center hover:text-[#A78BFA]"
                >
                  {labels.responsibleAi}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Company & Feedback */}
          <div className="space-y-2">
            <div className="font-mono-tabular uppercase tracking-wider font-bold text-[#A78BFA]">
              Company
            </div>
            <ul className="space-y-1">
              <li>
                <a
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenLegalPage('about');
                  }}
                  className="min-h-[44px] flex items-center hover:text-[#A78BFA]"
                >
                  {labels.about}
                </a>
              </li>
              <li>
                <a
                  href="#changelog"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenLegalPage('changelog');
                  }}
                  className="min-h-[44px] flex items-center hover:text-[#A78BFA]"
                >
                  {labels.changelog}
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenLegalPage('contact');
                  }}
                  className="min-h-[44px] flex items-center hover:text-[#A78BFA]"
                >
                  {labels.contactGrievance}
                </a>
              </li>
              <li>
                <a
                  href="mailto:[EMAIL]?subject=WorldPulse%20User%20Feedback"
                  className="min-h-[44px] flex items-center gap-1.5 text-[#A78BFA] hover:underline font-semibold"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{labels.sendFeedback}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};
