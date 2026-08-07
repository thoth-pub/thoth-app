import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockBulkCreateWorks } = vi.hoisted(() => ({ mockBulkCreateWorks: vi.fn() }));

vi.mock('@/src/entities/work', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useBulkCreateWorks: () => ({ bulkCreateWorks: mockBulkCreateWorks, loading: false }),
}));

vi.mock('@/src/shared/ui', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  TableWrapper: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ cells }: { cells: string[] }) => (
    <thead>
      <tr>
        {cells.map((cell) => (
          <th key={cell}>{cell}</th>
        ))}
      </tr>
    </thead>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TranslatedContent: ({ content }: { content: string }) => <span>{content}</span>,
  Typography: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { SeriesType } from '@/src/shared/constants/series';
import { getDefaultWork } from '@/src/shared/utils/work';

import { PreviewStep } from './PreviewStep';

describe('PreviewStep', () => {
  const works = [getDefaultWork({ id: 'work-1' })];

  beforeEach(() => {
    mockBulkCreateWorks.mockReset();
  });

  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(cleanup);

  const renderStep = (onSubmit: () => void) =>
    render(<PreviewStep works={works} chapters={[]} serieses={[]} onSubmit={onSubmit} />);

  it('does not close or navigate before the import resolves', async () => {
    let resolveImport: () => void = () => {};
    mockBulkCreateWorks.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveImport = resolve;
        }),
    );

    const onSubmit = vi.fn();
    renderStep(onSubmit);

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    await waitFor(() => expect(mockBulkCreateWorks).toHaveBeenCalledTimes(1));
    // The import is still in flight: the preview must still be on screen.
    expect(onSubmit).not.toHaveBeenCalled();

    resolveImport();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('closes and navigates once the import succeeds', async () => {
    mockBulkCreateWorks.mockResolvedValue(undefined);

    const onSubmit = vi.fn();
    renderStep(onSubmit);

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('cannot invoke the import a second time against the same plan after a failure', async () => {
    mockBulkCreateWorks.mockRejectedValue(new Error('work creation failed'));

    const onSubmit = vi.fn();
    renderStep(onSubmit);

    const create = screen.getByRole('button', { name: 'actions.create' });

    await userEvent.click(create);
    await waitFor(() => expect(mockBulkCreateWorks).toHaveBeenCalledTimes(1));

    // The plan was built against the series Thoth had before the attempt, so a group still
    // marked `proposed` may name a series the failed run already created. Re-confirming would
    // create it twice; the file has to be parsed again instead.
    await waitFor(() => expect(create).toBeDisabled());
    expect(screen.getByText('bulk import did not finish')).toBeInTheDocument();

    await userEvent.click(create);
    expect(mockBulkCreateWorks).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps the preview open when the import fails, without an unhandled rejection', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    mockBulkCreateWorks.mockRejectedValue(new Error('work creation failed'));

    const onSubmit = vi.fn();
    renderStep(onSubmit);

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    await waitFor(() => expect(mockBulkCreateWorks).toHaveBeenCalledTimes(1));

    // A bulk import is not atomic, so the user keeps the preview rather than being sent to the
    // works list with no idea what was created.
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'actions.create' })).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(unhandled).not.toHaveBeenCalled();

    process.off('unhandledRejection', unhandled);
  });

  it('marks works headed for a series the import will create', () => {
    render(
      <PreviewStep
        works={works}
        chapters={[]}
        serieses={[
          {
            name: 'Arc Companions',
            target: {
              kind: 'proposed',
              series: { name: 'Arc Companions', imprintId: 'imprint-1', type: SeriesType.enum.BookSeries },
            },
            works: [{ ...works[0], orderNumber: 1 }],
          },
        ]}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('Arc Companions')).toBeInTheDocument();
    expect(screen.getByText('will be created')).toBeInTheDocument();
  });
});
