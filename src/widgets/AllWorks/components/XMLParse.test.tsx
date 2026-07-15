import { render, waitFor } from '@testing-library/react';
import type { ONIXMessageRoot } from '@5stones/onix/dist/interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERRORS } from '@/src/shared/constants';

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
  beforeEach(() => {
    vi.clearAllMocks();
    mockParse.mockResolvedValue({
      status: 'success',
      data: {
        works: [],
        chapters: [],
        series: {},
        contributorsForSelection: {},
      },
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

    render(
      <XMLParse
        file={createMockFile()}
        imprints={[]}
        serieses={[]}
        onValidationFailure={onValidationFailure}
      />,
    );

    await waitFor(() => {
      expect(onValidationFailure).toHaveBeenCalledWith(['Unauthorized']);
    });

    expect(onValidationFailure).not.toHaveBeenCalledWith([ERRORS.XML_PARSING_ERROR]);
    expect(mockXMLParser).not.toHaveBeenCalled();
  });

  it('falls back to the generic XML parsing error when successful validation has no data', async () => {
    const onValidationFailure = vi.fn();
    mockValidateXml.mockResolvedValue({ status: 'success' });

    render(
      <XMLParse
        file={createMockFile()}
        imprints={[]}
        serieses={[]}
        onValidationFailure={onValidationFailure}
      />,
    );

    await waitFor(() => {
      expect(onValidationFailure).toHaveBeenCalledWith([ERRORS.XML_PARSING_ERROR]);
    });

    expect(mockXMLParser).not.toHaveBeenCalled();
  });

  it('passes parsed ONIX data to XMLParser on successful validation', async () => {
    const onValidationFailure = vi.fn();
    mockValidateXml.mockResolvedValue({ status: 'success', data: parsedOnixData });

    render(
      <XMLParse
        file={createMockFile()}
        imprints={[]}
        serieses={[]}
        onValidationFailure={onValidationFailure}
      />,
    );

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
});
