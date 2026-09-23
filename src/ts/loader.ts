import type { PolyfillReadyState } from './public/index.js'
import type {} from './public/globals.js'
import { hasNativeSupport, hasPolyfillPrerequisites } from './platform/support.js'

window.__artsScrollTimelinePolyfillReady = new Promise<PolyfillReadyState>((resolve) => {
  try {
    if (hasNativeSupport()) {
      resolve('native')
      return
    }
    const src = window.__artsScrollTimelinePolyfillSrc
    if (!src || !hasPolyfillPrerequisites()) {
      resolve('unavailable')
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = () =>
      resolve(
        typeof window.ScrollTimeline === 'function' && typeof window.ViewTimeline === 'function'
          ? 'polyfilled'
          : 'unavailable',
      )
    script.onerror = () => resolve('unavailable')
    document.head.appendChild(script)
  } catch {
    resolve('unavailable')
  }
})
