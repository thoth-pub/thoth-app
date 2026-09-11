import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ENGINE_ENVELOPES,
  type EnvelopeEvidence,
  type OnixWorkerResult,
  type ValidationStageName,
} from '@/src/shared/parsers/XMLParser/validation';

import { OnixValidatedSource, OnixValidationStatus } from './OnixValidationStatus';

const handlers = () => ({ onProceed: vi.fn(), onCancel: vi.fn() });

const STAGES: ValidationStageName[] = [
  'DECODING',
  'SOURCE_GATE',
  'SIZING',
  'ENVELOPE',
  'PREPARING',
  'ORDINARY',
  'STRICT',
  'SCHEMATRON',
  'INVENTORY',
  'PROJECTION',
  'SERIALIZING',
];

const WARNING: EnvelopeEvidence = {
  engine: 'chromium',
  bytes: 23_400_000,
  products: { measured: true, count: 1_200 },
  verdict: 'WARNING',
  limits: ENGINE_ENVELOPES.chromium,
  exceeded: ['bytes', 'products'],
};

const validated = (overrides: Partial<OnixWorkerResult> = {}): OnixWorkerResult => ({
  status: 'COMPLETED',
  stop: null,
  source: { release: '3.1', schemaRelease: '3.1.3', flavour: 'short', namespaceURI: 'http://ns.editeur.org/onix/3.1/short' },
  findings: [],
  summary: { total: 0, blocking: 0, secondary: 0, notEvaluable: 0, recovered: 0 },
  sourceValid: true,
  normalized: {
    xml: '<ONIXMessage release="3.1"/>',
    elementCount: 1,
    recoveries: [],
    provenance: { kind: 'RENAMED', flavour: 'short', renamedElementCount: 1, referenceToSource: {}, exceptions: [] },
  },
  ...overrides,
});

describe('OnixValidationStatus', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(cleanup);

  it('names the starting phase as busy background work and offers cancellation', async () => {
    const callbacks = handlers();
    render(<OnixValidationStatus view={{ phase: 'starting' }} {...callbacks} />);

    const status = screen.getByTestId('onix-validation-status');
    expect(status).toHaveTextContent('onixValidation.stage.STARTING');
    expect(status).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'onixValidation.actions.cancel' }));
    expect(callbacks.onCancel).toHaveBeenCalledOnce();
    expect(callbacks.onProceed).not.toHaveBeenCalled();
  });

  it.each(STAGES)('labels the %s stage the Worker reports', (stage) => {
    render(<OnixValidationStatus view={{ phase: 'validating', stage }} {...handlers()} />);

    expect(screen.getByTestId('onix-validation-status')).toHaveTextContent(`onixValidation.stage.${stage}`);
  });

  it('shows a fraction and a determinate bar only for a real done/total', () => {
    render(<OnixValidationStatus view={{ phase: 'validating', stage: 'STRICT', done: 4_512, total: 9_093 }} {...handlers()} />);

    expect(screen.getByTestId('onix-validation-fraction')).toHaveTextContent('4,512 / 9,093');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument();
  });

  it.each([
    ['no counts', {}],
    ['a lone done', { done: 3 }],
    ['a lone total', { total: 9 }],
    ['a zero total', { done: 0, total: 0 }],
  ])('invents no fraction from %s', (_case, counts) => {
    render(<OnixValidationStatus view={{ phase: 'validating', stage: 'SCHEMATRON', ...counts }} {...handlers()} />);

    expect(screen.queryByTestId('onix-validation-fraction')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows the warning evidence and the engine thresholds, and waits for an explicit decision', async () => {
    const callbacks = handlers();
    render(<OnixValidationStatus view={{ phase: 'awaiting-decision', envelope: WARNING }} {...callbacks} />);

    const panel = screen.getByTestId('onix-validation-warning');
    expect(panel).toHaveTextContent('onixValidation.warning.heading');
    expect(panel).toHaveTextContent('onixValidation.engine.chromium');
    expect(panel).toHaveTextContent('23,400,000');
    expect(panel).toHaveTextContent('23.4');
    expect(panel).toHaveTextContent('1,200');
    // Chromium's normal and upper thresholds.
    expect(panel).toHaveTextContent('20,000,000');
    expect(panel).toHaveTextContent('1,000');
    expect(panel).toHaveTextContent('36,000,000');
    expect(panel).toHaveTextContent('1,700');
    expect(panel).toHaveTextContent('onixValidation.warning.dimension.bytes');
    expect(panel).toHaveTextContent('onixValidation.warning.dimension.products');
    // A decision is not background work.
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'onixValidation.warning.continue' }));
    expect(callbacks.onProceed).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'onixValidation.warning.cancel' }));
    expect(callbacks.onCancel).toHaveBeenCalledOnce();
  });

  it('says so when the Product count could not be measured', () => {
    const envelope: EnvelopeEvidence = {
      ...WARNING,
      products: { measured: false, reason: 'SIZING_PARSE_ERROR' },
      exceeded: ['bytes'],
    };
    render(<OnixValidationStatus view={{ phase: 'awaiting-decision', envelope }} {...handlers()} />);

    expect(screen.getByTestId('onix-validation-warning')).toHaveTextContent('onixValidation.warning.productsNotMeasured');
  });

  it('renders nothing once the session has settled', () => {
    const { container } = render(<OnixValidationStatus view={{ phase: 'settled' }} {...handlers()} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('OnixValidatedSource', () => {
  afterEach(cleanup);

  it('names the validated source release and tag style', () => {
    render(<OnixValidatedSource result={validated()} />);

    const summary = screen.getByTestId('onix-source-validated');
    expect(summary).toHaveTextContent('onixValidation.validated.heading');
    expect(summary).toHaveTextContent('3.1');
    expect(summary).toHaveTextContent('onixValidation.flavour.short');
    expect(summary).not.toHaveTextContent('onixValidation.validated.recovered');
  });

  it('keeps a recovery visible instead of presenting the source as fully valid', () => {
    const result = validated({ summary: { total: 2, blocking: 0, secondary: 0, notEvaluable: 0, recovered: 2 } });
    render(<OnixValidatedSource result={result} />);

    const summary = screen.getByTestId('onix-source-validated');
    expect(summary).toHaveTextContent('onixValidation.validated.recovered');
    expect(summary).toHaveTextContent('2');
  });
});
