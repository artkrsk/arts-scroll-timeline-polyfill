import { describe, expect, it } from 'vitest'
import { calculateRange } from '../../src/ts/upstream/scroll-timeline-base.js'
import { normalizeAxis } from '../../src/ts/upstream/utils.js'
import type {
  SourceMeasurements,
  SubjectMeasurements,
} from '../../src/ts/upstream/timeline-types.js'

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
