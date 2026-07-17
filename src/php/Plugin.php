<?php

namespace Arts\ScrollTimelinePolyfill;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Arts\Base\Plugins\BasePlugin;
use Arts\ScrollTimelinePolyfill\Containers\ManagersContainer;

/**
 * Scroll-timeline polyfill loader.
 *
 * Consumers depend on (or `wp_enqueue_script()`) the registered
 * `scroll-timeline-polyfill` handle — a ~200-byte first-party loader that
 * fetches the actual polyfill ONLY in browsers without native CSS
 * scroll-driven animations. Native browsers download nothing beyond the
 * loader itself.
 *
 * Stylesheets the polyfill must never transpile (its fetch-and-rewrite
 * path re-serializes whole sheets through a naive parser) opt out via:
 *
 *     add_filter( 'arts/scroll_timeline_polyfill/skipped_styles', fn( $h ) => array_merge( $h, array( 'my-handle' ) ) );
 *
 * @extends BasePlugin<ManagersContainer>
 */
class Plugin extends BasePlugin {
	protected function get_default_config(): array {
		return array();
	}

	protected function get_default_strings(): array {
		return array();
	}

	protected function get_default_run_action(): string {
		return 'init';
	}

	protected function get_managers_classes(): array {
		return array(
			'frontend' => Managers\Frontend::class,
		);
	}

	protected function add_actions(): void {
		add_action( 'wp_enqueue_scripts', array( $this->managers->frontend, 'register' ) );
	}

	protected function add_filters(): void {
		add_filter( 'style_loader_tag', array( $this->managers->frontend, 'filter_style_loader_tag' ), 10, 2 );
	}
}
