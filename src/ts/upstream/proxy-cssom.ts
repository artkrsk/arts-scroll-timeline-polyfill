// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {
  createAType,
  invertType,
  multiplyTypes,
  parseCSSNumericValue,
  to,
  toSum,
} from './numeric-values.js'
import { simplifyCalculation } from './simplify-calculation.js'
import { numeric, numericType } from '../platform/numeric-api.js'
import { CSS_UNIT_FACTORIES } from '../platform/constants.js'
import { required } from '../platform/assertions.js'
import type {
  PolyfillNumberish,
  PolyfillNumericValue,
  PolyfillUnitValue,
  PolyfillMathSum,
} from '../public/index.js'

export function installCSSOM(): void {
  interface MathDetails {
    values: PolyfillNumericValue[]
    operator: CSSMathOperator
    name: string
    delimiter: string
  }
  const mathDetails = new WeakMap<CSSMathValue<CSSMathOperator>, MathDetails>()
  const unitDetails = new WeakMap<CSSUnitValue, { value: number; unit: string }>()
  const toValue = (value: PolyfillNumberish): PolyfillNumericValue =>
    typeof value === 'number' ? new numeric.CSSUnitValue(value, 'number') : value

  // biome-ignore lint/complexity/noStaticOnlyClass: This browser constructor is the shared instanceof base for numeric classes.
  class CSSNumericValue {
    static parse(value: string): PolyfillNumericValue {
      return simplifyCalculation(parseCSSNumericValue(value))
    }
  }
  class CSSMathValue<Operator extends CSSMathOperator> extends CSSNumericValue {
    constructor(
      values: PolyfillNumberish[],
      operator: Operator,
      name: string = operator,
      delimiter = ', ',
    ) {
      super()
      mathDetails.set(this, { values: values.map(toValue), operator, name, delimiter })
    }
    get operator(): Operator {
      // The constructor stores precisely this generic operator and it never changes.
      return required(mathDetails.get(this)).operator as Operator
    }
    get values(): PolyfillNumericValue[] {
      return required(mathDetails.get(this)).values
    }
    override toString(): string {
      const details = required(mathDetails.get(this))
      return `${details.name}(${details.values.join(details.delimiter)})`
    }
  }
  class CSSUnitValue extends CSSNumericValue implements PolyfillUnitValue {
    constructor(value: number, unit: string) {
      super()
      unit = unit.toLowerCase()
      if (!createAType(unit)) throw new TypeError(`Invalid CSS unit: ${unit}`)
      unitDetails.set(this, { value, unit })
    }
    get value(): number {
      return required(unitDetails.get(this)).value
    }
    set value(value: number) {
      required(unitDetails.get(this)).value = value
    }
    get unit(): string {
      return required(unitDetails.get(this)).unit
    }
    to(unit: string): PolyfillUnitValue {
      return to(this, unit)
    }
    toSum(...units: string[]): PolyfillMathSum {
      return toSum(this, ...units)
    }
    type(): CSSNumericType {
      return required(createAType(this.unit))
    }
    override toString(): string {
      const suffix = this.unit === 'number' ? '' : this.unit === 'percent' ? '%' : this.unit
      return `${this.value}${suffix}`
    }
  }
  class CSSKeywordValue {
    value: string
    constructor(value: string) {
      this.value = value
    }
    toString(): string {
      return this.value
    }
  }
  class CSSMathSum extends CSSMathValue<'sum'> {
    constructor(...values: PolyfillNumberish[]) {
      super(values, 'sum', 'calc', ' + ')
    }
  }
  class CSSMathProduct extends CSSMathValue<'product'> {
    constructor(...values: PolyfillNumberish[]) {
      super(values, 'product', 'calc', ' * ')
    }
    toSum(...units: string[]): PolyfillMathSum {
      return toSum(this, ...units)
    }
    type(): CSSNumericType {
      return this.values.map(numericType).reduce((a, b) => required(multiplyTypes(a, b)), {})
    }
  }
  class CSSMathNegate extends CSSMathValue<'negate'> {
    constructor(value: PolyfillNumberish) {
      super([value], 'negate', '-', '')
    }
    get value(): PolyfillNumericValue {
      return required(this.values[0])
    }
    type(): CSSNumericType {
      return numericType(this.value)
    }
  }
  class CSSMathInvert extends CSSMathValue<'invert'> {
    constructor(value: PolyfillNumberish) {
      super([1, value], 'invert', 'calc', ' / ')
    }
    get value(): PolyfillNumericValue {
      return required(this.values[1])
    }
    type(): CSSNumericType {
      return invertType(numericType(this.value))
    }
  }
  class CSSMathMin extends CSSMathValue<'min'> {
    constructor(...values: PolyfillNumberish[]) {
      super(values, 'min')
    }
  }
  class CSSMathMax extends CSSMathValue<'max'> {
    constructor(...values: PolyfillNumberish[]) {
      super(values, 'max')
    }
  }
  const constructors = {
    CSSNumericValue,
    CSSMathValue,
    CSSUnitValue,
    CSSKeywordValue,
    CSSMathSum,
    CSSMathProduct,
    CSSMathNegate,
    CSSMathInvert,
    CSSMathMin,
    CSSMathMax,
  }
  if (!globalThis.CSS && !Reflect.defineProperty(globalThis, 'CSS', { value: {} })) {
    throw new Error('Error installing CSSOM support')
  }
  for (const [name, value] of Object.entries(constructors)) {
    if (name in globalThis) continue
    if (!Reflect.defineProperty(globalThis, name, { value }))
      throw new Error(`Error installing ${name}`)
  }
  for (const [name, unit] of Object.entries(CSS_UNIT_FACTORIES)) {
    if (name in CSS) continue
    if (
      !Reflect.defineProperty(CSS, name, {
        value: (value: number) => new numeric.CSSUnitValue(value, unit),
      })
    ) {
      throw new Error(`Error installing CSS.${name}`)
    }
  }
}
