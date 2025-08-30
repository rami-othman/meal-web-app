import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // API
      '/api': {
        target: 'https://192.168.1.169:7012',
        changeOrigin: true,
        secure: false, // لأن الشهادة محلية غالبًا
      },
      // Static exports
      '/exports': {
        target: 'https://192.168.1.169:7012',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
