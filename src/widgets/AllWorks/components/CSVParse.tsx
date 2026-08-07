'use client';

import { Activity, useEffect, useEffectEvent, useState } from 'react';

import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { licenseOptions } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { FormFieldOption } from '@/src/shared/interfaces';
import { CSVParser, TranslateFunction } from '@/src/shared/parsers';
import { ContributorsForSelection, ImportIssue, SeriesImportPlan } from '@/src/shared/types';
import { CircularProgress } from '@/src/shared/ui';
import { isCsv } from '@/src/shared/utils';

import { getCsvConfig } from '../../../shared/parsers/CSVParser/getCsvConfig';
import { ContributorsSelection } from './ContributorsSelection';

type CSVParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onPreview?: (
    works: WorkEntity[],
    chapters: WorkEntity[],
    serieses: SeriesImportPlan,
    warnings: ImportIssue[],
  ) => void;
  onValidationFailure?: (issues: ImportIssue[]) => void;
};

export type CSVFieldType = string | number | boolean;

export const CSVParse = (props: CSVParseProps) => {
  const { file, imprints, serieses, onValidationFailure, onPreview } = props;

  const { contributorService, institutionService } = useServices();
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const translate = t as TranslateFunction;

  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [works, setWorks] = useState<WorkEntity[]>([]);
  const [seriesForUpdate, setSeriesForUpdate] = useState<SeriesImportPlan>([]);
  const [multipleFoundedContributors, setMultipleFoundedContributors] = useState<ContributorsForSelection>({});
  // Held here rather than routed through contributor selection, which has no business reading
  // diagnostics: they are handed on unchanged when the user asks for the preview.
  const [warnings, setWarnings] = useState<ImportIssue[]>([]);

  const isFileUploaded = file && file.size > 0;
  const isCsvFile = isCsv(file);

  const isDataEmpty = works.length === 0;

  const parseFile = useEffectEvent(async () => {
    setWorks([]);
    setSeriesForUpdate([]);
    setMultipleFoundedContributors({});
    setWarnings([]);
    setIsValidatingFile(true);

    const csvConfig = getCsvConfig(imprints, licenseOptions, translate);
    const csvParser = new CSVParser(
      file,
      csvConfig,
      imprints,
      licenseOptions,
      serieses,
      contributorService,
      institutionService,
      translate,
    );

    const result = await csvParser.parse();

    if (result.status === 'failed') {
      onValidationFailure?.(result.issues);
      setIsValidatingFile(false);
      return;
    }

    setWorks(result.data.works);
    setSeriesForUpdate(result.data.series);
    setMultipleFoundedContributors(result.data.contributorsForSelection);
    // A successful parse only ever carries warnings, and they are not a validation failure:
    // they travel with the data to the preview, where the user decides whether to go ahead.
    setWarnings(result.issues);
    setIsValidatingFile(false);
  });

  useEffect(() => {
    if (!isFileUploaded || !isCsvFile) return;

    parseFile();
  }, [file, isFileUploaded, isCsvFile]);

  const handleSubmit = async (works: WorkEntity[]) => {
    onPreview?.(works, [], seriesForUpdate, warnings);
  };

  return (
    <>
      <Activity mode={isValidatingFile ? 'visible' : 'hidden'}>
        <CircularProgress />
      </Activity>

      {!isDataEmpty && (
        <ContributorsSelection
          contributors={multipleFoundedContributors}
          works={works}
          chapters={[]}
          onPreview={handleSubmit}
        />
      )}
    </>
  );
};
