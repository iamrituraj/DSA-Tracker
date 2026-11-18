import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

const rootDir = import.meta.dirname || process.cwd();

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'simulator-route-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url) return next();
          const [rawPath] = req.url.split('?');
          if (
            rawPath === '/simulator' ||
            rawPath === '/simulator/' ||
            rawPath === '/simulator/index.html'
          ) {
            const htmlFile = resolve(rootDir, 'simulator/index.html');
            if (fs.existsSync(htmlFile)) {
              const html = fs.readFileSync(htmlFile, 'utf-8');
              server
                .transformIndexHtml(req.url, html)
                .then((transformed) => {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'text/html; charset=utf-8');
                  res.end(transformed);
                })
                .catch((err) => next(err));
              return;
            }
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url) return next();
          const [rawPath] = req.url.split('?');
          if (
            rawPath === '/simulator' ||
            rawPath === '/simulator/' ||
            rawPath === '/simulator/index.html'
          ) {
            const htmlFile = resolve(rootDir, 'dist/simulator/index.html');
            if (fs.existsSync(htmlFile)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              fs.createReadStream(htmlFile).pipe(res);
              return;
            }
          }
          next();
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        simulator: resolve(rootDir, 'simulator/index.html')
      }
    }
  }
});
