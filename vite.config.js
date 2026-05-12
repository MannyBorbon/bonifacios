import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // En local, /api → mismo host que producción (PHP); evita que /api caiga en Vite y devuelva JS/HTML.
  server: {
    proxy: {
      '/api': {
        target: 'https://bonifaciossancarlos.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    minify: false, // Desactivar minificado para evitar conflictos de variables
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'favicon.svg'],
      manifest: {
        name: "Bonifacio's — Panel Admin",
        short_name: "Bonifacios",
        description: "Panel administrativo de Bonifacio's Restaurant San Carlos",
        theme_color: '#030b18',
        background_color: '#030712',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/admin/dashboard',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // Aumentar límite de tamaño para archivos grandes
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        // No cachear respuestas de /api (evita JSON/HTML equivocado en el SW y datos viejos en admin).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
