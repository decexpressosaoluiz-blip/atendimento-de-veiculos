
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Ensures process.env.API_KEY is available in the browser build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    chunkSizeWarningLimit: 2000, // Aumentado para 2MB para evitar avisos no Vercel
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa libs fundamentais do React
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Separa Recharts que é pesado
          charts: ['recharts'],
          // Separa o SDK do Google GenAI que é muito pesado
          ai: ['@google/genai'],
          // Separa ícones
          icons: ['lucide-react']
        }
      }
    }
  }
});
