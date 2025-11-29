import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: true,
      },
      plugins: [react()],
      define: {
        // Expose env vars to the client
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // We can also use import.meta.env in the code, which is standard for Vite
      },
      resolve: {
        alias: {
          '@': __dirname,
        }
      },
      build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'firebase/app', 'firebase/firestore', '@google/genai']
                }
            }
        }
      }
    };
});