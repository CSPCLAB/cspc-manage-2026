import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://cspc-manage-server-2026.onrender.com/",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});