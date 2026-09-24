import { vi } from 'vitest'

export type StyleMap = Record<string, string>

export const defaultStyle: Readonly<StyleMap> = {
  display: 'block',
  position: 'static',
  overflow: 'auto',
  overflowX: 'auto',
  direction: 'ltr',
  writingMode: 'horizontal-tb',
  scrollPaddingTop: 'auto',
  scrollPaddingBottom: 'auto',
  scrollPaddingLeft: 'auto',
  scrollPaddingRight: 'auto',
  fontSize: '16px',
  transform: 'none',
  perspective: 'none',
  willChange: 'auto',
  filter: 'none',
  backdropFilter: 'none',
}

type ObserverCallback = (records: unknown[], observer: FakeObserver) => void

export const frames: FrameRequestCallback[] = []
export const observers: FakeObserver[] = []

/** Runs queued animation frames, including frames queued by those callbacks, up to `limit` rounds. */
export function flushFrames(limit = 10): void {
  for (let round = 0; round < limit && frames.length; round++) {
    for (const callback of frames.splice(0)) callback(0)
  }
}

export class FakeObserver {
  callback: ObserverCallback
  targets: unknown[] = []
  disconnected = false
  constructor(callback: ObserverCallback) {
    this.callback = callback
    observers.push(this)
  }
  observe(target: unknown): void {
    this.targets.push(target)
  }
  disconnect(): void {
    this.disconnected = true
  }
  trigger(records: unknown[] = []): void {
    this.callback(records, this)
  }
}

export function observersOf(target: unknown): FakeObserver[] {
  return observers.filter((observer) => observer.targets.includes(target))
}

export class FakeEffect {
  timing: EffectTiming
  keyframes: ComputedKeyframe[] = []
  target: unknown = null
  animation: FakeAnimation | null = null
  constructor(timing: OptionalEffectTiming = {}) {
    this.timing = {
      delay: 0,
      endDelay: 0,
      iterations: 1,
      iterationStart: 0,
      duration: 'auto',
      fill: 'auto',
      direction: 'normal',
      easing: 'linear',
      ...timing,
    }
  }
  getTiming(): EffectTiming {
    return { ...this.timing }
  }
  updateTiming(timing: OptionalEffectTiming = {}): void {
    Object.assign(this.timing, timing)
  }
  getComputedTiming(): ComputedEffectTiming {
    const duration = typeof this.timing.duration === 'number' ? this.timing.duration : 0
    const activeDuration = duration * (this.timing.iterations ?? 1)
    return {
      ...this.timing,
      duration,
      activeDuration,
      endTime: (this.timing.delay ?? 0) + activeDuration + (this.timing.endDelay ?? 0),
      localTime: this.animation?.currentTime ?? null,
      progress: null,
      currentIteration: null,
    }
  }
  getKeyframes(): ComputedKeyframe[] {
    return this.keyframes.map((keyframe) => ({ ...keyframe }))
  }
  setKeyframes(keyframes: ComputedKeyframe[]): void {
    this.keyframes = keyframes
  }
}

export const documentTimeline = { currentTime: 0 }

/** Records calls and mirrors the small part of native Animation state the proxy reads. */
export class FakeAnimation extends EventTarget {
  effect: FakeEffect | null
  timeline: unknown
  id = ''
  animationName = ''
  playbackRate = 1
  playState: AnimationPlayState = 'idle'
  currentTime: number | null = null
  startTime: number | null = null
  pending = false
  replaceState: AnimationReplaceState = 'active'
  rangeStart: unknown = 'normal'
  rangeEnd: unknown = 'normal'
  onfinish: unknown = null
  oncancel: unknown = null
  onremove: unknown = null
  ready: Promise<FakeAnimation> = Promise.resolve(this)
  finished: Promise<FakeAnimation> = Promise.resolve(this)
  calls: string[] = []
  constructor(effect: FakeEffect | null = null, timeline: unknown = documentTimeline) {
    super()
    this.effect = effect
    if (effect) effect.animation = this
    this.timeline = timeline
  }
  play(): void {
    this.calls.push('play')
    this.playState = 'running'
    this.currentTime ??= 0
  }
  pause(): void {
    this.calls.push('pause')
    this.playState = 'paused'
  }
  cancel(): void {
    this.calls.push('cancel')
    this.playState = 'idle'
    this.currentTime = null
    this.startTime = null
  }
  finish(): void {
    this.calls.push('finish')
    this.playState = 'finished'
  }
  reverse(): void {
    this.calls.push('reverse')
    this.playbackRate = -this.playbackRate
  }
  updatePlaybackRate(rate: number): void {
    this.calls.push('updatePlaybackRate')
    this.playbackRate = rate
  }
  commitStyles(): void {
    this.calls.push('commitStyles')
  }
  persist(): void {
    this.calls.push('persist')
    this.replaceState = 'persisted'
  }
}

export class FakeElement extends EventTarget {
  isConnected = true
  scrollTop = 0
  scrollLeft = 0
  scrollWidth = 0
  scrollHeight = 0
  clientWidth = 0
  clientHeight = 0
  clientTop = 0
  clientLeft = 0
  offsetTop = 0
  offsetLeft = 0
  offsetWidth = 0
  offsetHeight = 0
  offsetParent: FakeElement | null = null
  parentElement: FakeElement | null = null
  previousElementSibling: FakeElement | null = null
  children: FakeElement[] = []
  selectors: string[] = []
  style: StyleMap = {}
  animations: FakeAnimation[] = []
  keyframeCalls: { keyframes: unknown; options: unknown }[] = []
  getAnimations(_options?: GetAnimationsOptions): FakeAnimation[] {
    return [...this.animations]
  }
  animate(keyframes: unknown, options?: number | KeyframeAnimationOptions): FakeAnimation {
    this.keyframeCalls.push({ keyframes, options })
    const timing = typeof options === 'number' ? { duration: options } : { ...options }
    const animation = new FakeAnimation(
      new FakeEffect(timing as OptionalEffectTiming),
      timing.timeline === undefined ? documentTimeline : timing.timeline,
    )
    animation.play()
    this.animations.push(animation)
    fakeDocument().animations.push(animation)
    return animation
  }
  matches(selector: string): boolean {
    return this.selectors.includes(selector)
  }
}

/** A fake typed as a real element so it can be handed to the code under test without casts. */
export type StubElement = FakeElement & HTMLElement

export function createElement(init: Partial<FakeElement> = {}): StubElement {
  return Object.assign(new FakeElement(), init) as unknown as StubElement
}

/** A vertical scroller with 400px of block scroll range. */
export function createScroller(init: Partial<FakeElement> = {}): StubElement {
  return createElement({
    scrollHeight: 500,
    clientHeight: 100,
    scrollWidth: 200,
    clientWidth: 200,
    ...init,
  })
}

/** Scroller at offsetTop 10 containing a 50x80 subject at top 150, left 250. */
export function createViewFixture(): { source: StubElement; subject: StubElement } {
  const body = createElement()
  const source = createScroller({ parentElement: body, offsetParent: body, offsetTop: 10 })
  const subject = createElement({
    parentElement: source,
    offsetParent: source,
    offsetTop: 150,
    offsetLeft: 250,
    offsetWidth: 50,
    offsetHeight: 80,
  })
  const scroller: FakeElement = source
  scroller.children = [subject]
  return { source, subject }
}

export function scrollTo(element: FakeElement, top: number, left = element.scrollLeft): void {
  element.scrollTop = top
  element.scrollLeft = left
  element.dispatchEvent(new Event('scroll'))
}

export class FakeDocument extends EventTarget {
  scrollingElement: StubElement | null = null
  body: StubElement | null = null
  documentElement: StubElement = createElement()
  animations: FakeAnimation[] = []
  getAnimations(): FakeAnimation[] {
    return [...this.animations]
  }
  querySelectorAll(_selector: string): FakeElement[] {
    return []
  }
}

export class FakeWindow extends EventTarget {
  Element = FakeElement
  Animation = FakeAnimation
}

export function fakeDocument(): FakeDocument {
  return document as unknown as FakeDocument
}

export function fakeWindow(): FakeWindow {
  return window as unknown as FakeWindow
}

export function computedStyle(element: Element): CSSStyleDeclaration {
  const values: StyleMap = { ...defaultStyle, ...(element instanceof FakeElement && element.style) }
  const style = { ...values, getPropertyValue: (name: string) => values[name] ?? '' }
  return style as unknown as CSSStyleDeclaration
}

/** Installs fresh DOM globals; the element and animation classes keep their identity across calls. */
export function installDom(): { document: FakeDocument; window: FakeWindow } {
  frames.length = 0
  observers.length = 0
  const document = new FakeDocument()
  const window = new FakeWindow()
  vi.stubGlobal('Element', FakeElement)
  vi.stubGlobal('HTMLElement', FakeElement)
  vi.stubGlobal('Animation', FakeAnimation)
  vi.stubGlobal('KeyframeEffect', FakeEffect)
  vi.stubGlobal('document', document)
  vi.stubGlobal('window', window)
  vi.stubGlobal('getComputedStyle', computedStyle)
  vi.stubGlobal('ResizeObserver', FakeObserver)
  vi.stubGlobal('MutationObserver', FakeObserver)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback))
  return { document, window }
}
