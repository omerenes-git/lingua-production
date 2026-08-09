import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';
// GitHub Pages deploy'u deploy-web.yml'de VITE_GITHUB_PAGES=true ile build eder.
// (GITHUB_ACTIONS kullanılmaz: Actions'ta read-only'dir ve CI'daki localhost
// E2E build'ini de /lingua-production/ base'ine zorlardı.)
const isGitHubPagesBuild = process.env.VITE_GITHUB_PAGES === 'true' && !isCapacitorBuild;

export default defineConfig({
  base: isCapacitorBuild ? './' : isGitHubPagesBuild ? '/lingua-production/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
