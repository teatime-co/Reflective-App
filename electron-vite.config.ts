import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/node-seal/dist/*.wasm',
            dest: '.'
          }
        ]
      })
    ],
    build: {
      rollupOptions: {
        external: [
          'better-sqlite3',
          '@xenova/transformers',
          'sharp'
        ]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()]
  }
})
