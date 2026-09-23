# arts/scroll-timeline-polyfill

Registers a self-gating WordPress script for the
[flackr scroll-timeline polyfill](https://github.com/flackr/scroll-timeline).
Browsers with native scroll-driven animations load only the small loader;
other browsers fetch the committed polyfill asset. WordPress installations do
not need Node or a build step.

## Consumer contract

Boot `\Arts\ScrollTimelinePolyfill\Plugin::instance()` (or its prefixed class
in a bundled plugin), then depend on or enqueue the shared
`scroll-timeline-polyfill` script handle. The loader exposes a promise that
always resolves to `native`, `polyfilled`, or `unavailable`:

```js
const state = await window.__artsScrollTimelinePolyfillReady
if (state === 'polyfilled') {
  // window.ViewTimeline is ready.
}
```

The first package to register the handle supplies both the loader and its
bundle URL. Products shipping this dependency together should update to the
same release. To keep the polyfill from rewriting a stylesheet, add its
WordPress style handle to the `arts/scroll_timeline_polyfill/skipped_styles`
filter. The package marks that sheet's `<link>` with `data-aphrodite`.

## TypeScript consumers

Consumer declarations require TypeScript 7.0 or newer. The package root exports
**types only**; browser code is installed by the WordPress script handle.

```ts
import type { PolyfillReadyState, PolyfillViewTimelineOptions } from '@arts/scroll-timeline-polyfill'
import type {} from '@arts/scroll-timeline-polyfill/globals'

const options: PolyfillViewTimelineOptions = {
  subject: document.querySelector('#subject') ?? undefined,
  axis: 'block',
  inset: 'auto',
}
const state: PolyfillReadyState | undefined = await window.__artsScrollTimelinePolyfillReady
```

The optional `/globals` entry adds only the Arts source URL and readiness
promise. Standard DOM globals retain their native declarations; exported
polyfill interfaces describe the supported subset and nullable inactive values.
The package remains private, with generated declarations and export metadata
prepared for future distribution. See [BROWSER_APIS.md](BROWSER_APIS.md) for
browser support, API differences, and the Safari/device smoke procedure.

## Development

Use Node 24 or newer and pnpm 12.5.1:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

All maintained browser code lives in `src/ts/`; scripts, tests, and fixture
logic are TypeScript too. Browser source and fixtures are checked without Node
ambient types. Tooling has a separate compiler configuration. Strict null,
indexed-access, optional-property, override, and erasable-syntax checks apply.

`dev` runs the fixture at `http://127.0.0.1:8844/tests/browser-parity.html` while
watching both library entries and consumer declarations. Each library rebuild
copies its asset and source map into `src/php/libraries/scroll-timeline/`, so
path-repository Composer consumers see it immediately.

`pnpm build` generates the minified loader and polyfill at their existing PHP
paths, removes development maps, and emits the committed declarations in
`types/`. Never edit those generated files directly. PHP still versions the
scripts using their modification times; WordPress consumers need no build step.

Run verification after source changes:

```sh
pnpm build
pnpm check
pnpm test:browser
pnpm check:generated
composer check
```

`check` rejects untyped source and suppression directives, then runs formatting,
lint, source/fixture/tooling type checks, unit tests, and consumer declaration
checks. Consumer checks cover bundler and NodeNext resolution and verify that
type-only imports disappear from emitted JavaScript. Install dependencies first with
`composer install --no-interaction` when needed. Install browser binaries using
`pnpm exec playwright install chromium firefox webkit`.

Run `pnpm test:unit:coverage` for V8 unit-test coverage across `src/ts`, including
uncovered modules. It prints a terminal summary and writes `coverage/index.html`
and `coverage/lcov.info`. Reports are gitignored; coverage thresholds are not
imposed. Browser-test coverage is separate from this report.

Browser tests compile fixture modules into `.cache/browser-fixtures/` and load
the actual delivered assets. Projects cover Chromium, Firefox, WebKit, and
mobile Chromium/WebKit viewports. Expectations follow measured capabilities;
isolated tests also force polyfill and numeric-shim installation. The parity
fixture reports to `window.__artsParityFixture`.

`check:generated` rebuilds twice and compares the JavaScript assets and every
consumer declaration byte-for-byte. CI checks the same artifacts from locked
installs. [UPSTREAM.md](UPSTREAM.md) records source provenance and how to port
future upstream changes into the typed fork.

## License

This package is GPL-3.0-or-later. The vendored polyfill is Apache-2.0,
copyright Google LLC and contributors; its license ships with the JavaScript.
