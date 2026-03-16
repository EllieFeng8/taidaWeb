import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      host: "0.0.0.0",
      port: 3000,

      // HMR 設定（原本的）
      hmr: process.env.DISABLE_HMR !== 'true',

      // ⭐ 新增 proxy（解決 CORS）
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8081",
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});