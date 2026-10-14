import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: '/',
          name: 'WorldPulse – Live World News, Map & Daily Briefing',
          short_name: 'WorldPulse',
          description: 'Live world-monitoring situation room aggregating global news, seismic tremors, natural disasters, financial markets, and Gemini AI synthesis in real time.',
          theme_color: '#050B16',
          background_color: '#050B16',
          display: 'standalone',
          start_url: '/app',
          scope: '/',
          orientation: 'any',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          navigateFallback: null,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            // 1. Exclude every request to /api/*, to *.supabase.co, and to any external API (USGS, NASA, CoinGecko, Open-Meteo, GDELT, Wikipedia) from SW cache (NetworkOnly)
            {
              urlPattern: ({ url }) => {
                const path = url.pathname;
                const host = url.hostname.toLowerCase();
                return (
                  path.startsWith('/api/') ||
                  host.includes('supabase.co') ||
                  host.includes('usgs.gov') ||
                  host.includes('nasa.gov') ||
                  host.includes('coingecko.com') ||
                  host.includes('open-meteo.com') ||
                  host.includes('gdeltproject.org') ||
                  host.includes('wikipedia.org') ||
                  host.includes('frankfurter.app') ||
                  host.includes('yahoo.com')
                );
              },
              handler: 'NetworkOnly',
            },
            // 2. Cache index.html with NetworkFirst
            {
              urlPattern: ({ request, url }) => {
                return (
                  request.mode === 'navigate' ||
                  url.pathname === '/' ||
                  url.pathname === '/index.html' ||
                  url.pathname === '/app'
                );
              },
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-cache',
                networkTimeoutSeconds: 3,
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 3. Cache hashed JS/CSS with CacheFirst
            {
              urlPattern: ({ request, url }) => {
                return (
                  request.destination === 'script' ||
                  request.destination === 'style' ||
                  url.pathname.includes('/assets/')
                );
              },
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-assets-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 4. Google Fonts
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 5. Basemap satellite tiles
            {
              urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'map-tiles-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 14,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
