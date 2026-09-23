<?php

namespace Arts\ScrollTimelinePolyfill\Managers;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Arts\Base\Managers\BaseManager;

class Frontend extends BaseManager {
	/** Consumer-facing handle — depend on it or enqueue it directly. */
	private const HANDLE = 'scroll-timeline-polyfill';

	/**
	 * Register the loader script (register-only — consumers pull it in).
	 *
	 * The loader performs a `CSS.supports`-guarded `appendChild` of the
	 * real polyfill, so native browsers fetch ~200 bytes and stop. The
	 * polyfill URL reaches it via an inline `before` script (standard
	 * API — no custom printers). If another plugin registered the same
	 * handle first, its loader and matching bundle URL both win.
	 *
	 * Consumers that drive timelines from JS await the loader's
	 * `window.__artsScrollTimelinePolyfillReady` promise, which settles
	 * 'native' | 'polyfilled' | 'unavailable' — depend on this handle so
	 * the loader is ordered first.
	 *
	 * @return void
	 */
	public function register(): void {
		$base       = untrailingslashit( $this->plugin_dir_url ) . '/libraries/scroll-timeline';
		$loader_url = esc_url( $base . '/loader.js' );
		if ( '' === $loader_url ) {
			return;
		}

		$registered = wp_register_script(
			self::HANDLE,
			$loader_url,
			array(),
			$this->asset_version( 'loader.js' ),
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);

		if ( ! $registered ) {
			return;
		}

		$bundle_url     = $base . '/scroll-timeline.js';
		$bundle_version = $this->asset_version( 'scroll-timeline.js' );
		if ( null !== $bundle_version ) {
			$bundle_url = add_query_arg( 'ver', $bundle_version, $bundle_url );
		}
		$src = wp_json_encode( esc_url( $bundle_url ) );

		if ( is_string( $src ) ) {
			wp_add_inline_script(
				self::HANDLE,
				'window.__artsScrollTimelinePolyfillSrc = ' . $src . ';',
				'before'
			);
		}
	}

	/** Use the delivered file's modification time as its cache key. */
	private function asset_version( string $file ): ?string {
		$path = trailingslashit( $this->plugin_dir_path ) . 'libraries/scroll-timeline/' . $file;
		if ( ! is_file( $path ) ) {
			return null;
		}

		$mtime = filemtime( $path );
		return false === $mtime ? null : (string) $mtime;
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

		if ( $processor->next_tag( array( 'tag_name' => 'link' ) ) ) {
			$processor->set_attribute( 'data-aphrodite', true );
			return $processor->get_updated_html();
		}

		return $tag;
	}
}
