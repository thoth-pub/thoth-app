'use client';

import { Activity, useEffect, useEffectEvent, useState } from 'react';

import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { ContributorsForSelection, FormFieldOption, SeriesForUpdateItems, useServices } from '@/src/shared';
import { licenseOptions } from '@/src/shared/constants/formFields';
import { CSVParser } from '@/src/shared/parsers';
import { CircularProgress } from '@/src/shared/ui';
import { isCsv } from '@/src/shared/utils';

import { getCsvConfig } from '../../../shared/parsers/CSVParser/getCsvConfig';
import { ContributorsSelection } from './ContributorsSelection';

type CSVParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onPreview?: (works: WorkEntity[], chapters: WorkEntity[], serieses: SeriesForUpdateItems) => void;
  onValidationFailure?: (errors: string[]) => void;
};

export type CSVFieldType = string | number | boolean;

export const CSVParse = (props: CSVParseProps) => {
  const { file, imprints, serieses, onValidationFailure, onPreview } = props;

  const { contributorService, institutionService } = useServices();

  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [works, setWorks] = useState<WorkEntity[]>([]);
  const [seriesForUpdate, setSeriesForUpdate] = useState<SeriesForUpdateItems>({});
  const [multipleFoundedContributors, setMultipleFoundedContributors] = useState<ContributorsForSelection>({});
  const csvConfig = getCsvConfig(imprints, licenseOptions, serieses);
  const csvParser = new CSVParser(
    file,
    csvConfig,
    imprints,
    licenseOptions,
    serieses,
    contributorService,
    institutionService,
  );

  const isFileUploaded = file && file.size > 0;
  const isCsvFile = isCsv(file);

  const isDataEmpty = works.length === 0;

  const parseFile = useEffectEvent(async () => {
    setWorks([]);
    setSeriesForUpdate({});
    setMultipleFoundedContributors({});
    setIsValidatingFile(true);

    const result = await csvParser.parse();

    if (result.status === 'failed') {
      onValidationFailure?.(result.errors);
      setIsValidatingFile(false);
      return;
    }

    setWorks(result.data.works);
    setSeriesForUpdate(result.data.series);
    setMultipleFoundedContributors(result.data.contributorsForSelection);
    setIsValidatingFile(false);
  });

  useEffect(() => {
    if (!isFileUploaded || !isCsvFile) return;

    parseFile();
  }, [file]);

  const handleSubmit = async (works: WorkEntity[]) => {
    onPreview?.(works, [], seriesForUpdate);
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
