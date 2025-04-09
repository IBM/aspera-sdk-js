import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      '~@ibm/plex': path.resolve(__dirname, 'node_modules/@ibm/plex'),
      '@ibm-aspera/sdk': path.resolve(__dirname, '../src'),
    },
  },
  plugins: [react()],
  assetsInclude: ['**/*.md'],

  server: {
    open: true,
  },
});
