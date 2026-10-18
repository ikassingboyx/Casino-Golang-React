import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app calls the API on its own origin (/api, /ws). In development Vite
// forwards those to the Go backend; in Docker, Caddy does.
const backend = process.env.BACKEND_URL ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': backend,
      '/ws': { target: backend, ws: true },
    },
  },
})
