import { splitIntoComponentValues } from '../../src/ts/upstream/utils.js'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  artsClearInsetCache,
  artsParseInset,
  artsRefreshInset,
  artsResolvedInset,
  artsResolveVars,
  artsSplitCSS,
} from '../../src/ts/arts/css-values.js'
import type { InsetState } from '../../src/ts/arts/css-values.js'
import type { PolyfillInset } from '../../src/ts/public/index.js'
import { installCSSOM } from '../../src/ts/upstream/proxy-cssom.js'
import { numeric } from '../../src/ts/platform/numeric-api.js'

beforeAll(installCSSOM)

describe('CSS value helpers', () => {
  it('splits lists without breaking nested functions, strings, escapes, or comments', () => {
    expect(artsSplitCSS('fade steps(4, end), move cubic-bezier(0, .5, 1, 1), "a,b"')).toEqual([
      'fade steps(4, end)',
      'move cubic-bezier(0, .5, 1, 1)',
      '"a,b"',
    ])
    expect(artsSplitCSS('var(--inset, calc(2px + 3px)) 0px', ' ')).toEqual([
      'var(--inset, calc(2px + 3px))',
      '0px',
    ])
    expect(artsSplitCSS('a/*,*/b,c\\,d')).toEqual(['a/*,*/b', 'c\\,d'])
    expect(splitIntoComponentValues('calc(0% + 50px) calc(100% - 50px)')).toEqual([
      'calc(0% + 50px)',
      'calc(100% - 50px)',
    ])
  })
  it('resolves nested variables and fallbacks without recursing on cycles', () => {
    const values = new Map([
      ['--offset', 'var(--missing, 40px)'],
      ['--cycle', 'var(--cycle)'],
    ])
    const style = { getPropertyValue: (name: string) => values.get(name) ?? '' }
    expect(artsResolveVars('var(--offset) 0px', style)).toBe('40px 0px')
    expect(artsResolveVars('var(--cycle, 10px)', style)).toBe('10px')
    expect(artsResolveVars('var(--missing)', style)).toBeNull()
  })
  it('parses insets including keyword objects and rejects invalid shapes', () => {
    expect(String(artsParseInset('20px').end)).toBe('20px')
    expect(artsParseInset('auto 0px').start).toBe('auto')
    expect(artsParseInset([new numeric.CSSKeywordValue('auto')])).toEqual({
      start: 'auto',
      end: 'auto',
    })
    expect(() => artsParseInset('1px 2px 3px')).toThrow(TypeError)
    expect(() => artsParseInset('1s')).toThrow(TypeError)
    expect(() => artsParseInset([new numeric.CSSKeywordValue('none')])).toThrow(TypeError)
  })
  it('accepts a unitless zero length only in the CSS string form', () => {
    expect(String(artsParseInset('0').start)).toBe('0px')
    expect(String(artsParseInset('0').end)).toBe('0px')
    expect(String(artsParseInset('0 10px').start)).toBe('0px')
    expect(String(artsParseInset('0 10px').end)).toBe('10px')
    expect(artsParseInset('auto 0').start).toBe('auto')
    expect(String(artsParseInset('auto 0').end)).toBe('0px')
    expect(() => artsParseInset('5')).toThrow(TypeError)
    expect(() => artsParseInset('calc(0)')).toThrow(TypeError)
    expect(() => artsParseInset([new numeric.CSSUnitValue(0, 'number')])).toThrow(TypeError)
  })
})

const styleOf = (entries: Record<string, string>) => {
  const values = new Map(Object.entries(entries))
  return { getPropertyValue: (name: string) => values.get(name) ?? '' }
}

describe('artsSplitCSS', () => {
  it.each([
    ["'a,b',c", ',', ["'a,b'", 'c']],
    ['"a\\",b",c', ',', ['"a\\",b"', 'c']],
    ['a[b,c],{d,e},f', ',', ['a[b,c]', '{d,e}', 'f']],
    ['a),b', ',', ['a),b']],
    ['a,', ',', ['a', '']],
    ['', ',', ['']],
    ['', ' ', []],
    ['  a\t\nb  ', ' ', ['a', 'b']],
    ['a/*,b', ',', ['a/*,b']],
    ['a/* * */,b', ',', ['a/* * */', 'b']],
    ['a;b(c;d);e', ';', ['a', 'b(c;d)', 'e']],
  ])('splits %j on %j', (value, delimiter, expected) => {
    expect(artsSplitCSS(value, delimiter)).toEqual(expected)
  })
})

describe('artsResolveVars', () => {
  const style = styleOf({ '--a': '1px', '--b': '2px', '--pad': '  5px ', '--blank': '  ' })

  it.each([
    ['calc(var(--a) + var(--b))', 'calc(1px + 2px)'],
    ['var(--pad)', '5px'],
    ['var(--blank, 3px)', '3px'],
    ['var(--m, 1px, 2px)', '1px,2px'],
    ['var(--m, "a)b")', '"a)b"'],
    ["var(--m, 'a)b')", "'a)b'"],
    ['var(--m, a\\)b)', 'a\\)b'],
    ['var(--m,)', ''],
    ['var(--m, calc(1px + var(--a)))', 'calc(1px + 1px)'],
    ['no variables', 'no variables'],
  ])('resolves %s', (value, expected) => {
    expect(artsResolveVars(value, style)).toBe(expected)
  })

  it.each(['var(--a', 'var(a)', 'var()', 'var(--m)'])('rejects %s', (value) => {
    expect(artsResolveVars(value, style)).toBeNull()
  })

  it('stops resolving beyond the recursion limit', () => {
    const names = (size: number) => new Set(Array.from({ length: size }, (_, i) => `--v${i}`))
    expect(artsResolveVars('1px', style, names(64))).toBe('1px')
    expect(artsResolveVars('1px', style, names(65))).toBeNull()
  })
})

describe('artsParseInset', () => {
  it('parses percentages, lengths and auto entries', () => {
    const inset = artsParseInset('10% 20px')
    expect(String(inset.start)).toBe('10%')
    expect(String(inset.end)).toBe('20px')
    const mixed = artsParseInset(['auto', numeric.CSS.px(5)])
    expect(mixed.start).toBe('auto')
    expect(String(mixed.end)).toBe('5px')
  })

  it.each<PolyfillInset>(['', [], '1deg'])('rejects %j', (value) => {
    expect(() => artsParseInset(value)).toThrow(TypeError)
  })

  it('rejects unparseable keywords', () => {
    expect(() => artsParseInset('none')).toThrow(SyntaxError)
  })
})

describe('artsRefreshInset', () => {
  let frames: FrameRequestCallback[]
  const getComputedStyle = vi.fn((_element: Element) => styleOf({ '--a': '12px' }))
  const flush = () => {
    for (const frame of frames.splice(0)) frame(0)
  }
  const subject = {} as Element

  beforeEach(() => {
    frames = []
    getComputedStyle.mockClear()
    vi.stubGlobal('getComputedStyle', getComputedStyle)
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((frame: FrameRequestCallback) => frames.push(frame)),
    )
  })

  afterEach(() => {
    flush()
    artsClearInsetCache()
    vi.unstubAllGlobals()
  })

  it('ignores states without an inset', () => {
    expect(artsRefreshInset({ subject: null, inset: null })).toBe(false)
  })

  it('parses a raw inset once until it changes', () => {
    const state: InsetState = { subject: null, inset: null, artsInset: '10px' }
    expect(artsRefreshInset(state)).toBe(true)
    expect(String(state.inset?.start)).toBe('10px')
    expect(state.artsResolvedInset).toBe('10px')
    expect(artsRefreshInset(state)).toBe(false)
  })

  it('resolves variables with an explicit style', () => {
    const state: InsetState = { subject, inset: null, artsInset: 'var(--a)' }
    const style = styleOf({ '--a': '12px' }) as unknown as CSSStyleDeclaration
    expect(artsRefreshInset(state, style)).toBe(true)
    expect(state.artsResolvedInset).toBe('12px')
    state.artsInset = 'var(--missing)'
    expect(artsRefreshInset(state, style)).toBe(true)
    expect(state.artsResolvedInset).toBe('auto')
    expect(state.inset).toEqual({ start: 'auto', end: 'auto' })
    expect(getComputedStyle).not.toHaveBeenCalled()
  })

  it('resolves variables through the computed style cache', () => {
    const state: InsetState = { subject, inset: null, artsInset: 'var(--a) 0px' }
    expect(artsRefreshInset(state)).toBe(true)
    expect(state.artsResolvedInset).toBe('12px 0px')
    expect(getComputedStyle).toHaveBeenCalledWith(subject)
  })

  it('caches computed styles until the next frame', () => {
    expect(artsResolvedInset(subject, 'var(--a)')).toBe('12px')
    expect(artsResolvedInset(subject, 'var(--a)')).toBe('12px')
    expect(artsResolvedInset(subject, 'var(--b)')).toBe('auto')
    expect(getComputedStyle).toHaveBeenCalledTimes(1)
    expect(frames).toHaveLength(1)
    flush()
    expect(artsResolvedInset(subject, 'var(--a)')).toBe('12px')
    expect(getComputedStyle).toHaveBeenCalledTimes(2)
    expect(frames).toHaveLength(1)
  })

  it('recomputes after the cache is cleared', () => {
    artsResolvedInset(subject, 'var(--a)')
    artsClearInsetCache()
    artsResolvedInset(subject, 'var(--a)')
    expect(getComputedStyle).toHaveBeenCalledTimes(2)
    expect(frames).toHaveLength(1)
  })
})
