import type {
  PolyfillKeywordValue,
  PolyfillMathMinMax,
  PolyfillMathProduct,
  PolyfillMathSum,
  PolyfillMathUnary,
  PolyfillMathValue,
  PolyfillNumberish,
  PolyfillNumericValue,
  PolyfillUnitValue,
} from '../public/index.js'
import type { CSS_UNIT_FACTORIES } from './constants.js'

export interface NumericGlobals {
  CSS: { [K in keyof typeof CSS_UNIT_FACTORIES]: (value: number) => PolyfillUnitValue }
  CSSNumericValue: {
    prototype: PolyfillNumericValue
    new (): PolyfillNumericValue
    parse(value: string): PolyfillNumericValue
  }
  CSSUnitValue: { new (value: number, unit: string): PolyfillUnitValue }
  CSSKeywordValue: { new (value: string): PolyfillKeywordValue }
  CSSMathValue: { new (...values: PolyfillNumberish[]): PolyfillMathValue }
  CSSMathSum: { new (...values: PolyfillNumberish[]): PolyfillMathSum }
  CSSMathProduct: { new (...values: PolyfillNumberish[]): PolyfillMathProduct }
  CSSMathMin: { new (...values: PolyfillNumberish[]): PolyfillMathMinMax }
  CSSMathMax: { new (...values: PolyfillNumberish[]): PolyfillMathMinMax }
  CSSMathNegate: { new (value: PolyfillNumberish): PolyfillMathUnary }
  CSSMathInvert: { new (value: PolyfillNumberish): PolyfillMathUnary }
}
/** Browser integration boundary: installCSSOM fills absent constructors before numeric operations run.
 * The view deliberately describes only operations supplied by the partial shim. */
export const numeric = globalThis as unknown as NumericGlobals

export function numericType(value: PolyfillNumericValue): CSSNumericType {
  if (!value.type)
    throw new TypeError('Numeric type calculation is not implemented for this expression')
  return value.type()
}
