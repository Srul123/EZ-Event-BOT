import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173, // Frontend dev server port (Vite default)
    open: true,
    proxy: {
      // Proxy API requests to backend server
      '/api': {
        target: 'http://localhost:3000', // Backend server port
        changeOrigin: true,
      }
    }
  }
})
