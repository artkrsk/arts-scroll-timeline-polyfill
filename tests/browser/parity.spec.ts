import { expect, test } from '@playwright/test'

test('the shipped bundle retains CSS animation parity', async ({ page }, testInfo) => {
  await page.goto('/tests/browser-parity.html')
  await page.waitForFunction(() => window.__artsParityFixture?.complete, null, {
    timeout: 30_000,
  })
  const result = await page.evaluate(() => window.__artsParityFixture)
  expect(result).toBeDefined()
  if (!result) throw new Error('The parity fixture did not publish a result')
  expect(result.native).toBe(testInfo.project.name === 'chromium')
  expect(result.errors).toEqual([])
  expect(result.failed).toEqual([])
  expect(result.passed.length).toBeGreaterThanOrEqual(30)
})
