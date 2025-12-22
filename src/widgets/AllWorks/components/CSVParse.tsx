'use client';

import { useEffect, useState } from 'react';

import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributorId } from '@/src/entities/contributor/model/contributor.types';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { useBulkCreateWorks } from '@/src/entities/work';
import { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';
import { ContributorsForSelection, FormFieldOption, SeriesForUpdateItems, useServices } from '@/src/shared';
import { licenseOptions } from '@/src/shared/constants/formFields';
import { CSVParser } from '@/src/shared/parsers';
import {
  Button,
  LinkTooltip,
  OrchidLogo,
  Radio,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableWrapper,
  Typography,
} from '@/src/shared/ui';
import { convertOrchidIdToText, getMainTitle, isCsv, isDefaultId } from '@/src/shared/utils';

import { getCsvConfig } from '../../../shared/parsers/CSVParser/getCsvConfig';

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

  const parseFile = async () => {
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
  };

  useEffect(() => {
    if (!isFileUploaded || !isCsvFile) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    parseFile();
  }, [file]);

  const isDataEmpty = works.length === 0;

  const showContributorsSelection = Object.entries(multipleFoundedContributors).some(
    ([_, data]) => Object.keys(data).length > 0,
  );

  const handleSelectContributor = (workId: WorkId, itemId: string, contributorId: ContributorId) => {
    const selectedWork = multipleFoundedContributors[workId];

    if (!selectedWork) return;

    const selectedItems = selectedWork[itemId];

    if (!selectedItems) return;

    const updatedContributors = selectedItems.map((item) => {
      if (item.contributorId !== contributorId) return { ...item, selected: false };

      return { ...item, selected: true };
    });

    setMultipleFoundedContributors((prev) => ({
      ...prev,
      [workId]: {
        ...prev[workId],
        [itemId]: updatedContributors,
      },
    }));
  };

  const handleSubmit = async () => {
    const updatedWorks: WorkEntity[] = [];

    Object.entries(multipleFoundedContributors).forEach(([workId, data]) => {
      const work = works.find((work) => work.id === workId);

      if (!work) return;

      const appliedContributions: WorkContribution[] = [];

      Object.entries(data).forEach(([_itemId, contributions]) => {
        const contribution = contributions.find(({ selected }) => selected);

        if (!contribution) return;

        const { selected, lastContribution, ...contributionData } = contribution;

        appliedContributions.push(contributionData);
      });

      const updatedWork = {
        ...work,
        contributions: appliedContributions.length > 0 ? appliedContributions : work.contributions,
      };

      updatedWorks.push(updatedWork);
    });

    const updatedWorksIds = updatedWorks.map((work) => work.id);
    const notUpdatedWorks = works.filter((work) => !updatedWorksIds.includes(work.id));

    await bulkCreateWorks({
      works: [...notUpdatedWorks, ...updatedWorks],
      serieses: seriesForUpdate,
      chapters: [],
    });

    onSubmit?.();
  };

  if (isDataEmpty) return null;

  return (
    <div className="flex w-full flex-col gap-4">
      {showContributorsSelection && (
        <>
          <Typography variant="h1" component="h2">
            Multiple contributors found
          </Typography>
          <TableWrapper>
            <TableHeader
              cells={['Work', 'Search Value', 'Contributors']}
              cellStyles={['min-w-[210px]', 'min-w-[210px]', 'min-w-[210px]']}
            />
            <TableBody>
              {Object.entries(multipleFoundedContributors).map(([workId, data]) => {
                const work = works.find((work) => work.id === workId);

                if (!work) return null;

                const contributions = Object.entries(data);

                return contributions.map(([itemId, contributions], index) => {
                  const defaultContributor = contributions.find(({ contributorId }) => isDefaultId(contributorId));

                  if (contributions.length < 2) return null;

                  return (
                    <TableRow key={`${workId}-${itemId}-${index}`} className="group">
                      <TableCell className="firstCell">{getMainTitle(work.titles).title}</TableCell>
                      <TableCell className="middleCell">{defaultContributor?.fullName ?? ''}</TableCell>
                      <TableCell className="lastCell">
                        {contributions.map(({ id, fullName, orcidId, contributorId, lastContribution, selected }) => (
                          <div
                            key={id}
                            className="flex items-center gap-2 [&:not(:first-child)&:not(:last-child)]:my-4"
                          >
                            <Radio
                              checked={selected}
                              onChange={() => handleSelectContributor(workId, itemId, contributorId)}
                              className="self-start"
                            />
                            <Typography className="flex flex-col gap-2">
                              {isDefaultId(contributorId) ? (
                                'Create new'
                              ) : (
                                <>
                                  <Typography className="flex items-center gap-1" fontWeight="bold" component="span">
                                    {fullName}
                                    {orcidId && (
                                      <LinkTooltip link={orcidId} linkText={convertOrchidIdToText(orcidId)}>
                                        <OrchidLogo />
                                      </LinkTooltip>
                                    )}
                                  </Typography>
                                  {lastContribution && lastContribution.length > 0 && (
                                    <Typography component="span">Latest contribution to: {lastContribution}</Typography>
                                  )}
                                </>
                              )}
                            </Typography>
                          </div>
                        ))}
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </TableWrapper>
        </>
      )}
      <Button variant="contained" color="primary" className="m-auto" onClick={handleSubmit}>
        Submit
      </Button>
    </div>
  );
};
