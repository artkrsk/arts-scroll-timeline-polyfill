import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const assets = [
  'src/php/libraries/scroll-timeline/loader.js',
  'src/php/libraries/scroll-timeline/scroll-timeline.js',
]
function declarations(directory = 'types'): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? declarations(join(directory, entry.name))
        : [join(directory, entry.name)],
    )
    .sort()
}
function snapshot(): Map<string, Buffer> {
  return new Map([...assets, ...declarations()].map((path) => [path, readFileSync(path)]))
}
function assertEqual(a: Map<string, Buffer>, b: Map<string, Buffer>): void {
  if (a.size !== b.size) throw new Error('Generated file inventory changed')
  for (const [path, content] of a) {
    const other = b.get(path)
    if (!other || !content.equals(other)) throw new Error(`Generated file differs: ${path}`)
  }
}
const delivered = snapshot()
execFileSync('pnpm', ['build'], { stdio: 'inherit' })
const first = snapshot()
assertEqual(delivered, first)
execFileSync('pnpm', ['build'], { stdio: 'inherit' })
assertEqual(first, snapshot())
