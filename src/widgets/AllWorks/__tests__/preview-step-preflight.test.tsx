import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { theme } from '@/src/shared/theme';
import type { ExistingWorkMatch, ImportIssue, ImportPlan, ImportSource } from '@/src/shared/types';
import { importIdentifierKey } from '@/src/shared/utils/importPreflight';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

const mocks = vi.hoisted(() => ({
  findExistingIdentifierMatches: vi.fn(),
  bulkCreateWorks: vi.fn(),
}));

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: vi.fn(() => ({ activePublisher: { id: 'pub-1' } })),
}));

vi.mock('@/src/shared/context/servicesContext', () => ({
  useServices: vi.fn(() => ({
    importPreflightService: { findExistingIdentifierMatches: mocks.findExistingIdentifierMatches },
    workService: { bulkCreateWorks: mocks.bulkCreateWorks },
  })),
  ServicesProvider: vi.fn(({ children }) => children),
}));

vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useNotifications: vi.fn(() => ({ sendErrorNotification: vi.fn(), sendSuccessNotification: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useEscapeKey: vi.fn(),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
}));

const { PreviewStep } = await import('../components/PreviewStep');

/**
 * The confirmation boundary, tested for what it tells the user and what it does with the plan.
 *
 * The preflight hook runs for real here, over a real query client, so pending, failed and
 * retried states are the component's actual behaviour rather than a stubbed flag. Only the
 * lookups themselves and the mutation are doubles.
 *
 * Translation returns the key, so assertions read as the keys the component asks for.
 */

const work = (id: string, { title = id, doi = '', isbns = [] as string[] } = {}) =>
  ({
    ...getDefaultWork(),
    id,
    doi,
    titles: [{ ...getDefaultTitle(), canonical: true, title, fullTitle: title }],
    publications: isbns.map((isbn, index) => ({ id: `${id}-pub-${index}`, isbn })),
  }) as unknown as WorkEntity;

const plan = (works: WorkEntity[]): ImportPlan => ({ works, chapters: [], series: [] });

const existing = (workId: string, title: string, { doi = '', isbns = [] as string[] } = {}): ExistingWorkMatch => ({
  workId,
  title,
  imprintId: 'imprint-1',
  doi,
  isbns,
});

const doiMatches = (value: string, works: ExistingWorkMatch[]) =>
  new Map([[importIdentifierKey({ basis: 'doi', value }), works]]);

const source: ImportSource = { type: 'onix', filename: 'catalogue.xml' };

const renderPreview = (props: {
  plan: ImportPlan;
  warnings?: ImportIssue[];
  onSubmit?: () => void;
  source?: ImportSource | null;
}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <PreviewStep
          plan={props.plan}
          warnings={props.warnings}
          source={props.source ?? source}
          onSubmit={props.onSubmit ?? vi.fn()}
        />
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

const createButton = () => screen.getByRole('button', { name: 'actions.create' });

describe('PreviewStep preflight', () => {
  beforeEach(() => {
    mocks.findExistingIdentifierMatches.mockReset();
    mocks.bulkCreateWorks.mockReset();
    mocks.findExistingIdentifierMatches.mockResolvedValue(new Map());
    mocks.bulkCreateWorks.mockResolvedValue(undefined);
  });

  // Vitest is not running with globals, so Testing Library's automatic cleanup is not installed;
  // without this every render would stack up in the same document.
  afterEach(cleanup);

  it('will not let the import be confirmed while the check is still running', async () => {
    mocks.findExistingIdentifierMatches.mockReturnValue(new Promise(() => {}));

    renderPreview({ plan: plan([work('w1', { doi: 'https://doi.org/10.1234/one' })]) });

    expect(screen.getByText('importPreflight.checking')).toBeInTheDocument();
    expect(createButton()).toBeDisabled();
  });

  it('does not offer the ready-to-import phase while the duplicate check is still running', async () => {
    mocks.findExistingIdentifierMatches.mockReturnValue(new Promise(() => {}));

    renderPreview({ plan: plan([work('w1', { doi: 'https://doi.org/10.1234/one' })]) });

    // The checking phase is the one on screen; the ready phase is the frame *after* it, not now.
    expect(screen.getByText('importPreflight.checking')).toBeInTheDocument();
    expect(screen.queryByTestId('import-phase-ready')).not.toBeInTheDocument();
    expect(screen.queryByText('bulkImport.phase.ready')).not.toBeInTheDocument();
  });

  it('marks the plan ready to import once the check finds nothing, without busy or spinner semantics', async () => {
    renderPreview({ plan: plan([work('w1', { doi: 'https://doi.org/10.1234/one' })]) });

    const ready = await screen.findByTestId('import-phase-ready');

    expect(ready).toBeVisible();
    expect(ready).toHaveTextContent('bulkImport.phase.ready');
    // A still frame at the confirmation boundary: it does not claim the app is progressing on its
    // own, so it is neither aria-busy nor accompanied by a spinner.
    expect(ready).toHaveAttribute('aria-busy', 'false');
    expect(within(ready).queryByRole('progressbar', { hidden: true })).not.toBeInTheDocument();
    // It sits beside the preflight summary and the Create button, replacing neither.
    expect(screen.getByText('importPreflight.summary')).toBeInTheDocument();
    expect(createButton()).toBeEnabled();
  });

  it('still marks the plan ready to import when the check raises advisory duplicate findings', async () => {
    mocks.findExistingIdentifierMatches.mockResolvedValue(
      doiMatches('https://doi.org/10.1234/shared', [
        existing('existing-1', 'An Existing Book', { doi: 'https://doi.org/10.1234/shared' }),
      ]),
    );

    renderPreview({ plan: plan([work('w1', { title: 'Imported Book', doi: 'https://doi.org/10.1234/shared' })]) });

    await waitFor(() => expect(screen.getByText('importPreflight.potentialDuplicates')).toBeInTheDocument());

    // Findings are advisory and never block: the ready phase appears alongside them, not instead
    // of them, and the Create button stays enabled.
    expect(screen.getByTestId('import-phase-ready')).toBeVisible();
    expect(screen.getByText('importPreflight.potentialDuplicates')).toBeInTheDocument();
    expect(createButton()).toBeEnabled();
  });

  it('does not mark the plan ready to import when the check itself fails', async () => {
    mocks.findExistingIdentifierMatches.mockRejectedValue(new Error('network down'));

    renderPreview({ plan: plan([work('w1', { doi: 'https://doi.org/10.1234/one' })]) });

    await waitFor(() => expect(screen.getByText('importPreflight.failed')).toBeInTheDocument());

    // No ready phase over a failed check, and the existing failure/retry affordance is untouched.
    expect(screen.queryByTestId('import-phase-ready')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'importPreflight.retry' })).toBeEnabled();
    expect(createButton()).toBeDisabled();
  });

  it('shows the summary and enables the import when the check finds nothing', async () => {
    renderPreview({ plan: plan([work('w1', { doi: 'https://doi.org/10.1234/one' })]) });

    await waitFor(() => expect(screen.getByText('importPreflight.summary')).toBeInTheDocument());

    expect(screen.getByText('importPreflight.noFindings')).toBeInTheDocument();
    expect(screen.queryByText('importPreflight.potentialDuplicates')).not.toBeInTheDocument();
    expect(createButton()).toBeEnabled();
  });

  it('shows an existing Thoth work sharing a DOI, and still allows the import', async () => {
    mocks.findExistingIdentifierMatches.mockResolvedValue(
      doiMatches('https://doi.org/10.1234/shared', [
        existing('existing-1', 'An Existing Book', { doi: 'https://doi.org/10.1234/shared' }),
      ]),
    );

    renderPreview({ plan: plan([work('w1', { title: 'Imported Book', doi: 'https://doi.org/10.1234/shared' })]) });

    await waitFor(() => expect(screen.getByText('importPreflight.potentialDuplicates')).toBeInTheDocument());

    expect(screen.getByText('importPreflight.doiAlsoInThoth')).toBeInTheDocument();
    expect(screen.getByText('importPreflight.alreadyInThoth')).toBeInTheDocument();
    expect(screen.getByText('An Existing Book')).toBeInTheDocument();
    // A signal is not a verdict: nothing here blocks creation.
    expect(createButton()).toBeEnabled();
  });

  it('shows both imported works when one identifier repeats inside the upload', async () => {
    renderPreview({
      plan: plan([
        work('w1', { title: 'First Book', doi: 'https://doi.org/10.1234/shared' }),
        work('w2', { title: 'Second Book', doi: 'https://doi.org/10.1234/shared' }),
      ]),
    });

    await waitFor(() => expect(screen.getByText('importPreflight.potentialDuplicates')).toBeInTheDocument());

    expect(screen.getByText('importPreflight.doiRepeatedInUpload')).toBeInTheDocument();
    expect(screen.getByText('importPreflight.inThisUpload')).toBeInTheDocument();
    expect(screen.getAllByText('First Book').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Second Book').length).toBeGreaterThan(0);
  });

  it('shows every existing work an identifier matches, without picking one', async () => {
    mocks.findExistingIdentifierMatches.mockResolvedValue(
      doiMatches('https://doi.org/10.1234/shared', [
        existing('existing-1', 'Alpha Edition'),
        existing('existing-2', 'Beta Edition'),
      ]),
    );

    renderPreview({ plan: plan([work('w1', { title: 'Imported', doi: 'https://doi.org/10.1234/shared' })]) });

    await waitFor(() => expect(screen.getByText('Alpha Edition')).toBeInTheDocument());

    expect(screen.getByText('Beta Edition')).toBeInTheDocument();
  });

  it('keeps a parser warning and a duplicate signal in their own sections', async () => {
    mocks.findExistingIdentifierMatches.mockResolvedValue(
      doiMatches('https://doi.org/10.1234/shared', [existing('existing-1', 'An Existing Book')]),
    );

    const warnings: ImportIssue[] = [
      {
        severity: 'warning',
        code: 'onix.series.non_publisher_collection_skipped',
        message: 'A collection was skipped',
        source: { kind: 'onix', productIndex: 0 },
      },
    ];

    renderPreview({ plan: plan([work('w1', { doi: 'https://doi.org/10.1234/shared' })]), warnings });

    await waitFor(() => expect(screen.getByText('importPreflight.potentialDuplicates')).toBeInTheDocument());

    const warningSection = screen.getByText('warnings').closest('section');
    const duplicateSection = screen.getByText('importPreflight.potentialDuplicates').closest('section');

    expect(warningSection).not.toBe(duplicateSection);
    expect(warningSection).toHaveTextContent('A collection was skipped');
    expect(duplicateSection).not.toHaveTextContent('A collection was skipped');
    expect(warningSection).not.toHaveTextContent('importPreflight.doiAlsoInThoth');
  });

  it('says how much of the upload it was able to check', async () => {
    renderPreview({
      plan: plan([work('w1', { doi: 'https://doi.org/10.1234/one' }), work('w2'), work('w3')]),
    });

    await waitFor(() => expect(screen.getByText('importPreflight.coverage')).toBeInTheDocument());
  });

  it('reports a failed check, keeps the import disabled, and offers to check again', async () => {
    mocks.findExistingIdentifierMatches.mockRejectedValue(new Error('network down'));

    renderPreview({ plan: plan([work('w1', { doi: 'https://doi.org/10.1234/one' })]) });

    await waitFor(() => expect(screen.getByText('importPreflight.failed')).toBeInTheDocument());

    expect(createButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'importPreflight.retry' })).toBeEnabled();
    expect(screen.queryByText('importPreflight.summary')).not.toBeInTheDocument();
  });

  it('replaces the failure with a report when the check is retried successfully', async () => {
    mocks.findExistingIdentifierMatches
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(new Map());

    renderPreview({ plan: plan([work('w1', { doi: 'https://doi.org/10.1234/one' })]) });

    await waitFor(() => expect(screen.getByText('importPreflight.failed')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'importPreflight.retry' }));

    await waitFor(() => expect(screen.getByText('importPreflight.summary')).toBeInTheDocument());

    expect(screen.queryByText('importPreflight.failed')).not.toBeInTheDocument();
    expect(createButton()).toBeEnabled();
  });

  it('creates the plan, and only the plan, when the user confirms after a duplicate signal', async () => {
    mocks.findExistingIdentifierMatches.mockResolvedValue(
      doiMatches('https://doi.org/10.1234/shared', [existing('existing-1', 'An Existing Book')]),
    );

    const importPlan = plan([work('w1', { doi: 'https://doi.org/10.1234/shared' })]);
    const onSubmit = vi.fn();

    renderPreview({ plan: importPlan, onSubmit });

    await waitFor(() => expect(createButton()).toBeEnabled());

    await userEvent.click(createButton());

    await waitFor(() => expect(mocks.bulkCreateWorks).toHaveBeenCalled());

    // The report never reaches the mutation: the plan is the first argument, and the second is
    // the progress observer — the plan itself is passed whole, never unpacked.
    expect(mocks.bulkCreateWorks).toHaveBeenCalledTimes(1);
    expect(mocks.bulkCreateWorks.mock.calls[0]).toHaveLength(2);
    expect(mocks.bulkCreateWorks.mock.calls[0][0]).toBe(importPlan);

    // Success is acknowledged before navigating: the completion state shows first.
    await waitFor(() => expect(screen.getByText('bulkImport.success.heading')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'bulkImport.success.viewWorks' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('shows a persistent failure report after a failed bulk creation, with no way to re-run the plan', async () => {
    mocks.bulkCreateWorks.mockRejectedValue(new Error('import failed'));

    renderPreview({ plan: plan([work('w1', { doi: 'https://doi.org/10.1234/one' })]) });

    await waitFor(() => expect(createButton()).toBeEnabled());

    await userEvent.click(createButton());

    // The failure persists in the modal — it does not vanish with the toast — and carries the
    // underlying error message.
    await waitFor(() => expect(screen.getByText('bulkImport.failure.heading')).toBeInTheDocument());
    expect(screen.getByTestId('import-failure-message')).toHaveTextContent('import failed');

    // A partly-executed import is not safe to repeat, so the Create button is gone entirely: there
    // is no retry/resume affordance and nothing to press a second time.
    expect(screen.queryByRole('button', { name: 'actions.create' })).not.toBeInTheDocument();
    expect(mocks.bulkCreateWorks).toHaveBeenCalledTimes(1);
  });
});
