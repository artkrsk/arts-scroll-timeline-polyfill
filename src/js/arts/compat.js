/* Arts compatibility layer for upstream 1.1.0. All links to upstream internals
 * use named exports from readable modules rather than generated identifiers. */
import {
  StyleParser,
  RegexMatcher,
  TIMELINE_AXIS_TYPES,
} from '../upstream/scroll-timeline-css-parser.js'
import { parser, createScrollTimeline } from '../upstream/scroll-timeline-css.js'
import {
  ScrollTimeline,
  ViewTimeline,
  getTimelineDetails,
  updateSource,
  removeAnimation,
  updateMeasurements,
} from '../upstream/scroll-timeline-base.js'
import {
  ProxyAnimation,
  getProxyDetails,
  getProxyForNativeAnimation,
  parseAnimationRange,
  nativeDocumentGetAnimations,
  nativeElementGetAnimations,
} from '../upstream/proxy-animation.js'
import { artsSplitCSS, artsRefreshInset, artsClearInsetCache } from './css-values.js'

const artsParserPrototype = Object.getPrototypeOf(parser)
artsParserPrototype.extractMatches = (value, pattern, delimiter = ',') => {
  const match = pattern.exec(value)
  return match ? artsSplitCSS(match[1], delimiter) : []
}
artsParserPrototype.split = (value) => {
  return artsSplitCSS(value, ' ')
}
artsParserPrototype.extractScrollTimelineNames = function (value) {
  return this.extractMatches(value, RegexMatcher.ANIMATION_TIMELINE).map((name) =>
    /^(scroll|view)\(/.test(name) ? this.saveAnonymousTimelineName(name) : name,
  )
}
artsParserPrototype.parseAnonymousViewTimeline = (value) => {
  const parts = artsSplitCSS(value.slice(value.indexOf('(') + 1, value.lastIndexOf(')')), ' ')
  const options = {},
    inset = []
  for (const part of parts) {
    if (TIMELINE_AXIS_TYPES.includes(part)) options.axis = part
    else inset.push(part)
  }
  if (inset.length) options.inset = inset.join(' ')
  return options
}
artsParserPrototype.handleScrollTimelineProps = function (rule, sheet) {
  if (rule.selector.includes('@keyframes')) return
  this.saveSourceSelectorToScrollTimeline(rule)
  this.saveSubjectSelectorToViewTimeline(rule)
  const declarations = artsSplitCSS(rule.block.contents.slice(1, -1), ';')
  let names = [],
    durations = [],
    timelines = [],
    important = false
  const time = /^[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?m?s$/i
  for (const declaration of declarations) {
    const colon = declaration.indexOf(':')
    if (colon < 0) continue
    const property = declaration.slice(0, colon).trim()
    const value = declaration
      .slice(colon + 1)
      .trim()
      .replace(/\s*!important\s*$/i, '')
    if (property === 'animation') {
      timelines = ['auto']
      important = /!important\s*$/i.test(declaration)
      const items = artsSplitCSS(value)
      durations = items.map((item) => {
        const tokens = artsSplitCSS(item, ' ')
        return tokens.includes('auto')
          ? 'auto'
          : (tokens.find((token) => time.test(token)) ?? 'auto')
      })
      names = items.map((item) => {
        const tokens = artsSplitCSS(item, ' ')
        const known = tokens.find((token) => this.keyframeNamesSelectors.has(token))
        if (known) return known
        return (
          tokens
            .find(
              (token) =>
                !time.test(token) &&
                !/^[\d.]+$/.test(token) &&
                !/^(auto|none|linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|infinite|normal|reverse|alternate|alternate-reverse|forwards|backwards|both|running|paused)$/.test(
                  token,
                ) &&
                !/^(cubic-bezier|steps|linear)\(/.test(token),
            )
            ?.replace(/^(['"])(.*)\1$/, '$2') ?? 'none'
        )
      })
    } else if (property === 'animation-name') {
      names = artsSplitCSS(value).map((name) => name.replace(/^(['"])(.*)\1$/, '$2'))
    } else if (property === 'animation-duration') {
      important = /!important\s*$/i.test(declaration)
      durations = artsSplitCSS(value)
    } else if (property === 'animation-timeline') {
      timelines = this.extractScrollTimelineNames(`animation-timeline:${value};`)
    }
  }
  if (!timelines.length) return
  // Only a scroll-bound auto/omitted duration receives the bootstrap. Explicit
  // durations (including 0s), delays, fill modes and unrelated list slots survive.
  const count = Math.max(names.length, timelines.length, durations.length)
  let changed = false
  const normalized = Array.from({ length: count }, (_, index) => {
    const duration = durations.length ? durations[index % durations.length] : 'auto'
    const timeline = timelines[index % timelines.length]
    if (timeline !== 'none' && timeline !== 'auto' && duration === 'auto') {
      changed = true
      return '1s'
    }
    return duration === 'auto' ? '0s' : duration
  })
  // Firefox rejects `auto` inside the shorthand as a whole. Appending the
  // duration longhand alone cannot recover the lost animation name or easing.
  let shorthandChanged = false
  const rewritten = declarations.map((declaration) => {
    const colon = declaration.indexOf(':')
    if (declaration.slice(0, colon).trim() !== 'animation') return declaration
    const items = artsSplitCSS(declaration.slice(colon + 1)).map((item, index) => {
      const tokens = artsSplitCSS(item, ' '),
        auto = tokens.indexOf('auto')
      if (auto < 0) return item
      const timeline = timelines[index % timelines.length]
      tokens[auto] = timeline !== 'none' && timeline !== 'auto' ? '1s' : '0s'
      shorthandChanged = true
      return tokens.join(' ')
    })
    return declaration.slice(0, colon + 1) + items.join(',')
  })
  if (changed || shorthandChanged) {
    rule.block.contents =
      '{' +
      rewritten.join(';') +
      (changed
        ? `;animation-duration:${normalized.join(',')}${important ? '!important' : ''};`
        : '') +
      '}'
    this.replacePart(rule.block.startIndex, rule.block.endIndex, rule.block.contents, sheet)
  }
  this.saveRelationInList(rule, timelines, names)
}
// Each stylesheet owns its registrations. HMR replaces one record, and merging
// in DOM order leaves later sheets' precedence intact regardless of fetch order.
const artsSheets = new Map()
const artsBindings = new Map()
let artsAnonymousIndex = 0,
  artsRefreshPending = false
function artsMergeSheets() {
  const parsers = [...artsSheets.entries()]
    .filter(([node]) => node.isConnected)
    .sort(([a], [b]) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
    .map(([, record]) => record.parser)
    .filter(Boolean)
  for (const property of [
    'cssRulesWithTimelineName',
    'sourceSelectorToScrollTimeline',
    'subjectSelectorToViewTimeline',
  ]) {
    parser[property] = parsers.flatMap((parser) => parser[property])
  }
  for (const property of [
    'anonymousScrollTimelineOptions',
    'anonymousViewTimelineOptions',
    'keyframeNamesSelectors',
  ]) {
    parser[property] = new Map(parsers.flatMap((parser) => [...parser[property]]))
  }
}
function artsTranspile(node, source) {
  const old = artsSheets.get(node)
  artsClearInsetCache()
  if (old && old.skipped === 'aphrodite' in node.dataset) {
    if (source === old.output) return
    if (source === old.source) {
      // HMR may emit identical authored CSS again. Restore its normalized text;
      // only our own emitted output is an observer no-op.
      artsScheduleRefresh()
      return old
    }
  }
  const record = {
    source,
    output: source,
    parser: null,
    blob: old?.blob,
    skipped: 'aphrodite' in node.dataset,
  }
  const hasTimeline = /(animation-timeline|scroll-timeline|view-timeline|timeline-scope)/.test(
    source,
  )
  if (!('aphrodite' in node.dataset) && (hasTimeline || /animation\s*:/.test(source))) {
    try {
      const sheetParser = new StyleParser()
      sheetParser.nextAnonymousTimelineNameIndex = artsAnonymousIndex
      const firstPass = sheetParser.transpileStyleSheet(source, true)
      const ownKeyframes = sheetParser.keyframeNamesSelectors
      sheetParser.keyframeNamesSelectors = new Map([
        ...parser.keyframeNamesSelectors,
        ...ownKeyframes,
      ])
      const output = sheetParser.transpileStyleSheet(firstPass, false)
      // Time-based shorthand rules still reset earlier timeline bindings, but
      // timeline-free sheets retain their original text and href.
      record.output = hasTimeline ? output : source
      sheetParser.keyframeNamesSelectors = ownKeyframes
      record.parser = sheetParser
      artsAnonymousIndex = sheetParser.nextAnonymousTimelineNameIndex
    } catch {
      /* A hostile sheet must not prevent initialization. */
    }
  }
  artsSheets.set(node, record)
  artsMergeSheets()
  artsScheduleRefresh()
  return record
}
function artsDisposeTimeline(timeline) {
  if (!(timeline instanceof ScrollTimeline)) return
  const state = getTimelineDetails(timeline)
  if (state.animations.length) return
  for (const observer of state.artsSubjectObservers ?? []) observer.disconnect()
  updateSource(timeline, null)
}
function artsUnbind(animation, record, resume) {
  const state = getProxyDetails(record.proxy)
  if (state?.timeline) {
    const timeline = state.timeline
    removeAnimation(timeline, animation)
    state.timeline = null
    state.pendingTask = null
    state.startTime = state.holdTime = null
    state.animationRange = null
    state.specifiedTiming = state.normalizedTiming = null
    artsDisposeTimeline(timeline)
  }
  artsBindings.delete(animation)
  if (resume && animation.playState !== 'idle') animation.play()
}
function artsBind(animation) {
  if (!animation.animationName || !(animation.effect?.target instanceof Element)) return
  const target = animation.effect.target
  const prior = artsBindings.get(animation)
  if (!target.isConnected || animation.playState === 'idle') {
    if (prior) artsUnbind(animation, prior, false)
    return
  }
  const relation = parser.getAnimationTimelineOptions(animation.animationName, target)
  const name = relation?.['animation-timeline']
  const options =
    name && name !== 'none' && name !== 'auto'
      ? parser.getScrollTimelineOptions(name, target) || parser.getViewTimelineOptions(name, target)
      : null
  if (!options) {
    if (prior) artsUnbind(animation, prior, true)
    return
  }
  let timeline = prior?.proxy.timeline
  const reusable = options.subject
    ? timeline instanceof ViewTimeline && timeline.subject === options.subject
    : timeline instanceof ScrollTimeline &&
      !(timeline instanceof ViewTimeline) &&
      timeline.source === options.source
  if (!reusable) {
    const bound = createScrollTimeline(animation, animation.animationName, target)
    if (!bound) return
    timeline = bound.timeline
  } else {
    const timelineState = getTimelineDetails(timeline)
    timelineState.axis = options.axis ?? 'block'
    if (options.subject) {
      timelineState.artsInset = options.inset ?? 'auto'
      artsRefreshInset(timelineState)
    }
  }
  let proxy = prior?.proxy ?? getProxyForNativeAnimation(animation)
  if (!proxy) {
    proxy = new ProxyAnimation(animation, timeline, relation)
    animation.pause()
    proxy.play()
  } else {
    const oldTimeline = proxy.timeline
    proxy.timeline = timeline
    const state = getProxyDetails(proxy)
    state.animationRange = parseAnimationRange(timeline, relation['animation-range'])
    state.specifiedTiming = state.normalizedTiming = null
    state.autoAlignStartTime = true
    if (oldTimeline !== timeline) artsDisposeTimeline(oldTimeline)
    if (!prior) {
      animation.pause()
      proxy.play()
    }
  }
  artsBindings.set(animation, { proxy, target })
  updateMeasurements(timeline.source)
}
function artsRefreshBindings() {
  artsRefreshPending = false
  artsMergeSheets()
  const nativeAnimations = nativeDocumentGetAnimations.call(document)
  for (const [animation, record] of artsBindings) {
    if (!record.target.isConnected || animation.playState === 'idle')
      artsUnbind(animation, record, false)
  }
  for (const animation of nativeAnimations) artsBind(animation)
}
function artsScheduleRefresh() {
  if (artsRefreshPending) return
  artsRefreshPending = true
  requestAnimationFrame(artsRefreshBindings)
}
export function initArtsCSSPolyfill() {
  function inline(node) {
    const record = artsTranspile(node, node.textContent)
    if (record && node.textContent !== record.output) node.textContent = record.output
  }
  function link(node) {
    if ((node.type !== 'text/css' && node.rel !== 'stylesheet') || !node.href) return
    if ('aphrodite' in node.dataset) {
      if (artsSheets.has(node)) {
        artsSheets.delete(node)
        artsScheduleRefresh()
      }
      return
    }
    const href = node.href
    const previous = artsSheets.get(node)
    if (
      previous?.blob === href ||
      previous?.href === href ||
      new URL(href, document.baseURI).origin !== location.origin
    )
      return
    const marker = { href, output: '', source: '', parser: previous?.parser, blob: previous?.blob }
    artsSheets.set(node, marker)
    node.addEventListener('load', artsScheduleRefresh, { once: true })
    fetch(href)
      .then((response) => response.text())
      .then((source) => {
        if (!node.isConnected || node.href !== href || artsSheets.get(node) !== marker) return
        const record = artsTranspile(node, source) ?? marker
        record.href = href
        if (record.output !== source) {
          record.blob = URL.createObjectURL(new Blob([record.output], { type: 'text/css' }))
          node.addEventListener('load', artsScheduleRefresh, { once: true })
          node.href = record.blob
        } else record.blob = null
        if (previous?.blob && previous.blob !== record.blob) URL.revokeObjectURL(previous.blob)
      })
      .catch(() => {})
  }
  function visit(node) {
    if (node instanceof HTMLStyleElement) inline(node)
    else if (node instanceof HTMLLinkElement) link(node)
  }
  let variablesPending = false
  const variableTargets = new Set()
  function refreshVariables() {
    variablesPending = false
    const timelines = new Set([...artsBindings.values()].map((record) => record.proxy.timeline))
    const styles = new Map(),
      sources = new Set()
    for (const timeline of timelines) {
      const state = getTimelineDetails(timeline),
        subject = state?.subject
      if (
        !subject?.isConnected ||
        typeof state.artsInset !== 'string' ||
        !state.artsInset.includes('var(') ||
        ![...variableTargets].some((target) => target.contains(subject))
      )
        continue
      if (!styles.has(subject)) styles.set(subject, getComputedStyle(subject))
      if (artsRefreshInset(state, styles.get(subject))) sources.add(timeline.source)
    }
    variableTargets.clear()
    for (const source of sources) updateMeasurements(source)
  }
  new MutationObserver((records) => {
    const changed = new Set()
    const removed = []
    for (const record of records) {
      const element =
        record.target.nodeType === Node.TEXT_NODE ? record.target.parentElement : record.target
      if (element instanceof HTMLStyleElement || element instanceof HTMLLinkElement)
        changed.add(element)
      else if (record.type === 'attributes') {
        artsClearInsetCache()
        variableTargets.add(element)
        if (!variablesPending) {
          variablesPending = true
          requestAnimationFrame(refreshVariables)
        }
      }
      for (const node of record.addedNodes) {
        if (node instanceof Element) {
          if (node.matches('style,link')) changed.add(node)
          for (const sheet of node.querySelectorAll('style,link')) changed.add(sheet)
        }
      }
      for (const node of record.removedNodes) if (node instanceof Element) removed.push(node)
    }
    for (const node of changed) if (node.isConnected) visit(node)
    if (removed.length) {
      let affected = false
      for (const [node, record] of artsSheets)
        if (!node.isConnected) {
          if (record.blob) URL.revokeObjectURL(record.blob)
          artsSheets.delete(node)
          affected = true
        }
      if (!affected)
        for (const record of artsBindings.values()) {
          const timeline = getTimelineDetails(record.proxy.timeline)
          if (
            removed.some(
              (node) =>
                node.contains(record.target) ||
                (timeline?.subject && node.contains(timeline.subject)) ||
                (timeline?.source && node.contains(timeline.source)),
            )
          ) {
            affected = true
            break
          }
        }
      if (affected) artsScheduleRefresh()
    }
  }).observe(document.documentElement, {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'href', 'data-aphrodite'],
  })
  for (const node of document.querySelectorAll('style,link')) visit(node)
  const supports = CSS.supports
  CSS.supports = (property, value) =>
    value === undefined
      ? supports(
          property.replaceAll(
            /(animation-timeline|scroll-timeline(-(name|axis))?|view-timeline(-(name|axis|inset))?|timeline-scope)\s*:/g,
            '--supported-property:',
          ),
        )
      : /^(animation-timeline|scroll-timeline(-(name|axis))?|view-timeline(-(name|axis|inset))?|timeline-scope)$/.test(
          property,
        ) || supports(property, value)
  window.addEventListener('animationstart', (event) => {
    for (const animation of nativeElementGetAnimations.call(event.target))
      if (animation.animationName === event.animationName) artsBind(animation)
  })
}
