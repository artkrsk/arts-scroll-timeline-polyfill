import type {} from '../../src/ts/public/globals.js'
import { loaderURL, polyfillURL, loadScript } from './helpers.js'
if (!location.search.includes('missing')) window.__artsScrollTimelinePolyfillSrc = polyfillURL
await loadScript(loaderURL)
