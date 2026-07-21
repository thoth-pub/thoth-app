/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccessibilityStandard } from '@/gql/graphql';
import type { LocationEntity } from '@/src/entities/locations/model/location.types';
import type { CurrencyCode } from '@/src/entities/price/model/price.types';

import { useEditPublication } from './useEditPublication';

const mocks = vi.hoisted(() => {
  const canonicalLocation = {
    id: 'loc-1',
    locationPlatform: 'OTHER',
    canonical: true,
    landingPage: 'https://old.example.com/book',
    fullTextUrl: 'https://old.example.com/book.pdf',
  };

  const otherLocation = {
    id: 'loc-2',
    locationPlatform: 'OAPEN',
    canonical: false,
    landingPage: 'https://library.oapen.org/book',
    fullTextUrl: 'https://library.oapen.org/book.pdf',
  };

  const gbpPrice = { id: 'price-1', currencyCode: 'GBP', unitPrice: 25 };
  const usdPrice = { id: 'price-2', currencyCode: 'USD', unitPrice: 30 };

  const publication = {
    id: 'pub-1',
    isbn: '978-3-16-148410-0',
    prices: [gbpPrice, usdPrice],
    locations: [canonicalLocation, otherLocation],
    accessibilityStandard: null,
    accessibilityAdditionalStandard: null,
  };

  return {
    canonicalLocation,
    otherLocation,
    gbpPrice,
    usdPrice,
    publication,
    // Stable reference, like react-query data before a refetch lands: the hook's
    // fresh-publication effect must not overwrite local state between submits.
    work: { imprintId: 'imprint-1', publications: [publication] },
    updateLocation: vi.fn().mockResolvedValue({}),
    createLocation: vi.fn().mockResolvedValue({ id: 'loc-3' }),
    deleteLocationMutation: vi.fn().mockResolvedValue({}),
    updatePrice: vi.fn().mockResolvedValue({}),
    createPrice: vi.fn().mockResolvedValue({ id: 'price-3' }),
    deletePrice: vi.fn().mockResolvedValue({}),
    updatePublication: vi.fn().mockResolvedValue({}),
    activeLocation: null as LocationEntity | null,
    reconcileActiveLocation: vi.fn(),
  };
});

vi.mock('@/src/entities/locations', () => ({
  useCreateLocation: () => ({ createLocation: mocks.createLocation, loading: false }),
  useUpdateLocation: () => ({ updateLocation: mocks.updateLocation, loading: false }),
  useDeleteLocation: () => ({ deleteLocation: mocks.deleteLocationMutation, loading: false }),
}));

vi.mock('@/src/entities/locations/store/location.store', () => ({
  useLocationStateMachine: () => ({ activeEntity: mocks.activeLocation, update: mocks.reconcileActiveLocation }),
}));

vi.mock('@/src/entities/price', () => ({
  useCreatePrice: () => ({ createPrice: mocks.createPrice, loading: false }),
  useUpdatePrice: () => ({ updatePrice: mocks.updatePrice, loading: false }),
  useDeletePrice: () => ({ deletePrice: mocks.deletePrice, loading: false }),
}));

vi.mock('@/src/entities/publication', () => ({
  usePublicationsStateMachine: () => ({ activeEntity: mocks.publication, finishEditing: vi.fn() }),
  useUpdatePublication: () => ({ updatePublication: mocks.updatePublication, loading: false }),
  useUploadPublicationFile: () => ({ uploadPublicationFile: vi.fn(), loading: false, progress: 0 }),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({ work: mocks.work }),
}));

vi.mock('@/src/shared/hooks', () => ({
  useDefaultCurrencyOption: () => undefined,
}));

const renderEditPublication = () => renderHook(() => useEditPublication({ workId: 'work-1' }));

describe('useEditPublication updateLocations', () => {
  beforeEach(() => {
    mocks.publication.locations = [mocks.canonicalLocation, mocks.otherLocation];
    mocks.updateLocation.mockClear();
    mocks.createLocation.mockClear();
    mocks.deleteLocationMutation.mockClear();
    mocks.activeLocation = null;
    mocks.reconcileActiveLocation.mockClear();
  });

  it('sends the new values of an edited location to the server', async () => {
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.updateLocations([
        { ...mocks.canonicalLocation },
        { ...mocks.otherLocation, fullTextUrl: 'https://new.example.com/book.pdf' },
      ] as LocationEntity[]);
    });

    expect(mocks.updateLocation).toHaveBeenCalledTimes(1);
    expect(mocks.updateLocation).toHaveBeenCalledWith({
      ...mocks.otherLocation,
      fullTextUrl: 'https://new.example.com/book.pdf',
      publicationId: mocks.publication.id,
    });
    expect(mocks.createLocation).not.toHaveBeenCalled();
  });

  it('sends nothing when the submitted locations are unchanged', async () => {
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.updateLocations([
        { ...mocks.canonicalLocation },
        { ...mocks.otherLocation },
      ] as LocationEntity[]);
    });

    expect(mocks.updateLocation).not.toHaveBeenCalled();
    expect(mocks.createLocation).not.toHaveBeenCalled();
  });

  it('sends the canonical promotion before the demotion', async () => {
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.updateLocations([
        { ...mocks.canonicalLocation, canonical: false },
        { ...mocks.otherLocation, canonical: true },
      ] as LocationEntity[]);
    });

    expect(mocks.updateLocation).toHaveBeenCalledTimes(2);
    expect(mocks.updateLocation.mock.calls[0][0]).toMatchObject({ id: 'loc-2', canonical: true });
    expect(mocks.updateLocation.mock.calls[1][0]).toMatchObject({ id: 'loc-1', canonical: false });
  });

  it('creates a new canonical location as non-canonical, then promotes it', async () => {
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.updateLocations([
        { ...mocks.canonicalLocation },
        { ...mocks.otherLocation },
        {
          id: '0000-0000-0000-0000-3',
          locationPlatform: 'DOAB',
          canonical: true,
          landingPage: 'https://doabooks.org/book',
          fullTextUrl: '',
        },
      ] as LocationEntity[]);
    });

    expect(mocks.createLocation).toHaveBeenCalledTimes(1);
    expect(mocks.createLocation.mock.calls[0][0]).toMatchObject({ id: '0000-0000-0000-0000-3', canonical: false });
    expect(mocks.updateLocation.mock.calls[0][0]).toMatchObject({ id: 'loc-3', canonical: true });
    expect(mocks.createLocation.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.updateLocation.mock.invocationCallOrder[0],
    );
  });

  it('stores the server id of a created location so a re-edit before the refetch updates it', async () => {
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.updateLocations([
        { ...mocks.canonicalLocation },
        { ...mocks.otherLocation },
        {
          id: '0000-0000-0000-0000-3',
          locationPlatform: 'DOAB',
          canonical: false,
          landingPage: 'https://doabooks.org/book',
          fullTextUrl: '',
        },
      ] as LocationEntity[]);
    });

    // The work refetch has not landed yet; local state must already hold the server id.
    const storedLocations = result.current.activePublication?.locations ?? [];
    expect(storedLocations).toContainEqual(expect.objectContaining({ id: 'loc-3' }));

    // Re-submit an edit of the just-created location, as the form does from local state.
    await act(async () => {
      await result.current.updateLocations(
        storedLocations.map((location) =>
          location.id === 'loc-3' ? { ...location, fullTextUrl: 'https://doabooks.org/book.pdf' } : { ...location },
        ) as LocationEntity[],
      );
    });

    expect(mocks.createLocation).toHaveBeenCalledTimes(1);
    expect(mocks.updateLocation).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'loc-3', fullTextUrl: 'https://doabooks.org/book.pdf' }),
    );
  });

  it('promotes the remaining location before deleting the canonical one', async () => {
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.deleteLocation('loc-1');
    });

    expect(mocks.updateLocation).toHaveBeenCalledTimes(1);
    expect(mocks.updateLocation.mock.calls[0][0]).toMatchObject({ id: 'loc-2', canonical: true });
    expect(mocks.deleteLocationMutation).toHaveBeenCalledWith('loc-1');
    expect(mocks.updateLocation.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteLocationMutation.mock.invocationCallOrder[0],
    );
  });

  it('keeps a Thoth location canonical and never sends a canonical change for it', async () => {
    const thothLocation = {
      id: 'loc-thoth',
      locationPlatform: 'THOTH',
      canonical: true,
      landingPage: 'https://thoth.pub/book',
      fullTextUrl: 'https://thoth.pub/book.pdf',
    };
    mocks.publication.locations = [thothLocation, mocks.otherLocation];

    const { result } = renderEditPublication();

    // Even if a canonical request for another location slips through, the Thoth
    // location must stay canonical and no mutation may touch it.
    await act(async () => {
      await result.current.updateLocations([
        { ...thothLocation },
        {
          ...mocks.otherLocation,
          fullTextUrl: 'https://new.example.com/book.pdf',
          canonical: true,
        },
      ] as LocationEntity[]);
    });

    expect(mocks.updateLocation).toHaveBeenCalledTimes(1);
    expect(mocks.updateLocation.mock.calls[0][0]).toMatchObject({
      id: 'loc-2',
      canonical: false,
      fullTextUrl: 'https://new.example.com/book.pdf',
    });
    expect(mocks.createLocation).not.toHaveBeenCalled();
  });

  it('useEditPublication_preservesCreatedLocationIdWhenPromotionFails', async () => {
    // A new location is created as non-canonical, then its canonical promotion fails.
    const error = new Error('Canonical promotion failed');
    const newLocation = {
      id: '0000-0000-0000-0000-3',
      locationPlatform: 'DOAB',
      canonical: true,
      landingPage: 'https://doabooks.org/book',
      fullTextUrl: '',
    } as LocationEntity;
    // The editor form is open on the new location, holding its temporary id.
    mocks.activeLocation = newLocation;
    mocks.createLocation.mockResolvedValueOnce({ id: 'loc-3' });
    mocks.updateLocation.mockRejectedValueOnce(error);

    const { result } = renderEditPublication();

    await act(async () => {
      await expect(
        result.current.updateLocations([
          { ...mocks.canonicalLocation },
          { ...mocks.otherLocation },
          { ...newLocation },
        ] as LocationEntity[]),
      ).rejects.toBe(error);
    });

    // The create persisted before the promotion rejected: local state must already
    // hold the server id (non-canonical, matching what the server stored) so a retry
    // does not resubmit the temporary id as a new location.
    const storedLocations = result.current.activePublication?.locations ?? [];
    expect(storedLocations).toContainEqual(expect.objectContaining({ id: 'loc-3', canonical: false }));
    expect(storedLocations).not.toContainEqual(expect.objectContaining({ id: '0000-0000-0000-0000-3' }));

    // The still-open form's active location must be reconciled to the server id so a
    // retry through that form is not classified as a new location.
    expect(mocks.reconcileActiveLocation).toHaveBeenCalledWith(expect.objectContaining({ id: 'loc-3' }));
  });

  it('useEditPublication_doesNotDuplicateCreatedLocationOnRetryAfterPromotionFailure', async () => {
    mocks.createLocation.mockResolvedValueOnce({ id: 'loc-3' });
    mocks.updateLocation.mockRejectedValueOnce(new Error('Canonical promotion failed'));

    const { result } = renderEditPublication();

    await act(async () => {
      await expect(
        result.current.updateLocations([
          { ...mocks.canonicalLocation },
          { ...mocks.otherLocation },
          {
            id: '0000-0000-0000-0000-3',
            locationPlatform: 'DOAB',
            canonical: true,
            landingPage: 'https://doabooks.org/book',
            fullTextUrl: '',
          },
        ] as LocationEntity[]),
      ).rejects.toThrow('Canonical promotion failed');
    });

    // Retry from reconciled local state, as the form does after a failed save.
    const reconciledLocations = result.current.activePublication?.locations ?? [];

    await act(async () => {
      await result.current.updateLocations(reconciledLocations.map((location) => ({ ...location })) as LocationEntity[]);
    });

    // The already-persisted location was not created a second time.
    expect(mocks.createLocation).toHaveBeenCalledTimes(1);
  });

  it('does not delete the canonical location when promoting its replacement fails', async () => {
    const error = new Error('Canonical location error');
    mocks.updateLocation.mockRejectedValueOnce(error);

    const { result } = renderEditPublication();

    await expect(result.current.deleteLocation('loc-1')).rejects.toBe(error);

    expect(mocks.deleteLocationMutation).not.toHaveBeenCalled();
  });
});

describe('useEditPublication field updates', () => {
  beforeEach(() => {
    mocks.publication.isbn = '978-3-16-148410-0';
    mocks.publication.type = 'PAPERBACK';
    mocks.publication.width = 100;
    mocks.publication.accessibilityStandard = null;
    mocks.publication.accessibilityAdditionalStandard = null;
    mocks.updatePublication.mockReset().mockResolvedValue({});
  });

  it('useEditPublication_doesNotStageIsbnAfterFailedUpdate', async () => {
    const error = new Error('Update failed');
    mocks.updatePublication.mockRejectedValueOnce(error);

    const { result } = renderEditPublication();

    await act(async () => {
      await expect(result.current.updateIsbn('978-1-4028-9462-6')).rejects.toBe(error);
    });

    // The mutation rejected, so the unsaved ISBN must not be staged into local state.
    expect(result.current.activePublication?.isbn).toBe('978-3-16-148410-0');
  });

  it('useEditPublication_stagesIsbnAfterSuccessfulUpdate', async () => {
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.updateIsbn('978-1-4028-9462-6');
    });

    expect(mocks.updatePublication).toHaveBeenCalledWith(expect.objectContaining({ isbn: '978-1-4028-9462-6' }));
    expect(result.current.activePublication?.isbn).toBe('978-1-4028-9462-6');
  });

  it('useEditPublication_doesNotStageDimensionsAfterFailedUpdate', async () => {
    mocks.updatePublication.mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderEditPublication();

    await act(async () => {
      await expect(
        result.current.updateSizes({ widthMm: 999 } as never),
      ).rejects.toThrow('Update failed');
    });

    expect(result.current.activePublication?.width).toBe(100);
  });

  it('useEditPublication_doesNotStageTypeAfterFailedUpdate', async () => {
    mocks.updatePublication.mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderEditPublication();

    await act(async () => {
      await expect(result.current.updateType('HARDBACK' as never)).rejects.toThrow('Update failed');
    });

    expect(result.current.activePublication?.type).toBe('PAPERBACK');
  });

  it('useEditPublication_doesNotStageAccessibilityAfterFailedUpdate', async () => {
    mocks.updatePublication.mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderEditPublication();

    await act(async () => {
      await expect(
        result.current.updateAccessibility({ accessibilityReportUrl: 'https://a11y.example.com' } as never),
      ).rejects.toThrow('Update failed');
    });

    expect(result.current.activePublication?.accessibilityReportUrl).toBeUndefined();
  });

  it('useEditPublication_stagesPrimaryAndAdditionalAccessibilityStandardsAfterSuccessfulUpdate', async () => {
    mocks.publication.type = 'PDF';
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.updateAccessibility({
        accessibilityStandard: [AccessibilityStandard.Wcag21Aa, AccessibilityStandard.PdfUa1],
        accessibilityReportUrl: '',
      });
    });

    expect(mocks.updatePublication).toHaveBeenCalledWith(
      expect.objectContaining({
        accessibilityStandard: AccessibilityStandard.Wcag21Aa,
        accessibilityAdditionalStandard: AccessibilityStandard.PdfUa1,
      }),
    );
    expect(result.current.activePublication?.accessibilityStandard).toBe(AccessibilityStandard.Wcag21Aa);
    expect(result.current.activePublication?.accessibilityAdditionalStandard).toBe(AccessibilityStandard.PdfUa1);
  });
});

const priceRow = (priceId: string, currency: string, priceValue: number) => ({
  priceId,
  currency: { value: currency as CurrencyCode, label: currency },
  priceValue,
});

describe('useEditPublication updatePrices', () => {
  beforeEach(() => {
    mocks.publication.prices = [mocks.gbpPrice, mocks.usdPrice];
    mocks.updatePrice.mockReset().mockResolvedValue({});
    mocks.createPrice.mockReset().mockResolvedValue({ id: 'price-3' });
    mocks.deletePrice.mockReset().mockResolvedValue({});
  });

  it('updates an edited price by its id', async () => {
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.updatePrices({
        prices: [priceRow('price-1', 'GBP', 27.5), priceRow('price-2', 'USD', 30)],
      });
    });

    expect(mocks.updatePrice).toHaveBeenCalledTimes(1);
    expect(mocks.updatePrice).toHaveBeenCalledWith({
      id: 'price-1',
      currencyCode: 'GBP',
      unitPrice: 27.5,
      publicationId: 'pub-1',
    });
    expect(mocks.createPrice).not.toHaveBeenCalled();
    expect(mocks.deletePrice).not.toHaveBeenCalled();
  });

  it('sends nothing when the submitted prices are unchanged', async () => {
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.updatePrices({
        prices: [priceRow('price-1', 'GBP', 25), priceRow('price-2', 'USD', 30)],
      });
    });

    expect(mocks.updatePrice).not.toHaveBeenCalled();
    expect(mocks.createPrice).not.toHaveBeenCalled();
    expect(mocks.deletePrice).not.toHaveBeenCalled();
  });

  it('creates a new row even when its currency matches an existing price', async () => {
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.updatePrices({
        prices: [
          priceRow('price-1', 'GBP', 25),
          priceRow('price-2', 'USD', 30),
          priceRow('0000-0000-0000-0000-3', 'GBP', 20),
        ],
      });
    });

    expect(mocks.updatePrice).not.toHaveBeenCalled();
    expect(mocks.createPrice).toHaveBeenCalledTimes(1);
    expect(mocks.createPrice.mock.calls[0][0]).toMatchObject({ currencyCode: 'GBP', unitPrice: 20 });
  });

  it('deletes the removed row, not the row that took over its currency', async () => {
    const { result } = renderEditPublication();

    // The USD row is removed and the GBP row is switched to USD.
    await act(async () => {
      await result.current.updatePrices({
        prices: [priceRow('price-1', 'USD', 25)],
      });
    });

    expect(mocks.deletePrice).toHaveBeenCalledTimes(1);
    expect(mocks.deletePrice).toHaveBeenCalledWith('price-2');
    expect(mocks.updatePrice).toHaveBeenCalledWith({
      id: 'price-1',
      currencyCode: 'USD',
      unitPrice: 25,
      publicationId: 'pub-1',
    });
  });

  it('useEditPublication_preservesSuccessfulPriceSaveBehaviour', async () => {
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.updatePrices({
        prices: [
          priceRow('price-1', 'GBP', 27.5),
          priceRow('0000-0000-0000-0000-3', 'EUR', 22),
        ],
      });
    });

    expect(mocks.updatePrice).toHaveBeenCalledWith({
      id: 'price-1',
      currencyCode: 'GBP',
      unitPrice: 27.5,
      publicationId: 'pub-1',
    });
    expect(mocks.createPrice).toHaveBeenCalledWith({
      id: '0000-0000-0000-0000-3',
      currencyCode: 'EUR',
      unitPrice: 22,
      publicationId: 'pub-1',
    });
    expect(mocks.deletePrice).toHaveBeenCalledWith('price-2');
    expect(result.current.activePublication?.prices).toEqual([
      { id: 'price-1', currencyCode: 'GBP', unitPrice: 27.5 },
      { id: 'price-3', currencyCode: 'EUR', unitPrice: 22 },
    ]);
    expect(result.current.priceFormVersion).toBe(0);
  });

  it('useEditPublication_preservesCreatedPriceIdsAfterPartialPriceSaveFailure', async () => {
    const error = new Error('Delete failed');
    mocks.deletePrice.mockRejectedValueOnce(error);

    const { result } = renderEditPublication();

    await act(async () => {
      await expect(
        result.current.updatePrices({
          prices: [priceRow('price-1', 'GBP', 25), priceRow('0000-0000-0000-0000-3', 'EUR', 22)],
        }),
      ).rejects.toBe(error);
    });

    expect(result.current.activePublication?.prices).toEqual([
      mocks.gbpPrice,
      mocks.usdPrice,
      { id: 'price-3', currencyCode: 'EUR', unitPrice: 22 },
    ]);
    expect(result.current.priceFormVersion).toBe(1);
  });

  it('useEditPublication_doesNotDuplicateCreatedPriceOnRetryAfterPartialFailure', async () => {
    mocks.deletePrice.mockRejectedValueOnce(new Error('Delete failed'));

    const { result } = renderEditPublication();

    await act(async () => {
      await expect(
        result.current.updatePrices({
          prices: [priceRow('price-1', 'GBP', 25), priceRow('0000-0000-0000-0000-3', 'EUR', 22)],
        }),
      ).rejects.toThrow('Delete failed');
    });

    const reconciledPrices = result.current.activePublication?.prices ?? [];

    await act(async () => {
      await result.current.updatePrices({
        prices: reconciledPrices.map(({ id, currencyCode, unitPrice }) => priceRow(id, currencyCode, unitPrice)),
      });
    });

    expect(mocks.createPrice).toHaveBeenCalledTimes(1);
    expect(mocks.updatePrice).not.toHaveBeenCalled();
    expect(mocks.deletePrice).toHaveBeenCalledTimes(1);
  });

  it('useEditPublication_rethrowsPriceMutationFailure', async () => {
    const error = new Error('Update failed');
    mocks.updatePrice.mockRejectedValueOnce(error);

    const { result } = renderEditPublication();

    await expect(
      result.current.updatePrices({
        prices: [priceRow('price-1', 'GBP', 99), priceRow('price-2', 'USD', 30)],
      }),
    ).rejects.toBe(error);

    expect(result.current.activePublication?.prices).toEqual([mocks.gbpPrice, mocks.usdPrice]);
    expect(result.current.priceFormVersion).toBe(0);
  });
});
