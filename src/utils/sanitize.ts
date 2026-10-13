import { SourceTypeBadge, Story, Topic, WorldRegion } from '../types';

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
  IN: { code: 'IN', name: 'India', lat: 28.61, lng: 77.20, region: 'Asia-Pacific', keywords: ['india', 'indian', 'new delhi', 'delhi', 'mumbai', 'bengaluru', 'kolkata', 'chennai', 'hyderabad', 'ahmedabad', 'pune', 'rbi', 'modi', 'sensex', 'nifty', 'rupee', 'isro', 'lok sabha', 'rajya sabha', 'punjab', 'chandigarh', 'amritsar', 'ludhiana', 'jalandhar', 'patiala', 'mohali', 'bathinda'] },
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
  LK: { code: 'LK', name: 'Sri Lanka', lat: 6.92, lng: 79.86, region: 'Asia-Pacific', keywords: ['sri lanka', 'colombo'] },
  NP: { code: 'NP', name: 'Nepal', lat: 27.71, lng: 85.32, region: 'Asia-Pacific', keywords: ['nepal', 'kathmandu', 'himalaya'] },
  BT: { code: 'BT', name: 'Bhutan', lat: 27.47, lng: 89.63, region: 'Asia-Pacific', keywords: ['bhutan', 'thimphu'] },
  MV: { code: 'MV', name: 'Maldives', lat: 4.17, lng: 73.50, region: 'Asia-Pacific', keywords: ['maldives', 'male'] },
  KZ: { code: 'KZ', name: 'Kazakhstan', lat: 51.16, lng: 71.47, region: 'Asia-Pacific', keywords: ['kazakhstan', 'astana', 'almaty'] },
  UZ: { code: 'UZ', name: 'Uzbekistan', lat: 41.29, lng: 69.24, region: 'Asia-Pacific', keywords: ['uzbekistan', 'tashkent'] },
  MN: { code: 'MN', name: 'Mongolia', lat: 47.88, lng: 106.90, region: 'Asia-Pacific', keywords: ['mongolia', 'ulaanbaatar'] },
  KH: { code: 'KH', name: 'Cambodia', lat: 11.55, lng: 104.91, region: 'Asia-Pacific', keywords: ['cambodia', 'phnom penh'] },
  LA: { code: 'LA', name: 'Laos', lat: 17.97, lng: 102.63, region: 'Asia-Pacific', keywords: ['laos', 'vientiane'] },
  QA: { code: 'QA', name: 'Qatar', lat: 25.28, lng: 51.53, region: 'Middle East & Africa', keywords: ['qatar', 'doha'] },
  KW: { code: 'KW', name: 'Kuwait', lat: 29.37, lng: 47.97, region: 'Middle East & Africa', keywords: ['kuwait'] },
  OM: { code: 'OM', name: 'Oman', lat: 23.58, lng: 58.40, region: 'Middle East & Africa', keywords: ['oman', 'muscat'] },
  BH: { code: 'BH', name: 'Bahrain', lat: 26.22, lng: 50.58, region: 'Middle East & Africa', keywords: ['bahrain', 'manama'] },
  JO: { code: 'JO', name: 'Jordan', lat: 31.94, lng: 35.92, region: 'Middle East & Africa', keywords: ['jordan', 'amman'] },
  MA: { code: 'MA', name: 'Morocco', lat: 34.02, lng: -6.83, region: 'Middle East & Africa', keywords: ['morocco', 'rabat', 'casablanca', 'marrakesh'] },
  DZ: { code: 'DZ', name: 'Algeria', lat: 36.75, lng: 3.05, region: 'Middle East & Africa', keywords: ['algeria', 'algiers'] },
  TN: { code: 'TN', name: 'Tunisia', lat: 36.80, lng: 10.18, region: 'Middle East & Africa', keywords: ['tunisia', 'tunis'] },
  LY: { code: 'LY', name: 'Libya', lat: 32.88, lng: 13.19, region: 'Middle East & Africa', keywords: ['libya', 'tripoli', 'benghazi'] },
  GH: { code: 'GH', name: 'Ghana', lat: 5.55, lng: -0.19, region: 'Middle East & Africa', keywords: ['ghana', 'accra'] },
  SN: { code: 'SN', name: 'Senegal', lat: 14.71, lng: -17.46, region: 'Middle East & Africa', keywords: ['senegal', 'dakar'] },
  TZ: { code: 'TZ', name: 'Tanzania', lat: -6.16, lng: 35.75, region: 'Middle East & Africa', keywords: ['tanzania', 'dar es salaam'] },
  UG: { code: 'UG', name: 'Uganda', lat: 0.34, lng: 32.58, region: 'Middle East & Africa', keywords: ['uganda', 'kampala'] },
  RW: { code: 'RW', name: 'Rwanda', lat: -1.94, lng: 30.06, region: 'Middle East & Africa', keywords: ['rwanda', 'kigali'] },
  AO: { code: 'AO', name: 'Angola', lat: -8.83, lng: 13.23, region: 'Middle East & Africa', keywords: ['angola', 'luanda'] },
  MZ: { code: 'MZ', name: 'Mozambique', lat: -25.96, lng: 32.57, region: 'Middle East & Africa', keywords: ['mozambique', 'maputo'] },
  ZW: { code: 'ZW', name: 'Zimbabwe', lat: -17.82, lng: 31.05, region: 'Middle East & Africa', keywords: ['zimbabwe', 'harare'] },
  ZM: { code: 'ZM', name: 'Zambia', lat: -15.38, lng: 28.32, region: 'Middle East & Africa', keywords: ['zambia', 'lusaka'] },
  SO: { code: 'SO', name: 'Somalia', lat: 2.04, lng: 45.31, region: 'Middle East & Africa', keywords: ['somalia', 'mogadishu'] },
  AT: { code: 'AT', name: 'Austria', lat: 48.20, lng: 16.37, region: 'Europe', keywords: ['austria', 'vienna'] },
  PT: { code: 'PT', name: 'Portugal', lat: 38.72, lng: -9.13, region: 'Europe', keywords: ['portugal', 'lisbon'] },
  IE: { code: 'IE', name: 'Ireland', lat: 53.34, lng: -6.26, region: 'Europe', keywords: ['ireland', 'irish', 'dublin'] },
  DK: { code: 'DK', name: 'Denmark', lat: 55.67, lng: 12.56, region: 'Europe', keywords: ['denmark', 'danish', 'copenhagen'] },
  FI: { code: 'FI', name: 'Finland', lat: 60.16, lng: 24.93, region: 'Europe', keywords: ['finland', 'finnish', 'helsinki'] },
  CZ: { code: 'CZ', name: 'Czechia', lat: 50.07, lng: 14.43, region: 'Europe', keywords: ['czech', 'prague'] },
  RO: { code: 'RO', name: 'Romania', lat: 44.42, lng: 26.10, region: 'Europe', keywords: ['romania', 'bucharest'] },
  HU: { code: 'HU', name: 'Hungary', lat: 47.49, lng: 19.04, region: 'Europe', keywords: ['hungary', 'budapest', 'orban'] },
  RS: { code: 'RS', name: 'Serbia', lat: 44.78, lng: 20.44, region: 'Europe', keywords: ['serbia', 'belgrade'] },
  BG: { code: 'BG', name: 'Bulgaria', lat: 42.69, lng: 23.32, region: 'Europe', keywords: ['bulgaria', 'sofia'] },
  HR: { code: 'HR', name: 'Croatia', lat: 45.81, lng: 15.98, region: 'Europe', keywords: ['croatia', 'zagreb'] },
  IS: { code: 'IS', name: 'Iceland', lat: 64.14, lng: -21.94, region: 'Europe', keywords: ['iceland', 'reykjavik'] },
  GE: { code: 'GE', name: 'Georgia', lat: 41.71, lng: 44.82, region: 'Europe', keywords: ['georgia', 'tbilisi'] },
  AM: { code: 'AM', name: 'Armenia', lat: 40.17, lng: 44.51, region: 'Europe', keywords: ['armenia', 'yerevan'] },
  AZ: { code: 'AZ', name: 'Azerbaijan', lat: 40.40, lng: 49.86, region: 'Europe', keywords: ['azerbaijan', 'baku'] },
  BY: { code: 'BY', name: 'Belarus', lat: 53.90, lng: 27.56, region: 'Europe', keywords: ['belarus', 'minsk'] },
  CU: { code: 'CU', name: 'Cuba', lat: 23.11, lng: -82.36, region: 'Americas', keywords: ['cuba', 'havana'] },
  DO: { code: 'DO', name: 'Dominican Republic', lat: 18.48, lng: -69.93, region: 'Americas', keywords: ['dominican', 'santo domingo'] },
  JM: { code: 'JM', name: 'Jamaica', lat: 18.01, lng: -76.80, region: 'Americas', keywords: ['jamaica', 'kingston'] },
  PA: { code: 'PA', name: 'Panama', lat: 8.98, lng: -79.51, region: 'Americas', keywords: ['panama'] },
  CR: { code: 'CR', name: 'Costa Rica', lat: 9.92, lng: -84.09, region: 'Americas', keywords: ['costa rica', 'san jose'] },
  GT: { code: 'GT', name: 'Guatemala', lat: 14.63, lng: -90.50, region: 'Americas', keywords: ['guatemala'] },
  EC: { code: 'EC', name: 'Ecuador', lat: -0.18, lng: -78.46, region: 'Americas', keywords: ['ecuador', 'quito', 'guayaquil'] },
  BO: { code: 'BO', name: 'Bolivia', lat: -16.48, lng: -68.11, region: 'Americas', keywords: ['bolivia', 'la paz'] },
  PY: { code: 'PY', name: 'Paraguay', lat: -25.26, lng: -57.57, region: 'Americas', keywords: ['paraguay', 'asuncion'] },
  UY: { code: 'UY', name: 'Uruguay', lat: -34.90, lng: -56.16, region: 'Americas', keywords: ['uruguay', 'montevideo'] },
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
  if (source.includes('WHO')) return 'Health';
  if (source.includes('Cyber') || source.includes('Hacker') || source.includes('CISA')) return 'Cyber';
  if (/ransomware|cyberattack|cyber|data breach|zero-day|cve-\d+|malware|phishing|ddos|hacked|hacker|vulnerability|exploit/.test(lower)) {
    return 'Cyber';
  }
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

// Accessible institutional topic palette for dark obsidian and warm archival paper
export const TOPIC_COLORS: Record<Topic, { hex: string; textClass: string; dotClass: string }> = {
  Conflict: { hex: '#E11D48', textClass: 'text-rose-500', dotClass: 'bg-rose-600' },
  Disaster: { hex: '#E05A2B', textClass: 'text-orange-500', dotClass: 'bg-orange-600' },
  Economy: { hex: '#D97706', textClass: 'text-amber-500', dotClass: 'bg-amber-600' },
  Markets: { hex: '#10B981', textClass: 'text-emerald-500', dotClass: 'bg-emerald-600' },
  Tech: { hex: '#0EA5E9', textClass: 'text-sky-500', dotClass: 'bg-sky-600' },
  Cyber: { hex: '#06B6D4', textClass: 'text-cyan-400', dotClass: 'bg-cyan-500' },
  Health: { hex: '#DB2777', textClass: 'text-pink-500', dotClass: 'bg-pink-600' },
  Climate: { hex: '#0D9488', textClass: 'text-teal-500', dotClass: 'bg-teal-600' },
  Politics: { hex: '#6366F1', textClass: 'text-indigo-400', dotClass: 'bg-indigo-500' },
  Science: { hex: '#8B5CF6', textClass: 'text-violet-400', dotClass: 'bg-violet-500' },
  Sports: { hex: '#65A30D', textClass: 'text-lime-500', dotClass: 'bg-lime-600' },
  Other: { hex: '#78716C', textClass: 'text-stone-400', dotClass: 'bg-stone-500' },
};

export const ALL_TOPICS: Topic[] = [
  'Politics',
  'Conflict',
  'Economy',
  'Markets',
  'Tech',
  'Cyber',
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
  'Cyber',
  'Health',
  'Climate',
];

const PUNJAB_KEYWORDS = [
  'punjab',
  'punjabi',
  'chandigarh',
  'amritsar',
  'ludhiana',
  'jalandhar',
  'patiala',
  'mohali',
  'bathinda',
  'hoshiarpur',
  'pathankot',
  'gurdaspur',
  'ferozepur',
  'sangrur',
  'moga',
  'kapurthala',
  'tarn taran',
  'rupnagar',
  'ropar',
  'faridkot',
  'muktsar',
  'mansa',
  'barnala',
  'fazilka',
  'malerkotla',
  'nawanshahr',
  'fatehgarh sahib',
  'golden temple',
  'harmandir sahib',
  'wagah',
  'attari',
  'sutlej',
  'beas',
  'bhagwant mann',
];

export function isPunjabRelatedText(text: string): boolean {
  const lower = text.toLowerCase();
  return PUNJAB_KEYWORDS.some((kw) => lower.includes(kw));
}

export function classifySourceType(sourceName: string): SourceTypeBadge {
  const lower = (sourceName || '').toLowerCase();
  if (
    lower.includes('usgs') ||
    lower.includes('eonet') ||
    lower.includes('nasa') ||
    lower.includes('who') ||
    lower.includes('cisa') ||
    lower.includes('ecb') ||
    lower.includes('world bank') ||
    lower.includes('open-meteo')
  ) {
    return 'Government/Sensor';
  }
  if (lower.includes('reuters') || lower.includes('ap') || lower.includes('afp') || lower.includes('pti') || lower.includes('ani')) {
    return 'Wire';
  }
  if (lower.includes('bbc') || lower.includes('al jazeera') || lower.includes('ndtv') || lower.includes('dd ') || lower.includes('cnn')) {
    return 'Broadcaster';
  }
  if (
    lower.includes('guardian') ||
    lower.includes('hindu') ||
    lower.includes('express') ||
    lower.includes('tribune') ||
    lower.includes('times') ||
    lower.includes('post')
  ) {
    return 'Newspaper';
  }
  return 'Social/Other';
}

export interface ContradictionAnalysis {
  hasDiff: boolean;
  versionA: { source: string; text: string; url: string };
  versionB: { source: string; text: string; url: string };
  reason: string;
}

export function detectStoryContradiction(story: Story): ContradictionAnalysis | null {
  if (!story.sources || story.sources.length < 2) return null;
  const s1 = story.sources[0];
  const s2 = story.sources[1];
  const numsInHeadline = story.headline.match(/\d+(\.\d+)?/g) || [];
  const timeGapMin = Math.abs((s1.time || story.time) - (s2.time || story.time)) / 60000;
  // Flag when multiple distinct outlets report with differing figures, developing status, or time divergence
  const hasDiff =
    s1.name !== s2.name &&
    (numsInHeadline.length > 0 || story.isDeveloping || timeGapMin > 25 || story.sources.length >= 2);

  if (!hasDiff) return null;

  return {
    hasDiff: true,
    versionA: {
      source: s1.name,
      text: `${story.headline} — Primary dispatch reported by ${s1.name} (${formatRelativeTime(s1.time || story.time)}).`,
      url: s1.url,
    },
    versionB: {
      source: s2.name,
      text: `${story.summary.slice(0, 140)} — Independent coverage filed by ${s2.name} (${formatRelativeTime(s2.time || story.time)}).`,
      url: s2.url,
    },
    reason:
      numsInHeadline.length > 0
        ? 'Outlets report varying figures or framing across dispatches'
        : 'Multiple independent outlets with separate dispatch framing',
  };
}

export function buildReportIssueMailto(subject: string, contextText: string): string {
  const safeSubj = encodeURIComponent(`[WorldPulse Report] ${subject.slice(0, 90)}`);
  const safeBody = encodeURIComponent(
    `Issue / Inaccuracy Report:\n\nContext:\n${contextText.slice(0, 500)}\n\nWhat appears inaccurate or needs review:\n[Please describe here]\n`
  );
  return `mailto:grievance@worldpulse.example?subject=${safeSubj}&body=${safeBody}`;
}

export function getDidYouMeanSuggestion(query: string): {
  type: 'topic' | 'country';
  label: string;
  value: string;
} | null {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return null;

  // Check topics first
  for (const topic of ALL_TOPICS) {
    const tLower = topic.toLowerCase();
    if (tLower.includes(q.slice(0, 3)) || q.includes(tLower.slice(0, 3))) {
      return { type: 'topic', label: topic, value: topic };
    }
  }

  // Check countries by name, code, or keyword prefix
  for (const meta of Object.values(COUNTRY_GAZETTEER)) {
    const nLower = meta.name.toLowerCase();
    if (
      nLower.startsWith(q.slice(0, 3)) ||
      nLower.includes(q.slice(0, 4)) ||
      meta.keywords.some((k) => k.startsWith(q.slice(0, 3)))
    ) {
      return { type: 'country', label: `${meta.name} (${meta.code})`, value: meta.code };
    }
  }

  return { type: 'topic', label: 'Conflict', value: 'Conflict' };
}

export const UI_TRANSLATIONS: Record<
  'en' | 'hi' | 'pa',
  Record<string, string>
> = {
  en: {
    overview: 'Overview',
    countries: 'All Countries',
    india: 'India (IN)',
    punjabFilter: 'Punjab Focus',
    cyber: 'Cyber',
    health: 'Health (WHO)',
    conflict: 'Conflict (ACLED)',
    myfeed: 'My Feed',
    saved: 'Saved',
    askWorld: 'Ask the World',
    compareCountries: 'Compare Countries',
    alertsAndAccount: 'Account & Alerts',
    devApi: 'Developer API & Embed',
    collectingData: 'Collecting data, check back soon',
    updatedAgo: 'Data updated',
    minAgo: 'min ago',
    show7Plus: 'Show 7+ Only',
    minImportance: 'Min Importance',
    voiceBriefing: 'Listen',
    translateSummary: 'Translate',
    aiTranslated: 'AI translated',
    aiDisclaimerShort: 'AI-generated, may be inaccurate — always verify original sources.',
    reportIssue: 'Report wrong answer / issue',
    sourcesDiffer: 'Sources differ',
    sourceDiversity: 'Source diversity',
    confirmed: 'Confirmed',
    developing: 'Developing',
    skipToContent: 'Skip to main content',
    openDashboard: 'Open the dashboard',
    seeHowItWorks: 'See how it works',
    askWorldPlaceholder: 'Ask the world anything…',
    liveBadge: 'Live · updated every 30 minutes',
    heroHeadline: 'The world, live. In one pulse.',
    heroSubhead:
      'Every major global headline, earthquake, market move, and sovereign briefing from the last 24 hours — verified, ranked 1–10, and mapped in one quiet workspace.',
    clearAll: 'Clear all',
    savePreset: 'Save preset',
    didYouMean: 'Did you mean:',
    liteModeActive: 'Low-Bandwidth Lite Mode Active (Map tiles & heavy visuals deferred)',
    privacyPolicy: 'Privacy Policy',
    termsOfUse: 'Terms of Use',
    aiDisclaimer: 'AI Disclaimer',
    cookieNotice: 'Cookie Notice',
    sourcesMethodology: 'Sources & Methodology',
    accessibilityStatement: 'Accessibility Statement',
    responsibleAi: 'Responsible AI & Transparency',
    contactGrievance: 'Contact & Grievance',
    about: 'About',
    changelog: 'Changelog',
    sendFeedback: 'Send feedback',
  },
  hi: {
    overview: 'मुख्य पटल (Overview)',
    countries: 'सभी देश (All Countries)',
    india: 'भारत (India)',
    punjabFilter: 'पंजाब फ़िल्टर (Punjab)',
    cyber: 'साइबर सुरक्षा (Cyber)',
    health: 'स्वास्थ्य (WHO)',
    conflict: 'संघर्ष ट्रैकर (Conflict)',
    myfeed: 'मेरी फ़ीड (My Feed)',
    saved: 'सहेजे गए (Saved)',
    askWorld: 'विश्व से पूछें (Ask World)',
    compareCountries: 'देशों की तुलना (Compare)',
    alertsAndAccount: 'खाता और अलर्ट (Alerts)',
    devApi: 'डेवलपर API (Dev API)',
    collectingData: 'डेटा एकत्र किया जा रहा है, कृपया शीघ्र ही पुनः जाँचें (Collecting data, check back soon)',
    updatedAgo: 'डेटा अपडेट:',
    minAgo: 'मिनट पहले',
    show7Plus: 'केवल 7+ दिखाएं',
    minImportance: 'न्यूनतम महत्व',
    voiceBriefing: 'सुनें (Listen)',
    translateSummary: 'अनुवाद करें',
    aiTranslated: 'AI द्वारा अनुवादित',
    aiDisclaimerShort: 'AI-जनित सारांश, त्रुटिपूर्ण हो सकता है — हमेशा मूल स्रोत जाँचें।',
    reportIssue: 'गलत उत्तर / समस्या रिपोर्ट करें',
    sourcesDiffer: 'स्रोत भिन्न हैं',
    sourceDiversity: 'स्रोत विविधता',
    confirmed: 'पुष्ट (Confirmed)',
    developing: 'विकासशील (Developing)',
    skipToContent: 'मुख्य सामग्री पर जाएं',
    openDashboard: 'लाइव डैशबोर्ड खोलें',
    seeHowItWorks: 'जानें यह कैसे काम करता है',
    askWorldPlaceholder: 'दुनिया से कुछ भी पूछें…',
    liveBadge: 'लाइव · हर 30 मिनट में अपडेट',
    heroHeadline: 'दुनिया, लाइव। एक धड़कन में। (The world, live. In one pulse.)',
    heroSubhead:
      'पिछले 24 घंटों की हर प्रमुख वैश्विक खबर, भूकंप, बाज़ार हलचल और संप्रभु ब्रीफिंग — एक शांत, सत्यापित डैशबोर्ड में।',
    clearAll: 'सभी साफ़ करें',
    savePreset: 'प्रीसेट सहेजें',
    didYouMean: 'क्या आपका मतलब था:',
    liteModeActive: 'लो-बैंडविड्थ लाइट मोड सक्रिय (मैਪ टाइल्स बंद हैं)',
    privacyPolicy: 'गोपनीयता नीति (Privacy)',
    termsOfUse: 'उपयोग की शर्तें (Terms)',
    aiDisclaimer: 'AI अस्वीकरण (AI Disclaimer)',
    cookieNotice: 'कुकी सूचना (Cookies)',
    sourcesMethodology: 'स्रोत और कार्यप्रणाली (Methodology)',
    accessibilityStatement: 'सुगम्यता विवरण (Accessibility)',
    responsibleAi: 'ज़िम्मेदार AI (Responsible AI)',
    contactGrievance: 'संपर्क और शिकायत (Contact)',
    about: 'हमारे बारे में (About)',
    changelog: 'बदलाव लॉग (Changelog)',
    sendFeedback: 'प्रतिक्रिया भेजें (Feedback)',
  },
  pa: {
    overview: 'ਮੁੱਖ ਪੰਨਾ (Overview)',
    countries: 'ਸਾਰੇ ਦੇਸ਼ (All Countries)',
    india: 'ਭਾਰਤ (India)',
    punjabFilter: 'ਪੰਜਾਬ ਫਿਲਟਰ (Punjab)',
    cyber: 'ਸਾਈਬਰ ਸੁਰੱਖਿਆ (Cyber)',
    health: 'ਸਿਹਤ (WHO)',
    conflict: 'ਟਕਰਾਅ ਟਰੈਕਰ (Conflict)',
    myfeed: 'ਮੇਰੀ ਫੀਡ (My Feed)',
    saved: 'ਸੰਭਾਲੀਆਂ ਖਬਰਾਂ (Saved)',
    askWorld: 'ਦੁਨੀਆ ਨੂੰ ਪੁੱਛੋ (Ask World)',
    compareCountries: 'ਦੇਸ਼ਾਂ ਦੀ ਤੁਲਨਾ (Compare)',
    alertsAndAccount: 'ਖਾਤਾ ਅਤੇ ਅਲਰਟ (Alerts)',
    devApi: 'ਡਿਵੈਲਪਰ API (Dev API)',
    collectingData: 'ਡੇਟਾ ਇਕੱਠਾ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ, ਜਲਦੀ ਦੁਬਾਰਾ ਚੈੱਕ ਕਰੋ (Collecting data, check back soon)',
    updatedAgo: 'ਡੇਟਾ ਅਪਡੇਟ:',
    minAgo: 'ਮਿੰਟ ਪਹਿਲਾਂ',
    show7Plus: 'ਸਿਰਫ਼ 7+ ਦਿਖਾਓ',
    minImportance: 'ਘੱਟੋ-ਘੱਟ ਮਹੱਤਤਾ',
    voiceBriefing: 'ਸੁਣੋ (Listen)',
    translateSummary: 'ਅਨੁਵਾਦ ਕਰੋ',
    aiTranslated: 'AI ਦੁਆਰਾ ਅਨੁਵਾਦਿਤ',
    aiDisclaimerShort: 'AI-ਤਿਆਰ ਸੰਖੇਪ, ਗਲਤ ਹੋ ਸਕਦਾ ਹੈ — ਹਮੇਸ਼ਾ ਅਸਲ ਸਰੋਤ ਚੈੱਕ ਕਰੋ।',
    reportIssue: 'ਗਲਤ ਜਵਾਬ / ਸਮੱਸਿਆ ਦੱਸੋ',
    sourcesDiffer: 'ਸਰੋਤ ਵੱਖਰੇ ਹਨ',
    sourceDiversity: 'ਸਰੋਤ ਵਿਭਿੰਨਤਾ',
    confirmed: 'ਪੁਸ਼ਟੀ ਕੀਤੀ (Confirmed)',
    developing: 'ਵਿਕਾਸਸ਼ੀਲ (Developing)',
    skipToContent: 'ਮੁੱਖ ਸਮੱਗਰੀ ਤੇ ਜਾਓ',
    openDashboard: 'ਲਾਈਵ ਡੈਸ਼ਬੋਰਡ ਖੋਲ੍ਹੋ',
    seeHowItWorks: 'ਦੇਖੋ ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ',
    askWorldPlaceholder: 'ਦੁਨੀਆ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ…',
    liveBadge: 'ਲਾਈਵ · ਹਰ 30 ਮਿੰਟ ਬਾਅਦ ਅਪਡੇਟ',
    heroHeadline: 'ਦੁਨੀਆ, ਲਾਈਵ। ਇਕੋ ਪਲਸ ਵਿੱਚ। (The world, live. In one pulse.)',
    heroSubhead:
      'ਪਿਛਲੇ 24 ਘੰਟਿਆਂ ਦੀਆਂ ਪ੍ਰਮੁੱਖ ਗਲੋਬਲ ਖਬਰਾਂ, ਭੂਚਾਲ, ਮਾਰਕੀਟ ਹਲਚਲ ਅਤੇ ਬ੍ਰੀਫਿੰਗ — ਇੱਕੋ ਥਾਂ ਤੇ।',
    clearAll: 'ਸਭ ਸਾਫ਼ ਕਰੋ',
    savePreset: 'ਪ੍ਰੀਸੈੱਟ ਸੇਵ ਕਰੋ',
    didYouMean: 'ਕੀ ਤੁਹਾਡਾ ਮਤਲਬ ਸੀ:',
    liteModeActive: 'ਲੋ-ਬੈਂਡਵਿਡਥ ਲਾਈਟ ਮੋਡ ਚਾਲੂ ਹੈ',
    privacyPolicy: 'ਪਰਦੇਦਾਰੀ ਨੀਤੀ (Privacy)',
    termsOfUse: 'ਵਰਤੋਂ ਦੀਆਂ ਸ਼ਰਤਾਂ (Terms)',
    aiDisclaimer: 'AI ਬੇਦਾਅਵਾ (AI Disclaimer)',
    cookieNotice: 'ਕੂਕੀ ਨੋਟਿਸ (Cookies)',
    sourcesMethodology: 'ਸਰੋਤ ਅਤੇ ਵਿਧੀ (Methodology)',
    accessibilityStatement: 'ਪਹੁੰਚਯੋਗਤਾ ਬਿਆਨ (Accessibility)',
    responsibleAi: 'ਜ਼ਿੰਮੇਵਾਰ AI (Responsible AI)',
    contactGrievance: 'ਸੰਪਰਕ ਅਤੇ ਸ਼ਿਕਾਇਤ (Contact)',
    about: 'ਸਾਡੇ ਬਾਰੇ (About)',
    changelog: 'ਬਦਲਾਅ ਲੌਗ (Changelog)',
    sendFeedback: 'ਫੀਡਬੈਕ ਭੇਜੋ (Feedback)',
  },
};

// Full Boolean Search Query Evaluator: AND, OR, "exact phrase", and -exclusion / NOT term
export function evaluateSearchQuery(story: Story, rawQuery: string): boolean {
  const q = (rawQuery || '').trim();
  if (!q) return true;

  const haystack = `${story.headline} ${story.summary} ${story.countryName} ${story.country} ${story.topic} ${(story.sources || [])
    .map((s) => s.name)
    .join(' ')}`.toLowerCase();

  // Support top-level OR groups
  const orGroups = q.split(/\s+OR\s+/i);

  return orGroups.some((orPart) => {
    // Check for negative exclusions (e.g. -cricket or NOT cricket)
    const negativeTerms: string[] = [];
    let cleanPart = orPart.replace(/\s+NOT\s+([^\s]+)/gi, (_, term) => {
      negativeTerms.push(term.toLowerCase());
      return ' ';
    });

    cleanPart = cleanPart.replace(/(?:^|\s)-([^\s]+)/g, (_, term) => {
      negativeTerms.push(term.toLowerCase());
      return ' ';
    });

    // Check if any negative term is present in haystack
    for (const neg of negativeTerms) {
      if (neg && haystack.includes(neg)) {
        return false;
      }
    }

    // Extract exact phrases
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


