import { act, cleanup, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCSVParse, mockXMLParse, xmlParseInstances, csvParseInstances, identity } = vi.hoisted(() => ({
  mockCSVParse: vi.fn(),
  mockXMLParse: vi.fn(),
  /** Which parser instances React mounted and took down, in order, and the next identity to hand out. */
  xmlParseInstances: { mounted: [] as string[], unmounted: [] as string[], next: 0 },
  /** How many CSV parser instances React mounted and took down. */
  csvParseInstances: { mounted: 0, unmounted: 0 },
  /** The identity and session the upload step sees; authoritative unless a test says otherwise. */
  identity: {
    isAuthoritative: true,
    error: null as Error | null,
    sessionExpired: false,
    userId: 'user-1',
    imprints: [] as { value: string; label: string }[],
    serieses: [] as unknown[],
    seriesLoading: false,
    seriesError: null as Error | null,
    sessionDesynced: false,
    publisherId: 'publisher-1' as string | null,
    linkedPublishers: [{ publisherId: 'publisher-1', publisherName: 'Publisher One', imprints: [] }] as unknown[],
  },
}));

// The user and publisher hooks read the identity above unless a test hands them its own (thoth-app#284).
const { mockUseUser, mockUsePublisherStateMachine } = vi.hoisted(() => ({
  mockUseUser: vi.fn(() => ({
    user: { id: identity.userId, linkedPublishers: identity.linkedPublishers },
    userImprintsOptions: identity.imprints,
    isAuthoritative: identity.isAuthoritative,
    error: identity.error,
  })),
  mockUsePublisherStateMachine: vi.fn(() => ({
    activePublisher: identity.publisherId ? { id: identity.publisherId } : null,
  })),
}));

vi.mock('./CSVParse', async () => {
  const { useEffect } = await import('react');

  return {
    CSVParse: (props: { onValidationFailure?: (issues: unknown[]) => void }) => {
      mockCSVParse(props);
      useEffect(() => {
        csvParseInstances.mounted += 1;
        return () => {
          csvParseInstances.unmounted += 1;
        };
      }, []);

      return <div data-testid="csv-parse" />;
    },
  };
});

vi.mock('./XMLParse', async () => {
  const { useEffect, useState } = await import('react');

  return {
    // Carries its own mounted identity, so a replaced selection cannot be mistaken for a reused instance.
    XMLParse: (props: { file: File; onValidationFailure?: (issues: unknown[]) => void; onCancel?: () => void }) => {
      mockXMLParse(props);
      const [instance] = useState(() => `xml-parse-${(xmlParseInstances.next += 1)}`);
      useEffect(() => {
        xmlParseInstances.mounted.push(instance);
        return () => {
          xmlParseInstances.unmounted.push(instance);
        };
      }, [instance]);

      return <div data-testid="xml-parse" data-instance={instance} data-file={props.file.name} />;
    },
  };
});

vi.mock('@/src/entities/series', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useAllUserSerieses: () => ({
    serieses: identity.serieses,
    loading: identity.seriesLoading,
    error: identity.seriesError,
  }),
}));

vi.mock('@/src/entities/user', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useUser: () => mockUseUser(),
}));

vi.mock('@/src/features/auth/ui/SessionWatch/SessionWatch', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useSessionExpiry: () => ({ expired: identity.sessionExpired, desynced: identity.sessionDesynced, loading: false }),
}));

vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: () => mockUsePublisherStateMachine(),
}));

vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: vi.fn(() => ({
    t: (key: string, options?: { filename?: string }) => (options?.filename ? `${key}:${options.filename}` : key),
  })),
}));

import { ThemeProvider } from '@mui/material';

import type { SourceFinding } from '@/src/shared/parsers/XMLParser/validation';
import { ONIX_PROCESSING_FAILURE_MESSAGE } from '@/src/shared/parsers/XMLParser/XMLParser';
import { theme } from '@/src/shared/theme';
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
    xmlParseInstances.mounted.length = 0;
    xmlParseInstances.unmounted.length = 0;
    identity.isAuthoritative = true;
    identity.error = null;
    identity.sessionExpired = false;
    identity.userId = 'user-1';
    identity.imprints = [];
    identity.serieses = [];
    identity.seriesLoading = false;
    identity.seriesError = null;
    identity.sessionDesynced = false;
    identity.publisherId = 'publisher-1';
    identity.linkedPublishers = [{ publisherId: 'publisher-1', publisherName: 'Publisher One', imprints: [] }];
    csvParseInstances.mounted = 0;
    csvParseInstances.unmounted = 0;
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

  /**
   * The XML-to-XML replacement production actually performs. The step renders the parser for the new
   * selection through its own selection path, not through a test helper, so what that path does to the
   * previous selection is exercised here rather than assumed: the replaced parser is taken down, the
   * new one is a distinct instance holding only the new file, and its callbacks belong to it alone.
   */
  it('replaces one XML selection with the next through a fresh, separately scoped parser', async () => {
    render(<UploadStep />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, new File(['<ONIXMessage />'], 'first.xml', { type: 'text/xml' }));
    await waitFor(() => expect(mockXMLParse).toHaveBeenCalledTimes(1));
    const replaced = screen.getByTestId('xml-parse').getAttribute('data-instance');
    const replacedProps = mockXMLParse.mock.calls[0][0];
    expect(replacedProps.file.name).toBe('first.xml');

    await userEvent.upload(input, new File(['<ONIXMessage />'], 'second.xml', { type: 'text/xml' }));
    await waitFor(() => expect(screen.getByTestId('xml-parse')).toHaveAttribute('data-file', 'second.xml'));

    const current = screen.getByTestId('xml-parse').getAttribute('data-instance');
    expect(current).not.toBe(replaced);
    expect(xmlParseInstances.mounted).toEqual([replaced, current]);
    expect(xmlParseInstances.unmounted).toEqual([replaced]);

    const [currentProps] = mockXMLParse.mock.calls[mockXMLParse.mock.calls.length - 1];
    expect(currentProps.file.name).toBe('second.xml');
    expect(currentProps.onValidationFailure).not.toBe(replacedProps.onValidationFailure);
    expect(currentProps.onCancel).not.toBe(replacedProps.onCancel);

    // Anything the replaced selection reports afterwards is not the current selection's business.
    const stale: ImportIssue = {
      severity: 'error',
      code: 'onix.source.validity',
      message: 'stale',
      source: { kind: 'file' },
    };
    act(() => replacedProps.onValidationFailure([stale]));
    act(() => replacedProps.onCancel());

    expect(screen.queryByText(/stale/)).not.toBeInTheDocument();
    expect(screen.getByTestId('xml-parse')).toHaveAttribute('data-file', 'second.xml');
    expect(screen.getByText('fileUpload.selected:second.xml')).toBeInTheDocument();
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

  /**
   * Cancelling an ONIX validation says nothing about the file, so it reports nothing: the step goes
   * back to choosing a file. Like a failure, a cancellation belongs to the selection that raised it.
   */
  it('returns to file selection, reporting nothing, when the current XML validation is cancelled', async () => {
    render(<UploadStep />);

    await uploadXml();
    await waitFor(() => expect(mockXMLParse).toHaveBeenCalledTimes(1));
    const { onCancel } = mockXMLParse.mock.calls[0][0];

    act(() => onCancel());

    expect(screen.queryByTestId('xml-parse')).not.toBeInTheDocument();
    expect(screen.getByText('bulkUpload.instructions')).toBeInTheDocument();
    expect(screen.queryByText(/^\d+\.$/)).not.toBeInTheDocument();
  });

  it('ignores a stale cancellation from a superseded XML selection', async () => {
    render(<UploadStep />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, new File(['<ONIXMessage />'], 'first.xml', { type: 'text/xml' }));
    await waitFor(() => expect(mockXMLParse).toHaveBeenCalledTimes(1));
    const { onCancel: firstCancel } = mockXMLParse.mock.calls[0][0];

    await userEvent.upload(input, new File(['<ONIXMessage />'], 'second.xml', { type: 'text/xml' }));
    await waitFor(() => expect(mockXMLParse).toHaveBeenCalledTimes(2));

    act(() => firstCancel());

    expect(screen.getByText('fileUpload.selected:second.xml')).toBeInTheDocument();
    expect(screen.getByTestId('xml-parse')).toBeInTheDocument();
  });

  describe('a rejected ONIX file', () => {
    const LANGUAGE_RULE = 'Original language of a translation must be distinct from the language of the main text';

    /** A canonical source finding as the source bridge projects it: blocking exactly when it counts. */
    const sourceIssue = (productIndex: number, finding: Partial<SourceFinding> = {}): ImportIssue => {
      const full: SourceFinding = {
        id: '_20171218_f_2',
        tier: 'STRICT',
        stage: 6,
        scope: 'VALIDITY',
        class: 'NORMATIVE_INVALID',
        blocking: true,
        projection: 'AUTHORITATIVE',
        recoverability: 'NOT_RECOVERABLE',
        counts: true,
        path: `/ONIXMessage[1]/Product[${productIndex}]/DescriptiveDetail[1]`,
        message: LANGUAGE_RULE,
        ...finding,
      };
      return {
        severity: full.counts ? 'error' : 'warning',
        code: 'onix.source.validity',
        message: `${full.id} in product ${productIndex}`,
        source: { kind: 'onix', productIndex },
        sourceValidation: { kind: 'finding', finding: full },
      };
    };

    const failXml = async (issues: ImportIssue[]) => {
      await uploadXml();
      await waitFor(() => expect(mockXMLParse).toHaveBeenCalledTimes(1));
      act(() => mockXMLParse.mock.calls[0][0].onValidationFailure(issues));
    };

    it('summarises it by what needs attention, grouping one rule repeated across Products, and clears only the selection', async () => {
      render(<UploadStep />);
      const issues = [
        sourceIssue(1),
        sourceIssue(1, { id: '_20180214_a_1', class: 'ADVISORY', blocking: false, counts: false, message: 'advice' }),
        sourceIssue(2),
        sourceIssue(3),
      ];

      await failXml(issues);

      const summary = screen.getByTestId('import-issue-summary');
      expect(within(summary).getByTestId('import-issue-status')).toHaveTextContent('issueSummary.status.blocked');
      const [blocking] = within(screen.getByTestId('import-issue-category-attention')).getAllByTestId(
        'import-issue-group',
      );
      expect(
        within(screen.getByTestId('import-issue-category-attention')).getAllByTestId('import-issue-group'),
      ).toHaveLength(1);
      expect(blocking).toHaveTextContent(LANGUAGE_RULE);
      expect(
        within(screen.getByTestId('import-issue-category-recommendation')).getAllByTestId('import-issue-group'),
      ).toHaveLength(1);

      await userEvent.click(within(blocking).getByRole('button', { expanded: false }));
      const occurrences = within(blocking).getAllByTestId('import-issue-occurrence');
      expect(occurrences.map((occurrence) => occurrence.textContent)).toEqual([
        expect.stringContaining('_20171218_f_2 in product 1'),
        expect.stringContaining('_20171218_f_2 in product 2'),
        expect.stringContaining('_20171218_f_2 in product 3'),
      ]);

      // Rejection still clears only the active selection, and the flat numbered list is gone.
      expect(screen.queryByTestId('xml-parse')).not.toBeInTheDocument();
      expect(screen.getByText('bulkUpload.instructions')).toBeInTheDocument();
      expect(screen.queryByText(/^\d+\.$/)).not.toBeInTheDocument();
    });

    it('drops a superseded selection’s grouped failure', async () => {
      render(<UploadStep />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, new File(['<ONIXMessage />'], 'first.xml', { type: 'text/xml' }));
      await waitFor(() => expect(mockXMLParse).toHaveBeenCalledTimes(1));
      const { onValidationFailure: stale } = mockXMLParse.mock.calls[0][0];
      await userEvent.upload(input, new File(['<ONIXMessage />'], 'second.xml', { type: 'text/xml' }));
      await waitFor(() => expect(screen.getByTestId('xml-parse')).toHaveAttribute('data-file', 'second.xml'));

      act(() => stale([sourceIssue(1), sourceIssue(2)]));

      expect(screen.queryByTestId('import-issue-summary')).not.toBeInTheDocument();
      expect(screen.getByTestId('xml-parse')).toHaveAttribute('data-file', 'second.xml');
    });
  });

  /**
   * Warning-coloured prose is too pale to read against the page (thoth-app#206): a CSV rejection keeps its order and
   * numbering, but each line says its severity in words and keeps the ordinary text colour.
   */
  it('says each rejected CSV issue’s severity in words, never in the pale warning colour', async () => {
    render(
      <ThemeProvider theme={theme}>
        <UploadStep />
      </ThemeProvider>,
    );
    await uploadCsv();
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalled());

    act(() =>
      mockCSVParse.mock.calls[0][0].onValidationFailure([
        { severity: 'warning', code: 'csv.validation', message: 'row 2 warning', source: { kind: 'csv', row: 2 } },
        { severity: 'error', code: 'csv.validation', message: 'row 3 error', source: { kind: 'csv', row: 3 } },
      ] satisfies ImportIssue[]),
    );

    const warningLine = screen.getByText(/row 2 warning/);
    expect(warningLine).toHaveTextContent('1. issueSummary.severity.warning: row 2 warning');
    expect(screen.getByText(/row 3 error/)).toHaveTextContent('2. issueSummary.severity.error: row 3 error');
    expect(screen.queryByTestId('import-issue-summary')).not.toBeInTheDocument();

    const paleWarning = theme.palette.warning.main.toLowerCase();
    const pale = [paleWarning, `rgb(${[1, 3, 5].map((at) => parseInt(paleWarning.slice(at, at + 2), 16)).join(', ')})`];
    const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]);
    for (let element: Element | null = warningLine; element !== null; element = element.parentElement) {
      const classes = [...element.classList].map((name) => `.${name}`);
      rules.forEach((rule) => {
        if (!(rule instanceof CSSStyleRule) || !rule.style.color) return;
        if (rule.selectorText.split(/[\s,>+~]+/).some((selector) => classes.includes(selector))) {
          expect(pale).not.toContain(rule.style.color.toLowerCase());
        }
      });
    }
  });

  it('ignores a stale XML cancellation after the file is replaced with CSV', async () => {
    render(<UploadStep />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, new File(['<ONIXMessage />'], 'first.xml', { type: 'text/xml' }));
    await waitFor(() => expect(mockXMLParse).toHaveBeenCalledTimes(1));
    const { onCancel: xmlCancel } = mockXMLParse.mock.calls[0][0];

    await userEvent.upload(input, new File(['title\nBook'], 'second.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalledTimes(1));

    act(() => xmlCancel());

    expect(screen.getByText('fileUpload.selected:second.csv')).toBeInTheDocument();
    expect(screen.getByTestId('csv-parse')).toBeInTheDocument();
  });

  /*
    APP-AUTH-SESSION-EXPIRY-01 (thoth-app#285): the parsers match a file against the user's imprints,
    so they must never run on identity that is still loading or belongs to an expired session - that
    empty identity is what reported every imprint of a valid file as "not found".
  */
  describe('identity gate', () => {
    const uploads = [
      { kind: 'ONIX', upload: () => uploadXml(), parser: mockXMLParse, testId: 'xml-parse' },
      { kind: 'CSV', upload: () => uploadCsv(), parser: mockCSVParse, testId: 'csv-parse' },
    ];

    it.each(uploads)(
      'does not parse a $kind file while identity is loading, and says it is loading',
      async ({ upload, parser, testId }) => {
        identity.isAuthoritative = false;
        render(<UploadStep />);

        await upload();

        expect(screen.getByTestId('upload-session-loading')).toHaveTextContent('upload.session.loading');
        expect(parser).not.toHaveBeenCalled();
        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
      },
    );

    it.each(uploads)(
      'does not parse a $kind file once the session has expired, and says so',
      async ({ upload, parser, testId }) => {
        identity.isAuthoritative = false;
        identity.sessionExpired = true;
        render(<UploadStep />);

        await upload();

        expect(screen.getByTestId('upload-session-expired')).toHaveTextContent('upload.session.expired');
        expect(screen.queryByTestId('upload-session-loading')).not.toBeInTheDocument();
        expect(parser).not.toHaveBeenCalled();
        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
      },
    );

    it('says the account details could not be loaded when the identity query failed', async () => {
      identity.isAuthoritative = false;
      identity.error = new Error('me failed');
      render(<UploadStep />);

      await uploadXml();

      expect(screen.getByTestId('upload-session-unavailable')).toHaveTextContent('upload.session.unavailable');
      expect(mockXMLParse).not.toHaveBeenCalled();
    });

    it.each(uploads)(
      'parses a $kind file selected while identity loaded, once identity is authoritative',
      async ({ upload, parser, testId }) => {
        identity.isAuthoritative = false;
        const { rerender } = render(<UploadStep />);

        await upload();
        expect(parser).not.toHaveBeenCalled();

        identity.isAuthoritative = true;
        rerender(<UploadStep />);

        await waitFor(() => expect(parser).toHaveBeenCalledTimes(1));
        expect(screen.getByTestId(testId)).toBeInTheDocument();
        expect(screen.queryByTestId('upload-session-loading')).not.toBeInTheDocument();
      },
    );

    it.each(uploads)(
      'takes a running $kind parser down when identity is lost, and never shows what it reports later',
      async ({ upload, parser, testId }) => {
        const { rerender } = render(<UploadStep />);

        await upload();
        await waitFor(() => expect(parser).toHaveBeenCalledTimes(1));
        const { onValidationFailure } = parser.mock.calls[0][0];

        identity.isAuthoritative = false;
        identity.sessionExpired = true;
        rerender(<UploadStep />);

        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        expect(screen.getByTestId('upload-session-expired')).toBeInTheDocument();

        const lateIssue: ImportIssue = {
          severity: 'error',
          code: 'file.validation',
          message: 'Imprint University of London Press not found',
          source: { kind: 'file' },
        };
        act(() => onValidationFailure([lateIssue]));

        expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();

        // Identity coming back does not resurrect the abandoned parse: the file is chosen again.
        identity.isAuthoritative = true;
        identity.sessionExpired = false;
        rerender(<UploadStep />);

        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        expect(parser).toHaveBeenCalledTimes(1);
        expect(screen.getByText('bulkUpload.instructions')).toBeInTheDocument();
      },
    );

    const mountedCount = (kind: string) =>
      kind === 'ONIX'
        ? { mounted: xmlParseInstances.mounted.length, unmounted: xmlParseInstances.unmounted.length }
        : { ...csvParseInstances };

    it.each(uploads)(
      'keeps a running $kind parser through a background refetch of identity',
      async ({ kind, upload, parser, testId }) => {
        const { rerender } = render(<UploadStep />);

        await upload();
        await waitFor(() => expect(mountedCount(kind).mounted).toBe(1));

        // `me` refetching (window focus, invalidation): not authoritative, but nothing is lost.
        identity.isAuthoritative = false;
        rerender(<UploadStep />);

        expect(screen.getByTestId(testId)).toBeInTheDocument();
        expect(screen.queryByTestId('upload-session-loading')).not.toBeInTheDocument();

        identity.isAuthoritative = true;
        rerender(<UploadStep />);

        expect(screen.getByTestId(testId)).toBeInTheDocument();
        expect(screen.getByText(/fileUpload\.selected:test\.(xml|csv)/)).toBeInTheDocument();
        expect(mountedCount(kind)).toEqual({ mounted: 1, unmounted: 0 });
        expect(parser).toHaveBeenCalled();
      },
    );

    it.each(uploads)(
      'keeps a running $kind parser on its settled imprints through a token rotation',
      async ({ kind, upload, parser, testId }) => {
        identity.imprints = [{ value: 'imprint-1', label: 'University of London Press' }];
        const { rerender } = render(<UploadStep />);

        await upload();
        await waitFor(() => expect(mountedCount(kind).mounted).toBe(1));

        // A rotated token is a new `me` query key: until it settles, `useUser` reads as the empty default user.
        identity.isAuthoritative = false;
        identity.userId = '';
        identity.imprints = [];
        rerender(<UploadStep />);

        expect(screen.getByTestId(testId)).toBeInTheDocument();
        expect(parser.mock.lastCall?.[0].imprints).toEqual([
          { value: 'imprint-1', label: 'University of London Press' },
        ]);

        identity.isAuthoritative = true;
        identity.userId = 'user-1';
        identity.imprints = [{ value: 'imprint-1', label: 'University of London Press' }];
        rerender(<UploadStep />);

        expect(mountedCount(kind)).toEqual({ mounted: 1, unmounted: 0 });
      },
    );

    it.each(uploads)(
      'takes a running $kind parser down when the identity query fails',
      async ({ kind, upload, testId }) => {
        const { rerender } = render(<UploadStep />);

        await upload();
        await waitFor(() => expect(mountedCount(kind).mounted).toBe(1));

        identity.isAuthoritative = false;
        identity.error = new Error('me failed');
        rerender(<UploadStep />);

        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        expect(screen.getByTestId('upload-session-unavailable')).toBeInTheDocument();
        expect(mountedCount(kind).unmounted).toBe(1);
      },
    );

    it.each(uploads)(
      'takes a running $kind parser down when identity settles on a different user',
      async ({ kind, upload, parser, testId }) => {
        const { rerender } = render(<UploadStep />);

        await upload();
        await waitFor(() => expect(mountedCount(kind).mounted).toBe(1));
        const { onValidationFailure } = parser.mock.calls[0][0];

        identity.userId = 'user-2';
        rerender(<UploadStep />);

        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        expect(mountedCount(kind).unmounted).toBe(1);
        expect(screen.getByText('bulkUpload.instructions')).toBeInTheDocument();

        act(() =>
          onValidationFailure([
            { severity: 'error', code: 'file.validation', message: 'stale result', source: { kind: 'file' } },
          ]),
        );
        expect(screen.queryByText('stale result')).not.toBeInTheDocument();

        // The new identity is settled, so the next file parses against it.
        await upload();
        await waitFor(() => expect(mountedCount(kind).mounted).toBe(2));
      },
    );

    it.each(uploads)(
      'does not parse a $kind file until the Series list has settled, then parses it against that list',
      async ({ kind, upload, parser, testId }) => {
        const series = { id: 'series-1', name: 'Existing Series' };
        identity.seriesLoading = true;
        const { rerender } = render(<UploadStep />);

        await upload();

        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        expect(screen.getByTestId('upload-session-loading')).toBeInTheDocument();
        expect(parser).not.toHaveBeenCalled();

        identity.seriesLoading = false;
        identity.serieses = [series];
        rerender(<UploadStep />);

        await waitFor(() => expect(mountedCount(kind).mounted).toBe(1));
        expect(parser.mock.calls[0][0].serieses).toEqual([series]);
      },
    );

    it.each(uploads)(
      'does not parse a $kind file against a failed Series lookup, and parses it once the lookup succeeds',
      async ({ kind, upload, parser, testId }) => {
        const series = { id: 'series-1', name: 'Existing Series' };
        identity.seriesError = new Error('serieses failed');
        const { rerender } = render(<UploadStep />);

        await upload();

        expect(screen.getByTestId('upload-session-unavailable')).toHaveTextContent('upload.session.unavailable');
        expect(screen.queryByTestId('upload-session-loading')).not.toBeInTheDocument();
        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        expect(parser).not.toHaveBeenCalled();

        identity.seriesError = null;
        identity.serieses = [series];
        rerender(<UploadStep />);

        await waitFor(() => expect(mountedCount(kind).mounted).toBe(1));
        expect(parser.mock.calls.every(([props]) => props.serieses.length === 1)).toBe(true);
      },
    );

    it.each(uploads)(
      'keeps a running $kind parser on the Series list it latched when a later Series lookup fails',
      async ({ kind, upload, parser, testId }) => {
        const series = { id: 'series-1', name: 'Existing Series' };
        identity.serieses = [series];
        const { rerender } = render(<UploadStep />);

        await upload();
        await waitFor(() => expect(mountedCount(kind).mounted).toBe(1));

        identity.seriesError = new Error('serieses refetch failed');
        identity.serieses = [];
        rerender(<UploadStep />);

        expect(screen.getByTestId(testId)).toBeInTheDocument();
        expect(mountedCount(kind)).toEqual({ mounted: 1, unmounted: 0 });
        expect(parser.mock.calls.every(([props]) => props.serieses[0] === series)).toBe(true);
      },
    );

    it('says the account details are unavailable, not loading, while the session is out of step', async () => {
      identity.isAuthoritative = false;
      identity.sessionDesynced = true;
      render(<UploadStep />);

      await uploadXml();

      expect(screen.getByTestId('upload-session-unavailable')).toHaveTextContent('upload.session.unavailable');
      expect(screen.queryByTestId('upload-session-loading')).not.toBeInTheDocument();
      expect(mockXMLParse).not.toHaveBeenCalled();
    });

    it.each(uploads)(
      'keeps a running $kind parser while the session is out of step',
      async ({ kind, upload, testId }) => {
        const { rerender } = render(<UploadStep />);

        await upload();
        await waitFor(() => expect(mountedCount(kind).mounted).toBe(1));

        identity.isAuthoritative = false;
        identity.sessionDesynced = true;
        rerender(<UploadStep />);

        expect(screen.getByTestId(testId)).toBeInTheDocument();
        expect(mountedCount(kind)).toEqual({ mounted: 1, unmounted: 0 });
        expect(screen.queryByTestId('upload-session-changed')).not.toBeInTheDocument();
      },
    );

    it.each(uploads)(
      'takes a running $kind parser down when the active publisher changes, and says why the file was cleared',
      async ({ kind, upload, parser, testId }) => {
        identity.imprints = [{ value: 'imprint-1', label: 'First Imprint' }];
        const { rerender } = render(<UploadStep />);

        await upload();
        await waitFor(() => expect(mountedCount(kind).mounted).toBe(1));
        const { onValidationFailure } = parser.mock.calls[0][0];

        identity.publisherId = 'publisher-2';
        identity.imprints = [{ value: 'imprint-2', label: 'Second Imprint' }];
        rerender(<UploadStep />);

        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        expect(mountedCount(kind).unmounted).toBe(1);
        expect(parser.mock.calls.every(([props]) => props.imprints[0]?.value !== 'imprint-2')).toBe(true);
        expect(screen.getByTestId('upload-session-changed')).toHaveTextContent('upload.session.changed');

        act(() =>
          onValidationFailure([
            { severity: 'error', code: 'file.validation', message: 'stale result', source: { kind: 'file' } },
          ]),
        );
        expect(screen.queryByText('stale result')).not.toBeInTheDocument();

        // Selecting the file again clears the explanation and parses against the new publisher.
        await upload();
        await waitFor(() => expect(mountedCount(kind).mounted).toBe(2));
        expect(parser.mock.lastCall?.[0].imprints).toEqual([{ value: 'imprint-2', label: 'Second Imprint' }]);
        expect(screen.queryByTestId('upload-session-changed')).not.toBeInTheDocument();
      },
    );

    it('says why the file was cleared when identity settles on a different user, but not when the identity query fails', async () => {
      const { rerender } = render(<UploadStep />);

      await uploadXml();
      await waitFor(() => expect(xmlParseInstances.mounted).toHaveLength(1));
      identity.userId = 'user-2';
      rerender(<UploadStep />);
      expect(screen.getByTestId('upload-session-changed')).toBeInTheDocument();

      await uploadXml();
      expect(screen.queryByTestId('upload-session-changed')).not.toBeInTheDocument();
      await waitFor(() => expect(xmlParseInstances.mounted).toHaveLength(2));
      identity.isAuthoritative = false;
      identity.error = new Error('me failed');
      rerender(<UploadStep />);
      // A failed `me` changed nothing: it says only that the account details could not be loaded.
      expect(xmlParseInstances.unmounted).toHaveLength(2);
      expect(screen.getByTestId('upload-session-unavailable')).toBeInTheDocument();
      expect(screen.queryByTestId('upload-session-changed')).not.toBeInTheDocument();
    });

    it.each(uploads)(
      'does not parse a $kind file before the active publisher is restored, even when Series settled first',
      async ({ kind, upload, parser, testId }) => {
        identity.publisherId = null;
        const { rerender } = render(<UploadStep />);

        await upload();

        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        expect(screen.getByTestId('upload-session-loading')).toBeInTheDocument();
        expect(parser).not.toHaveBeenCalled();

        identity.publisherId = 'publisher-1';
        identity.imprints = [{ value: 'imprint-1', label: 'University of London Press' }];
        rerender(<UploadStep />);

        await waitFor(() => expect(mountedCount(kind).mounted).toBe(1));
        expect(parser.mock.calls[0][0].imprints).toEqual([{ value: 'imprint-1', label: 'University of London Press' }]);
      },
    );

    it('latches without an active publisher for a user with no linked publishers', async () => {
      identity.publisherId = null;
      identity.linkedPublishers = [];
      render(<UploadStep />);

      await uploadXml();

      await waitFor(() => expect(xmlParseInstances.mounted).toHaveLength(1));
    });

    it('does not claim the account changed when the session expired', async () => {
      const { rerender } = render(<UploadStep />);

      await uploadXml();
      await waitFor(() => expect(xmlParseInstances.mounted).toHaveLength(1));
      identity.isAuthoritative = false;
      identity.sessionExpired = true;
      rerender(<UploadStep />);

      expect(screen.getByTestId('upload-session-expired')).toBeInTheDocument();
      expect(screen.queryByTestId('upload-session-changed')).not.toBeInTheDocument();
    });
  });
});

/**
 * What the parsers may say about an imprint the active publisher does not hold (thoth-app#284): the active publisher
 * and the user's own linked publishers from me.publisherContexts, never the wider list a superuser can work in.
 */
describe('UploadStep imprint context', () => {
  // The session and Series still come from the shared identity, which an earlier test may have left expired.
  beforeEach(() => {
    vi.clearAllMocks();
    identity.isAuthoritative = true;
    identity.error = null;
    identity.sessionExpired = false;
    identity.userId = 'user-1';
    identity.imprints = [];
    identity.serieses = [];
    identity.seriesLoading = false;
    identity.sessionDesynced = false;
    identity.publisherId = 'publisher-1';
    identity.linkedPublishers = [{ publisherId: 'publisher-1', publisherName: 'Publisher One', imprints: [] }];
  });

  afterEach(() => {
    cleanup();
    mockUseUser.mockReset();
    mockUsePublisherStateMachine.mockReset();
  });

  const LINKED = {
    publisherId: 'publisher-linked',
    publisherName: 'Linked Press',
    publisherAdmin: false,
    workLifecycle: false,
    cdnWrite: false,
    imprints: [{ id: 'imprint-linked', name: 'Linked Imprint', url: 'https://example.org' }],
  };

  const arrange = () => {
    mockUseUser.mockReturnValue({
      userImprintsOptions: [],
      user: { linkedPublishers: [LINKED] },
      isAuthoritative: true,
    } as never);
    mockUsePublisherStateMachine.mockReturnValue({
      activePublisher: { id: 'publisher-unlinked', name: 'Unlinked Press', imprints: [] },
      linkedPublishers: [{ id: 'publisher-hidden', name: 'Hidden Press', imprints: [] }],
    } as never);
  };

  const EXPECTED = {
    identityLoaded: true,
    activePublisher: { id: 'publisher-unlinked', name: 'Unlinked Press' },
    linkedPublishers: [
      {
        publisherId: 'publisher-linked',
        publisherName: 'Linked Press',
        imprints: [{ id: 'imprint-linked', name: 'Linked Imprint' }],
      },
    ],
  };

  it('hands both parsers the active publisher and only the user’s own linked publishers', async () => {
    arrange();
    render(<UploadStep />);

    await uploadCsv();
    await waitFor(() => expect(mockCSVParse).toHaveBeenCalled());
    expect(mockCSVParse.mock.lastCall?.[0].imprintContext).toEqual(EXPECTED);

    await uploadXml();
    await waitFor(() => expect(mockXMLParse).toHaveBeenCalled());
    expect(mockXMLParse.mock.lastCall?.[0].imprintContext).toEqual(EXPECTED);
    expect(JSON.stringify(mockXMLParse.mock.lastCall?.[0].imprintContext)).not.toContain('Hidden Press');
  });
});
