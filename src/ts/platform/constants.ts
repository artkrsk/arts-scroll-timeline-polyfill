import type { TimelineAxis, TimelineRangeName } from '../public/index.js'

export const TIMELINE_AXES = [
  'block',
  'inline',
  'x',
  'y',
] as const satisfies readonly TimelineAxis[]
export { RANGE_NAMES as ANIMATION_RANGE_NAMES } from '../public/constants.js'
import { RANGE_NAMES as ANIMATION_RANGE_NAMES } from '../public/constants.js'
export const DEFAULT_TIMELINE_AXIS = 'block' satisfies TimelineAxis
export const NATIVE_SUPPORT_QUERIES = [
  'animation-timeline: view()',
  'animation-timeline: scroll(root block)',
  'view-timeline: --probe block',
  'animation-timeline: --probe',
  'animation-range: contain 0% contain 100%',
] as const
export const CSS_UNIT_FACTORIES = {
  number: 'number',
  percent: 'percent',
  em: 'em',
  ex: 'ex',
  px: 'px',
  cm: 'cm',
  mm: 'mm',
  in: 'in',
  pt: 'pt',
  pc: 'pc',
  Q: 'q',
  vw: 'vw',
  vh: 'vh',
  vmin: 'vmin',
  vmax: 'vmax',
  rem: 'rem',
  rems: 'rem',
  ch: 'ch',
  deg: 'deg',
  rad: 'rad',
  grad: 'grad',
  turn: 'turn',
  ms: 'ms',
  s: 's',
  Hz: 'hz',
  kHz: 'khz',
  dppx: 'dppx',
  dpi: 'dpi',
  dpcm: 'dpcm',
  fr: 'fr',
} as const satisfies Record<string, string>
export const isTimelineAxis = (value: string): value is TimelineAxis =>
  TIMELINE_AXES.some((axis) => axis === value)
export const isRangeName = (value: string): value is TimelineRangeName =>
  ANIMATION_RANGE_NAMES.some((name) => name === value)
