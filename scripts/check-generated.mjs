import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const asset = 'src/php/libraries/scroll-timeline/scroll-timeline.js'
const build = () => execFileSync('pnpm', ['build'], { stdio: 'inherit' })

const delivered = readFileSync(asset)
build()
const first = readFileSync(asset)
if (!delivered.equals(first)) throw new Error('The delivered asset does not match readable source')
build()
if (!first.equals(readFileSync(asset)))
  throw new Error('Two builds from identical inputs produced different assets')
