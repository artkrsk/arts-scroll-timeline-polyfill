# arts/scroll-timeline-polyfill

Registers the [flackr/scroll-timeline](https://github.com/flackr/scroll-timeline) polyfill as a self-gating WordPress script, so CSS scroll-driven animations work in browsers that don't ship them yet (Firefox, at the time of writing).

Browsers with native support download a ~600-byte loader and nothing else. Everyone else gets the polyfill fetched on demand.

## Usage

Boot the plugin from your own plugin's bootstrap:

```php
\Arts\ScrollTimelinePolyfill\Plugin::instance();
```

If your plugin prefixes its vendor tree (Strauss and friends), call the prefixed class — the package resolves its own asset URLs from wherever it ends up.

Then depend on the registered handle — that's what orders the loader ahead of your code:

```php
wp_register_script( 'my-effects', $url, array( 'scroll-timeline-polyfill' ), $ver, true );
```

The handle is shared: if two plugins register it, the first wins. Ship the same package version across your plugins so they agree on the patch level.

### Driving timelines from JavaScript

The loader appends the polyfill asynchronously, so `ViewTimeline` is not there on your first tick. Await the loader's promise, which never rejects:

```js
const state = await window.__artsScrollTimelinePolyfillReady
// 'native'      — the browser ships scroll-driven animations; nothing was loaded
// 'polyfilled'  — the polyfill is installed; window.ViewTimeline is usable
// 'unavailable' — no timelines: the fetch failed, or the polyfill aborted its
//                 own init. Fall back; never commit to a layout that needs a
//                 timeline to be usable.
```

### Opting a stylesheet out

The polyfill's CSS layer refetches and re-serializes stylesheets containing timeline syntax through its upstream parser. If you drive your animations from JS, or a sheet trips the parser, opt it out by handle:

```php
add_filter(
	'arts/scroll_timeline_polyfill/skipped_styles',
	fn( $handles ) => array_merge( $handles, array( 'my-handle' ) )
);
```

This tags the `<link>` with `data-aphrodite`, the polyfill's own skip vocabulary.

## The vendored copy

`src/php/libraries/scroll-timeline/scroll-timeline.js` is upstream 1.1.0, built and then patched. Upstream is effectively frozen, so the deviations live here rather than as a fork. They're listed in the file's banner; in short:

1. **Per-stylesheet transpile errors are non-fatal.** Upstream aborts the entire init when one sheet throws, leaving `ViewTimeline` undefined and every animation dead. Elementor's own inline CSS does exactly this ("Empty selector" out of the parser).
2. **`<link data-aphrodite>` opts a sheet out.** Upstream honors the attribute on inline `<style>` only.
3. **The whole body is wrapped in a native-support guard**, testing the named timeline syntax alongside the anonymous functions — a browser implementing only part of the feature must not be misread as fully native.
4. **Source measurement bails on detached sources.** Upstream throws when an AJAX page swap detaches a timeline source between observer registration and callback.
5. **Zero-length ranges remain finite.** A subject exactly as tall as its scrollport has a zero-length contain range; converting its percentage to animation time must not divide by zero.
6. **Skipped hostile stylesheets stay quiet.** Elementor inline CSS can trip the upstream parser; those sheets cannot abort initialization or flood the console.
7. **Unrelated stylesheets remain untouched.** Sheets without timeline syntax are not replaced with blobs, avoiding a stylesheet-detachment flash during AJAX navigation.
8. **CSS scroll animations bind reliably.** Scroll-bound `auto` and omitted durations get a finite `1s` bootstrap, including longhands and animation lists. Explicit durations and fill modes are preserved. CSS list parsing respects functions, strings and escapes. View timeline insets resolve custom properties against the subject, including nested fallbacks; inherited variable changes and geometry updates refresh their resolved values.
9. **Stylesheet replacement updates existing bindings.** Inline style text and character-data changes replace that sheet's registrations in DOM order. Existing animation proxies receive updated timelines, ranges and insets without duplicate wrappers. Removed sheets and declarations release old bindings; the observer ignores the polyfill's emitted text.

The current asset cache version is `1.1.0-arts.4`. The readable Arts patch block inside the shipped bundle is intentional: this package has no upstream rebuild dependency. Keep the native-support guards in the loader and bundle intact when updating it.

### Browser regression fixture

Serve this package root over HTTP and open `tests/browser-parity.html` in Firefox and a browser with native scroll timeline support. For example:

```sh
python3 -m http.server 8844 --bind 127.0.0.1
```

The fixture loads the actual shipped bundle and reports results in the page and `window.__artsParityFixture`. It covers longhand/shorthand/omitted durations, animation lists and fill modes, inherited inset variable changes, nested fallbacks, repeated style replacement with unchanged animation names, character-data updates, stylesheet order/removal, and binding restoration. Chrome also exercises the bundle's native guard.

## License

GPL-3.0-or-later. The vendored polyfill is Apache-2.0 (© Google LLC and contributors); its license travels with it in `src/php/libraries/scroll-timeline/LICENSE`.
