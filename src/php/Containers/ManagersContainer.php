<?php

namespace Arts\ScrollTimelinePolyfill\Containers;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Arts\ScrollTimelinePolyfill\Managers\Frontend;

/**
 * Container for manager instances.
 *
 * @property Frontend $frontend
 */
class ManagersContainer extends \Arts\Base\Containers\ManagersContainer {
}
