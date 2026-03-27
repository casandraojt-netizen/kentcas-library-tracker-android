import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isAndroid = process.env.BUILD_TARGET === 'android'

export default defineConfig({
  plugins: [
    react(),
    // Skip PWA service worker for Android build — Capacitor handles that
    !isAndroid && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'book-cover.png'],
      manifest: {
        name: 'Library Tracker',
        short_name: 'Library',
        description: 'Track your books and web novels',
        theme_color: '#0a0908',
        background_color: '#0a0908',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ].filter(Boolean),
})
