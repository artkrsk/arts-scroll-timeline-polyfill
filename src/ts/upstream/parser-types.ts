import type { AnonymousSource, TimelineOptions } from './timeline-types.js'

export interface SheetCursor {
  sheetSrc: string
  index: number
  name?: string | undefined
}
export interface RuleBlock {
  contents: string
  startIndex: number
  endIndex: number
}
export interface QualifiedRule {
  selector: string
  block: RuleBlock
  startIndex: number
  endIndex: number
}
export interface AnimationRelation {
  'animation-timeline'?: string | undefined
  'animation-name'?: string | undefined
  'animation-range'?: string | undefined
}
export interface TimelineRule extends AnimationRelation {
  selector: string
}
export interface TimelineRegistration {
  selector: string
  name: string
  axis?: ScrollAxis | undefined
  inset?: string | null | undefined
}
export interface AnonymousScrollOptions {
  axis?: ScrollAxis
  source?: AnonymousSource
}
export interface AnonymousViewOptions {
  axis?: ScrollAxis
  inset?: string
}
export interface ScrollBindingOptions extends TimelineOptions {
  kind: 'scroll'
  source: Element | null
}
export interface ViewBindingOptions extends TimelineOptions {
  kind: 'view'
  subject: Element
}
export type BindingOptions = ScrollBindingOptions | ViewBindingOptions
export type KeyframeMapping = Map<number, string>
