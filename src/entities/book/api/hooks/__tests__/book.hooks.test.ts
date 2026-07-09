import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();
const mockSendError = vi.fn();
const mockSendSuccess = vi.fn();
const mockServices = {
  bookService: { getBooks: vi.fn(), getBooksCount: vi.fn() },
};

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
  useQuery: vi.fn(() => ({ data: undefined, error: null, isLoading: false, isFetched: true })),
}));

vi.mock('@/src/shared/context/servicesContext', () => ({
  useServices: vi.fn(() => mockServices),
  ServicesProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({
    sendErrorNotification: mockSendError,
    sendSuccessNotification: mockSendSuccess,
    sendProgressNotification: vi.fn(),
    dismissNotification: vi.fn(),
  })),
}));

import useBooks from '../useBooks';
import useBooksCount from '../useBooksCount';
import usePublishedBooksCount from '../usePublishedBooksCount';
import useForthcomingBooksCount from '../useForthcomingBooksCount';
import useLatestPublishedBooks from '../useLatestPublishedBooks';
import useLatestUpdatedBooks from '../useLatestUpdatedBooks';

function setup() {
  vi.clearAllMocks();
  mockServices.bookService.getBooks.mockResolvedValue([]);
  mockServices.bookService.getBooksCount.mockResolvedValue(0);
}

describe('useBooks', () => {
  it('queries books with publishersIds', () => {
    setup();
    const { books } = useBooks({ publishersIds: ['pub-1'] });
    expect(books).toEqual([]);
  });
});

describe('useBooksCount', () => {
  it('queries books count', () => {
    setup();
    const { bookCount } = useBooksCount({ publishersIds: ['pub-1'] });
    expect(bookCount).toBe(0);
  });
});

describe('usePublishedBooksCount', () => {
  it('queries published books count', () => {
    setup();
    const { bookCount } = usePublishedBooksCount(['pub-1']);
    expect(bookCount).toBe(0);
  });
});

describe('useForthcomingBooksCount', () => {
  it('queries forthcoming books count', () => {
    setup();
    const { bookCount } = useForthcomingBooksCount(['pub-1']);
    expect(bookCount).toBe(0);
  });
});

describe('useLatestPublishedBooks', () => {
  it('queries latest published books', () => {
    setup();
    const { books } = useLatestPublishedBooks(['pub-1']);
    expect(books).toEqual([]);
  });
});

describe('useLatestUpdatedBooks', () => {
  it('queries latest updated books', () => {
    setup();
    const { books } = useLatestUpdatedBooks(['pub-1']);
    expect(books).toEqual([]);
  });
});
