import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: isGitHubPagesBuild ? '/lingua-production/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'firebase/app': path.resolve(__dirname, './src/lib/firebase-stubs/app.ts'),
      'firebase/auth': path.resolve(__dirname, './src/lib/firebase-stubs/auth.ts'),
      'firebase/firestore': path.resolve(__dirname, './src/lib/firebase-stubs/firestore.ts'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
