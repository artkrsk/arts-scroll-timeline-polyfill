import { beforeAll, describe, expect, it } from 'vitest'
import { installCSSOM } from '../../src/ts/upstream/proxy-cssom.js'
import { numeric } from '../../src/ts/platform/numeric-api.js'
import { parseCSSNumericValue } from '../../src/ts/upstream/numeric-values.js'
import { simplifyCalculation } from '../../src/ts/upstream/simplify-calculation.js'
import { tokenizeString, DimensionToken } from '../../src/ts/upstream/tokenizer.js'

beforeAll(installCSSOM)

describe('Typed OM numeric subset', () => {
  it('uses canonical unit identifiers independently of CSS factory names', () => {
    expect(numeric.CSS.rem(1).unit).toBe('rem')
    expect(numeric.CSS.rems(1).unit).toBe('rem')
    expect(numeric.CSS.Q(1).unit).toBe('q')
    expect(numeric.CSS.Hz(1).type()).toEqual({ frequency: 1 })
    expect(numeric.CSS.kHz(1).to('hz').value).toBe(1000)
    expect(numeric.CSS.px(2).to('px').value).toBe(2)
  })
  it('parses numeric tokens and simplifies arithmetic with compatible units', () => {
    const tokens = tokenizeString('12.5px')
    expect(tokens[0]).toBeInstanceOf(DimensionToken)
    expect(String(simplifyCalculation(parseCSSNumericValue('calc(1in + 4px)')))).toBe('100px')
    expect(String(simplifyCalculation(parseCSSNumericValue('calc(3px * 2)')))).toBe('6px')
    expect(String(parseCSSNumericValue('0'))).toBe('0')
    expect(() => parseCSSNumericValue('calc(2px +)')).toThrow()
    expect(() => parseCSSNumericValue('1unsupported')).toThrow()
  })
  it('resolves percentages and em lengths only with the required measurement context', () => {
    const value = parseCSSNumericValue('50%')
    expect(String(simplifyCalculation(value))).toBe('50%')
    expect(String(simplifyCalculation(value, { percentageReference: numeric.CSS.px(80) }))).toBe(
      '40px',
    )
    expect(String(simplifyCalculation(numeric.CSS.em(2), { fontSize: numeric.CSS.px(12) }))).toBe(
      '24px',
    )
  })
})
