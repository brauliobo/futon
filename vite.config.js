import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Custom domain on GitHub Pages uses root base
  base: '/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
