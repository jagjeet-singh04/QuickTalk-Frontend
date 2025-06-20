import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        login: './src/pages/LoginPage.jsx' 
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          vendor: ['axios', 'socket.io-client', 'zustand']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://quic-talk-backend.vercel.app/',
        changeOrigin: true,
        secure: true
      },
      '/socket.io': {
        target: 'https://quic-talk-backend.vercel.app/',
        changeOrigin: true,
        secure: true,
        ws: true
      }
    }
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer()
      ]
    }
  }
});