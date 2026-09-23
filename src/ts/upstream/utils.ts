import type { TimelineAxis } from '../public/index.js'
import { artsSplitCSS } from '../arts/css-values.js'

const canonicalUnits = new Set(['px', 'deg', 's', 'hz', 'dppx', 'number', 'fr'])

export function isCanonical(unit: string): boolean {
  return canonicalUnits.has(unit.toLowerCase())
}

export function normalizeAxis(
  axis: TimelineAxis,
  computedStyle?: { writingMode: string },
): 'x' | 'y' {
  if (axis === 'x' || axis === 'y') return axis

  if (!computedStyle) {
    throw new Error('To determine the normalized axis the computedStyle of the source is required.')
  }

  const horizontalWritingMode = computedStyle.writingMode === 'horizontal-tb'
  if (axis === 'block') {
    axis = horizontalWritingMode ? 'y' : 'x'
  } else if (axis === 'inline') {
    axis = horizontalWritingMode ? 'x' : 'y'
  } else {
    throw new TypeError(`Invalid axis “${axis}”`)
  }

  return axis
}

/**
 * Split an input string into a list of individual component value strings,
 * so that each can be handled as a keyword or parsed with `CSSNumericValue.parse()`;
 *
 * Examples:
 * splitIntoComponentValues('cover'); // ['cover']
 * splitIntoComponentValues('auto 0%'); // ['auto', '100%']
 * splitIntoComponentValues('calc(0% + 50px) calc(100% - 50px)'); // ['calc(0% + 50px)', 'calc(100% - 50px)']
 * splitIntoComponentValues('1px 2px').map(val => CSSNumericValue.parse(val)) // [new CSSUnitValue(1, 'px'), new CSSUnitValue(2, 'px')]
 *
 * @param {string} input
 * @return {string[]}
 */
export function splitIntoComponentValues(input: string): string[] {
  return artsSplitCSS(input, ' ')
}
