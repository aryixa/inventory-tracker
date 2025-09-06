//vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), visualizer({ open: true })],  build: {
    target: 'es2020', // modern target
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 800, // just to calm warnings
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'react-hot-toast']
        }
      }
    },
    minify: 'esbuild',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false
    }
  }
}


});
