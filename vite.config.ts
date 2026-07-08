import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { generateSitemaps } from './src/seo/sitemap/generator'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'larmap-sitemap-generator',
      apply: 'build',
      closeBundle: async () => {
        await generateSitemaps({ outDir: 'dist' })
      },
    },
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
