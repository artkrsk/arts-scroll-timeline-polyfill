import { beforeEach, describe, expect, it, vi } from 'vitest'
import { numeric } from '../../src/ts/platform/numeric-api.js'
import { installCSSOM } from '../../src/ts/upstream/proxy-cssom.js'
import {
  _getStlOptions,
  addAnimation,
  calculateMaxScrollOffset,
  calculateRelativePosition,
  calculateTargetEffectEnd,
  fractionalOffset,
  getAnonymousSourceElement,
  getScrollParent,
  getTimelineDetails,
  measureSource,
  measureSubject,
  range,
  removeAnimation,
  ScrollTimeline,
  updateMeasurements,
  ViewTimeline,
} from '../../src/ts/upstream/scroll-timeline-base.js'
import type { AnonymousSource } from '../../src/ts/upstream/timeline-types.js'
import {
  createElement,
  createScroller,
  createViewFixture,
  FakeAnimation,
  type FakeDocument,
  FakeEffect,
  type FakeElement,
  installDom,
  observersOf,
  type StubElement,
  scrollTo,
} from './helpers/dom-stubs.js'

let doc: FakeDocument

installCSSOM()
beforeEach(() => {
  doc = installDom().document
})

const css = () => numeric.CSS
const bogusAxis = 'z' as unknown as ScrollAxis
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('ScrollTimeline', () => {
  it('is inactive without a source', () => {
    const timeline = new ScrollTimeline({ source: null })
    expect(timeline.source).toBeNull()
    expect(timeline.phase).toBe('inactive')
    expect(timeline.currentTime).toBeNull()
    expect(timeline.axis).toBe('block')
    expect(timeline.__polyfill).toBe(true)
    expect(String(timeline.duration)).toBe('100%')
  })
  it('defaults to the scrolling element', () => {
    doc.scrollingElement = createScroller()
    expect(new ScrollTimeline().source).toBe(doc.scrollingElement)
  })
  it('rejects invalid axes', () => {
    expect(() => new ScrollTimeline({ source: null, axis: bogusAxis })).toThrow(TypeError)
    const timeline = new ScrollTimeline({ source: null, axis: 'x' })
    expect(timeline.axis).toBe('x')
    expect(() => {
      timeline.axis = bogusAxis
    }).toThrow(TypeError)
    timeline.axis = 'y'
    expect(timeline.axis).toBe('y')
  })
  it('reports scroll progress and samples it on scroll events', () => {
    const source = createScroller({ scrollTop: 50 })
    const timeline = new ScrollTimeline({ source })
    expect(timeline.phase).toBe('active')
    expect(String(timeline.currentTime)).toBe('12.5%')
    source.scrollTop = 200
    expect(String(timeline.currentTime)).toBe('12.5%')
    source.dispatchEvent(new Event('scroll'))
    expect(String(timeline.currentTime)).toBe('50%')
  })
  it('listens to document scroll events for the scrolling element', () => {
    const root = createScroller()
    doc.scrollingElement = root
    const listen = vi.spyOn(doc, 'addEventListener')
    const timeline = new ScrollTimeline({ source: root })
    expect(listen).toHaveBeenCalledWith('scroll', expect.any(Function))
    root.scrollTop = 100
    doc.dispatchEvent(new Event('scroll'))
    expect(String(timeline.currentTime)).toBe('25%')
  })
  it.each<[string, ScrollAxis, Partial<FakeElement>, string]>([
    ['no horizontal overflow', 'x', {}, '100%'],
    [
      'right-to-left scroll offsets',
      'x',
      { scrollLeft: -100, scrollWidth: 600, style: { direction: 'rtl' } },
      '25%',
    ],
    [
      'inline in vertical writing',
      'inline',
      { scrollTop: 100, style: { writingMode: 'vertical-rl' } },
      '25%',
    ],
    [
      'block in vertical writing',
      'block',
      { scrollLeft: 100, scrollWidth: 600, style: { writingMode: 'vertical-lr' } },
      '25%',
    ],
  ])('handles %s', (_name, axis, init, expected) => {
    const timeline = new ScrollTimeline({ source: createScroller(init), axis })
    expect(String(timeline.currentTime)).toBe(expected)
  })
  it.each([{ overflow: 'visible' }, { overflow: 'clip' }, { display: 'none' }])(
    'is inactive for %o',
    (style) => {
      const timeline = new ScrollTimeline({ source: createScroller({ style }) })
      expect(timeline.phase).toBe('inactive')
      expect(timeline.currentTime).toBeNull()
    },
  )
  it('treats the scrolling element as a scroll container', () => {
    doc.scrollingElement = createScroller({ style: { overflow: 'visible' } })
    expect(new ScrollTimeline().phase).toBe('active')
  })
  it('has no current time for inline or detached sources', () => {
    expect(
      new ScrollTimeline({ source: createScroller({ style: { display: 'inline' } }) }).currentTime,
    ).toBeNull()
    const detached = createScroller({ isConnected: false })
    const timeline = new ScrollTimeline({ source: detached })
    detached.dispatchEvent(new Event('scroll'))
    expect(timeline.currentTime).toBeNull()
  })
  it('releases listeners and observers of a replaced source', () => {
    const first = createScroller()
    const second = createScroller({ scrollTop: 400 })
    const timeline = new ScrollTimeline({ source: first })
    const unlisten = vi.spyOn(first, 'removeEventListener')
    timeline.source = second
    expect(timeline.source).toBe(second)
    expect(String(timeline.currentTime)).toBe('100%')
    expect(unlisten).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(observersOf(first).map((observer) => observer.disconnected)).toEqual([true, true])
  })
  it('keeps a shared source attached while another timeline uses it', () => {
    const source = createScroller()
    const detached = new ScrollTimeline({ source })
    const attached = new ScrollTimeline({ source })
    const unlisten = vi.spyOn(source, 'removeEventListener')
    detached.source = null
    expect(unlisten).not.toHaveBeenCalled()
    scrollTo(source, 400)
    expect(String(attached.currentTime)).toBe('100%')
  })
  it.each<[AnonymousSource, (fixture: ReturnType<typeof createViewFixture>) => Element | null]>([
    ['nearest', ({ source }) => source],
    ['self', ({ subject }) => subject],
    ['root', () => doc.scrollingElement],
  ])('resolves the %s anonymous source', (anonymousSource, expected) => {
    doc.scrollingElement = createScroller()
    const fixture = createViewFixture()
    const timeline = new ScrollTimeline({
      source: null,
      anonymousSource,
      anonymousTarget: fixture.subject,
    })
    expect(timeline.source).toBe(expected(fixture))
  })
})

describe('source and subject measurement', () => {
  it('measures connected sources only', () => {
    expect(measureSource(null)).toBeUndefined()
    expect(measureSource(createScroller({ isConnected: false }))).toBeUndefined()
    expect(
      measureSource(createScroller({ scrollTop: 5, style: { scrollPaddingTop: '4px' } })),
    ).toEqual({
      scrollLeft: 0,
      scrollTop: 5,
      scrollWidth: 200,
      scrollHeight: 500,
      clientWidth: 200,
      clientHeight: 100,
      writingMode: 'horizontal-tb',
      direction: 'ltr',
      scrollPaddingTop: '4px',
      scrollPaddingBottom: 'auto',
      scrollPaddingLeft: 'auto',
      scrollPaddingRight: 'auto',
    })
  })
  it('measures a subject relative to the scroller content box', () => {
    const { source, subject } = createViewFixture()
    expect(measureSubject(source, subject)).toEqual({
      top: 150,
      left: 250,
      offsetWidth: 50,
      offsetHeight: 80,
      fontSize: '16px',
    })
    const wrapper = createElement({ offsetTop: 100, offsetLeft: 200, offsetParent: source })
    Object.assign(subject, { offsetTop: 50, offsetLeft: 50, offsetParent: wrapper })
    source.clientTop = 5
    expect(measureSubject(source, subject)).toMatchObject({ top: 145, left: 250 })
  })
  it('requires HTML elements throughout the offset chain', () => {
    const { source, subject } = createViewFixture()
    expect(measureSubject(null, subject)).toBeUndefined()
    expect(measureSubject(source, null)).toBeUndefined()
    subject.offsetParent = {} as unknown as StubElement
    expect(measureSubject(source, subject)).toBeUndefined()
  })
  it.each<[ScrollAxis, string, number]>([
    ['block', 'horizontal-tb', 400],
    ['inline', 'horizontal-tb', 200],
    ['y', 'horizontal-tb', 400],
    ['x', 'horizontal-tb', 200],
    ['block', 'vertical-rl', 200],
    ['inline', 'vertical-rl', 400],
    [bogusAxis, 'horizontal-tb', 0],
  ])('computes the %s scroll range in %s', (axis, writingMode, expected) => {
    const source = createScroller({ scrollWidth: 400, style: { writingMode } })
    expect(calculateMaxScrollOffset(source, axis)).toBe(0)
    new ScrollTimeline({ source })
    expect(calculateMaxScrollOffset(source, axis)).toBe(expected)
  })
  it('reads the target effect end from the computed active duration', () => {
    const withDuration = (activeDuration: unknown) =>
      ({ effect: { getComputedTiming: () => ({ activeDuration }) } }) as unknown as Animation
    expect(calculateTargetEffectEnd(withDuration(1500))).toBe(1500)
    expect(calculateTargetEffectEnd(withDuration(css().percent(10)))).toBe(0)
    expect(calculateTargetEffectEnd({ effect: null } as unknown as Animation)).toBe(0)
  })
})

describe('getScrollParent', () => {
  const chain = (...styles: Partial<FakeElement>[]): StubElement[] => {
    const elements: StubElement[] = []
    for (const init of styles) {
      elements.push(createElement({ parentElement: elements.at(-1) ?? null, ...init }))
    }
    return elements
  }
  it('returns null for detached nodes', () => {
    expect(getScrollParent(null)).toBeNull()
    expect(getScrollParent(createElement({ isConnected: false }))).toBeNull()
  })
  it('finds the nearest scrolling block container', () => {
    const [scroller, , , subject] = chain(
      {},
      { style: { overflowX: 'visible' } },
      { style: { display: 'inline', overflowX: 'auto' } },
      {},
    )
    expect(getScrollParent(required(subject))).toBe(scroller)
  })
  it.each(['scroll', 'hidden'])('accepts overflow %s', (overflowX) => {
    const [scroller, subject] = chain({ style: { overflowX } }, {})
    expect(getScrollParent(required(subject))).toBe(scroller)
  })
  it('falls back to the scrolling element', () => {
    doc.scrollingElement = createScroller()
    const [, subject] = chain({ style: { overflowX: 'visible' } }, {})
    expect(getScrollParent(required(subject))).toBe(doc.scrollingElement)
    const [, unknown] = chain({}, { style: { position: 'unknown' } })
    expect(getScrollParent(required(unknown))).toBe(doc.scrollingElement)
  })
  it('skips static ancestors of absolutely positioned elements', () => {
    const [positioned, , subject] = chain(
      { style: { position: 'relative' } },
      {},
      { style: { position: 'absolute' } },
    )
    expect(getScrollParent(required(subject))).toBe(positioned)
  })
  it.each([
    { transform: 'scale(2)' },
    { perspective: '10px' },
    { willChange: 'transform' },
    { willChange: 'perspective' },
    { filter: 'blur(1px)' },
    { willChange: 'filter' },
    { backdropFilter: 'blur(1px)' },
  ])('uses the %o ancestor as the containing block of fixed elements', (style) => {
    const [container, , subject] = chain({ style }, {}, { style: { position: 'fixed' } })
    expect(getScrollParent(required(subject))).toBe(container)
  })
  it('propagates body overflow to the viewport', () => {
    const root = createScroller({ style: { overflow: 'visible' } })
    const [body, subject] = chain({}, {})
    doc.scrollingElement = root
    doc.body = required(body)
    expect(getScrollParent(required(subject))).toBe(root)
    root.style.overflow = 'auto'
    expect(getScrollParent(required(subject))).toBe(body)
  })
})

describe('getAnonymousSourceElement', () => {
  it('resolves root, self and nearest sources', () => {
    const { source, subject } = createViewFixture()
    doc.scrollingElement = createScroller()
    expect(getAnonymousSourceElement('root', null)).toBe(doc.scrollingElement)
    expect(getAnonymousSourceElement('self', subject)).toBe(subject)
    expect(getAnonymousSourceElement('nearest', subject)).toBe(source)
    expect(getAnonymousSourceElement('nearest', null)).toBeNull()
  })
  it('rejects unknown source types', () => {
    const type = 'parent' as unknown as AnonymousSource
    expect(() => getAnonymousSourceElement(type, null)).toThrow(
      new TypeError('Invalid ScrollTimeline Source Type.'),
    )
  })
})

describe('timeline bookkeeping', () => {
  const animation = {} as Animation
  it('ticks attached animations after a microtask and on scroll', async () => {
    const source = createScroller({ scrollTop: 50 })
    const timeline = new ScrollTimeline({ source })
    const tick = vi.fn()
    addAnimation(timeline, animation, tick)
    addAnimation(timeline, animation, tick)
    expect(getTimelineDetails(timeline).animations).toHaveLength(1)
    expect(tick).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(tick).toHaveBeenCalledTimes(1)
    expect(String(tick.mock.lastCall?.[0])).toBe('12.5%')
    scrollTo(source, 100)
    expect(String(tick.mock.lastCall?.[0])).toBe('25%')
    removeAnimation(timeline, animation)
    scrollTo(source, 200)
    expect(tick).toHaveBeenCalledTimes(2)
  })
  it('rejects unregistered timelines', () => {
    const timeline = Object.create(ScrollTimeline.prototype) as ScrollTimeline
    expect(() => _getStlOptions(timeline)).toThrow('Unregistered scroll timeline')
    expect(() => timeline.source).toThrow(TypeError)
  })
  it('re-measures the source when its observers fire', async () => {
    const source = createScroller()
    const timeline = new ScrollTimeline({ source })
    const tick = vi.fn()
    addAnimation(timeline, animation, tick)
    await Promise.resolve()
    const [resize, mutation] = observersOf(source)
    expect(resize?.targets).toEqual([source, ...source.children])
    Object.assign(source, { scrollTop: 200, scrollHeight: 900 })
    resize?.trigger()
    mutation?.trigger([{ target: source }, { target: {} }])
    await nextTask()
    expect(tick).toHaveBeenCalledTimes(2)
    expect(String(tick.mock.lastCall?.[0])).toBe('25%')
  })
  it('ignores measurement requests for unknown or detached sources', () => {
    expect(() => updateMeasurements(null)).not.toThrow()
    expect(() => updateMeasurements(createScroller())).not.toThrow()
    const source = createScroller()
    new ScrollTimeline({ source })
    source.isConnected = false
    expect(() => updateMeasurements(source)).not.toThrow()
  })
})

describe('fractionalOffset', () => {
  it.each([
    ['px', css().px(100), 0.25],
    ['percent', css().percent(50), 0.5],
    ['calc', numeric.CSSNumericValue.parse('calc(10% + 60px)'), 0.25],
  ])('resolves %s offsets against the scroll range', (_unit, value, expected) => {
    const timeline = new ScrollTimeline({ source: createScroller() })
    expect(fractionalOffset(timeline, value)).toBe(expected)
  })
  it('uses the horizontal scroll range for the x axis', () => {
    const source = createScroller({ scrollWidth: 600 })
    expect(fractionalOffset(new ScrollTimeline({ source, axis: 'x' }), css().px(100))).toBe(0.25)
  })
  it('returns 0 without a scroll range', () => {
    const named = { rangeName: 'cover', offset: css().percent(0) } as const
    expect(fractionalOffset(new ScrollTimeline({ source: null }), css().px(1))).toBe(0)
    expect(fractionalOffset(new ScrollTimeline({ source: createScroller() }), named)).toBe(0)
    const detached = new ScrollTimeline({ source: createScroller({ isConnected: false }) })
    expect(fractionalOffset(detached, css().px(1))).toBe(0)
    const flat = new ScrollTimeline({ source: createScroller({ scrollHeight: 100 }) })
    expect(fractionalOffset(flat, css().px(1))).toBe(0)
  })
  it('rejects unresolvable offsets and timelines', () => {
    const timeline = new ScrollTimeline({ source: createScroller() })
    expect(() => fractionalOffset(timeline, css().em(1))).toThrow('Unhandled unit type em')
    const sum = numeric.CSSNumericValue.parse('calc(1em + 1px)')
    expect(() => fractionalOffset(timeline, sum)).toThrow('Unsupported value type')
    const foreign = {} as ScrollTimeline
    expect(() => fractionalOffset(foreign, css().px(1))).toThrow('Unsupported timeline class')
  })
})

describe('calculateRelativePosition', () => {
  const phase = { start: 50, end: 130 }
  const cover = { start: 50, end: 230 }
  it.each([
    ['percent', css().percent(50), 40 / 180],
    ['px', css().px(90), 0.5],
    ['em', css().em(2), 32 / 180],
  ])('resolves %s offsets within the phase', (_unit, offset, expected) => {
    expect(calculateRelativePosition(phase, offset, cover, createElement())).toBeCloseTo(expected)
  })
  it('returns 0 without ranges, subject or cover extent', () => {
    const subject = createElement()
    const offset = css().percent(50)
    expect(calculateRelativePosition(null, offset, cover, subject)).toBe(0)
    expect(calculateRelativePosition(phase, offset, null, subject)).toBe(0)
    expect(calculateRelativePosition(phase, offset, cover, null)).toBe(0)
    expect(calculateRelativePosition(phase, offset, { start: 5, end: 5 }, subject)).toBe(0)
  })
  it('rejects non-length offsets', () => {
    expect(() => calculateRelativePosition(phase, css().s(1), cover, createElement())).toThrow(
      TypeError,
    )
  })
})

describe('ViewTimeline', () => {
  it('has no source or offsets without a subject', () => {
    doc.scrollingElement = createScroller()
    const timeline = new ViewTimeline()
    expect(timeline.subject).toBeNull()
    expect(timeline.source).toBeNull()
    expect(timeline.startOffset).toBeNull()
    expect(timeline.endOffset).toBeNull()
    expect(timeline.currentTime).toBeNull()
    expect(() => {
      timeline.source = null
    }).toThrow('Cannot set the source of a view timeline')
  })
  it('derives its source and cover range from the subject', () => {
    const { source, subject } = createViewFixture()
    const timeline = new ViewTimeline({ subject, axis: 'y' })
    expect(timeline.source).toBe(source)
    expect(timeline.subject).toBe(subject)
    expect(timeline.axis).toBe('y')
    expect(String(timeline.startOffset)).toBe('50px')
    expect(String(timeline.endOffset)).toBe('230px')
    expect(timeline.currentTime?.value).toBeCloseTo(-50 / 1.8)
    scrollTo(source, 140)
    expect(String(timeline.currentTime)).toBe('50%')
  })
  it('computes fractional offsets of named ranges', () => {
    const { subject } = createViewFixture()
    const timeline = new ViewTimeline({ subject })
    const entry = { rangeName: 'entry', offset: css().percent(50) } as const
    expect(fractionalOffset(timeline, entry)).toBeCloseTo(40 / 180)
    expect(() => fractionalOffset(timeline, css().percent(50))).toThrow(
      new TypeError('Expected a named view range'),
    )
  })
  it.each([
    ['literal', '10px 20px'],
    ['variable', 'var(--inset)'],
  ])('applies %s insets', (_kind, inset) => {
    const { subject } = createViewFixture()
    subject.style['--inset'] = '10px 20px'
    const timeline = new ViewTimeline({ subject, inset })
    expect(String(timeline.startOffset)).toBe('70px')
    expect(String(timeline.endOffset)).toBe('220px')
  })
  it('detaches from its source while the subject is not rendered', () => {
    const { source, subject } = createViewFixture()
    const timeline = new ViewTimeline({ subject })
    subject.style.display = 'none'
    expect(timeline.source).toBeNull()
    expect(timeline.startOffset).toBeNull()
    expect(range(timeline, 'cover')).toBeNull()
    subject.style.display = 'block'
    expect(timeline.source).toBe(source)
  })
  it('re-measures the subject when it resizes', async () => {
    const { source, subject } = createViewFixture()
    const timeline = new ViewTimeline({ subject })
    const [resize, mutation] = observersOf(subject)
    expect(getTimelineDetails(timeline).artsSubjectObservers).toEqual([resize, mutation])
    subject.offsetHeight = 180
    resize?.trigger()
    expect(String(timeline.endOffset)).toBe('330px')
    subject.offsetHeight = 100
    mutation?.trigger()
    expect(String(timeline.endOffset)).toBe('250px')
    scrollTo(source, 50)
    await nextTask()
    expect(String(timeline.currentTime)).toBe('0%')
  })
  it('follows a subject moved to another scroller', () => {
    const { source, subject } = createViewFixture()
    const timeline = new ViewTimeline({ subject })
    const other = createScroller()
    const unlisten = vi.spyOn(source, 'removeEventListener')
    subject.parentElement = other
    expect(timeline.source).toBe(other)
    expect(unlisten).toHaveBeenCalled()
  })
  it('has no progress for an empty cover range', () => {
    const { source, subject } = createViewFixture()
    Object.assign(source, { clientHeight: 0 })
    Object.assign(subject, { offsetHeight: 0 })
    const timeline = new ViewTimeline({ subject })
    expect(String(timeline.startOffset)).toBe('150px')
    expect(timeline.currentTime).toBeNull()
  })
  it('only computes ranges for active view timelines', () => {
    const scroll = new ScrollTimeline({ source: createScroller() })
    expect(range(scroll, 'cover')).toBeNull()
    const { source, subject } = createViewFixture()
    const timeline = new ViewTimeline({ subject })
    source.style.overflow = 'visible'
    expect(range(timeline, 'cover')).toBeNull()
  })
})

describe('createScrollTimeline', () => {
  // Loaded lazily: its proxy-animation.ts dependency reads DOM globals on import.
  async function withSheet(sheet: string) {
    const { parser, createScrollTimeline } = await import(
      '../../src/ts/upstream/scroll-timeline-css.js'
    )
    parser.transpileStyleSheet(parser.transpileStyleSheet(sheet, true), false)
    return createScrollTimeline
  }
  function cssAnimation(animationName: string, offsets: number[] = []) {
    const effect = new FakeEffect()
    effect.keyframes = offsets.map((offset) => ({
      offset,
      computedOffset: offset,
      easing: 'linear',
      composite: 'auto',
    }))
    const animation = Object.assign(new FakeAnimation(effect), { animationName })
    return { animation: animation as unknown as CSSAnimation, effect }
  }
  const offsets = (effect: FakeEffect) => effect.keyframes.map((keyframe) => keyframe.offset)

  it('returns null without a resolvable timeline', async () => {
    const create = await withSheet(
      '.plain { animation-name: plain; } .orphan { animation-name: orphan; animation-timeline: --missing; }',
    )
    const plain = createElement({ selectors: ['.plain'] })
    const orphan = createElement({ selectors: ['.orphan'] })
    expect(create(cssAnimation('plain').animation, 'plain', plain)).toBeNull()
    expect(create(cssAnimation('plain').animation, 'plain', createElement())).toBeNull()
    expect(create(cssAnimation('orphan').animation, 'orphan', orphan)).toBeNull()
  })
  it('binds a named scroll timeline declared on an ancestor', async () => {
    const create = await withSheet(
      '.list { scroll-timeline: --list x; } .item { animation-name: slide; animation-timeline: --list; animation-range: 10% 90%; }',
    )
    const scroller = createScroller({ selectors: ['.list'] })
    const item = createElement({ selectors: ['.item'], parentElement: scroller })
    const result = create(cssAnimation('slide').animation, 'slide', item)
    expect(result?.timeline).toBeInstanceOf(ScrollTimeline)
    expect(result?.timeline.source).toBe(scroller)
    expect(result?.timeline.axis).toBe('x')
    expect(result?.animOptions).toEqual({
      'animation-timeline': '--list',
      'animation-range': '10% 90%',
    })
  })
  it('binds anonymous scroll timelines', async () => {
    const create = await withSheet(
      '.bar { animation-name: grow; animation-timeline: scroll(root x); }',
    )
    doc.scrollingElement = createScroller()
    const bar = createElement({ selectors: ['.bar'] })
    const result = create(cssAnimation('grow').animation, 'grow', bar)
    expect(result?.timeline.source).toBe(doc.scrollingElement)
    expect(result?.timeline.axis).toBe('x')
  })
  it('binds view timelines and remaps phase keyframes onto the cover range', async () => {
    const create = await withSheet(
      '@keyframes reveal { from { opacity: 0 } entry 50% { opacity: 1 } exit 50% { opacity: 1 } to { opacity: 0 } } .card { view-timeline: --card; animation-name: reveal; animation-timeline: --card; }',
    )
    const { source, subject } = createViewFixture()
    subject.selectors = ['.card']
    const { animation, effect } = cssAnimation('reveal', [0, 0.01, 0.02, 0.03, 0.9])
    const result = create(animation, 'reveal', subject)
    expect(result?.timeline).toBeInstanceOf(ViewTimeline)
    expect(result?.timeline.source).toBe(source)
    const [from, entry, exit, to] = offsets(effect)
    expect(offsets(effect)).toHaveLength(4)
    expect([from, to]).toEqual([0, 1])
    expect(entry).toBeCloseTo(40 / 180)
    expect(exit).toBeCloseTo(140 / 180)
  })
  it('applies anonymous view timeline insets to phase keyframes', async () => {
    const create = await withSheet(
      '@keyframes pop { entry 50% { opacity: 1 } 50% { opacity: 1 } exit 50% { opacity: 0 } } .pop { animation-name: pop; animation-timeline: view(block 10px); }',
    )
    const { subject } = createViewFixture()
    subject.selectors = ['.pop']
    const { animation, effect } = cssAnimation('pop', [0, 0.01, 0.02])
    const timeline = create(animation, 'pop', subject)?.timeline
    expect(timeline).toBeInstanceOf(ViewTimeline)
    expect(String((timeline as ViewTimeline).startOffset)).toBe('60px')
    expect(offsets(effect)).toEqual([0.25, 0.5, 0.75])
  })
  it('leaves keyframes without phase selectors or keyframe effects untouched', async () => {
    const create = await withSheet(
      '@keyframes fade { from { opacity: 0 } to { opacity: 1 } } .fade { view-timeline: --fade; animation-name: fade; animation-timeline: --fade; }',
    )
    const { subject } = createViewFixture()
    subject.selectors = ['.fade']
    const { animation, effect } = cssAnimation('fade', [0, 1])
    expect(create(animation, 'fade', subject)).not.toBeNull()
    expect(offsets(effect)).toEqual([0, 1])
    const detached = Object.assign(cssAnimation('fade').animation, { effect: null })
    expect(create(detached, 'fade', subject)).not.toBeNull()
  })
  it('rejects unknown keyframe phases', async () => {
    const create = await withSheet(
      '@keyframes odd { entry 0% { opacity: 0 } inside 10% { opacity: 1 } } .odd { view-timeline: --odd; animation-name: odd; animation-timeline: --odd; }',
    )
    const { subject } = createViewFixture()
    subject.selectors = ['.odd']
    const { animation } = cssAnimation('odd', [0, 0.01])
    expect(() => create(animation, 'odd', subject)).toThrow('Invalid keyframe range')
  })
})

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing fixture element')
  return value
}
