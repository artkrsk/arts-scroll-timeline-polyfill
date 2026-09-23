export {}

declare global {
  interface Window {
    __artsParityFixture?: {
      complete: boolean
      native: boolean
      passed: string[]
      failed: string[]
      errors: string[]
    }
    __artsScrollTimelinePolyfillReady?: Promise<'native' | 'polyfilled' | 'unavailable'>
  }
}
