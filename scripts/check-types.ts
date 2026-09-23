import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'

const output = '.cache/type-consumer'
rmSync(output, { recursive: true, force: true })
execFileSync(
  'pnpm',
  ['exec', 'tsc', '-p', 'tests/types/tsconfig.json', '--noEmit', 'false', '--outDir', output],
  { stdio: 'inherit' },
)
const emitted = readFileSync(`${output}/consumer.js`, 'utf8')
if (emitted.includes('@arts/scroll-timeline-polyfill'))
  throw new Error('A consumer type import survived JavaScript emission')
execFileSync(
  'pnpm',
  [
    'exec',
    'tsc',
    '-p',
    'tests/types/tsconfig.json',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
  ],
  { stdio: 'inherit' },
)
