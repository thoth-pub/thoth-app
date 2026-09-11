'use client';

import { Activity, useState } from 'react';

import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import { currencyOptions, languageOptions, licenseOptions } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { FormFieldOption } from '@/src/shared/interfaces';
import { type TranslateFunction, XMLParser } from '@/src/shared/parsers';
import {
  type BridgedOnixSource,
  bridgeOnixSource,
  permitsTargetPlanning,
  projectOnixRefusal,
  projectOnixSourceIssues,
  projectOnixUnavailable,
} from '@/src/shared/parsers/XMLParser/onixSourceBridge';
import { ONIX_PROCESSING_FAILURE_MESSAGE } from '@/src/shared/parsers/XMLParser/XMLParser';
import { ContributorsForSelection, ImportIssue, ImportPlan, ImportSource } from '@/src/shared/types';
import { createEmptyImportPlan } from '@/src/shared/utils';

import { type OnixValidationSettlement, useOnixValidation } from '../hooks/useOnixValidation';
import { ContributorsSelection } from './ContributorsSelection';
import { ImportPhaseStatus } from './ImportPhaseStatus';
import { OnixValidatedSource, OnixValidationStatus } from './OnixValidationStatus';

type XMLParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onValidationFailure?: (issues: ImportIssue[]) => void;
  /** The user cancelled validation: nothing was found, planned or imported, and the upload starts over. */
  onCancel?: () => void;
  onPreview?: (plan: ImportPlan, warnings: ImportIssue[], source: ImportSource) => void;
};

/** The adapter or planner failing on a source canonical validation accepted is Thoth's failure, not the file's. */
const PROCESSING_FAILURE: ImportIssue = {
  severity: 'error',
  code: 'onix.processing_failed',
  message: ONIX_PROCESSING_FAILURE_MESSAGE,
  source: { kind: 'file' },
};

export const XMLParse = (props: XMLParseProps) => {
  const { file, imprints, serieses, onValidationFailure, onCancel, onPreview } = props;

  const { contributorService, institutionService } = useServices();
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const translate = t as TranslateFunction;

  const [isPlanning, setIsPlanning] = useState(false);
  // The canonical source the plan is built from, held whole beside the adapter value bridged from it.
  const [validatedSource, setValidatedSource] = useState<BridgedOnixSource | null>(null);
  const [plan, setPlan] = useState<ImportPlan>(createEmptyImportPlan);
  const [multipleFoundedContributors, setMultipleFoundedContributors] = useState<ContributorsForSelection>({});
  // Held here rather than routed through contributor selection, which has no business reading
  // diagnostics: they are handed on unchanged when the user asks for the preview.
  const [warnings, setWarnings] = useState<ImportIssue[]>([]);

  const isDataEmpty = plan.works.length === 0;

  /**
   * Canonical source validation has settled. Only a result that permits continuation reaches the target
   * side - the adapter parse, the planner and its contributor and institution lookups - and then only
   * through the normalised Reference XML the Worker returned. Every other outcome stops here.
   */
  const planValidatedSource = async (settlement: OnixValidationSettlement) => {
    switch (settlement.kind) {
      case 'cancelled':
        onCancel?.();
        return;
      case 'refused':
        onValidationFailure?.(projectOnixRefusal(settlement.envelope, translate));
        return;
      case 'error':
        // A file the browser cannot read is a problem with the upload itself, as it always was.
        onValidationFailure?.(
          settlement.code === 'FILE_UNREADABLE'
            ? [
                {
                  severity: 'error',
                  code: 'file.validation',
                  message: settlement.message,
                  source: { kind: 'file' },
                },
              ]
            : projectOnixUnavailable({ code: settlement.code, message: settlement.message }, translate),
        );
        return;
    }

    const { result } = settlement;
    const sourceIssues = projectOnixSourceIssues(result, translate);
    if (!permitsTargetPlanning(result)) {
      // A blocked source always explains itself; a blocked result without a blocking finding is reported as such.
      const explained = sourceIssues.some(({ severity }) => severity === 'error');
      onValidationFailure?.(
        explained
          ? sourceIssues
          : [
              ...sourceIssues,
              ...projectOnixUnavailable({ code: result.status, message: result.stop?.text ?? '' }, translate),
            ],
      );
      return;
    }

    setIsPlanning(true);
    try {
      let bridged: BridgedOnixSource;
      try {
        bridged = bridgeOnixSource(result);
      } catch (error) {
        console.error('Unexpected failure parsing the validated ONIX source', error);
        onValidationFailure?.([...sourceIssues, PROCESSING_FAILURE]);
        return;
      }
      setValidatedSource(bridged);

      const xmlParser = new XMLParser(
        bridged.adapter,
        imprints,
        licenseOptions,
        serieses,
        contributorService,
        institutionService,
        languageOptions,
        currencyOptions,
      );

      const parsed = await xmlParser.parse();

      if (parsed.status === 'failed') {
        onValidationFailure?.([...sourceIssues, ...parsed.issues]);
        return;
      }

      setPlan(parsed.data.plan);
      setMultipleFoundedContributors(parsed.data.contributorsForSelection);
      // A permitted source only ever carries warnings - recovered parts, findings that do not block - and
      // they travel with the planner's warnings to the preview, where the user decides whether to go ahead.
      setWarnings([...sourceIssues, ...parsed.issues]);
    } finally {
      setIsPlanning(false);
    }
  };

  const validation = useOnixValidation(file, planValidatedSource);

  const handleSubmit = (resolvedPlan: ImportPlan) => {
    // The importer type and filename travel to the preview beside the plan, never in it: they
    // are what the running display and any failure report name the source by.
    onPreview?.(resolvedPlan, warnings, { type: 'onix', filename: file.name });
  };

  return (
    <>
      <OnixValidationStatus view={validation.view} onProceed={validation.proceed} onCancel={validation.cancel} />
      {validatedSource && <OnixValidatedSource result={validatedSource.canonical} />}
      <Activity mode={isPlanning ? 'visible' : 'hidden'}>
        {/* Planning the validated source has no measurable numerator, so this labels the phase without
            inventing a percentage. */}
        <ImportPhaseStatus content="bulkImport.phase.parsingOnix" data-testid="import-phase-parsing" />
      </Activity>
      {!isDataEmpty && (
        <ContributorsSelection contributors={multipleFoundedContributors} plan={plan} onPreview={handleSubmit} />
      )}
    </>
  );
};
