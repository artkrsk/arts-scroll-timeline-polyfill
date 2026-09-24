import { describe, expect, it } from 'vitest'
import { item, required } from '../../src/ts/platform/assertions.js'
import {
  ANIMATION_RANGE_NAMES,
  CSS_UNIT_FACTORIES,
  DEFAULT_TIMELINE_AXIS,
  isRangeName,
  isTimelineAxis,
  NATIVE_SUPPORT_QUERIES,
  TIMELINE_AXES,
} from '../../src/ts/platform/constants.js'
import { numericType } from '../../src/ts/platform/numeric-api.js'
import type { PolyfillNumericValue, TimelineAxis } from '../../src/ts/public/index.js'
import {
  isCanonical,
  normalizeAxis,
  splitIntoComponentValues,
} from '../../src/ts/upstream/utils.js'

describe('assertions', () => {
  it('returns present values including falsy ones', () => {
    expect(required(0)).toBe(0)
    expect(required('')).toBe('')
    expect(required(false)).toBe(false)
  })

  it.each([null, undefined])('rejects %s with a TypeError', (value) => {
    expect(() => required(value)).toThrow(new TypeError('Missing internal value'))
    expect(() => required(value, 'Custom')).toThrow(new TypeError('Custom'))
  })

  it('reads indexed items from array-likes', () => {
    expect(item([1, 2], 1)).toBe(2)
    expect(item('ab', 1)).toBe('b')
    expect(() => item([1], 5)).toThrow(new TypeError('Unexpected end of input'))
  })
})

describe('constants', () => {
  it('exposes the default axis and native support probes', () => {
    expect(TIMELINE_AXES).toContain(DEFAULT_TIMELINE_AXIS)
    expect(NATIVE_SUPPORT_QUERIES).toContain('animation-timeline: view()')
    expect(CSS_UNIT_FACTORIES.Q).toBe('q')
    expect(CSS_UNIT_FACTORIES.rems).toBe('rem')
  })

  it.each(TIMELINE_AXES)('accepts timeline axis %s', (axis) => {
    expect(isTimelineAxis(axis)).toBe(true)
  })

  it.each(ANIMATION_RANGE_NAMES)('accepts range name %s', (name) => {
    expect(isRangeName(name)).toBe(true)
  })

  it.each(['horizontal', 'Block', '', 'cover '])('rejects %j as axis and range name', (value) => {
    expect(isTimelineAxis(value)).toBe(false)
    expect(isRangeName(value)).toBe(false)
  })
})

describe('numericType', () => {
  it('returns the type reported by the value', () => {
    const value = { type: () => ({ length: 1 }) } as unknown as PolyfillNumericValue
    expect(numericType(value)).toEqual({ length: 1 })
  })

  it('rejects values without a type method', () => {
    const value = { toString: () => 'calc(1px)' } as unknown as PolyfillNumericValue
    expect(() => numericType(value)).toThrow(TypeError)
  })
})

describe('utils', () => {
  it.each([
    ['px', true],
    ['PX', true],
    ['deg', true],
    ['s', true],
    ['hz', true],
    ['dppx', true],
    ['number', true],
    ['fr', true],
    ['em', false],
    ['percent', false],
    ['ms', false],
  ])('reports whether %s is canonical', (unit, expected) => {
    expect(isCanonical(unit)).toBe(expected)
  })

  it.each(['x', 'y'] as const)('passes physical axis %s through without a style', (axis) => {
    expect(normalizeAxis(axis)).toBe(axis)
  })

  it.each<[TimelineAxis, string, 'x' | 'y']>([
    ['block', 'horizontal-tb', 'y'],
    ['inline', 'horizontal-tb', 'x'],
    ['block', 'vertical-lr', 'x'],
    ['inline', 'vertical-lr', 'y'],
    ['inline', 'vertical-rl', 'y'],
  ])('maps %s in %s writing mode to %s', (axis, writingMode, expected) => {
    expect(normalizeAxis(axis, { writingMode })).toBe(expected)
  })

  it('requires a computed style for logical axes', () => {
    expect(() => normalizeAxis('block')).toThrow(Error)
  })

  it('splits component values on top-level whitespace', () => {
    expect(splitIntoComponentValues('cover calc(0% + 50px)')).toEqual(['cover', 'calc(0% + 50px)'])
  })

  it('rejects unknown axes', () => {
    const axis: string = 'diagonal'
    expect(() => normalizeAxis(axis as TimelineAxis, { writingMode: 'horizontal-tb' })).toThrow(
      TypeError,
    )
  })
})
