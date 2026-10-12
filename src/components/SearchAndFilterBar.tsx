import React, { useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Calendar,
  Check,
  Copy,
  Filter,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  AppSettings,
  DateRangeFilter,
  SavedFilterPreset,
  Story,
  StoryStatusFilter,
  Topic,
} from '../types';
import {
  ALL_TOPICS,
  COUNTRY_GAZETTEER,
  getCountryFlag,
  getDidYouMeanSuggestion,
  UI_TRANSLATIONS,
} from '../utils/sanitize';
import { loadFilterPresets, saveFilterPresets } from '../services/storage';

// Boolean (AND / OR) + "exact phrase" + keyword search matcher across headline, summary, country, topic
export function matchesBooleanSearchQuery(story: Story, rawQuery: string): boolean {
  const q = rawQuery.trim();
  if (!q) return true;

  const haystack = `${story.headline} ${story.summary} ${story.countryName} ${story.country} ${story.topic} ${story.sources
    .map((s) => s.name)
    .join(' ')}`.toLowerCase();

  // Support OR groups first (case-insensitive " OR ")
  const orGroups = q.split(/\s+OR\s+/i);

  return orGroups.some((orPart) => {
    // Inside each OR group, support AND tokens and "exact phrases"
    const cleanAndPart = orPart.replace(/\s+AND\s+/gi, ' ');
    const exactPhrases: string[] = [];
    const withoutQuotes = cleanAndPart.replace(/"([^"]+)"/g, (_, phrase) => {
      if (phrase && phrase.trim()) {
        exactPhrases.push(phrase.trim().toLowerCase());
      }
      return ' ';
    });

    const terms = withoutQuotes
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const phrasesMatch = exactPhrases.every((ph) => haystack.includes(ph));
    const termsMatch = terms.every((term) => haystack.includes(term));

    return phrasesMatch && termsMatch;
  });
}

interface SearchAndFilterBarProps {
  stories: Story[];
  filteredCount: number;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  dateRange: DateRangeFilter;
  onChangeDateRange: (r: DateRangeFilter) => void;
  customStartDate: string;
  onChangeCustomStartDate: (d: string) => void;
  customEndDate: string;
  onChangeCustomEndDate: (d: string) => void;
  selectedCountry: string | null;
  onChangeCountry: (c: string | null) => void;
  selectedTopic: 'All' | Topic;
  onChangeTopic: (t: 'All' | Topic) => void;
  selectedSource: string;
  onChangeSource: (src: string) => void;
  statusFilter: StoryStatusFilter;
  onChangeStatusFilter: (st: StoryStatusFilter) => void;
  minImportance: number;
  onChangeMinImportance: (imp: number) => void;
  onClearAllFilters: () => void;
  onCopyShareLink: () => void;
  copiedShareLink: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  settings: AppSettings;
}

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  stories,
  filteredCount,
  searchQuery,
  onChangeSearchQuery,
  dateRange,
  onChangeDateRange,
  customStartDate,
  onChangeCustomStartDate,
  customEndDate,
  onChangeCustomEndDate,
  selectedCountry,
  onChangeCountry,
  selectedTopic,
  onChangeTopic,
  selectedSource,
  onChangeSource,
  statusFilter,
  onChangeStatusFilter,
  minImportance,
  onChangeMinImportance,
  onClearAllFilters,
  onCopyShareLink,
  copiedShareLink,
  searchInputRef,
  settings,
}) => {
  const [presets, setPresets] = useState<SavedFilterPreset[]>(() => loadFilterPresets());
  const [presetName, setPresetName] = useState('');
  const [showPresetForm, setShowPresetForm] = useState(false);

  const isDark = settings.theme === 'dark';
  const labels = UI_TRANSLATIONS[settings.language] || UI_TRANSLATIONS.en;

  // Unique available sources from current stories
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    for (const s of stories) {
      for (const src of s.sources) {
        if (src.name) set.add(src.name);
      }
    }
    return ['All', ...Array.from(set).sort()];
  }, [stories]);

  // Unique countries present in stories + Gazetteer top countries
  const countryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stories) {
      map.set(s.country, s.countryName);
    }
    for (const meta of Object.values(COUNTRY_GAZETTEER)) {
      if (!map.has(meta.code)) {
        map.set(meta.code, meta.name);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [stories]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    dateRange !== '24h' ||
    Boolean(selectedCountry) ||
    selectedTopic !== 'All' ||
    selectedSource !== 'All' ||
    statusFilter !== 'all' ||
    minImportance > 1;

  const didYouMean = useMemo(() => {
    if (filteredCount > 0 || !searchQuery.trim()) return null;
    return getDidYouMeanSuggestion(searchQuery);
  }, [filteredCount, searchQuery]);

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = presetName.trim() || `Preset ${presets.length + 1}`;
    const newPreset: SavedFilterPreset = {
      id: `preset-${Date.now()}`,
      name: cleanName.slice(0, 32),
      query: searchQuery,
      dateRange,
      customStartDate,
      customEndDate,
      country: selectedCountry || 'ALL',
      topic: selectedTopic,
      source: selectedSource,
      status: statusFilter,
      minImportance,
      createdAt: Date.now(),
    };
    const next = [newPreset, ...presets].slice(0, 15);
    setPresets(next);
    saveFilterPresets(next);
    setPresetName('');
    setShowPresetForm(false);
  };

  const handleRestorePreset = (p: SavedFilterPreset) => {
    onChangeSearchQuery(p.query);
    onChangeDateRange(p.dateRange);
    if (p.customStartDate) onChangeCustomStartDate(p.customStartDate);
    if (p.customEndDate) onChangeCustomEndDate(p.customEndDate);
    onChangeCountry(p.country === 'ALL' ? null : p.country);
    onChangeTopic(p.topic);
    onChangeSource(p.source || 'All');
    onChangeStatusFilter(p.status || 'all');
    onChangeMinImportance(p.minImportance || 1);
  };

  const handleDeletePreset = (id: string) => {
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    saveFilterPresets(next);
  };

  return (
    <section
      aria-label="Search and filter stories"
      className="wp-glass-card p-4 sm:p-5 space-y-3.5 no-print"
    >
      {/* Top Row: Search Box with Boolean / Phrase Hint + Preset & Share Actions */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A78BFA] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder='Search headline, summary, country, topic (supports "exact phrase", AND, OR)...'
            aria-label="Search stories by keyword, exact phrase, AND or OR"
            className={`w-full min-h-[44px] pl-10 pr-10 py-2 rounded-full border text-xs sm:text-sm font-mono-tabular transition-colors focus:outline-none ${
              isDark
                ? 'bg-[#050309]/90 border-[#8B5CF6]/35 text-[#F6F4FF] placeholder:text-[#9389B0]'
                : 'bg-white border-[#7C3AED]/30 text-[#140E24] placeholder:text-[#625680]'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearchQuery('')}
              aria-label="Clear search query"
              className="min-h-[44px] min-w-[44px] absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#9389B0] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPresetForm((prev) => !prev)}
            className="wp-btn-secondary px-3.5 py-2 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>{labels.savePreset}</span>
          </button>

          <button
            type="button"
            onClick={onCopyShareLink}
            className="wp-btn-secondary px-3.5 py-2 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            title="Copy shareable link with current search and filters"
          >
            {copiedShareLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#A78BFA]" />
            )}
            <span>{copiedShareLink ? 'Copied Filter Link' : 'Share Filter Link'}</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="min-h-[44px] px-3.5 py-2 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono-tabular font-semibold inline-flex items-center gap-1.5 hover:bg-rose-500/25 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{labels.clearAll}</span>
            </button>
          )}
        </div>
      </div>

      {/* Save Filter Preset Inline Form */}
      {showPresetForm && (
        <form
          onSubmit={handleSavePreset}
          className={`p-3 rounded-xl border flex flex-wrap items-center gap-2 ${
            isDark ? 'border-[#8B5CF6]/30 bg-[#050309]' : 'border-[#7C3AED]/25 bg-white'
          }`}
        >
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name (e.g., India 7+ Cyber)..."
            aria-label="Filter preset name"
            className={`min-h-[44px] flex-1 px-3 rounded-lg border text-xs font-mono-tabular ${
              isDark
                ? 'bg-[#0B0713] border-[#8B5CF6]/30 text-white'
                : 'bg-[#F8F6FF] border-[#7C3AED]/25 text-black'
            }`}
          />
          <button
            type="submit"
            className="wp-btn-primary px-4 py-2 text-xs font-mono-tabular cursor-pointer"
          >
            Save Preset
          </button>
        </form>
      )}

      {/* Filter Controls Grid: Date Range, Country, Topic, Source, Status, Min Importance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs font-mono-tabular">
        {/* 1. Date Range */}
        <div>
          <label htmlFor="filter-date-range" className="block text-[10px] uppercase text-[#A78BFA] mb-1">
            Date Range
          </label>
          <select
            id="filter-date-range"
            value={dateRange}
            onChange={(e) => onChangeDateRange(e.target.value as DateRangeFilter)}
            className={`w-full min-h-[44px] px-3 rounded-xl border ${
              isDark
                ? 'bg-[#050309] border-[#8B5CF6]/30 text-[#F6F4FF]'
                : 'bg-white border-[#7C3AED]/25 text-[#140E24]'
            }`}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="custom">Custom dates</option>
          </select>
        </div>

        {/* 2. Country */}
        <div>
          <label htmlFor="filter-country" className="block text-[10px] uppercase text-[#A78BFA] mb-1">
            Country
          </label>
          <select
            id="filter-country"
            value={selectedCountry || 'ALL'}
            onChange={(e) =>
              onChangeCountry(e.target.value === 'ALL' ? null : e.target.value)
            }
            className={`w-full min-h-[44px] px-3 rounded-xl border ${
              isDark
                ? 'bg-[#050309] border-[#8B5CF6]/30 text-[#F6F4FF]'
                : 'bg-white border-[#7C3AED]/25 text-[#140E24]'
            }`}
          >
            <option value="ALL">All Countries</option>
            {countryOptions.map(([code, name]) => (
              <option key={code} value={code}>
                {getCountryFlag(code)} {name} ({code})
              </option>
            ))}
          </select>
        </div>

        {/* 3. Topic */}
        <div>
          <label htmlFor="filter-topic" className="block text-[10px] uppercase text-[#A78BFA] mb-1">
            Topic
          </label>
          <select
            id="filter-topic"
            value={selectedTopic}
            onChange={(e) => onChangeTopic(e.target.value as 'All' | Topic)}
            className={`w-full min-h-[44px] px-3 rounded-xl border ${
              isDark
                ? 'bg-[#050309] border-[#8B5CF6]/30 text-[#F6F4FF]'
                : 'bg-white border-[#7C3AED]/25 text-[#140E24]'
            }`}
          >
            <option value="All">All Topics</option>
            {ALL_TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Source */}
        <div>
          <label htmlFor="filter-source" className="block text-[10px] uppercase text-[#A78BFA] mb-1">
            Source Outlet
          </label>
          <select
            id="filter-source"
            value={selectedSource}
            onChange={(e) => onChangeSource(e.target.value)}
            className={`w-full min-h-[44px] px-3 rounded-xl border ${
              isDark
                ? 'bg-[#050309] border-[#8B5CF6]/30 text-[#F6F4FF]'
                : 'bg-white border-[#7C3AED]/25 text-[#140E24]'
            }`}
          >
            {availableSources.map((src) => (
              <option key={src} value={src}>
                {src === 'All' ? 'All Sources' : src}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Status (Confirmed / Developing) */}
        <div>
          <label htmlFor="filter-status" className="block text-[10px] uppercase text-[#A78BFA] mb-1">
            Verification Status
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => onChangeStatusFilter(e.target.value as StoryStatusFilter)}
            className={`w-full min-h-[44px] px-3 rounded-xl border ${
              isDark
                ? 'bg-[#050309] border-[#8B5CF6]/30 text-[#F6F4FF]'
                : 'bg-white border-[#7C3AED]/25 text-[#140E24]'
            }`}
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed Only</option>
            <option value="developing">Developing Only</option>
          </select>
        </div>

        {/* 6. Minimum Importance */}
        <div>
          <label htmlFor="filter-min-imp" className="block text-[10px] uppercase text-[#A78BFA] mb-1">
            {labels.minImportance}: {minImportance}+ / 10
          </label>
          <div className="flex items-center gap-2 min-h-[44px]">
            <input
              id="filter-min-imp"
              type="range"
              min={1}
              max={9}
              step={1}
              value={minImportance}
              onChange={(e) => onChangeMinImportance(Number(e.target.value))}
              className="flex-1 accent-[#8B5CF6] min-h-[44px] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onChangeMinImportance(minImportance >= 7 ? 1 : 7)}
              className={`min-h-[44px] px-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                minImportance >= 7
                  ? 'bg-[#8B5CF6] border-[#A78BFA] text-white'
                  : isDark
                  ? 'bg-[#050309] border-[#8B5CF6]/30 text-[#C4BDD9]'
                  : 'bg-white border-[#7C3AED]/25 text-[#3F3559]'
              }`}
            >
              7+
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker Row */}
      {dateRange === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono-tabular">
          <Calendar className="w-4 h-4 text-[#A78BFA]" />
          <label className="inline-flex items-center gap-2">
            <span>From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => onChangeCustomStartDate(e.target.value)}
              className={`min-h-[44px] px-3 rounded-xl border ${
                isDark
                  ? 'bg-[#050309] border-[#8B5CF6]/30 text-white'
                  : 'bg-white border-[#7C3AED]/25 text-black'
              }`}
            />
          </label>
          <label className="inline-flex items-center gap-2">
            <span>To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onChangeCustomEndDate(e.target.value)}
              className={`min-h-[44px] px-3 rounded-xl border ${
                isDark
                  ? 'bg-[#050309] border-[#8B5CF6]/30 text-white'
                  : 'bg-white border-[#7C3AED]/25 text-black'
              }`}
            />
          </label>
        </div>
      )}

      {/* Active Removable Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#9389B0]">
            Active Filters ({filteredCount} matches):
          </span>

          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => onChangeSearchQuery('')}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Search: &ldquo;{searchQuery}&rdquo;</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {dateRange !== '24h' && (
            <button
              type="button"
              onClick={() => onChangeDateRange('24h')}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Date: {dateRange === '7d' ? 'Last 7 days' : 'Custom'}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {selectedCountry && (
            <button
              type="button"
              onClick={() => onChangeCountry(null)}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                Country: {getCountryFlag(selectedCountry)} {selectedCountry}
              </span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {selectedTopic !== 'All' && (
            <button
              type="button"
              onClick={() => onChangeTopic('All')}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Topic: {selectedTopic}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {selectedSource !== 'All' && (
            <button
              type="button"
              onClick={() => onChangeSource('All')}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Source: {selectedSource}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {statusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => onChangeStatusFilter('all')}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Status: {statusFilter}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {minImportance > 1 && (
            <button
              type="button"
              onClick={() => onChangeMinImportance(1)}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Importance: {minImportance}+</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Saved Filter Presets Row */}
      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#8B5CF6]/15">
          <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#A78BFA]">
            Saved Presets:
          </span>
          {presets.map((p) => (
            <div
              key={p.id}
              className="inline-flex items-center rounded-full border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => handleRestorePreset(p)}
                className="min-h-[44px] px-3 py-1 text-xs font-mono-tabular hover:bg-[#8B5CF6]/20 cursor-pointer"
                title={`Restore preset: ${p.name}`}
              >
                {p.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeletePreset(p.id)}
                aria-label={`Delete preset ${p.name}`}
                className="min-h-[44px] px-2.5 text-rose-300 hover:bg-rose-500/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* "Did you mean" Suggestion when Search Returns 0 Results */}
      {filteredCount === 0 && didYouMean && (
        <div
          className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
            isDark
              ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/10 text-[#F6F4FF]'
              : 'border-[#7C3AED]/30 bg-[#7C3AED]/10 text-[#140E24]'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-mono-tabular">
            <Sparkles className="w-4 h-4 text-[#A78BFA]" />
            <span>
              No exact matches for &ldquo;{searchQuery}&rdquo;. {labels.didYouMean}{' '}
              <strong>{didYouMean.label}</strong>?
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onChangeSearchQuery('');
              if (didYouMean.type === 'topic') {
                onChangeTopic(didYouMean.value as Topic);
              } else {
                onChangeCountry(didYouMean.value);
              }
            }}
            className="wp-btn-primary px-4 py-1.5 text-xs font-mono-tabular cursor-pointer"
          >
            Apply {didYouMean.label}
          </button>
        </div>
      )}
    </section>
  );
};
