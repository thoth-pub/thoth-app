/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { ThemeProvider } from '@mui/material';
import { act, cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

import EditPublication from './EditPublication';

// Unlike EditPublication.test.tsx, this suite keeps the real useEditPublication so the
// lock is proven end to end: a pending deletion mutation must reach the file field
// through the hook's aggregate busy state, not through a hand-written mock value.
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
    type: 'PDF',
    isbn: '978-3-16-148410-0',
    width: 0,
    widthIn: 0,
    height: 0,
    heightIn: 0,
    depth: 0,
    depthIn: 0,
    weight: 0,
    weightOz: 0,
    accessibilityStandard: null,
    accessibilityAdditionalStandard: null,
    accessibilityException: null,
    accessibilityReportUrl: '',
    fileUrl: '',
    prices: [
      { id: 'price-1', currencyCode: 'GBP', unitPrice: 25 },
      { id: 'price-2', currencyCode: 'USD', unitPrice: 30 },
      { id: 'price-3', currencyCode: 'EUR', unitPrice: 35 },
    ],
    locations: [canonicalLocation, otherLocation],
  };

  return {
    canonicalLocation,
    otherLocation,
    publication,
    work: { imprintId: 'imprint-1', publications: [publication] },
    createPrice: vi.fn().mockResolvedValue({ id: 'price-3' }),
    updatePrice: vi.fn().mockResolvedValue({}),
    deletePrice: vi.fn().mockResolvedValue({}),
    createLocation: vi.fn().mockResolvedValue({ id: 'loc-3' }),
    updateLocation: vi.fn().mockResolvedValue({}),
    deleteLocationMutation: vi.fn().mockResolvedValue({}),
    updatePublication: vi.fn().mockResolvedValue({}),
    uploadPublicationFile: vi.fn().mockResolvedValue('https://cdn.example.org/new.pdf'),
    sendErrorNotification: vi.fn(),
    // The pending flags each mutation hook exposes, mirroring react-query's `isPending`.
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
    uploadProgress: null as number | null,
  };
});

// A minimal location list: it exposes the delete-loading value it receives, so the
// location-specific indicator stays observable alongside the aggregate lock, and a
// button that deletes the non-canonical location through the real hook flow.
vi.mock('@/src/entities/locations', () => ({
  EditLocations: ({ deleteLoading, onDelete }: { deleteLoading?: boolean; onDelete?: (id: string) => void }) => (
    <div data-testid="locations-field">
      delete-loading:{String(!!deleteLoading)}
      <button type="button" onClick={() => onDelete?.('loc-2')}>
        delete-location
      </button>
    </div>
  ),
  useCreateLocation: () => ({ createLocation: mocks.createLocation, loading: mocks.loading.createLocation }),
  useUpdateLocation: () => ({ updateLocation: mocks.updateLocation, loading: mocks.loading.updateLocation }),
  useDeleteLocation: () => ({ deleteLocation: mocks.deleteLocationMutation, loading: mocks.loading.deleteLocation }),
}));

vi.mock('@/src/entities/locations/store/location.store', () => ({
  useLocationStateMachine: () => ({ activeEntity: null, update: vi.fn() }),
}));

// A minimal price form: submitting resends only the GBP row, so the USD row is removed
// and the hook runs a deletion with no create or update mutation alongside it.
vi.mock('@/src/entities/price', () => ({
  EditPrice: ({
    prices,
    onUpdate,
  }: {
    prices?: { currencyCode: string }[];
    onUpdate?: (data: { prices: unknown[] }) => void;
  }) => (
    <div data-testid="price-field">
      <span data-testid="price-currencies">{prices?.map(({ currencyCode }) => currencyCode).join(',')}</span>
      <button
        type="button"
        onClick={() =>
          onUpdate?.({ prices: [{ priceId: 'price-1', currency: { value: 'GBP', label: 'GBP' }, priceValue: 25 }] })
        }
      >
        delete-price
      </button>
    </div>
  ),
  useCreatePrice: () => ({ createPrice: mocks.createPrice, loading: mocks.loading.createPrice }),
  useUpdatePrice: () => ({ updatePrice: mocks.updatePrice, loading: mocks.loading.updatePrice }),
  useDeletePrice: () => ({ deletePrice: mocks.deletePrice, loading: mocks.loading.deletePrice }),
}));

// The entity form, HostedFileField and FileDropzone stay real so browse and drop are
// exercised through the actual interaction rather than through prop assertions.
vi.mock('@/src/entities/publication', async () => {
  const actual = await vi.importActual<typeof import('@/src/entities/publication')>('@/src/entities/publication');

  return {
    ...actual,
    usePublicationsStateMachine: () => ({ activeEntity: mocks.publication, finishEditing: vi.fn() }),
    useUpdatePublication: () => ({
      updatePublication: mocks.updatePublication,
      loading: mocks.loading.updatePublication,
    }),
    useUploadPublicationFile: () => ({
      uploadPublicationFile: mocks.uploadPublicationFile,
      loading: mocks.loading.uploadPublicationFile,
      progress: mocks.uploadProgress,
    }),
  };
});

vi.mock('@/src/entities/work', () => ({
  useWork: () => ({ work: mocks.work }),
}));

vi.mock('@/src/entities/user', () => ({ useUser: () => ({ user: { isSuperuser: true } }) }));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: () => ({
    sendError: vi.fn(),
    sendSuccess: vi.fn(),
    sendErrorNotification: mocks.sendErrorNotification,
  }),
  useT: () => (key: string) => key,
  useTypedTranslation: () => ({ t: (key: string) => key }),
  useDefaultCurrencyOption: () => undefined,
  useEscapeKey: vi.fn(),
  useIsDesktop: () => true,
}));

vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({
    t: (key: string, options?: Record<string, string | number>) =>
      options?.progress === undefined ? key : `${key}:${options.progress}`,
  }),
}));

// A promise the test resolves by hand, so a mutation can be held pending without timers.
const createDeferred = () => {
  let resolve!: (value?: unknown) => void;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

const validFile = new File([new Uint8Array(7000)], 'publication.pdf', { type: 'application/pdf' });

const editPublicationTree = () => (
  <ThemeProvider theme={theme}>
    <EditPublication workId="work-1" isDimensionFormHidden={false} isUploadFileFormDisabled={false} />
  </ThemeProvider>
);

const renderEditPublication = () => render(editPublicationTree());

const getFileInput = () => screen.getByTestId('hosted-file-field').querySelector('input[type="file"]')!;
const getDropzone = () => screen.getByTestId('hosted-file-field').querySelector('[data-drag-active]')!;

const dropFile = (file: File) => {
  const dropzone = getDropzone();
  const dropEvent = createEvent.drop(dropzone);
  Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });
  fireEvent(dropzone, dropEvent);

  return dropEvent;
};

const expectFileInteractionLocked = () => {
  expect(getFileInput()).toBeDisabled();
  expect(screen.getByRole('button', { name: /fileUpload.browse/i })).toBeDisabled();

  fireEvent.change(getFileInput(), { target: { files: [validFile] } });

  const dropEvent = dropFile(validFile);

  // The dropzone still swallows the drop so the browser does not navigate to the file.
  expect(dropEvent.defaultPrevented).toBe(true);
  expect(mocks.uploadPublicationFile).not.toHaveBeenCalled();
};

const expectNoUploadPresentation = () => {
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByText('fileUpload.uploading')).toBeNull();
  expect(screen.getByText('fileUpload.instructions')).toBeDefined();
};

describe('EditPublication file upload locking during deletions', () => {
  beforeEach(() => {
    mocks.publication.prices = [
      { id: 'price-1', currencyCode: 'GBP', unitPrice: 25 },
      { id: 'price-2', currencyCode: 'USD', unitPrice: 30 },
    ];
    mocks.publication.locations = [mocks.canonicalLocation, mocks.otherLocation];
    mocks.loading = {
      updatePublication: false,
      createPrice: false,
      updatePrice: false,
      deletePrice: false,
      createLocation: false,
      updateLocation: false,
      deleteLocation: false,
      uploadPublicationFile: false,
    };
    mocks.uploadProgress = null;
    mocks.createPrice.mockReset().mockResolvedValue({ id: 'price-3' });
    mocks.updatePrice.mockReset().mockResolvedValue({});
    mocks.deletePrice.mockReset().mockResolvedValue({});
    mocks.createLocation.mockReset().mockResolvedValue({ id: 'loc-3' });
    mocks.updateLocation.mockReset().mockResolvedValue({});
    mocks.deleteLocationMutation.mockReset().mockResolvedValue({});
    mocks.uploadPublicationFile.mockReset().mockResolvedValue('https://cdn.example.org/new.pdf');
    mocks.sendErrorNotification.mockReset();
  });

  afterEach(cleanup);

  it('EditPublication_allowsBrowseAndDropWhileIdle', async () => {
    renderEditPublication();

    expect(getFileInput()).not.toBeDisabled();

    fireEvent.change(getFileInput(), { target: { files: [validFile] } });

    await waitFor(() => expect(mocks.uploadPublicationFile).toHaveBeenCalledWith('pub-1', validFile));
  });

  it('EditPublication_locksFileInteractionWhileAPriceDeletionIsPending', () => {
    mocks.loading.deletePrice = true;
    renderEditPublication();

    expectFileInteractionLocked();
    // A pure price deletion runs no create or update mutation, so only the delete flag
    // can keep the field locked.
    expectNoUploadPresentation();
  });

  it('EditPublication_locksFileInteractionWhileALocationDeletionIsPending', () => {
    mocks.loading.deleteLocation = true;
    renderEditPublication();

    expectFileInteractionLocked();
    expectNoUploadPresentation();
  });

  it('EditPublication_keepsTheLocationDeleteIndicatorWhileLockingTheFileField', () => {
    mocks.loading.deleteLocation = true;
    renderEditPublication();

    // The same flag must still reach the location list's own delete indicator.
    expect(screen.getByTestId('locations-field')).toHaveTextContent('delete-loading:true');
    expect(getFileInput()).toBeDisabled();
  });

  it('EditPublication_leavesTheLocationDeleteIndicatorIdleForOtherMutations', () => {
    mocks.loading.deletePrice = true;
    renderEditPublication();

    expect(screen.getByTestId('locations-field')).toHaveTextContent('delete-loading:false');
    expect(getFileInput()).toBeDisabled();
  });

  it('EditPublication_presentsTheUploadOnlyForTheUploadMutation', () => {
    mocks.loading.deletePrice = true;
    mocks.loading.deleteLocation = true;
    mocks.loading.uploadPublicationFile = true;
    mocks.uploadProgress = 42;
    renderEditPublication();

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('fileUpload.uploadingProgress:42')).toBeDefined();
  });

  it('EditPublication_locksTheFileFieldForTheWholePendingPriceDeletion', async () => {
    const pendingDeletion = createDeferred();
    mocks.deletePrice.mockImplementationOnce(() => {
      mocks.loading.deletePrice = true;

      return pendingDeletion.promise;
    });

    const { rerender } = renderEditPublication();

    expect(getFileInput()).not.toBeDisabled();

    // Resubmit the prices without the USD row: a deletion and nothing else.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'delete-price' }));
    });

    expect(mocks.deletePrice).toHaveBeenCalledWith('price-2');
    expect(mocks.createPrice).not.toHaveBeenCalled();
    expect(mocks.updatePrice).not.toHaveBeenCalled();

    // react-query re-renders subscribers when a mutation turns pending; the stubbed hooks
    // only flip a flag, so the render it would have caused is triggered here.
    rerender(editPublicationTree());

    // The field is locked for the whole delete request, so no upload can start before the
    // hook's snapshot setter restages the publication captured before the deletion.
    expectFileInteractionLocked();
    expectNoUploadPresentation();

    await act(async () => {
      mocks.loading.deletePrice = false;
      pendingDeletion.resolve();
      await pendingDeletion.promise;
    });

    rerender(editPublicationTree());

    await waitFor(() => expect(getFileInput()).not.toBeDisabled());
  });

  it('EditPublication_keepsFileInteractionLockedUntilEveryPriceDeletionSettles', async () => {
    const firstDeletion = createDeferred();
    const lastStartedDeletion = createDeferred();
    mocks.publication.prices = [
      { id: 'price-1', currencyCode: 'GBP', unitPrice: 25 },
      { id: 'price-2', currencyCode: 'USD', unitPrice: 30 },
      { id: 'price-3', currencyCode: 'EUR', unitPrice: 35 },
    ];
    mocks.deletePrice
      .mockImplementationOnce(() => {
        mocks.loading.deletePrice = true;

        return firstDeletion.promise;
      })
      .mockImplementationOnce(() => {
        mocks.loading.deletePrice = true;

        return lastStartedDeletion.promise;
      });

    const { rerender } = renderEditPublication();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'delete-price' }));
    });

    expect(mocks.deletePrice.mock.calls).toEqual([['price-2'], ['price-3']]);

    await act(async () => {
      // Model the mutation observer becoming idle when the last-started deletion
      // settles even though the first deletion is still unresolved.
      mocks.loading.deletePrice = false;
      lastStartedDeletion.resolve();
      await lastStartedDeletion.promise;
    });
    rerender(editPublicationTree());

    expectFileInteractionLocked();
    expectNoUploadPresentation();

    await act(async () => {
      firstDeletion.resolve();
      await firstDeletion.promise;
    });

    await waitFor(() => expect(getFileInput()).not.toBeDisabled());
    expect(screen.getByTestId('price-currencies')).toHaveTextContent('GBP');
    expect(mocks.uploadPublicationFile).not.toHaveBeenCalled();
  });

  it('EditPublication_locksTheFileFieldForTheFinalLocationDeletionRequest', async () => {
    const pendingDeletion = createDeferred();
    mocks.deleteLocationMutation.mockImplementationOnce(() => {
      mocks.loading.deleteLocation = true;

      return pendingDeletion.promise;
    });

    const { rerender } = renderEditPublication();

    expect(getFileInput()).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'delete-location' }));
    });

    // Deleting a non-canonical location needs no reassignment, so the create and update
    // flags are false for the whole final deletion request.
    expect(mocks.deleteLocationMutation).toHaveBeenCalledWith('loc-2');
    expect(mocks.createLocation).not.toHaveBeenCalled();
    expect(mocks.updateLocation).not.toHaveBeenCalled();

    // react-query re-renders subscribers when a mutation turns pending; the stubbed hooks
    // only flip a flag, so the render it would have caused is triggered here.
    rerender(editPublicationTree());

    expectFileInteractionLocked();
    expectNoUploadPresentation();
    expect(screen.getByTestId('locations-field')).toHaveTextContent('delete-loading:true');

    await act(async () => {
      mocks.loading.deleteLocation = false;
      pendingDeletion.resolve();
      await pendingDeletion.promise;
    });

    rerender(editPublicationTree());

    await waitFor(() => expect(getFileInput()).not.toBeDisabled());
  });
});
