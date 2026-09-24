import type { PolyfillInset, PolyfillNumericValue } from '../public/index.js'
import { required } from '../platform/assertions.js'
export interface ParsedInset {
  start: PolyfillNumericValue | 'auto'
  end: PolyfillNumericValue | 'auto'
}
export interface InsetState {
  subject: Element | null
  artsInset?: PolyfillInset
  artsResolvedInset?: PolyfillInset
  inset: ParsedInset | null
}
interface InsetCache {
  style: CSSStyleDeclaration
  values: Map<string, string>
}
import { numeric, numericType } from '../platform/numeric-api.js'
/* Arts CSS value compatibility, extracted from the shipped 1.1.0-arts.4 bundle. */
export function artsSplitCSS(value: string, delimiter = ','): string[] {
  const result = []
  let start = 0,
    depth = 0,
    quote = '',
    escaped = false,
    comment = false
  for (let index = 0; index < value.length; index++) {
    const char = value.charAt(index),
      next = value[index + 1]
    if (comment) {
      if (char === '*' && next === '/') {
        comment = false
        index++
      }
      continue
    }
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '/' && next === '*') {
      comment = true
      index++
      continue
    }
    if ('([{'.includes(char)) depth++
    else if (')]}'.includes(char)) depth--
    else if (!depth && (delimiter === ' ' ? /\s/.test(char) : char === delimiter)) {
      const part = value.slice(start, index).trim()
      if (part || delimiter !== ' ') result.push(part)
      start = index + 1
    }
  }
  const part = value.slice(start).trim()
  if (part || delimiter !== ' ') result.push(part)
  return result
}
export function artsResolveVars(
  value: string,
  style: Pick<CSSStyleDeclaration, 'getPropertyValue'>,
  seen = new Set<string>(),
): string | null {
  if (seen.size > 64) return null
  let output = '',
    cursor = 0
  const pattern = /var\(/g
  let match = pattern.exec(value)
  while (match) {
    let end = pattern.lastIndex,
      depth = 1,
      quote = '',
      escaped = false
    for (; end < value.length && depth; end++) {
      const char = value.charAt(end)
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (quote) {
        if (char === quote) quote = ''
        continue
      }
      if (char === '"' || char === "'") {
        quote = char
        continue
      }
      if (char === '(') depth++
      else if (char === ')') depth--
    }
    if (depth) return null
    const parts = artsSplitCSS(value.slice(pattern.lastIndex, end - 1))
    const name = parts.shift()
    if (!name || !/^--/.test(name)) return null
    let replacement: string | null = null
    if (!seen.has(name)) {
      const custom = style.getPropertyValue(name).trim()
      if (custom) replacement = artsResolveVars(custom, style, new Set([...seen, name]))
    }
    if (replacement === null && parts.length)
      replacement = artsResolveVars(parts.join(','), style, seen)
    if (replacement === null) return null
    output += value.slice(cursor, match.index) + replacement
    cursor = end
    pattern.lastIndex = end
    match = pattern.exec(value)
  }
  return output + value.slice(cursor)
}
// css-values-4 §6.1: a literal unitless zero is a <length>; calc(0) and other numbers are not.
const cssNumber = /^[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?$/i
export function artsParseInset(value: PolyfillInset): ParsedInset {
  const input =
    typeof value === 'string'
      ? artsSplitCSS(value, ' ').map((part) =>
          part === 'auto'
            ? part
            : cssNumber.test(part) && Number(part) === 0
              ? numeric.CSS.px(0)
              : numeric.CSSNumericValue.parse(part),
        )
      : value
  if (!input.length || input.length > 2) throw new TypeError('Invalid inset')
  const parts = input.map((part): PolyfillNumericValue | 'auto' => {
    if (part === 'auto') return part
    if (part instanceof numeric.CSSKeywordValue) {
      if (part.value === 'auto') return 'auto'
      throw new TypeError('Invalid inset keyword')
    }
    const type = numericType(part)
    if (type.length !== 1 && type.percent !== 1) throw new TypeError('Invalid inset')
    return part
  })
  const start = required(parts[0])
  return { start, end: parts[1] ?? start }
}
let artsInsetCache = new WeakMap<Element, InsetCache>(),
  artsInsetCachePending = false
export function artsResolvedInset(subject: Element, raw: string): string {
  let cache = artsInsetCache.get(subject)
  if (!cache) {
    cache = { style: getComputedStyle(subject), values: new Map() }
    artsInsetCache.set(subject, cache)
  }
  if (!cache.values.has(raw)) cache.values.set(raw, artsResolveVars(raw, cache.style) ?? 'auto')
  if (!artsInsetCachePending) {
    artsInsetCachePending = true
    requestAnimationFrame(() => {
      artsInsetCache = new WeakMap<Element, InsetCache>()
      artsInsetCachePending = false
    })
  }
  return required(cache.values.get(raw))
}
export function artsRefreshInset(state: InsetState, style?: CSSStyleDeclaration): boolean {
  const raw = state.artsInset
  if (raw == null) return false
  const hasVars = typeof raw === 'string' && raw.includes('var(')
  const resolved =
    hasVars && state.subject
      ? style
        ? (artsResolveVars(raw, style) ?? 'auto')
        : artsResolvedInset(state.subject, raw)
      : raw
  if (state.artsResolvedInset === resolved) return false
  state.inset = artsParseInset(resolved)
  state.artsResolvedInset = resolved
  return true
}

export function artsClearInsetCache(): void {
  artsInsetCache = new WeakMap<Element, InsetCache>()
}
