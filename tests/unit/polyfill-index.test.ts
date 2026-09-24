import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NATIVE_SUPPORT_QUERIES } from '../../src/ts/platform/constants.js'
import {
  createElement,
  createScroller,
  FakeAnimation,
  type FakeDocument,
  FakeEffect,
  FakeElement,
  type FakeWindow,
  installDom,
  observers,
} from './helpers/dom-stubs.js'

let doc: FakeDocument
let win: FakeWindow & Record<string, unknown>
let TestElement: typeof FakeElement
const supports = vi.fn((_property: string, _value?: string) => false)

beforeEach(() => {
  vi.resetModules()
  supports.mockReset()
  const dom = installDom()
  doc = dom.document
  win = dom.window as FakeWindow & Record<string, unknown>
  // A fresh prototype per test, since installing the polyfill redefines its methods.
  TestElement = class extends FakeElement {}
  win.Element = TestElement
  vi.stubGlobal('Element', TestElement)
  vi.stubGlobal('CSS', { supports })
})

const load = () => import('../../src/ts/upstream/index.js')

describe('polyfill entry point', () => {
  it.each(['CSS', 'Animation', 'KeyframeEffect', 'ResizeObserver', 'requestAnimationFrame'])(
    'does not install without %s',
    async (name) => {
      vi.stubGlobal(name, undefined)
      await load()
      expect(win.ScrollTimeline).toBeUndefined()
      expect(Object.hasOwn(doc, 'getAnimations')).toBe(false)
    },
  )
  it('does not install over native scroll timelines', async () => {
    supports.mockReturnValue(true)
    vi.stubGlobal('ScrollTimeline', class {})
    vi.stubGlobal('ViewTimeline', class {})
    await load()
    expect(win.ScrollTimeline).toBeUndefined()
    expect(supports.mock.calls.map(([query]) => query)).toEqual([...NATIVE_SUPPORT_QUERIES])
  })
  it('installs timelines, animation proxies and CSS support', async () => {
    const listen = vi.spyOn(win, 'addEventListener')
    await load()
    const base = await import('../../src/ts/upstream/scroll-timeline-base.js')
    const proxies = await import('../../src/ts/upstream/proxy-animation.js')
    expect(win.ScrollTimeline).toBe(base.ScrollTimeline)
    expect(win.ViewTimeline).toBe(base.ViewTimeline)
    expect(win.Animation).toBe(proxies.ProxyAnimation)
    expect(TestElement.prototype.animate).toBe(proxies.animate)
    expect(TestElement.prototype.getAnimations).toBe(proxies.elementGetAnimations)
    expect(doc.getAnimations).toBe(proxies.documentGetAnimations)
    expect(listen.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(['pagehide', 'pageshow', 'animationstart']),
    )
    expect(typeof CSS.px).toBe('function')
    expect(CSS.supports('animation-timeline', 'view()')).toBe(true)
    CSS.supports('animation-timeline: --x')
    expect(supports).toHaveBeenLastCalledWith('--supported-property: --x')
  })
  it('routes element animations with scroll timelines through proxies', async () => {
    await load()
    const { ProxyAnimation } = await import('../../src/ts/upstream/proxy-animation.js')
    const { ScrollTimeline } = await import('../../src/ts/upstream/scroll-timeline-base.js')
    const element = new TestElement() as unknown as Element
    const timeline = new ScrollTimeline({ source: createScroller() })
    const animation = element.animate(null, { timeline } as unknown as KeyframeAnimationOptions)
    expect(animation).toBeInstanceOf(ProxyAnimation)
    expect(element.getAnimations()).toEqual([animation])
    expect(document.getAnimations()).toEqual([animation])
    expect(animation.timeline).toBe(timeline)
  })
  it.each<[string, () => object, string, RegExp]>([
    ['ScrollTimeline', () => win, 'ScrollTimeline', /attach ScrollTimeline to window/],
    ['ViewTimeline', () => win, 'ViewTimeline', /attach ViewTimeline to window/],
    ['animate', () => TestElement.prototype, 'animate', /animate to DOM Element/],
    ['Animation', () => win, 'Animation', /installing Animation constructor/],
    ['element getAnimations', () => TestElement.prototype, 'getAnimations', /to DOM Element/],
    ['document getAnimations', () => doc, 'getAnimations', /to document/],
  ])('fails loudly when %s cannot be replaced', async (_name, target, property, message) => {
    const owner = target()
    const current: unknown = Reflect.get(owner, property) ?? (() => {})
    Object.defineProperty(owner, property, { value: current, writable: false, configurable: false })
    await expect(load()).rejects.toThrow(message)
  })
})

describe('upstream CSS entry point', () => {
  class StyleElement extends FakeElement {
    innerHTML = ''
    dataset: Record<string, string> = {}
  }
  class LinkElement extends FakeElement {
    type = 'text/css'
    rel = 'stylesheet'
    href = ''
    setAttribute(name: string, value: string): void {
      if (name === 'href') this.href = value
    }
  }
  class CSSAnimationStub extends FakeAnimation {}
  const sheets: Record<string, string> = {
    'https://example.test/timeline.css': '.a { animation: fade; animation-timeline: --t; }',
    'https://example.test/plain.css': '.b { color: red; }',
  }
  const fetchSheet = vi.fn(async (url: string) => ({ text: async () => sheets[url] ?? '' }))
  const phases = '@keyframes a { entry 0% { opacity: 0 } exit 100% { opacity: 1 } }'

  beforeEach(() => {
    fetchSheet.mockClear()
    vi.stubGlobal('HTMLStyleElement', StyleElement)
    vi.stubGlobal('HTMLLinkElement', LinkElement)
    vi.stubGlobal('CSSAnimation', CSSAnimationStub)
    vi.stubGlobal('fetch', fetchSheet)
    vi.stubGlobal('location', { origin: 'https://example.test' })
    Object.assign(doc, { baseURI: 'https://example.test/' })
  })
  async function init(...nodes: FakeElement[]) {
    doc.querySelectorAll = (selector) =>
      nodes.filter((node) => node instanceof (selector === 'style' ? StyleElement : LinkElement))
    const { installCSSOM } = await import('../../src/ts/upstream/proxy-cssom.js')
    installCSSOM()
    const module = await import('../../src/ts/upstream/scroll-timeline-css.js')
    module.initCSSPolyfill()
    return module
  }
  const style = (innerHTML: string, dataset: Record<string, string> = {}) =>
    Object.assign(new StyleElement(), { innerHTML, dataset })
  const link = (href: string, init: Partial<LinkElement> = {}) =>
    Object.assign(new LinkElement(), { href, ...init })

  it('does nothing when timelines are supported natively', async () => {
    supports.mockReturnValue(true)
    await init(style(phases))
    expect(CSS.supports).toBe(supports)
    expect(observers).toHaveLength(0)
  })
  it('transpiles phase keyframes in existing and added style elements', async () => {
    const existing = style(phases)
    const aphrodite = style(phases, { aphrodite: '' })
    await init(existing, style('  '), aphrodite)
    expect(existing.innerHTML).toBe('@keyframes a {0%{ opacity: 0 }1%{ opacity: 1 } }')
    expect(aphrodite.innerHTML).toBe(phases)
    const added = style(phases)
    observers[0]?.trigger([{ addedNodes: [added, createElement()] }])
    expect(added.innerHTML).toBe(existing.innerHTML)
  })
  it('claims support for timeline properties', async () => {
    await init()
    CSS.supports('view-timeline-inset: 10px')
    expect(supports).toHaveBeenLastCalledWith('--supported-property: 10px')
    CSS.supports('color', 'red')
    expect(supports).toHaveBeenLastCalledWith('color', 'red')
  })
  it('replaces same-origin linked style sheets that need transpiling', async () => {
    const rewritten = link('https://example.test/timeline.css')
    const plain = link('https://example.test/plain.css')
    const remote = link('https://cdn.example.com/timeline.css')
    const icon = link('https://example.test/icon.png', { type: '', rel: 'icon' })
    await init(rewritten, plain, remote, icon, link(''))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchSheet.mock.calls.map(([url]) => url)).toEqual([
      'https://example.test/timeline.css',
      'https://example.test/plain.css',
    ])
    expect(rewritten.href).toMatch(/^blob:/)
    expect(plain.href).toBe('https://example.test/plain.css')
    const added = link('https://example.test/timeline.css')
    observers[0]?.trigger([{ addedNodes: [added] }])
    expect(fetchSheet).toHaveBeenCalledTimes(3)
  })
  it('proxies CSS animations that start on a scroll timeline', async () => {
    await init(
      style(
        '.list { scroll-timeline: --list; } .item { animation-name: slide; animation-timeline: --list; }',
      ),
    )
    const { getProxyForNativeAnimation } = await import('../../src/ts/upstream/proxy-animation.js')
    const { ScrollTimeline } = await import('../../src/ts/upstream/scroll-timeline-base.js')
    const scroller = createScroller({ selectors: ['.list'] })
    const item = Object.assign(new TestElement(), { selectors: ['.item'], parentElement: scroller })
    const animation = Object.assign(new CSSAnimationStub(new FakeEffect()), {
      animationName: 'slide',
    })
    const other = Object.assign(new CSSAnimationStub(), { animationName: 'other' })
    item.animations.push(animation, other)
    const start = (target: unknown) => {
      const event = Object.assign(new Event('animationstart'), { animationName: 'slide' })
      Object.defineProperty(event, 'target', { value: target })
      win.dispatchEvent(event)
    }
    start({})
    expect(getProxyForNativeAnimation(animation as unknown as Animation)).toBeUndefined()
    start(item)
    const proxy = getProxyForNativeAnimation(animation as unknown as Animation)
    const timeline = proxy?.timeline
    expect(timeline).toBeInstanceOf(ScrollTimeline)
    expect((timeline as InstanceType<typeof ScrollTimeline>).source).toBe(scroller)
    expect(animation.calls).toContain('pause')
    expect(getProxyForNativeAnimation(other as unknown as Animation)).toBeUndefined()
    start(item)
    expect(getProxyForNativeAnimation(animation as unknown as Animation)).toBe(proxy)
    expect(proxy?.timeline).not.toBe(timeline)
  })
})
