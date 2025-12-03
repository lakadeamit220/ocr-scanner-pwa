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

  // server: {
  //   host: "0.0.0.0",
  //   port: 5173,
  //   strictPort: true,

  //   hmr: {
  //     protocol: "wss",
  //     host: "unmollifiable-karima-unpackaged.ngrok-free.dev",
  //     port: 443,
  //     path: "/__vite_hmr",     // ← THIS LINE FIXES THE ISSUE
  //   },

  //   allowedHosts: [
  //     ".ngrok-free.app",
  //     ".ngrok.io",
  //     ".ngrok.app",
  //     "unmollifiable-karima-unpackaged.ngrok-free.dev",
  //     "localhost",
  //     "127.0.0.1",
  //   ]
  // }

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Disable HMR entirely for ngrok tunnels
    hmr: false,
    allowedHosts: ["localhost", "127.0.0.1", ".ngrok-free.app", "unmollifiable-karima-unpackaged.ngrok-free.dev",]
  }


})
