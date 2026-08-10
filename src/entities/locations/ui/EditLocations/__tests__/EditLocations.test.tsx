import { ThemeProvider } from '@mui/material';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocationPlatform } from '@/gql/graphql';
import type { LocationEntity } from '@/src/entities/locations/model/location.types';
import { theme } from '@/src/shared/theme';

const mocks = vi.hoisted(() => ({
  activeLocation: null as LocationEntity | null,
  activeFormId: null as string | null,
  attentionRequest: 0,
  closeForm: vi.fn(),
  edit: vi.fn(),
  editForm: vi.fn(),
  finishEditing: vi.fn(),
}));

vi.mock('@/src/entities/locations/store/location.store', () => ({
  useLocationStateMachine: vi.fn(() => ({
    activeEntity: mocks.activeLocation,
    edit: mocks.edit,
    finishEditing: mocks.finishEditing,
  })),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({
    activeFormId: mocks.activeFormId,
    attentionRequest: mocks.attentionRequest,
    edit: mocks.editForm,
    closeForm: mocks.closeForm,
  })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
}));

import EditLocations from '../EditLocations';

const mockLocations: LocationEntity[] = [
  {
    id: '1',
    locationPlatform: LocationPlatform.ProjectMuse,
    fullTextUrl: '',
    landingPage: 'https://muse.jhu.edu',
    canonical: true,
  },
];

const newLocation: LocationEntity = {
  id: '0000-0000-0000-0000-2',
  locationPlatform: LocationPlatform.Other,
  fullTextUrl: '',
  landingPage: '',
  canonical: false,
};

const createDeferred = () => {
  let resolve: (value?: unknown) => void = () => {};
  const promise = new Promise<unknown>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditLocations', () => {
  beforeEach(() => {
    mocks.activeLocation = null;
    mocks.activeFormId = null;
    mocks.attentionRequest = 0;
    mocks.closeForm.mockReset();
    mocks.edit.mockReset();
    mocks.editForm.mockReset();
    mocks.editForm.mockReturnValue(true);
    mocks.finishEditing.mockReset();
  });

  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <EditLocations locations={mockLocations} isFullTextUrlHidden={false} onUpdate={vi.fn()} />
      </Wrapper>,
    );
    expect(container).toMatchSnapshot('EditLocations');
  });

  it('renders empty state', () => {
    const { container } = render(
      <Wrapper>
        <EditLocations locations={[]} isFullTextUrlHidden={false} onUpdate={vi.fn()} />
      </Wrapper>,
    );
    expect(container).toMatchSnapshot('EditLocations - empty');
  });

  it('EditLocations_doesNotCloseWhenLocationSaveRejects', async () => {
    const onUpdate = vi.fn().mockRejectedValue(new Error('Location update failed'));
    mocks.activeLocation = mockLocations[0];

    const { container } = render(
      <Wrapper>
        <EditLocations locations={mockLocations} isFullTextUrlHidden={false} onUpdate={onUpdate} />
      </Wrapper>,
    );

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    expect(mocks.finishEditing).not.toHaveBeenCalled();
    expect(mocks.closeForm).not.toHaveBeenCalled();
    expect(container.querySelector('form')).toBeInTheDocument();
  });

  it('EditLocations_handlesRejectedDeleteWithoutUnhandledRejection', async () => {
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => unhandledRejections.push(reason);
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const onDelete = vi.fn().mockRejectedValue(new Error('Delete failed'));

      const { container } = render(
        <Wrapper>
          <EditLocations locations={mockLocations} isFullTextUrlHidden={false} onUpdate={vi.fn()} onDelete={onDelete} />
        </Wrapper>,
      );

      const deleteButton = container.querySelector('ul [data-testid="DeleteOutlineIcon"]')!.closest('button')!;

      await act(async () => {
        fireEvent.click(deleteButton);
        // Let the rejected onDelete promise settle inside the safe handler.
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(onDelete).toHaveBeenCalledWith('1');
      // The rejection must be caught by the component, never escaping the promise chain.
      expect(unhandledRejections).toHaveLength(0);
      // The component stays usable: the location list is still rendered.
      expect(container.querySelector('ul')).toBeInTheDocument();
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });

  it('EditLocations_closesAfterLocationSaveResolves', async () => {
    const save = createDeferred();
    const onUpdate = vi.fn().mockReturnValue(save.promise);
    mocks.activeLocation = newLocation;

    const { container } = render(
      <Wrapper>
        <EditLocations locations={mockLocations} isFullTextUrlHidden={false} onUpdate={onUpdate} />
      </Wrapper>,
    );

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    expect(onUpdate).toHaveBeenCalledWith([...mockLocations, newLocation]);
    expect(mocks.finishEditing).not.toHaveBeenCalled();
    expect(mocks.closeForm).not.toHaveBeenCalled();

    await act(async () => {
      save.resolve();
      await save.promise;
    });

    await waitFor(() => expect(mocks.finishEditing).toHaveBeenCalledTimes(1));
    expect(mocks.closeForm).toHaveBeenCalledTimes(1);
  });

  it('EditLocations_blocksEditingAnExistingLocationUntilTheActiveFormCloses', () => {
    mocks.activeFormId = 'another-form';
    mocks.editForm.mockReturnValue(false);

    const { container, rerender } = render(
      <Wrapper>
        <EditLocations locations={mockLocations} isFullTextUrlHidden={false} onUpdate={vi.fn()} />
      </Wrapper>,
    );

    const editButton = container.querySelector('[data-testid="EditIcon"]')!.closest('button')!;
    expect(editButton).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(editButton);

    expect(mocks.editForm).toHaveBeenCalledWith('location_platform');
    expect(mocks.edit).not.toHaveBeenCalled();
    expect(container.querySelector('form')).not.toBeInTheDocument();

    mocks.activeFormId = null;
    mocks.editForm.mockReturnValue(true);
    rerender(
      <Wrapper>
        <EditLocations locations={mockLocations} isFullTextUrlHidden={false} onUpdate={vi.fn()} />
      </Wrapper>,
    );

    fireEvent.click(container.querySelector('[data-testid="EditIcon"]')!.closest('button')!);

    expect(mocks.edit).toHaveBeenCalledWith(mockLocations[0]);
  });

  it('EditLocations_blocksAddingANewLocationUntilTheActiveFormCloses', () => {
    mocks.activeFormId = 'another-form';
    mocks.editForm.mockReturnValue(false);

    const { container, rerender } = render(
      <Wrapper>
        <EditLocations locations={[]} isFullTextUrlHidden={false} onUpdate={vi.fn()} />
      </Wrapper>,
    );

    const addButton = container.querySelector('button')!;
    expect(addButton).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(addButton);

    expect(mocks.editForm).toHaveBeenCalledWith('location_platform');
    expect(mocks.edit).not.toHaveBeenCalled();

    mocks.activeFormId = null;
    mocks.editForm.mockReturnValue(true);
    rerender(
      <Wrapper>
        <EditLocations locations={[]} isFullTextUrlHidden={false} onUpdate={vi.fn()} />
      </Wrapper>,
    );

    fireEvent.click(container.querySelector('button')!);

    expect(mocks.edit).toHaveBeenCalledWith({ ...newLocation, id: '0000-0000-0000-0000-1' });
  });
});
