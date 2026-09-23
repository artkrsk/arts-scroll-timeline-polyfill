import { NATIVE_SUPPORT_QUERIES } from './constants.js'
export function hasNativeSupport(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    typeof globalThis.ScrollTimeline === 'function' &&
    typeof globalThis.ViewTimeline === 'function' &&
    NATIVE_SUPPORT_QUERIES.every((query) => CSS.supports(query))
  )
}
export function hasPolyfillPrerequisites(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    typeof Animation === 'function' &&
    typeof KeyframeEffect === 'function' &&
    typeof Element.prototype.animate === 'function' &&
    typeof Element.prototype.getAnimations === 'function' &&
    typeof document.getAnimations === 'function' &&
    typeof WeakRef === 'function' &&
    typeof ResizeObserver === 'function' &&
    typeof MutationObserver === 'function' &&
    typeof requestAnimationFrame === 'function' &&
    typeof queueMicrotask === 'function' &&
    typeof fetch === 'function' &&
    typeof URL.createObjectURL === 'function'
  )
}
