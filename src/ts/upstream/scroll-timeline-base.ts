import type {
  PolyfillNumericValue,
  PolyfillUnitValue,
  TimelineRangeName,
  PolyfillScrollTimeline,
  PolyfillViewTimeline,
} from '../public/index.js'
import type { CalculationInfo } from './simplify-calculation.js'
import type { ParsedInset } from '../arts/css-values.js'
import type {
  AnonymousSource,
  TimelineOptions,
  TimelineState,
  SourceState,
  SourceMeasurements,
  SubjectMeasurements,
  TimelineTick,
  NumericRange,
  ViewRangeOffset,
  InsetSizes,
} from './timeline-types.js'
import { required, item } from '../platform/assertions.js'
import { DEFAULT_TIMELINE_AXIS, isTimelineAxis } from '../platform/constants.js'
export { ANIMATION_RANGE_NAMES } from '../platform/constants.js'
import { numeric } from '../platform/numeric-api.js'
// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { simplifyCalculation } from './simplify-calculation.js'
import { normalizeAxis } from './utils.js'
import { artsRefreshInset } from '../arts/css-values.js'

const scrollTimelineOptions = new WeakMap<ScrollTimeline, TimelineState>()
const sourceDetails = new WeakMap<Element, SourceState>()

function scrollEventSource(source: Element): Element | Document {
  if (source === document.scrollingElement) return document
  return source
}

/**
 * Updates the currentTime for all Web Animation instanced attached to a ScrollTimeline instance
 * @param scrollTimelineInstance {ScrollTimeline}
 */
function updateInternal(scrollTimelineInstance: ScrollTimeline): void {
  validateSource(scrollTimelineInstance)
  const details = required(
    scrollTimelineOptions.get(scrollTimelineInstance),
    'Unregistered scroll timeline',
  )
  const animations = details.animations
  if (animations.length === 0) return
  const timelineTime = scrollTimelineInstance.currentTime
  for (let i = 0; i < animations.length; i++) {
    item(animations, i).tickAnimation(timelineTime)
  }
}

/**
 * Calculates a scroll offset that corrects for writing modes, text direction
 * and a logical axis.
 * @param scrollTimeline {ScrollTimeline}
 * @param axis {String}
 * @returns {Number}
 */
function directionAwareScrollOffset(source: Element | null, axis: ScrollAxis): number | null {
  if (!source) return null
  const sourceMeasurements = sourceDetails.get(source)?.sourceMeasurements
  if (!sourceMeasurements) return null
  const style = getComputedStyle(source)
  // All writing modes are vertical except for horizontal-tb.
  // TODO: sideways-lr should flow bottom to top, but is currently unsupported
  // in Chrome.
  // http://drafts.csswg.org/css-writing-modes-4/#block-flow
  let currentScrollOffset = sourceMeasurements.scrollTop
  if (normalizeAxis(axis, style) === 'x') {
    // Negative values are reported for scrollLeft when the inline text
    // direction is right to left or for vertical text with a right to left
    // block flow. This is a consequence of shifting the scroll origin due to
    // changes in the overflow direction.
    // http://drafts.csswg.org/cssom-view/#overflow-directions.
    currentScrollOffset = Math.abs(sourceMeasurements.scrollLeft)
  }
  return currentScrollOffset
}

/**
 * Determines target effect end based on animation duration, iterations count and start and end delays
 *  returned value should always be positive
 * @param options {Animation} animation
 * @returns {number}
 */
export function calculateTargetEffectEnd(animation: Animation): number {
  const value = animation.effect?.getComputedTiming().activeDuration
  return typeof value === 'number' ? value : 0
}

/**
 * Calculates scroll offset based on axis and source geometry
 * @param source {DOMElement}
 * @param axis {String}
 * @returns {number}
 */
export function calculateMaxScrollOffset(source: Element, axis: ScrollAxis): number {
  const sourceMeasurements = sourceDetails.get(source)?.sourceMeasurements
  if (!sourceMeasurements) return 0
  // Only one horizontal writing mode: horizontal-tb.  All other writing modes
  // flow vertically.
  const horizontalWritingMode = getComputedStyle(source).writingMode === 'horizontal-tb'
  if (axis === 'block') axis = horizontalWritingMode ? 'y' : 'x'
  else if (axis === 'inline') axis = horizontalWritingMode ? 'x' : 'y'
  if (axis === 'y') return sourceMeasurements.scrollHeight - sourceMeasurements.clientHeight
  else if (axis === 'x') return sourceMeasurements.scrollWidth - sourceMeasurements.clientWidth
  return 0
}

function resolvePx(cssValue: PolyfillNumericValue, info: CalculationInfo): number {
  const cssNumericValue = simplifyCalculation(cssValue, info)
  if (cssNumericValue instanceof numeric.CSSUnitValue) {
    if (cssNumericValue.unit === 'px') {
      return cssNumericValue.value
    } else {
      throw TypeError(`Unhandled unit type ${cssNumericValue.unit}`)
    }
  } else {
    throw TypeError(`Unsupported value type: ${typeof cssValue}`)
  }
}

// Detects if the cached source is obsolete, and updates if required
// to ensure the new source has a scroll listener.
function validateSource(timeline: ScrollTimeline): void {
  if (!(timeline instanceof ViewTimeline)) {
    validateAnonymousSource(timeline)
    return
  }

  const node = timeline.subject
  if (!node) {
    updateSource(timeline, null)
    return
  }

  const display = getComputedStyle(node).display
  if (display === 'none') {
    updateSource(timeline, null)
    return
  }

  const source = getScrollParent(node)
  updateSource(timeline, source)
}

function validateAnonymousSource(timeline: ScrollTimeline): void {
  const details = required(scrollTimelineOptions.get(timeline), 'Unregistered scroll timeline')
  if (!details.anonymousSource) return

  const source = getAnonymousSourceElement(details.anonymousSource, details.anonymousTarget ?? null)
  updateSource(timeline, source)
}

function isValidAxis(axis: string): axis is ScrollAxis {
  return isTimelineAxis(axis)
}

/**
 * Read measurements of source element
 * @param {HTMLElement} source
 * @return {{clientWidth: *, scrollHeight: *, scrollLeft, clientHeight: *, scrollTop, scrollWidth: *}}
 */
export function measureSource(source: Element | null): SourceMeasurements | undefined {
  // AJAX swaps can detach a source between observer registration and callback.
  if (!source?.isConnected) return undefined
  const style = getComputedStyle(source)
  return {
    scrollLeft: source.scrollLeft,
    scrollTop: source.scrollTop,
    scrollWidth: source.scrollWidth,
    scrollHeight: source.scrollHeight,
    clientWidth: source.clientWidth,
    clientHeight: source.clientHeight,
    writingMode: style.writingMode,
    direction: style.direction,
    scrollPaddingTop: style.scrollPaddingTop,
    scrollPaddingBottom: style.scrollPaddingBottom,
    scrollPaddingLeft: style.scrollPaddingLeft,
    scrollPaddingRight: style.scrollPaddingRight,
  }
}

/**
 * Measure subject element relative to source
 * @param {HTMLElement} source
 * @param {HTMLElement|undefined} subject
 * @param subject
 */
export function measureSubject(
  source: Element | null,
  subject: Element | null,
): SubjectMeasurements | undefined {
  if (!(source instanceof HTMLElement) || !(subject instanceof HTMLElement)) {
    return
  }
  let top = 0
  let left = 0
  let node: Element | null = subject
  const ancestor = source.offsetParent
  while (node && node !== ancestor) {
    if (!(node instanceof HTMLElement)) return undefined
    left += node.offsetLeft
    top += node.offsetTop
    node = node.offsetParent
  }
  left -= source.offsetLeft + source.clientLeft
  top -= source.offsetTop + source.clientTop
  const style = getComputedStyle(subject)
  return {
    top,
    left,
    offsetWidth: subject.offsetWidth,
    offsetHeight: subject.offsetHeight,
    fontSize: style.fontSize,
  }
}

/**
 * Update measurements of source, and update timelines
 * @param {HTMLElement} source
 */
export function updateMeasurements(source: Element | null): void {
  if (!source?.isConnected) return
  const details = sourceDetails.get(source)
  if (!details) return
  details.sourceMeasurements = measureSource(source)

  // Update measurements of the subject of connected view timelines
  for (const ref of details.timelineRefs) {
    const timeline = ref.deref()
    if (timeline instanceof ViewTimeline) {
      const timelineDetails = required(
        scrollTimelineOptions.get(timeline),
        'Unregistered scroll timeline',
      )
      timelineDetails.subjectMeasurements = measureSubject(source, timeline.subject)
    }
  }

  if (details.updateScheduled) return

  setTimeout(() => {
    // Schedule a task to update timelines after all measurements are completed
    for (const ref of details.timelineRefs) {
      const timeline = ref.deref()
      if (timeline) {
        updateInternal(timeline)
      }
    }

    details.updateScheduled = false
  })
  details.updateScheduled = true
}

export function updateSource(timeline: ScrollTimeline, source: Element | null): void {
  const timelineDetails = required(
    scrollTimelineOptions.get(timeline),
    'Unregistered scroll timeline',
  )
  const oldSource = timelineDetails.source
  if (oldSource === source) return

  if (oldSource) {
    const details = sourceDetails.get(oldSource)
    if (details) {
      // The set contains WeakRef objects, so deleting the timeline itself
      // cannot remove its reference. Also release collected timelines.
      const staleRefs = Array.from(details.timelineRefs).filter(
        (ref) => typeof ref.deref() === 'undefined' || ref.deref() === timeline,
      )
      for (const ref of staleRefs) {
        details.timelineRefs.delete(ref)
      }

      if (details.timelineRefs.size === 0) {
        // All timelines have been disconnected from the source
        // Clean up
        details.disconnect()
        sourceDetails.delete(oldSource)
      }
    }
  }
  timelineDetails.source = source
  if (source) {
    let details = sourceDetails.get(source)
    if (!details) {
      // This is the first timeline for this source
      // Store a set of weak refs to connected timelines and current measurements
      details = {
        timelineRefs: new Set(),
        sourceMeasurements: measureSource(source),
        updateScheduled: false,
        disconnect: () => {},
      }
      sourceDetails.set(source, details)

      // Use resize observer to detect changes to source size
      const resizeObserver = new ResizeObserver(() => {
        updateMeasurements(source)
      })
      resizeObserver.observe(source)
      for (const child of source.children) {
        resizeObserver.observe(child)
      }

      // Use mutation observer to detect updated style attributes on source element
      const mutationObserver = new MutationObserver((records) => {
        for (const record of records) {
          if (record.target instanceof Element) updateMeasurements(record.target)
        }
      })
      mutationObserver.observe(source, { attributes: true, attributeFilter: ['style', 'class'] })

      const scrollListener = () => {
        // Sample and store scroll pos
        if (!details?.sourceMeasurements) return
        details.sourceMeasurements.scrollLeft = source.scrollLeft
        details.sourceMeasurements.scrollTop = source.scrollTop

        for (const ref of details.timelineRefs) {
          const timeline = ref.deref()
          if (timeline) {
            updateInternal(timeline)
          }
        }
      }
      scrollEventSource(source).addEventListener('scroll', scrollListener)
      details.disconnect = () => {
        resizeObserver.disconnect()
        mutationObserver.disconnect()
        scrollEventSource(source).removeEventListener('scroll', scrollListener)
      }
    }

    // Add a weak ref to the timeline so that we can update it when the source changes
    details.timelineRefs.add(new WeakRef(timeline))
  }
}

/**
 * Removes a Web Animation instance from ScrollTimeline
 * @param scrollTimeline {ScrollTimeline}
 * @param animation {Animation}
 * @param options {Object}
 */
export function removeAnimation(scrollTimeline: ScrollTimeline, animation: Animation): void {
  const animations = required(
    scrollTimelineOptions.get(scrollTimeline),
    'Unregistered scroll timeline',
  ).animations
  for (let i = 0; i < animations.length; i++) {
    if (item(animations, i).animation === animation) {
      animations.splice(i, 1)
    }
  }
}

/**
 * Attaches a Web Animation instance to ScrollTimeline.
 * @param scrollTimeline {ScrollTimeline}
 * @param animation {Animation}
 * @param tickAnimation {function(number)}
 */
export function addAnimation(
  scrollTimeline: ScrollTimeline,
  animation: Animation,
  tickAnimation: TimelineTick,
): void {
  const animations = required(
    scrollTimelineOptions.get(scrollTimeline),
    'Unregistered scroll timeline',
  ).animations
  for (let i = 0; i < animations.length; i++) {
    // @TODO: This early return causes issues when a page with the polyfill
    // is loaded from the BFCache. Ideally, this code gets fixed instead of
    // the workaround which clears the proxyAnimations cache on pagehide.
    // See https://github.com/flackr/scroll-timeline/issues/146#issuecomment-1698159183
    // for details.
    if (item(animations, i).animation === animation) return
  }

  animations.push({
    animation: animation,
    tickAnimation: tickAnimation,
  })
  queueMicrotask(() => {
    updateInternal(scrollTimeline)
  })
}

// TODO: this is a private function used for unit testing add function
export function _getStlOptions(scrollTimeline: ScrollTimeline): TimelineState {
  return required(scrollTimelineOptions.get(scrollTimeline), 'Unregistered scroll timeline')
}

export const getTimelineDetails = _getStlOptions

export class ScrollTimeline implements PolyfillScrollTimeline {
  constructor(options: TimelineOptions = {}) {
    scrollTimelineOptions.set(this, {
      source: null,
      axis: DEFAULT_TIMELINE_AXIS,
      anonymousSource: options ? options.anonymousSource : null,
      anonymousTarget: options ? options.anonymousTarget : null,

      // View timeline
      subject: null,
      inset: null,

      // Internal members
      animations: [],
      subjectMeasurements: null,
    })
    const source =
      options && options.source !== undefined ? options.source : document.scrollingElement
    updateSource(this, source)

    if (options && options.axis !== undefined && options.axis !== DEFAULT_TIMELINE_AXIS) {
      if (!isValidAxis(options.axis)) {
        throw TypeError('Invalid axis')
      }

      required(scrollTimelineOptions.get(this), 'Unregistered scroll timeline').axis = options.axis
    }

    updateInternal(this)
  }

  set source(element: Element | null) {
    updateSource(this, element)
    updateInternal(this)
  }

  get source(): Element | null {
    return required(scrollTimelineOptions.get(this), 'Unregistered scroll timeline').source
  }

  set axis(axis: ScrollAxis) {
    if (!isValidAxis(axis)) {
      throw TypeError('Invalid axis')
    }

    required(scrollTimelineOptions.get(this), 'Unregistered scroll timeline').axis = axis
    updateInternal(this)
  }

  get axis(): ScrollAxis {
    return required(scrollTimelineOptions.get(this), 'Unregistered scroll timeline').axis
  }

  get duration(): PolyfillUnitValue {
    return numeric.CSS.percent(100)
  }

  get phase(): 'active' | 'inactive' {
    // Per https://drafts.csswg.org/scroll-animations-1/#phase-algorithm
    // Step 1
    const _unresolved = null
    //   if source is null
    const container = this.source
    if (!container) return 'inactive'
    const scrollerStyle = getComputedStyle(container)

    //   if source does not currently have a CSS layout box
    if (scrollerStyle.display === 'none') return 'inactive'

    //   if source's layout box is not a scroll container"
    if (
      container !== document.scrollingElement &&
      (scrollerStyle.overflow === 'visible' || scrollerStyle.overflow === 'clip')
    ) {
      return 'inactive'
    }

    return 'active'
  }

  get currentTime(): PolyfillUnitValue | null {
    const unresolved = null
    const container = this.source
    if (!container?.isConnected) return unresolved
    if (this.phase === 'inactive') return unresolved
    const scrollerStyle = getComputedStyle(container)
    if (scrollerStyle.display === 'inline' || scrollerStyle.display === 'none') {
      return unresolved
    }

    const axis = this.axis
    const scrollPos = directionAwareScrollOffset(container, axis)
    const maxScrollPos = calculateMaxScrollOffset(container, axis)
    if (scrollPos === null) return null

    return maxScrollPos > 0
      ? numeric.CSS.percent((100 * scrollPos) / maxScrollPos)
      : numeric.CSS.percent(100)
  }

  get __polyfill(): true {
    return true
  }
}

// Methods for calculation of the containing block.
// See https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block.

function findClosestAncestor(
  element: Element,
  matcher: (element: Element) => boolean,
): Element | null {
  let candidate = element.parentElement
  while (candidate != null) {
    if (matcher(candidate)) return candidate
    candidate = candidate.parentElement
  }
  return null
}

export function getAnonymousSourceElement(
  sourceType: AnonymousSource,
  node: Element | null,
): Element | null {
  switch (sourceType) {
    case 'root':
      return document.scrollingElement
    case 'nearest':
      return getScrollParent(node)
    case 'self':
      return node
    default:
      throw new TypeError('Invalid ScrollTimeline Source Type.')
  }
}

function isBlockContainer(element: Element): boolean {
  const style = getComputedStyle(element)
  switch (style.display) {
    case 'block':
    case 'inline-block':
    case 'list-item':
    case 'table':
    case 'table-caption':
    case 'flow-root':
    case 'flex':
    case 'grid':
      return true
  }

  return false
}

function isFixedElementContainer(element: Element): boolean {
  const style = getComputedStyle(element)
  if (style.transform !== 'none' || style.perspective !== 'none') return true

  if (style.willChange === 'transform' || style.willChange === 'perspective') return true

  if (style.filter !== 'none' || style.willChange === 'filter') return true

  if (style.backdropFilter !== 'none') return true

  return false
}

function isAbsoluteElementContainer(element: Element): boolean {
  const style = getComputedStyle(element)
  if (style.position !== 'static') return true

  return isFixedElementContainer(element)
}

function getContainingBlock(element: Element): Element | null {
  switch (getComputedStyle(element).position) {
    case 'static':
    case 'relative':
    case 'sticky':
      return findClosestAncestor(element, isBlockContainer)

    case 'absolute':
      return findClosestAncestor(element, isAbsoluteElementContainer)

    case 'fixed':
      return findClosestAncestor(element, isFixedElementContainer)
  }
  return null
}

export function getScrollParent(node: Element | null): Element | null {
  if (!node?.isConnected) return null

  while (node) {
    node = getContainingBlock(node)
    if (!node) break
    const style = getComputedStyle(node)
    switch (style.overflowX) {
      case 'auto':
      case 'scroll':
      case 'hidden':
        // https://drafts.csswg.org/css-overflow-3/#overflow-propagation
        // The UA must apply the overflow from the root element to the viewport;
        // however, if the overflow is visible in both axis, then the overflow
        // of the first visible child body is applied instead.
        if (
          node === document.body &&
          document.scrollingElement &&
          getComputedStyle(document.scrollingElement).overflow === 'visible'
        )
          return document.scrollingElement

        return node
    }
  }
  return document.scrollingElement
}

// ---- View timelines -----

// Computes the scroll offsets corresponding to the [0, 100]% range for a
// specific phase on a view timeline.
// TODO: Track changes to determine when associated animations require their
// timing to be renormalized.
export function range(timeline: ScrollTimeline, phase: TimelineRangeName): NumericRange | null {
  const details = required(scrollTimelineOptions.get(timeline), 'Unregistered scroll timeline')
  const unresolved = null
  if (!details.source?.isConnected || timeline.phase === 'inactive') return unresolved

  if (!(timeline instanceof ViewTimeline)) return unresolved

  artsRefreshInset(details)
  const subjectMeasurements = details.subjectMeasurements
  const sourceMeasurements = sourceDetails.get(details.source)?.sourceMeasurements
  if (!sourceMeasurements || !subjectMeasurements) return null
  return calculateRange(phase, sourceMeasurements, subjectMeasurements, details.axis, details.inset)
}

export function calculateRange(
  phase: TimelineRangeName,
  sourceMeasurements: SourceMeasurements,
  subjectMeasurements: SubjectMeasurements,
  axis: ScrollAxis,
  optionsInset: ParsedInset | null,
): NumericRange {
  // TODO: handle position sticky

  // Determine the view and container size based on the scroll direction.
  // The view position is the scroll position of the logical starting edge
  // of the view.
  const rtl =
    sourceMeasurements.direction === 'rtl' || sourceMeasurements.writingMode === 'vertical-rl'
  let viewSize: number
  let viewPos: number
  const sizes: InsetSizes = {
    fontSize: subjectMeasurements.fontSize,
    scrollPadding: ['0px', '0px'],
    containerSize: 0,
  }
  if (normalizeAxis(axis, sourceMeasurements) === 'x') {
    viewSize = subjectMeasurements.offsetWidth
    viewPos = subjectMeasurements.left
    sizes.scrollPadding = [
      sourceMeasurements.scrollPaddingLeft,
      sourceMeasurements.scrollPaddingRight,
    ]
    if (rtl) {
      viewPos += sourceMeasurements.scrollWidth - sourceMeasurements.clientWidth
      sizes.scrollPadding = [
        sourceMeasurements.scrollPaddingRight,
        sourceMeasurements.scrollPaddingLeft,
      ]
    }
    sizes.containerSize = sourceMeasurements.clientWidth
  } else {
    // TODO: support sideways-lr
    viewSize = subjectMeasurements.offsetHeight
    viewPos = subjectMeasurements.top
    sizes.scrollPadding = [
      sourceMeasurements.scrollPaddingTop,
      sourceMeasurements.scrollPaddingBottom,
    ]
    sizes.containerSize = sourceMeasurements.clientHeight
  }

  const inset = calculateInset(optionsInset, sizes)

  // Cover:
  // 0% progress represents the position at which the start border edge of the
  // element’s principal box coincides with the end edge of its view progress
  // visibility range.
  // 100% progress represents the position at which the end border edge of the
  // element’s principal box coincides with the start edge of its view progress
  // visibility range.
  const coverStartOffset = viewPos - sizes.containerSize + inset.end
  const coverEndOffset = viewPos + viewSize - inset.start

  // Contain:
  // The 0% progress represents the earlier of the following positions:
  // 1. The start border edge of the element’s principal box coincides with
  //    the start edge of its view progress visibility range.
  // 2. The end border edge of the element’s principal box coincides with
  //    the end edge of its view progress visibility range.
  // The 100% progress represents the greater of the following positions:
  // 1. The start border edge of the element’s principal box coincides with
  //  the start edge of its view progress visibility range.
  // 2. The end border edge of the element’s principal box coincides with
  //    the end edge of its view progress visibility range.
  const alignStartOffset = coverStartOffset + viewSize
  const alignEndOffset = coverEndOffset - viewSize
  const containStartOffset = Math.min(alignStartOffset, alignEndOffset)
  const containEndOffset = Math.max(alignStartOffset, alignEndOffset)

  // Entry and Exit bounds align with cover and contains bounds.

  let startOffset = 0
  let endOffset = 0
  // Take inset into account when determining the scrollport size
  const adjustedScrollportSize = sizes.containerSize - inset.start - inset.end
  const subjectIsLargerThanScrollport = viewSize > adjustedScrollportSize

  switch (phase) {
    case 'cover':
      startOffset = coverStartOffset
      endOffset = coverEndOffset
      break

    case 'contain':
      startOffset = containStartOffset
      endOffset = containEndOffset
      break

    case 'entry':
      startOffset = coverStartOffset
      endOffset = containStartOffset
      break

    case 'exit':
      startOffset = containEndOffset
      endOffset = coverEndOffset
      break

    case 'entry-crossing':
      startOffset = coverStartOffset
      endOffset = subjectIsLargerThanScrollport ? containEndOffset : containStartOffset
      break

    case 'exit-crossing':
      startOffset = subjectIsLargerThanScrollport ? containStartOffset : containEndOffset
      endOffset = coverEndOffset
      break
  }
  return { start: startOffset, end: endOffset }
}

function calculateInset(value: ParsedInset | null, sizes: InsetSizes): NumericRange {
  const inset = { start: 0, end: 0 }

  if (!value) return inset

  const [start, end] = [value.start, value.end].map((part, i) => {
    if (part === 'auto') {
      return sizes.scrollPadding[i] === 'auto' ? 0 : parseFloat(item(sizes.scrollPadding, i))
    }

    return resolvePx(part, {
      percentageReference: numeric.CSS.px(sizes.containerSize),
      fontSize: numeric.CSS.px(parseFloat(sizes.fontSize)),
    })
  })

  return { start: required(start), end: required(end) }
}

// Calculate the fractional offset of a range value relative to the normal range.
export function fractionalOffset(
  timeline: ScrollTimeline,
  value: PolyfillNumericValue | ViewRangeOffset,
): number {
  if (timeline instanceof ViewTimeline) {
    if (!('rangeName' in value)) throw new TypeError('Expected a named view range')
    const { rangeName, offset } = value

    const phaseRange = range(timeline, rangeName)
    const coverRange = range(timeline, 'cover')

    return calculateRelativePosition(phaseRange, offset, coverRange, timeline.subject)
  }

  if (timeline instanceof ScrollTimeline) {
    const { axis, source } = timeline
    if (!source || 'rangeName' in value) return 0
    const sourceMeasurements = sourceDetails.get(source)?.sourceMeasurements
    if (!sourceMeasurements) return 0

    let sourceScrollDistance: number
    if (normalizeAxis(axis, sourceMeasurements) === 'x') {
      sourceScrollDistance = sourceMeasurements.scrollWidth - sourceMeasurements.clientWidth
    } else {
      sourceScrollDistance = sourceMeasurements.scrollHeight - sourceMeasurements.clientHeight
    }

    // TODO: pass relative measurements (viewport, font-size, root font-size, etc. ) to resolvePx() to resolve relative units
    const position = resolvePx(value, { percentageReference: numeric.CSS.px(sourceScrollDistance) })
    const fractionalOffset = sourceScrollDistance ? position / sourceScrollDistance : 0

    return fractionalOffset
  }

  throw new Error('Unsupported timeline class')
}

export function calculateRelativePosition(
  phaseRange: NumericRange | null,
  offset: PolyfillNumericValue,
  coverRange: NumericRange | null,
  subject: Element | null,
): number {
  if (!phaseRange || !coverRange || !subject || coverRange.end === coverRange.start) return 0

  const style = getComputedStyle(subject)
  const info = {
    percentageReference: numeric.CSS.px(phaseRange.end - phaseRange.start),
    fontSize: numeric.CSS.px(parseFloat(style.fontSize)),
  }

  const offsetPX = resolvePx(offset, info) + phaseRange.start
  return (offsetPX - coverRange.start) / (coverRange.end - coverRange.start)
}

// https://drafts.csswg.org/scroll-animations-1/#view-progress-timelines
export class ViewTimeline extends ScrollTimeline implements PolyfillViewTimeline {
  // As specced, ViewTimeline has a subject and a source, but
  // ViewTimelineOptions only has source. Furthermore, there is a strict
  // relationship between subject and source (source is nearest scrollable
  // ancestor of subject).

  // Proceeding under the assumption that subject will be added to
  // ViewTimelineOptions. Inferring the source from the subject if not
  // explicitly set.
  constructor(options: TimelineOptions = {}) {
    super(options)
    const details = required(scrollTimelineOptions.get(this), 'Unregistered scroll timeline')
    details.subject = options.subject ?? null
    // TODO: Handle insets.
    if (options?.inset) {
      details.artsInset = options.inset
      artsRefreshInset(details)
    }
    if (details.subject) {
      const resizeObserver = new ResizeObserver(() => {
        updateMeasurements(details.source)
      })
      resizeObserver.observe(details.subject)

      const mutationObserver = new MutationObserver(() => {
        updateMeasurements(details.source)
      })
      mutationObserver.observe(details.subject, {
        attributes: true,
        attributeFilter: ['class', 'style'],
      })
      details.artsSubjectObservers = [resizeObserver, mutationObserver]
    }
    validateSource(this)
    details.subjectMeasurements = measureSubject(details.source, details.subject)
    updateInternal(this)
  }

  override get source(): Element | null {
    validateSource(this)
    return required(scrollTimelineOptions.get(this), 'Unregistered scroll timeline').source
  }

  override set source(_source: Element | null) {
    throw new Error('Cannot set the source of a view timeline')
  }

  get subject(): Element | null {
    return required(scrollTimelineOptions.get(this), 'Unregistered scroll timeline').subject
  }

  // The axis is called "axis" for a view timeline.
  // Internally we still call it axis.
  override get axis(): ScrollAxis {
    return required(scrollTimelineOptions.get(this), 'Unregistered scroll timeline').axis
  }

  override get currentTime(): PolyfillUnitValue | null {
    const unresolved = null
    const scrollPos = directionAwareScrollOffset(this.source, this.axis)
    if (scrollPos === unresolved) return unresolved

    const offsets = range(this, 'cover')
    if (!offsets || offsets.end === offsets.start) return unresolved
    const progress = (scrollPos - offsets.start) / (offsets.end - offsets.start)

    return numeric.CSS.percent(100 * progress)
  }

  get startOffset(): PolyfillUnitValue | null {
    const offsets = range(this, 'cover')
    return offsets ? numeric.CSS.px(offsets.start) : null
  }

  get endOffset(): PolyfillUnitValue | null {
    const offsets = range(this, 'cover')
    return offsets ? numeric.CSS.px(offsets.end) : null
  }
}
