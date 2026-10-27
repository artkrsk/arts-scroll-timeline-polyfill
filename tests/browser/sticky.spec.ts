import { expect, type Page, test } from '@playwright/test'
import { capabilities, fixtureURL, forcePolyfill } from './helpers.js'

// The fixture: a 400px spacer, then a 3000px runway whose first child is a 100vh
// `position: sticky; top: 0` track; `#pinned` (300px, 100px top margin) rides the track.
const SPACER = 400
const RUNWAY = 3000
const PINNED_TOP = SPACER + 100
const PINNED_HEIGHT = 300

async function open(page: Page): Promise<number> {
  await page.goto(fixtureURL('sticky-parity'))
  await page.waitForFunction(() => window.__artsStickyFixture?.ready)
  return page.evaluate(() => document.documentElement.clientHeight)
}

async function scrollTo(page: Page, y: number): Promise<void> {
  await page.evaluate(async (top) => {
    window.scrollTo(0, top)
    for (let index = 0; index < 4; index++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
  }, y)
}

function offsets(page: Page, selector: string): Promise<[number, number]> {
  return page.evaluate((query) => {
    const subject = document.querySelector(query) as HTMLElement
    const timeline = new ViewTimeline({ subject, axis: 'block', inset: '0px 0px' })
    return [
      Number.parseFloat(timeline.startOffset.toString()),
      Number.parseFloat(timeline.endOffset.toString()),
    ] as [number, number]
  }, selector)
}

test('a subject on a sticky track gets its range stretched by the track travel', async ({
  page,
}, testInfo) => {
  await capabilities(page, testInfo)
  const vh = await open(page)
  // Chromium's offsets: the start at the in-flow place, the end after the full travel.
  const expected = [PINNED_TOP - vh, PINNED_TOP + PINNED_HEIGHT + (RUNWAY - vh)]
  // The same range whether measured before, during or after the pin.
  for (const y of [0, SPACER + 1000, SPACER + RUNWAY]) {
    await scrollTo(page, y)
    const [start, end] = await offsets(page, '#pinned')
    expect(Math.abs(start - (expected[0] ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs(end - (expected[1] ?? 0))).toBeLessThanOrEqual(1)
  }
})

test('an exit range inside the pin stays inactive until the track releases', async ({
  page,
}, testInfo) => {
  await capabilities(page, testInfo)
  const vh = await open(page)
  const opacity = () =>
    page.evaluate(() =>
      Number.parseFloat(
        getComputedStyle(document.querySelector('#pinned-exit') as Element).opacity,
      ),
    )
  await scrollTo(page, SPACER + 1000)
  expect(await opacity()).toBe(0)
  // The exit starts one subject height before the stretched end.
  const exitStart = PINNED_TOP + RUNWAY - vh
  await scrollTo(page, exitStart + PINNED_HEIGHT / 2)
  expect(Math.abs((await opacity()) - 0.5)).toBeLessThanOrEqual(0.05)
})

test('the polyfill counts a root margin as Chromium does', async ({ page }, testInfo) => {
  const native = await capabilities(page, testInfo)
  test.skip(
    !native || testInfo.project.name !== 'chromium',
    "Compares the polyfill with Chromium's native offsets in the same page",
  )
  await open(page)
  // WordPress's admin bar pushes the document down this way.
  await page.evaluate(() => {
    document.documentElement.style.marginTop = '32px'
  })
  const nativeRanges = [await offsets(page, '#pinned'), await offsets(page, '#plain')]
  await forcePolyfill(page)
  const polyfillRanges = [await offsets(page, '#pinned'), await offsets(page, '#plain')]
  for (const [index, [start, end]] of polyfillRanges.entries()) {
    const [nativeStart, nativeEnd] = nativeRanges[index] ?? [0, 0]
    expect(Math.abs(start - nativeStart)).toBeLessThanOrEqual(1)
    expect(Math.abs(end - nativeEnd)).toBeLessThanOrEqual(1)
  }
})
