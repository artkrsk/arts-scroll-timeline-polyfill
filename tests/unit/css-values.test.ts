import { splitIntoComponentValues } from '../../src/ts/upstream/utils.js'
import { beforeAll, describe, expect, it } from 'vitest'
import { artsParseInset, artsResolveVars, artsSplitCSS } from '../../src/ts/arts/css-values.js'
import { installCSSOM } from '../../src/ts/upstream/proxy-cssom.js'
import { numeric } from '../../src/ts/platform/numeric-api.js'

beforeAll(installCSSOM)

describe('CSS value helpers', () => {
  it('splits lists without breaking nested functions, strings, escapes, or comments', () => {
    expect(artsSplitCSS('fade steps(4, end), move cubic-bezier(0, .5, 1, 1), "a,b"')).toEqual([
      'fade steps(4, end)',
      'move cubic-bezier(0, .5, 1, 1)',
      '"a,b"',
    ])
    expect(artsSplitCSS('var(--inset, calc(2px + 3px)) 0px', ' ')).toEqual([
      'var(--inset, calc(2px + 3px))',
      '0px',
    ])
    expect(artsSplitCSS('a/*,*/b,c\\,d')).toEqual(['a/*,*/b', 'c\\,d'])
    expect(splitIntoComponentValues('calc(0% + 50px) calc(100% - 50px)')).toEqual([
      'calc(0% + 50px)',
      'calc(100% - 50px)',
    ])
  })
  it('resolves nested variables and fallbacks without recursing on cycles', () => {
    const values = new Map([
      ['--offset', 'var(--missing, 40px)'],
      ['--cycle', 'var(--cycle)'],
    ])
    const style = { getPropertyValue: (name: string) => values.get(name) ?? '' }
    expect(artsResolveVars('var(--offset) 0px', style)).toBe('40px 0px')
    expect(artsResolveVars('var(--cycle, 10px)', style)).toBe('10px')
    expect(artsResolveVars('var(--missing)', style)).toBeNull()
  })
  it('parses insets including keyword objects and rejects invalid shapes', () => {
    expect(String(artsParseInset('20px').end)).toBe('20px')
    expect(artsParseInset('auto 0px').start).toBe('auto')
    expect(artsParseInset([new numeric.CSSKeywordValue('auto')])).toEqual({
      start: 'auto',
      end: 'auto',
    })
    expect(() => artsParseInset('1px 2px 3px')).toThrow(TypeError)
    expect(() => artsParseInset('1s')).toThrow(TypeError)
    expect(() => artsParseInset([new numeric.CSSKeywordValue('none')])).toThrow(TypeError)
  })
})
