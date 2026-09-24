import { beforeEach, describe, expect, it, vi } from 'vitest'

// proxy-animation.ts captures the native Animation and getAnimations entry points on load.
await vi.hoisted(async () => {
  const { installDom } = await import('./helpers/dom-stubs.js')
  installDom()
})

import { numeric } from '../../src/ts/platform/numeric-api.js'
import type { PolyfillAnimationOptions, PolyfillRangeInput } from '../../src/ts/public/index.js'
import {
  animate,
  documentGetAnimations,
  elementGetAnimations,
  getProxyDetails,
  getProxyForNativeAnimation,
  installAnimationLifecycle,
  PromiseWrapper,
  ProxyAnimation,
  parseAnimationRange,
} from '../../src/ts/upstream/proxy-animation.js'
import { installCSSOM } from '../../src/ts/upstream/proxy-cssom.js'
import { ScrollTimeline, ViewTimeline } from '../../src/ts/upstream/scroll-timeline-base.js'
import {
  createElement,
  createScroller,
  createViewFixture,
  documentTimeline,
  FakeAnimation,
  FakeEffect,
  fakeDocument,
  fakeWindow,
  flushFrames,
  installDom,
  type StubElement,
  scrollTo,
} from './helpers/dom-stubs.js'

installCSSOM()
const css = numeric.CSS

beforeEach(() => {
  installDom()
})

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0))
async function settle(): Promise<void> {
  await nextTask()
  flushFrames()
  await nextTask()
}
function thrown(action: () => unknown): unknown {
  try {
    action()
  } catch (error) {
    return error
  }
  throw new Error('Expected an exception')
}
function nativeOf(proxy: ProxyAnimation): FakeAnimation {
  return getProxyDetails(proxy).animation as unknown as FakeAnimation
}
function asEffect(effect: FakeEffect): AnimationEffect {
  return effect as unknown as AnimationEffect
}
function asNative(animation: FakeAnimation): Animation {
  return animation as unknown as Animation
}

interface ScrollSetup {
  source: StubElement
  timeline: ScrollTimeline
  proxy: ProxyAnimation
  native: FakeAnimation
  effect: FakeEffect
}
function scrollAnimation(timing: OptionalEffectTiming = {}, scrollTop = 50): ScrollSetup {
  const source = createScroller({ scrollTop })
  const timeline = new ScrollTimeline({ source })
  const effect = new FakeEffect(timing)
  const proxy = new ProxyAnimation(asEffect(effect), timeline)
  return { source, timeline, proxy, native: nativeOf(proxy), effect }
}
async function playing(timing: OptionalEffectTiming = {}): Promise<ScrollSetup> {
  const setup = scrollAnimation(timing)
  setup.proxy.play()
  await settle()
  return setup
}
function viewTimeline(): { source: StubElement; timeline: ViewTimeline } {
  const { source, subject } = createViewFixture()
  return { source, timeline: new ViewTimeline({ subject }) }
}

describe('PromiseWrapper', () => {
  it('tracks resolution', async () => {
    const wrapper = new PromiseWrapper<number>()
    expect(wrapper.state).toBe('pending')
    wrapper.resolve(1)
    expect(wrapper.state).toBe('resolved')
    await expect(wrapper.promise).resolves.toBe(1)
  })
  it('tracks rejection without an unhandled rejection', async () => {
    const wrapper = new PromiseWrapper<number>()
    const reason = new Error('nope')
    wrapper.reject(reason)
    expect(wrapper.state).toBe('rejected')
    await expect(wrapper.promise).rejects.toBe(reason)
  })
})

describe('parseAnimationRange', () => {
  it('defaults to normal', () => {
    const timeline = new ScrollTimeline({ source: null })
    expect(parseAnimationRange(timeline)).toEqual({ start: 'normal', end: 'normal' })
    expect(parseAnimationRange(timeline, '')).toEqual({ start: 'normal', end: 'normal' })
  })
  it('parses offset pairs for scroll timelines', () => {
    const range = parseAnimationRange(new ScrollTimeline({ source: null }), '10% 90%')
    expect(String(range.start)).toBe('10%')
    expect(String(range.end)).toBe('90%')
    expect(() => parseAnimationRange(new ScrollTimeline({ source: null }), '10%')).toThrow(
      TypeError,
    )
  })
  it.each([
    ['entry 10% exit 90%', 'entry', '10%', 'exit', '90%'],
    ['contain', 'contain', '0%', 'contain', '100%'],
    ['entry exit', 'entry', '0%', 'exit', '100%'],
    ['10% 90%', 'cover', '10%', 'cover', '90%'],
  ])('parses %s for view timelines', (value, startName, startOffset, endName, endOffset) => {
    const range = parseAnimationRange(viewTimeline().timeline, value)
    expect(range.start).toMatchObject({ rangeName: startName })
    expect(range.end).toMatchObject({ rangeName: endName })
    expect(range.start !== 'normal' && 'offset' in range.start && String(range.start.offset)).toBe(
      startOffset,
    )
    expect(range.end !== 'normal' && 'offset' in range.end && String(range.end.offset)).toBe(
      endOffset,
    )
  })
  it.each(['entry 10%', 'entry exit cover', '1% 2% 3%'])('rejects %s', (value) => {
    expect(() => parseAnimationRange(viewTimeline().timeline, value)).toThrow(TypeError)
  })
  it('rejects unknown timeline classes', () => {
    expect(() => parseAnimationRange({} as ScrollTimeline, '1% 2%')).toThrow(
      'Unsupported timeline class',
    )
  })
})

describe('ProxyAnimation on a document timeline', () => {
  function documentAnimation(): { proxy: ProxyAnimation; native: FakeAnimation } {
    const proxy = new ProxyAnimation(asEffect(new FakeEffect({ duration: 1000 })))
    return { proxy, native: nativeOf(proxy) }
  }
  it('delegates state to the native animation', async () => {
    const { proxy, native } = documentAnimation()
    expect(proxy.timeline).toBe(documentTimeline)
    expect(proxy.effect).toBe(native.effect)
    native.startTime = 5
    native.currentTime = 10
    native.pending = true
    expect(proxy.startTime).toBe(5)
    expect(proxy.currentTime).toBe(10)
    expect(proxy.playState).toBe('idle')
    expect(proxy.pending).toBe(true)
    expect(proxy.replaceState).toBe('active')
    expect(proxy.rangeStart).toBe('normal')
    expect(proxy.rangeEnd).toBe('normal')
    await expect(proxy.ready).resolves.toBe(native)
    await expect(proxy.finished).resolves.toBe(native)
  })
  it.each(['play', 'pause', 'cancel', 'finish', 'reverse', 'commitStyles', 'persist'] as const)(
    'delegates %s',
    (method) => {
      const { proxy, native } = documentAnimation()
      proxy[method]()
      expect(native.calls).toEqual([method])
    },
  )
  it('delegates writes', () => {
    const { proxy, native } = documentAnimation()
    const effect = new FakeEffect()
    const handler = () => {}
    proxy.currentTime = 500
    proxy.startTime = 100
    proxy.playbackRate = 3
    proxy.rangeStart = 'contain'
    proxy.rangeEnd = 'exit'
    proxy.effect = asEffect(effect)
    proxy.id = 'fade'
    proxy.onfinish = handler
    proxy.oncancel = handler
    proxy.onremove = handler
    proxy.updatePlaybackRate(2)
    expect(native).toMatchObject({
      currentTime: 500,
      startTime: 100,
      rangeStart: 'contain',
      rangeEnd: 'exit',
      effect,
      id: 'fade',
      onfinish: handler,
      oncancel: handler,
      onremove: handler,
      playbackRate: 2,
    })
    expect(proxy.id).toBe('fade')
    expect(proxy.playbackRate).toBe(2)
    expect([proxy.onfinish, proxy.oncancel, proxy.onremove]).toEqual([handler, handler, handler])
  })
  it('converts time values to milliseconds', () => {
    const { proxy, native } = documentAnimation()
    proxy.currentTime = css.s(1)
    expect(native.currentTime).toBe(1000)
    proxy.currentTime = null
    expect(native.currentTime).toBeNull()
    const sum = new numeric.CSSMathSum(css.ms(1), css.ms(2))
    expect(thrown(() => (proxy.currentTime = sum))).toMatchObject({ name: 'InvalidStateError' })
  })
  it('reverses through the native animation', () => {
    const { proxy, native } = documentAnimation()
    proxy.reverse()
    expect(native.playbackRate).toBe(-1)
    const stopped = documentAnimation()
    stopped.native.playbackRate = 0
    stopped.proxy.reverse()
    expect([native.calls, stopped.native.calls]).toEqual([['reverse'], ['reverse']])
  })
  it('forwards event listeners', () => {
    const { proxy } = documentAnimation()
    const listener = vi.fn()
    proxy.addEventListener('cancel', null)
    proxy.addEventListener('cancel', listener)
    expect(proxy.dispatchEvent(new Event('cancel'))).toBe(true)
    proxy.removeEventListener('cancel', null)
    proxy.removeEventListener('cancel', listener)
    proxy.dispatchEvent(new Event('cancel'))
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('ProxyAnimation on a scroll timeline', () => {
  it('starts idle with a proxied effect', async () => {
    const { proxy, native, timeline } = scrollAnimation()
    expect(proxy.timeline).toBe(timeline)
    expect(proxy.playState).toBe('idle')
    expect(proxy.currentTime).toBeNull()
    expect(proxy.startTime).toBeNull()
    expect(proxy.pending).toBe(false)
    expect(proxy.effect).not.toBe(native.effect)
    await expect(proxy.ready).resolves.toBe(proxy)
  })
  it('plays in sync with the scroll position', async () => {
    const { proxy, native, source } = scrollAnimation()
    proxy.play()
    expect(proxy.pending).toBe(true)
    expect(proxy.playState).toBe('running')
    const ready = proxy.ready
    await settle()
    await expect(ready).resolves.toBe(proxy)
    expect(proxy.pending).toBe(false)
    expect(String(proxy.startTime)).toBe('0%')
    expect(String(proxy.currentTime)).toBe('12.5%')
    expect(native.currentTime).toBe(12500)
    scrollTo(source, 200)
    expect(String(proxy.currentTime)).toBe('50%')
    expect(native.currentTime).toBe(50000)
  })
  it('finishes at the end of the scroll range and resumes when scrolling back', async () => {
    const { proxy, native, source } = await playing()
    const listener = vi.fn()
    proxy.addEventListener('finish', listener)
    scrollTo(source, 400)
    expect(proxy.playState).toBe('finished')
    expect(native.currentTime).toBeCloseTo(99999.999)
    const finished = proxy.finished
    await expect(finished).resolves.toBe(proxy)
    await settle()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.lastCall?.[0]).toMatchObject({
      currentTime: css.percent(100),
      timelineTime: css.percent(100),
    })
    scrollTo(source, 200)
    expect(proxy.playState).toBe('running')
    expect(String(proxy.currentTime)).toBe('50%')
    expect(proxy.finished).not.toBe(finished)
  })
  it('pauses at the current scroll position', async () => {
    const { proxy, native, source } = await playing()
    proxy.pause()
    expect(proxy.playState).toBe('paused')
    expect(proxy.pending).toBe(true)
    await settle()
    expect(proxy.pending).toBe(false)
    scrollTo(source, 200)
    expect(String(proxy.currentTime)).toBe('12.5%')
    expect(native.playState).toBe('paused')
    proxy.pause()
    expect(proxy.pending).toBe(false)
  })
  it('aligns a paused idle animation with the scroll position', async () => {
    const { proxy } = scrollAnimation()
    proxy.pause()
    await settle()
    expect(proxy.playState).toBe('paused')
    expect(String(proxy.currentTime)).toBe('12.5%')
  })
  it.each(['play', 'pause'] as const)(
    'keeps a pending %s until the timeline becomes active',
    async (method) => {
      const { proxy, source } = scrollAnimation()
      proxy[method]()
      await nextTask()
      source.style.overflow = 'visible'
      flushFrames()
      expect(proxy.pending).toBe(true)
      proxy.rangeStart = '0%'
      source.style.overflow = 'auto'
      scrollTo(source, 100)
      flushFrames()
      expect(proxy.pending).toBe(false)
      expect(String(proxy.currentTime)).toBe('25%')
    },
  )
  it('keeps the ready promise when pausing a pending play', async () => {
    const { proxy } = scrollAnimation()
    proxy.play()
    const ready = proxy.ready
    proxy.pause()
    expect(proxy.ready).toBe(ready)
    await settle()
    await expect(ready).resolves.toBe(proxy)
    expect(proxy.playState).toBe('paused')
  })
  it('resumes a paused animation before its pause commits', async () => {
    const { proxy, source } = await playing()
    proxy.pause()
    proxy.play()
    await settle()
    scrollTo(source, 200)
    expect(proxy.playState).toBe('running')
    expect(String(proxy.currentTime)).toBe('50%')
  })
  it('seeks an idle animation to a paused hold time', () => {
    const { proxy, native } = scrollAnimation()
    proxy.currentTime = css.percent(25)
    expect(proxy.playState).toBe('paused')
    expect(String(proxy.currentTime)).toBe('25%')
    expect(native.currentTime).toBe(25000)
  })
  it('resumes from a seeked hold time', async () => {
    const { proxy, source } = await playing()
    proxy.pause()
    await settle()
    proxy.currentTime = css.percent(25)
    proxy.play()
    await settle()
    expect(String(proxy.currentTime)).toBe('25%')
    scrollTo(source, 200)
    expect(String(proxy.currentTime)).toBe('62.5%')
    proxy.play()
    expect(proxy.pending).toBe(false)
  })
  it('updates other animations when a seeked animation resumes before its play commits', async () => {
    const { proxy, native, source, timeline } = await playing()
    const sibling = new ProxyAnimation(asEffect(new FakeEffect()), timeline)
    sibling.play()
    await settle()
    proxy.pause()
    await settle()
    proxy.currentTime = css.percent(25)
    proxy.play()
    scrollTo(source, 200)
    expect(String(sibling.currentTime)).toBe('50%')
    expect(native.currentTime).toBe(25000)
  })
  it('seeks a running animation by moving its start time', async () => {
    const { proxy, source } = await playing()
    proxy.currentTime = css.percent(50)
    expect(String(proxy.startTime)).toBe('-37.5%')
    scrollTo(source, 200)
    expect(String(proxy.currentTime)).toBe('87.5%')
  })
  it('resumes a finished animation from a seek time', async () => {
    const { proxy, source } = await playing()
    scrollTo(source, 400)
    expect(proxy.playState).toBe('finished')
    proxy.currentTime = css.percent(50)
    expect(proxy.playState).toBe('running')
    expect(String(proxy.startTime)).toBe('50%')
    scrollTo(source, 300)
    expect(String(proxy.currentTime)).toBe('25%')
  })
  it('keeps a reversed seek before the start as finished', async () => {
    const { proxy } = await playing()
    proxy.playbackRate = -1
    proxy.currentTime = css.percent(-10)
    expect(proxy.playState).toBe('finished')
    expect(String(proxy.currentTime)).toBe('-10%')
  })
  it('completes a pending pause when seeking', async () => {
    const { proxy } = await playing()
    proxy.pause()
    proxy.currentTime = css.percent(40)
    expect(proxy.pending).toBe(false)
    expect(proxy.playState).toBe('paused')
    expect(String(proxy.currentTime)).toBe('40%')
  })
  it('rejects unsupported current times', () => {
    const { proxy } = scrollAnimation()
    proxy.currentTime = null
    expect(proxy.currentTime).toBeNull()
    expect(thrown(() => (proxy.currentTime = css.px(5)))).toMatchObject({
      name: 'NotSupportedError',
    })
    proxy.currentTime = css.percent(10)
    expect(() => (proxy.currentTime = null)).toThrow(TypeError)
  })
  it('keeps seeks on an inactive timeline as hold times', () => {
    const { proxy, source } = scrollAnimation()
    source.style.overflow = 'visible'
    proxy.currentTime = css.percent(30)
    expect(proxy.startTime).toBeNull()
    expect(String(proxy.currentTime)).toBe('30%')
  })
  it('sets the start time', async () => {
    const { proxy } = await playing()
    proxy.startTime = css.percent(10)
    expect(String(proxy.startTime)).toBe('10%')
    expect(String(proxy.currentTime)).toBe('2.5%')
    proxy.startTime = null
    expect(proxy.playState).toBe('paused')
    expect(String(proxy.currentTime)).toBe('2.5%')
  })
  it('resolves a pending play when the start time is set', async () => {
    const { proxy } = scrollAnimation()
    proxy.play()
    const ready = proxy.ready
    proxy.startTime = css.percent(0)
    expect(proxy.pending).toBe(false)
    await expect(ready).resolves.toBe(proxy)
  })
  it('has no current time when setting a start time without timeline time', async () => {
    const { proxy, source } = await playing()
    source.style.overflow = 'visible'
    proxy.startTime = css.percent(0)
    expect(String(proxy.startTime)).toBe('0%')
    expect(proxy.currentTime).toBeNull()
  })
  it('changes the playback rate without jumping', async () => {
    const { proxy, source } = await playing()
    proxy.playbackRate = 2
    expect(proxy.playbackRate).toBe(2)
    expect(String(proxy.currentTime)).toBe('12.5%')
    scrollTo(source, 200)
    expect(String(proxy.currentTime)).toBe('87.5%')
    const idle = scrollAnimation().proxy
    idle.playbackRate = 0.5
    expect(idle.playbackRate).toBe(0.5)
  })
  it('applies a pending playback rate once play commits', async () => {
    const { proxy } = scrollAnimation()
    proxy.play()
    proxy.updatePlaybackRate(2)
    expect(proxy.playbackRate).toBe(1)
    await settle()
    expect(proxy.playbackRate).toBe(2)
    expect(String(proxy.currentTime)).toBe('12.5%')
  })
  it('holds at the ready time when a pending playback rate is zero', async () => {
    const { proxy, native, source } = scrollAnimation()
    proxy.play()
    proxy.updatePlaybackRate(0)
    await settle()
    expect(proxy.playbackRate).toBe(0)
    expect(String(proxy.currentTime)).toBe('12.5%')
    expect(native.currentTime).toBe(12500)
    scrollTo(source, 200)
    expect(proxy.playState).toBe('running')
    expect(String(proxy.currentTime)).toBe('12.5%')
    expect(native.currentTime).toBe(12500)
  })
  it('keeps a seeked hold time on the native animation at zero playback rate', async () => {
    const { proxy, native, source } = await playing()
    proxy.pause()
    await settle()
    proxy.currentTime = css.percent(25)
    proxy.playbackRate = 0
    proxy.play()
    await settle()
    expect(String(proxy.currentTime)).toBe('25%')
    expect(native.currentTime).toBe(25000)
    scrollTo(source, 200)
    expect(native.currentTime).toBe(25000)
  })
  it('updates the playback rate of idle, running and finished animations', async () => {
    const idle = scrollAnimation().proxy
    idle.updatePlaybackRate(0.5)
    expect(idle.playbackRate).toBe(0.5)
    const { proxy, source } = await playing()
    proxy.updatePlaybackRate(3)
    expect(proxy.pending).toBe(true)
    await settle()
    expect(proxy.playbackRate).toBe(3)
    scrollTo(source, 400)
    expect(proxy.playState).toBe('finished')
    proxy.updatePlaybackRate(0.5)
    expect(proxy.playbackRate).toBe(0.5)
    proxy.updatePlaybackRate(0)
    expect(proxy.playbackRate).toBe(0)
  })
  it('plays with a zero playback rate from a zero hold time', async () => {
    const { proxy } = scrollAnimation()
    proxy.playbackRate = 0
    proxy.play()
    await settle()
    expect(proxy.playState).toBe('running')
    expect(String(proxy.currentTime)).toBe('0%')
  })
  it('reverses against the scroll direction', async () => {
    const { proxy, native, source } = await playing()
    proxy.reverse()
    expect(proxy.pending).toBe(true)
    await settle()
    expect(proxy.playbackRate).toBe(-1)
    scrollTo(source, 100)
    expect(String(proxy.currentTime)).toBe('75%')
    scrollTo(source, 0)
    expect(native.currentTime).toBeCloseTo(100000.001)
    scrollTo(source, 400)
    expect(proxy.playState).toBe('finished')
  })
  it('cannot reverse on an inactive timeline', () => {
    const { proxy, source } = scrollAnimation()
    source.style.overflow = 'visible'
    expect(thrown(() => proxy.reverse())).toMatchObject({ name: 'InvalidStateError' })
  })
  it('finishes immediately', async () => {
    const { proxy } = await playing()
    proxy.finish()
    expect(proxy.playState).toBe('finished')
    expect(String(proxy.currentTime)).toBe('100%')
    await expect(proxy.finished).resolves.toBe(proxy)
  })
  it('finishes idle, pending and reversed animations', async () => {
    const idle = scrollAnimation().proxy
    idle.finish()
    expect(String(idle.startTime)).toBe('-87.5%')
    const pendingPlay = scrollAnimation().proxy
    pendingPlay.play()
    pendingPlay.finish()
    expect(pendingPlay.pending).toBe(false)
    const pendingPause = (await playing()).proxy
    pendingPause.pause()
    pendingPause.finish()
    expect(pendingPause.pending).toBe(false)
    expect(pendingPause.playState).toBe('finished')
    const reversed = (await playing()).proxy
    reversed.playbackRate = -1
    reversed.finish()
    expect(String(reversed.currentTime)).toBe('0%')
  })
  it('cannot finish with a zero playback rate', () => {
    const { proxy } = scrollAnimation()
    proxy.playbackRate = 0
    expect(thrown(() => proxy.finish())).toMatchObject({ name: 'InvalidStateError' })
  })
  it('cancels pending tasks and stops tracking the scroll position', async () => {
    const { proxy, native, source } = scrollAnimation()
    proxy.play()
    const ready = proxy.ready
    const finished = proxy.finished
    proxy.cancel()
    await expect(ready).rejects.toMatchObject({ name: 'AbortError' })
    await expect(finished).rejects.toMatchObject({ name: 'AbortError' })
    await expect(proxy.ready).resolves.toBe(proxy)
    expect(proxy.playState).toBe('idle')
    expect(native.calls).toContain('cancel')
    await settle()
    scrollTo(source, 200)
    expect(proxy.currentTime).toBeNull()
    expect(native.currentTime).toBeNull()
    proxy.cancel()
    expect(native.calls.filter((call) => call === 'cancel')).toHaveLength(1)
  })
  it('cancels a running or finished animation', async () => {
    const { proxy, native } = await playing()
    const ready = proxy.ready
    proxy.cancel()
    await expect(ready).resolves.toBe(proxy)
    expect(proxy.playState).toBe('idle')
    expect(native.calls.at(-1)).toBe('cancel')
    const finished = (await playing()).proxy
    finished.finish()
    const done = finished.finished
    finished.cancel()
    await expect(done).resolves.toBe(finished)
    expect(finished.finished).not.toBe(done)
  })
  it('leaves paused animations alone while the timeline is inactive', async () => {
    const { proxy, native, source } = await playing()
    proxy.pause()
    await settle()
    source.style.overflow = 'visible'
    scrollTo(source, 100)
    expect(native.calls).not.toContain('cancel')
  })
  it('cancels the native animation while the timeline is inactive', async () => {
    const { native, source } = await playing()
    source.style.overflow = 'visible'
    scrollTo(source, 100)
    expect(native.calls.at(-1)).toBe('cancel')
  })
})

describe('ProxyAnimation timeline changes', () => {
  it('ignores assigning the current timeline', () => {
    const { proxy, timeline } = scrollAnimation()
    proxy.timeline = timeline
    expect(proxy.playState).toBe('idle')
  })
  it('moves a running document animation onto a scroll timeline', async () => {
    const proxy = new ProxyAnimation(asEffect(new FakeEffect({ duration: 1000 })))
    proxy.play()
    const timeline = new ScrollTimeline({ source: createScroller({ scrollTop: 50 }) })
    proxy.timeline = timeline
    expect(proxy.timeline).toBe(timeline)
    expect(proxy.pending).toBe(true)
    await settle()
    expect(String(proxy.currentTime)).toBe('12.5%')
  })
  it.each<[number | 'auto', number, string]>([
    [1000, 500, '50%'],
    ['auto', 0, '0%'],
  ])('keeps the progress of a paused %s ms animation', (duration, currentTime, expected) => {
    const proxy = new ProxyAnimation(asEffect(new FakeEffect({ duration })))
    Object.assign(nativeOf(proxy), { playState: 'paused', currentTime, pending: true })
    proxy.timeline = new ScrollTimeline({ source: createScroller() })
    expect(proxy.playState).toBe('paused')
    expect(proxy.pending).toBe(true)
    expect(String(proxy.currentTime)).toBe(expected)
  })
  it('keeps a pending play when switching scroll timelines', () => {
    const { proxy } = scrollAnimation()
    proxy.play()
    proxy.timeline = new ScrollTimeline({ source: createScroller() })
    expect(proxy.pending).toBe(true)
    expect(proxy.playState).toBe('running')
  })
  it.each([
    ['running', 'play'],
    ['paused', 'pause'],
  ] as const)('restores a %s animation on its document timeline', async (state, call) => {
    const { proxy, native } = await playing({ duration: 1000 })
    if (state === 'paused') {
      proxy.pause()
      await settle()
    }
    native.calls.length = 0
    proxy.timeline = documentTimeline as unknown as AnimationTimeline
    expect(proxy.timeline).toBe(documentTimeline)
    expect(native.currentTime).toBe(125)
    expect(native.calls).toEqual([call])
  })
  it('rejects unsupported timelines', () => {
    const { proxy } = scrollAnimation()
    expect(() => (proxy.timeline = {} as AnimationTimeline)).toThrow(TypeError)
  })
})

describe('ProxyAnimation effect', () => {
  it('reports auto durations while driving the native effect in milliseconds', async () => {
    const { proxy, effect } = scrollAnimation()
    expect(proxy.effect?.getTiming().duration).toBe('auto')
    expect(effect.timing.duration).toBe(100000)
    proxy.play()
    await settle()
    const computed = proxy.effect?.getComputedTiming()
    expect(String(computed?.duration)).toBe('100%')
    expect(String(computed?.endTime)).toBe('100%')
    expect(String(computed?.activeDuration)).toBe('100%')
    expect(String(computed?.localTime)).toBe('12.5%')
  })
  it('preserves specified timing through alignment and range changes', async () => {
    const { proxy, effect } = scrollAnimation({ duration: 'auto', delay: 250, endDelay: 125 })
    expect(proxy.effect?.getTiming()).toMatchObject({ duration: 'auto', delay: 250, endDelay: 125 })
    proxy.play()
    await settle()
    expect(effect.timing).toMatchObject({ duration: 100000, delay: 0, endDelay: 0 })
    expect(proxy.effect?.getTiming()).toMatchObject({ duration: 'auto', delay: 250, endDelay: 125 })
    proxy.rangeEnd = css.percent(75)
    expect(proxy.effect?.getTiming()).toMatchObject({ duration: 'auto', delay: 250, endDelay: 125 })
    proxy.effect?.updateTiming({ duration: 2000, delay: 50 })
    expect(proxy.effect?.getTiming()).toMatchObject({ duration: 2000, delay: 50, endDelay: 125 })
  })
  it.each([
    [2, '50%'],
    [0, '0%'],
  ])('divides the range across %i iterations', (iterations, duration) => {
    const { proxy } = scrollAnimation({ iterations })
    expect(String(proxy.effect?.getComputedTiming().duration)).toBe(duration)
  })
  it('has no local time on an inactive timeline', () => {
    const { proxy, source } = scrollAnimation()
    source.style.overflow = 'visible'
    expect(proxy.effect?.getComputedTiming().localTime).toBeNull()
  })
  it('rejects infinite and non-millisecond timing', () => {
    const { proxy } = scrollAnimation()
    expect(() => proxy.effect?.updateTiming({ duration: Infinity })).toThrow(TypeError)
    expect(() => proxy.effect?.updateTiming({ iterations: Infinity })).toThrow(TypeError)
    expect(() => scrollAnimation({ duration: Infinity }).proxy.effect?.getTiming()).toThrow(
      'Effect duration cannot be Infinity on a scroll timeline',
    )
    expect(() => scrollAnimation({ duration: '1s' }).proxy.effect?.getTiming()).toThrow(
      'Expected native millisecond timing',
    )
    const { proxy: foreign, effect } = scrollAnimation()
    effect.getComputedTiming = () =>
      ({ localTime: css.percent(1) }) as unknown as ComputedEffectTiming
    expect(() => foreign.effect?.getComputedTiming()).toThrow('Expected native millisecond time')
  })
  it('fills in default timing', () => {
    const { proxy, effect } = scrollAnimation()
    effect.getTiming = () => ({})
    effect.getComputedTiming = () => ({})
    expect(proxy.effect?.getTiming()).toEqual({
      duration: 'auto',
      delay: 0,
      endDelay: 0,
      iterations: 1,
      iterationStart: 0,
      fill: 'auto',
      direction: 'normal',
      easing: 'linear',
    })
    expect(effect.timing).toMatchObject({ duration: 100000, delay: 0, endDelay: 0 })
    const computed = proxy.effect?.getComputedTiming()
    expect(String(computed?.endTime)).toBe('0%')
    expect(String(computed?.activeDuration)).toBe('0%')
  })
  it('updates specified timing', () => {
    const { proxy, effect } = scrollAnimation()
    proxy.effect?.updateTiming({ iterations: 2 })
    expect(proxy.effect?.getTiming().iterations).toBe(2)
    proxy.effect?.updateTiming({ duration: 2000 })
    expect(effect.timing.duration).toBe(2000)
    expect(proxy.effect?.getTiming().duration).toBe(2000)
    proxy.effect?.updateTiming()
    expect(proxy.effect?.getTiming().duration).toBe(2000)
  })
  it('passes other members through to the native effect', () => {
    const { proxy, effect } = scrollAnimation()
    const proxied = proxy.effect as unknown as FakeEffect
    effect.keyframes = [{ offset: 0, computedOffset: 0, easing: 'linear', composite: 'auto' }]
    expect(proxied.getKeyframes()).toEqual(effect.keyframes)
    proxied.target = 'target'
    expect(effect.target).toBe('target')
  })
  it('recreates the proxy when the effect changes', () => {
    const { proxy } = scrollAnimation()
    const previous = proxy.effect
    const replacement = new FakeEffect({ iterations: 4 })
    proxy.effect = asEffect(replacement)
    expect(proxy.effect).not.toBe(previous)
    expect(String(proxy.effect?.getComputedTiming().duration)).toBe('25%')
  })
  it('returns native computed timing once detached from the scroll timeline', () => {
    const { proxy, effect } = scrollAnimation({ duration: 1000 })
    const proxied = proxy.effect
    proxy.timeline = documentTimeline as unknown as AnimationTimeline
    expect(proxied?.getComputedTiming().duration).toBe(effect.getComputedTiming().duration)
  })
})

describe('ProxyAnimation ranges', () => {
  const offsetOf = (value: PolyfillRangeInput) =>
    typeof value === 'object' && 'offset' in value ? String(value.offset) : String(value)
  it.each<[PolyfillRangeInput, 'rangeStart' | 'rangeEnd', string, string]>([
    ['entry 20%', 'rangeStart', 'entry', '20%'],
    ['exit', 'rangeStart', 'exit', '0%'],
    ['exit', 'rangeEnd', 'exit', '100%'],
    ['40%', 'rangeEnd', 'cover', '40%'],
    [css.percent(5), 'rangeStart', 'cover', '5%'],
    [{ rangeName: 'contain' }, 'rangeStart', 'contain', '0%'],
    [{ offset: css.percent(30) }, 'rangeEnd', 'cover', '30%'],
  ])('parses view range %o as %s', (value, property, rangeName, offset) => {
    const proxy = new ProxyAnimation(asEffect(new FakeEffect()), viewTimeline().timeline)
    proxy[property] = value
    expect(proxy[property]).toMatchObject({ rangeName })
    expect(offsetOf(proxy[property])).toBe(offset)
  })
  it.each<[PolyfillRangeInput | null, string]>([
    [new numeric.CSSKeywordValue('normal'), 'normal'],
    [null, 'normal'],
  ])('resets %o to normal', (value, expected) => {
    const proxy = new ProxyAnimation(asEffect(new FakeEffect()), viewTimeline().timeline)
    proxy.rangeStart = 'entry'
    proxy.rangeStart = value as PolyfillRangeInput
    expect(proxy.rangeStart).toBe(expected)
  })
  it.each<[PolyfillRangeInput, string]>([
    ['bogus 10%', 'Invalid range name'],
    ['entry 10% 20%', 'Invalid range'],
    [{ rangeName: 'bogus' } as unknown as PolyfillRangeInput, 'Invalid range name'],
  ])('rejects view range %o', (value, message) => {
    const proxy = new ProxyAnimation(asEffect(new FakeEffect()), viewTimeline().timeline)
    expect(() => (proxy.rangeStart = value)).toThrow(new TypeError(message))
  })
  it('accepts only offsets on scroll timelines', () => {
    const { proxy } = scrollAnimation()
    proxy.rangeStart = '25%'
    proxy.rangeEnd = css.percent(75)
    expect(String(proxy.rangeStart)).toBe('25%')
    expect(String(proxy.rangeEnd)).toBe('75%')
    expect(() => (proxy.rangeStart = { rangeName: 'entry' })).toThrow(
      'Named ranges require a view timeline',
    )
    expect(() => (proxy.rangeEnd = {})).toThrow('Invalid range offset')
  })
  it('creates a range for animations constructed without one', () => {
    const { proxy } = scrollAnimation()
    getProxyDetails(proxy).animationRange = null
    proxy.rangeStart = '10%'
    getProxyDetails(proxy).animationRange = null
    proxy.rangeEnd = '90%'
    expect(proxy.rangeStart).toBe('normal')
    expect(String(proxy.rangeEnd)).toBe('90%')
  })
  it('maps a scroll range onto native progress', async () => {
    const { proxy, native, source } = scrollAnimation()
    proxy.rangeStart = '25%'
    proxy.play()
    await settle()
    scrollTo(source, 200)
    expect(native.currentTime).toBeCloseTo(100000 / 3)
  })
  it('maps a named view range onto native progress', async () => {
    const { source, timeline } = viewTimeline()
    const proxy = new ProxyAnimation(asEffect(new FakeEffect()), timeline, {
      'animation-range': 'contain',
    })
    expect(proxy.rangeStart).toMatchObject({ rangeName: 'contain' })
    proxy.play()
    await settle()
    scrollTo(source, 140)
    await settle()
    expect(nativeOf(proxy).currentTime).toBeCloseTo(50000)
  })
  it('spans the cover range of a view timeline by default', async () => {
    const { source, timeline } = viewTimeline()
    const proxy = new ProxyAnimation(asEffect(new FakeEffect()), timeline)
    proxy.play()
    await settle()
    scrollTo(source, 140)
    await settle()
    expect(nativeOf(proxy).currentTime).toBeCloseTo(50000)
  })
  it('falls back to the normal range when an offset cannot be resolved', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { proxy } = await playing()
    proxy.rangeStart = css.em(1)
    proxy.rangeEnd = css.em(1)
    expect(proxy.rangeStart).toBe('normal')
    expect(proxy.rangeEnd).toBe('normal')
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })
})

describe('animate and getAnimations', () => {
  it('plays scroll-driven animations through a proxy', async () => {
    const element = createElement()
    const timeline = new ScrollTimeline({ source: createScroller({ scrollTop: 50 }) })
    const options: PolyfillAnimationOptions = {
      timeline,
      rangeStart: '10%',
      rangeEnd: '90%',
      duration: 'auto',
    }
    const proxy = animate.call(element, [{ opacity: 0 }], options)
    const native = nativeOf(proxy)
    expect(element.keyframeCalls[0]?.options).toEqual({ duration: 'auto' })
    expect(native.calls).toEqual(['play', 'pause'])
    expect(proxy.timeline).toBe(timeline)
    expect(String(proxy.rangeStart)).toBe('10%')
    expect(proxy.pending).toBe(true)
    await settle()
    expect(String(proxy.currentTime)).toBe('2.5%')
    expect(native.currentTime).toBeCloseTo(3125)
    expect(getProxyForNativeAnimation(asNative(native))).toBe(proxy)
  })
  it.each<[string, number | PolyfillAnimationOptions, unknown]>([
    ['a duration', 500, { duration: 500 }],
    ['a native timeline', { timeline: documentTimeline as unknown as AnimationTimeline }, null],
    ['a null timeline', { timeline: null }, { timeline: null }],
  ])('passes %s to the native animate', (_name, options, expected) => {
    const element = createElement()
    const proxy = animate.call(element, null, options)
    expect(proxy.timeline).toBe(nativeOf(proxy).timeline)
    expect(element.keyframeCalls[0]?.options).toEqual(expected ?? options)
  })
  it('swaps native animations for their proxies', () => {
    const element = createElement()
    const proxy = animate.call(element, null, 100)
    const unproxied = new FakeAnimation()
    element.animations.push(unproxied)
    fakeDocument().animations.push(unproxied)
    expect(elementGetAnimations.call(element)).toEqual([proxy, unproxied])
    expect(documentGetAnimations.call(document)).toEqual([proxy, unproxied])
    expect(getProxyForNativeAnimation(asNative(unproxied))).toBeUndefined()
  })
  it('rejects unregistered proxies', () => {
    const proxy = Object.create(ProxyAnimation.prototype) as ProxyAnimation
    expect(() => proxy.playState).toThrow('Unregistered animation proxy')
  })
})

describe('installAnimationLifecycle', () => {
  const pageEvent = (type: string, persisted: boolean) =>
    Object.assign(new Event(type), { persisted })
  it('re-measures scroll sources when a page is restored', async () => {
    installAnimationLifecycle()
    const source = createScroller({ scrollTop: 50 })
    const timeline = new ScrollTimeline({ source })
    const proxy = animate.call(createElement(), null, { timeline })
    fakeDocument().animations.push(nativeOf(new ProxyAnimation(asEffect(new FakeEffect()))))
    await settle()
    source.scrollTop = 200
    fakeWindow().dispatchEvent(pageEvent('pageshow', false))
    await nextTask()
    expect(String(proxy.currentTime)).toBe('12.5%')
    fakeWindow().dispatchEvent(pageEvent('pageshow', true))
    await nextTask()
    expect(String(proxy.currentTime)).toBe('50%')
  })
  it('forgets proxies when a page is unloaded', async () => {
    installAnimationLifecycle()
    const { proxy, native, source } = await playing()
    fakeWindow().dispatchEvent(pageEvent('pagehide', true))
    expect(proxy.playState).toBe('running')
    fakeWindow().dispatchEvent(pageEvent('pagehide', false))
    expect(() => proxy.playState).toThrow('Unregistered animation proxy')
    scrollTo(source, 200)
    expect(native.currentTime).toBe(12500)
  })
})
