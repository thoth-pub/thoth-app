/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicationEntity } from '@/src/entities/publication/model/publication.types';

const mocks = vi.hoisted(() => {
  const publication: PublicationEntity = {
    id: 'pub-1',
    isbn: '',
    prices: [],
    locations: [],
    type: 'BOOK',
  };

  return {
    publication,
    work: { imprintId: 'imprint-1' },
    finishEditing: vi.fn(),
    createPublication: vi.fn().mockResolvedValue({}),
    defaultCurrencyOption: { value: 'GBP', label: 'GBP' },
    loading: false,
    progress: 0,
  };
});

vi.mock('@/src/entities/publication', () => ({
  usePublicationsStateMachine: () => ({
    activeEntity: mocks.publication,
    finishEditing: mocks.finishEditing,
  }),
  useCreatePublication: () => ({
    createPublication: mocks.createPublication,
    loading: mocks.loading,
    progress: mocks.progress,
  }),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({ work: mocks.work }),
}));

vi.mock('@/src/shared/hooks', () => ({
  useDefaultCurrencyOption: () => mocks.defaultCurrencyOption,
}));

vi.mock('@/src/shared/utils/locations', () => ({
  selectCanonicalLocation: (locations: { canonical: boolean }[]) => locations,
}));

import { useAddNewPublication } from './useAddNewPublication';

describe('useAddNewPublication', () => {
  const defaultProps = { workId: 'work-1' };

  beforeEach(() => {
    mocks.finishEditing.mockClear();
    mocks.createPublication.mockClear();
    mocks.publication.isbn = '';
    mocks.publication.type = 'BOOK';
  });

  it('should return publication and default currency', () => {
    const { result } = renderHook(() => useAddNewPublication(defaultProps));

    expect(result.current.publication).toBe(mocks.publication);
    expect(result.current.defaultCurrencyOption).toBe(mocks.defaultCurrencyOption);
  });

  describe('create', () => {
    it('should call createPublication and finishEditing', async () => {
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      await act(async () => {
        await result.current.create();
      });

      expect(mocks.createPublication).toHaveBeenCalledWith({
        data: mocks.publication,
        file: undefined,
      });
      expect(mocks.finishEditing).toHaveBeenCalled();
    });

    it('should call finishEditing after create', async () => {
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      await act(async () => {
        await result.current.create();
      });

      expect(mocks.finishEditing).toHaveBeenCalled();
    });
  });

  describe('updateType', () => {
    it('should update publication type', () => {
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() => {
        result.current.updateType('EBOOK');
      });

      expect(result.current.publication?.type).toBe('EBOOK');
    });

    it('should clear accessibility for non-accessible types', () => {
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() => {
        result.current.updateType('AUDIOBOOK');
      });

      expect(result.current.publication?.accessibilityStandard).toBeNull();
    });
  });

  describe('updateIsbn', () => {
    it('should update isbn', () => {
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() => {
        result.current.updateIsbn('978-3-16-148410-0');
      });

      expect(result.current.publication?.isbn).toBe('978-3-16-148410-0');
    });
  });

  describe('updateDimensions', () => {
    it('should convert string dimensions to numbers', () => {
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() => {
        result.current.updateDimensions({
          widthMm: '210',
          heightMm: '297',
          weightG: '500',
        });
      });

      expect(result.current.publication).toMatchObject({
        width: 210,
        height: 297,
        weight: 500,
      });
    });
  });

  describe('updatePrices', () => {
    it('should map price form data to price entities', () => {
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() => {
        result.current.updatePrices({
          prices: [
            { priceId: 'p1', currency: { value: 'GBP', label: 'GBP' }, priceValue: 25 },
          ],
        });
      });

      expect(result.current.publication?.prices).toEqual([
        { id: 'p1', currencyCode: 'GBP', unitPrice: 25 },
      ]);
    });
  });

  describe('updateLocations', () => {
    it('should update locations', () => {
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() => {
        result.current.updateLocations([
          { id: 'loc-1', locationPlatform: 'OTHER', canonical: true, landingPage: 'https://example.com', fullTextUrl: '' },
        ]);
      });

      expect(result.current.publication?.locations).toHaveLength(1);
    });
  });

  describe('deleteLocation', () => {
    it('should remove location by id', () => {
      mocks.publication.locations = [
        { id: 'loc-1', locationPlatform: 'OTHER', canonical: true, landingPage: 'https://example.com', fullTextUrl: '' },
        { id: 'loc-2', locationPlatform: 'OAPEN', canonical: false, landingPage: '', fullTextUrl: '' },
      ];

      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() => {
        result.current.deleteLocation('loc-1');
      });

      expect(result.current.publication?.locations).toHaveLength(1);
      expect(result.current.publication?.locations[0].id).toBe('loc-2');
    });
  });

  describe('updateFile', () => {
    it('should set the file', () => {
      const { result } = renderHook(() => useAddNewPublication(defaultProps));
      const file = new File([''], 'test.pdf');

      act(() => {
        result.current.updateFile(file);
      });
    });
  });

  describe('deleteAccessibility', () => {
    it('should clear all accessibility fields', () => {
      mocks.publication.accessibilityStandard = 'WCAG_AA';
      mocks.publication.accessibilityAdditionalStandard = 'WCAG_AAA';

      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() => {
        result.current.deleteAccessibility();
      });

      expect(result.current.publication?.accessibilityStandard).toBeNull();
      expect(result.current.publication?.accessibilityAdditionalStandard).toBeNull();
      expect(result.current.publication?.accessibilityException).toBeNull();
      expect(result.current.publication?.accessibilityReportUrl).toBe('');
    });
  });
});
