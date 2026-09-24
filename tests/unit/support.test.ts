import { afterEach, describe, expect, it, vi } from 'vitest'
import { NATIVE_SUPPORT_QUERIES } from '../../src/ts/platform/constants.js'
import { hasNativeSupport, hasPolyfillPrerequisites } from '../../src/ts/platform/support.js'

class Stub {}
class AnimatableElement {
  animate(): void {}
  getAnimations(): void {}
}
class ElementWithoutAnimate {
  getAnimations(): void {}
}
class ElementWithoutGetAnimations {
  animate(): void {}
}

function probe(check: () => boolean): boolean {
  try {
    return check()
  } finally {
    vi.unstubAllGlobals()
  }
}

function stubNativeTimelines(unsupportedQuery?: string): void {
  vi.stubGlobal('CSS', { supports: (query: string) => query !== unsupportedQuery })
  vi.stubGlobal('ScrollTimeline', Stub)
  vi.stubGlobal('ViewTimeline', Stub)
}

function stubPolyfillPrerequisites(): void {
  vi.stubGlobal('CSS', { supports: () => false })
  vi.stubGlobal('Animation', Stub)
  vi.stubGlobal('KeyframeEffect', Stub)
  vi.stubGlobal('Element', AnimatableElement)
  vi.stubGlobal('document', { getAnimations: () => [] })
  vi.stubGlobal('ResizeObserver', Stub)
  vi.stubGlobal('MutationObserver', Stub)
  vi.stubGlobal('requestAnimationFrame', () => 0)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('hasNativeSupport', () => {
  it('is false without a CSS namespace', () => {
    expect(hasNativeSupport()).toBe(false)
  })

  it('is true when timelines exist and every probe is supported', () => {
    stubNativeTimelines()
    expect(probe(hasNativeSupport)).toBe(true)
  })

  it.each<[string, () => void]>([
    ['CSS', () => vi.stubGlobal('CSS', undefined)],
    ['CSS.supports', () => vi.stubGlobal('CSS', {})],
    ['ScrollTimeline', () => vi.stubGlobal('ScrollTimeline', undefined)],
    ['ViewTimeline', () => vi.stubGlobal('ViewTimeline', undefined)],
  ])('is false without %s', (_name, remove) => {
    stubNativeTimelines()
    remove()
    expect(probe(hasNativeSupport)).toBe(false)
  })

  it.each(NATIVE_SUPPORT_QUERIES)('is false when %j is unsupported', (query) => {
    stubNativeTimelines(query)
    expect(probe(hasNativeSupport)).toBe(false)
  })
})

describe('hasPolyfillPrerequisites', () => {
  it('is false in a bare runtime', () => {
    expect(hasPolyfillPrerequisites()).toBe(false)
  })

  it('is true when every required browser API exists', () => {
    stubPolyfillPrerequisites()
    expect(probe(hasPolyfillPrerequisites)).toBe(true)
  })

  it.each<[string, () => void]>([
    ['CSS', () => vi.stubGlobal('CSS', undefined)],
    ['CSS.supports', () => vi.stubGlobal('CSS', {})],
    ['Animation', () => vi.stubGlobal('Animation', undefined)],
    ['KeyframeEffect', () => vi.stubGlobal('KeyframeEffect', undefined)],
    ['Element.prototype.animate', () => vi.stubGlobal('Element', ElementWithoutAnimate)],
    [
      'Element.prototype.getAnimations',
      () => vi.stubGlobal('Element', ElementWithoutGetAnimations),
    ],
    ['document.getAnimations', () => vi.stubGlobal('document', {})],
    ['WeakRef', () => vi.stubGlobal('WeakRef', undefined)],
    ['ResizeObserver', () => vi.stubGlobal('ResizeObserver', undefined)],
    ['MutationObserver', () => vi.stubGlobal('MutationObserver', undefined)],
    ['requestAnimationFrame', () => vi.stubGlobal('requestAnimationFrame', undefined)],
    ['queueMicrotask', () => vi.stubGlobal('queueMicrotask', undefined)],
    ['fetch', () => vi.stubGlobal('fetch', undefined)],
    ['URL.createObjectURL', () => vi.stubGlobal('URL', {})],
  ])('is false without %s', (_name, remove) => {
    stubPolyfillPrerequisites()
    remove()
    expect(probe(hasPolyfillPrerequisites)).toBe(false)
  })
})
