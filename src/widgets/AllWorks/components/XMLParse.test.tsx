import type { ONIXMessageRoot } from '@5stones/onix/dist/interfaces';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERRORS } from '@/src/shared/constants';
import type { ImportIssue } from '@/src/shared/types';
import { getDefaultWork } from '@/src/shared/utils/work';

const { mockValidateXml, mockParse, mockXMLParser } = vi.hoisted(() => ({
  mockValidateXml: vi.fn(),
  mockParse: vi.fn(),
  mockXMLParser: vi.fn(),
}));

vi.mock('@/app/actions/validateXml', () => ({
  validateXml: (...args: unknown[]) => mockValidateXml(...args),
}));

vi.mock('@/src/shared/parsers', () => ({
  XMLParser: mockXMLParser,
}));

vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
}));

import { XMLParse } from './XMLParse';

function createMockFile(): File {
  return new File(['<ONIXMessage></ONIXMessage>'], 'test.xml', { type: 'text/xml' });
}

const parsedOnixData: ONIXMessageRoot = {
  ONIXMessage: {
    Product: [],
  },
};

describe('XMLParse', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('XMLParse_displaysUnauthorizedFromValidateXml', async () => {
    const onValidationFailure = vi.fn();
    mockValidateXml.mockResolvedValue({ status: 'error', error: 'Unauthorized' });

    render(<XMLParse file={createMockFile()} imprints={[]} serieses={[]} onValidationFailure={onValidationFailure} />);

    await waitFor(() => {
      expect(onValidationFailure).toHaveBeenCalledWith([
        { severity: 'error', code: 'file.validation', message: 'Unauthorized', source: { kind: 'file' } },
      ]);
    });

    expect(mockXMLParser).not.toHaveBeenCalled();
  });

  it('falls back to the generic XML parsing error when successful validation has no data', async () => {
    const onValidationFailure = vi.fn();
    mockValidateXml.mockResolvedValue({ status: 'success' });

    render(<XMLParse file={createMockFile()} imprints={[]} serieses={[]} onValidationFailure={onValidationFailure} />);

    await waitFor(() => {
      expect(onValidationFailure).toHaveBeenCalledWith([
        { severity: 'error', code: 'file.validation', message: ERRORS.XML_PARSING_ERROR, source: { kind: 'file' } },
      ]);
    });

    expect(mockXMLParser).not.toHaveBeenCalled();
  });

  it('passes parsed ONIX data to XMLParser on successful validation', async () => {
    const onValidationFailure = vi.fn();
    mockValidateXml.mockResolvedValue({ status: 'success', data: parsedOnixData });

    render(<XMLParse file={createMockFile()} imprints={[]} serieses={[]} onValidationFailure={onValidationFailure} />);

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

    expect(mockParse).toHaveBeenCalled();
    expect(onValidationFailure).not.toHaveBeenCalled();
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
      mockValidateXml.mockResolvedValue({ status: 'success', data: parsedOnixData });

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
      expect(onPreview).toHaveBeenCalledWith(plan, [warning]);
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
    });
  });
});
