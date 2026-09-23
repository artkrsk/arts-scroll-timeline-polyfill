import type { InsetState } from '../arts/css-values.js'
import type {
  PolyfillNumericValue,
  PolyfillScrollTimelineOptions,
  PolyfillViewTimelineOptions,
  PolyfillUnitValue,
  TimelineRangeName,
} from '../public/index.js'
import type { ScrollTimeline } from './scroll-timeline-base.js'

export type AnonymousSource = 'nearest' | 'root' | 'self'
export interface TimelineOptions
  extends PolyfillScrollTimelineOptions,
    PolyfillViewTimelineOptions {
  anonymousSource?: AnonymousSource | null | undefined
  anonymousTarget?: Element | null | undefined
}
export interface SourceMeasurements {
  scrollLeft: number
  scrollTop: number
  scrollWidth: number
  scrollHeight: number
  clientWidth: number
  clientHeight: number
  writingMode: string
  direction: string
  scrollPaddingTop: string
  scrollPaddingBottom: string
  scrollPaddingLeft: string
  scrollPaddingRight: string
}
export interface SubjectMeasurements {
  top: number
  left: number
  offsetWidth: number
  offsetHeight: number
  fontSize: string
}
export interface SourceState {
  timelineRefs: Set<WeakRef<ScrollTimeline>>
  sourceMeasurements: SourceMeasurements | undefined
  updateScheduled: boolean
  disconnect(): void
}
export type TimelineTick = (time: PolyfillUnitValue | null) => void
export interface TimelineState extends InsetState {
  source: Element | null
  axis: ScrollAxis
  anonymousSource: AnonymousSource | null | undefined
  anonymousTarget: Element | null | undefined
  animations: { animation: Animation; tickAnimation: TimelineTick }[]
  subjectMeasurements: SubjectMeasurements | null | undefined
  artsSubjectObservers?: (ResizeObserver | MutationObserver)[]
}
export interface NumericRange {
  start: number
  end: number
}
export interface ViewRangeOffset {
  rangeName: TimelineRangeName
  offset: PolyfillNumericValue
}
export type ResolvedRangePart = 'normal' | PolyfillNumericValue | ViewRangeOffset
export interface AnimationRange {
  start: ResolvedRangePart
  end: ResolvedRangePart
}
export interface InsetSizes {
  fontSize: string
  scrollPadding: [string, string]
  containerSize: number
}
