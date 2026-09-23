import { expect, test } from '@playwright/test'
import type { PolyfillAnimation } from '../../src/ts/public/index.js'
import { capabilities, forcePolyfill, polyfillURL } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/api.html')
})

for (const shim of [false, true]) {
  test(`animation contracts with ${shim ? 'shimmed' : 'available'} Typed OM`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await forcePolyfill(page, shim)
    const result = await page.evaluate(async () => {
      const target = document.querySelector('#target')
      const source = document.querySelector('#scroller')
      if (!target || !source) throw new Error('Missing fixture')
      const omitted = target.animate([{ opacity: 0 }, { opacity: 1 }])
      const numeric = target.animate([{ opacity: 0 }, { opacity: 1 }], 100)
      omitted.cancel()
      numeric.cancel()
      const timeline = new ScrollTimeline({ source })
      const options = Object.freeze({ timeline, duration: 1000, fill: 'both' as const })
      // This test has explicitly installed the proxy constructor.
      const animation = target.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        options,
      ) as unknown as PolyfillAnimation
      const ready = await animation.ready
      animation.pause()
      await animation.ready
      animation.currentTime = CSS.percent(25)
      const seekTime = String(animation.currentTime)
      animation.rangeStart = CSS.percent(0)
      // Named ranges are view-only: exercise the valid numeric range on this scroll timeline.
      return { ready: ready === animation, frozen: options.timeline === timeline, seekTime }
    })
    expect(result).toEqual({ ready: true, frozen: true, seekTime: '25%' })
    expect(errors).toEqual([])
  })
}

test('numeric insets, factories, ranges, promises and forwarding retain their contracts', async ({
  page,
}) => {
  await forcePolyfill(page, true)
  const result = await page.evaluate(async () => {
    const source = document.querySelector('#scroller')
    const subject = document.querySelector('#subject')
    const target = document.querySelector('#target')
    if (!source || !subject || !target) throw new Error('Missing fixture')
    const timeline = new ViewTimeline({ subject, inset: [new CSSKeywordValue('auto')] })
    const animation = target.animate([{ opacity: 0 }, { opacity: 1 }], {
      timeline,
      duration: 1000,
      fill: 'both',
      rangeStart: 'cover 0%',
      rangeEnd: 'cover 100%',
    }) as unknown as PolyfillAnimation
    await animation.ready
    const finished = animation.finished
    animation.finish()
    const finishedValue = await finished
    animation.commitStyles()
    const replaceState = animation.replaceState
    const rem = CSS.rem(1).unit
    const frequency = CSS.kHz(1).to('hz').value
    const cancelled = animation.dispatchEvent(new Event('test', { cancelable: true }))
    animation.cancel()
    const inactive = new ViewTimeline({ subject: document.createElement('div') })
    return {
      axis: timeline.axis,
      finished: finishedValue === animation,
      replaceState,
      rem,
      frequency,
      cancelled,
      inactiveTime: inactive.currentTime,
      inactiveStart: inactive.startOffset,
      inactiveEnd: inactive.endOffset,
    }
  })
  expect(result).toEqual({
    axis: 'block',
    finished: true,
    replaceState: 'active',
    rem: 'rem',
    frequency: 1000,
    cancelled: true,
    inactiveTime: null,
    inactiveStart: null,
    inactiveEnd: null,
  })
})

test('persisted page transitions keep programmatic animation state', async ({ page }) => {
  await forcePolyfill(page)
  const result = await page.evaluate(async () => {
    const source = document.querySelector('#scroller')
    const target = document.querySelector('#target')
    if (!source || !target) throw new Error('Missing fixture')
    const animation = target.animate([{ opacity: 0 }, { opacity: 1 }], {
      timeline: new ScrollTimeline({ source }),
      duration: 1000,
      fill: 'both',
    })
    await animation.ready
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    source.scrollTop = 200
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
    const value = String(animation.currentTime)
    animation.cancel()
    return value
  })
  expect(Number.parseFloat(result)).toBeCloseTo(50, 1)
})

test('direct loading preserves native constructors and methods', async ({ page }) => {
  test.skip(!(await capabilities(page)), 'Requires natural native support')
  const result = await page.evaluate(async (url) => {
    const before = {
      ScrollTimeline,
      ViewTimeline,
      Animation,
      animate: Element.prototype.animate,
      getAnimations: Element.prototype.getAnimations,
      supports: CSS.supports,
      CSSUnitValue,
    }
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = url
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Bundle failed'))
      document.head.appendChild(script)
    })
    return (
      before.ScrollTimeline === ScrollTimeline &&
      before.ViewTimeline === ViewTimeline &&
      before.Animation === Animation &&
      before.animate === Element.prototype.animate &&
      before.getAnimations === Element.prototype.getAnimations &&
      before.supports === CSS.supports &&
      before.CSSUnitValue === CSSUnitValue
    )
  }, polyfillURL)
  expect(result).toBe(true)
})

test('source reassignment disconnects observers owned by the old source', async ({ page }) => {
  const result = await page.evaluate(async (url) => {
    let resizes = 0,
      mutations = 0
    const NativeResizeObserver = ResizeObserver,
      NativeMutationObserver = MutationObserver
    window.ResizeObserver = class extends NativeResizeObserver {
      override disconnect(): void {
        resizes++
        super.disconnect()
      }
    }
    window.MutationObserver = class extends NativeMutationObserver {
      override disconnect(): void {
        mutations++
        super.disconnect()
      }
    }
    const supports = CSS.supports.bind(CSS)
    CSS.supports = (property: string, value?: string) =>
      value !== undefined
        ? supports(property, value)
        : property === 'animation-timeline: view()'
          ? false
          : supports(property)
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = url
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Bundle failed'))
      document.head.appendChild(script)
    })
    const source = document.querySelector('#scroller')
    const timeline = new ScrollTimeline({ source })
    Reflect.set(timeline, 'source', null)
    return { resizes, mutations }
  }, polyfillURL)
  expect(result.resizes).toBeGreaterThanOrEqual(1)
  expect(result.mutations).toBeGreaterThanOrEqual(1)
})

test('horizontal and logical axes use the browser scroll origin', async ({ page }) => {
  await forcePolyfill(page)
  const values = await page.evaluate(async () => {
    const source = document.querySelector<HTMLElement>('#scroller')
    if (!source) throw new Error('Missing scroller')
    const values: number[] = []
    for (const [writingMode, direction, axis, sign] of [
      ['horizontal-tb', 'ltr', 'x', 1],
      ['horizontal-tb', 'rtl', 'inline', -1],
      ['vertical-rl', 'ltr', 'block', -1],
    ] as const) {
      source.style.writingMode = writingMode
      source.style.direction = direction
      source.scrollLeft = (sign * (source.scrollWidth - source.clientWidth)) / 2
      const timeline = new ScrollTimeline({ source, axis })
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      values.push(Number.parseFloat(String(timeline.currentTime)))
      Reflect.set(timeline, 'source', null)
    }
    return values
  })
  for (const value of values) expect(value).toBeCloseTo(50, 1)
})
