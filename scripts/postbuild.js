import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const distIndex = path.resolve('dist/index.html');
const dist404 = path.resolve('dist/404.html');
const docsDir = path.resolve('docs');

// 1. Copy dist/index.html to dist/404.html for GitHub Pages SPA routing
if (fs.existsSync(distIndex)) {
  fs.copyFileSync(distIndex, dist404);
}

// 2. Mirror dist to docs/ so users can deploy from branch (/docs) if GitHub Actions is not selected
if (fs.existsSync(distDir)) {
  fs.cpSync(distDir, docsDir, { recursive: true });
}
