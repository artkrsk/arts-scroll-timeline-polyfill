import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { installCSSOM } from '../../src/ts/upstream/proxy-cssom.js'
import { numeric } from '../../src/ts/platform/numeric-api.js'
import {
  convertCSSUnitValue,
  createAType,
  createCSSUnitValue,
  createSumValue,
  getSetOfCompatibleUnits,
  invertType,
  multiplyTypes,
  parseCSSNumericValue,
  to,
  toSum,
} from '../../src/ts/upstream/numeric-values.js'
import {
  type CalculationInfo,
  simplifyCalculation,
} from '../../src/ts/upstream/simplify-calculation.js'
import { tokenizeString, DimensionToken } from '../../src/ts/upstream/tokenizer.js'
import type { PolyfillNumericValue } from '../../src/ts/public/index.js'

beforeAll(installCSSOM)

type Make = () => PolyfillNumericValue

const simplified = (text: string, info?: CalculationInfo): string =>
  String(simplifyCalculation(parseCSSNumericValue(text), info))

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

describe('unit types', () => {
  it.each<[string, CSSNumericType | null]>([
    ['number', {}],
    ['percent', { percent: 1 }],
    ['PX', { length: 1 }],
    ['em', { length: 1 }],
    ['dvmax', { length: 1 }],
    ['turn', { angle: 1 }],
    ['ms', { time: 1 }],
    ['kHz', { frequency: 1 }],
    ['dpi', { resolution: 1 }],
    ['fr', { flex: 1 }],
    ['foo', null],
  ])('creates the type of %s', (unit, expected) => {
    expect(createAType(unit)).toEqual(expected)
  })

  it('finds compatible unit groups case-insensitively', () => {
    expect(getSetOfCompatibleUnits('PX')?.canonicalUnit).toBe('px')
    expect(getSetOfCompatibleUnits('grad')?.canonicalUnit).toBe('deg')
    expect(getSetOfCompatibleUnits('em')).toBeUndefined()
  })
})

describe('type arithmetic', () => {
  it('inverts exponents and drops the percent hint', () => {
    expect(invertType({ length: 1, angle: -2, percentHint: 'length' })).toEqual({
      length: -1,
      angle: 2,
    })
  })

  it.each<[string, CSSNumericType, CSSNumericType, CSSNumericType | null]>([
    ['like types', { length: 1 }, { length: 1 }, { length: 2 }],
    ['unlike types', { length: 1 }, { time: 1 }, { length: 1, time: 1 }],
    ['a zero exponent', { length: 1 }, { length: 0 }, { length: 1 }],
    [
      'one percent hint',
      { length: 1 },
      { percentHint: 'length' },
      { length: 1, percentHint: 'length' },
    ],
    [
      'matching percent hints',
      { percentHint: 'length' },
      { percentHint: 'length' },
      { percentHint: 'length' },
    ],
    ['conflicting percent hints', { percentHint: 'length' }, { percentHint: 'angle' }, null],
  ])('multiplies %s', (_label, type1, type2, expected) => {
    expect(multiplyTypes(type1, type2)).toEqual(expected)
  })
})

describe('sum values', () => {
  it.each<[string, Make, [number, Record<string, number>][]]>([
    ['a canonical unit', () => numeric.CSS.px(2), [[2, { px: 1 }]]],
    ['a convertible unit', () => numeric.CSS.in(1), [[96, { px: 1 }]]],
    ['a relative unit', () => numeric.CSS.em(2), [[2, { em: 1 }]]],
    ['a number', () => numeric.CSS.number(3), [[3, {}]]],
    ['an inverted unit', () => new numeric.CSSMathInvert(numeric.CSS.px(4)), [[0.25, { px: -1 }]]],
    ['an inverted number', () => new numeric.CSSMathInvert(4), [[0.25, {}]]],
    [
      'a product of unlike units',
      () => new numeric.CSSMathProduct(numeric.CSS.px(2), numeric.CSS.s(3)),
      [[6, { px: 1, s: 1 }]],
    ],
    [
      'a product of like units',
      () => new numeric.CSSMathProduct(numeric.CSS.px(2), numeric.CSS.px(3)),
      [[6, { px: 2 }]],
    ],
  ])('creates the sum value of %s', (_label, make, expected) => {
    expect(createSumValue(make())).toEqual(expected)
  })

  it.each<[string, Make]>([
    ['sums', () => new numeric.CSSMathSum(1, 2)],
    ['negations', () => new numeric.CSSMathNegate(1)],
    ['inverted sums', () => new numeric.CSSMathInvert(new numeric.CSSMathSum(1))],
  ])('does not implement sum values of %s', (_label, make) => {
    expect(() => createSumValue(make())).toThrow(new Error('Not implemented'))
  })

  it.each<[string, [number, Record<string, number>], string | null]>([
    ['no units', [3, {}], '3'],
    ['one unit', [3, { px: 1 }], '3px'],
    ['a squared unit', [3, { px: 2 }], null],
    ['several units', [3, { px: 1, s: 1 }], null],
  ])('creates a unit value from an item with %s', (_label, item, expected) => {
    const value = createCSSUnitValue(item)
    expect(value === null ? null : String(value)).toBe(expected)
  })

  it('converts values into minimal sums', () => {
    const half = new numeric.CSSMathProduct(numeric.CSS.px(6), new numeric.CSSMathInvert(2))
    expect(String(toSum(numeric.CSS.in(1)))).toBe('calc(96px)')
    expect(String(toSum(half))).toBe('calc(3px)')
  })

  it('rejects unit arguments and non-unit sums', () => {
    const squared = new numeric.CSSMathProduct(numeric.CSS.px(2), numeric.CSS.px(3))
    expect(() => toSum(numeric.CSS.px(1), 'px')).toThrow(new Error('Not implemented'))
    expect(() => toSum(squared)).toThrow(new TypeError('Invalid numeric sum'))
  })
})

describe('unit conversion', () => {
  it.each([
    ['96px', 'in', '1in'],
    ['1in', 'pt', '72pt'],
    ['1in', 'PX', '96px'],
    ['180deg', 'turn', '0.5turn'],
    ['2em', 'EM', '2em'],
    ['5', 'number', '5'],
    ['500ms', 's', '0.5s'],
    ['1khz', 'hz', '1000hz'],
    ['96dpi', 'dppx', '1dppx'],
  ])('converts %s to %s', (text, unit, expected) => {
    expect(String(to(parseCSSNumericValue(text), unit))).toBe(expected)
  })

  it('converts products that reduce to a single unit', () => {
    const half = new numeric.CSSMathProduct(numeric.CSS.px(6), new numeric.CSSMathInvert(2))
    expect(String(to(half, 'px'))).toBe('3px')
  })

  it('rejects unknown target units with a SyntaxError', () => {
    expect(() => to(numeric.CSS.px(1), 'foo')).toThrow(SyntaxError)
  })

  it.each<[string, Make, string]>([
    ['incompatible units', () => numeric.CSS.px(1), 'deg'],
    ['relative to absolute units', () => numeric.CSS.em(1), 'px'],
    ['squared units', () => new numeric.CSSMathProduct(numeric.CSS.px(2), numeric.CSS.px(3)), 'px'],
    ['compound units', () => new numeric.CSSMathProduct(numeric.CSS.px(2), numeric.CSS.s(3)), 'px'],
  ])('rejects converting %s with a TypeError', (_label, make, unit) => {
    expect(() => to(make(), unit)).toThrow(TypeError)
  })

  it('does not implement converting sums', () => {
    const sum = new numeric.CSSMathSum(numeric.CSS.px(1), numeric.CSS.px(2))
    expect(() => to(sum, 'px')).toThrow(new Error('Not implemented'))
  })

  it('converts unit values only between compatible units', () => {
    expect(convertCSSUnitValue(null, 'px')).toBeNull()
    expect(String(convertCSSUnitValue(numeric.CSS.ms(500), 'S'))).toBe('0.5s')
    expect(String(convertCSSUnitValue(numeric.CSS.em(1), 'em'))).toBe('1em')
    expect(convertCSSUnitValue(numeric.CSS.px(1), 's')).toBeNull()
    expect(convertCSSUnitValue(numeric.CSS.px(1), 'foo')).toBeNull()
  })
})

describe('parseCSSNumericValue', () => {
  it.each([
    ['  10px  ', '10px'],
    ['10PX', '10px'],
    ['1e2px', '100px'],
    ['-5%', '-5%'],
    ['calc(1px', '1px'],
    ['calc(6px / 2)', '3px'],
    ['calc(10px - 4px)', '6px'],
    ['calc(1px - 2px + 3px)', '2px'],
    ['calc(12px / 2 * 3)', '18px'],
    ['calc(10px - 2px * 3)', '4px'],
    ['calc(2px * 3 - 1px)', '5px'],
    ['calc(2 * 3 * 4px)', '24px'],
    ['calc(8px / 2 / 2)', '2px'],
    ['calc((1px + 2px) * 2)', '6px'],
    ['calc(10px - (2px - 3px))', '11px'],
    ['calc((10% + 5px) * 2)', 'calc(20% + 10px)'],
    ['calc(100% - 10px)', 'calc(100% + -10px)'],
    ['calc(pi)', String(Math.PI)],
    ['calc(e)', String(Math.E)],
    ['min(1px, 5px)', '1px'],
    ['max(1in, 50px)', '96px'],
    ['max(1em, 2px)', 'max(1em, 2px)'],
    ['calc(min(1px, 2px) + 3px)', '4px'],
  ])('parses and simplifies %j as %j', (text, expected) => {
    expect(simplified(text)).toBe(expected)
  })

  it('wraps fully simplified calc() results in a sum and keeps min() unsimplified', () => {
    expect(String(parseCSSNumericValue('calc(1px + 2px)'))).toBe('calc(3px)')
    expect(String(parseCSSNumericValue('min(1px, 5px)'))).toBe('min(1px, 5px)')
  })

  it.each([
    '',
    '   ',
    '1px 2px',
    'auto',
    '"x"',
    '(1px)',
    '(1px',
    '[1px]',
    '{1px}',
    '1unsupported',
    'calc(1px))',
    'calc(foo)',
    'calc(foo(1px))',
    'foo(1px)',
    'clamp(1px, 2px, 3px)',
    'calc(2px * 3s)',
    'calc(1px * 2px)',
  ])('rejects %j with a SyntaxError', (text) => {
    expect(() => parseCSSNumericValue(text)).toThrow(SyntaxError)
  })

  it.each([
    'calc()',
    'calc(1px 2px)',
    'calc(1px, 2px)',
    'calc(1px +)',
    'calc([1px)])',
    'calc([1px + 2px)])',
  ])('rejects malformed expression %j', (text) => {
    expect(() => parseCSSNumericValue(text)).toThrow()
  })
})

describe('simplifyCalculation', () => {
  it.each([
    ['1in', '96px'],
    ['6pc', '96px'],
    ['0.5turn', '180deg'],
    ['400grad', '360deg'],
    ['250ms', '0.25s'],
    ['1khz', '1000hz'],
    ['96dpi', '1dppx'],
    ['2em', '2em'],
    ['50%', '50%'],
  ])('canonicalizes %s as %s', (text, expected) => {
    expect(simplified(text)).toBe(expected)
  })

  it('resolves percentages against the reference value', () => {
    const px = numeric.CSS.px
    expect(simplified('50%', { percentageReference: numeric.CSS.em(2) })).toBe('1em')
    expect(simplified('calc(100% - 10px)', { percentageReference: px(200) })).toBe('190px')
    expect(simplified('min(10%, 20px)')).toBe('min(20px, 10%)')
    expect(simplified('min(10%, 20px)', { percentageReference: px(100) })).toBe('10px')
    expect(simplified('min(10%)')).toBe('10%')
  })

  it('resolves em lengths inside products with a font size', () => {
    expect(simplified('calc(2em * 3)')).toBe('calc(2em * 3)')
    expect(simplified('calc(2em * 3)', { fontSize: numeric.CSS.px(10) })).toBe('60px')
  })

  it.each<[string, Make, string]>([
    [
      'min() with a non-numeric first child',
      () =>
        new numeric.CSSMathMin(
          new numeric.CSSMathSum(numeric.CSS.percent(10), numeric.CSS.px(5)),
          numeric.CSS.px(1),
        ),
      'min(1px, calc(10% + 5px))',
    ],
    [
      'a double negation of a unit',
      () => new numeric.CSSMathNegate(new numeric.CSSMathNegate(numeric.CSS.px(3))),
      '3px',
    ],
    [
      'a double negation of a sum',
      () =>
        new numeric.CSSMathNegate(
          new numeric.CSSMathNegate(
            new numeric.CSSMathSum(numeric.CSS.percent(10), numeric.CSS.px(5)),
          ),
        ),
      'calc(10% + 5px)',
    ],
    [
      'a negated sum',
      () =>
        new numeric.CSSMathNegate(
          new numeric.CSSMathSum(numeric.CSS.percent(10), numeric.CSS.px(5)),
        ),
      '-(calc(10% + 5px))',
    ],
    [
      'a double inversion',
      () => new numeric.CSSMathInvert(new numeric.CSSMathInvert(numeric.CSS.px(2))),
      '2px',
    ],
    ['an inverted dimension', () => new numeric.CSSMathInvert(numeric.CSS.px(2)), 'calc(1 / 2px)'],
    [
      'nested sums',
      () =>
        new numeric.CSSMathSum(
          new numeric.CSSMathSum(numeric.CSS.px(1), numeric.CSS.percent(1)),
          numeric.CSS.px(2),
        ),
      'calc(3px + 1%)',
    ],
    [
      'nested products',
      () => new numeric.CSSMathProduct(new numeric.CSSMathProduct(numeric.CSS.em(2), 3), 4),
      'calc(12 * 2em)',
    ],
    [
      'a product with an inverted number',
      () => new numeric.CSSMathProduct(numeric.CSS.px(6), new numeric.CSSMathInvert(2)),
      '3px',
    ],
    [
      'a product with a non-numeric sum',
      () =>
        new numeric.CSSMathProduct(
          new numeric.CSSMathSum(
            numeric.CSS.percent(10),
            new numeric.CSSMathMin(numeric.CSS.px(1), numeric.CSS.percent(5)),
          ),
          2,
        ),
      'calc(calc(min(1px, 5%) + 10%) * 2)',
    ],
  ])('simplifies %s', (_label, make, expected) => {
    expect(String(simplifyCalculation(make()))).toBe(expected)
  })

  it('returns keyword values unchanged', () => {
    const keyword = new numeric.CSSKeywordValue('auto')
    expect(simplifyCalculation(keyword as unknown as PolyfillNumericValue)).toBe(keyword)
  })

  describe('with a native CSSMathClamp', () => {
    class FakeClamp {
      lower: unknown
      value: unknown
      upper: unknown
      constructor(lower: unknown, value: unknown, upper: unknown) {
        this.lower = lower
        this.value = value
        this.upper = upper
      }
    }
    const simplifyClamp = (clamp: FakeClamp): FakeClamp =>
      simplifyCalculation(clamp as unknown as PolyfillNumericValue) as unknown as FakeClamp

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('simplifies every clamp argument', () => {
      vi.stubGlobal('CSSMathClamp', FakeClamp)
      const clamp = new FakeClamp(numeric.CSS.in(1), numeric.CSS.percent(50), numeric.CSS.turn(1))
      const result = simplifyClamp(clamp)
      expect(result).toBeInstanceOf(FakeClamp)
      expect(result).not.toBe(clamp)
      expect([result.lower, result.value, result.upper].map(String)).toEqual([
        '96px',
        '50%',
        '360deg',
      ])
    })

    it('keeps the clamp when an argument is not numeric', () => {
      vi.stubGlobal('CSSMathClamp', FakeClamp)
      const keyword = new numeric.CSSKeywordValue('auto')
      const clamp = new FakeClamp(numeric.CSS.px(1), keyword, numeric.CSS.px(2))
      expect(simplifyClamp(clamp)).toBe(clamp)
    })
  })
})
