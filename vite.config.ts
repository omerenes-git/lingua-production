import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true' && !isCapacitorBuild;

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
