import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  build: {
    chunkSizeWarningLimit: 8000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('scraped_records.json')) {
            return 'directory-data';
          }
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'pdf';
          }
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor';
          }
        }
      }
    }
  }
});