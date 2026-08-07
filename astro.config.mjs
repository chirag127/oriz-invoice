// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import AstroPwa from '@vite-pwa/astro'

export default defineConfig({
  site: 'https://invoice.oriz.in',
  output: 'static',
  integrations: [
    react(),
    sitemap(),
    AstroPwa({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        id: '/',
        name: 'oriz Invoice',
        short_name: 'Invoice',
        description: 'Free GST-aware invoice generator — line items, auto totals + tax, any currency, your logo, print to PDF. 100% in your browser.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        categories: ['business'],
        lang: 'en',
        dir: 'ltr',
        background_color: '#f6f7f4',
        theme_color: '#0f5132',
        icons: [
          { src: '/icons/icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
          { src: '/icons/icon-256.png', type: 'image/png', sizes: '256x256', purpose: 'any' },
          { src: '/icons/icon-384.png', type: 'image/png', sizes: '384x384', purpose: 'any' },
          { src: '/icons/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
          { src: '/icons/maskable-512.png', type: 'image/png', sizes: '512x512', purpose: 'maskable' },
          { src: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
        ],
        screenshots: [
          {
            src: '/screenshots/desktop.png',
            type: 'image/png',
            sizes: '1280x800',
            form_factor: 'wide',
            label: 'oriz Invoice studio on desktop',
          },
          {
            src: '/screenshots/mobile.png',
            type: 'image/png',
            sizes: '390x844',
            label: 'oriz Invoice on mobile',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff,woff2}'],
        navigateFallbackDenylist: [/^\/\.well-known\//],
        runtimeCaching: [
          {
            // AI generation (g4f / pollinations) — always try network first,
            // fall back to cache so the app shell stays usable offline.
            urlPattern: ({ url }) =>
              /(?:pollinations\.ai|g4f|gpt4free|text\.pollinations)/.test(url.host + url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'invoice-ai',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
