import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import yaml from '@rollup/plugin-yaml'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), yaml()],
  // Custom domain on GitHub Pages uses root base
  base: '/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
