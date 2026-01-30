import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from "path";

export default defineConfig({
  base: '/aspera-sdk-js/',
  resolve: {
    alias: {
      '~@ibm/plex': path.resolve(__dirname, 'node_modules/@ibm/plex'),
      '@ibm-aspera/sdk': path.resolve(__dirname, '../src'),
    },
  },
  plugins: [
    react(),
    // basicSsl()
  ],
  assetsInclude: ['**/*.md'],
  server: {
    host: 'js-sdk.aspera.us',
    open: true,
  },
});
