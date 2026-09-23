<?php

declare(strict_types=1);

define( 'ABSPATH', __DIR__ );

$scripts = array();
$inline  = array();

function untrailingslashit( string $value ): string {
	return rtrim( $value, '/' );
}

function trailingslashit( string $value ): string {
	return rtrim( $value, '/' ) . '/';
}

function esc_url( string $value ): string {
	return $value;
}

function wp_json_encode( string $value ): string {
	return json_encode( $value, JSON_THROW_ON_ERROR );
}

function add_query_arg( string $key, string $value, string $url ): string {
	return $url . '?' . rawurlencode( $key ) . '=' . rawurlencode( $value );
}

function wp_register_script( string $handle, string $url, array $dependencies, ?string $version, array $options ): bool {
	global $scripts;
	if ( isset( $scripts[ $handle ] ) ) {
		return false;
	}
	$scripts[ $handle ] = compact( 'url', 'dependencies', 'version', 'options' );
	return true;
}

function wp_add_inline_script( string $handle, string $code, string $position ): bool {
	global $inline;
	$inline[] = compact( 'handle', 'code', 'position' );
	return true;
}

require dirname( __DIR__, 2 ) . '/../ArtsBase/src/php/Managers/BaseManager.php';
require dirname( __DIR__, 2 ) . '/src/php/Managers/Frontend.php';

$directory = dirname( __DIR__, 2 ) . '/src/php/';
$loader    = (string) filemtime( $directory . 'libraries/scroll-timeline/loader.js' );
$bundle    = (string) filemtime( $directory . 'libraries/scroll-timeline/scroll-timeline.js' );

$first = new \Arts\ScrollTimelinePolyfill\Managers\Frontend(
	array( 'dir_path' => $directory, 'dir_url' => 'https://example.test/first' )
);
$first->register();

assert( $scripts['scroll-timeline-polyfill']['version'] === $loader );
assert( count( $inline ) === 1 );
$bundle_url = json_decode( trim( substr( $inline[0]['code'], strpos( $inline[0]['code'], '=' ) + 1 ), " ;" ), true, 512, JSON_THROW_ON_ERROR );
assert( $bundle_url === 'https://example.test/first/libraries/scroll-timeline/scroll-timeline.js?ver=' . $bundle );

$second = new \Arts\ScrollTimelinePolyfill\Managers\Frontend(
	array( 'dir_path' => $directory, 'dir_url' => 'https://example.test/second' )
);
$second->register();

assert( count( $inline ) === 1 );
assert( $scripts['scroll-timeline-polyfill']['url'] === 'https://example.test/first/libraries/scroll-timeline/loader.js' );

$scripts = array();
$inline  = array();
$missing = new \Arts\ScrollTimelinePolyfill\Managers\Frontend(
	array( 'dir_path' => '/nonexistent/arts/', 'dir_url' => 'https://example.test/missing' )
);
$missing->register();
assert( null === $scripts['scroll-timeline-polyfill']['version'] );
assert( count( $inline ) === 1 );
assert( ! str_contains( $inline[0]['code'], '?ver=' ) );

echo "Frontend registration passed\n";
