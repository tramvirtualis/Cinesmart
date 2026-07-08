const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexHtml = path.join(distDir, 'index.html');
const fallbackHtml = path.join(distDir, '404.html');

if (!fs.existsSync(indexHtml)) {
  console.error('dist/index.html not found — run vite build first');
  process.exit(1);
}

fs.copyFileSync(indexHtml, fallbackHtml);
console.log('SPA fallback: copied dist/index.html -> dist/404.html');
