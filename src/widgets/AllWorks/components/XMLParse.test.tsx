import type { ONIXMessageRoot } from '@5stones/onix/dist/interfaces';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERRORS } from '@/src/shared/constants';
import { ONIX_PROCESSING_FAILURE_MESSAGE } from '@/src/shared/parsers/XMLParser/XMLParser';
import type { ImportIssue } from '@/src/shared/types';
import { getDefaultWork } from '@/src/shared/utils/work';

const { mockRawParse, mockParse, mockXMLParser } = vi.hoisted(() => ({
  mockRawParse: vi.fn(),
  mockParse: vi.fn(),
  mockXMLParser: vi.fn(),
}));

vi.mock('@5stones/onix/dist/parse', () => ({
  parse: (...args: unknown[]) => mockRawParse(...args),
}));

vi.mock('@/src/shared/parsers', () => ({
  XMLParser: mockXMLParser,
}));

vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
}));

import { XMLParse } from './XMLParse';

function createMockFile(
  content = '<ONIXMessage></ONIXMessage>',
  readFile = vi.fn().mockResolvedValue(content),
): File {
  const file = new File([content], 'test.xml', { type: 'text/xml' });
  Object.defineProperty(file, 'text', { configurable: true, value: readFile });
  return file;
}

const parsedOnixData: ONIXMessageRoot = {
  ONIXMessage: {
    Product: [],
  },
};

describe('XMLParse', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRawParse.mockReturnValue(parsedOnixData);
    mockParse.mockResolvedValue({
      status: 'success',
      data: {
        plan: { works: [], chapters: [], series: [] },
        contributorsForSelection: {},
      },
      issues: [],
    });
    mockXMLParser.mockImplementation(function () {
      return {
        parse: mockParse,
      };
    });
  });

  it('reads the exact XML string locally and passes the raw parser result to XMLParser', async () => {
    const xml = '<ONIXMessage release="3.0"><Product /></ONIXMessage>';
    const readFile = vi.fn().mockResolvedValue(xml);
    const file = createMockFile(xml, readFile);
    const onValidationFailure = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(<XMLParse file={file} imprints={[]} serieses={[]} onValidationFailure={onValidationFailure} />);

    await waitFor(() => {
      expect(mockXMLParser).toHaveBeenCalledWith(
        parsedOnixData,
        [],
        expect.any(Array),
        [],
        expect.any(Object),
        expect.any(Object),
        expect.any(Array),
        expect.any(Array),
      );
    });

    expect(readFile).toHaveBeenCalledOnce();
    expect(mockRawParse).toHaveBeenCalledOnce();
    expect(mockRawParse.mock.calls[0][0]).toBe(xml);
    expect(mockParse).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onValidationFailure).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('import-phase-parsing')).not.toBeVisible());
  });

  it('consumes a file larger than the former server request boundary entirely in the client', async () => {
    const formerServerRequestBoundaryBytes = 4_500_000;
    const xml = `<ONIXMessage>${' '.repeat(formerServerRequestBoundaryBytes)}</ONIXMessage>`;
    const readFile = vi.fn().mockResolvedValue(xml);
    const file = createMockFile(xml, readFile);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    expect(file.size).toBeGreaterThan(formerServerRequestBoundaryBytes);
    render(<XMLParse file={file} imprints={[]} serieses={[]} onValidationFailure={vi.fn()} />);

    await waitFor(() => expect(mockRawParse).toHaveBeenCalledOnce());

    expect(readFile).toHaveBeenCalledOnce();
    expect(mockRawParse.mock.calls[0][0]).toBe(xml);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockXMLParser).toHaveBeenCalledOnce();
  });

  it('reports a file.validation issue and stops parsing when File.text rejects', async () => {
    const readFile = vi.fn().mockRejectedValue(new Error('Unable to read selected file'));
    const file = createMockFile(undefined, readFile);
    const onValidationFailure = vi.fn();

    render(<XMLParse file={file} imprints={[]} serieses={[]} onValidationFailure={onValidationFailure} />);

    await waitFor(() => {
      expect(onValidationFailure).toHaveBeenCalledWith([
        {
          severity: 'error',
          code: 'file.validation',
          message: 'Unable to read selected file',
          source: { kind: 'file' },
        },
      ]);
    });

    expect(readFile).toHaveBeenCalledOnce();
    expect(mockRawParse).not.toHaveBeenCalled();
    expect(mockXMLParser).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('import-phase-parsing')).not.toBeVisible());
  });

  it('preserves an Error message from raw ONIX parsing and stops before XMLParser', async () => {
    const onValidationFailure = vi.fn();
    mockRawParse.mockImplementation(() => {
      throw new Error('Invalid ONIX XML at line 12');
    });

    render(<XMLParse file={createMockFile()} imprints={[]} serieses={[]} onValidationFailure={onValidationFailure} />);

    await waitFor(() => {
      expect(onValidationFailure).toHaveBeenCalledWith([
        {
          severity: 'error',
          code: 'file.validation',
          message: 'Invalid ONIX XML at line 12',
          source: { kind: 'file' },
        },
      ]);
    });

    expect(mockXMLParser).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('import-phase-parsing')).not.toBeVisible());
  });

  it('uses the generic XML parsing fallback for a non-Error raw parser failure', async () => {
    const onValidationFailure = vi.fn();
    mockRawParse.mockImplementation(() => {
      throw null;
    });

    render(<XMLParse file={createMockFile()} imprints={[]} serieses={[]} onValidationFailure={onValidationFailure} />);

    await waitFor(() => {
      expect(onValidationFailure).toHaveBeenCalledWith([
        {
          severity: 'error',
          code: 'file.validation',
          message: ERRORS.XML_PARSING_ERROR,
          source: { kind: 'file' },
        },
      ]);
    });

    expect(mockXMLParser).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('import-phase-parsing')).not.toBeVisible());
  });

  describe('issues from the parser', () => {
    const work = getDefaultWork({ id: 'work-1' });

    const warning: ImportIssue = {
      severity: 'warning',
      code: 'onix.series.non_publisher_collection_skipped',
      message: 'Series "Editorial Studies" will not be created',
      source: { kind: 'onix', productIndex: 1 },
    };

    const renderParse = (onPreview: () => void, onValidationFailure: () => void) => {
      return render(
        <XMLParse
          file={createMockFile()}
          imprints={[]}
          serieses={[]}
          onValidationFailure={onValidationFailure}
          onPreview={onPreview}
        />,
      );
    };

    it('shows a truthful ONIX parsing phase while validating, with no fabricated percentage', async () => {
      let resolveParse: (result: unknown) => void = () => {};
      mockParse.mockImplementation(() => new Promise((resolve) => (resolveParse = resolve)));

      render(
        <XMLParse file={createMockFile()} imprints={[]} serieses={[]} onValidationFailure={vi.fn()} onPreview={vi.fn()} />,
      );

      const phase = await screen.findByTestId('import-phase-parsing');
      expect(phase).toBeVisible();
      expect(phase).toHaveTextContent('bulkImport.phase.parsingOnix');
      expect(phase).toHaveAttribute('aria-busy', 'true');
      // Validating and parsing ONIX is indeterminate: no percentage is claimed.
      expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument();

      await act(async () => {
        resolveParse({
          status: 'success',
          data: { plan: { works: [work], chapters: [], series: [] }, contributorsForSelection: {} },
          issues: [],
        });
      });

      await waitFor(() => expect(phase).not.toBeVisible());
    });

    it('carries the plan, its chapters and its warnings through to the preview', async () => {
      const chapter = { ...getDefaultWork({ id: 'chapter-1' }), relationId: work.id };
      const series = [
        {
          name: 'Arc Companions',
          target: { kind: 'existing' as const, seriesId: 'series-1' },
          members: [{ workId: work.id, orderNumber: 3 }],
        },
      ];
      const plan = { works: [work], chapters: [chapter], series };

      mockParse.mockResolvedValue({
        status: 'success',
        data: { plan, contributorsForSelection: {} },
        issues: [warning],
      });

      const onPreview = vi.fn();
      const onValidationFailure = vi.fn();
      renderParse(onPreview, onValidationFailure);

      const preview = await screen.findByRole('button', { name: 'preview' });

      await userEvent.click(preview);

      // One plan, chapters and series membership intact, warnings beside it rather than in it.
      // The source (ONIX, and the file's name) travels alongside, never in the plan.
      expect(onPreview).toHaveBeenCalledWith(plan, [warning], { type: 'onix', filename: 'test.xml' });
      // A warning is not a validation failure, so the upload step never hears about it.
      expect(onValidationFailure).not.toHaveBeenCalled();
    });

    it('stops at the upload step when the parser reports an error', async () => {
      const error: ImportIssue = {
        severity: 'error',
        code: 'onix.validation',
        message: 'Imprint Unknown not found for product 1',
        source: { kind: 'onix', productIndex: 1 },
      };

      mockParse.mockResolvedValue({
        status: 'failed',
        data: { plan: { works: [], chapters: [], series: [] }, contributorsForSelection: {} },
        issues: [warning, error],
      });

      const onPreview = vi.fn();
      const onValidationFailure = vi.fn();
      renderParse(onPreview, onValidationFailure);

      // Warnings raised alongside the error are handed on too, in the parser's order.
      await waitFor(() => expect(onValidationFailure).toHaveBeenCalledWith([warning, error]));
      expect(onPreview).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByTestId('import-phase-parsing')).not.toBeVisible());
    });

    it('hands the display-ready processing failure to the upload step without translating it as a key', async () => {
      const processingFailure: ImportIssue = {
        severity: 'error',
        code: 'onix.processing_failed',
        message: ONIX_PROCESSING_FAILURE_MESSAGE,
        source: { kind: 'file' },
      };

      mockParse.mockResolvedValue({
        status: 'failed',
        data: { plan: { works: [], chapters: [], series: [] }, contributorsForSelection: {} },
        issues: [processingFailure],
      });

      const onPreview = vi.fn();
      const onValidationFailure = vi.fn();
      renderParse(onPreview, onValidationFailure);

      await waitFor(() => expect(onValidationFailure).toHaveBeenCalledWith([processingFailure]));
      expect(onValidationFailure.mock.calls[0][0][0].message).toBe(ONIX_PROCESSING_FAILURE_MESSAGE);
      expect(onValidationFailure.mock.calls[0][0][0].message).not.toBe(ERRORS.XML_PARSING_ERROR);
      expect(onPreview).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.getByTestId('import-phase-parsing')).not.toBeVisible());
    });
  });
});
