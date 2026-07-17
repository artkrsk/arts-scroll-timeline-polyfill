<?php

namespace Arts\ScrollTimelinePolyfill\Managers;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Arts\Base\Managers\BaseManager;

class Frontend extends BaseManager {
	/** @var string Consumer-facing handle — depend on it or enqueue it directly. */
	private $handle = 'scroll-timeline-polyfill';

	/** @var string Pinned upstream polyfill version (vendored + patched copy). */
	private $version = '1.1.0';

	/**
	 * Register the loader script (register-only — consumers pull it in).
	 *
	 * The loader performs a `CSS.supports`-guarded `appendChild` of the
	 * real polyfill, so native browsers fetch ~200 bytes and stop. The
	 * polyfill URL reaches it via an inline `before` script (standard
	 * API — no custom printers). If another plugin registered the same
	 * handle first, `wp_register_script` no-ops and the shared handle
	 * wins; version alignment is the interop expectation.
	 *
	 * @return void
	 */
	public function register(): void {
		$base = untrailingslashit( $this->plugin_dir_url ) . '/libraries/scroll-timeline';

		wp_register_script(
			$this->handle,
			esc_url( $base . '/loader.js' ),
			array(),
			$this->version,
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);

		$src = wp_json_encode( esc_url( $base . '/scroll-timeline.js?ver=' . $this->version ) );

		if ( is_string( $src ) ) {
			wp_add_inline_script(
				$this->handle,
				'window.__artsScrollTimelinePolyfillSrc = ' . $src . ';',
				'before'
			);
		}
	}

	/**
	 * Mark opted-out stylesheets so the polyfill never transpiles them.
	 *
	 * `data-aphrodite` is the polyfill's own skip vocabulary (honored on
	 * inline styles upstream; extended to `<link>` by the vendored patch —
	 * see the header of libraries/scroll-timeline/scroll-timeline.js).
	 * Handles are collected via the `arts/scroll_timeline_polyfill/skipped_styles`
	 * filter; the tag is mutated with `WP_HTML_Tag_Processor` — core's own
	 * escaping-safe idiom for rewriting a built tag string. Idempotent
	 * across the RTL-companion double-fire (same handle, second tag).
	 *
	 * @param string $tag    The link tag markup.
	 * @param string $handle Style handle.
	 * @return string
	 */
	public function filter_style_loader_tag( string $tag, string $handle ): string {
		/** @var array<int, string> $skipped */
		$skipped = apply_filters( 'arts/scroll_timeline_polyfill/skipped_styles', array() );

		if ( ! is_array( $skipped ) || ! in_array( $handle, $skipped, true ) ) {
			return $tag;
		}

		$processor = new \WP_HTML_Tag_Processor( $tag );

		if ( $processor->next_tag( 'link' ) ) {
			$processor->set_attribute( 'data-aphrodite', true );
			return $processor->get_updated_html();
		}

		return $tag;
	}
}
