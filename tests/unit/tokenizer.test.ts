import { describe, expect, it } from 'vitest'
import {
  AtKeywordToken,
  BadStringToken,
  BadUrlToken,
  CDCToken,
  CDOToken,
  ColonToken,
  CommaToken,
  type CSSToken,
  DelimToken,
  DimensionToken,
  FunctionToken,
  HashToken,
  IdentToken,
  LeftCurlyBracketToken,
  LeftParenthesisToken,
  LeftSquareBracketToken,
  NumberToken,
  PercentageToken,
  RightCurlyBracketToken,
  RightParenthesisToken,
  RightSquareBracketToken,
  SemicolonToken,
  StringToken,
  tokenizeString,
  UrlToken,
  WhitespaceToken,
} from '../../src/ts/upstream/tokenizer.js'

type Case = [string, CSSToken[]]

const ws = new WhitespaceToken()
const ident = (value: string) => new IdentToken(value)
const delim = (value: string) => new DelimToken(value)
const str = (value: string) => new StringToken(value)

describe('tokenizeString', () => {
  it('returns no tokens for empty input', () => {
    expect(tokenizeString('')).toStrictEqual([])
  })

  it('tokenizes punctuation, brackets and stray delimiters', () => {
    expect(tokenizeString(',:;[]{}()*/!=\u0001')).toStrictEqual([
      new CommaToken(),
      new ColonToken(),
      new SemicolonToken(),
      new LeftSquareBracketToken(),
      new RightSquareBracketToken(),
      new LeftCurlyBracketToken(),
      new RightCurlyBracketToken(),
      new LeftParenthesisToken(),
      new RightParenthesisToken(),
      delim('*'),
      delim('/'),
      delim('!'),
      delim('='),
      delim('\u0001'),
    ])
  })

  it.each<Case>([
    [' ', [ws]],
    ['a  b', [ident('a'), ws, ident('b')]],
    ['a\nb', [ident('a'), ws, ident('b')]],
    [' \n ', [ws]],
  ])('collapses whitespace in %j', (input, expected) => {
    expect(tokenizeString(input)).toStrictEqual(expected)
  })

  it.each<Case>([
    ['0', [new NumberToken(0)]],
    ['12', [new NumberToken(12, 'integer')]],
    ['1.5', [new NumberToken(1.5, 'number')]],
    ['1.25', [new NumberToken(1.25, 'number')]],
    ['.5', [new NumberToken(0.5, 'number')]],
    ['+.5', [new NumberToken(0.5, 'number')]],
    ['+5', [new NumberToken(5, 'integer')]],
    ['-5', [new NumberToken(-5, 'integer')]],
    ['-.5', [new NumberToken(-0.5, 'number')]],
    ['1e3', [new NumberToken(1000, 'number')]],
    ['1E-2', [new NumberToken(0.01, 'number')]],
    ['1e+2', [new NumberToken(100, 'number')]],
    ['1.5e1', [new NumberToken(15, 'number')]],
    ['1 2', [new NumberToken(1), ws, new NumberToken(2)]],
    ['1-1', [new NumberToken(1), new NumberToken(-1)]],
  ])('tokenizes number %j', (input, expected) => {
    expect(tokenizeString(input)).toStrictEqual(expected)
  })

  it.each<Case>([
    ['1em', [new DimensionToken(1, 'integer', 'em')]],
    ['12.5px', [new DimensionToken(12.5, 'number', 'px')]],
    ['-5PX', [new DimensionToken(-5, 'integer', 'PX')]],
    ['1e', [new DimensionToken(1, 'integer', 'e')]],
    ['1e-', [new DimensionToken(1, 'integer', 'e-')]],
    ['1-x', [new DimensionToken(1, 'integer', '-x')]],
    ['1e2px', [new DimensionToken(100, 'number', 'px')]],
    ['50%', [new PercentageToken(50)]],
    ['-12.5%', [new PercentageToken(-12.5)]],
  ])('tokenizes dimension or percentage %j', (input, expected) => {
    expect(tokenizeString(input)).toStrictEqual(expected)
  })

  it.each<Case>([
    ['+', [delim('+')]],
    ['+a', [delim('+'), ident('a')]],
    ['.', [delim('.')]],
    ['.a', [delim('.'), ident('a')]],
    ['-', [delim('-')]],
    ['- 1', [delim('-'), ws, new NumberToken(1)]],
    ['-x', [ident('-x')]],
    ['--probe', [ident('--probe')]],
    ['---', [ident('---')]],
    ['-->', [new CDCToken()]],
    ['<!--', [new CDOToken()]],
    ['<', [delim('<')]],
    ['<!-', [delim('<'), delim('!'), delim('-')]],
    ['\\\n', [delim('\\'), ws]],
  ])('tokenizes sign or delimiter %j', (input, expected) => {
    expect(tokenizeString(input)).toStrictEqual(expected)
  })

  it.each<Case>([
    ['@media', [new AtKeywordToken('media')]],
    ['@-x', [new AtKeywordToken('-x')]],
    ['@1', [delim('@'), new NumberToken(1)]],
    ['@', [delim('@')]],
    ['#abc', [new HashToken('abc', 'id')]],
    ['#-a', [new HashToken('-a', 'id')]],
    ['#--', [new HashToken('--', 'id')]],
    ['#-1', [new HashToken('-1', 'unrestricted')]],
    ['#123', [new HashToken('123', 'unrestricted')]],
    ['# ', [delim('#'), ws]],
    ['#', [delim('#')]],
  ])('tokenizes at-keyword or hash %j', (input, expected) => {
    expect(tokenizeString(input)).toStrictEqual(expected)
  })

  it.each<Case>([
    ['foo', [ident('foo')]],
    ['a1-b_c', [ident('a1-b_c')]],
    ['_é', [ident('_é')]],
    ['a😀b', [ident('a😀b')]],
    ['😀(', [new FunctionToken('😀')]],
    ['foo(', [new FunctionToken('foo')]],
    [
      'calc(1px)',
      [
        new FunctionToken('calc'),
        new DimensionToken(1, 'integer', 'px'),
        new RightParenthesisToken(),
      ],
    ],
  ])('tokenizes ident-like %j', (input, expected) => {
    expect(tokenizeString(input)).toStrictEqual(expected)
  })

  it.each<Case>([
    ['"abc"', [str('abc')]],
    ["'x'", [str('x')]],
    ['"a\'b"', [str("a'b")]],
    ['"abc', [str('abc')]],
    ['"\\0"', [str('�')]],
    ['"\\41 x"', [str('Ax')]],
    ['"\\41x"', [str('Ax')]],
    ['"\\41', [str('A')]],
    ['"\\1F600"', [str('😀')]],
    ['"\\"', [str('"')]],
    ['"\\x"', [str('x')]],
    ['"\\', [str('')]],
    ['"a\\\nb"', [str('ab')]],
    ['"a\nb"', [new BadStringToken(), ws, ident('b'), str('')]],
  ])('tokenizes string %j', (input, expected) => {
    expect(tokenizeString(input)).toStrictEqual(expected)
  })

  it.each<Case>([
    ['url(abc)', [new UrlToken('abc')]],
    ['URL(abc)', [new UrlToken('abc')]],
    ['url()', [new UrlToken('')]],
    ['url(abc', [new UrlToken('abc')]],
    ['url( foo )', [new UrlToken('foo')]],
    ['url(a  )', [new UrlToken('a')]],
    ['url(foo ', [new UrlToken('foo')]],
    ['url(a)b', [new UrlToken('a'), ident('b')]],
    ['url("x")', [new FunctionToken('url'), str('x'), new RightParenthesisToken()]],
    ["url( 'x')", [new FunctionToken('url'), ws, str('x'), new RightParenthesisToken()]],
    ['url(  "x")', [new FunctionToken('url'), ws, str('x'), new RightParenthesisToken()]],
  ])('tokenizes url %j', (input, expected) => {
    expect(tokenizeString(input)).toStrictEqual(expected)
  })

  it.each<Case>([
    ['url(a b)', [new BadUrlToken()]],
    ['url(a b)c', [new BadUrlToken(), ident('c')]],
    ['url(a b', [new BadUrlToken()]],
    ['url(a"b)', [new BadUrlToken()]],
    ["url(a'b)", [new BadUrlToken()]],
    ['url(a(b)', [new BadUrlToken()]],
    ['url(a\u0001b)', [new BadUrlToken()]],
    ['url(a\u007fb)', [new BadUrlToken()]],
    ['url(a\\\n)', [new BadUrlToken()]],
  ])('tokenizes bad url %j', (input, expected) => {
    expect(tokenizeString(input)).toStrictEqual(expected)
  })
})
