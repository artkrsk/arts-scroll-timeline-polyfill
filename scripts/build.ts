import { execFileSync, spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { build } from 'vite'
import { libraryConfig } from '../vite.config.ts'

const watch = process.argv.includes('--watch')
for (const entry of ['polyfill', 'loader'] as const) await build(libraryConfig(entry, watch, watch))
if (watch) {
  const compiler = spawn('pnpm', ['exec', 'tsc', '-p', 'tsconfig.declarations.json', '--watch'], {
    stdio: 'inherit',
  })
  process.on('exit', () => compiler.kill())
} else {
  rmSync('types', { recursive: true, force: true })
  execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.declarations.json'], { stdio: 'inherit' })
}
