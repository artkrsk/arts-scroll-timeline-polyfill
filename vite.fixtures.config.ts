import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: '.cache/browser-fixtures',
    target: 'es2022',
    rollupOptions: {
      input: ['tests/browser-parity.html', 'tests/loader.html', 'tests/legacy-provider.html'],
    },
  },
  plugins: [
    {
      name: 'copy-fixture-css',
      closeBundle() {
        mkdirSync('.cache/browser-fixtures/tests', { recursive: true })
        copyFileSync('tests/opted-out.css', resolve('.cache/browser-fixtures/tests/opted-out.css'))
      },
    },
  ],
})
