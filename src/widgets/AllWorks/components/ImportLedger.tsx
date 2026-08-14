'use client';

import type { ImportExecutionStage } from '@/src/shared/types';
import { TableBody, TableCell, TableHeader, TableRow, TableWrapper, TranslatedContent, Typography } from '@/src/shared/ui';

import type { ImportLedgerEntry, ImportLedgerStatus } from '../lib/importLedger';

const STATUS_LABEL_KEY: Record<ImportLedgerStatus, string> = {
  pending: 'bulkImport.ledger.status.pending',
  importing: 'bulkImport.ledger.status.importing',
  completed: 'bulkImport.ledger.status.completed',
  failed: 'bulkImport.ledger.status.failed',
  notAttempted: 'bulkImport.ledger.status.notAttempted',
};

const STAGE_LABEL_KEY: Record<ImportExecutionStage, string> = {
  work: 'bulkImport.stage.work',
  chapters: 'bulkImport.stage.chapters',
  series: 'bulkImport.stage.series',
};

/**
 * Colour and weight are a secondary cue only: every status is stated in words in the same cell, so
 * the ledger never conveys a row's state through colour alone.
 */
const STATUS_CLASS: Record<ImportLedgerStatus, string> = {
  pending: 'text-(--color-typography-secondary)',
  importing: 'font-semibold text-(--color-primary)',
  completed: 'text-green-700',
  failed: 'font-semibold text-red-700',
  notAttempted: 'text-(--color-typography-secondary)',
};

const HEADER_CELLS = [
  'bulkImport.ledger.columns.position',
  'bulkImport.ledger.columns.title',
  'bulkImport.ledger.columns.identifier',
  'bulkImport.ledger.columns.status',
  'bulkImport.ledger.columns.stage',
];

const HEADER_STYLES = ['pl-3', '', '', '', ''];

type ImportLedgerProps = {
  entries: ImportLedgerEntry[];
};

/**
 * The ordered per-top-level-work receipt: one compact row per book, in plan order, each stating
 * its status in words. A stage is shown only on the row that is actually `importing` or `failed`;
 * pending, completed, and not-attempted rows carry none, so no book is given a fabricated stage.
 *
 * The region is height-constrained and scrolls, so a long import stays usable rather than becoming
 * an unbounded wall. It is static, accessible table content — not a live region — so a screen
 * reader is not made to re-announce the whole ledger on every stage change; the running summary
 * beside it owns the live announcements.
 */
export const ImportLedger = ({ entries }: ImportLedgerProps) => {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Typography component="h3" fontWeight="bold" className="capitalize">
        <TranslatedContent content="bulkImport.ledger.heading" />
      </Typography>
      <div className="max-h-64 overflow-y-auto rounded border border-(--color-border)" data-testid="import-ledger">
        <TableWrapper>
          <TableHeader cells={HEADER_CELLS} cellStyles={HEADER_STYLES} />
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.position} aria-current={entry.status === 'importing' ? 'step' : undefined}>
                <TableCell className="pl-3">{entry.position}</TableCell>
                <TableCell>{entry.title}</TableCell>
                <TableCell>{entry.reference ?? '—'}</TableCell>
                <TableCell>
                  <Typography
                    component="span"
                    className={STATUS_CLASS[entry.status]}
                    data-testid={`ledger-status-${entry.position}`}
                  >
                    <TranslatedContent content={STATUS_LABEL_KEY[entry.status]} />
                  </Typography>
                </TableCell>
                <TableCell>
                  {entry.stage && (entry.status === 'importing' || entry.status === 'failed') && (
                    <span data-testid={`ledger-stage-${entry.position}`}>
                      <TranslatedContent content={STAGE_LABEL_KEY[entry.stage]} />
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableWrapper>
      </div>
    </div>
  );
};
