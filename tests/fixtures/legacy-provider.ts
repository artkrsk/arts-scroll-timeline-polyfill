import type {} from '../../src/ts/public/globals.js'
import { loaderURL, polyfillURL, loadScript } from './helpers.js'
if (!Object.hasOwn(window, '__artsScrollTimelinePolyfillSrc')) {
  Object.defineProperty(window, '__artsScrollTimelinePolyfillSrc', {
    get: () => polyfillURL,
    set: () => {},
    configurable: false,
  })
}
window.__artsScrollTimelinePolyfillSrc = '/legacy-missing.js'
await loadScript(loaderURL)
