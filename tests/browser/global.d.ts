import type {} from '../../src/ts/public/globals.js'
declare global {
  interface Window {
    __artsParityFixture?: {
      complete: boolean
      native: boolean
      passed: string[]
      failed: string[]
      errors: string[]
    }
  }
}
