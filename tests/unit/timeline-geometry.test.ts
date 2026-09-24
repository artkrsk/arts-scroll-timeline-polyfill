import { beforeAll, describe, expect, it } from 'vitest'
import { artsParseInset } from '../../src/ts/arts/css-values.js'
import type { TimelineRangeName } from '../../src/ts/public/index.js'
import { installCSSOM } from '../../src/ts/upstream/proxy-cssom.js'
import { calculateRange } from '../../src/ts/upstream/scroll-timeline-base.js'
import { normalizeAxis } from '../../src/ts/upstream/utils.js'
import type {
  SourceMeasurements,
  SubjectMeasurements,
} from '../../src/ts/upstream/timeline-types.js'

beforeAll(installCSSOM)

const source: SourceMeasurements = {
  scrollLeft: 0,
  scrollTop: 0,
  scrollWidth: 1000,
  scrollHeight: 500,
  clientWidth: 200,
  clientHeight: 100,
  direction: 'ltr',
  writingMode: 'horizontal-tb',
  scrollPaddingTop: '0px',
  scrollPaddingBottom: '0px',
  scrollPaddingLeft: '0px',
  scrollPaddingRight: '0px',
}
const subject: SubjectMeasurements = {
  top: 150,
  left: 250,
  offsetWidth: 50,
  offsetHeight: 80,
  fontSize: '16px',
}

describe('timeline geometry', () => {
  it('computes cover, contain, entry and exit for a subject smaller than its scrollport', () => {
    expect(calculateRange('cover', source, subject, 'block', null)).toEqual({ start: 50, end: 230 })
    expect(calculateRange('contain', source, subject, 'block', null)).toEqual({
      start: 130,
      end: 150,
    })
    expect(calculateRange('entry', source, subject, 'block', null)).toEqual({ start: 50, end: 130 })
    expect(calculateRange('exit', source, subject, 'block', null)).toEqual({ start: 150, end: 230 })
  })
  it('distinguishes crossing ranges when the subject is larger than the scrollport', () => {
    const large = { ...subject, offsetHeight: 300 }
    expect(calculateRange('entry-crossing', source, large, 'block', null)).toEqual({
      start: 50,
      end: 350,
    })
    expect(calculateRange('exit-crossing', source, large, 'block', null)).toEqual({
      start: 150,
      end: 450,
    })
  })
  it('uses logical axes and the right-to-left scroll origin', () => {
    expect(normalizeAxis('inline', source)).toBe('x')
    expect(normalizeAxis('block', { writingMode: 'vertical-rl' })).toBe('x')
    expect(calculateRange('cover', source, subject, 'inline', null)).toEqual({
      start: 50,
      end: 300,
    })
    expect(
      calculateRange('cover', { ...source, direction: 'rtl' }, subject, 'inline', null),
    ).toEqual({ start: 850, end: 1100 })
    expect(
      calculateRange('cover', { ...source, writingMode: 'vertical-rl' }, subject, 'block', null),
    ).toEqual({ start: 850, end: 1100 })
  })
})

describe('calculateRange phases', () => {
  const large = { ...subject, offsetHeight: 300 }
  it.each<[TimelineRangeName, SubjectMeasurements, number, number]>([
    ['entry-crossing', subject, 50, 130],
    ['exit-crossing', subject, 150, 230],
    ['contain', large, 150, 350],
    ['entry', large, 50, 150],
    ['exit', large, 350, 450],
  ])('%s', (phase, measured, start, end) => {
    expect(calculateRange(phase, source, measured, 'block', null)).toEqual({ start, end })
  })
  it('returns an empty range for unknown names', () => {
    const phase = 'bogus' as unknown as TimelineRangeName
    expect(calculateRange(phase, source, subject, 'block', null)).toEqual({ start: 0, end: 0 })
  })
  it.each([
    ['y', 50, 230],
    ['x', 50, 300],
  ] as const)('supports the physical %s axis', (axis, start, end) => {
    expect(calculateRange('cover', source, subject, axis, null)).toEqual({ start, end })
  })
})

describe('calculateRange insets', () => {
  it.each<[TimelineRangeName, number, number]>([
    ['cover', 70, 220],
    ['contain', 140, 150],
    ['entry-crossing', 70, 150],
    ['exit-crossing', 140, 220],
  ])('applies start and end insets to %s', (phase, start, end) => {
    const inset = artsParseInset('10px 20px')
    expect(calculateRange(phase, source, subject, 'block', inset)).toEqual({ start, end })
  })
  it('resolves percentages against the scrollport size', () => {
    const inset = artsParseInset('10%')
    expect(calculateRange('cover', source, subject, 'block', inset)).toEqual({
      start: 60,
      end: 220,
    })
  })
  it('resolves font-relative lengths against the subject font size', () => {
    const inset = artsParseInset('1em 0.5em')
    expect(calculateRange('cover', source, subject, 'block', inset)).toEqual({
      start: 58,
      end: 214,
    })
  })
  it('uses scroll padding for auto insets', () => {
    const padded = { ...source, scrollPaddingTop: '5px', scrollPaddingBottom: '15px' }
    expect(calculateRange('cover', padded, subject, 'block', artsParseInset('auto'))).toEqual({
      start: 65,
      end: 225,
    })
    const auto = { ...source, scrollPaddingTop: 'auto', scrollPaddingBottom: 'auto' }
    expect(calculateRange('cover', auto, subject, 'block', artsParseInset('auto'))).toEqual({
      start: 50,
      end: 230,
    })
  })
  it('swaps inline scroll padding for right-to-left sources', () => {
    const padded = { ...source, scrollPaddingLeft: '10px', scrollPaddingRight: '30px' }
    const inset = artsParseInset('auto')
    expect(calculateRange('cover', padded, subject, 'inline', inset)).toEqual({
      start: 80,
      end: 290,
    })
    expect(
      calculateRange('cover', { ...padded, direction: 'rtl' }, subject, 'inline', inset),
    ).toEqual({ start: 860, end: 1070 })
  })
})

describe('normalizeAxis', () => {
  it('requires a computed style for logical axes', () => {
    expect(normalizeAxis('y')).toBe('y')
    expect(() => normalizeAxis('block')).toThrow(/computedStyle/)
  })
  it('maps inline to y in vertical writing modes', () => {
    expect(normalizeAxis('inline', { writingMode: 'vertical-lr' })).toBe('y')
  })
  it('rejects unknown axes', () => {
    const axis = 'z' as unknown as ScrollAxis
    expect(() => normalizeAxis(axis, source)).toThrow(TypeError)
  })
})
