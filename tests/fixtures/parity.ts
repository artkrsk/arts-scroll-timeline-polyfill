import { hasNativeSupport } from '../../src/ts/platform/support.js'
import { required } from '../../src/ts/platform/assertions.js'
import { element, loadScript, polyfillURL } from './helpers.js'
const native = hasNativeSupport()
const errors: string[] = []
window.addEventListener('error', (event) => errors.push(event.message))
window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason)))
const authoredStyles = element('#fixture-css', HTMLStyleElement).textContent ?? ''
const optedOutLink = document.createElement('link')
optedOutLink.id = 'opted-out-link'
optedOutLink.rel = 'stylesheet'
optedOutLink.dataset.aphrodite = ''
optedOutLink.href = 'opted-out.css'
document.head.appendChild(optedOutLink)
await loadScript(polyfillURL)

async function runFixture(): Promise<void> {
  const result = { native, complete: false, passed: [] as string[], failed: [] as string[], errors }
  window.__artsParityFixture = result
  const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  const settle = async () => {
    for (let index = 0; index < 8; index++) await frame()
  }
  const check = (condition: boolean, label: string) =>
    (condition ? result.passed : result.failed).push(label)
  const css = element('#fixture-css', HTMLElement)
  const original = css.textContent
  const scroller = element('#scroller', HTMLElement)
  const longhand = element('#longhand', HTMLElement)
  const proxy = (): Animation => required(longhand.getAnimations()[0])
  const isView = (animation: Animation | undefined): boolean =>
    animation?.timeline instanceof ViewTimeline
  const viewSubject = (animation: Animation): Element | null =>
    animation.timeline instanceof ViewTimeline ? animation.timeline.subject : null
  try {
    scroller.scrollTop = 300
    await settle()
    for (const id of ['longhand', 'shorthand', 'omitted', 'explicit', 'list']) {
      const animations = element(`#${id}`, HTMLElement).getAnimations()
      check(
        animations.length === (id === 'list' ? 2 : 1) && animations.every(isView),
        `${id}: all animations bound`,
      )
    }
    check(getComputedStyle(longhand).animationFillMode === 'none', 'Explicit fill:none preserved')
    check(
      getComputedStyle(element('#explicit', HTMLElement)).animationDuration === '2s',
      'Explicit 2s duration preserved',
    )
    for (let index = 0; index < 2; index++) {
      css.textContent = authoredStyles
      await settle()
      check(
        longhand.getAnimations().length === 1 &&
          isView(proxy()) &&
          element('#shorthand', HTMLElement).getAnimations().some(isView) &&
          (native || getComputedStyle(longhand).animationDuration === '1s'),
        `Identical authored HMR ${index + 1}: normalization and binding survive`,
      )
    }
    const first = proxy()
    const opacity = parseFloat(getComputedStyle(longhand).opacity)
    check(
      Math.abs(opacity - 300 / 860) < 0.015,
      'Subject inset fallback list produces expected cover progress',
    )
    document.body.style.setProperty('--offset', '80px')
    await settle()
    check(
      Math.abs(parseFloat(getComputedStyle(longhand).opacity) - 300 / 820) < 0.015,
      'Inherited variable change refreshes inset without resizing subject',
    )
    document.body.style.setProperty('--offset', 'var(--missing, 60px)')
    await settle()
    check(
      Math.abs(parseFloat(getComputedStyle(longhand).opacity) - 300 / 840) < 0.015,
      'Nested variable fallback resolves',
    )
    const ranged = original.replace(/animation-range: cover/g, 'animation-range: contain')
    for (let index = 0; index < 3; index++) {
      css.textContent = ranged
      await settle()
      check(
        longhand.getAnimations().length === 1 && isView(proxy()),
        `HMR ${index + 1}: one bound animation`,
      )
      check(proxy() === first, `HMR ${index + 1}: existing animation/proxy reused`)
      check(
        Math.abs(parseFloat(getComputedStyle(longhand).opacity) - 60 / 360) < 0.015,
        `HMR ${index + 1}: unchanged name receives new range`,
      )
      css.textContent = original
      await settle()
    }
    css.textContent = original.replace(
      'from { opacity: 0; } to { opacity: 1; }',
      'from { opacity: .2; } to { opacity: .8; }',
    )
    await settle()
    check(
      proxy() === first &&
        Math.abs(parseFloat(getComputedStyle(longhand).opacity) - (0.2 + (0.6 * 300) / 840)) <
          0.015,
      'Keyframes replacement updates existing proxy effect',
    )
    css.textContent = original.replace(/--fixture\b/g, '--renamed')
    await settle()
    check(
      proxy() === first &&
        isView(proxy()) &&
        Math.abs(parseFloat(getComputedStyle(longhand).opacity) - 300 / 840) < 0.015,
      'Timeline-name replacement rebinds unchanged animation name',
    )
    css.textContent = original
    await settle()
    const subject = element('#subject', HTMLElement)
    const nextSibling = longhand.nextSibling
    const alternate = document.createElement('div')
    alternate.id = 'alternate-subject'
    const alternateStyle = document.createElement('style')
    alternateStyle.textContent =
      '#alternate-subject { block-size: 600px; view-timeline: --fixture block; view-timeline-inset: var(--offset, 0px) 0px; }'
    document.head.append(alternateStyle)
    scroller.insertBefore(alternate, subject)
    alternate.append(longhand)
    scroller.scrollTop = 300
    await settle()
    check(
      isView(proxy()) && viewSubject(proxy()) === alternate,
      'Moving animated element rebinds its new timeline subject',
    )
    subject.insertBefore(longhand, nextSibling)
    alternate.remove()
    alternateStyle.remove()
    scroller.scrollTop = 300
    await settle()
    check(
      isView(proxy()) && viewSubject(proxy()) === subject,
      'Moving element back releases the temporary timeline',
    )
    const injected = document.createElement('div')
    injected.innerHTML =
      '<style>#injected-auto { animation: fixture-fade auto linear; animation-timeline: --fixture; animation-range: cover; } #injected-mixed { animation: fixture-fade auto linear both, fixture-move 2s linear both; animation-timeline: --fixture, auto; animation-range: cover; }</style><div id="injected-auto">AJAX auto/no fill</div><div id="injected-mixed">mixed timelines</div>'
    subject.append(injected)
    await settle()
    const dynamicAnimations = element('#injected-auto', HTMLElement).getAnimations()
    check(
      dynamicAnimations.length === 1 && isView(dynamicAnimations[0]),
      'Dynamically injected auto/no-fill animation binds on first appearance',
    )
    const mixed = element('#injected-mixed', HTMLElement)
    const mixedAnimations = mixed.getAnimations()
    check(
      mixedAnimations.length === 2 &&
        mixedAnimations.filter(isView).length === 1 &&
        getComputedStyle(mixed).animationDuration.split(',')[1]?.trim() === '2s',
      'Mixed animation list preserves the explicit time-based slot',
    )
    injected.remove()
    await settle()
    if (!(css.firstChild instanceof Text)) throw new Error('Missing stylesheet text')
    css.firstChild.data = original.replace('var(--offset, var(--fallback, 0px)) 0px', '0px 0px')
    await settle()
    check(
      Math.abs(parseFloat(getComputedStyle(longhand).opacity) - 1 / 3) < 0.015,
      'Character-data HMR updates subject inset',
    )
    css.textContent = original
    await settle()
    const override = document.createElement('style')
    override.textContent =
      '#longhand { animation-name: fixture-fade; animation-duration: 1s; animation-timeline: --fixture; animation-range: contain; }'
    document.head.append(override)
    await settle()
    css.textContent = `${original}\n/* earlier sheet replaced */`
    await settle()
    check(
      Math.abs(parseFloat(getComputedStyle(longhand).opacity) - 60 / 360) < 0.015,
      'Replacing earlier sheet preserves later sheet precedence',
    )
    override.remove()
    await settle()
    check(
      Math.abs(parseFloat(getComputedStyle(longhand).opacity) - 300 / 840) < 0.015,
      'Removing later sheet restores earlier registration',
    )
    const reset = document.createElement('style')
    reset.textContent = '#longhand { animation: fixture-fade 2s linear both; }'
    document.head.append(reset)
    await settle()
    check(
      longhand.getAnimations().length === 1 &&
        !isView(proxy()) &&
        reset.textContent === '#longhand { animation: fixture-fade 2s linear both; }',
      'Later shorthand resets earlier timeline without rewriting unrelated sheet',
    )
    reset.textContent =
      '#longhand { animation-timeline: --fixture; animation: fixture-fade 2s linear both; }'
    await settle()
    check(
      longhand.getAnimations().length === 1 && !isView(proxy()),
      'Shorthand after timeline resets it within one rule',
    )
    reset.remove()
    await settle()
    check(
      longhand.getAnimations().length === 1 && isView(proxy()),
      'Removing shorthand reset restores earlier timeline',
    )
    css.textContent = original.replace(/animation-timeline: --fixture(?:, --fixture)?;/g, '')
    await settle()
    check(
      longhand.getAnimations().every((animation) => !isView(animation)),
      'Removing timeline declarations releases old binding',
    )
    css.textContent = original
    await settle()
    check(
      longhand.getAnimations().length === 1 && isView(proxy()),
      'Restoring stylesheet binds without duplicate proxies',
    )
    check(
      element('#opted-out-css', HTMLElement).textContent ===
        '.ignored { animation-timeline: --ignored; }',
      'Opted-out stylesheet remains untouched',
    )
    check(
      element('#opted-out-link', HTMLElement).getAttribute('href') === 'opted-out.css',
      'Opted-out link keeps its original href',
    )
    check(
      element('#hostile-css', HTMLElement).textContent === ' { animation-timeline: --invalid; }',
      'Hostile stylesheet does not abort initialization',
    )
    scroller.scrollTop = 900
    await settle()
    const zeroSubject = element('#zero-subject', HTMLElement)
    check(
      element('#zero-probe', HTMLElement).getAnimations().some(isView),
      'Zero-length contain range still binds',
    )
    zeroSubject.remove()
    scroller.style.blockSize = '301px'
    await settle()
    check(
      result.errors.length === 0,
      'Detached timeline subject and zero-length range cause no browser errors',
    )
    check(result.errors.length === 0, 'No browser errors or unhandled rejections')
  } catch (error) {
    result.failed.push(error instanceof Error ? (error.stack ?? error.message) : String(error))
  }
  result.complete = true
  element('#result', HTMLElement).textContent = JSON.stringify(result, null, 2)
  document.title = result.failed.length
    ? 'FAIL: scroll timeline fixture'
    : 'PASS: scroll timeline fixture'
}

await runFixture()
