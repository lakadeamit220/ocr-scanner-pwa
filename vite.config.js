import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'OCR Scanner',
        short_name: 'OCRScan',
        description: 'Scan text with your camera',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // THIS IS THE MAGIC THAT FIXES EVERYTHING
    hmr: {
      clientPort: 443,   // ngrok HTTPS port → forces wss://your-ngrok-subdomain.ngrok-free.dev
    },
    // Allow ALL ngrok free domains + your exact subdomain
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app',
      'unmollifiable-karima-unpackaged.ngrok-free.dev', // ← your current one
      'localhost',
      '127.0.0.1'
    ]
  }
})