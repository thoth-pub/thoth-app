'use client';

import { Activity, useEffect, useEffectEvent, useState } from 'react';

import { validateXml } from '@/app/actions/validateXml';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import { currencyOptions, ERRORS, languageOptions, licenseOptions } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { FormFieldOption } from '@/src/shared/interfaces';
import { XMLParser } from '@/src/shared/parsers';
import { ContributorsForSelection, ImportIssue, ImportPlan, ImportSource } from '@/src/shared/types';
import { CircularProgress } from '@/src/shared/ui';
import { createEmptyImportPlan } from '@/src/shared/utils';

import { ContributorsSelection } from './ContributorsSelection';

type XMLParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onValidationFailure?: (issues: ImportIssue[]) => void;
  onPreview?: (plan: ImportPlan, warnings: ImportIssue[], source: ImportSource) => void;
};

export const XMLParse = (props: XMLParseProps) => {
  const { file, imprints, serieses, onValidationFailure, onPreview } = props;

  const { contributorService, institutionService } = useServices();
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });

  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [plan, setPlan] = useState<ImportPlan>(createEmptyImportPlan);
  const [multipleFoundedContributors, setMultipleFoundedContributors] = useState<ContributorsForSelection>({});
  // Held here rather than routed through contributor selection, which has no business reading
  // diagnostics: they are handed on unchanged when the user asks for the preview.
  const [warnings, setWarnings] = useState<ImportIssue[]>([]);

  const isDataEmpty = plan.works.length === 0;

  /** Everything that goes wrong before the parser runs is about the file, not about a product. */
  const fileError = (message: string): ImportIssue[] => [
    { severity: 'error', code: 'file.validation', message, source: { kind: 'file' } },
  ];

  const validateXMLFile = useEffectEvent(async (file: File) => {
    setIsValidatingFile(true);
    setPlan(createEmptyImportPlan());
    setWarnings([]);
    const response = await validateXml(file);

    if (response.status === 'error') {
      onValidationFailure?.(fileError(response.error));
      setIsValidatingFile(false);
      return;
    }

    const { data } = response;

    if (!data) {
      onValidationFailure?.(fileError(t(ERRORS.XML_PARSING_ERROR)));
      setIsValidatingFile(false);
      return;
    }

    const xmlParser = new XMLParser(
      data,
      imprints,
      licenseOptions,
      serieses,
      contributorService,
      institutionService,
      languageOptions,
      currencyOptions,
    );

    const result = await xmlParser.parse();

    if (result.status === 'failed') {
      onValidationFailure?.(result.issues);
      setIsValidatingFile(false);
      return;
    }

    setPlan(result.data.plan);
    setMultipleFoundedContributors(result.data.contributorsForSelection);
    // A successful parse only ever carries warnings, and they are not a validation failure:
    // they travel with the data to the preview, where the user decides whether to go ahead.
    setWarnings(result.issues);
    setIsValidatingFile(false);
  });

  useEffect(() => {
    if (!file) return;

    validateXMLFile(file);
  }, [file]);

  const handleSubmit = (resolvedPlan: ImportPlan) => {
    // The importer type and filename travel to the preview beside the plan, never in it: they
    // are what the running display and any failure report name the source by.
    onPreview?.(resolvedPlan, warnings, { type: 'onix', filename: file.name });
  };

  return (
    <>
      <Activity mode={isValidatingFile ? 'visible' : 'hidden'}>
        <CircularProgress />
      </Activity>
      {!isDataEmpty && (
        <ContributorsSelection contributors={multipleFoundedContributors} plan={plan} onPreview={handleSubmit} />
      )}
    </>
  );
};
