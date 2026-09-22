/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccessibilityException, AccessibilityStandard, PublicationType } from '@/gql/graphql';
import type { PublicationEntity } from '@/src/entities/publication/model/publication.types';
import { ERRORS } from '@/src/shared/constants';

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
    sendErrorNotification: vi.fn(),
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
  useNotifications: () => ({ sendErrorNotification: mocks.sendErrorNotification }),
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
    mocks.sendErrorNotification.mockClear();
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
          prices: [{ priceId: 'p1', currency: { value: 'GBP', label: 'GBP' }, priceValue: 25 }],
        });
      });

      expect(result.current.publication?.prices).toEqual([{ id: 'p1', currencyCode: 'GBP', unitPrice: 25 }]);
    });
  });

  describe('updateLocations', () => {
    it('should update locations', () => {
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() => {
        result.current.updateLocations([
          {
            id: 'loc-1',
            locationPlatform: 'OTHER',
            canonical: true,
            landingPage: 'https://example.com',
            fullTextUrl: '',
          },
        ]);
      });

      expect(result.current.publication?.locations).toHaveLength(1);
    });
  });

  describe('deleteLocation', () => {
    it('should remove location by id', () => {
      mocks.publication.locations = [
        {
          id: 'loc-1',
          locationPlatform: 'OTHER',
          canonical: true,
          landingPage: 'https://example.com',
          fullTextUrl: '',
        },
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
    const makePdf = (name: string) => new File([new Uint8Array(7000)], name, { type: 'application/pdf' });

    it('exposes the selected file as pending and passes it to createPublication', async () => {
      mocks.publication.type = PublicationType.Pdf;
      const { result } = renderHook(() => useAddNewPublication(defaultProps));
      const file = makePdf('test.pdf');

      act(() => {
        result.current.updateFile(file);
      });

      expect(result.current.file).toBe(file);

      await act(async () => {
        await result.current.create();
      });

      expect(mocks.createPublication).toHaveBeenCalledWith({ data: expect.anything(), file });
    });

    it('keeps only the final replacement before save', async () => {
      mocks.publication.type = PublicationType.Pdf;
      const { result } = renderHook(() => useAddNewPublication(defaultProps));
      const firstFile = makePdf('first.pdf');
      const finalFile = makePdf('final.pdf');

      act(() => {
        result.current.updateFile(firstFile);
        result.current.updateFile(finalFile);
      });

      expect(result.current.file).toBe(finalFile);

      await act(async () => {
        await result.current.create();
      });

      expect(mocks.createPublication).toHaveBeenCalledWith({ data: expect.anything(), file: finalFile });
    });

    it('clears a pending file that becomes invalid when the publication type changes', () => {
      mocks.publication.type = PublicationType.Pdf;
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() => result.current.updateFile(makePdf('book.pdf')));
      act(() => result.current.updateType(PublicationType.Epub));

      expect(result.current.file).toBeNull();
      expect(mocks.sendErrorNotification).toHaveBeenCalledWith(ERRORS.FILE_FORMAT_INVALID);
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

  /*
   * The database-aligned accessibility behaviour of the ordinary add form (thoth-app#221; thoth#893 Architecture
   * Amendment 3), which the ONIX importer is reconciled with and which must not be relaxed.
   */
  describe('accessibility (database contract)', () => {
    const accessible = () => {
      mocks.publication.type = PublicationType.Pdf;
      mocks.publication.accessibilityStandard = AccessibilityStandard.Wcag21Aa;
      mocks.publication.accessibilityAdditionalStandard = AccessibilityStandard.PdfUa1;
      mocks.publication.accessibilityException = null;
      mocks.publication.accessibilityReportUrl = 'https://example.org/accessibility';
    };
    const accessibilityOf = (publication: PublicationEntity | null) => ({
      standard: publication?.accessibilityStandard,
      additional: publication?.accessibilityAdditionalStandard,
      exception: publication?.accessibilityException,
      reportUrl: publication?.accessibilityReportUrl,
    });

    it.each([PublicationType.Paperback, PublicationType.Hardback, PublicationType.Mp3, PublicationType.Wav])(
      'clears every accessibility field when the type becomes %s',
      (type) => {
        accessible();
        const { result } = renderHook(() => useAddNewPublication(defaultProps));

        act(() => result.current.updateType(type));

        expect(accessibilityOf(result.current.publication)).toEqual({
          standard: null,
          additional: null,
          exception: null,
          reportUrl: '',
        });
      },
    );

    it.each([
      [PublicationType.Epub, null],
      [PublicationType.Html, null],
      [PublicationType.Pdf, AccessibilityStandard.PdfUa1],
    ])('keeps the WCAG standard and only an additional standard a %s offers', (type, additional) => {
      accessible();
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() => result.current.updateType(type));

      expect(accessibilityOf(result.current.publication)).toMatchObject({
        standard: AccessibilityStandard.Wcag21Aa,
        additional,
      });
    });

    it('never stores an additional standard without a primary one', () => {
      accessible();
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() =>
        result.current.updateAccessibility({
          accessibilityStandard: [AccessibilityStandard.PdfUa2],
          accessibilityReportUrl: '',
        }),
      );

      expect(accessibilityOf(result.current.publication)).toMatchObject({ standard: null, additional: null });
    });

    it('stores a WCAG standard in the primary slot and EPUB Accessibility in the additional one, whatever order they are given in', () => {
      accessible();
      mocks.publication.type = PublicationType.Epub;
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      act(() =>
        result.current.updateAccessibility({
          accessibilityStandard: [AccessibilityStandard.EpubA11Y11Aa, AccessibilityStandard.Wcag22Aaa],
          accessibilityException: '',
          accessibilityReportUrl: '',
        }),
      );

      expect(accessibilityOf(result.current.publication)).toEqual({
        standard: AccessibilityStandard.Wcag22Aaa,
        additional: AccessibilityStandard.EpubA11Y11Aa,
        exception: null,
        reportUrl: '',
      });
    });

    it('creates the Publication with exactly the accessibility it holds', async () => {
      accessible();
      mocks.publication.accessibilityStandard = null;
      mocks.publication.accessibilityAdditionalStandard = null;
      mocks.publication.accessibilityException = AccessibilityException.MicroEnterprises;
      const { result } = renderHook(() => useAddNewPublication(defaultProps));

      await act(async () => {
        await result.current.create();
      });

      expect(mocks.createPublication).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accessibilityStandard: null,
          accessibilityAdditionalStandard: null,
          accessibilityException: AccessibilityException.MicroEnterprises,
          accessibilityReportUrl: 'https://example.org/accessibility',
        }),
        file: undefined,
      });
    });
  });
});
