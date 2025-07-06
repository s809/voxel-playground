import { defineConfig } from 'vite'

export default defineConfig({
  base: '/voxel-playground/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['monaco-editor']
  },
  define: {
    global: 'globalThis'
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})
