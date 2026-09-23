import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const delivered = resolve('src/php/libraries/scroll-timeline')
const generated = resolve('dist/scroll-timeline.js')

export default defineConfig(({ mode }) => {
  const development = mode === 'development'

  return {
    build: {
      lib: {
        entry: resolve('src/js/upstream/index.js'),
        name: 'ScrollTimeline',
        formats: ['iife'],
        fileName: () => 'scroll-timeline.js',
      },
      sourcemap: development,
      minify: development ? false : 'terser',
      terserOptions: {
        keep_classnames: /^((View|Scroll)Timeline)|CSS.*$/,
      },
    },
    plugins: [
      {
        name: 'copy-composer-asset',
        closeBundle() {
          mkdirSync(delivered, { recursive: true })
          copyFileSync(generated, resolve(delivered, 'scroll-timeline.js'))
          const sourceMap = `${generated}.map`
          const deliveredMap = resolve(delivered, 'scroll-timeline.js.map')
          if (development && existsSync(sourceMap)) copyFileSync(sourceMap, deliveredMap)
          else if (existsSync(deliveredMap)) rmSync(deliveredMap)
        },
      },
    ],
  }
})
