const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'

/**
 * Realm-independent DOM checks. A node built by another window fails `instanceof` against
 * this window's classes: the Elementor editor builds its whole preview tree, injected
 * `<style>` elements included, from the top window.
 */
export function isElement(value: unknown): value is Element {
  return typeof value === 'object' && value !== null && (value as Node).nodeType === 1
}

export function isHTMLElement(value: unknown): value is HTMLElement {
  return isElement(value) && value.namespaceURI === HTML_NAMESPACE
}

export function isStyleElement(value: unknown): value is HTMLStyleElement {
  return isHTMLElement(value) && value.localName === 'style'
}

export function isLinkElement(value: unknown): value is HTMLLinkElement {
  return isHTMLElement(value) && value.localName === 'link'
}
