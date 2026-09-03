import { cleanup, render, screen } from '@testing-library/react';
import { type FieldValues, useForm, useWatch } from 'react-hook-form';
import { afterEach, describe, expect, it } from 'vitest';

import { FORM_FIELDS } from '@/src/shared/constants';

import { PageCountAutoCalculator } from './PageCountCalculator';

const { WORK_FIRST_PAGE, WORK_LAST_PAGE, WORK_PAGES_COUNT } = FORM_FIELDS;

const PAGE_COUNT_TEST_ID = 'page-count';

/**
 * A manually entered count the calculator is expected to leave alone whenever the range is
 * incomplete or invalid. Any value it does write is therefore visible as a change away from this.
 */
const ENTERED_PAGE_COUNT = 7;

type HarnessProps = {
  firstPage?: string;
  lastPage?: string;
  pageCount?: number;
};

/**
 * Drives the real component through a real `useForm`, so the assertions below are about the
 * calculator's own behaviour rather than about a stand-in for it.
 */
const PageCountHarness = ({ firstPage = '', lastPage = '', pageCount = ENTERED_PAGE_COUNT }: HarnessProps) => {
  const { control, setValue } = useForm<FieldValues>({
    defaultValues: {
      [WORK_FIRST_PAGE.name]: firstPage,
      [WORK_LAST_PAGE.name]: lastPage,
      [WORK_PAGES_COUNT.name]: pageCount,
    },
  });
  const currentPageCount = useWatch({ control, name: WORK_PAGES_COUNT.name }) as number;

  return (
    <>
      <PageCountAutoCalculator control={control} setValue={setValue} />
      <output data-testid={PAGE_COUNT_TEST_ID}>{String(currentPageCount)}</output>
    </>
  );
};

const renderCalculator = (props: HarnessProps) => {
  render(<PageCountHarness {...props} />);

  return () => screen.getByTestId(PAGE_COUNT_TEST_ID).textContent;
};

describe('PageCountAutoCalculator', () => {
  afterEach(cleanup);

  it.each([
    ['1', '20', '20'],
    ['5', '5', '1'],
  ])('keeps the inclusive Arabic count for %s to %s at %s', (firstPage, lastPage, expected) => {
    expect(renderCalculator({ firstPage, lastPage })()).toBe(expected);
  });

  it.each([
    ['I', 'XI', '11'],
    ['IV', 'IX', '6'],
    ['iv', 'ix', '6'],
    ['V', 'V', '1'],
  ])('counts the Roman range %s to %s as %s pages', (firstPage, lastPage, expected) => {
    expect(renderCalculator({ firstPage, lastPage })()).toBe(expected);
  });

  it.each([
    ['A1', 'A20', '20'],
    ['B6', 'B20', '15'],
  ])('counts the repeated-prefix range %s to %s as %s pages', (firstPage, lastPage, expected) => {
    expect(renderCalculator({ firstPage, lastPage })()).toBe(expected);
  });

  it.each([
    ['A1', '20', '20'],
    ['B6', '20', '15'],
    ['A3', '3', '1'],
  ])('counts the prefixed shorthand %s to %s as %s pages', (firstPage, lastPage, expected) => {
    // No Arabic-only parser can reach these numbers, so a correct count here is itself the
    // evidence that the calculator reads the shared range interpretation.
    expect(renderCalculator({ firstPage, lastPage })()).toBe(expected);
  });

  it.each([
    ['I', '10'],
    ['1', 'X'],
    ['A1', 'XI'],
    ['1', 'A20'],
    ['A1', 'B20'],
  ])('leaves the entered count alone for the mixed range %s to %s', (firstPage, lastPage) => {
    const pageCount = renderCalculator({ firstPage, lastPage });

    expect(pageCount()).toBe(String(ENTERED_PAGE_COUNT));
    expect(pageCount()).not.toBe('NaN');
  });

  it.each([
    ['20', '1'],
    ['XI', 'I'],
    ['A20', 'A1'],
    ['A20', '1'],
  ])('leaves the entered count alone for the descending range %s to %s', (firstPage, lastPage) => {
    const pageCount = renderCalculator({ firstPage, lastPage });

    expect(pageCount()).toBe(String(ENTERED_PAGE_COUNT));
    expect(pageCount()).not.toBe('NaN');
  });

  it.each([
    ['1', ''],
    ['', '20'],
    ['A1', ''],
    ['', 'XI'],
    ['', ''],
  ])('leaves the entered count alone for the incomplete range %s to %s', (firstPage, lastPage) => {
    const pageCount = renderCalculator({ firstPage, lastPage });

    expect(pageCount()).toBe(String(ENTERED_PAGE_COUNT));
    expect(pageCount()).not.toBe('NaN');
  });

  it.each([
    ['a1', '20'],
    ['Appendix1', '20'],
    ['1', 'AA20'],
    ['IIII', 'IX'],
  ])('leaves the entered count alone for the invalid range %s to %s', (firstPage, lastPage) => {
    const pageCount = renderCalculator({ firstPage, lastPage });

    expect(pageCount()).toBe(String(ENTERED_PAGE_COUNT));
    expect(pageCount()).not.toBe('NaN');
  });
});
