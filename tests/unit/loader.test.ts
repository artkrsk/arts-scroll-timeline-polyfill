import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface FakeScript {
  src?: string
  onload?: () => void
  onerror?: () => void
}

let script: FakeScript
const createElement = vi.fn((_tag: string) => script)
const appendChild = vi.fn()

async function load(): Promise<void> {
  vi.resetModules()
  await import('../../src/ts/loader.js')
}
const ready = () => window.__artsScrollTimelinePolyfillReady

function stubPrerequisites(): void {
  vi.stubGlobal('CSS', { supports: () => false })
  vi.stubGlobal('Animation', class {})
  vi.stubGlobal('KeyframeEffect', class {})
  vi.stubGlobal(
    'Element',
    class {
      animate(): void {}
      getAnimations(): void {}
    },
  )
  vi.stubGlobal('ResizeObserver', class {})
  vi.stubGlobal('MutationObserver', class {})
  vi.stubGlobal('requestAnimationFrame', () => 0)
}

function stubTimelines(): void {
  vi.stubGlobal('ScrollTimeline', class {})
  vi.stubGlobal('ViewTimeline', class {})
}

beforeEach(() => {
  script = {}
  createElement.mockClear()
  appendChild.mockClear()
  vi.stubGlobal('window', globalThis)
  vi.stubGlobal('document', {
    getAnimations: () => [],
    createElement,
    head: { appendChild },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(globalThis, '__artsScrollTimelinePolyfillReady')
})

describe('loader', () => {
  it('resolves native when the browser supports scroll-driven animations', async () => {
    vi.stubGlobal('CSS', { supports: () => true })
    stubTimelines()
    await load()
    await expect(ready()).resolves.toBe('native')
    expect(createElement).not.toHaveBeenCalled()
  })

  it('is unavailable without a polyfill source', async () => {
    stubPrerequisites()
    await load()
    await expect(ready()).resolves.toBe('unavailable')
    expect(createElement).not.toHaveBeenCalled()
  })

  it('is unavailable when prerequisites are missing', async () => {
    vi.stubGlobal('__artsScrollTimelinePolyfillSrc', '/polyfill.js')
    await load()
    await expect(ready()).resolves.toBe('unavailable')
    expect(createElement).not.toHaveBeenCalled()
  })

  describe('with a source and prerequisites', () => {
    beforeEach(() => {
      stubPrerequisites()
      vi.stubGlobal('__artsScrollTimelinePolyfillSrc', '/polyfill.js')
    })

    it('appends the script and resolves polyfilled once timelines exist', async () => {
      await load()
      expect(appendChild).toHaveBeenCalledWith(script)
      expect(createElement).toHaveBeenCalledWith('script')
      expect(script.src).toBe('/polyfill.js')
      stubTimelines()
      script.onload?.()
      await expect(ready()).resolves.toBe('polyfilled')
    })

    it('is unavailable when the script loads without timelines', async () => {
      await load()
      expect(appendChild).toHaveBeenCalled()
      script.onload?.()
      await expect(ready()).resolves.toBe('unavailable')
    })

    it('is unavailable when the script fails to load', async () => {
      await load()
      expect(appendChild).toHaveBeenCalled()
      script.onerror?.()
      await expect(ready()).resolves.toBe('unavailable')
    })

    it.each([
      'Animation',
      'KeyframeEffect',
      'ResizeObserver',
      'MutationObserver',
      'requestAnimationFrame',
    ])('is unavailable without %s', async (name) => {
      vi.stubGlobal(name, undefined)
      await load()
      await expect(ready()).resolves.toBe('unavailable')
      expect(createElement).not.toHaveBeenCalled()
    })

    it('is unavailable when creating the script throws', async () => {
      createElement.mockImplementationOnce(() => {
        throw new Error('blocked')
      })
      await load()
      await expect(ready()).resolves.toBe('unavailable')
      expect(appendChild).not.toHaveBeenCalled()
    })
  })
})
