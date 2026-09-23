import { afterEach, describe, expect, it, vi } from 'vitest'
import { artsParseInset, artsResolveVars, artsSplitCSS } from '../../src/js/arts/css-values.js'

afterEach(() => vi.unstubAllGlobals())

describe('CSS value helpers', () => {
  it('splits animation lists without breaking nested functions, strings, or escapes', () => {
    expect(artsSplitCSS('fade steps(4, end), move cubic-bezier(0, .5, 1, 1), "a,b"')).toEqual([
      'fade steps(4, end)',
      'move cubic-bezier(0, .5, 1, 1)',
      '"a,b"',
    ])
    expect(artsSplitCSS('var(--inset, calc(2px + 3px)) 0px', ' ')).toEqual([
      'var(--inset, calc(2px + 3px))',
      '0px',
    ])
  })

  it('resolves nested inset variables and fallbacks without recursing on cycles', () => {
    const values = new Map([
      ['--offset', 'var(--missing, 40px)'],
      ['--cycle', 'var(--cycle)'],
    ])
    const style = { getPropertyValue: (name) => values.get(name) ?? '' }
    expect(artsResolveVars('var(--offset) 0px', style)).toBe('40px 0px')
    expect(artsResolveVars('var(--cycle, 10px)', style)).toBe('10px')
    expect(artsResolveVars('var(--missing)', style)).toBeNull()
  })

  it('parses one or two inset values and rejects invalid shapes', () => {
    vi.stubGlobal('CSSNumericValue', {
      parse: (value) => ({ value, type: () => ({ length: value.endsWith('px') ? 1 : 0 }) }),
    })
    expect(artsParseInset('20px').end.value).toBe('20px')
    expect(artsParseInset('auto 0px').start).toBe('auto')
    expect(() => artsParseInset('1px 2px 3px')).toThrow(TypeError)
    expect(() => artsParseInset('1s')).toThrow(TypeError)
  })
})
