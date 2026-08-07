import { describe, expect, it } from 'vitest';

import { normaliseDoi, normaliseIsbn } from '../identifiers';

/**
 * The comparison values two records are matched on.
 *
 * These are the rules the whole preflight rests on, so they are pinned directly rather than only
 * through the findings they produce.
 */

/** A real ISBN-10 and the ISBN-13 it is written as in Thoth. */
const ISBN_10 = '0198526636';
const ISBN_13 = '9780198526636';

/** The same pair where the ISBN-10 check digit is the letter X. */
const ISBN_10_WITH_X = '080442957X';
const ISBN_13_FOR_X = '9780804429573';

describe('normaliseIsbn', () => {
  it('gives a valid ISBN-10 and its ISBN-13 the same comparison value', () => {
    expect(normaliseIsbn(ISBN_10)).toBe(ISBN_13);
    expect(normaliseIsbn(ISBN_13)).toBe(ISBN_13);
    expect(normaliseIsbn(ISBN_10)).toBe(normaliseIsbn(ISBN_13));
  });

  it('handles an ISBN-10 whose check digit is X, in either case', () => {
    expect(normaliseIsbn(ISBN_10_WITH_X)).toBe(ISBN_13_FOR_X);
    expect(normaliseIsbn(ISBN_10_WITH_X.toLowerCase())).toBe(ISBN_13_FOR_X);
    expect(normaliseIsbn('0-8044-2957-X')).toBe(ISBN_13_FOR_X);
  });

  it('ignores hyphenation and spacing in either form', () => {
    expect(normaliseIsbn('978-0-19-852663-6')).toBe(ISBN_13);
    expect(normaliseIsbn(' 978 0 19 852663 6 ')).toBe(ISBN_13);
    expect(normaliseIsbn('0-19-852663-6')).toBe(ISBN_13);
  });

  it('ignores a blank ISBN', () => {
    expect(normaliseIsbn('')).toBeNull();
    expect(normaliseIsbn('   ')).toBeNull();
    expect(normaliseIsbn('-')).toBeNull();
  });

  /**
   * The parser returns nothing for a value it cannot validate, so nothing is ever converted into
   * a valid-looking identifier. Such a value is still compared as itself — two rows carrying the
   * same malformed ISBN are worth flagging to each other — but it stays malformed.
   */
  it('does not repair an invalid ISBN into a valid one', () => {
    // A correct-length ISBN-13 with a wrong check digit.
    expect(normaliseIsbn('9780198526637')).toBe('9780198526637');
    // A correct-length ISBN-10 with a wrong check digit: not expanded to thirteen digits.
    expect(normaliseIsbn('0198526637')).toBe('0198526637');
    expect(normaliseIsbn('not-an-isbn')).toBe('NOTANISBN');
    // And nothing invalid can collide with a canonical value, because a value equal to a real
    // ISBN-13 would have parsed as one.
    expect(normaliseIsbn('0198526637')).not.toBe(normaliseIsbn(ISBN_10));
  });

  it('compares two spellings of the same malformed ISBN as one value', () => {
    expect(normaliseIsbn('9780198526637')).toBe(normaliseIsbn('978-0-19-852663-7'));
  });
});

describe('normaliseDoi', () => {
  it('folds case and surrounding whitespace', () => {
    expect(normaliseDoi(' https://doi.org/10.1234/Shared ')).toBe('https://doi.org/10.1234/shared');
    expect(normaliseDoi('HTTPS://DOI.ORG/10.1234/SHARED')).toBe('https://doi.org/10.1234/shared');
  });

  it('leaves the DOI otherwise as Thoth writes it', () => {
    expect(normaliseDoi('https://doi.org/10.1234/abc')).toBe('https://doi.org/10.1234/abc');
  });

  it('ignores a blank DOI', () => {
    expect(normaliseDoi('')).toBeNull();
    expect(normaliseDoi('   ')).toBeNull();
  });
});
