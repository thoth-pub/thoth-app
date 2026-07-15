import { ThemeProvider } from '@mui/material';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { theme } from '@/src/shared/theme';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocationEntity } from '@/src/entities/locations/model/location.types';

const mocks = vi.hoisted(() => ({
  activeLocation: null as LocationEntity | null,
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
  default: vi.fn(() => ({ activeFormId: null, edit: mocks.editForm, closeForm: mocks.closeForm })),
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
  { id: '1', locationPlatform: 'PROJECT_MUSE', fullTextUrl: '', landingPage: 'https://muse.jhu.edu', canonical: true },
];

const newLocation: LocationEntity = {
  id: '0000-0000-0000-0000-2',
  locationPlatform: 'OTHER',
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
    mocks.closeForm.mockReset();
    mocks.edit.mockReset();
    mocks.editForm.mockReset();
    mocks.finishEditing.mockReset();
  });

  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <EditLocations locations={mockLocations} isFullTextUrlHidden={false} onUpdate={vi.fn()} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('EditLocations');
  });

  it('renders empty state', () => {
    const { container } = render(
      <Wrapper>
        <EditLocations locations={[]} isFullTextUrlHidden={false} onUpdate={vi.fn()} />
      </Wrapper>
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
});
