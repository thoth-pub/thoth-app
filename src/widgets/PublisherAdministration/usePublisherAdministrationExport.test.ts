import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Direction, PublisherField } from '@/gql/graphql';

import { PUBLISHER_SERVICES_CSV_COLUMNS } from './publisherAdministrationCsv';

// The protected report/count service contract the export sweeps through. These
// are the only reads the export makes.
const getReport = vi.fn();
const getCount = vi.fn();
const useServicesMock = vi.fn();

vi.mock('@/src/shared/context', () => ({
  useServices: () => useServicesMock(),
}));

// Spy proving the export never consults the global active-publisher machinery.
const stateMachineSpy = vi.fn();
vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: () => stateMachineSpy(),
}));

import usePublisherAdministrationExport from './usePublisherAdministrationExport';

const REPORT_ORDER = { field: PublisherField.PublisherName, direction: Direction.Asc };

const baseFilters = () => ({
  publishers: [] as string[],
  packages: [],
  enabledPlatforms: [],
  jobStatuses: [],
  withoutBackCatalogueJob: null,
});

// A full report row - enough shape for the CSV serializer to run on the success
// paths, and the publisher id the export dedupes on.
const makeRow = (id: string) =>
  ({
    configuration: {
      publisher: { publisherId: id, publisherName: `Publisher ${id}` },
      subscriptionPackage: 'SPHINX',
      enabledDistributionPlatforms: [{ platform: 'OAPEN' }],
      updatedAt: '2026-08-12T09:00:00Z',
    },
    lastChange: null,
    latestBackCatalogueJob: null,
  }) as unknown as ReturnType<typeof getReport>;

const defer = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

let createObjectURL: ReturnType<typeof vi.fn>;
let revokeObjectURL: ReturnType<typeof vi.fn>;
let clickSpy: ReturnType<typeof vi.spyOn>;
let lastDownloadName: string | undefined;
// jsdom's Blob has no async text(); capture the serialized CSV from the Blob
// constructor parts so the downloaded contents can be asserted synchronously.
let capturedCsv: string[];

const renderExport = (props?: { filters?: ReturnType<typeof baseFilters>; isEligible?: boolean }) =>
  renderHook(
    (hookProps: { filters: ReturnType<typeof baseFilters>; isEligible: boolean }) =>
      usePublisherAdministrationExport({ filters: hookProps.filters, order: REPORT_ORDER, isEligible: hookProps.isEligible }),
    { initialProps: { filters: props?.filters ?? baseFilters(), isEligible: props?.isEligible ?? true } },
  );

beforeEach(() => {
  vi.clearAllMocks();

  useServicesMock.mockReturnValue({
    publisherService: {
      getPublisherServiceConfigurationReport: getReport,
      getPublisherServiceConfigurationReportCount: getCount,
    },
  });

  createObjectURL = vi.fn(() => 'blob:mock-url');
  revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

  capturedCsv = [];
  const RealBlob = globalThis.Blob;
  vi.stubGlobal(
    'Blob',
    class extends RealBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options);
        capturedCsv.push(String(parts[0]));
      }
    },
  );

  lastDownloadName = undefined;
  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    lastDownloadName = this.download;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('usePublisherAdministrationExport', () => {
  it('never initiates protected reads for a non-authoritative / ordinary user', async () => {
    const { result } = renderExport({ isEligible: false });

    expect(result.current.canExport).toBe(false);

    await act(async () => {
      result.current.startExport();
    });

    expect(getCount).not.toHaveBeenCalled();
    expect(getReport).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(result.current.isExporting).toBe(false);
  });

  it('sweeps the whole filtered population across multiple pages with the captured filters and order, then downloads', async () => {
    const population = Array.from({ length: 250 }, (_, index) => makeRow(`pub-${index}`));
    getCount.mockResolvedValue(250);
    getReport.mockImplementation(({ offset, limit }: { offset: number; limit: number }) =>
      Promise.resolve(population.slice(offset, offset + limit)),
    );

    const { result } = renderExport();

    act(() => result.current.startExport());
    await waitFor(() => expect(result.current.isExporting).toBe(false));

    // Three sequential pages at the bounded page size (100): 100 + 100 + 50.
    expect(getReport).toHaveBeenCalledTimes(3);
    expect(getReport.mock.calls.map((call) => call[0].offset)).toEqual([0, 100, 200]);
    getReport.mock.calls.forEach((call) => {
      expect(call[0].limit).toBe(100);
      expect(call[0].filters).toEqual(baseFilters());
      expect(call[0].order).toEqual(REPORT_ORDER);
    });

    // Count read at the start and again at the end.
    expect(getCount).toHaveBeenCalledTimes(2);
    // Exactly one file produced, after every check passed.
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(lastDownloadName).toMatch(/^thoth-publisher-services-.+Z\.csv$/);
    expect(result.current.exportError).toBeNull();
  });

  it('captures an immutable filter/order snapshot: later filter changes do not retarget a running export', async () => {
    const countDeferred = defer<number>();
    // Initial count is held pending so the filters can change mid-flight.
    getCount.mockReturnValueOnce(countDeferred.promise).mockResolvedValue(2);
    getReport.mockResolvedValue([makeRow('a'), makeRow('b')]);

    const originalFilters = baseFilters();
    const { result, rerender } = renderExport({ filters: originalFilters });

    act(() => result.current.startExport());

    // The UI changes the live filters while the export is in flight.
    rerender({ filters: { ...baseFilters(), publishers: ['pub-x'] }, isEligible: true });

    await act(async () => {
      countDeferred.resolve(2);
    });
    await waitFor(() => expect(result.current.isExporting).toBe(false));

    // The page read and the final count both used the captured (original)
    // filters, never the ones the UI changed to.
    expect(getReport.mock.calls[0][0].filters.publishers).toEqual([]);
    expect(getReport.mock.calls[0][0].order).toEqual(REPORT_ORDER);
    expect(getCount.mock.calls[1][0].publishers).toEqual([]);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('allows only one export attempt at a time', async () => {
    const countDeferred = defer<number>();
    getCount.mockReturnValue(countDeferred.promise);

    const { result } = renderExport();

    act(() => result.current.startExport());
    // A second start while the first is in flight is a no-op.
    act(() => result.current.startExport());

    expect(getCount).toHaveBeenCalledTimes(1);
    expect(result.current.isExporting).toBe(true);

    // Let the held attempt finish cleanly (zero population -> header only).
    await act(async () => {
      countDeferred.resolve(0);
    });
    await waitFor(() => expect(result.current.isExporting).toBe(false));
  });

  it('produces a truthful header-only CSV for a zero-row population without reading any page', async () => {
    getCount.mockResolvedValue(0);

    const { result } = renderExport();

    act(() => result.current.startExport());
    await waitFor(() => expect(result.current.isExporting).toBe(false));

    expect(getReport).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/csv');
    expect(capturedCsv[0]).toBe(PUBLISHER_SERVICES_CSV_COLUMNS.join(','));
    expect(result.current.exportError).toBeNull();
  });

  it('downloads a header plus one record per row on success', async () => {
    getCount.mockResolvedValue(2);
    getReport.mockResolvedValueOnce([makeRow('a'), makeRow('b')]);

    const { result } = renderExport();

    act(() => result.current.startExport());
    await waitFor(() => expect(result.current.isExporting).toBe(false));

    const lines = capturedCsv[0].split('\r\n');

    expect(lines[0]).toBe(PUBLISHER_SERVICES_CSV_COLUMNS.join(','));
    expect(lines).toHaveLength(3);
    expect(lines[1].startsWith('a,')).toBe(true);
    expect(lines[2].startsWith('b,')).toBe(true);
  });

  describe('fail closed', () => {
    it('creates no file when the initial count read fails', async () => {
      getCount.mockRejectedValue(new Error('FORBIDDEN'));

      const { result } = renderExport();

      act(() => result.current.startExport());
      await waitFor(() => expect(result.current.exportError).toBe('countUnavailable'));

      expect(getReport).not.toHaveBeenCalled();
      expect(createObjectURL).not.toHaveBeenCalled();
      expect(result.current.isExporting).toBe(false);
    });

    it('creates no file when a report page read fails', async () => {
      getCount.mockResolvedValue(2);
      getReport.mockRejectedValue(new Error('boom'));

      const { result } = renderExport();

      act(() => result.current.startExport());
      await waitFor(() => expect(result.current.exportError).toBe('pageUnavailable'));

      expect(createObjectURL).not.toHaveBeenCalled();
    });

    it('fails closed when the same publisher id appears more than once', async () => {
      getCount.mockResolvedValue(2);
      getReport.mockResolvedValueOnce([makeRow('dup'), makeRow('dup')]);

      const { result } = renderExport();

      act(() => result.current.startExport());
      await waitFor(() => expect(result.current.exportError).toBe('duplicateRow'));

      expect(createObjectURL).not.toHaveBeenCalled();
    });

    it('fails closed when the collected unique-row count does not equal the captured count', async () => {
      getCount.mockResolvedValue(5); // claims 5...
      getReport.mockResolvedValueOnce([makeRow('a'), makeRow('b')]); // ...but only 2 exist

      const { result } = renderExport();

      act(() => result.current.startExport());
      await waitFor(() => expect(result.current.exportError).toBe('countMismatch'));

      expect(getCount).toHaveBeenCalledTimes(1); // the final count read is never reached
      expect(createObjectURL).not.toHaveBeenCalled();
    });

    it('fails closed when the count drifts between the start and end of the export', async () => {
      getCount.mockResolvedValueOnce(2).mockResolvedValueOnce(3); // initial 2, final 3
      getReport.mockResolvedValueOnce([makeRow('a'), makeRow('b')]);

      const { result } = renderExport();

      act(() => result.current.startExport());
      await waitFor(() => expect(result.current.exportError).toBe('countDrift'));

      expect(createObjectURL).not.toHaveBeenCalled();
    });

    it('clears a prior export error and stays retryable', async () => {
      getCount.mockRejectedValueOnce(new Error('FORBIDDEN'));

      const { result } = renderExport();

      act(() => result.current.startExport());
      await waitFor(() => expect(result.current.exportError).toBe('countUnavailable'));

      act(() => result.current.dismissExportError());
      expect(result.current.exportError).toBeNull();
      expect(result.current.canExport).toBe(true);
    });
  });

  it('never consults the global active-publisher state machine during an export', async () => {
    getCount.mockResolvedValue(1);
    getReport.mockResolvedValueOnce([makeRow('only')]);

    const { result } = renderExport();

    act(() => result.current.startExport());
    await waitFor(() => expect(result.current.isExporting).toBe(false));

    expect(stateMachineSpy).not.toHaveBeenCalled();
  });
});
