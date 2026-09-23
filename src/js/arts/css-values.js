/* Arts CSS value compatibility, extracted from the shipped 1.1.0-arts.4 bundle. */
export function artsSplitCSS(value, delimiter = ',') {
  const result = []
  let start = 0,
    depth = 0,
    quote = '',
    escaped = false,
    comment = false
  for (let index = 0; index < value.length; index++) {
    const char = value[index],
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
export function artsResolveVars(value, style, seen = new Set()) {
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
      const char = value[end]
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
    if (!/^--/.test(name)) return null
    let replacement = null
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
export function artsParseInset(value) {
  const parts =
    typeof value === 'string'
      ? artsSplitCSS(value, ' ').map((part) =>
          part === 'auto' ? part : CSSNumericValue.parse(part),
        )
      : Array.isArray(value)
        ? value
        : [value]
  if (!parts.length || parts.length > 2) throw TypeError('Invalid inset')
  for (const part of parts) {
    if (part === 'auto') continue
    const type = part.type()
    if (type.length !== 1 && type.percent !== 1) throw TypeError('Invalid inset')
  }
  return { start: parts[0], end: parts[1] ?? parts[0] }
}
let artsInsetCache = new WeakMap(),
  artsInsetCachePending = false
export function artsResolvedInset(subject, raw) {
  let cache = artsInsetCache.get(subject)
  if (!cache) {
    cache = { style: getComputedStyle(subject), values: new Map() }
    artsInsetCache.set(subject, cache)
  }
  if (!cache.values.has(raw)) cache.values.set(raw, artsResolveVars(raw, cache.style) ?? 'auto')
  if (!artsInsetCachePending) {
    artsInsetCachePending = true
    requestAnimationFrame(() => {
      artsInsetCache = new WeakMap()
      artsInsetCachePending = false
    })
  }
  return cache.values.get(raw)
}
export function artsRefreshInset(state, style) {
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

export function artsClearInsetCache() {
  artsInsetCache = new WeakMap()
}
