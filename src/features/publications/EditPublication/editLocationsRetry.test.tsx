/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { ThemeProvider } from '@mui/material';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocationEntity } from '@/src/entities/locations/model/location.types';
// The real location state machine is shared between the hook and the form, so the
// integration exercises the actual open-form active-location reconciliation.
import { LocationStateMachineContext } from '@/src/entities/locations/store/location.store';
import EditLocations from '@/src/entities/locations/ui/EditLocations/EditLocations';
import { FormStateMachineContext } from '@/src/shared/store/forms/forms.provider';
import { theme } from '@/src/shared/theme';

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

  const publication = {
    id: 'pub-1',
    isbn: '978-3-16-148410-0',
    prices: [],
    locations: [canonicalLocation, otherLocation],
  };

  return {
    canonicalLocation,
    otherLocation,
    publication,
    work: { imprintId: 'imprint-1', publications: [publication] },
    createLocation: vi.fn().mockResolvedValue({ id: 'loc-3' }),
    updateLocation: vi.fn().mockResolvedValue({}),
    deleteLocationMutation: vi.fn().mockResolvedValue({}),
  };
});

vi.mock('@/src/entities/locations', () => ({
  useCreateLocation: () => ({ createLocation: mocks.createLocation, loading: false }),
  useUpdateLocation: () => ({ updateLocation: mocks.updateLocation, loading: false }),
  useDeleteLocation: () => ({ deleteLocation: mocks.deleteLocationMutation, loading: false }),
}));

// A minimal LocationForm: submitting sends the given location marked canonical, as a
// user promoting a new location would. This drives the real EditLocations save flow
// without the full autocomplete form.
vi.mock('@/src/entities/locations/ui/LocationForm/LocationForm', () => ({
  LocationForm: ({
    location,
    onSubmit,
  }: {
    location: LocationEntity;
    onSubmit?: (data: LocationEntity) => void;
  }) => (
    <div data-testid="location-form">
      <button type="button" onClick={() => onSubmit?.({ ...location, canonical: true })}>
        submit-location
      </button>
    </div>
  ),
}));

vi.mock('@/src/entities/price', () => ({
  useCreatePrice: () => ({ createPrice: vi.fn(), loading: false }),
  useUpdatePrice: () => ({ updatePrice: vi.fn(), loading: false }),
  useDeletePrice: () => ({ deletePrice: vi.fn() }),
}));

vi.mock('@/src/entities/publication', () => ({
  usePublicationsStateMachine: () => ({ activeEntity: mocks.publication, finishEditing: vi.fn() }),
  useUpdatePublication: () => ({ updatePublication: vi.fn().mockResolvedValue({}), loading: false }),
  useUploadPublicationFile: () => ({ uploadPublicationFile: vi.fn(), loading: false, progress: 0 }),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({ work: mocks.work }),
}));

vi.mock('@/src/shared/hooks', () => ({
  useDefaultCurrencyOption: () => undefined,
  useTypedTranslation: () => ({ t: (key: string) => key }),
  useT: () => (key: string) => key,
  useNotifications: () => ({ sendError: vi.fn(), sendSuccess: vi.fn() }),
  useEscapeKey: vi.fn(),
  useIsDesktop: () => true,
}));

const Harness = () => {
  const { activePublication, updateLocations, deleteLocation, deleteLocationLoading } = useEditPublication({
    workId: 'work-1',
  });

  if (!activePublication) return null;

  return (
    <EditLocations
      locations={activePublication.locations}
      isFullTextUrlHidden={false}
      deleteLoading={deleteLocationLoading}
      onUpdate={updateLocations}
      onDelete={deleteLocation}
    />
  );
};

const renderHarness = () =>
  render(
    <ThemeProvider theme={theme}>
      {/* xstate createActorContext exposes the provider as `.Provider`; it is not a plain React context. */}
      {/* eslint-disable-next-line @eslint-react/no-context-provider */}
      <FormStateMachineContext.Provider>
        {/* eslint-disable-next-line @eslint-react/no-context-provider */}
        <LocationStateMachineContext.Provider>
          <Harness />
        </LocationStateMachineContext.Provider>
      </FormStateMachineContext.Provider>
    </ThemeProvider>,
  );

describe('EditLocations retry after failed canonical promotion', () => {
  beforeEach(() => {
    mocks.publication.locations = [mocks.canonicalLocation, mocks.otherLocation];
    mocks.createLocation.mockReset().mockResolvedValue({ id: 'loc-3' });
    mocks.updateLocation.mockReset().mockResolvedValue({});
    mocks.deleteLocationMutation.mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
  });

  it('EditLocations_doesNotDuplicateCreatedLocationOnRetryAfterPromotionFailure', async () => {
    // The created location persists, but promoting it to canonical fails on the first try.
    mocks.updateLocation.mockRejectedValueOnce(new Error('Canonical promotion failed'));

    const user = userEvent.setup();
    const { getByRole, getByTestId, queryByTestId } = renderHarness();

    // Open the add-location form and submit a new canonical location.
    await user.click(getByRole('button', { name: /actions.addNewLocation/i }));
    await user.click(getByTestId('location-form').querySelector('button')!);

    await waitFor(() => expect(mocks.createLocation).toHaveBeenCalledTimes(1));

    // The promotion rejected, so the form stays open (test 3 behaviour).
    expect(queryByTestId('location-form')).toBeInTheDocument();

    // Retry from the still-open form.
    await user.click(getByTestId('location-form').querySelector('button')!);

    // The already-persisted location must not be created again.
    await waitFor(() => expect(mocks.updateLocation).toHaveBeenCalled());
    expect(mocks.createLocation).toHaveBeenCalledTimes(1);
  });

  it('EditLocations_keepsFormOpenAfterPromotionFailure', async () => {
    mocks.updateLocation.mockRejectedValueOnce(new Error('Canonical promotion failed'));

    const user = userEvent.setup();
    const { getByRole, getByTestId, queryByTestId } = renderHarness();

    await user.click(getByRole('button', { name: /actions.addNewLocation/i }));
    await user.click(getByTestId('location-form').querySelector('button')!);

    await waitFor(() => expect(mocks.createLocation).toHaveBeenCalledTimes(1));

    // The user can still see and edit the location flow after the failure.
    expect(queryByTestId('location-form')).toBeInTheDocument();
  });

  it('EditLocations_fullSuccessAddClosesForm', async () => {
    const user = userEvent.setup();
    const { getByRole, getByTestId, queryByTestId } = renderHarness();

    await user.click(getByRole('button', { name: /actions.addNewLocation/i }));
    await user.click(getByTestId('location-form').querySelector('button')!);

    await waitFor(() => expect(mocks.createLocation).toHaveBeenCalledTimes(1));

    // On full success the form closes and no duplicate create occurs on further renders.
    await waitFor(() => expect(queryByTestId('location-form')).not.toBeInTheDocument());
    expect(mocks.createLocation).toHaveBeenCalledTimes(1);
  });
});
