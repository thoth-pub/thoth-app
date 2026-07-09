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
  useIsDesktop: vi.fn(() => true),
}));

import BookReviewsList from '../BookReviewsList';

const mockBookReviews = [
  { id: '1', workId: 'w1', title: 'Review 1', authorName: 'Author A', reviewerOrcid: '', reviewerInstitutionId: '', reviewerInstitutionName: '', reviewerInstitutionRor: '', url: 'https://example.com/review1', doi: '', reviewDate: '', journalName: '', journalVolume: '', journalNumber: '', journalIssn: '', pageRange: '', text: '', orderNumber: 1 },
  { id: '2', workId: 'w1', title: 'Review 2', authorName: 'Author B', reviewerOrcid: '', reviewerInstitutionId: '', reviewerInstitutionName: '', reviewerInstitutionRor: '', url: 'https://example.com/review2', doi: '', reviewDate: '', journalName: '', journalVolume: '', journalNumber: '', journalIssn: '', pageRange: '', text: '', orderNumber: 2 },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('BookReviewsList', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <BookReviewsList activeBookReview={null} bookReviews={mockBookReviews} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('BookReviewsList');
  });

  it('returns null when empty', () => {
    const { container } = render(
      <Wrapper>
        <BookReviewsList activeBookReview={null} bookReviews={[]} />
      </Wrapper>
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders with callbacks', () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const { container } = render(
      <Wrapper>
        <BookReviewsList activeBookReview={null} bookReviews={mockBookReviews} onDelete={onDelete} onEdit={onEdit} />
      </Wrapper>
    );
    expect(container).toMatchSnapshot('BookReviewsList - with callbacks');
  });
});
