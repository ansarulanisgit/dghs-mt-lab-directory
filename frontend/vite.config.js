import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let activeScrapePromise = null;

function dghsScraperPlugin() {
  const configureMiddleware = (server) => {
    server.middlewares.use('/api/latest-data', (req, res) => {
      try {
        const metaPath = path.join(__dirname, 'src', 'lib', 'sync_metadata.json');
        const recordsPath = path.join(__dirname, 'src', 'lib', 'scraped_records.json');
        const metadata = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null;
        const records = fs.existsSync(recordsPath) ? JSON.parse(fs.readFileSync(recordsPath, 'utf8')) : null;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, metadata, records }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });

    server.middlewares.use('/api/trigger-scrape', async (req, res) => {
      if (req.method !== 'POST' && req.method !== 'GET') {
        res.statusCode = 405;
        res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
        return;
      }

      try {
        if (!activeScrapePromise) {
          const scraperDir = path.join(__dirname, '..', 'scraper');
          activeScrapePromise = new Promise((resolve, reject) => {
            const child = spawn('node', ['index.js', '--force'], {
              cwd: scraperDir,
              stdio: ['ignore', 'pipe', 'pipe'],
              shell: false
            });

            let stderr = '';
            child.stdout.on('data', (data) => {
              process.stdout.write(`[Auto-Scraper] ${data}`);
            });
            child.stderr.on('data', (data) => {
              stderr += data.toString();
              process.stderr.write(`[Auto-Scraper Error] ${data}`);
            });

            child.on('close', (code) => {
              activeScrapePromise = null;
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(stderr || `Scraper exited with code ${code}`));
              }
            });

            child.on('error', (err) => {
              activeScrapePromise = null;
              reject(err);
            });
          });
        }

        await activeScrapePromise;

        const metaPath = path.join(__dirname, 'src', 'lib', 'sync_metadata.json');
        const recordsPath = path.join(__dirname, 'src', 'lib', 'scraped_records.json');
        const metadata = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null;
        const records = fs.existsSync(recordsPath) ? JSON.parse(fs.readFileSync(recordsPath, 'utf8')) : null;

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, metadata, records }));
      } catch (err) {
        activeScrapePromise = null;
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
  };

  return {
    name: 'dghs-scraper-api',
    configureServer: configureMiddleware,
    configurePreviewServer: configureMiddleware
  };
}

export default defineConfig({
  plugins: [react(), dghsScraperPlugin()],
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