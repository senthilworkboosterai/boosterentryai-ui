import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 30012,   // 👈 change default port
    host: true,    // 👈 allows external access (e.g. http://103.14.123.44:30012)
  },
})
