import { loadScript, polyfillURL } from './helpers.js'

await loadScript(polyfillURL)
window.__artsStickyFixture = { ready: true }
