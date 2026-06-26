import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies API + server-rendered friction routes to the backend (:7483),
// so the React app and the vulnerable API share an origin during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:7483',
      '/checkout': 'http://localhost:7483',
      '/confirmation': 'http://localhost:7483',
      '/promo': 'http://localhost:7483',
      '/__truth.json': 'http://localhost:7483',
    },
  },
});
