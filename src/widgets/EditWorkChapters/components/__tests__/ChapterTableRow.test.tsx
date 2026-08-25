import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { theme } from '@/src/shared/theme';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/config', () => ({
  appConfig: {
    minItemsCountForDragAndDrop: 2,
    validations: { orcidPrefix: '0000-000', rorPrefix: 'https://ror.org/', doiPrefix: '10.' },
    dataApi: { textSeparator: '; ' },
    titles: { terminalPunctuation: ['.', '!', '?'] },
    data: { itemsPerRequestLimit: 100, maxImprintsPerRequestLimit: 500 },
    defaultId: 'new',
    query: { staleTime: 60000, gcTime: 300000 },
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

// APP-TABLE-UX-01. This row is the app's one specialist interactive table row:
// it has a real drag/drop integration and a real double-click edit shortcut.
// The shared theme no longer gives every table-body row an interactive
// hover/pointer cue, so this row now states its interactivity explicitly with
// MUI's `hover` prop. The task deliberately does NOT add single-click row
// editing or navigation, and does not redesign the dnd-kit attributes or the
// row's accessibility semantics - the explicit Edit button remains the
// keyboard-accessible edit path.
describe('ChapterTableRow row-interaction semantics', () => {
  afterEach(() => {
    cleanup();
  });

  // Typed once here rather than re-casting per render, so these assertions add
  // no further `any` to the file's recorded lint debt.
  const chapterFixture = mockChapter as unknown as WorkEntity;

  const renderRow = (overrides?: { onEdit?: (id: string) => void }) =>
    render(
      <Wrapper>
        <table>
          <tbody>
            <ChapterTableRow
              chapter={chapterFixture}
              selected={false}
              isButtonsDisabled={false}
              totalChaptersCount={3}
              isSelectDisabled={false}
              onEdit={overrides?.onEdit}
            />
          </tbody>
        </table>
      </Wrapper>
    );

  const getRow = (container: HTMLElement) => container.querySelector('tr') as HTMLTableRowElement;

  it('opts into the explicit interactive hover treatment', () => {
    const { container } = renderRow();

    // The opt-in is code-visible via the `hover` prop and observable as MUI's
    // own hover-row class, which is what the shared theme now targets.
    expect(getRow(container)).toHaveClass('MuiTableRow-hover');
  });

  it('does not invoke onEdit on a plain single click', async () => {
    const onEdit = vi.fn();
    const { container } = renderRow({ onEdit });

    await userEvent.click(within(getRow(container)).getByText('Chapter 1'));

    expect(onEdit).not.toHaveBeenCalled();
  });

  it('still invokes onEdit on double click, exactly as before', async () => {
    const onEdit = vi.fn();
    const { container } = renderRow({ onEdit });

    await userEvent.dblClick(within(getRow(container)).getByText('Chapter 1'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith('ch1');
  });

  it('keeps the explicit Edit control as the non-double-click edit path', async () => {
    const onEdit = vi.fn();
    renderRow({ onEdit });

    const editButton = screen.getByTestId('EditIcon').closest('button') as HTMLButtonElement;

    expect(editButton).toBeInTheDocument();

    await userEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith('ch1');
  });

  it('preserves the existing drag/drop attributes and nested controls', () => {
    const { container } = renderRow();
    const row = getRow(container);

    // dnd-kit sortable attributes, untouched by this task.
    expect(row).toHaveAttribute('role', 'button');
    expect(row).toHaveAttribute('tabindex', '0');
    expect(row).toHaveAttribute('aria-roledescription', 'sortable');

    // Nested controls are still the row's real actions.
    expect(within(row).getByTestId('DeleteOutlineIcon')).toBeInTheDocument();
    expect(within(row).getByTestId('EditIcon')).toBeInTheDocument();
    expect(within(row).getByTestId('ContentCopyIcon')).toBeInTheDocument();
    expect(within(row).getByRole('checkbox')).toBeInTheDocument();
  });
});
