import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';
import AddBookReview from '../AddBookReview/AddBookReview';
import EditBookReview from '../EditBookReview/EditBookReview';

vi.mock('@/src/entities/book-review', () => ({
  useBookReviewStateMachine: vi.fn(() => ({
    activeEntity: { id: 'br1', title: 'Test Review', authorName: '', reviewerOrcid: '', url: '', doi: '', reviewDate: '', journalName: '', journalVolume: '', journalNumber: '', journalIssn: '', reviewerInstitutionId: '', reviewerInstitutionName: '', reviewerInstitutionRor: '', pageRange: '', text: '', orderNumber: 1 },
    update: vi.fn(),
    finishEditing: vi.fn(),
  })),
  useCreateBookReview: vi.fn(() => ({ createBookReview: vi.fn() })),
  useUpdateBookReview: vi.fn(() => ({ updateBookReview: vi.fn() })),
  EditBookReviewForm: vi.fn(({ title, ...props }) => <div {...props}>EditBookReviewForm:{title}</div>),
}));

vi.mock('@/src/shared/hooks', () => ({
  useActiveLocale: vi.fn(() => 'en'),
  useDebouncedValue: vi.fn((v) => v),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => false),
  useIsDeutchLocale: vi.fn(() => false),
  useIsDragStarted: vi.fn(() => false),
  usePreventInteraction: vi.fn(),
  usePreventNavigation: vi.fn(),
  useQueryToken: vi.fn(() => 'token'),
  useTypedTranslation: vi.fn(() => ({ t: (s: string) => s })),
  useNotifications: vi.fn(() => ({ notify: vi.fn() })),
  useDefaultCurrencyOption: vi.fn(() => null),
  useDefaultLocaleOption: vi.fn(() => null),
  useDefaultPlace: vi.fn(() => null),
}));

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: vi.fn(() => ({
    activePublisher: { id: 'p1', name: 'Test Publisher' },
    resetLinkedPublishers: vi.fn(),
  })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('BookReviewFeature', () => {
  it('renders AddBookReview', () => {
    const { container } = render(<Wrapper><AddBookReview workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditBookReview', () => {
    const { container } = render(<Wrapper><EditBookReview workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });
});
