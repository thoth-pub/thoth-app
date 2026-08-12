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
  const eurPrice = { id: 'price-3', currencyCode: 'EUR', unitPrice: 35 };

  const publication = {
    id: 'pub-1',
    isbn: '978-3-16-148410-0',
    prices: [gbpPrice, usdPrice],
    locations: [canonicalLocation, otherLocation],
    accessibilityStandard: null,
    accessibilityAdditionalStandard: null,
    fileUrl: 'https://cdn.example.org/old.pdf',
  };

  return {
    canonicalLocation,
    otherLocation,
    gbpPrice,
    usdPrice,
    eurPrice,
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
    uploadPublicationFile: vi.fn().mockResolvedValue('https://cdn.example.org/new.pdf'),
    activeLocation: null as LocationEntity | null,
    reconcileActiveLocation: vi.fn(),
    // Each mutation hook's pending flag, mirroring react-query's `isPending`, so a test can
    // hold one mutation in flight and observe the aggregate busy state it contributes to.
    loading: {
      updatePublication: false,
      createPrice: false,
      updatePrice: false,
      deletePrice: false,
      createLocation: false,
      updateLocation: false,
      deleteLocation: false,
      uploadPublicationFile: false,
    },
  };
});

vi.mock('@/src/entities/locations', () => ({
  useCreateLocation: () => ({ createLocation: mocks.createLocation, loading: mocks.loading.createLocation }),
  useUpdateLocation: () => ({ updateLocation: mocks.updateLocation, loading: mocks.loading.updateLocation }),
  useDeleteLocation: () => ({ deleteLocation: mocks.deleteLocationMutation, loading: mocks.loading.deleteLocation }),
}));

vi.mock('@/src/entities/locations/store/location.store', () => ({
  useLocationStateMachine: () => ({ activeEntity: mocks.activeLocation, update: mocks.reconcileActiveLocation }),
}));

vi.mock('@/src/entities/price', () => ({
  useCreatePrice: () => ({ createPrice: mocks.createPrice, loading: mocks.loading.createPrice }),
  useUpdatePrice: () => ({ updatePrice: mocks.updatePrice, loading: mocks.loading.updatePrice }),
  useDeletePrice: () => ({ deletePrice: mocks.deletePrice, loading: mocks.loading.deletePrice }),
}));

vi.mock('@/src/entities/publication', () => ({
  usePublicationsStateMachine: () => ({ activeEntity: mocks.publication, finishEditing: vi.fn() }),
  useUpdatePublication: () => ({
    updatePublication: mocks.updatePublication,
    loading: mocks.loading.updatePublication,
  }),
  useUploadPublicationFile: () => ({
    uploadPublicationFile: mocks.uploadPublicationFile,
    loading: mocks.loading.uploadPublicationFile,
    progress: 0,
  }),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({ work: mocks.work }),
}));

vi.mock('@/src/shared/hooks', () => ({
  useDefaultCurrencyOption: () => undefined,
}));

const renderEditPublication = () => renderHook(() => useEditPublication({ workId: 'work-1' }));

const idleLoading = () => ({
  updatePublication: false,
  createPrice: false,
  updatePrice: false,
  deletePrice: false,
  createLocation: false,
  updateLocation: false,
  deleteLocation: false,
  uploadPublicationFile: false,
});

// A promise the test resolves by hand, so a mutation can be held pending without timers.
const createDeferred = () => {
  let resolve!: (value?: unknown) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
};

beforeEach(() => {
  mocks.loading = idleLoading();
});

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
      await result.current.updateLocations(
        reconciledLocations.map((location) => ({ ...location })) as LocationEntity[],
      );
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
    mocks.uploadPublicationFile.mockReset().mockResolvedValue('https://cdn.example.org/new.pdf');
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
      await expect(result.current.updateSizes({ widthMm: 999 } as never)).rejects.toThrow('Update failed');
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

  it('reconciles the canonical URL returned by a successful replacement immediately', async () => {
    const { result } = renderEditPublication();
    const file = new File([new Uint8Array(7000)], 'replacement.pdf', { type: 'application/pdf' });

    await act(async () => {
      await result.current.updateFile(file);
    });

    expect(mocks.uploadPublicationFile).toHaveBeenCalledWith(mocks.publication.id, file);
    expect(result.current.activePublication?.fileUrl).toBe('https://cdn.example.org/new.pdf');
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
        prices: [priceRow('price-1', 'GBP', 27.5), priceRow('0000-0000-0000-0000-3', 'EUR', 22)],
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

describe('useEditPublication upload lock', () => {
  beforeEach(() => {
    mocks.publication.prices = [mocks.gbpPrice, mocks.usdPrice];
    mocks.publication.locations = [mocks.canonicalLocation, mocks.otherLocation];
    mocks.updatePrice.mockReset().mockResolvedValue({});
    mocks.createPrice.mockReset().mockResolvedValue({ id: 'price-3' });
    mocks.deletePrice.mockReset().mockResolvedValue({});
    mocks.updateLocation.mockReset().mockResolvedValue({});
    mocks.createLocation.mockReset().mockResolvedValue({ id: 'loc-3' });
    mocks.deleteLocationMutation.mockReset().mockResolvedValue({});
    mocks.activeLocation = null;
  });

  it('useEditPublication_reportsBusyWhileOnlyAPriceDeletionIsPending', () => {
    // A pure price deletion leaves every create/update flag false.
    mocks.loading.deletePrice = true;

    const { result } = renderEditPublication();

    expect(result.current.loading).toBe(true);
  });

  it('useEditPublication_reportsBusyWhileOnlyALocationDeletionIsPending', () => {
    mocks.loading.deleteLocation = true;

    const { result } = renderEditPublication();

    expect(result.current.loading).toBe(true);
    // The same flag still drives the location row's own delete indicator.
    expect(result.current.deleteLocationLoading).toBe(true);
  });

  it('useEditPublication_keepsDeleteLocationLoadingIndependentOfOtherMutations', () => {
    mocks.loading.updatePublication = true;

    const { result } = renderEditPublication();

    expect(result.current.loading).toBe(true);
    expect(result.current.deleteLocationLoading).toBe(false);
  });

  it('useEditPublication_doesNotPresentAnUploadWhileOnlyADeletionIsPending', () => {
    mocks.loading.deletePrice = true;
    mocks.loading.deleteLocation = true;

    const { result } = renderEditPublication();

    expect(result.current.loading).toBe(true);
    // Only the upload mutation may drive the upload spinner and its progress.
    expect(result.current.fileUploadLoading).toBe(false);
  });

  it('useEditPublication_isIdleWhenNoMutationIsPending', () => {
    const { result } = renderEditPublication();

    expect(result.current.loading).toBe(false);
    expect(result.current.deleteLocationLoading).toBe(false);
    expect(result.current.fileUploadLoading).toBe(false);
  });

  it('useEditPublication_staysBusyForTheWholePendingPriceDeletion', async () => {
    const pendingDeletion = createDeferred();
    mocks.deletePrice.mockImplementationOnce(() => {
      mocks.loading.deletePrice = true;

      return pendingDeletion.promise;
    });

    const { result, rerender } = renderEditPublication();

    expect(result.current.loading).toBe(false);

    let submission!: Promise<void>;

    act(() => {
      submission = result.current.updatePrices({ prices: [priceRow('price-1', 'GBP', 25)] });
    });

    // Nothing but the deletion is in flight, so no other flag can mask the gap.
    expect(mocks.createPrice).not.toHaveBeenCalled();
    expect(mocks.updatePrice).not.toHaveBeenCalled();
    expect(mocks.deletePrice).toHaveBeenCalledWith('price-2');

    rerender();

    // The file field stays locked for the whole delete request, so no upload can land
    // before the snapshot setter below restages the pre-deletion publication.
    expect(result.current.loading).toBe(true);
    expect(result.current.fileUploadLoading).toBe(false);

    await act(async () => {
      mocks.loading.deletePrice = false;
      pendingDeletion.resolve();
      await submission;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.activePublication?.prices).toEqual([mocks.gbpPrice]);
  });

  it('useEditPublication_staysBusyUntilEveryDeletionInAPriceBatchSettles', async () => {
    const firstDeletion = createDeferred();
    const lastStartedDeletion = createDeferred();
    mocks.publication.prices = [mocks.gbpPrice, mocks.usdPrice, mocks.eurPrice];
    mocks.deletePrice
      .mockImplementationOnce(() => {
        mocks.loading.deletePrice = true;

        return firstDeletion.promise;
      })
      .mockImplementationOnce(() => {
        mocks.loading.deletePrice = true;

        return lastStartedDeletion.promise;
      });

    const { result, rerender } = renderEditPublication();
    let submission!: Promise<void>;
    let submissionSettled = false;

    act(() => {
      submission = result.current.updatePrices({ prices: [priceRow('price-1', 'GBP', 25)] });
      void submission.finally(() => {
        submissionSettled = true;
      });
    });

    expect(mocks.deletePrice.mock.calls).toEqual([['price-2'], ['price-3']]);
    expect(mocks.createPrice).not.toHaveBeenCalled();
    expect(mocks.updatePrice).not.toHaveBeenCalled();

    await act(async () => {
      // TanStack's observer follows the last-started mutation. Model it becoming
      // idle when that deletion settles, while the earlier deletion stays pending.
      mocks.loading.deletePrice = false;
      lastStartedDeletion.resolve();
      await lastStartedDeletion.promise;
    });
    rerender();

    expect(submissionSettled).toBe(false);
    expect(result.current.loading).toBe(true);
    expect(result.current.fileUploadLoading).toBe(false);

    await act(async () => {
      firstDeletion.resolve();
      await submission;
    });

    expect(submissionSettled).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.activePublication?.prices).toEqual([mocks.gbpPrice]);
  });

  it('useEditPublication_clearsPriceBatchBusyStateAfterPartialFailure', async () => {
    const successfulDeletion = createDeferred();
    const failedDeletion = createDeferred();
    const error = new Error('EUR deletion failed');
    mocks.publication.prices = [mocks.gbpPrice, mocks.usdPrice, mocks.eurPrice];
    mocks.deletePrice
      .mockImplementationOnce(() => successfulDeletion.promise)
      .mockImplementationOnce(() => failedDeletion.promise);

    const { result } = renderEditPublication();
    let submission!: Promise<void>;

    act(() => {
      submission = result.current.updatePrices({ prices: [priceRow('price-1', 'GBP', 25)] });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      failedDeletion.reject(error);
      await expect(failedDeletion.promise).rejects.toBe(error);
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      successfulDeletion.resolve();
      await expect(submission).rejects.toBe(error);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.activePublication?.prices).toEqual([mocks.gbpPrice, mocks.eurPrice]);
    expect(result.current.priceFormVersion).toBe(0);
  });

  it('useEditPublication_staysBusyForTheFinalLocationDeletionRequest', async () => {
    const pendingDeletion = createDeferred();
    mocks.deleteLocationMutation.mockImplementationOnce(() => {
      mocks.loading.deleteLocation = true;

      return pendingDeletion.promise;
    });

    const { result, rerender } = renderEditPublication();

    let submission!: Promise<void>;

    await act(async () => {
      submission = result.current.deleteLocation('loc-2');
    });

    // Deleting a non-canonical location needs no reassignment, so the create and update
    // flags are false for the whole final deletion request.
    expect(mocks.createLocation).not.toHaveBeenCalled();
    expect(mocks.updateLocation).not.toHaveBeenCalled();
    expect(mocks.deleteLocationMutation).toHaveBeenCalledWith('loc-2');

    rerender();

    expect(result.current.loading).toBe(true);
    expect(result.current.deleteLocationLoading).toBe(true);
    expect(result.current.fileUploadLoading).toBe(false);

    await act(async () => {
      mocks.loading.deleteLocation = false;
      pendingDeletion.resolve();
      await submission;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.activePublication?.locations).toEqual([mocks.canonicalLocation]);
  });
});
