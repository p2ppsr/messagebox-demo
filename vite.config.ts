import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    allowedHosts: ['e082-68-186-26-187.ngrok-free.app']
  }
})
