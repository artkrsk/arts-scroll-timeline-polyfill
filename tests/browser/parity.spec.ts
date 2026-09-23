import { capabilities, fixtureURL } from './helpers.js'
import { expect, test } from '@playwright/test'

test('the shipped bundle retains CSS animation parity', async ({ page }, testInfo) => {
  const native = await capabilities(page, testInfo)
  await page.goto(fixtureURL('browser-parity'))
  await page.waitForFunction(() => window.__artsParityFixture?.complete, null, {
    timeout: 30_000,
  })
  const result = await page.evaluate(() => window.__artsParityFixture)
  expect(result).toBeDefined()
  if (!result) throw new Error('The parity fixture did not publish a result')
  expect(result.native).toBe(native)
  expect(result.errors).toEqual([])
  expect(result.failed).toEqual([])
  expect(result.passed.length).toBeGreaterThanOrEqual(30)
})

test('a programmatic timeline without inset keeps the upstream zero-inset range', async ({
  page,
}, testInfo) => {
  const native = await capabilities(page, testInfo)
  test.skip(native, 'The zero-inset default is an upstream polyfill compatibility behavior')
  await page.goto(fixtureURL('browser-parity'))
  await page.waitForFunction(() => window.__artsParityFixture?.complete)
  const ranges = await page.evaluate(() => {
    const scroller = document.querySelector('#scroller') as HTMLElement
    const subject = document.querySelector('#subject') as HTMLElement
    scroller.style.scrollPaddingTop = '40px'
    const implicit = new ViewTimeline({ subject, axis: 'block' })
    const explicit = new ViewTimeline({ subject, axis: 'block', inset: '0px 0px' })
    return {
      implicitStart: Number.parseFloat(implicit.startOffset.toString()),
      explicitStart: Number.parseFloat(explicit.startOffset.toString()),
      implicitEnd: Number.parseFloat(implicit.endOffset.toString()),
      explicitEnd: Number.parseFloat(explicit.endOffset.toString()),
    }
  })
  expect(ranges.implicitStart).toBe(ranges.explicitStart)
  expect(ranges.implicitEnd).toBe(ranges.explicitEnd)
})
