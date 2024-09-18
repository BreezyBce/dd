import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      mangle: {
        safari10: true,
      },
      format: {
        safari10: true,
      }
    }
  },
  server: {
    host: '0.0.0.0',
    hmr: {
      clientPort: 443
    }
  }
})