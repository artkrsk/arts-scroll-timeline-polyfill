/*! arts/scroll-timeline-polyfill loader — fetches the polyfill only in
 *  browsers WITHOUT native CSS scroll-driven animations (double-gate per
 *  flackr/scroll-timeline#50: the polyfill fights native implementations
 *  when double-loaded). Native browsers stop here: zero further bytes.
 *  The polyfill URL is injected via wp_add_inline_script (before). */
(function () {
  if (
    CSS.supports('animation-timeline: view()') &&
    CSS.supports('animation-timeline: scroll(root block)')
  ) {
    return
  }
  var src = window.__artsScrollTimelinePolyfillSrc
  if (!src) {
    return
  }
  var script = document.createElement('script')
  script.src = src
  document.head.appendChild(script)
})()
