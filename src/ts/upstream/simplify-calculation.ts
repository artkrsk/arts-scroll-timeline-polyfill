import type {
  PolyfillNumericValue,
  PolyfillUnitValue,
  PolyfillMathSum,
  PolyfillNumericArray,
} from '../public/index.js'
import { required } from '../platform/assertions.js'
export interface CalculationInfo {
  percentageReference?: PolyfillUnitValue
  fontSize?: PolyfillUnitValue
}
import { numeric as cssNumeric } from '../platform/numeric-api.js'
import { isCanonical } from './utils.js'

/**
 * Groups a list of objects by a given string keyed property
 *
 * @template T
 * @param {T[]} items
 * @param {string} key string key
 * @return {Map<T[K],T[]>}
 */
function groupBy<T, K extends keyof T>(items: T[], key: K): Map<T[K], T[]> {
  return items.reduce((groups, item) => {
    if (groups.has(item[key])) {
      required(groups.get(item[key])).push(item)
    } else {
      groups.set(item[key], [item])
    }
    return groups
  }, new Map<T[K], T[]>())
}

/**
 * Partitions a list into a tuple of lists.
 * The first item in the tuple contains a list of items that pass the test provided by the callback function.
 * The second item in the tuple contains the remaining items
 *
 * @template T
 * @param {T[]} items
 * @param {(item:T) => boolean} callbackFn Returns truthy if item should be put in the first list in the tuple, falsy if it should be put in the second list.
 * @return {[T[],T[]]}
 */
function partition<T, U extends T>(items: T[], callbackFn: (item: T) => item is U): [U[], T[]] {
  const partA: U[] = []
  const partB: T[] = []
  for (const item of items) {
    if (callbackFn(item)) {
      partA.push(item)
    } else {
      partB.push(item)
    }
  }
  return [partA, partB]
}

/**
 * Partial implementation of `simplify a calculation tree` applied to CSSNumericValue
 * https://www.w3.org/TR/css-values-4/#simplify-a-calculation-tree
 *
 * @param {CSSNumericValue} root
 * @param {Info} info information used to resolve
 * @return {CSSNumericValue}
 */
export function simplifyCalculation(
  root: PolyfillNumericValue,
  info: CalculationInfo = {},
): PolyfillNumericValue {
  function simplifyNumericArray(values: PolyfillNumericArray): PolyfillNumericValue[] {
    return Array.from(values).map((value) => simplifyCalculation(value, info))
  }

  // To simplify a calculation tree root:
  if (root instanceof cssNumeric.CSSUnitValue) {
    // 1. If root is a numeric value:

    if (root.unit === 'percent' && info.percentageReference) {
      // 1. If root is a percentage that will be resolved against another value, and there is enough information
      //    available to resolve it, do so, and express the resulting numeric value in the appropriate canonical unit.
      //    Return the value.
      const resolvedValue = (root.value / 100) * info.percentageReference.value
      const resolvedUnit = info.percentageReference.unit
      return new cssNumeric.CSSUnitValue(resolvedValue, resolvedUnit)
    }

    // 2. If root is a dimension that is not expressed in its canonical unit, and there is enough information available
    //    to convert it to the canonical unit, do so, and return the value.

    // Use Typed OM toSum() to convert values in compatible sets to canonical units
    const sum = root.toSum()
    if (sum && sum.values.length === 1) {
      root = required(sum.values[0])
    }
    // TODO: handle relative lengths
    if (root instanceof cssNumeric.CSSUnitValue && root.unit === 'em' && info.fontSize) {
      root = new cssNumeric.CSSUnitValue(root.value * info.fontSize.value, info.fontSize.unit)
    }
    // 3. If root is a <calc-keyword> that can be resolved, return what it resolves to, simplified.
    if (root instanceof cssNumeric.CSSKeywordValue) {
      //https://www.w3.org/TR/css-values-4/#calc-constants
      if (root.value === 'e') {
        return new cssNumeric.CSSUnitValue(Math.E, 'number')
      } else if (root.value === 'pi') {
        return new cssNumeric.CSSUnitValue(Math.PI, 'number')
      }
    }
    // 4. Otherwise, return root.
    return root
  }

  // Simplify children while preserving the browser constructor for each supported expression.
  if (root instanceof cssNumeric.CSSMathSum)
    root = new cssNumeric.CSSMathSum(...simplifyNumericArray(root.values))
  else if (root instanceof cssNumeric.CSSMathProduct)
    root = new cssNumeric.CSSMathProduct(...simplifyNumericArray(root.values))
  else if (root instanceof cssNumeric.CSSMathNegate)
    root = new cssNumeric.CSSMathNegate(simplifyCalculation(root.value, info))
  else if (root instanceof cssNumeric.CSSMathInvert)
    root = new cssNumeric.CSSMathInvert(simplifyCalculation(root.value, info))
  else if (root instanceof cssNumeric.CSSMathMin)
    root = new cssNumeric.CSSMathMin(...simplifyNumericArray(root.values))
  else if (root instanceof cssNumeric.CSSMathMax)
    root = new cssNumeric.CSSMathMax(...simplifyNumericArray(root.values))
  else if (typeof CSSMathClamp !== 'undefined' && root instanceof CSSMathClamp) {
    // Clamp exists only on the native Typed OM path; the shim does not install it.
    // Native constructors require native values. Simplification stays in that realm.
    const lower = simplifyCalculation(root.lower, info)
    const value = simplifyCalculation(root.value, info)
    const upper = simplifyCalculation(root.upper, info)
    if (
      lower instanceof CSSNumericValue &&
      value instanceof CSSNumericValue &&
      upper instanceof CSSNumericValue
    ) {
      root = new CSSMathClamp(lower, value, upper)
    }
  }

  // 4. If root is an operator node that’s not one of the calc-operator nodes, and all of its calculation children are
  //    numeric values with enough information to compute the operation root represents, return the result of running
  //    root’s operation using its children, expressed in the result’s canonical unit.
  if (root instanceof cssNumeric.CSSMathMin || root instanceof cssNumeric.CSSMathMax) {
    const children = Array.from(root.values)
    const first = children[0]
    if (
      first instanceof cssNumeric.CSSUnitValue &&
      children.every(
        (child) =>
          child instanceof cssNumeric.CSSUnitValue &&
          child.unit !== 'percent' &&
          isCanonical(child.unit) &&
          child.unit === first.unit,
      )
    ) {
      const result = (root instanceof cssNumeric.CSSMathMin ? Math.min : Math.max)(
        ...children.map((child) => {
          if (!(child instanceof cssNumeric.CSSUnitValue))
            throw new TypeError('Invalid numeric child')
          return child.value
        }),
      )
      return new cssNumeric.CSSUnitValue(result, first.unit)
    }
  }

  //    Note: If a percentage is left at this point, it will usually block simplification of the node, since it needs to be
  //    resolved against another value using information not currently available. (Otherwise, it would have been converted
  //    to a different value in an earlier step.) This includes operations such as "min", since percentages might resolve
  //    against a negative basis, and thus end up with an opposite comparative relationship than the raw percentage value
  //    would seem to indicate.
  //
  //    However, "raw" percentages—ones which do not resolve against another value, such as in opacity—might not block
  //    simplification.

  // 5. If root is a Min or Max node, attempt to partially simplify it:
  if (root instanceof cssNumeric.CSSMathMin || root instanceof cssNumeric.CSSMathMax) {
    const children = Array.from(root.values)
    const [numeric, rest] = partition(
      children,
      (child): child is PolyfillUnitValue =>
        child instanceof cssNumeric.CSSUnitValue && child.unit !== 'percent',
    )
    const unitGroups = Array.from(groupBy(numeric, 'unit').values())
    //    1. For each node child of root’s children:
    //
    //       If child is a numeric value with enough information to compare magnitudes with another child of the same
    //       unit (see note in previous step), and there are other children of root that are numeric children with the same
    //       unit, combine all such children with the appropriate operator per root, and replace child with the result,
    //       removing all other child nodes involved.
    const hasComparableChildren = unitGroups.some((group) => group.length > 0)
    if (hasComparableChildren) {
      const combine = root instanceof cssNumeric.CSSMathMin ? Math.min : Math.max
      const combinedGroups = unitGroups.map((group) => {
        const result = combine(...group.map(({ value }) => value))
        return new cssNumeric.CSSUnitValue(result, required(group[0]).unit)
      })
      if (root instanceof cssNumeric.CSSMathMin) {
        root = new cssNumeric.CSSMathMin(...combinedGroups, ...rest)
      } else {
        root = new cssNumeric.CSSMathMax(...combinedGroups, ...rest)
      }
    }

    //    2. If root has only one child, return the child.
    //
    //       Otherwise, return root.
    if (children.length === 1) {
      return required(children[0])
    } else {
      return root
    }
  }

  // If root is a Negate node:
  //
  // If root’s child is a numeric value, return an equivalent numeric value, but with the value negated (0 - value).
  // If root’s child is a Negate node, return the child’s child.
  // Return root.
  if (root instanceof cssNumeric.CSSMathNegate) {
    if (root.value instanceof cssNumeric.CSSUnitValue) {
      return new cssNumeric.CSSUnitValue(0 - root.value.value, root.value.unit)
    } else if (root.value instanceof cssNumeric.CSSMathNegate) {
      return root.value.value
    } else {
      return root
    }
  }

  // If root is an Invert node:
  //
  // If root’s child is a number (not a percentage or dimension) return the reciprocal of the child’s value.
  // If root’s child is an Invert node, return the child’s child.
  // Return root.
  if (root instanceof cssNumeric.CSSMathInvert) {
    if (root.value instanceof cssNumeric.CSSMathInvert) {
      return root.value.value
    } else {
      return root
    }
  }

  // If root is a Sum node:
  if (root instanceof cssNumeric.CSSMathSum) {
    let children: PolyfillNumericValue[] = []
    // For each of root’s children that are Sum nodes, replace them with their children.
    for (const value of root.values) {
      if (value instanceof cssNumeric.CSSMathSum) {
        children.push(...value.values)
      } else {
        children.push(value)
      }
    }

    // For each set of root’s children that are numeric values with identical units, remove those children and
    // replace them with a single numeric value containing the sum of the removed nodes, and with the same unit.
    //
    // (E.g. combine numbers, combine percentages, combine px values, etc.)
    function sumValuesWithSameUnit(values: PolyfillNumericValue[]): PolyfillNumericValue[] {
      const numericValues = values.filter((c) => c instanceof cssNumeric.CSSUnitValue)
      const nonNumericValues = values.filter((c) => !(c instanceof cssNumeric.CSSUnitValue))

      const summedNumericValues = Array.from(groupBy(numericValues, 'unit').entries()).map(
        ([unit, values]) => {
          const sum = values.reduce((a, { value }) => a + value, 0)
          return new cssNumeric.CSSUnitValue(sum, unit)
        },
      )
      return [...nonNumericValues, ...summedNumericValues]
    }

    children = sumValuesWithSameUnit(children)

    // If root has only a single child at this point, return the child. Otherwise, return root.
    // NOTE: Zero-valued terms cannot be simply removed from a Sum; they can only be combined with other values
    // that have identical units. (This is because the mere presence of a unit, even with a zero value,
    // can sometimes imply a change in behavior.)
    if (children.length === 1) {
      return required(children[0])
    } else {
      return new cssNumeric.CSSMathSum(...children)
    }
  }

  // If root is a Product node:
  //
  // For each of root’s children that are Product nodes, replace them with their children.
  if (root instanceof cssNumeric.CSSMathProduct) {
    let children: PolyfillNumericValue[] = []
    for (const value of root.values) {
      if (value instanceof cssNumeric.CSSMathProduct) {
        children.push(...value.values)
      } else {
        children.push(value)
      }
    }

    // If root has multiple children that are numbers (not percentages or dimensions), remove them and replace them with
    // a single number containing the product of the removed nodes.
    const [numbers, rest] = partition(
      children,
      (child): child is PolyfillUnitValue =>
        child instanceof cssNumeric.CSSUnitValue && child.unit === 'number',
    )
    if (numbers.length > 1) {
      const product = numbers.reduce((a, { value }) => a * value, 1)
      children = [new cssNumeric.CSSUnitValue(product, 'number'), ...rest]
    }

    // If root contains only two children, one of which is a number (not a percentage or dimension) and the other of
    // which is a Sum whose children are all numeric values, multiply all of the Sum’s children by the number,
    // then return the Sum.
    if (children.length === 2) {
      let numeric: PolyfillUnitValue | undefined, sum: PolyfillMathSum | undefined
      for (const child of children) {
        if (child instanceof cssNumeric.CSSUnitValue && child.unit === 'number') {
          numeric = child
        } else if (
          child instanceof cssNumeric.CSSMathSum &&
          [...child.values].every((c) => c instanceof cssNumeric.CSSUnitValue)
        ) {
          sum = child
        }
      }
      if (numeric && sum) {
        return new cssNumeric.CSSMathSum(
          ...[...sum.values].map((value) => {
            if (!(value instanceof cssNumeric.CSSUnitValue))
              throw new TypeError('Invalid numeric child')
            return new cssNumeric.CSSUnitValue(value.value * required(numeric).value, value.unit)
          }),
        )
      }
    }

    // If root contains only numeric values and/or Invert nodes containing numeric values, and multiplying the types of
    // all the children (noting that the type of an Invert node is the inverse of its child’s type) results in a type
    // that matches any of the types that a math function can resolve to, return the result of multiplying all the values
    // of the children (noting that the value of an Invert node is the reciprocal of its child’s value),
    // expressed in the result’s canonical unit.
    if (
      children.every(
        (child) =>
          (child instanceof cssNumeric.CSSUnitValue && isCanonical(child.unit)) ||
          (child instanceof cssNumeric.CSSMathInvert &&
            child.value instanceof cssNumeric.CSSUnitValue &&
            isCanonical(child.value.unit)),
      )
    ) {
      // Use CSS Typed OM to multiply types
      const sum = new cssNumeric.CSSMathProduct(...children).toSum()
      if (sum && sum.values.length === 1) {
        return required(sum.values[0])
      }
    }

    // Return root.
    return new cssNumeric.CSSMathProduct(...children)
  }
  // Return root.
  return root
}
