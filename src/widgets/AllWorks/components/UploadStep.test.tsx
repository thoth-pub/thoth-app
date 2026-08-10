import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCSVParse, mockXMLParse } = vi.hoisted(() => ({ mockCSVParse: vi.fn(), mockXMLParse: vi.fn() }));

vi.mock('./CSVParse', () => ({
  CSVParse: (props: { onValidationFailure?: (issues: unknown[]) => void }) => {
    mockCSVParse(props);

    return <div data-testid="csv-parse" />;
  },
}));

vi.mock('./XMLParse', () => ({
  XMLParse: (props: { onValidationFailure?: (issues: unknown[]) => void }) => {
    mockXMLParse(props);

    return <div data-testid="xml-parse" />;
  },
}));

vi.mock('@/src/entities/series', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useAllUserSerieses: () => ({ serieses: [] }),
}));

vi.mock('@/src/entities/user', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useUser: () => ({ userImprintsOptions: [] }),
}));

vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
}));

import { ONIX_PROCESSING_FAILURE_MESSAGE } from '@/src/shared/parsers/XMLParser/XMLParser';
import type { ImportIssue } from '@/src/shared/types';

import { UploadStep } from './UploadStep';

const uploadCsv = async (contents = 'imprint,title\nPublisher,Book') => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;

  await userEvent.upload(input, new File([contents], 'test.csv', { type: 'text/csv' }));
};

const uploadXml = async (contents = '<ONIXMessage></ONIXMessage>') => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;

  await userEvent.upload(input, new File([contents], 'test.xml', { type: 'text/xml' }));
};

/**
 * The upload step is where a rejected file explains itself. It renders whatever the parser
 * reported, error or not, in the order it was reported.
 */
describe('UploadStep', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an unsupported file type as a problem with the file', async () => {
    render(<UploadStep />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    // The input carries `accept=".csv, .xml"`, which is a hint rather than a guarantee: a file
    // can still arrive by drag and drop or from a browser that ignores it.
    await userEvent.upload(input, new File(['nope'], 'test.pdf', { type: 'application/pdf' }), {
      applyAccept: false,
    });

    expect(screen.getByText(/errors.unsupportedFileType/)).toBeInTheDocument();
    expect(screen.queryByTestId('csv-parse')).not.toBeInTheDocument();
  });

  it('rejects an empty file', async () => {
    render(<UploadStep />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, new File([], 'test.csv', { type: 'text/csv' }));

    expect(screen.getByText(/errors.emptyFile/)).toBeInTheDocument();
  });

  it('shows the warnings a rejected parse also reported, in the parser order', async () => {
    render(<UploadStep />);

    await uploadCsv();

    await waitFor(() => expect(mockCSVParse).toHaveBeenCalled());

    const issues: ImportIssue[] = [
      { severity: 'warning', code: 'csv.validation', message: 'row 2 warning', source: { kind: 'csv', row: 2 } },
      { severity: 'error', code: 'csv.validation', message: 'row 3 error', source: { kind: 'csv', row: 3 } },
    ];

    const { onValidationFailure } = mockCSVParse.mock.calls[0][0];

    onValidationFailure(issues);

    // The error is what stopped the upload, but the warning says what else the file would have
    // lost, so it is shown rather than dropped — and severity does not reorder them.
    const rendered = await screen.findByText(/row 2 warning/);

    expect(rendered).toBeInTheDocument();
    expect(screen.getByText(/row 3 error/)).toBeInTheDocument();
    expect(screen.getByText(/row 2 warning/).textContent).toContain('1.');
    expect(screen.getByText(/row 3 error/).textContent).toContain('2.');
  });

  it('renders the readable ONIX processing failure instead of an i18n key', async () => {
    render(<UploadStep />);

    await uploadXml();
    await waitFor(() => expect(mockXMLParse).toHaveBeenCalled());

    const issue: ImportIssue = {
      severity: 'error',
      code: 'onix.processing_failed',
      message: ONIX_PROCESSING_FAILURE_MESSAGE,
      source: { kind: 'file' },
    };
    const { onValidationFailure } = mockXMLParse.mock.calls[0][0];

    onValidationFailure([issue]);

    expect(await screen.findByText(ONIX_PROCESSING_FAILURE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText('errors.xmlParsingError')).not.toBeInTheDocument();
  });
});
