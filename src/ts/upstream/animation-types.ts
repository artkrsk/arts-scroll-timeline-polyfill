import type { PolyfillAnimationEffect, PolyfillRangeInput } from '../public/index.js'
import type { ScrollTimeline } from './scroll-timeline-base.js'
import type { AnimationRange } from './timeline-types.js'
import type { ProxyAnimation, PromiseWrapper } from './proxy-animation.js'

export type NativeAnimation = Animation & {
  rangeStart?: PolyfillRangeInput
  rangeEnd?: PolyfillRangeInput
}
export interface NativeTiming extends Omit<EffectTiming, 'duration'> {
  delay: number
  endDelay: number
  iterations: number
  iterationStart: number
  fill: FillMode
  direction: PlaybackDirection
  easing: string
  duration: number | 'auto'
}
export interface AnimationState {
  animation: NativeAnimation
  timeline: ScrollTimeline | null | undefined
  readyPromise: PromiseWrapper<ProxyAnimation> | null
  finishedPromise: PromiseWrapper<ProxyAnimation> | null
  startTime: number | null
  holdTime: number | null
  rangeDuration: number | null
  previousCurrentTime: number | null
  autoAlignStartTime: boolean
  autoDurationEffect: boolean | null
  pendingPlaybackRate: number | null
  pendingTask: 'play' | 'pause' | null
  specifiedTiming: NativeTiming | null
  normalizedTiming: NativeTiming | null
  effect: PolyfillAnimationEffect | null
  animationRange: AnimationRange | null
  proxy: ProxyAnimation
}
