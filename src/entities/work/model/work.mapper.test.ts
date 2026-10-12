import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultWork } from '@/src/shared/utils/work';

import { WorkDtoMapper } from './work.mapper';
import type { WorkDto, WorkEntity } from './work.types';

const mapper = new WorkDtoMapper();

/** A Work holding exactly these page counts. */
const workWith = (pageCount: number, frontmatterCount: number, backmatterCount: number): WorkEntity =>
  getDefaultWork({ id: 'w1', pageCount, frontmatterCount, backmatterCount });

/** The page fields of the DTO the mapper writes for these counts. */
const written = (pageCount: number, frontmatterCount: number, backmatterCount: number) => {
  const dto = mapper.toDto(workWith(pageCount, frontmatterCount, backmatterCount));

  return { pageCount: dto.pageCount, pageBreakdown: dto.pageBreakdown };
};

/** The counts the mapper reads from a stored Work's total and breakdown. */
const read = (pageCount: number | null, pageBreakdown: string | null) => {
  const entity = mapper.toEntity({ workId: 'w1', pageCount, pageBreakdown } as WorkDto);

  return {
    pageCount: entity.pageCount,
    frontmatterCount: entity.frontmatterCount,
    backmatterCount: entity.backmatterCount,
  };
};

/** The shared Roman conversions log every value they fail on: none may ever reach them. */
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WorkDtoMapper page breakdown writes', () => {
  it.each([
    ['no page information', 0, 0, 0, null, null],
    ['a total alone', 26, 0, 0, 26, null],
    ['front matter', 302, 24, 0, 302, 'xxiv+278'],
    ['back matter', 302, 0, 10, 302, '+292+x'],
    ['front and back matter', 302, 24, 10, 302, 'xxiv+268+x'],
    ['front matter filling the total', 24, 24, 0, 24, 'xxiv+0'],
    ['back matter filling the total', 10, 0, 10, 10, '+0+x'],
    ['front and back matter filling the total', 34, 24, 10, 34, 'xxiv+0+x'],
    ['the largest total', 2147483647, 0, 0, 2147483647, null],
    ['the largest front and back matter', 7998, 3999, 3999, 7998, 'mmmcmxcix+0+mmmcmxcix'],
    ['the largest total with front and back matter', 2147483647, 3999, 1, 2147483647, 'mmmcmxcix+2147479647+i'],
  ])('writes %s as total and front + main + back', (_, total, front, back, pageCount, pageBreakdown) => {
    expect(written(total, front, back)).toEqual({ pageCount, pageBreakdown });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('writes every representable front and back matter count as a lowercase Roman numeral that reads back exactly', () => {
    for (let count = 1; count <= 3999; count += 1) {
      const { pageBreakdown } = written(count * 2, count, count);

      expect(pageBreakdown).toMatch(/^[ivxlcdm]+\+0\+[ivxlcdm]+$/);
      expect(read(count * 2, pageBreakdown as string)).toEqual({
        pageCount: count * 2,
        frontmatterCount: count,
        backmatterCount: count,
      });
    }

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('never writes nulla, and writes a breakdown exactly when there is front or back matter', () => {
    for (let total = 0; total <= 40; total += 1) {
      for (let front = 0; front <= total; front += 1) {
        for (let back = 0; back <= total - front; back += 1) {
          const { pageCount, pageBreakdown } = written(total, front, back);

          expect(pageCount).toBe(total > 0 ? total : null);
          expect(pageBreakdown === null).toBe(front === 0 && back === 0);
          expect(pageBreakdown ?? '').not.toMatch(/nulla/i);
        }
      }
    }
  });
});

describe('WorkDtoMapper refuses page counts it cannot write exactly', () => {
  const NOT_WHOLE_TOTAL = /The Work's page count must be a whole number from 0 to 2147483647/;
  const NOT_WHOLE_FRONT = /The Work's front matter count must be a whole number from 0 to 3999/;
  const NOT_WHOLE_BACK = /The Work's back matter count must be a whole number from 0 to 3999/;

  it.each([
    ['front and back matter exceeding the total', 30, 24, 10, /pages exceed its total page count \(30\)/],
    ['front matter exceeding the total', 23, 24, 0, /pages exceed its total page count \(23\)/],
    ['back matter exceeding the total', 9, 0, 10, /pages exceed its total page count \(9\)/],
    [
      'front matter without a total',
      0,
      24,
      0,
      /front matter \(24\) and back matter \(0\) pages need a total page count/,
    ],
    [
      'back matter without a total',
      0,
      0,
      10,
      /front matter \(0\) and back matter \(10\) pages need a total page count/,
    ],
    ['a fractional total', 302.5, 24, 0, NOT_WHOLE_TOTAL],
    ['a fractional front matter count', 302, 24.5, 0, NOT_WHOLE_FRONT],
    ['a fractional back matter count', 302, 0, 10.5, NOT_WHOLE_BACK],
    ['a negative total', -1, 0, 0, NOT_WHOLE_TOTAL],
    ['a negative front matter count', 302, -1, 0, NOT_WHOLE_FRONT],
    ['a negative back matter count', 302, 0, -1, NOT_WHOLE_BACK],
    ['a total beyond a GraphQL Int', 2147483648, 0, 0, NOT_WHOLE_TOTAL],
    ['front matter beyond what Roman numerals can state', 10000, 4000, 0, NOT_WHOLE_FRONT],
    ['back matter beyond what Roman numerals can state', 10000, 0, 4000, NOT_WHOLE_BACK],
    ['a NaN total', NaN, 0, 0, NOT_WHOLE_TOTAL],
    ['an infinite total', Infinity, 0, 0, NOT_WHOLE_TOTAL],
    ['a NaN front matter count', 302, NaN, 0, NOT_WHOLE_FRONT],
    ['an infinite front matter count', 302, Infinity, 0, NOT_WHOLE_FRONT],
    ['a NaN back matter count', 302, 0, NaN, NOT_WHOLE_BACK],
    ['a negatively infinite back matter count', 302, 0, -Infinity, NOT_WHOLE_BACK],
    ['a total that is not a number at all', '302' as unknown as number, 0, 0, NOT_WHOLE_TOTAL],
  ])('throws on %s instead of returning a DTO', (_, total, front, back, message) => {
    expect(() => mapper.toDto(workWith(total, front, back))).toThrow(message);
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('WorkDtoMapper page breakdown reads', () => {
  it.each([
    ['canonical front matter', 302, 'xxiv+278', 24, 0],
    ['canonical back matter', 302, '+292+x', 0, 10],
    ['canonical front and back matter', 302, 'xxiv+268+x', 24, 10],
    ['whitespace around every component', 302, ' xxiv + 268 + x ', 24, 10],
    ['a legacy nulla around the total', 302, 'nulla+302+nulla', 0, 0],
    ['a legacy nulla around a total alone', 26, 'nulla+26+nulla', 0, 0],
    ['a legacy uppercase breakdown carrying the total as its middle', 302, 'XXIV+302', 24, 0],
    ['a middle component that disagrees with the total', 302, 'xxiv+999+x', 24, 10],
    ['no breakdown', 26, null, 0, 0],
  ])('reads %s with the API total as the total', (_, pageCount, pageBreakdown, frontmatterCount, backmatterCount) => {
    expect(read(pageCount, pageBreakdown)).toEqual({ pageCount, frontmatterCount, backmatterCount });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('reads no total and no breakdown as unset', () => {
    expect(read(null, null)).toEqual({ pageCount: 0, frontmatterCount: 0, backmatterCount: 0 });
  });

  it.each([
    ['XXIV+302', 302, 24, 0, 'xxiv+278'],
    ['XXIV+302+X', 302, 24, 10, 'xxiv+268+x'],
    ['nulla+26+nulla', 26, 0, 0, null],
    ['nulla+0+nulla', null, 0, 0, null],
  ])('writes the legacy %s back canonically', (stored, pageCount, front, back, pageBreakdown) => {
    const entity = mapper.toEntity({ workId: 'w1', pageCount, pageBreakdown: stored } as WorkDto);

    expect([entity.frontmatterCount, entity.backmatterCount]).toEqual([front, back]);
    expect(mapper.toDto(entity)).toMatchObject({ pageCount, pageBreakdown });
  });
});
