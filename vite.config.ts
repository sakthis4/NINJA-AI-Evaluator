
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // Fix: Use path.resolve() or cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" error
    const env = loadEnv(mode, (process as any).cwd(), '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: true,
      },
      plugins: [react()],
      define: {
        // Updated to use process.env.API_KEY as per Google GenAI guidelines for injected keys
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
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
