import type { PolyfillUnitValue, TimelineRangeName } from '../public/index.js'
import type { ParsedInset } from '../arts/css-values.js'
import type { AnimationRelation, ViewBindingOptions, KeyframeMapping } from './parser-types.js'
import { required } from '../platform/assertions.js'
import { isRangeName } from '../platform/constants.js'
import { numeric } from '../platform/numeric-api.js'
import { StyleParser } from './scroll-timeline-css-parser.js'
import {
  ProxyAnimation,
  getProxyForNativeAnimation,
  nativeElementGetAnimations,
} from './proxy-animation.js'
import {
  ScrollTimeline,
  ViewTimeline,
  getScrollParent,
  calculateRange,
  calculateRelativePosition,
  measureSubject,
  measureSource,
} from './scroll-timeline-base.js'
import { artsParseInset, artsResolveVars } from '../arts/css-values.js'

export const parser = new StyleParser()

function initMutationObserver(): void {
  const sheetObserver = new MutationObserver((entries) => {
    for (const entry of entries) {
      for (const addedNode of entry.addedNodes) {
        if (addedNode instanceof HTMLStyleElement) {
          handleStyleTag(addedNode)
        }
        if (addedNode instanceof HTMLLinkElement) {
          handleLinkedStylesheet(addedNode)
        }
      }
    }

    // TODO: Proxy element.style similar to how we proxy element.animate.
    // We accomplish this by swapping out Element.prototype.style.
  })

  sheetObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  /**
   * @param {HtmlStyleElement} el style tag to be parsed
   */
  function handleStyleTag(el: HTMLStyleElement): void {
    // Don’t touch empty style tags nor tags controlled by aphrodite.
    // Details at https://github.com/Khan/aphrodite/blob/master/src/inject.js,
    // but any modification to the style tag will break the entire page.
    if (el.innerHTML.trim().length === 0 || 'aphrodite' in el.dataset) {
      return
    }
    // TODO: Do with one pass for better performance
    let newSrc = parser.transpileStyleSheet(el.innerHTML, true)
    newSrc = parser.transpileStyleSheet(newSrc, false)
    el.innerHTML = newSrc
  }

  function handleLinkedStylesheet(linkElement: HTMLLinkElement): void {
    // Filter only css links to external stylesheets.
    if (
      (linkElement.type !== 'text/css' && linkElement.rel !== 'stylesheet') ||
      !linkElement.href
    ) {
      return
    }
    const url = new URL(linkElement.href, document.baseURI)
    if (url.origin !== location.origin) {
      // Most likely we won't be able to fetch resources from other origins.
      return
    }
    fetch(linkElement.href).then(async (response) => {
      const result = await response.text()
      let newSrc = parser.transpileStyleSheet(result, true)
      newSrc = parser.transpileStyleSheet(result, false)
      if (newSrc !== result) {
        const blob = new Blob([newSrc], { type: 'text/css' })
        const url = URL.createObjectURL(blob)
        linkElement.setAttribute('href', url)
      }
    })
  }

  document.querySelectorAll('style').forEach((tag) => {
    handleStyleTag(tag)
  })
  document.querySelectorAll('link').forEach((tag) => {
    handleLinkedStylesheet(tag)
  })
}

function relativePosition(
  phase: TimelineRangeName,
  container: Element | null,
  target: Element,
  axis: ScrollAxis,
  optionsInset: string | ParsedInset | null,
  percent: PolyfillUnitValue,
): number {
  const sourceMeasurements = measureSource(container)
  const subjectMeasurements = measureSubject(container, target)
  if (!sourceMeasurements || !subjectMeasurements) return 0
  if (typeof optionsInset === 'string') {
    optionsInset = artsParseInset(artsResolveVars(optionsInset, getComputedStyle(target)) ?? 'auto')
  }
  const phaseRange = calculateRange(
    phase,
    sourceMeasurements,
    subjectMeasurements,
    axis,
    optionsInset,
  )
  const coverRange = calculateRange(
    'cover',
    sourceMeasurements,
    subjectMeasurements,
    axis,
    optionsInset,
  )
  return calculateRelativePosition(phaseRange, percent, coverRange, target)
}

export function createScrollTimeline(
  anim: CSSAnimation,
  animationName: string,
  target: Element,
): { timeline: ScrollTimeline; animOptions: AnimationRelation } | null {
  const animOptions = parser.getAnimationTimelineOptions(animationName, target)

  if (!animOptions) return null

  const timelineName = animOptions['animation-timeline']
  if (!timelineName) return null

  const options =
    parser.getScrollTimelineOptions(timelineName, target) ||
    parser.getViewTimelineOptions(timelineName, target)
  if (!options) return null

  // If this is a ViewTimeline
  if (options.kind === 'view') updateKeyframesIfNecessary(anim, options)

  return {
    timeline: options.kind === 'scroll' ? new ScrollTimeline(options) : new ViewTimeline(options),
    animOptions: animOptions,
  }
}

function updateKeyframesIfNecessary(anim: CSSAnimation, options: ViewBindingOptions): void {
  const effect = anim.effect
  if (!(effect instanceof KeyframeEffect)) return
  const container = getScrollParent(options.subject)
  const axis = options.axis ?? 'block'

  function calculateNewOffset(mapping: KeyframeMapping, keyframe: ComputedKeyframe): number | null {
    let newOffset = null
    for (const [key, value] of mapping) {
      if (key === (keyframe.offset ?? keyframe.computedOffset) * 100) {
        if (value === 'from') {
          newOffset = 0
        } else if (value === 'to') {
          newOffset = 100
        } else {
          const tokens = value.split(' ')
          if (tokens.length === 1) {
            newOffset = parseFloat(required(tokens[0]))
          } else {
            const phase = required(tokens[0])
            if (!isRangeName(phase)) throw new TypeError('Invalid keyframe range')
            newOffset =
              relativePosition(
                phase,
                container,
                options.subject,
                axis,
                typeof options.inset === 'string'
                  ? options.inset
                  : options.inset
                    ? artsParseInset(options.inset)
                    : null,
                numeric.CSS.percent(parseFloat(required(tokens[1]))),
              ) * 100
          }
        }
        break
      }
    }

    return newOffset
  }

  const mapping = parser.keyframeNamesSelectors.get(anim.animationName)
  // mapping is empty when none of the keyframe selectors contains a phase
  if (mapping?.size) {
    const newKeyframes: ComputedKeyframe[] = []
    effect.getKeyframes().forEach((keyframe) => {
      const newOffset = calculateNewOffset(mapping, keyframe)
      if (newOffset !== null && newOffset >= 0 && newOffset <= 100) {
        keyframe.offset = newOffset / 100.0
        newKeyframes.push(keyframe)
      }
    })

    const sortedKeyframes = newKeyframes.sort((a, b) => {
      if ((a.offset ?? a.computedOffset) < (b.offset ?? b.computedOffset)) return -1
      if ((a.offset ?? a.computedOffset) > (b.offset ?? b.computedOffset)) return 1
      return 0
    })

    effect.setKeyframes(sortedKeyframes)
  }
}

export function initCSSPolyfill(): void {
  // Don't load if browser claims support
  if (CSS.supports('animation-timeline: --works')) {
    return
  }

  initMutationObserver()

  // Override CSS.supports() to claim support for the CSS properties from now on
  const oldSupports = CSS.supports
  CSS.supports = (ident: string, value?: string) => {
    if (value !== undefined) return oldSupports(ident, value)
    ident = ident.replaceAll(
      /(animation-timeline|scroll-timeline(-(name|axis))?|view-timeline(-(name|axis|inset))?|timeline-scope)\s*:/g,
      '--supported-property:',
    )
    return oldSupports(ident)
  }

  // We are not wrapping capturing 'animationstart' by a 'load' event,
  // because we may lose some of the 'animationstart' events by the time 'load' is completed.
  window.addEventListener('animationstart', (evt) => {
    const target = evt.target
    if (!(target instanceof Element)) return
    nativeElementGetAnimations
      .call(target)
      .filter(
        (anim): anim is CSSAnimation =>
          anim instanceof CSSAnimation && anim.animationName === evt.animationName,
      )
      .forEach((anim) => {
        const result = createScrollTimeline(anim, anim.animationName, target)
        if (result) {
          // If the CSS Animation refers to a scroll or view timeline we need to proxy the animation instance.
          const existing = getProxyForNativeAnimation(anim)
          if (existing) existing.timeline = result.timeline
          else {
            const proxyAnimation = new ProxyAnimation(anim, result.timeline, result.animOptions)
            anim.pause()
            proxyAnimation.play()
          }
        }
      })
  })
}
