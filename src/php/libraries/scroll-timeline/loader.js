/*! arts/scroll-timeline-polyfill loader — fetches the polyfill only in
 *  browsers WITHOUT native CSS scroll-driven animations (double-gate per
 *  flackr/scroll-timeline#50: the polyfill fights native implementations
 *  when double-loaded). Native browsers stop here: zero further bytes.
 *  The polyfill URL is injected via wp_add_inline_script (before).
 *
 *  Consumers await window.__artsScrollTimelinePolyfillReady, which settles
 *  with the environment's state: 'native' | 'polyfilled' | 'unavailable'.
 *  Never rejects — 'unavailable' is the signal to fall back. */
(function () {
  var w = window

  // Every syntax a consumer may rely on, so the gate can't clear a browser
  // that supports only part of the feature. The named forms matter as much
  // as the anonymous ones: consumers declare `view-timeline: --name` and
  // bind `animation-timeline: --name`, which an anonymous-only gate would
  // wrongly report as natively covered — skipping the polyfill those
  // consumers need.
  var NATIVE = [
    'animation-timeline: view()',
    'animation-timeline: scroll(root block)',
    'view-timeline: --probe block',
    'animation-timeline: --probe',
    'animation-range: contain 0% contain 100%'
  ]

  var isNative = NATIVE.every(function (query) {
    return CSS.supports(query)
  })

  w.__artsScrollTimelinePolyfillReady = new Promise(function (resolve) {
    if (isNative) {
      resolve('native')
      return
    }

    var src = w.__artsScrollTimelinePolyfillSrc
    if (!src) {
      resolve('unavailable')
      return
    }

    var script = document.createElement('script')
    script.src = src
    script.onload = function () {
      // Loaded is not installed: the polyfill attaches ViewTimeline only
      // after transpiling every stylesheet on the page, and a hostile sheet
      // can still abort that init.
      resolve(typeof w.ViewTimeline === 'function' ? 'polyfilled' : 'unavailable')
    }
    script.onerror = function () {
      resolve('unavailable')
    }
    document.head.appendChild(script)
  })
})()
