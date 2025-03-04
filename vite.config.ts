import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      '@supabase/supabase-js',
      'jspdf',
      'html2canvas',
      'react-markdown',
      'remark-math',
      'rehype-katex'
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
          pdf: ['jspdf', 'html2canvas'],
          markdown: ['react-markdown', 'remark-math', 'rehype-katex']
        }
      }
    }
  }
});