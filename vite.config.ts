import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type InlineConfig } from 'vite'

export function libraryConfig(
  entry: 'polyfill' | 'loader',
  development: boolean,
  watch = false,
): InlineConfig {
  const filename = entry === 'loader' ? 'loader.js' : 'scroll-timeline.js'
  const output = resolve('dist', entry)
  const delivered = resolve('src/php/libraries/scroll-timeline')
  return {
    configFile: false,
    build: {
      outDir: output,
      target:
        entry === 'loader'
          ? 'es2015'
          : ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'],
      lib: {
        entry: resolve(entry === 'loader' ? 'src/ts/loader.ts' : 'src/ts/upstream/index.ts'),
        name: entry === 'loader' ? 'ArtsScrollTimelineLoader' : 'ScrollTimeline',
        formats: ['iife'],
        fileName: () => filename,
      },
      watch: watch ? {} : null,
      sourcemap: development,
      minify: development ? false : 'terser',
      terserOptions: { keep_classnames: /^((View|Scroll)Timeline)|CSS.*$/ },
    },
    plugins: [
      {
        name: 'copy-composer-assets',
        writeBundle() {
          mkdirSync(delivered, { recursive: true })
          copyFileSync(resolve(output, filename), resolve(delivered, filename))
          const sourceMap = resolve(output, `${filename}.map`)
          const deliveredMap = resolve(delivered, `${filename}.map`)
          if (development && existsSync(sourceMap)) copyFileSync(sourceMap, deliveredMap)
          else rmSync(deliveredMap, { force: true })
        },
      },
    ],
  }
}
export default defineConfig({})
