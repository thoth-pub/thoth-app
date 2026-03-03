'use client';

import { Activity, useEffect, useEffectEvent, useState } from 'react';

import { validateXml } from '@/app/actions/validateXml';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { currencyOptions, languageOptions, licenseOptions } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { FormFieldOption } from '@/src/shared/interfaces';
import { XMLParser } from '@/src/shared/parsers';
import { ContributorsForSelection, SeriesForUpdateItems } from '@/src/shared/types';
import { CircularProgress } from '@/src/shared/ui';

import { ContributorsSelection } from './ContributorsSelection';

type XMLParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onValidationFailure?: (errors: string[]) => void;
  onPreview?: (works: WorkEntity[], chapters: WorkEntity[], serieses: SeriesForUpdateItems) => void;
};

export const XMLParse = (props: XMLParseProps) => {
  const { file, imprints, serieses, onValidationFailure, onPreview } = props;

  const { contributorService, institutionService } = useServices();

  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [works, setWorks] = useState<WorkEntity[]>([]);
  const [chapters, setChapters] = useState<WorkEntity[]>([]);
  const [seriesForUpdate, setSeriesForUpdate] = useState<SeriesForUpdateItems>({});
  const [multipleFoundedContributors, setMultipleFoundedContributors] = useState<ContributorsForSelection>({});

  const isDataEmpty = works.length === 0;

  const validateXMLFile = useEffectEvent(async (file: File) => {
    setIsValidatingFile(true);
    const response = await validateXml(file);

    if (response.status === 'error') {
      onValidationFailure?.(['Invalid XML file']);
      setIsValidatingFile(false);
      return;
    }

    const { data } = response;
    const errors: string[] = [];

    if (!data) {
      onValidationFailure?.(['Invalid XML file']);
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

    if (result.status === 'failed' || errors.length > 0) {
      onValidationFailure?.(result.errors);
      setIsValidatingFile(false);
      return;
    }

    setWorks(result.data.works);
    setChapters(result.data.chapters);
    setSeriesForUpdate(result.data.series);
    setMultipleFoundedContributors(result.data.contributorsForSelection);
    setIsValidatingFile(false);
  });

  useEffect(() => {
    if (!file) return;

    validateXMLFile(file);
  }, [file]);

  const handleSubmit = (works: WorkEntity[], chapters: WorkEntity[]) => {
    onPreview?.(works, chapters, seriesForUpdate);
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
          chapters={chapters}
          onPreview={handleSubmit}
        />
      )}
    </>
  );
};
