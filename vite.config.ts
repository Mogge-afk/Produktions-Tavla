import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // If BASE_PATH is supplied (e.g. from GitHub Actions configure-pages), use it.
  // If GITHUB_REPOSITORY is defined (e.g. "user/repo"), default to "/repo/".
  // Otherwise fall back to relative './' for local and flexible hosting.
  let basePath = process.env.BASE_PATH || './';
  if (!process.env.BASE_PATH && process.env.GITHUB_REPOSITORY) {
    const parts = process.env.GITHUB_REPOSITORY.split('/');
    if (parts[1]) {
      basePath = `/${parts[1]}/`;
    }
  }

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
