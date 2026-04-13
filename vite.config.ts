import { serwist } from '@serwist/vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

const proxyTarget = process.env.VITE_PLACES_PROXY ?? 'http://127.0.0.1:8787'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    serwist({
      swSrc: 'src/sw.ts',
      swDest: 'sw.js',
      globDirectory: 'dist',
      injectionPoint: 'self.__SW_MANIFEST',
      rollupFormat: 'iife',
    }),
  ],
  server: {
    proxy: {
      '/api': { target: proxyTarget, changeOrigin: true },
    },
  },
  preview: {
    proxy: {
      '/api': { target: proxyTarget, changeOrigin: true },
    },
  },
})
