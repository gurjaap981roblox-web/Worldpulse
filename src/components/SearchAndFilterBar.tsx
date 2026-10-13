import React, { useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Calendar,
  Check,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  Printer,
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

// Boolean (AND / OR) + "exact phrase" + -exclusion keyword search matcher
export function matchesBooleanSearchQuery(story: Story, rawQuery: string): boolean {
  const q = (rawQuery || '').trim();
  if (!q) return true;

  const haystack = `${story.headline} ${story.summary} ${story.countryName} ${story.country} ${story.topic} ${(story.sources || [])
    .map((s) => s.name)
    .join(' ')}`.toLowerCase();

  const orGroups = q.split(/\s+OR\s+/i);

  return orGroups.some((orPart) => {
    const negativeTerms: string[] = [];
    let cleanPart = orPart.replace(/\s+NOT\s+([^\s]+)/gi, (_, term) => {
      negativeTerms.push(term.toLowerCase());
      return ' ';
    });
    cleanPart = cleanPart.replace(/(?:^|\s)-([^\s]+)/g, (_, term) => {
      negativeTerms.push(term.toLowerCase());
      return ' ';
    });

    for (const neg of negativeTerms) {
      if (neg && haystack.includes(neg)) {
        return false;
      }
    }

    const exactPhrases: string[] = [];
    const withoutQuotes = cleanPart
      .replace(/\s+AND\s+/gi, ' ')
      .replace(/"([^"]+)"/g, (_, phrase) => {
        if (phrase && phrase.trim()) {
          exactPhrases.push(phrase.trim().toLowerCase());
        }
        return ' ';
      });

    const terms = withoutQuotes
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => Boolean(t) && !t.startsWith('-'));

    const phrasesMatch = exactPhrases.every((ph) => haystack.includes(ph));
    const termsMatch = terms.every((term) => haystack.includes(term));

    return phrasesMatch && termsMatch;
  });
}

export interface SearchAndFilterBarProps {
  stories: Story[];
  filteredCount: number;
  searchQuery?: string;
  searchInput?: string;
  onChangeSearchQuery?: (q: string) => void;
  onChangeSearchInput?: (q: string) => void;
  dateRange: DateRangeFilter;
  onChangeDateRange: (r: DateRangeFilter) => void;
  customStartDate?: string;
  onChangeCustomStartDate?: (d: string) => void;
  customEndDate?: string;
  onChangeCustomEndDate?: (d: string) => void;
  selectedCountry: string | null;
  onChangeCountry?: (c: string | null) => void;
  onSelectCountry?: (c: string | null) => void;
  selectedTopic: 'All' | Topic;
  onChangeTopic?: (t: 'All' | Topic) => void;
  onSelectTopic?: (t: 'All' | Topic) => void;
  selectedSource?: string;
  onChangeSource?: (src: string) => void;
  statusFilter?: StoryStatusFilter;
  onChangeStatusFilter?: (st: StoryStatusFilter) => void;
  minImportance?: number;
  onChangeMinImportance?: (imp: number) => void;
  onClearAllFilters: () => void;
  onCopyShareLink?: () => void;
  copiedShareLink?: boolean;
  onCopyDeepLink?: () => void;
  copiedDeepLink?: boolean;
  presets?: SavedFilterPreset[];
  onSavePreset?: (preset: SavedFilterPreset) => void;
  onDeletePreset?: (presetId: string) => void;
  onApplyPreset?: (preset: SavedFilterPreset) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  settings: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
}

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  stories,
  filteredCount,
  searchQuery,
  searchInput,
  onChangeSearchQuery,
  onChangeSearchInput,
  dateRange,
  onChangeDateRange,
  customStartDate = '',
  onChangeCustomStartDate,
  customEndDate = '',
  onChangeCustomEndDate,
  selectedCountry,
  onChangeCountry,
  onSelectCountry,
  selectedTopic,
  onChangeTopic,
  onSelectTopic,
  selectedSource = 'All',
  onChangeSource,
  statusFilter = 'all',
  onChangeStatusFilter,
  minImportance: propMinImp,
  onChangeMinImportance,
  onClearAllFilters,
  onCopyShareLink,
  copiedShareLink,
  onCopyDeepLink,
  copiedDeepLink,
  presets: externalPresets,
  onSavePreset: externalSavePreset,
  onDeletePreset: externalDeletePreset,
  onApplyPreset: externalApplyPreset,
  searchInputRef,
  settings,
  onUpdateSettings,
}) => {
  const currentQuery = searchInput !== undefined ? searchInput : (searchQuery || '');
  const activeMinImp = propMinImp !== undefined ? propMinImp : (settings.minImportance || 1);

  const handleQueryChange = (val: string) => {
    if (onChangeSearchInput) onChangeSearchInput(val);
    else if (onChangeSearchQuery) onChangeSearchQuery(val);
  };

  const handleCountryChange = (c: string | null) => {
    if (onSelectCountry) onSelectCountry(c);
    else if (onChangeCountry) onChangeCountry(c);
  };

  const handleTopicChange = (t: 'All' | Topic) => {
    if (onSelectTopic) onSelectTopic(t);
    else if (onChangeTopic) onChangeTopic(t);
  };

  const handleMinImpChange = (val: number) => {
    if (onChangeMinImportance) onChangeMinImportance(val);
    else if (onUpdateSettings) onUpdateSettings({ ...settings, minImportance: val });
  };

  const handleCopyLink = () => {
    if (onCopyDeepLink) onCopyDeepLink();
    else if (onCopyShareLink) onCopyShareLink();
  };

  const isLinkCopied = Boolean(copiedDeepLink || copiedShareLink);

  const [localPresets, setLocalPresets] = useState<SavedFilterPreset[]>(() => loadFilterPresets());
  const activePresets = externalPresets || localPresets;

  const [presetName, setPresetName] = useState('');
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const isDark = settings.theme === 'dark';
  const labels = UI_TRANSLATIONS[settings.language] || UI_TRANSLATIONS.en;

  // Unique available sources from current stories
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    for (const s of stories) {
      for (const src of s.sources || []) {
        if (src.name) set.add(src.name);
      }
    }
    return ['All', ...Array.from(set).sort()];
  }, [stories]);

  // Unique countries present in stories + Gazetteer
  const countryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stories) {
      if (s.country && s.countryName) {
        map.set(s.country, s.countryName);
      }
    }
    for (const meta of Object.values(COUNTRY_GAZETTEER)) {
      if (!map.has(meta.code)) {
        map.set(meta.code, meta.name);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [stories]);

  const hasActiveFilters =
    Boolean(currentQuery.trim()) ||
    dateRange !== '24h' ||
    Boolean(selectedCountry) ||
    selectedTopic !== 'All' ||
    selectedSource !== 'All' ||
    statusFilter !== 'all' ||
    activeMinImp > 1;

  const didYouMean = useMemo(() => {
    if (filteredCount > 0 || !currentQuery.trim()) return null;
    return getDidYouMeanSuggestion(currentQuery);
  }, [filteredCount, currentQuery]);

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = presetName.trim() || `Preset ${activePresets.length + 1}`;
    const newPreset: SavedFilterPreset = {
      id: `preset-${Date.now()}`,
      name: cleanName.slice(0, 32),
      query: currentQuery,
      dateRange,
      customStartDate,
      customEndDate,
      country: selectedCountry || 'ALL',
      topic: selectedTopic,
      source: selectedSource,
      status: statusFilter,
      minImportance: activeMinImp,
      createdAt: Date.now(),
    };

    if (externalSavePreset) {
      externalSavePreset(newPreset);
    } else {
      const next = [newPreset, ...localPresets].slice(0, 15);
      setLocalPresets(next);
      saveFilterPresets(next);
    }
    setPresetName('');
    setShowPresetForm(false);
  };

  const handleRestorePreset = (p: SavedFilterPreset) => {
    if (externalApplyPreset) {
      externalApplyPreset(p);
      return;
    }
    handleQueryChange(p.query);
    onChangeDateRange(p.dateRange);
    if (p.customStartDate && onChangeCustomStartDate) onChangeCustomStartDate(p.customStartDate);
    if (p.customEndDate && onChangeCustomEndDate) onChangeCustomEndDate(p.customEndDate);
    handleCountryChange(p.country === 'ALL' ? null : p.country);
    handleTopicChange(p.topic);
    if (onChangeSource) onChangeSource(p.source || 'All');
    if (onChangeStatusFilter) onChangeStatusFilter(p.status || 'all');
    handleMinImpChange(p.minImportance || 1);
  };

  const handleDeletePreset = (id: string) => {
    if (externalDeletePreset) {
      externalDeletePreset(id);
    } else {
      const next = localPresets.filter((p) => p.id !== id);
      setLocalPresets(next);
      saveFilterPresets(next);
    }
  };

  // Export filtered stories to CSV
  const handleExportCsv = () => {
    const headers = ['ID', 'Headline', 'Country', 'Topic', 'Importance', 'Time', 'Source', 'URL'];
    const rows = stories.map((s) => [
      `"${s.id}"`,
      `"${(s.headline || '').replace(/"/g, '""')}"`,
      `"${s.countryName || s.country}"`,
      `"${s.topic}"`,
      s.importance,
      `"${new Date(s.publishedAt || s.time).toISOString()}"`,
      `"${(s.sources?.[0]?.name || '').replace(/"/g, '""')}"`,
      `"${s.sources?.[0]?.url || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `worldpulse_stories_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Export filtered stories to JSON
  const handleExportJson = () => {
    const jsonContent = JSON.stringify(stories, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `worldpulse_stories_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Export filtered stories to Markdown
  const handleExportMarkdown = () => {
    const mdLines = [
      `# WorldPulse Filtered Dispatches`,
      `*Generated on ${new Date().toLocaleString()}*`,
      ``,
      ...stories.map((s, idx) => {
        const flag = getCountryFlag(s.country);
        const sourceName = s.sources?.[0]?.name || 'Wire';
        const sourceUrl = s.sources?.[0]?.url || '#';
        return `### ${idx + 1}. ${flag} ${s.headline}\n- **Topic:** ${s.topic} | **Importance:** ${s.importance}/10 | **Country:** ${s.countryName} (${s.country})\n- **Summary:** ${s.summary}\n- **Source:** [${sourceName}](${sourceUrl})\n`;
      }),
    ];
    const blob = new Blob([mdLines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `worldpulse_stories_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <section
      aria-label="Search and filter stories"
      className="wp-glass-card p-4 sm:p-5 space-y-3.5 no-print"
    >
      {/* Top Row: Search Box with Boolean / Phrase Hint + Preset, Export & Share Actions */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#38BDF8] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            value={currentQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder='Search headlines, topics, countries (supports "phrase", AND, OR, -excluded)...'
            aria-label="Search stories by keyword, exact phrase, boolean AND, OR, or exclusion"
            className={`w-full min-h-[44px] pl-10 pr-10 py-2 rounded-full border text-xs sm:text-sm font-mono-tabular transition-colors focus:outline-none ${
              isDark
                ? 'bg-[#0A1830]/90 border-[#22D3EE]/35 text-[#E6F1FF] placeholder:text-[#8FA5C2]'
                : 'bg-white border-[#0284C7]/30 text-[#140E24] placeholder:text-[#625680]'
            }`}
          />
          {currentQuery && (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              aria-label="Clear search query"
              className="min-h-[44px] min-w-[44px] absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#8FA5C2] hover:text-white cursor-pointer"
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
            <BookmarkPlus className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>{labels.savePreset}</span>
          </button>

          {/* Export Dropdown Menu (CSV, JSON, Markdown, Print) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="wp-btn-secondary px-3.5 py-2 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
              title="Export filtered stories"
            >
              <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Export</span>
            </button>
            {showExportMenu && (
              <div
                className={`absolute right-0 mt-2 w-48 rounded-2xl border p-2 space-y-1 shadow-2xl z-30 ${
                  isDark
                    ? 'bg-[#050B16] border-[#22D3EE]/40 text-[#E6F1FF]'
                    : 'bg-white border-[#0284C7]/30 text-[#140E24]'
                }`}
              >
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full min-h-[44px] px-3 rounded-xl flex items-center gap-2 text-xs font-mono-tabular hover:bg-[#22D3EE]/20 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full min-h-[44px] px-3 rounded-xl flex items-center gap-2 text-xs font-mono-tabular hover:bg-[#22D3EE]/20 cursor-pointer"
                >
                  <FileJson className="w-4 h-4 text-amber-400" />
                  <span>Export JSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="w-full min-h-[44px] px-3 rounded-xl flex items-center gap-2 text-xs font-mono-tabular hover:bg-[#22D3EE]/20 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>Export Markdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    window.print();
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl flex items-center gap-2 text-xs font-mono-tabular hover:bg-[#22D3EE]/20 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#38BDF8]" />
                  <span>Print Dossier</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="wp-btn-secondary px-3.5 py-2 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            title="Copy shareable link with current search and filters"
          >
            {isLinkCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#38BDF8]" />
            )}
            <span>{isLinkCopied ? 'Copied Filter Link' : 'Share Filter Link'}</span>
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
            isDark ? 'border-[#22D3EE]/30 bg-[#0A1830]' : 'border-[#0284C7]/25 bg-white'
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
                ? 'bg-[#050B16] border-[#22D3EE]/30 text-white'
                : 'bg-[#F0F6FC] border-[#0284C7]/25 text-black'
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
          <label htmlFor="filter-date-range" className="block text-[10px] uppercase text-[#38BDF8] mb-1">
            Date Range
          </label>
          <select
            id="filter-date-range"
            value={dateRange}
            onChange={(e) => onChangeDateRange(e.target.value as DateRangeFilter)}
            className={`w-full min-h-[44px] px-3 rounded-xl border ${
              isDark
                ? 'bg-[#0A1830] border-[#22D3EE]/30 text-[#E6F1FF]'
                : 'bg-white border-[#0284C7]/25 text-[#140E24]'
            }`}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="custom">Custom dates</option>
          </select>
        </div>

        {/* 2. Country */}
        <div>
          <label htmlFor="filter-country" className="block text-[10px] uppercase text-[#38BDF8] mb-1">
            Country
          </label>
          <select
            id="filter-country"
            value={selectedCountry || 'ALL'}
            onChange={(e) =>
              handleCountryChange(e.target.value === 'ALL' ? null : e.target.value)
            }
            className={`w-full min-h-[44px] px-3 rounded-xl border ${
              isDark
                ? 'bg-[#0A1830] border-[#22D3EE]/30 text-[#E6F1FF]'
                : 'bg-white border-[#0284C7]/25 text-[#140E24]'
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
          <label htmlFor="filter-topic" className="block text-[10px] uppercase text-[#38BDF8] mb-1">
            Topic
          </label>
          <select
            id="filter-topic"
            value={selectedTopic}
            onChange={(e) => handleTopicChange(e.target.value as 'All' | Topic)}
            className={`w-full min-h-[44px] px-3 rounded-xl border ${
              isDark
                ? 'bg-[#0A1830] border-[#22D3EE]/30 text-[#E6F1FF]'
                : 'bg-white border-[#0284C7]/25 text-[#140E24]'
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
          <label htmlFor="filter-source" className="block text-[10px] uppercase text-[#38BDF8] mb-1">
            Source Outlet
          </label>
          <select
            id="filter-source"
            value={selectedSource}
            onChange={(e) => onChangeSource && onChangeSource(e.target.value)}
            className={`w-full min-h-[44px] px-3 rounded-xl border ${
              isDark
                ? 'bg-[#0A1830] border-[#22D3EE]/30 text-[#E6F1FF]'
                : 'bg-white border-[#0284C7]/25 text-[#140E24]'
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
          <label htmlFor="filter-status" className="block text-[10px] uppercase text-[#38BDF8] mb-1">
            Verification Status
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => onChangeStatusFilter && onChangeStatusFilter(e.target.value as StoryStatusFilter)}
            className={`w-full min-h-[44px] px-3 rounded-xl border ${
              isDark
                ? 'bg-[#0A1830] border-[#22D3EE]/30 text-[#E6F1FF]'
                : 'bg-white border-[#0284C7]/25 text-[#140E24]'
            }`}
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed Only</option>
            <option value="developing">Developing Only</option>
          </select>
        </div>

        {/* 6. Minimum Importance */}
        <div>
          <label htmlFor="filter-min-imp" className="block text-[10px] uppercase text-[#38BDF8] mb-1">
            {labels.minImportance}: {activeMinImp}+ / 10
          </label>
          <div className="flex items-center gap-2 min-h-[44px]">
            <input
              id="filter-min-imp"
              type="range"
              min={1}
              max={9}
              step={1}
              value={activeMinImp}
              onChange={(e) => handleMinImpChange(Number(e.target.value))}
              className="flex-1 accent-[#22D3EE] min-h-[44px] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => handleMinImpChange(activeMinImp >= 7 ? 1 : 7)}
              className={`min-h-[44px] px-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                activeMinImp >= 7
                  ? 'bg-[#22D3EE] border-[#38BDF8] text-white'
                  : isDark
                  ? 'bg-[#0A1830] border-[#22D3EE]/30 text-[#8FA5C2]'
                  : 'bg-white border-[#0284C7]/25 text-[#3F3559]'
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
          <Calendar className="w-4 h-4 text-[#38BDF8]" />
          <label className="inline-flex items-center gap-2">
            <span>From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => onChangeCustomStartDate && onChangeCustomStartDate(e.target.value)}
              className={`min-h-[44px] px-3 rounded-xl border ${
                isDark
                  ? 'bg-[#0A1830] border-[#22D3EE]/30 text-white'
                  : 'bg-white border-[#0284C7]/25 text-black'
              }`}
            />
          </label>
          <label className="inline-flex items-center gap-2">
            <span>To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onChangeCustomEndDate && onChangeCustomEndDate(e.target.value)}
              className={`min-h-[44px] px-3 rounded-xl border ${
                isDark
                  ? 'bg-[#0A1830] border-[#22D3EE]/30 text-white'
                  : 'bg-white border-[#0284C7]/25 text-black'
              }`}
            />
          </label>
        </div>
      )}

      {/* Active Removable Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#8FA5C2]">
            Active Filters ({filteredCount} matches):
          </span>

          {currentQuery.trim() && (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Search: &ldquo;{currentQuery}&rdquo;</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {dateRange !== '24h' && (
            <button
              type="button"
              onClick={() => onChangeDateRange('24h')}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                Date: {dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : 'Custom'}
              </span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {selectedCountry && (
            <button
              type="button"
              onClick={() => handleCountryChange(null)}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
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
              onClick={() => handleTopicChange('All')}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Topic: {selectedTopic}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {selectedSource !== 'All' && (
            <button
              type="button"
              onClick={() => onChangeSource && onChangeSource('All')}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Source: {selectedSource}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {statusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => onChangeStatusFilter && onChangeStatusFilter('all')}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Status: {statusFilter}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {activeMinImp > 1 && (
            <button
              type="button"
              onClick={() => handleMinImpChange(1)}
              className="min-h-[44px] px-3 py-1.5 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/45 text-xs font-mono-tabular inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Importance: {activeMinImp}+</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Saved Filter Presets Row */}
      {activePresets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#22D3EE]/15">
          <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#38BDF8]">
            Saved Presets:
          </span>
          {activePresets.map((p) => (
            <div
              key={p.id}
              className="inline-flex items-center rounded-full border border-[#22D3EE]/35 bg-[#22D3EE]/10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => handleRestorePreset(p)}
                className="min-h-[44px] px-3 py-1 text-xs font-mono-tabular hover:bg-[#22D3EE]/20 cursor-pointer"
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
              ? 'border-[#22D3EE]/40 bg-[#22D3EE]/10 text-[#E6F1FF]'
              : 'border-[#0284C7]/30 bg-[#0284C7]/10 text-[#140E24]'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-mono-tabular">
            <Sparkles className="w-4 h-4 text-[#38BDF8]" />
            <span>
              No exact matches for &ldquo;{currentQuery}&rdquo;. {labels.didYouMean}{' '}
              <strong>{didYouMean.label}</strong>?
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              handleQueryChange('');
              if (didYouMean.type === 'topic') {
                handleTopicChange(didYouMean.value as Topic);
              } else {
                handleCountryChange(didYouMean.value);
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
