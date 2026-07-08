import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    sitemap({
      hostname: 'https://larmap.com.br',
      dynamicRoutes: [
        '/',
        '/aluguel',
        '/compra',
        '/novidades',
        '/blog',
        '/mapa',
        '/sobre',
        '/politica-de-privacidade',
        '/politica-de-cookies',
        '/termos-de-uso',
        '/seja-parceiro',
      ],
    }),
  ],

  server: {
    proxy: {
      '/api': {
        target: 'https://smartmap-backend.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})