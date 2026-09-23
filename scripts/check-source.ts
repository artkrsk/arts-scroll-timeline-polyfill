import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function check(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      check(path)
      continue
    }
    if (/\.[cm]?jsx?$/.test(path))
      throw new Error(`Maintained JavaScript must be TypeScript: ${path}`)
    if (path.endsWith('.ts') && /@ts-(?:ignore|nocheck)\b/.test(readFileSync(path, 'utf8'))) {
      throw new Error(`Unchecked TypeScript directive: ${path}`)
    }
    if (path.endsWith('.html')) {
      for (const script of readFileSync(path, 'utf8').matchAll(
        /<script\b[^>]*>([\s\S]*?)<\/script>/g,
      )) {
        if (script[1]?.trim())
          throw new Error(`Move executable fixture logic to TypeScript: ${path}`)
      }
    }
  }
}
if (existsSync('src/js')) throw new Error('The JavaScript source tree must not be reintroduced')
for (const directory of ['src/ts', 'scripts', 'tests']) check(directory)
