/** Checked access for parser invariants and private state established by constructors. */
export function required<T>(value: T | null | undefined, message = 'Missing internal value'): T {
  if (value == null) throw new TypeError(message)
  return value
}
export function item<T>(values: ArrayLike<T>, index: number): T {
  return required(values[index], 'Unexpected end of input')
}
