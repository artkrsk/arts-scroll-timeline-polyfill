import { expect, test } from '@playwright/test'
import { capabilities, fixtureURL } from './helpers.js'

test('loader resolves the supported state and gates the bundle', async ({ page }, info) => {
  const native = await capabilities(page, info)
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/scroll-timeline.js')) requests.push(request.url())
  })
  await page.goto(fixtureURL('loader'))
  await page.waitForFunction(() => window.__artsScrollTimelinePolyfillReady !== undefined)
  expect(await page.evaluate(() => window.__artsScrollTimelinePolyfillReady)).toBe(
    native ? 'native' : 'polyfilled',
  )
  expect(requests).toHaveLength(native ? 0 : 1)
})

for (const scenario of ['failed fetch', 'missing URL'] as const) {
  test(`loader resolves unavailable on ${scenario}`, async ({ page }) => {
    await page.addInitScript(() => {
      const supports = CSS.supports.bind(CSS)
      CSS.supports = (property: string, value?: string) =>
        value !== undefined
          ? supports(property, value)
          : property === 'animation-timeline: view()'
            ? false
            : supports(property)
    })
    if (scenario === 'failed fetch')
      await page.route('**/scroll-timeline.js', (route) => route.abort())
    await page.goto(`${fixtureURL('loader')}${scenario === 'missing URL' ? '?missing' : ''}`)
    await expect
      .poll(() => page.evaluate(() => window.__artsScrollTimelinePolyfillReady))
      .toBe('unavailable')
  })
}

test('a later legacy provider cannot replace the first bundle URL', async ({ page }) => {
  const native = await capabilities(page)
  const requests: string[] = []
  page.on('request', (request) => {
    if (/scroll-timeline\.js|legacy-missing\.js/.test(request.url())) requests.push(request.url())
  })
  await page.goto(fixtureURL('legacy-provider'))
  await page.waitForFunction(() => window.__artsScrollTimelinePolyfillReady !== undefined)
  expect(await page.evaluate(() => window.__artsScrollTimelinePolyfillReady)).toBe(
    native ? 'native' : 'polyfilled',
  )
  expect(requests.some((url) => url.includes('legacy-missing'))).toBe(false)
  expect(requests).toHaveLength(native ? 0 : 1)
})

test('every native syntax probe is required', async ({ page }) => {
  for (const missing of [
    'animation-timeline: view()',
    'animation-timeline: scroll(root block)',
    'view-timeline: --probe block',
    'animation-timeline: --probe',
    'animation-range: contain 0% contain 100%',
  ]) {
    await page.goto('/tests/api.html')
    await page.evaluate((query) => {
      CSS.supports = (property: string, _value?: string): boolean => property !== query
      if (typeof ScrollTimeline === 'undefined')
        Reflect.defineProperty(window, 'ScrollTimeline', { value: () => {}, configurable: true })
      if (typeof ViewTimeline === 'undefined')
        Reflect.defineProperty(window, 'ViewTimeline', { value: () => {}, configurable: true })
    }, missing)
    // No URL: a failed probe must select unavailable rather than native.
    await page.addScriptTag({ url: '/src/php/libraries/scroll-timeline/loader.js' })
    expect(await page.evaluate(() => window.__artsScrollTimelinePolyfillReady)).toBe('unavailable')
  }
})

test('missing runtime prerequisites settle without fetching or rejecting', async ({ page }) => {
  await page.addInitScript(() => {
    CSS.supports = () => false
    Reflect.defineProperty(window, 'WeakRef', { value: undefined, configurable: true })
  })
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/scroll-timeline.js')) requests.push(request.url())
  })
  await page.goto(fixtureURL('loader'))
  await expect
    .poll(() => page.evaluate(() => window.__artsScrollTimelinePolyfillReady))
    .toBe('unavailable')
  expect(requests).toHaveLength(0)
})
