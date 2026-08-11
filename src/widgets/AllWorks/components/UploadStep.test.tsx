import { cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
