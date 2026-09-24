import { describe, expect, it } from 'vitest'
import {
  RegexMatcher,
  StyleParser,
  TIMELINE_AXIS_TYPES,
  removeKeywordsFromAnimationShorthand,
} from '../../src/ts/upstream/scroll-timeline-css-parser.js'
import type { SheetCursor } from '../../src/ts/upstream/parser-types.js'

interface FakeNode {
  selector: string
  previousElementSibling: FakeNode | null
  parentElement: FakeNode | null
  isConnected: boolean
  matches(selector: string): boolean
}

function node(
  selector: string,
  links: { previous?: FakeNode; parent?: FakeNode } = {},
): FakeNode & Element {
  const fake: FakeNode = {
    selector,
    previousElementSibling: links.previous ?? null,
    parentElement: links.parent ?? null,
    isConnected: false,
    matches: (value) => value === selector,
  }
  return fake as FakeNode & Element
}

function transpile(css: string, parser = new StyleParser()): { parser: StyleParser; out: string } {
  const first = parser.transpileStyleSheet(css, true)
  return { parser, out: parser.transpileStyleSheet(first, false) }
}

const cursor = (sheetSrc: string, index = 0): SheetCursor => ({ sheetSrc, index })

describe('StyleParser first pass', () => {
  it('rewrites phase-linked keyframe selectors and records their mapping', () => {
    const parser = new StyleParser()
    const out = parser.transpileStyleSheet(
      '@keyframes fade { entry 0% { opacity: 0 } exit 100%, cover  50% { opacity: 1 } }',
      true,
    )
    expect(out).toBe('@keyframes fade {0%{ opacity: 0 }1%,2%{ opacity: 1 } }')
    expect(parser.keyframeNamesSelectors.get('fade')).toEqual(
      new Map([
        [0, 'entry 0%'],
        [1, 'exit 100%'],
        [2, 'cover 50%'],
      ]),
    )
  })

  it.each([
    ['@keyframes plain { from { opacity: 0 } to { opacity: 1 } }'],
    ['@keyframes empty {}'],
  ])('keeps keyframes without phases unchanged: %s', (css) => {
    const parser = new StyleParser()
    expect(parser.transpileStyleSheet(css, true)).toBe(css)
    expect([...parser.keyframeNamesSelectors.values()]).toEqual([new Map()])
  })

  it('ignores ordinary rules and whitespace', () => {
    const parser = new StyleParser()
    expect(parser.transpileStyleSheet('  .a { color: red }  ', true)).toBe('  .a { color: red }  ')
    expect(parser.keyframeNamesSelectors.size).toBe(0)
  })

  it('blanks comments between and inside rules', () => {
    const parser = new StyleParser()
    expect(parser.transpileStyleSheet('/* hi */.a{}', true)).toBe('/*    */.a{}')
    expect(parser.transpileStyleSheet('/* a */ /* b */.a{/* } */}', true)).toBe(
      '/*   */ /*   */.a{/*   */}',
    )
  })

  it('reports syntax errors with the sheet name', () => {
    const parser = new StyleParser()
    expect(() => parser.transpileStyleSheet('{}', true)).toThrow('Empty selector')
    expect(() => parser.transpileStyleSheet('.a { color: red', true)).toThrow(
      '(<anonymous file>): Advanced beyond the end',
    )
    expect(() => parser.transpileStyleSheet('/* open', true, 'x.css')).toThrow(
      '(x.css): Advanced beyond the end',
    )
  })
})

describe('StyleParser animation relations', () => {
  const target = node('.a')

  it('pairs animation names, timelines and ranges by index', () => {
    const { parser, out } = transpile(
      '.a { animation-name: fade, spin; animation-timeline: --one, --two; ' +
        'animation-range: entry 0% exit 100% }',
    )
    expect(out).toContain('animation-name: fade, spin')
    expect(parser.cssRulesWithTimelineName).toEqual([
      {
        selector: '.a',
        'animation-name': 'fade',
        'animation-timeline': '--one',
        'animation-range': 'entry 0% exit 100%',
      },
      {
        selector: '.a',
        'animation-name': 'spin',
        'animation-timeline': '--two',
        'animation-range': 'entry 0% exit 100%',
      },
    ])
    expect(parser.getAnimationTimelineOptions('spin', target)).toEqual({
      'animation-timeline': '--two',
      'animation-range': 'entry 0% exit 100%',
    })
    expect(parser.getAnimationTimelineOptions('other', target)).toBeNull()
    expect(parser.getAnimationTimelineOptions('fade', node('.b'))).toBeNull()
  })

  it('matches any animation when the rule has no animation name', () => {
    const { parser } = transpile('.a { animation-timeline: --t }')
    expect(parser.getAnimationTimelineOptions('whatever', target)).toEqual({
      'animation-timeline': '--t',
      'animation-range': undefined,
    })
  })

  it('skips selectors that the target cannot match', () => {
    const { parser } = transpile('.a { animation-timeline: --t }')
    const throwing = {
      matches: () => {
        throw new SyntaxError('bad selector')
      },
    } as unknown as Element
    expect(parser.getAnimationTimelineOptions('fade', throwing)).toBeNull()
  })

  it('adds a bootstrap duration to known animations with a timeline', () => {
    const { parser, out } = transpile(
      '@keyframes fade { from { opacity: 0 } } .a { animation: fade linear; animation-timeline: --t }',
    )
    expect(out).toContain('.a { animation:  1s fade linear; animation-timeline: --t }')
    expect(parser.getAnimationTimelineOptions('fade', target)).toEqual({
      'animation-timeline': '--t',
      'animation-range': undefined,
    })
  })

  it('removes auto durations from the shorthand', () => {
    const { out } = transpile('.a { animation: fade auto linear; animation-timeline: --t }')
    expect(out).not.toContain('auto')
  })

  it.each([
    '.a { animation: fade 2s linear; animation-timeline: --t }',
    '.a { animation: fade 1s }',
    '@keyframes fade { animation-timeline: --t }',
    '.a { color: red }',
  ])('leaves %s untouched', (css) => {
    const { parser, out } = transpile(css)
    expect(out).toBe(css)
    expect(parser.cssRulesWithTimelineName.filter((rule) => rule['animation-name'])).toEqual([])
  })
})

describe('StyleParser named timelines', () => {
  const source = node('.s')
  const child = node('.child', { parent: source })

  it.each([
    ['--tl x', { name: '--tl', axis: 'x' }],
    ['y --tl', { name: '--tl', axis: 'y' }],
    ['--tl', { name: '--tl' }],
    ['a b c', { name: '' }],
  ])('parses scroll-timeline: %s', (value, expected) => {
    const { parser } = transpile(`.s { scroll-timeline: ${value} }`)
    expect(parser.sourceSelectorToScrollTimeline).toEqual([{ selector: '.s', ...expected }])
  })

  it('applies scroll-timeline longhands over the shorthand', () => {
    const { parser } = transpile(
      '.s { scroll-timeline: --a, --b y; scroll-timeline-name: --c; scroll-timeline-axis: inline }',
    )
    expect(parser.sourceSelectorToScrollTimeline).toEqual([
      { selector: '.s', name: '--c', axis: 'inline' },
      { selector: '.s', name: '--b', axis: 'inline' },
    ])
  })

  it('cycles scroll-timeline axes over longhand names', () => {
    const { parser } = transpile(
      '.s { scroll-timeline-name: --a, --b, --c; scroll-timeline-axis: x, y }',
    )
    expect(parser.sourceSelectorToScrollTimeline.map((tl) => tl.axis)).toEqual(['x', 'y', 'x'])
  })

  it('resolves scroll timelines from the target or its ancestors', () => {
    const { parser } = transpile('.s { scroll-timeline: --tl x } .t { scroll-timeline: --plain }')
    expect(parser.getScrollTimelineOptions('--tl', child)).toEqual({
      kind: 'scroll',
      source,
      axis: 'x',
    })
    const plain = node('.t')
    expect(parser.getScrollTimelineOptions('--plain', plain)).toEqual({
      kind: 'scroll',
      source: plain,
    })
    expect(parser.getScrollTimelineOptions('--tl', node('.other'))).toBeNull()
    expect(parser.getScrollTimelineOptions('--missing', child)).toBeNull()
  })

  it.each([
    ['view-timeline: --v block; view-timeline-inset: 10px 20px', [['--v', 'block', '10px 20px']]],
    ['view-timeline: y --v', [['--v', 'y', null]]],
    ['view-timeline: --v', [['--v', undefined, null]]],
    ['view-timeline: a b c', [['', undefined, null]]],
    ['view-timeline: --a; view-timeline-name: --b', [['--b', undefined, null]]],
    [
      'view-timeline-name: --a, --b; view-timeline-axis: x; view-timeline-inset: 1px, auto',
      [
        ['--a', 'x', '1px'],
        ['--b', 'x', 'auto'],
      ],
    ],
  ])('parses %s', (declarations, expected) => {
    const { parser } = transpile(`.v { ${declarations} }`)
    expect(
      parser.subjectSelectorToViewTimeline.map(({ name, axis, inset }) => [name, axis, inset]),
    ).toEqual(expected)
  })

  it('resolves view timelines from the subject or its ancestors', () => {
    const { parser } = transpile('.s { view-timeline: --v inline; view-timeline-inset: 5px }')
    expect(parser.getViewTimelineOptions('--v', child)).toEqual({
      kind: 'view',
      subject: source,
      axis: 'inline',
      inset: '5px',
    })
    const { parser: bare } = transpile('.s { view-timeline: --v }')
    expect(bare.getViewTimelineOptions('--v', source)).toEqual({
      kind: 'view',
      subject: source,
      axis: undefined,
      inset: undefined,
    })
    expect(parser.getViewTimelineOptions('--v', node('.other'))).toBeNull()
    expect(parser.getViewTimelineOptions('--missing', child)).toBeNull()
  })

  it.each([
    ['scroll-timeline-name: --a; scroll-timeline-axis: diagonal', 'Invalid axis'],
    ['scroll-timeline: --a diagonal', 'Invalid axis'],
    ['view-timeline-name: --a; view-timeline-axis: diagonal', 'Invalid axis'],
    ['view-timeline: --a diagonal', 'Invalid axis'],
  ])('rejects %s', (declarations, message) => {
    expect(() => transpile(`.s { ${declarations} }`)).toThrow(message)
  })
})

describe('StyleParser anonymous timelines', () => {
  it.each([
    ['scroll(root x)', { source: 'root', axis: 'x' }],
    ['scroll(self block)', { source: 'self', axis: 'block' }],
    ['scroll(nearest bogus)', { source: 'nearest' }],
    ['scroll()', {}],
    ['nope', null],
  ])('parses %s', (value, expected) => {
    expect(new StyleParser().parseAnonymousScrollTimeline(value)).toEqual(expected)
  })

  it.each([
    ['view(block 10px 20px)', { axis: 'block', inset: '10px 20px' }],
    ['view(x)', { axis: 'x' }],
    ['view(auto)', { inset: 'auto' }],
    ['nope', null],
  ])('parses %s', (value, expected) => {
    expect(new StyleParser().parseAnonymousViewTimeline(value)).toEqual(expected)
  })

  it('registers anonymous timelines under generated names', () => {
    const { parser } = transpile(
      '.a { animation-timeline: scroll(self x), view(inline 1px), scroll(), view(5%), view(y) }',
    )
    const target = node('.a')
    expect(parser.cssRulesWithTimelineName.map((rule) => rule['animation-timeline'])).toEqual([
      ':t0',
      ':t1',
      ':t2',
      ':t3',
      ':t4',
    ])
    expect(parser.nextAnonymousTimelineNameIndex).toBe(5)
    expect(parser.getScrollTimelineOptions(':t0', target)).toEqual({
      kind: 'scroll',
      anonymousSource: 'self',
      anonymousTarget: target,
      source: target,
      axis: 'x',
    })
    expect(parser.getAnonymousScrollTimelineOptions(':t2', target)).toEqual({
      kind: 'scroll',
      anonymousSource: undefined,
      anonymousTarget: target,
      source: null,
      axis: 'block',
    })
    expect(parser.getViewTimelineOptions(':t1', target)).toEqual({
      kind: 'view',
      subject: target,
      axis: 'inline',
      inset: '1px',
    })
    expect(parser.getAnonymousViewTimelineOptions(':t3', target)).toEqual({
      kind: 'view',
      subject: target,
      axis: 'block',
      inset: '5%',
    })
    expect(parser.getAnonymousViewTimelineOptions(':t4', target)).toEqual({
      kind: 'view',
      subject: target,
      axis: 'y',
      inset: 'auto',
    })
    expect(parser.getAnonymousScrollTimelineOptions(':t1', target)).toBeNull()
    expect(parser.getAnonymousViewTimelineOptions(':t0', target)).toBeNull()
  })
})

describe('StyleParser helpers', () => {
  const parser = new StyleParser()

  it('walks previous siblings before ancestors', () => {
    const root = node('.root')
    const sibling = node('.sibling', { parent: root })
    const target = node('.target', { previous: sibling, parent: root })
    const find = (selector: string) =>
      parser.findPreviousSiblingOrAncestorMatchingSelector(target, selector)
    expect(find('.target')).toBe(target)
    expect(find('.sibling')).toBe(sibling)
    expect(find('.root')).toBe(root)
    expect(find('.missing')).toBeNull()
  })

  it('replaces parts and shifts a cursor past the replaced range', () => {
    const after = cursor('abcdef', 5)
    parser.replacePart(1, 3, 'WXYZ', after)
    expect(after).toEqual({ sheetSrc: 'aWXYZdef', index: 7 })
    const inside = cursor('abcdef', 2)
    parser.replacePart(1, 3, '', inside)
    expect(inside).toEqual({ sheetSrc: 'adef', index: 2 })
  })

  it('reads identifiers, strings and characters from a cursor', () => {
    const p = cursor('foo-bar baz')
    expect(parser.parseIdentifier(p)).toBe('foo-bar')
    expect(p.index).toBe(7)
    expect(parser.peek(p)).toBe(' ')
    expect(parser.lookAhead(' baz', p)).toBe(true)
    parser.assertString(p, ' ')
    expect(parser.eatUntil('z', p, true)).toBe('  ')
    expect(p.sheetSrc).toBe('foo-bar   z')
    expect(parser.peek(cursor('', 0))).toBeUndefined()
  })

  it('reports cursor errors', () => {
    expect(() => parser.parseIdentifier(cursor('!!!'))).toThrow(
      '(<anonymous file>): Expected an identifier',
    )
    expect(() => parser.assertString({ ...cursor('abc'), name: 'x.css' }, '{')).toThrow(
      '(x.css): Did not find expected sequence {',
    )
  })

  it('splits and extracts declaration values', () => {
    expect(parser.split(' a  b ')).toEqual(['a', 'b'])
    expect(parser.extractMatches('animation-name: a , b;', RegexMatcher.ANIMATION_NAME)).toEqual([
      'a',
      'b',
    ])
    expect(parser.extractMatches('inset: 1px / 2px', /inset:([^;]+)/, '/')).toEqual(['1px', '2px'])
    expect(parser.extractMatches('color: red', RegexMatcher.ANIMATION_NAME)).toEqual([])
    expect(parser.extractScrollTimelineNames('animation-timeline: --a, --b')).toEqual([
      '--a',
      '--b',
    ])
  })

  it.each([
    ['fade 1s', true, false],
    ['fade 10ms linear', true, false],
    ['fade auto', false, true],
    ['fade', false, false],
  ])('detects durations in %s', (shorthand, duration, auto) => {
    expect(parser.hasDuration(shorthand)).toBe(duration)
    expect(parser.hasAutoDuration(shorthand)).toBe(auto)
  })

  it.each([
    ['"a"', 'a'],
    ['"a', 'a'],
    ['a"', 'a'],
    ['a', 'a'],
  ])('removes enclosing quotes from %s', (value, expected) => {
    expect(parser.removeEnclosingDoubleQuotes(value)).toBe(expected)
  })

  it('finds animation names among known keyframes', () => {
    const known = new StyleParser()
    known.keyframeNamesSelectors.set('spin', new Map())
    expect(known.extractAnimationName('linear spin 1s')).toBe('spin')
    expect(known.extractAnimationName('linear 1s')).toBeNull()
    expect(known.findMatchingEntryInContainer('a b', new Map([['b', new Map()]]))).toBe('b')
  })

  it('strips keywords, times and numbers from animation shorthands', () => {
    expect(removeKeywordsFromAnimationShorthand('fade 1s linear infinite both')).toEqual([
      'fade',
      'infinite',
      'both',
    ])
    expect(removeKeywordsFromAnimationShorthand('ease 2 200ms paused')).toEqual(['paused'])
  })

  it('exposes timeline axes and value matchers', () => {
    expect(TIMELINE_AXIS_TYPES).toEqual(['block', 'inline', 'x', 'y'])
    expect(RegexMatcher.ANONYMOUS_VIEW_TIMELINE.exec('view(x 1px)')?.[1]).toBe('x 1px')
    expect(RegexMatcher.TIME.test('150ms')).toBe(true)
  })
})
