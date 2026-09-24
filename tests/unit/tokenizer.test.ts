import { describe, expect, it } from 'vitest'
import {
  BadUrlToken,
  CDCToken,
  DelimToken,
  DimensionToken,
  FunctionToken,
  IdentToken,
  NumberToken,
  RightParenthesisToken,
  UrlToken,
  WhitespaceToken,
  tokenizeString,
} from '../../src/ts/upstream/tokenizer.js'

describe('CSS tokenizer', () => {
  it('decides numbers and idents from the current code point', () => {
    expect(tokenizeString('..5')).toStrictEqual([
      new DelimToken('.'),
      new NumberToken(0.5, 'number'),
    ])
    expect(tokenizeString('.+5')).toStrictEqual([new DelimToken('.'), new NumberToken(5)])
    expect(tokenizeString('.-5')).toStrictEqual([new DelimToken('.'), new NumberToken(-5)])
    expect(tokenizeString('--5')).toStrictEqual([new IdentToken('--5')])
    expect(tokenizeString('-->')).toStrictEqual([new CDCToken()])
    expect(tokenizeString('+.5')).toStrictEqual([new NumberToken(0.5, 'number')])
    expect(tokenizeString('-.5a')).toStrictEqual([new DimensionToken(-0.5, 'number', 'a')])
  })
  it('treats tabs as whitespace and U+2000 as an ident code point', () => {
    expect(tokenizeString('a\tb')).toStrictEqual([
      new IdentToken('a'),
      new WhitespaceToken(),
      new IdentToken('b'),
    ])
    expect(tokenizeString(' a')).toStrictEqual([new IdentToken(' a')])
  })
  it('starts a url token only for the whole ident "url"', () => {
    expect(tokenizeString('curly(x)')).toStrictEqual([
      new FunctionToken('curly'),
      new IdentToken('x'),
      new RightParenthesisToken(),
    ])
    expect(tokenizeString('URL(a)')).toStrictEqual([new UrlToken('a')])
    expect(tokenizeString('url( "a" )')[0]).toStrictEqual(new FunctionToken('url'))
  })
  it('consumes up to six hex digits and replaces zero and surrogates', () => {
    expect(tokenizeString('\\10FFFF')).toStrictEqual([new IdentToken('\u{10ffff}')])
    expect(tokenizeString('\\D800 x')).toStrictEqual([new IdentToken('�x')])
    expect(tokenizeString('\\0 x')).toStrictEqual([new IdentToken('�x')])
  })
  it('recognizes escapes from the current code point and appends escaped characters', () => {
    expect(tokenizeString('\\41 bc')).toStrictEqual([new IdentToken('Abc')])
    expect(tokenizeString('ab.\\z')).toStrictEqual([
      new IdentToken('ab'),
      new DelimToken('.'),
      new IdentToken('z'),
    ])
    expect(tokenizeString('url(a\\41 b)')).toStrictEqual([new UrlToken('aAb')])
    expect(tokenizeString('url(a\\)b)')).toStrictEqual([new UrlToken('a)b')])
    expect(tokenizeString('url(a\\\nb)')).toStrictEqual([new BadUrlToken()])
  })
})
