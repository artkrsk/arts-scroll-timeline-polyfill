import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { numeric } from '../../src/ts/platform/numeric-api.js'
import { installCSSOM } from '../../src/ts/upstream/proxy-cssom.js'

const constructorNames = [
  'CSSNumericValue',
  'CSSMathValue',
  'CSSUnitValue',
  'CSSKeywordValue',
  'CSSMathSum',
  'CSSMathProduct',
  'CSSMathNegate',
  'CSSMathInvert',
  'CSSMathMin',
  'CSSMathMax',
]

function installWithRejectedDefinitions(): unknown {
  const defineProperty = vi.spyOn(Reflect, 'defineProperty').mockReturnValue(false)
  try {
    installCSSOM()
    return undefined
  } catch (error) {
    return error
  } finally {
    defineProperty.mockRestore()
  }
}

describe('installCSSOM failures', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports a CSS namespace that cannot be defined', () => {
    expect(installWithRejectedDefinitions()).toEqual(new Error('Error installing CSSOM support'))
  })

  it('reports a constructor that cannot be defined', () => {
    vi.stubGlobal('CSS', {})
    expect(installWithRejectedDefinitions()).toEqual(new Error('Error installing CSSNumericValue'))
  })

  it('reports a unit factory that cannot be defined', () => {
    vi.stubGlobal('CSS', {})
    for (const name of constructorNames) vi.stubGlobal(name, class {})
    expect(installWithRejectedDefinitions()).toEqual(new Error('Error installing CSS.number'))
  })
})

describe('installed CSSOM shim', () => {
  beforeAll(installCSSOM)

  it('keeps existing constructors and factories when installed again', () => {
    const { px } = numeric.CSS
    const { CSSUnitValue } = numeric
    installCSSOM()
    expect(numeric.CSS.px).toBe(px)
    expect(numeric.CSSUnitValue).toBe(CSSUnitValue)
  })

  it('shares the CSSNumericValue base across numeric classes', () => {
    expect(numeric.CSS.px(1)).toBeInstanceOf(numeric.CSSNumericValue)
    expect(new numeric.CSSMathSum(1)).toBeInstanceOf(numeric.CSSNumericValue)
    expect(new numeric.CSSMathSum(1)).toBeInstanceOf(numeric.CSSMathValue)
  })

  describe('CSSUnitValue', () => {
    it('lowercases units and rejects unknown ones', () => {
      expect(new numeric.CSSUnitValue(1, 'PX').unit).toBe('px')
      expect(() => new numeric.CSSUnitValue(1, 'foo')).toThrow(TypeError)
    })

    it('updates its value through the setter', () => {
      const value = numeric.CSS.px(1)
      value.value = 5
      expect(value.value).toBe(5)
      expect(String(value)).toBe('5px')
    })

    it.each([
      [3, 'number', '3'],
      [50, 'percent', '50%'],
      [-1.5, 'px', '-1.5px'],
      [2, 'turn', '2turn'],
    ])('serializes %s %s as %j', (value, unit, expected) => {
      expect(String(new numeric.CSSUnitValue(value, unit))).toBe(expected)
    })

    it.each([
      ['px', { length: 1 }],
      ['percent', { percent: 1 }],
      ['number', {}],
      ['ms', { time: 1 }],
    ])('reports the %s type', (unit, expected) => {
      expect(new numeric.CSSUnitValue(1, unit).type()).toEqual(expected)
    })

    it('converts and sums through the numeric algorithms', () => {
      expect(String(numeric.CSS.in(1).to('px'))).toBe('96px')
      expect(String(numeric.CSS.in(1).toSum())).toBe('calc(96px)')
      expect(() => numeric.CSS.px(1).toSum('px')).toThrow(new Error('Not implemented'))
    })
  })

  describe('math values', () => {
    it('serializes sums and wraps plain numbers', () => {
      const sum = new numeric.CSSMathSum(1, numeric.CSS.px(2))
      expect(String(sum)).toBe('calc(1 + 2px)')
      expect(sum.operator).toBe('sum')
      expect(Array.from(sum.values, String)).toEqual(['1', '2px'])
    })

    it('serializes, types and sums products', () => {
      const product = new numeric.CSSMathProduct(numeric.CSS.px(2), 3)
      expect(String(product)).toBe('calc(2px * 3)')
      expect(product.operator).toBe('product')
      expect(product.type()).toEqual({ length: 1 })
      expect(String(product.toSum())).toBe('calc(6px)')
      expect(new numeric.CSSMathProduct(numeric.CSS.px(1), numeric.CSS.s(1)).type()).toEqual({
        length: 1,
        time: 1,
      })
    })

    it('serializes and types negations', () => {
      const negate = new numeric.CSSMathNegate(numeric.CSS.deg(1))
      expect(String(negate)).toBe('-(1deg)')
      expect(negate.operator).toBe('negate')
      expect(String(negate.value)).toBe('1deg')
      expect(negate.type()).toEqual({ angle: 1 })
    })

    it('serializes and types inversions', () => {
      const invert = new numeric.CSSMathInvert(numeric.CSS.s(2))
      expect(String(invert)).toBe('calc(1 / 2s)')
      expect(invert.operator).toBe('invert')
      expect(String(invert.value)).toBe('2s')
      expect(invert.type()).toEqual({ time: -1 })
    })

    it('rejects typing expressions whose children have no type', () => {
      const negate = new numeric.CSSMathNegate(new numeric.CSSMathSum(1))
      expect(() => negate.type()).toThrow(TypeError)
    })

    it('serializes min and max', () => {
      const min = new numeric.CSSMathMin(1, 2)
      const max = new numeric.CSSMathMax(1, numeric.CSS.px(2))
      expect(String(min)).toBe('min(1, 2)')
      expect(min.operator).toBe('min')
      expect(String(max)).toBe('max(1, 2px)')
      expect(max.operator).toBe('max')
    })

    it('uses the operator as the default function name', () => {
      const MathValue = numeric.CSSMathValue as unknown as new (
        values: number[],
        operator: CSSMathOperator,
      ) => { operator: CSSMathOperator }
      const value = new MathValue([1, 2], 'sum')
      expect(String(value)).toBe('sum(1, 2)')
      expect(value.operator).toBe('sum')
    })
  })

  it('serializes keyword values', () => {
    const keyword = new numeric.CSSKeywordValue('auto')
    expect(keyword.value).toBe('auto')
    expect(String(keyword)).toBe('auto')
  })

  it('parses and simplifies numeric text', () => {
    const value = numeric.CSSNumericValue.parse('calc(1px + 2px)')
    expect(value).toBeInstanceOf(numeric.CSSUnitValue)
    expect(String(value)).toBe('3px')
    expect(String(numeric.CSSNumericValue.parse('calc(100% - 10px)'))).toBe('calc(100% + -10px)')
  })
})
