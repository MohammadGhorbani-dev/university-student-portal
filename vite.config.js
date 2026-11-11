import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  return {
    plugins: [react(), tailwindcss(), ...(demo ? [{
      name: 'isolated-demo',
      generateBundle() {
        for (const id of this.getModuleIds()) {
          if (/node_modules[\\/](?:@firebase|firebase)[\\/]/.test(id) || /[\\/]src[\\/]firebase[\\/]/.test(id)) {
            this.error('The standalone demo must not bundle Firebase.');
          }
        }
      },
    }] : [])],
    build: { outDir: demo ? 'dist-demo' : 'dist' },
    resolve: {
      alias: [
        ...(demo ? [
          { find: /.*\/context\/AuthContext(?:\.jsx)?$/, replacement: path.resolve(__dirname, 'src/demo/AuthContext.jsx') },
          { find: /.*\/services\/firestore(?:\.js)?$/, replacement: path.resolve(__dirname, 'src/demo/services.js') },
        ] : []),
        { find: '@', replacement: path.resolve(__dirname, '.') },
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
