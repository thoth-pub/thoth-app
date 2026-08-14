import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockParse, mockCSVParser } = vi.hoisted(() => ({
  mockParse: vi.fn(),
  mockCSVParser: vi.fn(),
}));

vi.mock('@/src/shared/parsers', () => ({
  CSVParser: mockCSVParser,
  getCsvConfig: vi.fn(() => ({ headers: [] })),
}));

vi.mock('@/src/shared/parsers/CSVParser/getCsvConfig', () => ({
  getCsvConfig: vi.fn(() => ({ headers: [] })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock('@/src/shared/context', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useServices: () => ({ contributorService: {}, institutionService: {} }),
}));

import type { ImportIssue, ImportPlan } from '@/src/shared/types';
import { getDefaultWork } from '@/src/shared/utils/work';

import { CSVParse } from './CSVParse';

const createMockFile = () => new File(['imprint,title\nPublisher,Book'], 'test.csv', { type: 'text/csv' });

/**
 * What the CSV parser reports has to reach the same two places the ONIX parser's does: errors
 * stop the upload, warnings travel on to the preview with the data they describe.
 */
describe('CSVParse', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(cleanup);

  const work = getDefaultWork({ id: 'work-1' });

  const warning: ImportIssue = {
    severity: 'warning',
    code: 'onix.series.non_publisher_collection_skipped',
    message: 'something was left behind',
    source: { kind: 'csv', row: 2 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCSVParser.mockImplementation(function () {
      return { parse: mockParse };
    });
  });

  const renderParse = (onPreview: () => void, onValidationFailure: () => void) =>
    render(
      <CSVParse
        file={createMockFile()}
        imprints={[]}
        serieses={[]}
        onValidationFailure={onValidationFailure}
        onPreview={onPreview}
      />,
    );

  const planWith = (series: ImportPlan['series'] = []): ImportPlan => ({ works: [work], chapters: [], series });

  it('carries the plan and its warnings through to the preview', async () => {
    const series = [
      {
        name: 'Arc Companions',
        target: { kind: 'existing' as const, seriesId: 'series-1' },
        members: [{ workId: work.id, orderNumber: 2 }],
      },
    ];

    mockParse.mockResolvedValue({
      status: 'success',
      data: { plan: planWith(series), contributorsForSelection: {} },
      issues: [warning],
    });

    const onPreview = vi.fn();
    const onValidationFailure = vi.fn();
    renderParse(onPreview, onValidationFailure);

    await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

    // One plan, with the series membership intact, and the warnings beside it rather than in it.
    // The source (CSV, and the file's name) travels alongside, never in the plan.
    expect(onPreview).toHaveBeenCalledWith({ works: [work], chapters: [], series }, [warning], {
      type: 'csv',
      filename: 'test.csv',
    });
    expect(onValidationFailure).not.toHaveBeenCalled();
  });

  it('stops at the upload step when the parser reports an error', async () => {
    const error: ImportIssue = {
      severity: 'error',
      code: 'csv.validation',
      message: 'errors.csvImprintNotFound',
      source: { kind: 'csv', row: 1 },
    };

    mockParse.mockResolvedValue({
      status: 'failed',
      data: { plan: { works: [], chapters: [], series: [] }, contributorsForSelection: {} },
      issues: [error],
    });

    const onPreview = vi.fn();
    const onValidationFailure = vi.fn();
    renderParse(onPreview, onValidationFailure);

    await waitFor(() => expect(onValidationFailure).toHaveBeenCalledWith([error]));
    expect(onPreview).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();
  });

  it('reports nothing when a clean file parses', async () => {
    mockParse.mockResolvedValue({
      status: 'success',
      data: { plan: planWith(), contributorsForSelection: {} },
      issues: [],
    });

    const onPreview = vi.fn();
    const onValidationFailure = vi.fn();
    renderParse(onPreview, onValidationFailure);

    await userEvent.click(await screen.findByRole('button', { name: 'preview' }));

    // A CSV import never has chapters.
    expect(onPreview).toHaveBeenCalledWith({ works: [work], chapters: [], series: [] }, [], {
      type: 'csv',
      filename: 'test.csv',
    });
    expect(onValidationFailure).not.toHaveBeenCalled();
  });
});
