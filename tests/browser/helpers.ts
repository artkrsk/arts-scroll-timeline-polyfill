import { expect, type Page, type TestInfo } from '@playwright/test'
export const fixtureURL = (name: string): string => `/.cache/browser-fixtures/tests/${name}.html`
export const polyfillURL = '/src/php/libraries/scroll-timeline/scroll-timeline.js'

export async function capabilities(page: Page, info?: TestInfo): Promise<boolean> {
  const result = await page.evaluate(() => {
    const queries = [
      'animation-timeline: view()',
      'animation-timeline: scroll(root block)',
      'view-timeline: --probe block',
      'animation-timeline: --probe',
      'animation-range: contain 0% contain 100%',
    ]
    const css = queries.map((query) => ({ query, supported: CSS.supports(query) }))
    const constructors = typeof ScrollTimeline === 'function' && typeof ViewTimeline === 'function'
    return {
      native: constructors && css.every((probe) => probe.supported),
      css,
      constructors,
      typedOM: typeof CSSNumericValue === 'function',
      userAgent: navigator.userAgent,
    }
  })
  if (info)
    await info.attach('capabilities.json', {
      body: JSON.stringify(
        { ...result, engineVersion: page.context().browser()?.version() },
        null,
        2,
      ),
      contentType: 'application/json',
    })
  return result.native
}
export async function forcePolyfill(page: Page, shim = false): Promise<void> {
  await page.evaluate((useShim) => {
    const supports = CSS.supports.bind(CSS)
    CSS.supports = (property: string, value?: string): boolean =>
      value !== undefined
        ? supports(property, value)
        : property === 'animation-timeline: view()'
          ? false
          : supports(property)
    if (useShim) {
      for (const key of [
        'CSSNumericValue',
        'CSSUnitValue',
        'CSSKeywordValue',
        'CSSMathValue',
        'CSSMathSum',
        'CSSMathProduct',
        'CSSMathMin',
        'CSSMathMax',
        'CSSMathNegate',
        'CSSMathInvert',
        'CSSMathClamp',
      ]) {
        if (!Reflect.deleteProperty(globalThis, key)) throw new Error(`Cannot mask ${key}`)
      }
      for (const key of [
        'number',
        'percent',
        'em',
        'ex',
        'px',
        'cm',
        'mm',
        'in',
        'pt',
        'pc',
        'Q',
        'vw',
        'vh',
        'vmin',
        'vmax',
        'rem',
        'rems',
        'ch',
        'deg',
        'rad',
        'grad',
        'turn',
        'ms',
        's',
        'Hz',
        'kHz',
        'dppx',
        'dpi',
        'dpcm',
        'fr',
      ]) {
        if (!Reflect.deleteProperty(CSS, key)) throw new Error(`Cannot mask CSS.${key}`)
      }
    }
  }, shim)
  await page.addScriptTag({ url: polyfillURL })
  expect(await page.evaluate(() => typeof ViewTimeline)).toBe('function')
}
