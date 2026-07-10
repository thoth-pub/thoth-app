/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  };
});

vi.mock('@/src/entities/locations', () => ({
  useCreateLocation: () => ({ createLocation: mocks.createLocation, loading: false }),
  useUpdateLocation: () => ({ updateLocation: mocks.updateLocation, loading: false }),
  useDeleteLocation: () => ({ deleteLocation: mocks.deleteLocationMutation, loading: false }),
}));

vi.mock('@/src/entities/price', () => ({
  useCreatePrice: () => ({ createPrice: mocks.createPrice, loading: false }),
  useUpdatePrice: () => ({ updatePrice: mocks.updatePrice, loading: false }),
  useDeletePrice: () => ({ deletePrice: mocks.deletePrice, loading: false }),
}));

vi.mock('@/src/entities/publication', () => ({
  usePublicationsStateMachine: () => ({ activeEntity: mocks.publication, finishEditing: vi.fn() }),
  useUpdatePublication: () => ({ updatePublication: vi.fn(), loading: false }),
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

  it('does not delete the canonical location when promoting its replacement fails', async () => {
    const error = new Error('Canonical location error');
    mocks.updateLocation.mockRejectedValueOnce(error);

    const { result } = renderEditPublication();

    await expect(result.current.deleteLocation('loc-1')).rejects.toBe(error);

    expect(mocks.deleteLocationMutation).not.toHaveBeenCalled();
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
    mocks.updatePrice.mockClear();
    mocks.createPrice.mockClear();
    mocks.deletePrice.mockClear();
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

  it('stores the server id of a created price so a re-edit before the refetch updates it', async () => {
    const { result } = renderEditPublication();

    await act(async () => {
      await result.current.updatePrices({
        prices: [
          priceRow('price-1', 'GBP', 25),
          priceRow('price-2', 'USD', 30),
          priceRow('0000-0000-0000-0000-3', 'EUR', 22),
        ],
      });
    });

    expect(result.current.activePublication?.prices).toContainEqual(expect.objectContaining({ id: 'price-3' }));
  });

  it('rejects and keeps local state on the persisted values when a mutation fails', async () => {
    const error = new Error('Update failed');
    mocks.updatePrice.mockRejectedValueOnce(error);

    const { result } = renderEditPublication();

    await expect(
      result.current.updatePrices({
        prices: [priceRow('price-1', 'GBP', 99), priceRow('price-2', 'USD', 30)],
      }),
    ).rejects.toBe(error);

    expect(result.current.activePublication?.prices).toContainEqual(expect.objectContaining({ unitPrice: 25 }));
  });

  it('EditPublication_prices_doNotPreviewUnsavedValues_afterCreatePriceFailure', async () => {
    const error = new Error('Create failed');
    mocks.createPrice.mockRejectedValueOnce(error);

    const { result } = renderEditPublication();

    await expect(
      result.current.updatePrices({
        prices: [
          priceRow('price-1', 'GBP', 25),
          priceRow('price-2', 'USD', 30),
          priceRow('0000-0000-0000-0000-3', 'EUR', 22),
        ],
      }),
    ).rejects.toBe(error);

    expect(result.current.activePublication?.prices).toEqual([mocks.gbpPrice, mocks.usdPrice]);
  });
});
