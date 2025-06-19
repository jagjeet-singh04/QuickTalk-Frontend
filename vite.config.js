import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react() , tailwindcss()] , 
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          vendor: ['axios', 'socket.io-client', 'zustand'],
          tailwind: ['tailwindcss', '@tailwindcss/vite', 'autoprefixer']
        }
      }
    }
  },
  
})