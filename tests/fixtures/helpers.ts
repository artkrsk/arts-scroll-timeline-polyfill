export function element<T extends Element>(selector: string, elementClass: { new (): T }): T {
  const node = document.querySelector(selector)
  if (!(node instanceof elementClass)) throw new Error(`Missing fixture element: ${selector}`)
  return node
}
export function loadScript(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = path
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${path}`))
    document.head.appendChild(script)
  })
}
export const loaderURL = '/src/php/libraries/scroll-timeline/loader.js'
export const polyfillURL = '/src/php/libraries/scroll-timeline/scroll-timeline.js'
