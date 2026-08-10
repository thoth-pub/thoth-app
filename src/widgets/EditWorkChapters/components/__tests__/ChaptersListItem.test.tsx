import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { theme } from '@/src/shared/theme';

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
}));

import { ChaptersListItem } from '../ChaptersListItem';

const mockChapter = {
  id: 'ch1',
  titles: [
    { id: 't1', title: 'Chapter 1', fullTitle: 'Chapter 1 Full', subtitle: '', localeCode: 'en', canonical: true },
  ],
  pageCount: 20,
  contributions: [{ id: 'c1', fullName: 'Author A' }],
  firstPage: '1',
  lastPage: '20',
  doi: '10.1234/test',
  landingPage: 'https://example.com',
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

afterEach(cleanup);

const asWorkEntity = (chapter: unknown): WorkEntity => chapter as WorkEntity;

describe('ChaptersListItem', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <ChaptersListItem chapter={asWorkEntity(mockChapter)} />
      </Wrapper>,
    );
    expect(container).toMatchSnapshot('ChaptersListItem');
  });

  it('renders with callbacks', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onCopy = vi.fn();
    const { container } = render(
      <Wrapper>
        <ChaptersListItem chapter={asWorkEntity(mockChapter)} onEdit={onEdit} onDelete={onDelete} onCopy={onCopy} />
      </Wrapper>,
    );
    expect(container).toMatchSnapshot('ChaptersListItem - with callbacks');
  });

  it('renders the existing ORCID link beside a contributor with an ORCID', async () => {
    const user = userEvent.setup();
    const chapter = {
      ...mockChapter,
      contributions: [{ id: 'c1', fullName: 'Author With ORCID', orcidId: '0000-0000-0000-0001' }],
    };

    render(
      <Wrapper>
        <ChaptersListItem chapter={asWorkEntity(chapter)} />
      </Wrapper>,
    );

    const contributor = screen.getByText('Author With ORCID');
    const orcidIcon = within(contributor).getByRole('img', { name: 'Orcid' });

    await user.hover(orcidIcon);

    expect(await screen.findByRole('link', { name: '0000-0000-0000-0001' })).toHaveAttribute(
      'href',
      'https://orcid.org/0000-0000-0000-0001',
    );
  });

  it('does not render an ORCID icon for a contributor without an ORCID', () => {
    const chapter = {
      ...mockChapter,
      contributions: [{ id: 'c1', fullName: 'Author Without ORCID', orcidId: '' }],
    };

    render(
      <Wrapper>
        <ChaptersListItem chapter={asWorkEntity(chapter)} />
      </Wrapper>,
    );

    expect(screen.getByText('Author Without ORCID')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Orcid' })).not.toBeInTheDocument();
  });

  it('preserves contributor order and associates ORCIDs with the correct contributors', async () => {
    const user = userEvent.setup();
    const chapter = {
      ...mockChapter,
      contributions: [
        { id: 'c1', fullName: 'Alice Example', orcidId: '0000-0000-0000-0001' },
        { id: 'c2', fullName: 'Bob Example', orcidId: '' },
        { id: 'c3', fullName: 'Carol Example', orcidId: '0000-0000-0000-0003' },
      ],
    };

    render(
      <Wrapper>
        <ChaptersListItem chapter={asWorkEntity(chapter)} />
      </Wrapper>,
    );

    const contributorList = screen.getByText((_, element) => {
      return element?.tagName === 'LI' && element.textContent === 'Alice Example, Bob Example, Carol Example';
    });
    const contributorsWithOrcid = Array.from(contributorList.querySelectorAll(':scope > span'));

    expect(contributorsWithOrcid.map((contributor) => contributor.textContent)).toEqual([
      'Alice Example',
      'Carol Example',
    ]);
    const aliceOrcid = within(contributorsWithOrcid[0] as HTMLElement).getByRole('img', { name: 'Orcid' });
    const carolOrcid = within(contributorsWithOrcid[1] as HTMLElement).getByRole('img', { name: 'Orcid' });

    await user.hover(aliceOrcid);
    expect(await screen.findByRole('link', { name: '0000-0000-0000-0001' })).toHaveAttribute(
      'href',
      'https://orcid.org/0000-0000-0000-0001',
    );

    await user.unhover(aliceOrcid);
    await user.hover(carolOrcid);
    expect(await screen.findByRole('link', { name: '0000-0000-0000-0003' })).toHaveAttribute(
      'href',
      'https://orcid.org/0000-0000-0000-0003',
    );
  });

  it('preserves the contributor limit and +N count when contributors have ORCIDs', () => {
    const chapter = {
      ...mockChapter,
      contributions: [
        { id: 'c1', fullName: 'First Author', orcidId: '0000-0000-0000-0001' },
        { id: 'c2', fullName: 'Second Author', orcidId: '' },
        { id: 'c3', fullName: 'Third Author', orcidId: '' },
        { id: 'c4', fullName: 'Hidden Author', orcidId: '0000-0000-0000-0004' },
      ],
    };

    render(
      <Wrapper>
        <ChaptersListItem chapter={asWorkEntity(chapter)} />
      </Wrapper>,
    );

    const contributorList = screen.getByText((_, element) => {
      return element?.tagName === 'LI' && element.textContent === 'First Author, Second Author, Third Author';
    });

    expect(contributorList).toBeInTheDocument();
    expect(screen.queryByText('Hidden Author')).not.toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(within(contributorList).getAllByRole('img', { name: 'Orcid' })).toHaveLength(1);
  });
});
