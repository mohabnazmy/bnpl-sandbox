import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api to the backend. Target is configurable so it works
// both locally (localhost) and in Docker (the `backend` service).
const backend = process.env.BACKEND_URL || 'http://localhost:7483';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bind 0.0.0.0 so it's reachable from outside the container
    port: 5173,
    proxy: { '/api': backend },
  },
});
