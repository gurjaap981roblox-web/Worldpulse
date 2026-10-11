import { Topic, WorldRegion } from '../types';

// Strictly sanitize untrusted LLM or RSS text to prevent XSS
export function sanitizeText(raw: unknown, maxLength = 500): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string') return '#';
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Invalid URL
  }
  return '#';
}

// Jaccard token similarity for deduplicating news headlines
export function tokenizeTitle(title: string): Set<string> {
  const stopWords = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were',
    'with', 'by', 'from', 'as', 'after', 'over', 'into', 'new', 'says', 'say', 'amid', 'report',
  ]);
  const tokens = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  return new Set(tokens);
}

export function titleSimilarity(a: string, b: string): number {
  const setA = tokenizeTitle(a);
  const setB = tokenizeTitle(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

// Comprehensive Country Gazetteer (ISO-2, Name, Lat, Lng, Region, Keywords)
export interface CountryMeta {
  code: string;
  name: string;
  lat: number;
  lng: number;
  region: WorldRegion;
  keywords: string[];
}

export const COUNTRY_GAZETTEER: Record<string, CountryMeta> = {
  US: { code: 'US', name: 'United States', lat: 38.89, lng: -77.03, region: 'Americas', keywords: ['united states', 'u.s.', 'usa', 'washington', 'new york', 'california', 'pentagon', 'white house', 'texas', 'florida', 'alaska', 'hawaii', 'biden', 'trump', 'congress', 'fed '] },
  IN: { code: 'IN', name: 'India', lat: 28.61, lng: 77.20, region: 'Asia-Pacific', keywords: ['india', 'indian', 'new delhi', 'delhi', 'mumbai', 'bengaluru', 'kolkata', 'chennai', 'rbi', 'modi'] },
  GB: { code: 'GB', name: 'United Kingdom', lat: 51.50, lng: -0.12, region: 'Europe', keywords: ['uk', 'u.k.', 'britain', 'british', 'london', 'england', 'scotland', 'westminster', 'starmer'] },
  UA: { code: 'UA', name: 'Ukraine', lat: 50.45, lng: 30.52, region: 'Europe', keywords: ['ukraine', 'ukrainian', 'kyiv', 'kharkiv', 'odesa', 'donbas', 'zelensky'] },
  RU: { code: 'RU', name: 'Russia', lat: 55.75, lng: 37.61, region: 'Europe', keywords: ['russia', 'russian', 'moscow', 'kremlin', 'putin', 'siberia', 'kamchatka'] },
  CN: { code: 'CN', name: 'China', lat: 39.90, lng: 116.40, region: 'Asia-Pacific', keywords: ['china', 'chinese', 'beijing', 'shanghai', 'shenzhen', 'hong kong', 'xi jinping'] },
  JP: { code: 'JP', name: 'Japan', lat: 35.68, lng: 139.76, region: 'Asia-Pacific', keywords: ['japan', 'japanese', 'tokyo', 'osaka', 'honshu', 'hokkaido', 'okinawa', 'nikkei', 'yen'] },
  IL: { code: 'IL', name: 'Israel', lat: 31.76, lng: 35.21, region: 'Middle East & Africa', keywords: ['israel', 'israeli', 'jerusalem', 'tel aviv', 'idf', 'netanyahu'] },
  PS: { code: 'PS', name: 'Palestine', lat: 31.50, lng: 34.46, region: 'Middle East & Africa', keywords: ['gaza', 'palestinian', 'palestine', 'west bank', 'ramallah', 'rafah'] },
  LB: { code: 'LB', name: 'Lebanon', lat: 33.89, lng: 35.50, region: 'Middle East & Africa', keywords: ['lebanon', 'lebanese', 'beirut'] },
  IR: { code: 'IR', name: 'Iran', lat: 35.68, lng: 51.38, region: 'Middle East & Africa', keywords: ['iran', 'iranian', 'tehran'] },
  SY: { code: 'SY', name: 'Syria', lat: 33.51, lng: 36.27, region: 'Middle East & Africa', keywords: ['syria', 'syrian', 'damascus', 'aleppo'] },
  SD: { code: 'SD', name: 'Sudan', lat: 15.50, lng: 32.55, region: 'Middle East & Africa', keywords: ['sudan', 'sudanese', 'khartoum', 'darfur'] },
  DE: { code: 'DE', name: 'Germany', lat: 52.52, lng: 13.40, region: 'Europe', keywords: ['germany', 'german', 'berlin', 'frankfurt', 'munich', 'bundestag'] },
  FR: { code: 'FR', name: 'France', lat: 48.85, lng: 2.35, region: 'Europe', keywords: ['france', 'french', 'paris', 'macron', 'lyon'] },
  IT: { code: 'IT', name: 'Italy', lat: 41.90, lng: 12.49, region: 'Europe', keywords: ['italy', 'italian', 'rome', 'milan'] },
  ES: { code: 'ES', name: 'Spain', lat: 40.41, lng: -3.70, region: 'Europe', keywords: ['spain', 'spanish', 'madrid', 'barcelona'] },
  PL: { code: 'PL', name: 'Poland', lat: 52.22, lng: 21.01, region: 'Europe', keywords: ['poland', 'polish', 'warsaw'] },
  TR: { code: 'TR', name: 'Turkey', lat: 39.93, lng: 32.85, region: 'Middle East & Africa', keywords: ['turkey', 'turkish', 'ankara', 'istanbul', 'erdogan'] },
  EG: { code: 'EG', name: 'Egypt', lat: 30.04, lng: 31.23, region: 'Middle East & Africa', keywords: ['egypt', 'egyptian', 'cairo', 'suez'] },
  SA: { code: 'SA', name: 'Saudi Arabia', lat: 24.71, lng: 46.67, region: 'Middle East & Africa', keywords: ['saudi', 'riyadh', 'jeddah'] },
  AE: { code: 'AE', name: 'United Arab Emirates', lat: 24.45, lng: 54.37, region: 'Middle East & Africa', keywords: ['uae', 'dubai', 'abu dhabi'] },
  ZA: { code: 'ZA', name: 'South Africa', lat: -25.74, lng: 28.18, region: 'Middle East & Africa', keywords: ['south africa', 'johannesburg', 'cape town', 'pretoria'] },
  NG: { code: 'NG', name: 'Nigeria', lat: 9.07, lng: 7.39, region: 'Middle East & Africa', keywords: ['nigeria', 'nigerian', 'abuja', 'lagos'] },
  KE: { code: 'KE', name: 'Kenya', lat: -1.29, lng: 36.82, region: 'Middle East & Africa', keywords: ['kenya', 'kenyan', 'nairobi'] },
  CD: { code: 'CD', name: 'DR Congo', lat: -4.44, lng: 15.26, region: 'Middle East & Africa', keywords: ['congo', 'kinshasa', 'goma', 'drc'] },
  ET: { code: 'ET', name: 'Ethiopia', lat: 9.03, lng: 38.74, region: 'Middle East & Africa', keywords: ['ethiopia', 'addis ababa'] },
  PK: { code: 'PK', name: 'Pakistan', lat: 33.68, lng: 73.04, region: 'Asia-Pacific', keywords: ['pakistan', 'pakistani', 'islamabad', 'karachi', 'lahore'] },
  BD: { code: 'BD', name: 'Bangladesh', lat: 23.81, lng: 90.41, region: 'Asia-Pacific', keywords: ['bangladesh', 'dhaka'] },
  AF: { code: 'AF', name: 'Afghanistan', lat: 34.55, lng: 69.20, region: 'Asia-Pacific', keywords: ['afghanistan', 'afghan', 'kabul'] },
  MM: { code: 'MM', name: 'Myanmar', lat: 19.76, lng: 96.07, region: 'Asia-Pacific', keywords: ['myanmar', 'burma', 'yangon'] },
  TH: { code: 'TH', name: 'Thailand', lat: 13.75, lng: 100.50, region: 'Asia-Pacific', keywords: ['thailand', 'thai', 'bangkok'] },
  VN: { code: 'VN', name: 'Vietnam', lat: 21.02, lng: 105.83, region: 'Asia-Pacific', keywords: ['vietnam', 'hanoi', 'ho chi minh'] },
  ID: { code: 'ID', name: 'Indonesia', lat: -6.20, lng: 106.84, region: 'Asia-Pacific', keywords: ['indonesia', 'indonesian', 'jakarta', 'sumatra', 'java', 'sulawesi', 'bali'] },
  PH: { code: 'PH', name: 'Philippines', lat: 14.59, lng: 120.98, region: 'Asia-Pacific', keywords: ['philippines', 'philippine', 'manila', 'mindanao', 'luzon'] },
  TW: { code: 'TW', name: 'Taiwan', lat: 25.03, lng: 121.56, region: 'Asia-Pacific', keywords: ['taiwan', 'taiwanese', 'taipei', 'tsmc'] },
  KR: { code: 'KR', name: 'South Korea', lat: 37.56, lng: 126.97, region: 'Asia-Pacific', keywords: ['south korea', 'korean', 'seoul'] },
  KP: { code: 'KP', name: 'North Korea', lat: 39.03, lng: 125.76, region: 'Asia-Pacific', keywords: ['north korea', 'pyongyang'] },
  AU: { code: 'AU', name: 'Australia', lat: -35.28, lng: 149.13, region: 'Asia-Pacific', keywords: ['australia', 'australian', 'sydney', 'melbourne', 'canberra', 'queensland'] },
  NZ: { code: 'NZ', name: 'New Zealand', lat: -41.28, lng: 174.77, region: 'Asia-Pacific', keywords: ['new zealand', 'wellington', 'auckland', 'kermadec'] },
  SG: { code: 'SG', name: 'Singapore', lat: 1.35, lng: 103.81, region: 'Asia-Pacific', keywords: ['singapore'] },
  MY: { code: 'MY', name: 'Malaysia', lat: 3.13, lng: 101.68, region: 'Asia-Pacific', keywords: ['malaysia', 'kuala lumpur'] },
  CA: { code: 'CA', name: 'Canada', lat: 45.42, lng: -75.69, region: 'Americas', keywords: ['canada', 'canadian', 'ottawa', 'toronto', 'vancouver', 'quebec'] },
  MX: { code: 'MX', name: 'Mexico', lat: 19.43, lng: -99.13, region: 'Americas', keywords: ['mexico', 'mexican', 'oaxaca', 'guerrero'] },
  BR: { code: 'BR', name: 'Brazil', lat: -15.79, lng: -47.88, region: 'Americas', keywords: ['brazil', 'brazilian', 'brasilia', 'sao paulo', 'rio de janeiro', 'amazon', 'lula'] },
  AR: { code: 'AR', name: 'Argentina', lat: -34.60, lng: -58.38, region: 'Americas', keywords: ['argentina', 'argentine', 'buenos aires', 'milei'] },
  CL: { code: 'CL', name: 'Chile', lat: -33.44, lng: -70.66, region: 'Americas', keywords: ['chile', 'chilean', 'santiago', 'antofagasta', 'atacama'] },
  CO: { code: 'CO', name: 'Colombia', lat: 4.71, lng: -74.07, region: 'Americas', keywords: ['colombia', 'colombian', 'bogota'] },
  PE: { code: 'PE', name: 'Peru', lat: -12.04, lng: -77.04, region: 'Americas', keywords: ['peru', 'peruvian', 'lima'] },
  VE: { code: 'VE', name: 'Venezuela', lat: 10.48, lng: -66.90, region: 'Americas', keywords: ['venezuela', 'venezuelan', 'caracas'] },
  HT: { code: 'HT', name: 'Haiti', lat: 18.59, lng: -72.30, region: 'Americas', keywords: ['haiti', 'haitian', 'port-au-prince'] },
  PG: { code: 'PG', name: 'Papua New Guinea', lat: -6.31, lng: 143.95, region: 'Asia-Pacific', keywords: ['papua new guinea'] },
  TO: { code: 'TO', name: 'Tonga', lat: -21.17, lng: -175.19, region: 'Asia-Pacific', keywords: ['tonga'] },
  FJ: { code: 'FJ', name: 'Fiji', lat: -17.71, lng: 178.06, region: 'Asia-Pacific', keywords: ['fiji'] },
  VU: { code: 'VU', name: 'Vanuatu', lat: -15.37, lng: 166.95, region: 'Asia-Pacific', keywords: ['vanuatu'] },
  GR: { code: 'GR', name: 'Greece', lat: 37.98, lng: 23.72, region: 'Europe', keywords: ['greece', 'greek', 'athens', 'aegean'] },
  SE: { code: 'SE', name: 'Sweden', lat: 59.32, lng: 18.06, region: 'Europe', keywords: ['sweden', 'swedish', 'stockholm'] },
  NO: { code: 'NO', name: 'Norway', lat: 59.91, lng: 10.75, region: 'Europe', keywords: ['norway', 'norwegian', 'oslo'] },
  CH: { code: 'CH', name: 'Switzerland', lat: 46.94, lng: 7.44, region: 'Europe', keywords: ['switzerland', 'swiss', 'geneva', 'zurich'] },
  NL: { code: 'NL', name: 'Netherlands', lat: 52.36, lng: 4.90, region: 'Europe', keywords: ['netherlands', 'dutch', 'amsterdam', 'the hague'] },
  BE: { code: 'BE', name: 'Belgium', lat: 50.85, lng: 4.35, region: 'Europe', keywords: ['belgium', 'brussels', 'european union', 'eu ', 'nato'] },
  YE: { code: 'YE', name: 'Yemen', lat: 15.36, lng: 44.19, region: 'Middle East & Africa', keywords: ['yemen', 'houthi', 'red sea', 'sanaa'] },
  IQ: { code: 'IQ', name: 'Iraq', lat: 33.31, lng: 44.36, region: 'Middle East & Africa', keywords: ['iraq', 'iraqi', 'baghdad'] },
  GL: { code: 'GL', name: 'Global', lat: 20.0, lng: 0.0, region: 'Global', keywords: ['global', 'worldwide', 'united nations', 'imf', 'who '] },
};

// Convert 2-letter ISO code to Unicode Flag Emoji
export function getCountryFlag(isoCode: string): string {
  const code = (isoCode || 'GL').toUpperCase().trim();
  if (code === 'GL' || code === 'GLOBAL' || code.length !== 2) {
    return '🌐';
  }
  const first = code.charCodeAt(0);
  const second = code.charCodeAt(1);
  if (first < 65 || first > 90 || second < 65 || second > 90) {
    return '🌐';
  }
  return String.fromCodePoint(0x1f1e6 + first - 65, 0x1f1e6 + second - 65);
}

export function getCountryMeta(codeOrHint: string, textHint = ''): CountryMeta {
  const upper = (codeOrHint || '').toUpperCase().trim();
  if (COUNTRY_GAZETTEER[upper]) {
    return COUNTRY_GAZETTEER[upper];
  }

  // Search by country name or keyword in textHint
  const combined = `${codeOrHint} ${textHint}`.toLowerCase();
  for (const meta of Object.values(COUNTRY_GAZETTEER)) {
    if (meta.code === 'GL') continue;
    if (meta.name.toLowerCase() === combined.trim()) return meta;
    for (const kw of meta.keywords) {
      if (combined.includes(kw)) {
        return meta;
      }
    }
  }

  // Nearest country by coordinates if available
  return COUNTRY_GAZETTEER.GL;
}

export function inferCountryFromCoords(lat: number, lng: number): CountryMeta {
  if (lat === 0 && lng === 0) return COUNTRY_GAZETTEER.GL;
  let bestMeta = COUNTRY_GAZETTEER.GL;
  let minDist = Infinity;
  for (const meta of Object.values(COUNTRY_GAZETTEER)) {
    if (meta.code === 'GL') continue;
    const d = haversineKm(lat, lng, meta.lat, meta.lng);
    if (d < minDist && d < 2800) {
      minDist = d;
      bestMeta = meta;
    }
  }
  return bestMeta;
}

// Deterministic baseline topic classifier (used for instant first-paint & AI fallback)
export function inferBaselineTopic(title: string, text: string, source: string): Topic {
  const lower = `${title} ${text} ${source}`.toLowerCase();
  if (source.includes('USGS') || source.includes('EONET')) return 'Disaster';
  if (source.includes('CoinGecko')) return 'Markets';
  if (source.includes('Open-Meteo')) return 'Climate';
  if (/earthquake|seismic|tsunami|wildfire|volcano|eruption|cyclone|typhoon|hurricane|flood|landslide|evacuat/.test(lower)) {
    return 'Disaster';
  }
  if (/war|military|missile|strike|attack|troops|ceasefire|airstrike|rebel|militia|conflict|shelling|drone|hostage|invasion/.test(lower)) {
    return 'Conflict';
  }
  if (/bitcoin|crypto|stock|nasdaq|s&p|dow|nikkei|ftse|market|shares|rally|selloff|treasury|yield|gold|oil price/.test(lower)) {
    return 'Markets';
  }
  if (/inflation|gdp|central bank|interest rate|imf|tariff|trade|recession|economy|economic|unemployment|budget|debt/.test(lower)) {
    return 'Economy';
  }
  if (/climate|emissions|warming|carbon|heatwave|drought|renewable|glacier|weather|el nino|meteorolog/.test(lower)) {
    return 'Climate';
  }
  if (/virus|outbreak|vaccine|who |hospital|disease|health|pandemic|medical|cancer|fda|avian flu|mpox/.test(lower)) {
    return 'Health';
  }
  if (/ai |artificial intelligence|chip|semiconductor|cyber|hack|software|apple|google|microsoft|openai|nvidia|tech/.test(lower)) {
    return 'Tech';
  }
  if (/nasa|space|rocket|satellite|astronomy|quantum|fusion|genome|discovery|physics|telescope/.test(lower)) {
    return 'Science';
  }
  if (/olympic|world cup|premier league|champions league|fifa|tournament|tennis|cricket|formula 1|nfl|nba/.test(lower)) {
    return 'Sports';
  }
  if (/election|parliament|president|minister|senate|vote|coalition|diplomat|summit|sanction|treaty|court|policy/.test(lower)) {
    return 'Politics';
  }
  return 'Other';
}

export function inferBaselineImportance(title: string, topic: Topic, magnitude?: number, sourceCount = 1): number {
  if (typeof magnitude === 'number') {
    if (magnitude >= 7.0) return 10;
    if (magnitude >= 6.2) return 9;
    if (magnitude >= 5.5) return 8;
    if (magnitude >= 5.0) return 7;
    return 6;
  }
  let score = 6;
  const lower = title.toLowerCase();
  if (topic === 'Conflict' || topic === 'Disaster') score += 1.5;
  if (/breaking|urgent|emergency|crisis|dead|killed|massive|major|historic|surge|plunge/.test(lower)) score += 1.2;
  if (sourceCount > 1) score += Math.min(2, (sourceCount - 1) * 0.8);
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

export function inferBaselineSentiment(title: string, topic: Topic): number {
  const lower = title.toLowerCase();
  if (topic === 'Disaster' || topic === 'Conflict') return -0.7;
  if (/crisis|crash|dead|attack|war|threat|inflation|deficit|warn|fear|drop|plunge/.test(lower)) return -0.5;
  if (/breakthrough|peace|deal|recovery|growth|surge|rally|cure|aid|agreement|success/.test(lower)) return 0.5;
  return 0;
}

// Haversine distance in kilometers
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number, units: 'metric' | 'imperial'): string {
  if (units === 'imperial') {
    const miles = Math.round(km * 0.621371);
    return `${miles.toLocaleString()} mi`;
  }
  return `${Math.round(km).toLocaleString()} km`;
}

export function formatTemperature(tempC: number, units: 'metric' | 'imperial'): string {
  if (units === 'imperial') {
    const f = Math.round((tempC * 9) / 5 + 32);
    return `${f}°F`;
  }
  return `${Math.round(tempC)}°C`;
}

export function formatTimeInTz(timestamp: number | null, timezone = 'Asia/Kolkata'): string {
  if (!timestamp) return 'No data';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

// Accessible topic palette that passes contrast checks on both dark navy and light slate
export const TOPIC_COLORS: Record<Topic, { hex: string; textClass: string; dotClass: string }> = {
  Conflict: { hex: '#F43F5E', textClass: 'text-rose-400 light:text-rose-600', dotClass: 'bg-rose-500' },
  Disaster: { hex: '#F97316', textClass: 'text-orange-400 light:text-orange-600', dotClass: 'bg-orange-500' },
  Economy: { hex: '#F59E0B', textClass: 'text-amber-400 light:text-amber-600', dotClass: 'bg-amber-500' },
  Markets: { hex: '#10B981', textClass: 'text-emerald-400 light:text-emerald-600', dotClass: 'bg-emerald-500' },
  Tech: { hex: '#14B8A6', textClass: 'text-teal-400 light:text-teal-600', dotClass: 'bg-teal-500' },
  Health: { hex: '#EC4899', textClass: 'text-pink-400 light:text-pink-600', dotClass: 'bg-pink-500' },
  Climate: { hex: '#06B6D4', textClass: 'text-cyan-400 light:text-cyan-600', dotClass: 'bg-cyan-500' },
  Politics: { hex: '#38BDF8', textClass: 'text-sky-400 light:text-sky-600', dotClass: 'bg-sky-500' },
  Science: { hex: '#A855F7', textClass: 'text-purple-400 light:text-purple-600', dotClass: 'bg-purple-500' },
  Sports: { hex: '#84CC16', textClass: 'text-lime-400 light:text-lime-600', dotClass: 'bg-lime-500' },
  Other: { hex: '#94A3B8', textClass: 'text-slate-400 light:text-slate-600', dotClass: 'bg-slate-400' },
};

export const ALL_TOPICS: Topic[] = [
  'Politics',
  'Conflict',
  'Economy',
  'Markets',
  'Tech',
  'Health',
  'Climate',
  'Disaster',
  'Science',
  'Sports',
  'Other',
];

export const MAP_FILTER_TOPICS: Array<'All' | Topic> = [
  'All',
  'Conflict',
  'Disaster',
  'Economy',
  'Markets',
  'Tech',
  'Health',
  'Climate',
];
