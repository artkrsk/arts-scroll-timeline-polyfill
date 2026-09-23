import { expect, test } from '@playwright/test'

test('loader resolves the supported browser state and gates the bundle', async ({
  page,
}, testInfo) => {
  const bundleRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/scroll-timeline.js')) bundleRequests.push(request.url())
  })
  await page.goto('/tests/loader.html')
  const state = await page.evaluate(() => window.__artsScrollTimelinePolyfillReady)
  expect(state).toBe(testInfo.project.name === 'chromium' ? 'native' : 'polyfilled')
  expect(bundleRequests).toHaveLength(testInfo.project.name === 'chromium' ? 0 : 1)
})

test('a failed bundle fetch resolves unavailable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'firefox')
  await page.route('**/scroll-timeline.js', (route) => route.abort())
  await page.goto('/tests/loader.html')
  await expect
    .poll(() => page.evaluate(() => window.__artsScrollTimelinePolyfillReady))
    .toBe('unavailable')
})

test('a missing bundle URL resolves unavailable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'firefox')
  await page.goto('/tests/loader.html?missing')
  await expect
    .poll(() => page.evaluate(() => window.__artsScrollTimelinePolyfillReady))
    .toBe('unavailable')
})
