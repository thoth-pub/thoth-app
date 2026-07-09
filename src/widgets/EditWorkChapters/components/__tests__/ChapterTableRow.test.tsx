import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/config', () => ({
  appConfig: {
    minItemsCountForDragAndDrop: 2,
    validations: { orcidPrefix: '0000-000', rorPrefix: 'https://ror.org/', doiPrefix: '10.' },
    dataApi: { textSeparator: '; ' },
    titles: { terminalPunctuation: ['.', '!', '?'] },
    data: { itemsPerRequestLimit: 100, maxImprintsPerRequestLimit: 500 },
    defaultId: 'new',
    query: { staleTime: 60000, cacheTime: 300000 },
  },
}));

import { ChapterTableRow } from '../ChapterTableRow';

const mockChapter = {
  id: 'ch1',
  titles: [{ id: 't1', title: 'Chapter 1', fullTitle: 'Chapter 1', subtitle: '', localeCode: 'en', canonical: true }],
  pageCount: 15,
  contributions: [{ id: 'c1', fullName: 'Author A' }],
  firstPage: '1',
  lastPage: '15',
  doi: '10.1234/test',
  landingPage: null,
  relationId: 'r1',
  ordinal: 1,
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('ChapterTableRow', () => {
  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <table>
          <tbody>
            <ChapterTableRow
              chapter={mockChapter as any}
              selected={false}
              isButtonsDisabled={false}
              totalChaptersCount={3}
              isSelectDisabled={false}
            />
          </tbody>
        </table>
      </Wrapper>
    );
    expect(container).toMatchSnapshot('ChapterTableRow');
  });

  it('renders selected state', () => {
    const { container } = render(
      <Wrapper>
        <table>
          <tbody>
            <ChapterTableRow
              chapter={mockChapter as any}
              selected={true}
              isButtonsDisabled={false}
              totalChaptersCount={3}
              isSelectDisabled={false}
            />
          </tbody>
        </table>
      </Wrapper>
    );
    expect(container).toMatchSnapshot('ChapterTableRow - selected');
  });
});
