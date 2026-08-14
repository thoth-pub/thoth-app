import { act, cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: vi.fn(() => ({
    t: (key: string, options?: { filename?: string }) => (options?.filename ? `${key}:${options.filename}` : key),
  })),
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

const dropFile = (file: File) => {
  const dropzone = document.querySelector('[data-drag-active]') as HTMLElement;
  const event = createEvent.drop(dropzone);
  Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });
  const preventDefault = vi.spyOn(event, 'preventDefault');
  fireEvent(dropzone, event);
  return preventDefault;
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

  it('selects CSV and XML through browse and invokes the matching parser once', async () => {
    const { unmount } = render(<UploadStep />);

    await uploadCsv();
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));
    expect(screen.getByText('fileUpload.selected:test.csv')).toBeInTheDocument();
    expect(mockXMLParse).not.toHaveBeenCalled();

    unmount();
    vi.clearAllMocks();
    render(<UploadStep />);
    await uploadXml();
    await waitFor(() => expect(mockXMLParse).toHaveBeenCalledTimes(1));
    expect(screen.getByText('fileUpload.selected:test.xml')).toBeInTheDocument();
    expect(mockCSVParse).not.toHaveBeenCalled();
  });

  it('selects CSV and XML through drop and prevents browser navigation', async () => {
    const { unmount } = render(<UploadStep />);
    const csv = new File(['title\nBook'], 'drop.csv', { type: 'text/csv' });
    const csvPreventDefault = dropFile(csv);

    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));
    expect(csvPreventDefault).toHaveBeenCalled();

    unmount();
    vi.clearAllMocks();
    render(<UploadStep />);
    const xml = new File(['<ONIXMessage />'], 'drop.xml', { type: 'text/xml' });
    const xmlPreventDefault = dropFile(xml);

    await waitFor(() => expect(mockXMLParse).toHaveBeenCalledTimes(1));
    expect(xmlPreventDefault).toHaveBeenCalled();
  });

  it('replaces CSV with XML and XML with CSV using the correct parser', async () => {
    render(<UploadStep />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, new File(['title\nBook'], 'first.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));
    await userEvent.upload(input, new File(['<ONIXMessage />'], 'second.xml', { type: 'text/xml' }));
    await waitFor(() => expect(mockXMLParse).toHaveBeenCalledTimes(1));
    await userEvent.upload(input, new File(['title\nOther'], 'third.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(2));

    expect(screen.getByText('fileUpload.selected:third.csv')).toBeInTheDocument();
  });

  it('allows same-file reselection and invokes the parser once per accepted selection', async () => {
    render(<UploadStep />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['title\nBook'], 'same.csv', { type: 'text/csv' });

    await userEvent.upload(input, file);
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));
    await userEvent.upload(input, file);
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(2));
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

  it('rejects unsupported drops and remains usable for retry', async () => {
    render(<UploadStep />);

    dropFile(new File(['nope'], 'test.pdf', { type: 'application/pdf' }));
    expect(screen.getByText(/errors.unsupportedFileType/)).toBeInTheDocument();
    expect(screen.queryByTestId('csv-parse')).not.toBeInTheDocument();

    await uploadCsv();
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/errors.unsupportedFileType/)).not.toBeInTheDocument();
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

  it('renders every issue of an aggregated preflight failure, with an orienting summary line', async () => {
    render(<UploadStep />);

    await uploadCsv();
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalled());

    const issues: ImportIssue[] = [
      { severity: 'error', code: 'csv.validation', message: 'first row 1 error', source: { kind: 'csv', row: 1 } },
      { severity: 'error', code: 'csv.validation', message: 'second row 1 error', source: { kind: 'csv', row: 1 } },
      { severity: 'error', code: 'csv.validation', message: 'row 3 error', source: { kind: 'csv', row: 3 } },
    ];

    mockCSVParse.mock.calls[0][0].onValidationFailure(issues);

    // The summary orients; every individual finding is still rendered beneath it.
    expect(await screen.findByTestId('import-issues-summary')).toHaveTextContent('bulkImport.issuesSummary');
    expect(screen.getByText(/first row 1 error/)).toBeInTheDocument();
    expect(screen.getByText(/second row 1 error/)).toBeInTheDocument();
    expect(screen.getByText(/row 3 error/)).toBeInTheDocument();
  });

  it('shows no summary line for a single finding or a file-level failure', async () => {
    render(<UploadStep />);

    await uploadCsv();
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalled());

    mockCSVParse.mock.calls[0][0].onValidationFailure([
      { severity: 'error', code: 'csv.validation', message: 'the only finding', source: { kind: 'file' } },
    ] satisfies ImportIssue[]);

    await screen.findByText(/the only finding/);
    expect(screen.queryByTestId('import-issues-summary')).not.toBeInTheDocument();
  });

  /**
   * The dropzone stays available while a parser is validating, so a file can be replaced before
   * its predecessor's asynchronous validation settles. A failure from a superseded selection must
   * not touch the current one. Parsers are mocked, so completion order is driven explicitly by
   * invoking the captured callbacks — no timing is involved.
   */
  const fileIssue = (message: string): ImportIssue[] => [
    { severity: 'error', code: 'file.validation', message, source: { kind: 'file' } },
  ];

  it('ignores a stale CSV failure after the file is replaced with another CSV', async () => {
    render(<UploadStep />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, new File(['title\nBook'], 'first.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));
    const { onValidationFailure: firstFailure } = mockCSVParse.mock.calls[0][0];

    await userEvent.upload(input, new File(['title\nOther'], 'second.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(2));

    act(() => firstFailure(fileIssue('first.csv failed')));

    expect(screen.getByText('fileUpload.selected:second.csv')).toBeInTheDocument();
    expect(screen.getByTestId('csv-parse')).toBeInTheDocument();
    expect(screen.queryByText(/first\.csv failed/)).not.toBeInTheDocument();
  });

  it('ignores a stale CSV failure after the file is replaced with XML', async () => {
    render(<UploadStep />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, new File(['title\nBook'], 'first.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));
    const { onValidationFailure: csvFailure } = mockCSVParse.mock.calls[0][0];

    await userEvent.upload(input, new File(['<ONIXMessage />'], 'second.xml', { type: 'text/xml' }));
    await waitFor(() => expect(mockXMLParse).toHaveBeenCalledTimes(1));

    act(() => csvFailure(fileIssue('first.csv failed')));

    expect(screen.getByText('fileUpload.selected:second.xml')).toBeInTheDocument();
    expect(screen.getByTestId('xml-parse')).toBeInTheDocument();
    expect(screen.queryByText(/first\.csv failed/)).not.toBeInTheDocument();
  });

  it('ignores a stale XML failure after the file is replaced with CSV', async () => {
    render(<UploadStep />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, new File(['<ONIXMessage />'], 'first.xml', { type: 'text/xml' }));
    await waitFor(() => expect(mockXMLParse).toHaveBeenCalledTimes(1));
    const { onValidationFailure: xmlFailure } = mockXMLParse.mock.calls[0][0];

    await userEvent.upload(input, new File(['title\nBook'], 'second.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));

    act(() => xmlFailure(fileIssue('first.xml failed')));

    expect(screen.getByText('fileUpload.selected:second.csv')).toBeInTheDocument();
    expect(screen.getByTestId('csv-parse')).toBeInTheDocument();
    expect(screen.queryByText(/first\.xml failed/)).not.toBeInTheDocument();
  });

  it('clears a failed current selection and leaves the dropzone ready for retry', async () => {
    render(<UploadStep />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, new File(['title\nBook'], 'bad.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));

    const { onValidationFailure } = mockCSVParse.mock.calls[0][0];

    act(() => onValidationFailure(fileIssue('bad.csv failed')));

    expect(screen.getByText(/bad\.csv failed/)).toBeInTheDocument();
    expect(screen.queryByTestId('csv-parse')).not.toBeInTheDocument();
    expect(screen.getByText('bulkUpload.instructions')).toBeInTheDocument();

    await userEvent.upload(input, new File(['title\nRetry'], 'retry.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(2));
    expect(screen.getByText('fileUpload.selected:retry.csv')).toBeInTheDocument();
    expect(screen.queryByText(/bad\.csv failed/)).not.toBeInTheDocument();
  });

  it('keeps an invalid replacement rejection when the superseded parser later fails', async () => {
    render(<UploadStep />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, new File(['title\nBook'], 'pending.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));
    const { onValidationFailure: pendingFailure } = mockCSVParse.mock.calls[0][0];

    // A rejected attempt is still a new selection, so it supersedes the pending parse.
    await userEvent.upload(input, new File(['nope'], 'invalid.pdf', { type: 'application/pdf' }), {
      applyAccept: false,
    });

    expect(screen.getByText(/errors.unsupportedFileType/)).toBeInTheDocument();
    expect(screen.queryByTestId('csv-parse')).not.toBeInTheDocument();

    act(() => pendingFailure(fileIssue('pending.csv failed')));

    expect(screen.getByText(/errors.unsupportedFileType/)).toBeInTheDocument();
    expect(screen.queryByText(/pending\.csv failed/)).not.toBeInTheDocument();
  });

  it('ignores a stale failure from the first parse when the same file is reselected', async () => {
    render(<UploadStep />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['title\nBook'], 'same.csv', { type: 'text/csv' });

    await userEvent.upload(input, file);
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));
    const { onValidationFailure: firstFailure } = mockCSVParse.mock.calls[0][0];

    await userEvent.upload(input, file);
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(2));
    const { onValidationFailure: secondFailure } = mockCSVParse.mock.calls[1][0];

    act(() => firstFailure(fileIssue('first parse failed')));

    expect(screen.getByText('fileUpload.selected:same.csv')).toBeInTheDocument();
    expect(screen.queryByText(/first parse failed/)).not.toBeInTheDocument();

    // The reselected parse is the authoritative one: its failure still lands.
    act(() => secondFailure(fileIssue('second parse failed')));

    expect(screen.getByText(/second parse failed/)).toBeInTheDocument();
    expect(screen.getByText('bulkUpload.instructions')).toBeInTheDocument();
  });

  it('does not let a cleared selection be mistaken for a later one', async () => {
    render(<UploadStep />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, new File(['title\nBook'], 'first.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));
    const { onValidationFailure: firstFailure } = mockCSVParse.mock.calls[0][0];

    // Still current, so this failure clears the selection.
    act(() => firstFailure(fileIssue('first failed')));
    expect(screen.getByText(/first failed/)).toBeInTheDocument();
    expect(screen.queryByTestId('csv-parse')).not.toBeInTheDocument();

    await userEvent.upload(input, new File(['title\nNext'], 'next.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(2));

    // If selection IDs restarted once the selection cleared, the old parser would match the new
    // selection's ID and clobber it.
    act(() => firstFailure(fileIssue('first failed again')));

    expect(screen.getByText('fileUpload.selected:next.csv')).toBeInTheDocument();
    expect(screen.getByTestId('csv-parse')).toBeInTheDocument();
    expect(screen.queryByText(/first failed again/)).not.toBeInTheDocument();
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
