import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        // Keep legacy support for process.env
        'process.env.API_KEY': JSON.stringify(env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Configure for production build
      build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              openai: ['openai']
            }
          }
        }
      }
    };
});
