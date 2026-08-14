'use client';

import type { Namespace } from '@/src/shared/i18n/model/i18n.types';
import { CircularProgress, TranslatedContent, Typography } from '@/src/shared/ui';

type ImportPhaseStatusProps = {
  /** i18n key for the phase label, e.g. `bulkImport.phase.parsingOnix`. */
  content: string;
  namespace?: Namespace;
  /**
   * Whether this phase is indeterminate background work. Background phases show a spinner and mark
   * themselves busy; an interactive step (a decision the user is making) is never shown this way,
   * so it does not pretend the app is still progressing on its own.
   */
  busy?: boolean;
  'data-testid'?: string;
};

/**
 * The one shared phase indicator for the bulk-import journey, so file reading, parsing, and the
 * duplicate preflight all speak the same visual and textual language instead of each rendering a
 * bare, unlabelled spinner.
 *
 * The label is always textual — a screen reader hears which phase is running, not merely that
 * something is busy — and the phase is announced through a single polite live region. Percentages
 * are deliberately impossible to express here: parsing and validation have no measurable
 * numerator, so this never invents one.
 */
export const ImportPhaseStatus = ({ content, namespace, busy = true, 'data-testid': testId }: ImportPhaseStatusProps) => (
  <section
    role="status"
    aria-live="polite"
    aria-busy={busy}
    data-testid={testId}
    className="flex w-full items-center gap-3 rounded border border-(--color-border) bg-(--color-modal-content-background) p-4"
  >
    {busy && <CircularProgress size={20} aria-hidden />}
    <Typography>
      <TranslatedContent content={content} namespace={namespace} />
    </Typography>
  </section>
);
