import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em desenvolvimento, o Vite (porta 5173) repassa /api para o Express (porta 3000).
// Assim o front chama "/api/..." tanto local quanto no Render, sem CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
