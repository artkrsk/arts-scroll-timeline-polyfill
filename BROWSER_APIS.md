# Browser APIs and TypeScript contracts

Research and local verification: **24 September 2026**. This inventory covers the
browser APIs used or installed by this package. The source baseline remains
scroll-timeline-polyfill 1.1.0; migration does not imply full implementation of
all current specifications.

## Browser coverage

The production bundle explicitly targets Chrome/Edge 111, Firefox 114, and
Safari/iOS 16.4, preserving the prior Vite build target. The loader targets
ES2015. Transpilation handles syntax; it does not supply missing runtime APIs.
See [Vite's browser target documentation](https://vite.dev/guide/build).

| Browser family | Native scroll timelines | Typed OM numeric APIs | Verification |
| --- | --- | --- | --- |
| Chrome / Chromium / Edge | Chromium 115 introduced scroll/view timelines; `timeline-scope` followed in 116 | Chromium 66 introduced numeric Typed OM | Chromium 151.0.7922.34: natural native path, forced polyfill with native numerics, and forced numeric shim |
| Firefox | Still experimental; do not assume enabled from its version | Experimental; absent in the tested default configuration | Firefox 153.0: genuine CSS polyfill and numeric shim |
| Safari / WebKit | Safari 26 introduced scroll-driven animations | Safari 16.4 introduced numeric Typed OM | Playwright WebKit 26.5: natural native path and isolated forced polyfill cases |
| Safari on iOS / iPadOS | Safari 26 release family | Safari 16.4 release family | WebKit with an iPhone viewport; physical devices require the smoke procedure below |
| Chrome Android / Android WebView | Depends on the underlying Chromium version | Depends on the underlying Chromium version | Chromium with a Pixel viewport; a device WebView is not exercised |
| Samsung Internet | Depends on its bundled Chromium version and feature enablement | Depends on its bundled Chromium version | Compatibility research; no branded-browser run |

Version evidence: [Chrome introduction](https://developer.chrome.com/articles/scroll-driven-animations),
[Safari 26 release](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/),
[Mozilla experimental features](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features),
[MDN ScrollTimeline compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/ScrollTimeline.json),
[Typed OM compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/CSSNumericValue.json),
and [timeline-scope compatibility data](https://github.com/mdn/browser-compat-data/blob/main/css/properties/timeline-scope.json).

The version targets describe generated syntax, not certification of every
historical release. No user-agent branch controls installation. Tests record
capabilities and engine versions. The five CSS checks and the two timeline
constructors determine native bypass. Forced installation is an integration
test and does not emulate an old browser's CSS engine.

## Timeline and animation APIs

| API / members | Type treatment and actual behavior |
| --- | --- |
| `ScrollTimeline`, options `source` / `axis` | Reuse DOM `ScrollAxis`; source is `Element | null`. Public source/axis are readonly. Internal state and the inherited legacy source setter are separate. |
| `ViewTimeline`, `subject`, `inset`, `startOffset`, `endOffset` | Subject and offsets can be unresolved. Public declarations include `null`; Chromium returned null for an absent/detached subject even where DOM declarations were non-nullable. |
| `currentTime`, `duration`, timeline phase | Scroll values are percentage unit values; inactive time is null. Native document time and backing-animation timing use milliseconds. The polyfill's `phase` / `__polyfill` members remain internal extensions. |
| `Animation` constructor / `Element.animate()` | Optional effect, timeline, numeric duration, omitted options, and option dictionaries are typed separately. Caller options are copied, including frozen dictionaries. |
| `rangeStart` / `rangeEnd` | Standard names, strings, numeric offsets, keyword values, and view-range dictionaries are modelled separately. The installed DOM library declares keyframe range options but omits the corresponding Animation properties; a local adapter supplies them. |
| `Animation.effect`, `AnimationEffect.getTiming/getComputedTiming/updateTiming` | Keep specified and normalized timing distinct. Computed public timing may contain percentage values. The effect proxy preserves the native receiver and forwards other native operations. |
| `KeyframeEffect.target/getKeyframes/setKeyframes` | Narrow native effects before accessing keyframe-only members. A target may be null; ordinary `AnimationEffect` is not assumed to be a keyframe effect. |
| `play/pause/finish/cancel/reverse/updatePlaybackRate` | Pending play/pause tasks, unresolved start/hold times, and ready/finished promises have explicit state types. |
| `ready` / `finished` | The scroll proxy resolves with itself. The existing native-timeline path returns native promises and native Animation values; public promise types describe both. |
| `replaceState/pending/playState/persist/commitStyles` | Replacement state is the native string union. `commitStyles` forwards to the native animation with its receiver. `overallProgress` is not promised by the portable proxy interface. |
| `Element.getAnimations` / `Document.getAnimations` | Capture original methods before patching. Internally retain the distinction between native animations and proxies. |
| `CSSAnimation.animationName`, `animationstart` | Narrow native CSSAnimation instances and Element event targets before binding. |
| EventTarget listeners and dispatch / finish events | Listener options use DOM types; dispatch returns a boolean. The inherited finish-event implementation uses a CustomEvent with typed time getters, so it does not promise native AnimationPlaybackEvent identity. |

References: [Scroll-driven Animations](https://drafts.csswg.org/scroll-animations-1/),
[Web Animations](https://drafts.csswg.org/web-animations-1/),
[Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate).

## CSS Typed OM

The platform adapter describes the common native/shim surface rather than
redeclaring standard globals. A numeric value must have a native numeric shape,
a supported unit shape, or a math-operator shape; an arbitrary object is not a
numeric value. Optional operations on partial math values require checks.

| API | Supplied behavior |
| --- | --- |
| `CSSNumericValue.parse` | Parses the existing numeric/CSS-math grammar and rejects invalid input. It does not install all methods of native CSSNumericValue. |
| `CSSUnitValue` | Numeric value, canonical unit string, stringification, `type`, `to`, and the supported `toSum` subset. |
| `CSSKeywordValue` | Value and stringification; `auto` keyword instances are supported in inset lists. |
| `CSSMathValue` / `CSSMathSum` | Operator, numeric children, and serialization. The shim does not promise the full native arithmetic/type API on sums. |
| `CSSMathProduct` | Children, serialization, type multiplication, and restricted sum conversion. |
| `CSSMathNegate` / `CSSMathInvert` | Unary operand, serialization, and supported type calculation. |
| `CSSMathMin` / `CSSMathMax` | Children and the existing partial simplification implementation. |
| `CSSMathClamp` | Used only when the native constructor exists; the shim does not install it. |
| `CSS.px/percent/number`, length, angle, time, frequency, and resolution factories | Factory names are mapped separately to canonical unit identifiers. `Q`, `Hz`, and `kHz` produce `q`, `hz`, and `khz`. `rem` is correct; `rems` remains a deprecated alias producing `rem`. |
| `CSSNumericType` | DOM dimension keys and percent hints are reused; unit exponents, sum tuples, and expression nodes have explicit internal types. |

Absolute-unit conversions are supported. Percentages and `em` require the
corresponding measurement context. Representing a relative unit does not imply
that every relative length can be resolved to pixels. `toSum` with requested
units, general `add/sub/mul/div/min/max/equals`, and complete Typed OM conformance
remain outside the shim's contract. See [CSS Typed OM](https://drafts.css-houdini.org/css-typed-om-1/).

## DOM, CSS, scheduling, and resource APIs

| APIs used | Contract / compatibility handling |
| --- | --- |
| `CSS.supports(property, value)` and `CSS.supports(condition)` | Preserve both overloads. Native probing happens before installing the compatibility wrapper. Syntax acceptance is not a complete behavioral conformance test. |
| `getComputedStyle`, `CSSStyleDeclaration.getPropertyValue` | Read writing mode, direction, dimensions, scroll padding, animation timing, and inherited custom properties. Variable-resolution helpers depend on only `getPropertyValue`. |
| `scrollTop/scrollLeft/scrollWidth/scrollHeight/clientWidth/clientHeight` | Element geometry; horizontal RTL and vertical writing modes require different scroll origins. Safari overscroll beyond the normal extent is not converted into a new clamping policy. |
| `offsetParent/offsetTop/offsetLeft/offsetWidth/offsetHeight/clientTop/clientLeft` | Guard HTMLElement-specific layout access. Non-HTML subject geometry remains unsupported and produces an unresolved range rather than unchecked layout arithmetic. |
| `document.scrollingElement`, `parentElement`, sibling traversal, selectors, `isConnected`, `contains`, `compareDocumentPosition` | Explicit nullability and Element narrowing. Stylesheet registrations retain DOM-order precedence. |
| HTMLStyleElement / HTMLLinkElement, `dataset`, `textContent`, Text.data | Separate stylesheet node types and parser cursor records. Honor `data-aphrodite` on both stylesheet forms. |
| `MutationObserver` / `ResizeObserver` | Typed targets and records; process affected nodes and release observers when a source no longer owns timelines. Required on the polyfill path. |
| `WeakMap/Map/Set/WeakRef` | Collections have explicit key/value types. Timeline sets contain WeakRef objects; removal uses the matching reference. WeakRef is a runtime requirement, not a transpilation feature. |
| `requestAnimationFrame`, `queueMicrotask`, `setTimeout`, Promise | Distinguish frame scheduling from promise settlement; guard work whose timeline became inactive. |
| `pagehide/pageshow`, PageTransitionEvent.persisted | Keep proxy state for persisted transitions and refresh both CSS and programmatic timelines on restoration. Tests dispatch lifecycle events; this is not a physical-device BFCache certification. |
| `fetch`, URL/origin/baseURI, Blob, createObjectURL/revokeObjectURL | Fetch eligible same-origin stylesheets, ignore failed/hostile sheets, and revoke superseded or removed blob resources. |
| `HTMLScriptElement.onload/onerror` | The loader exposes a never-rejecting readiness promise. Missing source, missing prerequisites, or failed fetch resolves unavailable. |
| Proxy, Reflect, property descriptors | Patches and the numeric-global view are explicit browser integration boundaries. Native receivers are preserved. |
| String.replaceAll, Array.from/flatMap, Object.entries, iteration | Available within the declared bundle target. The loader avoids depending on these newer collection/string helpers. |

Infrastructure references: [CSSOM](https://drafts.csswg.org/cssom/),
[CSSOM View](https://drafts.csswg.org/cssom-view/),
[DOM](https://dom.spec.whatwg.org/), [HTML lifecycle](https://html.spec.whatwg.org/),
[WeakRef compatibility](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/WeakRef.json).

## Deliberate compatibility limits

- Preserve the upstream programmatic default of zero inset when omitted. CSS
  `auto` insets still use scroll padding; this distinction has a regression test.
- The CSS parser retains its existing lookup and syntax subset. Full cascade
  specificity, nested at-rule handling, complete `timeline-scope`, and all newer
  named ranges are not implemented by this migration.
- No blanket ambient override makes a partial polyfill appear to be a complete
  native implementation. Consumers opt into the Arts globals separately.
- Source provenance, patch inventory, and future merges are described in
  [UPSTREAM.md](UPSTREAM.md).

## Real Safari / iOS smoke procedure

Use the Vite fixture URL on the Mac, or expose the fixture server to a device on
the same network. On a supported Safari release and a physical iPhone/iPad:

1. Open the parity fixture and confirm its JSON result has no failures/errors.
2. Open the loader fixture and check the readiness promise and network panel:
   native support fetches no polyfill bundle.
3. Exercise vertical and horizontal scrolling, variable changes, and stylesheet
   replacement. Navigate away and back and verify resumed progress.
4. Record Safari, OS, device, and capability results. Repeat on an older Safari
   within the declared target to exercise its genuine CSS polyfill path.

Playwright's WebKit is a separately built engine, and mobile device projects
emulate viewport/input settings. They are not branded Safari or physical-device
runs. See [Playwright browser coverage](https://playwright.dev/docs/browsers).
