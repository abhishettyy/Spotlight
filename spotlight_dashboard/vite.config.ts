import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = (process.env.VITE_BASE_PATH || '/').replace(/\/?$/, '/')

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),

    // Installable app for the student area only. The service worker is scoped to
    // /student/, so the club dashboard and admin console never run through it.
    // The manifest is public/student.webmanifest, linked from src/student/main.tsx.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      scope: `${base}student/`,
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}', 'svg/*.svg', 'student-icons/*.png', 'student.webmanifest'],
        // The club dashboard bundle and its on-demand pages (dash-*) are never needed under /student/
        globIgnores: ['**/mountDashboard-*', '**/dash-*'],
        navigateFallback: `${base}index.html`,
        navigateFallbackAllowlist: [new RegExp(`^${base}student(/|$)`)],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@student': path.resolve(__dirname, './src/student'),
      '@': path.resolve(__dirname, './src'),
    },
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      output: {
        // Club dashboard pages load on demand; the dash- prefix keeps them out of the student service worker
        chunkFileNames: (chunk) => {
          const ids = chunk.moduleIds.map((id) => id.replace(/\\/g, '/'));
          const dashboardOnly = ids.some((id) => id.includes('/src/app/dashboard/')) && !ids.some((id) => id.includes('/src/student/'));
          return dashboardOnly ? 'assets/dash-[name]-[hash].js' : 'assets/[name]-[hash].js';
        },
      },
    },
  },
})
