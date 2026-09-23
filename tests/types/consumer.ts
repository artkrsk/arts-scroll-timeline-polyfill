import type {
  PolyfillReadyState,
  PolyfillAnimation,
  PolyfillScrollTimelineOptions,
  PolyfillViewTimelineOptions,
  PolyfillViewTimeline,
  PolyfillNumericValue,
} from '@arts/scroll-timeline-polyfill'
import type {} from '@arts/scroll-timeline-polyfill/globals'

const source = document.createElement('div')
const scroll: PolyfillScrollTimelineOptions = { source, axis: 'inline' }
const view: PolyfillViewTimelineOptions = {
  subject: source,
  inset: [CSS.px(2), new CSSKeywordValue('auto')],
}
const state: Promise<PolyfillReadyState> | undefined = window.__artsScrollTimelinePolyfillReady
window.__artsScrollTimelinePolyfillSrc = '/scroll-timeline.js'
declare const timeline: PolyfillViewTimeline
declare const animation: PolyfillAnimation
const nullableSubject: Element | null = timeline.subject
const nullableOffset: PolyfillNumericValue | null = timeline.startOffset
animation.currentTime = CSS.percent(25)
animation.rangeStart = { rangeName: 'cover', offset: CSS.percent(5) }
animation.commitStyles()
// @ts-expect-error Invalid timeline axis.
const wrongAxis: PolyfillScrollTimelineOptions = { axis: 'vertical' }
// @ts-expect-error Readiness has exactly three states.
const wrongState: PolyfillReadyState = 'loaded'
// @ts-expect-error The supported subset does not promise numeric arithmetic methods.
declare const unsupported: Pick<PolyfillNumericValue, 'add'>
// @ts-expect-error A numeric value must provide the native or supported shim shape.
const wrongNumeric: PolyfillNumericValue = {}
// @ts-expect-error Private animation state is not part of the consumer interface.
animation.pendingTask = 'play'
void [scroll, view, state, nullableSubject, nullableOffset, wrongAxis, wrongState, wrongNumeric]
