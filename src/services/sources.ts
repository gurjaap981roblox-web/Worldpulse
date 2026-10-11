import {
  CityWeather,
  CoinMarket,
  RawFeedItem,
  SourceId,
  SourceStatus,
  WikiTrend,
} from '../types';
import {
  getCountryMeta,
  inferCountryFromCoords,
  sanitizeText,
  sanitizeUrl,
} from '../utils/sanitize';

export const INITIAL_SOURCE_STATUSES: Record<SourceId, SourceStatus> = {
  usgs: { id: 'usgs', name: 'USGS Earthquakes (M4.5+)', category: 'Seismic', status: 'loading', lastSuccess: null, itemCount: 0 },
  eonet: { id: 'eonet', name: 'NASA EONET Natural Events', category: 'Disasters', status: 'loading', lastSuccess: null, itemCount: 0 },
  bbc: { id: 'bbc', name: 'BBC World News RSS', category: 'News Wire', status: 'loading', lastSuccess: null, itemCount: 0 },
  aljazeera: { id: 'aljazeera', name: 'Al Jazeera Global RSS', category: 'News Wire', status: 'loading', lastSuccess: null, itemCount: 0 },
  reuters: { id: 'reuters', name: 'Reuters World Wire', category: 'News Wire', status: 'loading', lastSuccess: null, itemCount: 0 },
  gdelt: { id: 'gdelt', name: 'GDELT DOC 2.0 Global', category: 'Global Media', status: 'loading', lastSuccess: null, itemCount: 0 },
  coingecko: { id: 'coingecko', name: 'CoinGecko Top 10 Crypto', category: 'Markets', status: 'loading', lastSuccess: null, itemCount: 0 },
  openmeteo: { id: 'openmeteo', name: 'Open-Meteo Top 10 Cities', category: 'Weather', status: 'loading', lastSuccess: null, itemCount: 0 },
  wikipedia: { id: 'wikipedia', name: 'Wikipedia Most Viewed', category: 'Trends', status: 'loading', lastSuccess: null, itemCount: 0 },
};

const TOP_10_CITIES = [
  { city: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503 },
  { city: 'New Delhi', country: 'IN', lat: 28.6139, lng: 77.2090 },
  { city: 'Shanghai', country: 'CN', lat: 31.2304, lng: 121.4737 },
  { city: 'São Paulo', country: 'BR', lat: -23.5505, lng: -46.6333 },
  { city: 'Mexico City', country: 'MX', lat: 19.4326, lng: -99.1332 },
  { city: 'Cairo', country: 'EG', lat: 30.0444, lng: 31.2357 },
  { city: 'Mumbai', country: 'IN', lat: 19.0760, lng: 72.8777 },
  { city: 'Beijing', country: 'CN', lat: 39.9042, lng: 116.4074 },
  { city: 'Dhaka', country: 'BD', lat: 23.8103, lng: 90.4125 },
  { city: 'New York', country: 'US', lat: 40.7128, lng: -74.0060 },
];

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 8500): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// 1. USGS Earthquakes (GeoJSON feed, last 24h, magnitude 4.5+)
async function fetchUsgsEarthquakes(): Promise<RawFeedItem[]> {
  interface UsgsFeature {
    id: string;
    properties: {
      mag: number;
      place: string;
      time: number;
      url: string;
      title: string;
      tsunami?: number;
    };
    geometry: {
      coordinates: [number, number, number];
    };
  }
  const data = await fetchJsonWithTimeout<{ features: UsgsFeature[] }>(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson'
  );

  return (data.features || []).slice(0, 22).map((f) => {
    const [lng, lat, depthKm] = f.geometry?.coordinates || [0, 0, 10];
    const mag = Number(f.properties?.mag || 4.5);
    const place = sanitizeText(f.properties?.place || 'Unknown region', 140);
    const byText = getCountryMeta('', place);
    const countryMeta = byText.code !== 'GL' ? byText : inferCountryFromCoords(lat, lng);
    const tsunamiNote = f.properties?.tsunami ? ' Tsunami advisory evaluated.' : '';

    return {
      id: `usgs-${f.id}`,
      source: 'USGS Seismic',
      title: sanitizeText(`M${mag.toFixed(1)} Earthquake — ${place}`, 180),
      text: sanitizeText(
        `Magnitude ${mag.toFixed(1)} seismic event recorded ${place} at a depth of ${Math.round(depthKm)} km.${tsunamiNote}`,
        320
      ),
      url: sanitizeUrl(f.properties?.url || 'https://earthquake.usgs.gov/earthquakes/map/'),
      time: f.properties?.time || Date.now(),
      country: countryMeta.code,
      lat,
      lng,
      magnitude: mag,
      depthKm: Math.round(depthKm),
      disasterCategory: 'Earthquake',
    };
  });
}

// 2. NASA EONET (open natural events: wildfires, storms, volcanoes, floods)
async function fetchNasaEonet(): Promise<RawFeedItem[]> {
  interface EonetEvent {
    id: string;
    title: string;
    link?: string;
    categories?: Array<{ id: string; title: string }>;
    sources?: Array<{ id: string; url: string }>;
    geometry?: Array<{
      date: string;
      type: string;
      coordinates: unknown;
      magnitudeValue?: number;
    }>;
  }

  const data = await fetchJsonWithTimeout<{ events: EonetEvent[] }>(
    'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=18'
  );

  const items: RawFeedItem[] = [];
  for (const ev of data.events || []) {
    const geomList = ev.geometry || [];
    const latestGeom = geomList[geomList.length - 1];
    if (!latestGeom) continue;

    let lng = 0;
    let lat = 0;
    const coords = latestGeom.coordinates;
    if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      lng = coords[0];
      lat = coords[1];
    } else if (Array.isArray(coords) && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
      lng = Number(coords[0][0][0]) || 0;
      lat = Number(coords[0][0][1]) || 0;
    }

    const catTitle = sanitizeText(ev.categories?.[0]?.title || 'Natural Event', 60);
    const title = sanitizeText(ev.title, 180);
    const byText = getCountryMeta('', title);
    const countryMeta = byText.code !== 'GL' ? byText : inferCountryFromCoords(lat, lng);
    const sourceUrl = sanitizeUrl(
      ev.sources?.[0]?.url || ev.link || 'https://eonet.gsfc.nasa.gov/'
    );
    const parsedTime = latestGeom.date ? Date.parse(latestGeom.date) : Date.now();

    items.push({
      id: `eonet-${ev.id}`,
      source: 'NASA EONET',
      title: `${catTitle}: ${title}`,
      text: `Active ${catTitle.toLowerCase()} tracked by NASA Earth Observatory Natural Event Tracker (${title}). Coordinates: ${lat.toFixed(2)}°, ${lng.toFixed(2)}°.`,
      url: sourceUrl,
      time: Number.isNaN(parsedTime) ? Date.now() : parsedTime,
      country: countryMeta.code,
      lat,
      lng,
      disasterCategory: catTitle,
    });
  }
  return items;
}

// 3. News RSS via Server Proxy (BBC, Al Jazeera, Reuters)
async function fetchRssSource(sourceKey: 'bbc' | 'aljazeera' | 'reuters'): Promise<RawFeedItem[]> {
  interface ProxyRssResponse {
    source: string;
    status: string;
    items: Array<{
      title: string;
      text: string;
      url: string;
      time: number;
      source: string;
    }>;
  }

  const data = await fetchJsonWithTimeout<ProxyRssResponse>(
    `/api/proxy/rss?source=${sourceKey}`,
    9000
  );

  return (data.items || []).slice(0, 14).map((item, idx) => {
    const cleanTitle = sanitizeText(item.title, 200);
    const cleanText = sanitizeText(item.text, 340);
    const countryMeta = getCountryMeta('', `${cleanTitle} ${cleanText}`);
    // Add slight deterministic jitter around country centroid so dots in the same country don't overlap identically
    const hash = cleanTitle.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), idx);
    const latJitter = ((hash % 19) - 9) * 0.22;
    const lngJitter = (((hash * 7) % 19) - 9) * 0.25;

    return {
      id: `rss-${sourceKey}-${hash}-${idx}`,
      source: item.source || sourceKey.toUpperCase(),
      title: cleanTitle,
      text: cleanText,
      url: sanitizeUrl(item.url),
      time: item.time || Date.now(),
      country: countryMeta.code,
      lat: Math.max(-80, Math.min(80, countryMeta.lat + latJitter)),
      lng: Math.max(-179, Math.min(179, countryMeta.lng + lngJitter)),
    };
  });
}

// 4. GDELT DOC 2.0 API (direct CORS with proxy fallback)
function parseGdeltDate(seendate?: string): number {
  if (!seendate || seendate.length < 14) return Date.now();
  // Format: YYYYMMDDTHHMMSSZ
  const y = seendate.slice(0, 4);
  const m = seendate.slice(4, 6);
  const d = seendate.slice(6, 8);
  const hh = seendate.slice(9, 11);
  const mm = seendate.slice(11, 13);
  const ss = seendate.slice(13, 15);
  const parsed = Date.parse(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

async function fetchGdeltArticles(): Promise<RawFeedItem[]> {
  interface GdeltArticle {
    url: string;
    title: string;
    seendate?: string;
    domain?: string;
    sourcecountry?: string;
  }

  let articles: GdeltArticle[] = [];
  try {
    const direct = await fetchJsonWithTimeout<{ articles?: GdeltArticle[] }>(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=sourcelang:eng&mode=artlist&maxrecords=18&format=json&sort=HybridRel',
      6500
    );
    articles = direct.articles || [];
  } catch {
    const proxied = await fetchJsonWithTimeout<{ articles?: GdeltArticle[] }>(
      '/api/proxy/gdelt',
      8000
    );
    articles = proxied.articles || [];
  }

  return articles
    .filter((a) => a.title && a.url)
    .slice(0, 14)
    .map((a, idx) => {
      const cleanTitle = sanitizeText(a.title, 200);
      const countryMeta = getCountryMeta(a.sourcecountry || '', cleanTitle);
      const hash = cleanTitle.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), idx);
      const latJitter = ((hash % 17) - 8) * 0.25;
      const lngJitter = (((hash * 5) % 17) - 8) * 0.25;

      return {
        id: `gdelt-${hash}-${idx}`,
        source: `GDELT · ${sanitizeText(a.domain || 'Global', 35)}`,
        title: cleanTitle,
        text: `${cleanTitle} (Reported via ${sanitizeText(a.domain || 'GDELT Global Knowledge Graph', 50)}).`,
        url: sanitizeUrl(a.url),
        time: parseGdeltDate(a.seendate),
        country: countryMeta.code,
        lat: Math.max(-80, Math.min(80, countryMeta.lat + latJitter)),
        lng: Math.max(-179, Math.min(179, countryMeta.lng + lngJitter)),
      };
    });
}

// 5. CoinGecko Top 10 Coins
async function fetchCoinGeckoMarkets(): Promise<{
  coins: CoinMarket[];
  marketItems: RawFeedItem[];
}> {
  interface CoinGeckoRow {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    market_cap: number;
    price_change_percentage_24h: number;
    sparkline_in_7d?: { price: number[] };
  }

  const rows = await fetchJsonWithTimeout<CoinGeckoRow[]>(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h'
  );

  const coins: CoinMarket[] = (rows || []).map((r) => {
    const rawSpark = r.sparkline_in_7d?.price || [];
    const step = Math.max(1, Math.floor(rawSpark.length / 14));
    const sampled = rawSpark.filter((_, i) => i % step === 0).slice(-14);

    return {
      id: r.id,
      symbol: (r.symbol || '').toUpperCase(),
      name: sanitizeText(r.name, 40),
      currentPrice: Number(r.current_price || 0),
      change24h: Number(r.price_change_percentage_24h || 0),
      marketCap: Number(r.market_cap || 0),
      sparkline: sampled.length > 1 ? sampled : [r.current_price, r.current_price],
      url: `https://www.coingecko.com/en/coins/${encodeURIComponent(r.id)}`,
    };
  });

  // Create market stories for notable 24h crypto market moves
  const marketItems: RawFeedItem[] = [];
  const notable = coins.filter((c, idx) => idx === 0 || Math.abs(c.change24h) >= 4.0).slice(0, 3);
  for (const c of notable) {
    const dir = c.change24h >= 0 ? 'gains' : 'declines';
    const sign = c.change24h >= 0 ? '+' : '';
    marketItems.push({
      id: `cg-${c.id}-${new Date().toISOString().slice(0, 13)}`,
      source: 'CoinGecko Markets',
      title: `${c.name} (${c.symbol}) ${dir} ${sign}${c.change24h.toFixed(2)}% in 24h trading at $${c.currentPrice.toLocaleString()}`,
      text: `Global digital asset market tracking: ${c.name} (${c.symbol}) is trading at $${c.currentPrice.toLocaleString()} USD with a 24-hour move of ${sign}${c.change24h.toFixed(2)}% and market cap of $${Math.round(c.marketCap / 1e9)}B.`,
      url: c.url,
      time: Date.now(),
      country: 'US',
      lat: 40.71,
      lng: -74.01,
    });
  }

  return { coins, marketItems };
}

// 6. Open-Meteo Weather & Severe Alerts for Top 10 Global Cities
function decodeWmoWeather(code: number, windKmh: number, tempC: number): {
  label: string;
  isSevere: boolean;
  alertText?: string;
} {
  let label = 'Clear / Partly Cloudy';
  let isSevere = false;
  let alertText: string | undefined;

  if (code === 0) label = 'Clear Sky';
  else if (code <= 3) label = 'Partly Cloudy';
  else if (code === 45 || code === 48) label = 'Dense Fog';
  else if (code >= 51 && code <= 57) label = 'Drizzle';
  else if (code >= 61 && code <= 65) label = code === 65 ? 'Heavy Rain' : 'Rain';
  else if (code >= 71 && code <= 77) label = code >= 75 ? 'Heavy Snow' : 'Snow';
  else if (code >= 80 && code <= 82) label = code === 82 ? 'Violent Rain Showers' : 'Rain Showers';
  else if (code >= 95) label = 'Thunderstorm';

  if (code >= 95) {
    isSevere = true;
    alertText = 'Active thunderstorm warning';
  } else if (code === 65 || code === 82) {
    isSevere = true;
    alertText = 'Heavy precipitation & flash flood watch';
  } else if (windKmh >= 42) {
    isSevere = true;
    alertText = `High wind advisory (${Math.round(windKmh)} km/h)`;
  } else if (tempC >= 38) {
    isSevere = true;
    alertText = `Extreme heat alert (${Math.round(tempC)}°C)`;
  }

  return { label, isSevere, alertText };
}

async function fetchOpenMeteoCities(): Promise<{
  weather: CityWeather[];
  weatherItems: RawFeedItem[];
}> {
  const lats = TOP_10_CITIES.map((c) => c.lat).join(',');
  const lngs = TOP_10_CITIES.map((c) => c.lng).join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;

  interface MeteoSingle {
    current?: {
      temperature_2m?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
  }

  const data = await fetchJsonWithTimeout<MeteoSingle[]>(url);
  const list = Array.isArray(data) ? data : [data];

  const weather: CityWeather[] = [];
  const weatherItems: RawFeedItem[] = [];

  TOP_10_CITIES.forEach((cityMeta, idx) => {
    const curr = list[idx]?.current;
    const tempC = Number(curr?.temperature_2m ?? 22);
    const windKmh = Number(curr?.wind_speed_10m ?? 10);
    const code = Number(curr?.weather_code ?? 1);
    const decoded = decodeWmoWeather(code, windKmh, tempC);

    const entry: CityWeather = {
      city: cityMeta.city,
      country: cityMeta.country,
      lat: cityMeta.lat,
      lng: cityMeta.lng,
      tempC,
      windKmh,
      weatherCode: code,
      conditionLabel: decoded.label,
      isSevere: decoded.isSevere,
      alertText: decoded.alertText,
    };
    weather.push(entry);

    if (decoded.isSevere) {
      weatherItems.push({
        id: `meteo-${cityMeta.city.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}`,
        source: 'Open-Meteo Alert',
        title: `Weather Alert in ${cityMeta.city}: ${decoded.alertText || decoded.label} (${Math.round(tempC)}°C)`,
        text: `Open-Meteo meteorological telemetry for ${cityMeta.city} (${cityMeta.country}) reports ${decoded.label.toLowerCase()} with temperatures at ${tempC.toFixed(1)}°C and wind speeds of ${windKmh.toFixed(1)} km/h.`,
        url: `https://open-meteo.com/en/docs#latitude=${cityMeta.lat}&longitude=${cityMeta.lng}`,
        time: Date.now(),
        country: cityMeta.country,
        lat: cityMeta.lat,
        lng: cityMeta.lng,
        disasterCategory: 'Severe Weather',
      });
    }
  });

  return { weather, weatherItems };
}

// 7. Wikipedia "Most Viewed" API
async function fetchWikipediaMostViewed(): Promise<WikiTrend[]> {
  interface WikiArticle {
    article: string;
    views: number;
    rank: number;
  }
  interface WikiResponse {
    items?: Array<{
      articles?: WikiArticle[];
    }>;
  }

  const ignoredPrefixes = [
    'Main_Page',
    'Special:',
    'Wikipedia:',
    'Portal:',
    'Help:',
    'File:',
    'Deaths_in_',
    'Cleopatra',
    'XXX',
  ];

  // Try yesterday UTC, then 2 days ago UTC (Wikimedia publishes daily pageviews after UTC midnight)
  for (let daysBack = 1; daysBack <= 3; daysBack++) {
    try {
      const d = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${yyyy}/${mm}/${dd}`;

      const data = await fetchJsonWithTimeout<WikiResponse>(url, 6500);
      const rawArticles = data.items?.[0]?.articles || [];
      const filtered = rawArticles
        .filter(
          (a) =>
            a.article &&
            !ignoredPrefixes.some((prefix) => a.article.startsWith(prefix)) &&
            a.article.length > 2
        )
        .slice(0, 10)
        .map((a, idx) => ({
          title: a.article,
          displayTitle: sanitizeText(a.article.replace(/_/g, ' '), 80),
          views: a.views,
          rank: idx + 1,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(a.article)}`,
        }));

      if (filtered.length > 0) {
        return filtered;
      }
    } catch {
      // try previous day
    }
  }
  throw new Error('Wikipedia pageviews unavailable');
}

export interface AllSourcesFetchResult {
  rawItems: RawFeedItem[];
  coins: CoinMarket[];
  weather: CityWeather[];
  wikiTrends: WikiTrend[];
  statuses: Record<SourceId, SourceStatus>;
}

export async function fetchAllWorldSources(
  previousStatuses: Record<SourceId, SourceStatus>
): Promise<AllSourcesFetchResult> {
  const statuses: Record<SourceId, SourceStatus> = { ...previousStatuses };
  const rawItems: RawFeedItem[] = [];
  let coins: CoinMarket[] = [];
  let weather: CityWeather[] = [];
  let wikiTrends: WikiTrend[] = [];

  const updateStatus = (
    id: SourceId,
    ok: boolean,
    count: number,
    err?: unknown
  ) => {
    const prev = previousStatuses[id] || INITIAL_SOURCE_STATUSES[id];
    statuses[id] = {
      ...prev,
      status: ok ? 'ok' : 'warning',
      lastSuccess: ok ? Date.now() : prev.lastSuccess,
      itemCount: count,
      errorMessage: ok
        ? undefined
        : err instanceof Error
        ? err.message
        : 'Source temporarily unreachable',
    };
  };

  await Promise.allSettled([
    fetchUsgsEarthquakes()
      .then((items) => {
        rawItems.push(...items);
        updateStatus('usgs', true, items.length);
      })
      .catch((err) => updateStatus('usgs', false, 0, err)),

    fetchNasaEonet()
      .then((items) => {
        rawItems.push(...items);
        updateStatus('eonet', true, items.length);
      })
      .catch((err) => updateStatus('eonet', false, 0, err)),

    fetchRssSource('bbc')
      .then((items) => {
        rawItems.push(...items);
        updateStatus('bbc', true, items.length);
      })
      .catch((err) => updateStatus('bbc', false, 0, err)),

    fetchRssSource('aljazeera')
      .then((items) => {
        rawItems.push(...items);
        updateStatus('aljazeera', true, items.length);
      })
      .catch((err) => updateStatus('aljazeera', false, 0, err)),

    fetchRssSource('reuters')
      .then((items) => {
        rawItems.push(...items);
        updateStatus('reuters', true, items.length);
      })
      .catch((err) => updateStatus('reuters', false, 0, err)),

    fetchGdeltArticles()
      .then((items) => {
        rawItems.push(...items);
        updateStatus('gdelt', true, items.length);
      })
      .catch((err) => updateStatus('gdelt', false, 0, err)),

    fetchCoinGeckoMarkets()
      .then((res) => {
        coins = res.coins;
        rawItems.push(...res.marketItems);
        updateStatus('coingecko', true, res.coins.length);
      })
      .catch((err) => updateStatus('coingecko', false, 0, err)),

    fetchOpenMeteoCities()
      .then((res) => {
        weather = res.weather;
        rawItems.push(...res.weatherItems);
        updateStatus('openmeteo', true, res.weather.length);
      })
      .catch((err) => updateStatus('openmeteo', false, 0, err)),

    fetchWikipediaMostViewed()
      .then((trends) => {
        wikiTrends = trends;
        updateStatus('wikipedia', true, trends.length);
      })
      .catch((err) => updateStatus('wikipedia', false, 0, err)),
  ]);

  return {
    rawItems,
    coins,
    weather,
    wikiTrends,
    statuses,
  };
}
