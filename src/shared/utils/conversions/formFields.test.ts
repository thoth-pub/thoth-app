import { describe, expect, it, vi } from 'vitest';

import { appConfig } from '@/src/shared/config';

import {
  convertDoiToText,
  convertEntityToSelectFieldOptions,
  convertFormFieldsToSelectFieldOptions,
  convertLanguageCode,
  convertOptionToString,
  convertOrchidIdToText,
  convertRorIdToText,
  getDateInFuture,
  getDateInFutureFromDate,
  mapOptionToLabel,
  mapOptionsToLabels,
} from './formFields';

describe('convertOptionToString', () => {
  it('converts underscored string to title case words', () => {
    expect(convertOptionToString('hello_world')).toBe('Hello World');
  });

  it('handles single word', () => {
    expect(convertOptionToString('hello')).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(convertOptionToString('')).toBe('');
  });
});

describe('convertFormFieldsToSelectFieldOptions', () => {
  it('converts string array to FormFieldOption array', () => {
    const result = convertFormFieldsToSelectFieldOptions(['hello_world', 'foo_bar']);
    expect(result).toEqual([
      { value: 'hello_world', label: 'Hello World' },
      { value: 'foo_bar', label: 'Foo Bar' },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(convertFormFieldsToSelectFieldOptions([])).toEqual([]);
  });
});

describe('convertEntityToSelectFieldOptions', () => {
  it('maps entities to options using the specified label key', () => {
    const entities = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ];
    const result = convertEntityToSelectFieldOptions(entities, 'name');
    expect(result).toEqual([
      { value: '1', label: 'Alice' },
      { value: '2', label: 'Bob' },
    ]);
  });
});

describe('getDateInFuture', () => {
  it('returns a date in the future', () => {
    vi.useFakeTimers().setSystemTime(new Date('2024-01-01'));
    const result = getDateInFuture();
    expect(result).toBe('2024-01-02');
    vi.useRealTimers();
  });

  it('accepts custom number of days', () => {
    vi.useFakeTimers().setSystemTime(new Date('2024-01-01'));
    const result = getDateInFuture(7);
    expect(result).toBe('2024-01-08');
    vi.useRealTimers();
  });
});

describe('getDateInFutureFromDate', () => {
  it('returns a date in the future from a given start date', () => {
    const result = getDateInFutureFromDate('2024-01-01', 5);
    expect(result).toBe('2024-01-06');
  });
});

describe('convertLanguageCode', () => {
  it('converts underscore to hyphen and uppercases the region', () => {
    expect(convertLanguageCode('en_US')).toBe('en-US');
  });

  it('handles code without region', () => {
    expect(convertLanguageCode('en')).toBe('en');
  });

  it('handles three-letter codes', () => {
    expect(convertLanguageCode('zh_CN')).toBe('zh-CN');
  });
});

describe('convertDoiToText', () => {
  it('strips the DOI prefix', () => {
    expect(convertDoiToText('https://doi.org/10.1234/abc.def')).toBe('10.1234/abc.def');
  });
});

describe('convertOrchidIdToText', () => {
  it('strips the ORCID prefix', () => {
    expect(convertOrchidIdToText('https://orcid.org/0000-0001-2345-6789')).toBe('0000-0001-2345-6789');
  });
});

describe('convertRorIdToText', () => {
  it('strips the ROR prefix', () => {
    expect(convertRorIdToText('https://ror.org/123456')).toBe('123456');
  });
});

describe('mapOptionsToLabels', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('maps values to labels', () => {
    expect(mapOptionsToLabels(['a', 'b'], options)).toBe('Option A, Option B');
  });

  it('falls back to the raw value when not found', () => {
    expect(mapOptionsToLabels(['a', 'unknown'], options)).toBe('Option A, unknown');
  });
});

describe('mapOptionToLabel', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('maps a single value to its label', () => {
    expect(mapOptionToLabel('a', options)).toBe('Option A');
  });

  it('falls back to the raw value when not found', () => {
    expect(mapOptionToLabel('unknown', options)).toBe('unknown');
  });
});
