import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
}));

vi.mock('@/src/entities/work', () => ({
  useWork: vi.fn(() => ({
    work: {
      id: 'w1',
      awards: [],
      endorsements: [],
      bookReviews: [],
      featuredVideo: null,
    },
    loading: false,
    fetching: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/src/entities/award', () => ({
  AwardsList: vi.fn(() => <div data-testid="awards-list" />),
  useAwardStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn() })),
  useDeleteAward: vi.fn(() => ({ deleteAward: vi.fn(), loading: false })),
  useMoveAward: vi.fn(() => ({ moveAward: vi.fn() })),
}));

vi.mock('@/src/entities/endorsement', () => ({
  EndorsementsList: vi.fn(() => <div data-testid="endorsements-list" />),
  useEndorsementStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn() })),
  useDeleteEndorsement: vi.fn(() => ({ deleteEndorsement: vi.fn(), loading: false })),
  useMoveEndorsement: vi.fn(() => ({ moveEndorsement: vi.fn() })),
}));

vi.mock('@/src/entities/book-review', () => ({
  BookReviewsList: vi.fn(() => <div data-testid="book-reviews-list" />),
  useBookReviewStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn() })),
  useDeleteBookReview: vi.fn(() => ({ deleteBookReview: vi.fn(), loading: false })),
  useMoveBookReview: vi.fn(() => ({ moveBookReview: vi.fn() })),
}));

vi.mock('@/src/entities/featured-video', () => ({
  useFeaturedVideoStateMachine: vi.fn(() => ({ activeEntity: null, edit: vi.fn() })),
  useDeleteFeaturedVideo: vi.fn(() => ({ deleteFeaturedVideo: vi.fn(), loading: false })),
}));

vi.mock('@/src/entities/publisher', () => ({
  useActivePublisherPermissions: vi.fn(() => ({ isFeaturedVideoEditable: true })),
}));

vi.mock('../../../features/award/AddAward/AddAward', () => ({ default: vi.fn(() => null) }));
vi.mock('../../../features/award/EditAward/EditAward', () => ({ default: vi.fn(() => null) }));
vi.mock('../../../features/endorsement/AddEndorsement/AddEndorsement', () => ({ default: vi.fn(() => null) }));
vi.mock('../../../features/endorsement/EditEndorsement/EditEndorsement', () => ({ default: vi.fn(() => null) }));
vi.mock('../../../features/book-review/AddBookReview/AddBookReview', () => ({ default: vi.fn(() => null) }));
vi.mock('../../../features/book-review/EditBookReview/EditBookReview', () => ({ default: vi.fn(() => null) }));
vi.mock('../../../features/featured-video/AddFeaturedVideo/AddFeaturedVideo', () => ({ default: vi.fn(() => null) }));
vi.mock('../../../features/featured-video/EditFeaturedVideo/EditFeaturedVideo', () => ({ default: vi.fn(() => null) }));
vi.mock('../../../entities/featured-video/ui/FeaturedVideoPreview/FeaturedVideoPreview', () => ({ FeaturedVideoPreview: vi.fn(() => null) }));

import EditWorkMarketing from '../EditWorkMarketing';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditWorkMarketing', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper><EditWorkMarketing workId="test-work-id" /></Wrapper>
    );
    expect(container).toMatchSnapshot('EditWorkMarketing');
  });
});
