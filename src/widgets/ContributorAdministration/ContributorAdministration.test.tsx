import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const administrationState = vi.fn();

vi.mock('./useContributorAdministration', () => ({
  default: () => administrationState(),
}));
vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: function typedTranslation() {
    return { t: (key: string) => key };
  },
}));
vi.mock('./ContributorEditDialog', () => ({ default: () => <div>edit-dialog</div> }));
vi.mock('./ContributorMergeDialog', () => ({ default: () => <div>merge-dialog</div> }));

import ContributorAdministration from './ContributorAdministration';

const base = {
  searchInput: '',
  setSearchInput: vi.fn(),
  search: vi.fn(),
  page: 1,
  setPage: vi.fn(),
  contributors: [],
  isLoading: false,
  loadFailed: false,
  totalCount: 0,
  countFailed: false,
  totalPages: 1,
  refetch: vi.fn(),
};

afterEach(cleanup);

describe('ContributorAdministration', () => {
  it('shows nothing staff-only while identity is pending', () => {
    administrationState.mockReturnValue({ ...base, viewState: 'identityPending' });
    render(<ContributorAdministration />);

    expect(screen.queryByText('title')).toBeNull();
    expect(screen.queryByText('searchAction')).toBeNull();
  });

  it('shows only the not-authorized message to a non-superuser', () => {
    administrationState.mockReturnValue({ ...base, viewState: 'notAuthorized' });
    render(<ContributorAdministration />);

    expect(screen.getByText('notAuthorized')).toBeTruthy();
    expect(screen.queryByText('searchAction')).toBeNull();
  });

  it('lists contributors with edit and merge actions for a superuser', () => {
    administrationState.mockReturnValue({
      ...base,
      viewState: 'ready',
      totalCount: 1,
      contributors: [
        { id: 'c1', fullName: 'Ada Lovelace', firstName: 'Ada', lastName: 'Lovelace', orcid: '', website: '' },
      ],
    });
    render(<ContributorAdministration />);

    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByLabelText('editAction Ada Lovelace')).toBeTruthy();
    expect(screen.getByLabelText('mergeAction Ada Lovelace')).toBeTruthy();
  });
});
