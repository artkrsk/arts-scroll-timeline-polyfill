import type { PolyfillReadyState } from './index.js';
declare global {
    interface Window {
        __artsScrollTimelinePolyfillSrc?: string;
        __artsScrollTimelinePolyfillReady?: Promise<PolyfillReadyState>;
    }
}
