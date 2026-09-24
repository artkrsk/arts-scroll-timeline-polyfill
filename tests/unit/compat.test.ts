import { afterAll, afterEach, beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest'
import { initArtsCSSPolyfill } from '../../src/ts/arts/compat.js'
import { StyleParser } from '../../src/ts/upstream/scroll-timeline-css-parser.js'
import { parser } from '../../src/ts/upstream/scroll-timeline-css.js'
import { getProxyForNativeAnimation } from '../../src/ts/upstream/proxy-animation.js'
import { installCSSOM } from '../../src/ts/upstream/proxy-cssom.js'
import {
  ScrollTimeline,
  ViewTimeline,
  getTimelineDetails,
} from '../../src/ts/upstream/scroll-timeline-base.js'

const env = vi.hoisted(() => {
  let order = 0
  class FakeNode {
    static readonly TEXT_NODE = 3
    static readonly DOCUMENT_POSITION_FOLLOWING = 4
    readonly order = order++
    nodeType = 1
    isConnected = true
    parentElement: FakeElement | null = null
    contains(other: unknown): boolean {
      for (let node = other as FakeNode | null; node; node = node.parentElement)
        if (node === this) return true
      return false
    }
    compareDocumentPosition(other: FakeNode): number {
      return other.order > this.order ? FakeNode.DOCUMENT_POSITION_FOLLOWING : 2
    }
  }
  class FakeElement extends FakeNode {
    readonly tag: string
    className: string
    readonly children: FakeElement[] = []
    readonly dataset: Record<string, string> = {}
    readonly addEventListener = vi.fn()
    readonly removeEventListener = vi.fn()
    animations: unknown[] = []
    constructor(tag: string, className = '') {
      super()
      this.tag = tag
      this.className = className
    }
    append(...children: FakeElement[]): this {
      for (const child of children) {
        child.parentElement = this
        this.children.push(child)
      }
      return this
    }
    matches(selector: string): boolean {
      return selector.split(',').some((part) => part === this.tag || part === `.${this.className}`)
    }
    querySelectorAll(selector: string): FakeElement[] {
      return this.children.flatMap((child) => [
        ...(child.matches(selector) ? [child] : []),
        ...child.querySelectorAll(selector),
      ])
    }
    getAnimations(): unknown[] {
      return this.animations
    }
    animate(): void {}
  }
  class FakeStyle extends FakeElement {
    textContent: string | null
    constructor(css: string | null) {
      super('style')
      this.textContent = css
    }
  }
  class FakeLink extends FakeElement {
    href: string
    rel = 'stylesheet'
    type = ''
    constructor(href: string) {
      super('link')
      this.href = href
    }
  }
  class FakeAnimation {
    playState = 'running'
    playbackRate = 1
    currentTime: number | null = null
    timeline = null
    effect: unknown = null
    play = vi.fn()
    pause = vi.fn()
    cancel = vi.fn()
  }
  class FakeKeyframeEffect {
    target: unknown
    keyframes: Partial<ComputedKeyframe>[] = []
    applied: Partial<ComputedKeyframe>[] | null = null
    constructor(target: unknown) {
      this.target = target
    }
    getKeyframes(): Partial<ComputedKeyframe>[] {
      return this.keyframes.map((keyframe) => ({ ...keyframe }))
    }
    setKeyframes(keyframes: Partial<ComputedKeyframe>[]): void {
      this.applied = keyframes
    }
    getTiming(): EffectTiming {
      return {}
    }
    getComputedTiming(): ComputedEffectTiming {
      return {}
    }
    updateTiming(): void {}
  }
  class FakeCSSAnimation extends FakeAnimation {
    animationName: string
    constructor(animationName: string, effect: unknown) {
      super()
      this.animationName = animationName
      this.effect = effect
    }
  }
  class FakeMutationObserver {
    readonly callback: (records: unknown[]) => void
    constructor(callback: (records: unknown[]) => void) {
      this.callback = callback
    }
    observe(target: unknown): void {
      observers.push({ callback: this.callback, target })
    }
    disconnect(): void {}
  }
  const observers: { callback: (records: unknown[]) => void; target: unknown }[] = []
  const frames: FrameRequestCallback[] = []
  const listeners = new Map<string, (event: unknown) => void>()
  const root = new FakeElement('html')
  const animations: unknown[] = []
  const supports = vi.fn((..._args: string[]) => false)
  const fetch = vi.fn<(href: string) => Promise<{ text(): Promise<string> }>>()
  vi.stubGlobal('window', {
    Element: FakeElement,
    Animation: FakeAnimation,
    addEventListener: (type: string, listener: (event: unknown) => void) =>
      listeners.set(type, listener),
  })
  vi.stubGlobal('document', {
    documentElement: root,
    baseURI: 'https://site.test/',
    scrollingElement: null,
    getAnimations: () => animations,
    querySelectorAll: (selector: string) => root.querySelectorAll(selector),
  })
  vi.stubGlobal('Node', FakeNode)
  vi.stubGlobal('Element', FakeElement)
  vi.stubGlobal('HTMLStyleElement', FakeStyle)
  vi.stubGlobal('HTMLLinkElement', FakeLink)
  vi.stubGlobal('Animation', FakeAnimation)
  vi.stubGlobal('CSSAnimation', FakeCSSAnimation)
  vi.stubGlobal('KeyframeEffect', FakeKeyframeEffect)
  vi.stubGlobal('MutationObserver', FakeMutationObserver)
  vi.stubGlobal('CSS', { supports })
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => frames.push(frame))
  vi.stubGlobal('location', { origin: 'https://site.test' })
  vi.stubGlobal('fetch', fetch)
  return {
    FakeElement,
    FakeStyle,
    FakeLink,
    FakeAnimation,
    FakeCSSAnimation,
    FakeKeyframeEffect,
    observers,
    frames,
    listeners,
    root,
    animations,
    supports,
    fetch,
  }
})

function transpile(css: string, known?: StyleParser): string {
  const p = known ?? new StyleParser()
  return p.transpileStyleSheet(p.transpileStyleSheet(css, true), false)
}

describe('patched StyleParser', () => {
  it.each([
    [
      '.a{animation:fade auto linear;animation-timeline:--t}',
      '.a{animation:fade 1s linear;animation-timeline:--t;animation-duration:1s;}',
    ],
    ['.a{animation-timeline:scroll()}', '.a{animation-timeline:scroll();animation-duration:1s;}'],
    [
      '.a{animation:a auto, b 2s;animation-timeline:--x,none}',
      '.a{animation:a 1s,b 2s;animation-timeline:--x,none;animation-duration:1s,2s;}',
    ],
    [
      '.a{animation:fade auto;animation-timeline:none}',
      '.a{animation:fade 0s;animation-timeline:none}',
    ],
    [
      '.a{animation-timeline:--t;animation:fade auto}',
      '.a{animation-timeline:--t;animation:fade 0s}',
    ],
    [
      '.a{animation:fade auto !important;animation-timeline:--t}',
      '.a{animation:fade 1s !important;animation-timeline:--t;animation-duration:1s!important;}',
    ],
    [
      '.a{animation-duration:auto !important;animation-timeline:--t}',
      '.a{animation-duration:auto !important;animation-timeline:--t;animation-duration:1s!important;}',
    ],
    [
      ".a{animation-duration:0s;animation-name:'f';animation-timeline:--t}",
      ".a{animation-duration:0s;animation-name:'f';animation-timeline:--t}",
    ],
    ['.a{foo;animation-timeline:--t}', '.a{foo;animation-timeline:--t;animation-duration:1s;}'],
    [
      '.a{animation:fade linear;animation-timeline:--t}',
      '.a{animation:fade linear;animation-timeline:--t;animation-duration:1s;}',
    ],
    ['.a{color:red}', '.a{color:red}'],
    ['@keyframes k{from{color:red}}', '@keyframes k{from{color:red}}'],
  ])('rewrites %s', (css, expected) => {
    expect(transpile(css)).toBe(expected)
  })

  it('records animation names from longhands and shorthands', () => {
    const p = new StyleParser()
    transpile(
      '@keyframes paused{from{}} .a{animation:paused auto;animation-timeline:--t} ' +
        '.b{animation-name:"x", y;animation-timeline:--u} ' +
        ".c{animation:2s ease-in 1 'quoted';animation-timeline:--v} " +
        '.d{animation:1s steps(4) linear;animation-timeline:--w}',
      p,
    )
    expect(p.cssRulesWithTimelineName).toEqual([
      { selector: '.a', 'animation-timeline': '--t', 'animation-name': 'paused' },
      { selector: '.b', 'animation-timeline': '--u', 'animation-name': 'x' },
      { selector: '.b', 'animation-timeline': '--u', 'animation-name': 'y' },
      { selector: '.c', 'animation-timeline': '--v', 'animation-name': 'quoted' },
      { selector: '.d', 'animation-timeline': '--w', 'animation-name': 'none' },
    ])
  })

  it('names anonymous timelines in declaration order', () => {
    const p = new StyleParser()
    expect(
      p.extractScrollTimelineNames('animation-timeline: scroll(x), --a, view(block 1px);'),
    ).toEqual([':t0', '--a', ':t1'])
    expect(p.anonymousScrollTimelineOptions.get(':t0')).toEqual({ axis: 'x' })
    expect(p.anonymousViewTimelineOptions.get(':t1')).toEqual({ axis: 'block', inset: '1px' })
  })

  it.each([
    ['view(x 10px 20%)', { axis: 'x', inset: '10px 20%' }],
    ['view()', {}],
    ['view(var(--a, 1px) block)', { axis: 'block', inset: 'var(--a, 1px)' }],
  ])('parses %s', (value, expected) => {
    expect(new StyleParser().parseAnonymousViewTimeline(value)).toEqual(expected)
  })

  it('splits values without breaking functions or lists', () => {
    const p = new StyleParser()
    expect(p.split(' a  b(c d) ')).toEqual(['a', 'b(c d)'])
    expect(p.extractMatches('animation-name: a, f(b, c);', /animation-name:([^;]+)/)).toEqual([
      'a',
      'f(b, c)',
    ])
    expect(p.extractMatches('color: red', /animation-name:([^;]+)/)).toEqual([])
  })
})

interface FakeRecord {
  type: 'attributes' | 'characterData' | 'childList'
  target: unknown
  addedNodes?: unknown[]
  removedNodes?: unknown[]
}

const source = '.a{animation:fade auto;animation-timeline:--t}'
const output = '.a{animation:fade 1s;animation-timeline:--t;animation-duration:1s;}'
const styles = {
  main: new env.FakeStyle(source),
  opted: new env.FakeStyle('.z{animation-timeline:--z}'),
  broken: new env.FakeStyle('.m{animation-timeline:--m'),
  plain: new env.FakeStyle('.p{color:red}'),
  keyed: new env.FakeStyle('@keyframes spin{from{}} .k{animation:spin 1s}'),
  guards: new env.FakeStyle(
    '.n{animation-name:n;animation-timeline:none} .u{animation-timeline:--u}',
  ),
}
styles.opted.dataset.aphrodite = ''

const flush = () => {
  for (const frame of env.frames.splice(0)) frame(0)
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
const text = (parentElement: unknown) => ({ nodeType: 3, parentElement })
const selectors = () => parser.cssRulesWithTimelineName.map((rule) => rule.selector)

function mutate(...records: FakeRecord[]): void {
  const observer = env.observers.find((entry) => entry.target === env.root)
  if (!observer) throw new Error('Document observer is not installed')
  observer.callback(records.map((record) => ({ addedNodes: [], removedNodes: [], ...record })))
}

function sheet(href: string, css: string): InstanceType<typeof env.FakeLink> {
  env.fetch.mockResolvedValueOnce({ text: async () => css })
  const link = new env.FakeLink(href)
  env.root.append(link)
  return link
}

describe('initArtsCSSPolyfill', () => {
  beforeAll(() => {
    installCSSOM()
    env.root.append(...Object.values(styles))
    initArtsCSSPolyfill()
  })

  afterEach(() => {
    flush()
    env.fetch.mockReset()
  })

  it('rewrites inline styles and leaves skipped or unparsable sheets alone', () => {
    expect(styles.main.textContent).toBe(output)
    expect(styles.opted.textContent).toBe('.z{animation-timeline:--z}')
    expect(styles.broken.textContent).toBe('.m{animation-timeline:--m')
    expect(styles.plain.textContent).toBe('.p{color:red}')
    expect(styles.keyed.textContent).toBe('@keyframes spin{from{}} .k{animation:spin 1s}')
  })

  it('merges sheet registrations into the shared parser in document order', () => {
    expect(parser.cssRulesWithTimelineName[0]).toEqual({
      selector: '.a',
      'animation-timeline': '--t',
      'animation-name': 'fade',
    })
    expect(selectors()).not.toContain('.z')
    expect(parser.keyframeNamesSelectors.has('spin')).toBe(true)
  })

  describe('CSS.supports', () => {
    it.each([
      'animation-timeline',
      'scroll-timeline-axis',
      'view-timeline-inset',
      'timeline-scope',
    ])('claims %s', (property) => {
      expect(CSS.supports(property, 'x')).toBe(true)
      expect(env.supports).not.toHaveBeenCalled()
    })

    it('delegates other declarations and rewrites condition text', () => {
      expect(CSS.supports('color', 'red')).toBe(false)
      expect(env.supports).toHaveBeenLastCalledWith('color', 'red')
      CSS.supports('(animation-timeline: --a) and (view-timeline-axis: x)')
      expect(env.supports).toHaveBeenLastCalledWith(
        '(--supported-property: --a) and (--supported-property: x)',
      )
    })
  })

  describe('inline style mutations', () => {
    it('ignores its own output', () => {
      flush()
      mutate({ type: 'characterData', target: text(styles.main) })
      expect(styles.main.textContent).toBe(output)
      expect(env.frames).toHaveLength(0)
    })

    it('restores normalized text when the authored source is emitted again', () => {
      styles.main.textContent = source
      mutate({ type: 'characterData', target: text(styles.main) })
      expect(styles.main.textContent).toBe(output)
      expect(env.frames).toHaveLength(1)
    })

    it('re-transpiles edited sources', () => {
      styles.main.textContent = '.a{animation:fade auto;animation-timeline:--edited}'
      mutate({ type: 'characterData', target: text(styles.main) })
      expect(styles.main.textContent).toContain('animation-duration:1s')
      expect(parser.cssRulesWithTimelineName[0]?.['animation-timeline']).toBe('--edited')
    })

    it('drops and restores registrations when data-aphrodite toggles', () => {
      styles.main.dataset.aphrodite = ''
      mutate({ type: 'attributes', target: styles.main })
      expect(selectors()).not.toContain('.a')
      delete styles.main.dataset.aphrodite
      mutate({ type: 'attributes', target: styles.main })
      expect(selectors()).toContain('.a')
    })
  })

  describe('tree mutations', () => {
    const container = new env.FakeElement('div')
    const nested = new env.FakeStyle('.nested{animation:x auto;animation-timeline:--n}')
    container.append(nested)

    it('transpiles connected sheets in added subtrees', () => {
      const detached = new env.FakeStyle('.d{animation:x auto;animation-timeline:--d}')
      detached.isConnected = false
      const direct = new env.FakeStyle('.direct{animation:x auto;animation-timeline:--direct}')
      const empty = new env.FakeStyle(null)
      const svgStyle = new env.FakeElement('style')
      env.root.append(container, direct, empty, svgStyle)
      mutate({
        type: 'childList',
        target: env.root,
        addedNodes: [container, detached, direct, empty, svgStyle, {}],
      })
      expect(empty.textContent).toBe('')
      expect(nested.textContent).toContain('animation-duration:1s')
      expect(direct.textContent).toContain('animation-duration:1s')
      expect(detached.textContent).not.toContain('animation-duration')
      expect(selectors()).toEqual(expect.arrayContaining(['.nested', '.direct']))
    })

    it('orders registrations by document position, not processing order', () => {
      const early = new env.FakeStyle('.early{animation-timeline:--e}')
      const late = new env.FakeStyle('.late{animation-timeline:--l}')
      env.root.append(early, late)
      mutate({ type: 'childList', target: env.root, addedNodes: [late] })
      mutate({ type: 'childList', target: env.root, addedNodes: [early] })
      expect(selectors().indexOf('.early')).toBeLessThan(selectors().indexOf('.late'))
    })

    it('batches variable refreshes for attribute changes', () => {
      mutate(
        { type: 'attributes', target: container },
        { type: 'attributes', target: text(null) },
        { type: 'characterData', target: text(null) },
      )
      mutate({ type: 'attributes', target: container })
      expect(env.frames).toHaveLength(1)
      flush()
      expect(env.frames).toHaveLength(0)
    })

    it('forgets sheets removed from the document', () => {
      nested.isConnected = false
      mutate({ type: 'childList', target: env.root, removedNodes: [container, text(null)] })
      expect(env.frames).toHaveLength(1)
      flush()
      expect(selectors()).not.toContain('.nested')
      mutate({ type: 'childList', target: env.root, removedNodes: [container] })
      expect(env.frames).toHaveLength(0)
    })
  })

  describe('linked stylesheets', () => {
    it.each([
      ['non-stylesheet links', { rel: 'icon' }],
      ['links without href', { href: '' }],
      ['cross-origin links', { href: 'https://cdn.test/a.css' }],
    ])('ignores %s', (_label, props) => {
      const link = Object.assign(new env.FakeLink('https://site.test/a.css'), props)
      mutate({ type: 'childList', target: env.root, addedNodes: [link] })
      expect(env.fetch).not.toHaveBeenCalled()
    })

    it('swaps transpiled sheets for blob URLs and revokes replaced blobs', async () => {
      const create = vi.spyOn(URL, 'createObjectURL')
      create.mockReturnValueOnce('blob:one').mockReturnValueOnce('blob:two')
      const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      onTestFinished(() => {
        create.mockRestore()
        revoke.mockRestore()
      })
      const link = sheet('https://site.test/a.css', '.l{animation:x auto;animation-timeline:--l}')
      link.type = 'text/css'
      link.rel = 'preload'
      mutate({ type: 'childList', target: env.root, addedNodes: [link] })
      expect(env.fetch).toHaveBeenCalledWith('https://site.test/a.css')
      await vi.waitFor(() => expect(link.href).toBe('blob:one'))
      expect(link.addEventListener).toHaveBeenCalledWith('load', expect.any(Function), {
        once: true,
      })
      expect(selectors()).toContain('.l')

      mutate({ type: 'attributes', target: link })
      expect(env.fetch).toHaveBeenCalledTimes(1)

      env.fetch.mockResolvedValueOnce({
        text: async () => '.l{animation:y auto;animation-timeline:--l}',
      })
      link.href = 'https://site.test/a.css?v=2'
      mutate({ type: 'attributes', target: link })
      await vi.waitFor(() => expect(link.href).toBe('blob:two'))
      expect(revoke).toHaveBeenCalledWith('blob:one')

      link.isConnected = false
      mutate({ type: 'childList', target: env.root, removedNodes: [link] })
      expect(revoke).toHaveBeenCalledWith('blob:two')
    })

    it.each([
      ['unchanged', '.p{color:red}'],
      ['empty', ''],
    ])('keeps %s sheets and does not refetch them', async (_label, css) => {
      const link = sheet(`https://site.test/${css.length}.css`, css)
      mutate({ type: 'childList', target: env.root, addedNodes: [link] })
      await settle()
      expect(link.href).toBe(`https://site.test/${css.length}.css`)
      mutate({ type: 'attributes', target: link })
      expect(env.fetch).toHaveBeenCalledTimes(1)
    })

    it('ignores failed fetches and stale responses', async () => {
      env.fetch.mockRejectedValueOnce(new Error('offline'))
      const failed = new env.FakeLink('https://site.test/offline.css')
      mutate({ type: 'childList', target: env.root, addedNodes: [failed] })
      const stale = sheet('https://site.test/stale.css', '.s{animation-timeline:--s}')
      mutate({ type: 'childList', target: env.root, addedNodes: [stale] })
      stale.isConnected = false
      await settle()
      expect(stale.href).toBe('https://site.test/stale.css')
      expect(selectors()).not.toContain('.s')
    })

    it('unregisters links opted out with data-aphrodite', async () => {
      const link = sheet('https://site.test/opt.css', '.o{animation-timeline:--o}')
      mutate({ type: 'childList', target: env.root, addedNodes: [link] })
      await settle()
      flush()
      link.dataset.aphrodite = ''
      mutate({ type: 'attributes', target: link })
      expect(env.frames).toHaveLength(1)
      flush()
      expect(selectors()).not.toContain('.o')
      mutate({ type: 'attributes', target: link })
      expect(env.frames).toHaveLength(0)
    })
  })

  describe('window events', () => {
    it('refreshes bindings when a page is restored from the back-forward cache', () => {
      const pageshow = env.listeners.get('pageshow')
      pageshow?.({ persisted: false })
      expect(env.frames).toHaveLength(0)
      pageshow?.({ persisted: true })
      expect(env.frames).toHaveLength(1)
    })

    it('ignores animations that cannot be bound', () => {
      const target = (className: string) => {
        const element = new env.FakeElement('div', className)
        env.root.append(element)
        return element
      }
      const css = (name: string, element: unknown) =>
        new env.FakeCSSAnimation(name, new env.FakeKeyframeEffect(element))
      const detached = target('a')
      detached.isConnected = false
      const idle = css('fade', target('a'))
      idle.playState = 'idle'
      const candidates = [
        new env.FakeAnimation(),
        new env.FakeCSSAnimation('fade', {}),
        css('fade', {}),
        css('fade', detached),
        idle,
        css('fade', target('unmatched')),
        css('n', target('n')),
        css('u', target('u')),
      ]
      env.animations.push(...candidates)
      env.listeners.get('pageshow')?.({ persisted: true })
      flush()
      const element = target('a')
      element.animations = [new env.FakeAnimation(), css('other', element), css('fade', element)]
      const animationstart = env.listeners.get('animationstart')
      animationstart?.({ target: {}, animationName: 'fade' })
      animationstart?.({ target: element, animationName: 'fade' })
      for (const animation of [...candidates, ...element.animations])
        expect((animation as InstanceType<typeof env.FakeAnimation>).pause).not.toHaveBeenCalled()
      env.animations.length = 0
    })
  })

  describe('binding lifecycle', () => {
    class FakeResizeObserver {
      observe(): void {}
      disconnect = vi.fn()
    }
    const vars = new Map<string, string>()
    const computed = {
      display: 'block',
      position: 'static',
      overflow: 'visible',
      overflowX: 'visible',
      writingMode: 'horizontal-tb',
      getPropertyValue: (name: string) => vars.get(name) ?? '',
    }
    const sheetNode = new env.FakeStyle(
      '@keyframes grow{from{} entry 50%{} 60%{} to{}} ' +
        '.scroller{animation:slide auto;animation-timeline:scroll(self)} ' +
        '.viewer{animation:grow auto,shrink auto;animation-timeline:view(var(--inset, 10px))} ' +
        '.named{scroll-timeline:--sc;view-timeline:--vw;animation:spin 1s,fade 1s;' +
        'animation-timeline:--sc,--vw} ' +
        '.swap{animation-timeline:view()}',
    )
    const wrapper = new env.FakeElement('section')
    const scroller = new env.FakeElement('div', 'scroller')
    const viewer = new env.FakeElement('div', 'viewer')
    const slide = new env.FakeCSSAnimation('slide', new env.FakeKeyframeEffect(scroller))
    const growEffect = new env.FakeKeyframeEffect(viewer)
    growEffect.keyframes = [
      { offset: 0.03, computedOffset: 0.03 },
      { offset: 0.02, computedOffset: 0.02 },
      { offset: null, computedOffset: 0.01 },
      { offset: 0, computedOffset: 0 },
      { offset: 0.5, computedOffset: 0.5 },
    ]
    const grow = new env.FakeCSSAnimation('grow', growEffect)
    const shrink = new env.FakeCSSAnimation('shrink', new env.FakeKeyframeEffect(viewer))
    const named = new env.FakeElement('div', 'named')
    const spin = new env.FakeCSSAnimation('spin', new env.FakeKeyframeEffect(named))
    const fade = new env.FakeCSSAnimation('fade', new env.FakeKeyframeEffect(named))
    const proxyOf = (animation: object) =>
      getProxyForNativeAnimation(animation as unknown as Animation)
    const timelineOf = (animation: object) => {
      const timeline = proxyOf(animation)?.timeline
      return timeline instanceof ScrollTimeline ? timeline : null
    }
    const refresh = () => {
      env.listeners.get('pageshow')?.({ persisted: true })
      flush()
    }

    beforeAll(() => {
      vi.stubGlobal('getComputedStyle', () => computed)
      vi.stubGlobal('ResizeObserver', FakeResizeObserver)
      vi.stubGlobal('HTMLElement', class {})
      wrapper.append(scroller, viewer, named)
      env.root.append(sheetNode, wrapper)
      mutate({ type: 'childList', target: env.root, addedNodes: [sheetNode, wrapper] })
      mutate({ type: 'childList', target: env.root, removedNodes: [new env.FakeElement('p')] })
      viewer.animations = [grow]
      env.animations.push(slide, grow, shrink, spin, fade)
    })

    afterAll(() => {
      env.animations.length = 0
    })

    it('binds scroll and view timelines to matching CSS animations', () => {
      refresh()
      const scroll = timelineOf(slide)
      expect(scroll).toBeInstanceOf(ScrollTimeline)
      expect(scroll?.source).toBe(scroller)
      const view = timelineOf(grow)
      expect(view).toBeInstanceOf(ViewTimeline)
      expect(view && getTimelineDetails(view).artsResolvedInset).toBe('10px')
      expect(slide.pause).toHaveBeenCalled()
      expect(grow.pause).toHaveBeenCalled()
      expect(timelineOf(shrink)).toBeInstanceOf(ViewTimeline)
      expect(timelineOf(spin)?.source).toBe(named)
      expect(timelineOf(fade)).toBeInstanceOf(ViewTimeline)
    })

    it('remaps phase-linked keyframes of view timeline animations', () => {
      expect(sheetNode.textContent).toContain('@keyframes grow{0%{}1%{}2%{}3%{}}')
      expect(growEffect.applied).toEqual([
        { offset: 0, computedOffset: 0.01 },
        { offset: 0, computedOffset: 0 },
        { offset: 0.6, computedOffset: 0.02 },
        { offset: 1, computedOffset: 0.03 },
      ])
    })

    it('reuses bound timelines on refresh', () => {
      const bound = [slide, grow, spin, fade].map(timelineOf)
      refresh()
      expect([slide, grow, spin, fade].map(timelineOf)).toEqual(bound)
      expect(bound.map((timeline) => timeline?.axis)).toEqual(['block', 'block', 'block', 'block'])
    })

    it('re-resolves variable insets when ancestors change', () => {
      const view = timelineOf(grow)
      vars.set('--inset', '20px')
      mutate({ type: 'attributes', target: new env.FakeElement('p') })
      flush()
      expect(view && getTimelineDetails(view).artsResolvedInset).toBe('10px')
      mutate({ type: 'attributes', target: wrapper })
      flush()
      expect(view && getTimelineDetails(view).artsResolvedInset).toBe('20px')
      const shrinkView = timelineOf(shrink)
      expect(shrinkView && getTimelineDetails(shrinkView).artsResolvedInset).toBe('20px')
      mutate({ type: 'attributes', target: viewer })
      flush()
      expect(view && getTimelineDetails(view).artsResolvedInset).toBe('20px')
    })

    it('refreshes when a subtree containing a bound target is removed', () => {
      mutate({ type: 'childList', target: env.root, removedNodes: [new env.FakeElement('p')] })
      expect(env.frames).toHaveLength(0)
      mutate({ type: 'childList', target: env.root, removedNodes: [wrapper] })
      expect(env.frames).toHaveLength(1)
    })

    it('replaces a scroll timeline when the rule switches to a view timeline', () => {
      const scroll = timelineOf(slide)
      scroller.className = 'swap'
      refresh()
      expect(timelineOf(slide)).toBeInstanceOf(ViewTimeline)
      expect(scroll?.source).toBeNull()
    })

    it('unbinds and resumes animations whose rule no longer applies', () => {
      scroller.className = 'plain'
      refresh()
      expect(timelineOf(slide)).toBeNull()
      expect(slide.play).toHaveBeenCalled()
    })

    it('rebinds an existing proxy when the rule applies again', () => {
      scroller.className = 'scroller'
      refresh()
      expect(timelineOf(slide)?.source).toBe(scroller)
      expect(slide.pause).toHaveBeenCalled()
    })

    it('tolerates scripts detaching proxies from their timelines', () => {
      const detach = () => {
        const proxy = proxyOf(spin)
        if (proxy) proxy.timeline = null
        expect(timelineOf(spin)).toBeNull()
      }
      detach()
      mutate({ type: 'attributes', target: named })
      mutate({ type: 'childList', target: env.root, removedNodes: [new env.FakeElement('p')] })
      env.listeners.get('pageshow')?.({ persisted: true })
      flush()
      expect(timelineOf(spin)?.source).toBe(named)
      detach()
      spin.playState = 'idle'
      named.animations = [spin]
      env.listeners.get('animationstart')?.({ target: named, animationName: 'spin' })
      refresh()
      expect(timelineOf(spin)).toBeNull()
    })

    it('unbinds idle animations without resuming them', () => {
      grow.playState = 'idle'
      env.listeners.get('animationstart')?.({ target: viewer, animationName: 'grow' })
      expect(timelineOf(grow)).toBeNull()
      slide.playState = 'idle'
      refresh()
      expect(timelineOf(slide)).toBeNull()
      expect(slide.play).not.toHaveBeenCalled()
    })
  })
})
