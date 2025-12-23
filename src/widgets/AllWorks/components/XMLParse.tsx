'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { validateXml } from '@/app/actions/validateXml';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import { useBulkCreateWorks } from '@/src/entities/work';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { ContributorsForSelection, type FormFieldOption, SeriesForUpdateItems, useServices } from '@/src/shared';
import { currencyOptions, languageOptions, licenseOptions } from '@/src/shared/constants/formFields';
import { XMLParser } from '@/src/shared/parsers';

import { ContributorsSelection } from './ContributorsSelection';

type XMLParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onValidationFailure?: (errors: string[]) => void;
  onSubmit?: () => void;
};

export const XMLParse = (props: XMLParseProps) => {
  const { file, imprints, serieses, onValidationFailure, onSubmit } = props;

  const { contributorService, institutionService } = useServices();

  const [works, setWorks] = useState<WorkEntity[]>([]);
  const [chapters, setChapters] = useState<WorkEntity[]>([]);
  const { bulkCreateWorks } = useBulkCreateWorks();
  const [seriesForUpdate, setSeriesForUpdate] = useState<SeriesForUpdateItems>({});
  const [multipleFoundedContributors, setMultipleFoundedContributors] = useState<ContributorsForSelection>({});

  const isDataEmpty = works.length === 0;

  const validateXMLFile = useEffectEvent(async (file: File) => {
    const response = await validateXml(file);

    if (response.status === 'error') {
      onValidationFailure?.(['Invalid XML file']);
      return;
    }

    const { data } = response;
    const errors: string[] = [];

    if (!data) {
      onValidationFailure?.(['Invalid XML file']);
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

    if (result.status === 'failed' || errors.length > 0) {
      onValidationFailure?.(result.errors);
      return;
    }

    setWorks(result.data.works);
    setChapters(result.data.chapters);
    setSeriesForUpdate(result.data.series);
    setMultipleFoundedContributors(result.data.contributorsForSelection);
  });

  useEffect(() => {
    if (!file) return;

    validateXMLFile(file);
  }, [file]);

  const handleSubmit = async (works: WorkEntity[], chapters: WorkEntity[]) => {
    await bulkCreateWorks({
      works,
      serieses: seriesForUpdate,
      chapters,
    });

    onSubmit?.();
  };

  if (isDataEmpty) return null;

  return (
    <ContributorsSelection
      contributors={multipleFoundedContributors}
      works={works}
      chapters={chapters}
      onSubmit={handleSubmit}
    />
  );
};
