'use client';

import { useCallback, useRef, useState } from 'react';

import type { PublisherOrderBy } from '@/gql/graphql';
import type { PublisherServiceConfigurationReportFilters } from '@/src/entities/publisher/api/publisher.service';
import { appConfig } from '@/src/shared/config';
import { useServices } from '@/src/shared/context';

import {
  buildPublisherServicesCsvFilename,
  type PublisherServicesReportRow,
  serializePublisherServicesCsv,
} from './publisherAdministrationCsv';

// Bounded, retryable reasons an export attempt can fail closed with. The UI
// treats all of them as one retryable failure; they are distinguished here so
// each fail-closed path can be asserted and reasoned about.
export type PublisherExportFailureReason =
  | 'countUnavailable' // an initial or final matching-count read failed
  | 'pageUnavailable' // a report page read failed
  | 'duplicateRow' // the same publisher id appeared on more than one page
  | 'countMismatch' // the collected unique-row count did not equal the captured count
  | 'countDrift' // the matching count changed between the start and end of the export
  | 'exportFailed'; // an unexpected failure after the reads (e.g. serialization/download)

type UsePublisherAdministrationExportProps = {
  // The live semantic report filters. Read only at the instant an export starts;
  // the running export never re-reads them.
  filters: PublisherServiceConfigurationReportFilters;
  // The live deterministic report order, captured the same way.
  order: PublisherOrderBy;
  // Presentation/eligibility gate: true once authoritative user state confirms a
  // superuser. The backend remains the authorization boundary.
  isEligible: boolean;
};

// The export sweep reads the repository's documented maximum bounded page size
// rather than the 20-row visible-report page, so a large filtered population is
// read in far fewer sequential protected requests while staying within the same
// bounded page contract the app already uses elsewhere (e.g. institutions).
const EXPORT_PAGE_SIZE = appConfig.data.maxItemsPerRequestLimit;

// A failure carrying its bounded reason, so the orchestrator can map each
// fail-closed path to a specific retryable reason.
class PublisherExportError extends Error {
  readonly reason: PublisherExportFailureReason;

  constructor(reason: PublisherExportFailureReason) {
    super(reason);
    this.name = 'PublisherExportError';
    this.reason = reason;
  }
}

// An immutable copy of the captured filters, so nothing the UI does after the
// export starts can mutate what the running export reads with.
const cloneFilters = (
  filters: PublisherServiceConfigurationReportFilters,
): PublisherServiceConfigurationReportFilters => ({
  publishers: [...filters.publishers],
  packages: [...filters.packages],
  enabledPlatforms: [...filters.enabledPlatforms],
  jobStatuses: [...filters.jobStatuses],
  withoutBackCatalogueJob: filters.withoutBackCatalogueJob,
});

// Client-side CSV download, entirely in the browser: a Blob is wrapped in a
// short-lived object URL, handed to a throwaway anchor and clicked; the URL is
// revoked in a finally so it is released whether or not the click threw. No
// report ever leaves the browser - there is no endpoint, upload or persistent
// store. Reached only after every consistency check has passed.
const triggerCsvDownload = (filename: string, contents: string): void => {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
};

// APP-02C: superuser-only, full-filtered-population CSV export for the staff
// publisher report.
//
// The export is deliberately independent of the visible report's TanStack Query
// cache and of the global active publisher: it reads fresh through the same
// protected report/count service contract, using an immutable snapshot of the
// filters and deterministic order captured at the instant the attempt starts.
// Only one attempt may run at a time, and later UI filter/page changes cannot
// retarget an attempt already in flight because the async sweep closes over its
// captured copies, never the live refs.
//
// The sweep is a best-effort consistency guard over the existing paginated API,
// not a transactional point-in-time snapshot (the contract exposes no snapshot
// token): it reads the matching count, pages the whole population with the
// captured filters/order, rejects duplicate publisher ids, checks the collected
// unique-row count against the captured count, re-reads the count and aborts on
// drift, and only then produces the download. Any read or consistency failure
// fails closed: no file is created and no partial data is offered as complete.
const usePublisherAdministrationExport = ({ filters, order, isEligible }: UsePublisherAdministrationExportProps) => {
  const { publisherService } = useServices();

  // Synchronous single-attempt guard: a ref so a second click in the same tick
  // cannot start a duplicate attempt before React has re-rendered. It is only
  // ever read or written inside the click handler and its async continuation,
  // never during render.
  const isExportingRef = useRef(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<PublisherExportFailureReason | null>(null);

  const runExport = useCallback(
    async (capturedFilters: PublisherServiceConfigurationReportFilters, capturedOrder: PublisherOrderBy) => {
      // 1. Read the matching count for the captured filters.
      let initialCount: number;
      try {
        initialCount = await publisherService.getPublisherServiceConfigurationReportCount(capturedFilters);
      } catch {
        throw new PublisherExportError('countUnavailable');
      }

      // 2-6. Page the whole captured population sequentially with the captured
      // filters and order, rejecting any publisher id seen on an earlier page.
      const rows: PublisherServicesReportRow[] = [];
      const seenPublisherIds = new Set<string>();
      let offset = 0;

      while (rows.length < initialCount) {
        let page: PublisherServicesReportRow[];
        try {
          page = await publisherService.getPublisherServiceConfigurationReport({
            filters: capturedFilters,
            limit: EXPORT_PAGE_SIZE,
            offset,
            order: capturedOrder,
          });
        } catch {
          throw new PublisherExportError('pageUnavailable');
        }

        // The population shrank below the captured count mid-sweep: stop and let
        // the count check below fail closed rather than looping forever.
        if (page.length === 0) break;

        for (const summary of page) {
          const publisherId = String(summary.configuration.publisher.publisherId);
          if (seenPublisherIds.has(publisherId)) throw new PublisherExportError('duplicateRow');
          seenPublisherIds.add(publisherId);
          rows.push(summary);
        }

        offset += EXPORT_PAGE_SIZE;

        // A short page is the last page.
        if (page.length < EXPORT_PAGE_SIZE) break;
      }

      // 7. The collected unique-row count must equal the captured count.
      if (rows.length !== initialCount) throw new PublisherExportError('countMismatch');

      // 8-9. Re-read the count and abort if it drifted during the export.
      let finalCount: number;
      try {
        finalCount = await publisherService.getPublisherServiceConfigurationReportCount(capturedFilters);
      } catch {
        throw new PublisherExportError('countUnavailable');
      }
      if (finalCount !== initialCount) throw new PublisherExportError('countDrift');

      // 10. Only now, after every check has passed, is any file produced. Zero
      // rows yields the deterministic header-only CSV.
      const csv = serializePublisherServicesCsv(rows);
      triggerCsvDownload(buildPublisherServicesCsvFilename(new Date()), csv);
    },
    [publisherService],
  );

  // startExport closes over the live filters/order/eligibility of the render it
  // was created in. It is invoked from an event handler, so at click time it
  // captures whatever the current values are; the running export then reads only
  // its captured copies, so a later render (changed filters/page) cannot retarget
  // an attempt already in flight. This avoids reading or writing any latest-value
  // ref during render.
  const startExport = useCallback(() => {
    // Presentation eligibility gate: an ordinary or not-yet-authoritative user
    // never initiates protected export reads through normal UI behaviour.
    if (!isEligible) return;
    // Only one export attempt at a time.
    if (isExportingRef.current) return;

    isExportingRef.current = true;
    setIsExporting(true);
    setExportError(null);

    // Capture the immutable snapshot at the instant of the click.
    const capturedFilters = cloneFilters(filters);
    const capturedOrder = { ...order };

    void runExport(capturedFilters, capturedOrder)
      .catch((error: unknown) => {
        setExportError(error instanceof PublisherExportError ? error.reason : 'exportFailed');
      })
      .finally(() => {
        isExportingRef.current = false;
        setIsExporting(false);
      });
  }, [filters, order, isEligible, runExport]);

  const dismissExportError = useCallback(() => setExportError(null), []);

  return {
    // Presentation-only: the action is offerable for an eligible superuser while
    // no attempt is running.
    canExport: isEligible && !isExporting,
    isExporting,
    exportError,
    startExport,
    dismissExportError,
  };
};

export default usePublisherAdministrationExport;
