'use client';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box } from '@mui/material';
import { Fragment, type ReactNode, useId } from 'react';

import useActiveLocale from '@/src/shared/hooks/useActiveLocale';
import { MEGABYTE } from '@/src/shared/parsers/XMLParser/validation/worker/envelope';
import type { EnvelopeEvidence, OnixWorkerResult } from '@/src/shared/parsers/XMLParser/validation/worker/protocol';
import { Button, LinearProgress, TranslatedContent, Typography } from '@/src/shared/ui';

import type { OnixValidationView } from '../hooks/useOnixValidation';
import { ImportPhaseStatus } from './ImportPhaseStatus';

type NumberFormat = (value: number, options?: Intl.NumberFormatOptions) => string;

const useNumberFormat = (): NumberFormat => {
  const locale = useActiveLocale();
  return (value, options) => new Intl.NumberFormat(locale, options).format(value);
};

type OnixValidationStatusProps = {
  view: OnixValidationView;
  onProceed: () => void;
  onCancel: () => void;
};

/**
 * What the browser's ONIX source validation is doing (thoth-app#197): the stage the Worker reports,
 * a work-unit fraction only while the Worker supplies both counts, and a cancel action while it runs.
 * For a WARNING envelope it shows the measured evidence and this engine's thresholds, with an explicit
 * choice to continue validating the same file or to cancel - a support decision about this browser,
 * never a finding about the ONIX source.
 */
export const OnixValidationStatus = ({ view, onProceed, onCancel }: OnixValidationStatusProps) => {
  const format = useNumberFormat();
  const fractionId = useId();

  if (view.phase === 'settled') return null;
  if (view.phase === 'awaiting-decision') {
    return <WarningDecision envelope={view.envelope} format={format} onProceed={onProceed} onCancel={onCancel} />;
  }

  const stage = view.phase === 'validating' && view.stage ? view.stage : 'STARTING';
  // A fraction needs the Worker's own numerator and denominator; nothing is estimated.
  const counts =
    view.phase === 'validating' && view.done !== undefined && view.total !== undefined && view.total > 0
      ? { done: view.done, total: view.total }
      : null;

  return (
    <div className="flex w-full flex-col gap-3">
      <ImportPhaseStatus content={`onixValidation.stage.${stage}`} data-testid="onix-validation-status" />
      {counts && (
        <div className="flex w-full items-center gap-3">
          <LinearProgress
            variant="determinate"
            value={(counts.done / counts.total) * 100}
            aria-labelledby={fractionId}
            className="flex-1"
          />
          <Typography id={fractionId} data-testid="onix-validation-fraction">
            <TranslatedContent content="onixValidation.progress.checked" /> {format(counts.done)} /{' '}
            {format(counts.total)}
          </Typography>
        </div>
      )}
      <div>
        <Button variant="outlined" onClick={onCancel}>
          <TranslatedContent content="onixValidation.actions.cancel" />
        </Button>
      </div>
    </div>
  );
};

type WarningDecisionProps = {
  envelope: EnvelopeEvidence;
  format: NumberFormat;
  onProceed: () => void;
  onCancel: () => void;
};

const WarningDecision = ({ envelope, format, onProceed, onCancel }: WarningDecisionProps) => {
  const headingId = useId();

  // Raw byte length as measured (1 MB = 1,000,000 bytes, the envelope's own unit).
  const size = (bytes: number) => (
    <>
      {format(bytes)} <TranslatedContent content="onixValidation.unit.bytes" /> (
      {format(bytes / MEGABYTE, { maximumFractionDigits: 1 })} MB)
    </>
  );
  const threshold = (limit: { readonly bytes: number; readonly products: number }) => (
    <>
      {size(limit.bytes)} · {format(limit.products)} <TranslatedContent content="onixValidation.unit.products" />
    </>
  );

  return (
    <section
      aria-labelledby={headingId}
      data-testid="onix-validation-warning"
      className="flex w-full flex-col gap-3 rounded border border-(--color-border) bg-(--color-modal-content-background) p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <SeverityLabel severity="warning">
          <TranslatedContent content="onixValidation.severity.warning" />
        </SeverityLabel>
        <Typography id={headingId} className="font-semibold">
          <TranslatedContent content="onixValidation.warning.heading" />
        </Typography>
      </div>
      <Typography>
        <TranslatedContent content="onixValidation.warning.body" />
      </Typography>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt>
          <TranslatedContent content="onixValidation.warning.engine" />
        </dt>
        <dd>
          <TranslatedContent content={`onixValidation.engine.${envelope.engine}`} />
        </dd>
        <dt>
          <TranslatedContent content="onixValidation.warning.fileSize" />
        </dt>
        <dd>{size(envelope.bytes)}</dd>
        <dt>
          <TranslatedContent content="onixValidation.warning.products" />
        </dt>
        <dd>
          {envelope.products.measured ? (
            format(envelope.products.count)
          ) : (
            <TranslatedContent content="onixValidation.warning.productsNotMeasured" />
          )}
        </dd>
        {envelope.limits && (
          <>
            <dt>
              <TranslatedContent content="onixValidation.warning.normalLimit" />
            </dt>
            <dd>{threshold(envelope.limits.normal)}</dd>
            <dt>
              <TranslatedContent content="onixValidation.warning.upperLimit" />
            </dt>
            <dd>{threshold(envelope.limits.warning)}</dd>
          </>
        )}
        <dt>
          <TranslatedContent content="onixValidation.warning.exceeded" />
        </dt>
        <dd>
          {envelope.exceeded.map((dimension, index) => (
            <Fragment key={dimension}>
              {index > 0 && ', '}
              <TranslatedContent content={`onixValidation.warning.dimension.${dimension}`} />
            </Fragment>
          ))}
        </dd>
      </dl>
      <div className="flex flex-wrap gap-3">
        <Button variant="contained" onClick={onProceed}>
          <TranslatedContent content="onixValidation.warning.continue" />
        </Button>
        <Button variant="outlined" onClick={onCancel}>
          <TranslatedContent content="onixValidation.warning.cancel" />
        </Button>
      </div>
    </section>
  );
};

/**
 * A severity said in words beside an icon. Warning-coloured prose is too pale to read against the page
 * (thoth-app#206), so the colour only highlights this label, whose own text stays dark, and never carries the
 * meaning alone: the text the label introduces keeps the ordinary text colour.
 */
export const SeverityLabel = ({ severity, children }: { severity: 'warning' | 'ready'; children: ReactNode }) => (
  <Box
    component="span"
    sx={{ bgcolor: severity === 'warning' ? 'warning.main' : 'success.main', color: 'common.black' }}
    className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold"
  >
    {severity === 'warning' ? (
      <WarningAmberIcon fontSize="inherit" aria-hidden />
    ) : (
      <CheckCircleOutlineIcon fontSize="inherit" aria-hidden />
    )}
    {children}
  </Box>
);

/**
 * The canonical source a plan is built from, validated in this browser: its release and tag style, and
 * - kept visible rather than hidden behind a successful validation - the findings that do not block the
 * import and every invalid part the approved recovery left out.
 */
export const OnixValidatedSource = ({ result }: { result: OnixWorkerResult }) => {
  const { source, summary } = result;
  const unrecovered = summary.total - summary.recovered;

  return (
    <section
      data-testid="onix-source-validated"
      className="flex w-full flex-col gap-1 rounded border border-(--color-border) p-4"
    >
      <Typography className="font-semibold">
        <TranslatedContent content="onixValidation.validated.heading" />
      </Typography>
      {source && (
        <Typography>
          ONIX {source.release} · <TranslatedContent content={`onixValidation.flavour.${source.flavour}`} />
        </Typography>
      )}
      {unrecovered > 0 && (
        <Typography>
          <TranslatedContent content="onixValidation.validated.findings" />: {unrecovered}
        </Typography>
      )}
      {summary.recovered > 0 && (
        // Recovered, never presented as valid: the label says so in words, the count reads as ordinary text.
        <div data-testid="onix-source-recovered" className="flex flex-wrap items-center gap-2">
          <SeverityLabel severity="warning">
            <TranslatedContent content="onixValidation.severity.recovered" />
          </SeverityLabel>
          <Typography>
            <TranslatedContent content="onixValidation.validated.recovered" />: {summary.recovered}
          </Typography>
        </div>
      )}
    </section>
  );
};
