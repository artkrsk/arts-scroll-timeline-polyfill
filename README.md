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

## Development

Use Node 24 or newer and pnpm 12.5.1:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`dev` runs a Vite fixture server at `http://127.0.0.1:8844/tests/browser-parity.html`
and `dev:lib` watch mode. The watch build copies the bundle and its source map
into `src/php/libraries/scroll-timeline/`, so path-repository Composer
consumers see each rebuild. `pnpm build` produces the committed, minified
delivery asset and removes the development map; production JavaScript has no
source-map reference. The first-party `loader.js` remains at its existing path.

Run checks and regenerate the production asset before committing:

```sh
pnpm check
pnpm build
pnpm test:browser
pnpm check:generated
composer install --no-interaction
composer check
```

Install Playwright's Firefox and Chromium browsers if needed with
`pnpm exec playwright install chromium firefox`. `check:generated` builds
twice, compares the bytes, and fails when the committed bundle differs from
source. CI performs the same checks from locked installs. The PHP loader uses
each delivered file's `filemtime` as its cache key, so rebuilding an asset
needs no manual version-string edit.

The browser fixture runs the actual delivered bundle and reports results in
`window.__artsParityFixture`. It covers Firefox's polyfilled CSS path and
Chromium's native bypass. See [UPSTREAM.md](UPSTREAM.md) for the exact source
baseline, patch inventory, and rebase procedure.

## License

This package is GPL-3.0-or-later. The vendored polyfill is Apache-2.0,
copyright Google LLC and contributors; its license ships with the JavaScript.
