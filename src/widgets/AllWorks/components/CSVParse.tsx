'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { useBulkCreateWorks } from '@/src/entities/work';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { ContributorsForSelection, FormFieldOption, SeriesForUpdateItems, useServices } from '@/src/shared';
import { licenseOptions } from '@/src/shared/constants/formFields';
import { CSVParser } from '@/src/shared/parsers';
import { isCsv } from '@/src/shared/utils';

import { getCsvConfig } from '../../../shared/parsers/CSVParser/getCsvConfig';
import { ContributorsSelection } from './ContributorsSelection';

type CSVParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onSubmit?: () => void;
  onValidationFailure?: (errors: string[]) => void;
};

export type CSVFieldType = string | number | boolean;

export const CSVParse = (props: CSVParseProps) => {
  const { file, imprints, serieses, onValidationFailure, onSubmit } = props;

  const { contributorService, institutionService } = useServices();

  const [works, setWorks] = useState<WorkEntity[]>([]);
  const { bulkCreateWorks } = useBulkCreateWorks();
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

  const parseFile = useEffectEvent(async () => {
    setWorks([]);
    setSeriesForUpdate({});
    setMultipleFoundedContributors({});

    const result = await csvParser.parse();

    if (result.status === 'failed') {
      onValidationFailure?.(result.errors);
      return;
    }

    setWorks(result.data.works);
    setSeriesForUpdate(result.data.series);
    setMultipleFoundedContributors(result.data.contributorsForSelection);
  });

  useEffect(() => {
    if (!isFileUploaded || !isCsvFile) return;

    parseFile();
  }, [file]);

  const isDataEmpty = works.length === 0;

  const handleSubmit = async (works: WorkEntity[]) => {
    await bulkCreateWorks({
      works,
      serieses: seriesForUpdate,
      chapters: [],
    });

    onSubmit?.();
  };

  if (isDataEmpty) return null;

  return (
    <ContributorsSelection
      contributors={multipleFoundedContributors}
      works={works}
      chapters={[]}
      onSubmit={handleSubmit}
    />
  );
};
