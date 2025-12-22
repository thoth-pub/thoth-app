import { useEffect, useState } from 'react';

import { validateXml } from '@/app/actions/validateXml';
import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributorId } from '@/src/entities/contributor/model/contributor.types';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import { useBulkCreateWorks } from '@/src/entities/work';
import type { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';
import {
  ContributorsForSelection,
  convertOrchidIdToText,
  type FormFieldOption,
  getMainTitle,
  isDefaultId,
  SeriesForUpdateItems,
  useServices,
  WorkTypes,
} from '@/src/shared';
import { currencyOptions, languageOptionsAlt, licenseOptions } from '@/src/shared/constants/formFields';
import { XMLParser } from '@/src/shared/parsers';
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

type XMLParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onValidationSuccess?: (data: WorkEntity[]) => void;
  onValidationFailure?: (errors: string[]) => void;
};

export const XMLParse = (props: XMLParseProps) => {
  const { file, imprints, serieses, onValidationFailure } = props;

  const { contributorService, institutionService } = useServices();

  const [works, setWorks] = useState<WorkEntity[]>([]);
  const [chapters, setChapters] = useState<WorkEntity[]>([]);
  const { bulkCreateWorks: _ } = useBulkCreateWorks();
  const [seriesForUpdate, setSeriesForUpdate] = useState<SeriesForUpdateItems>({});
  const [multipleFoundedContributors, setMultipleFoundedContributors] = useState<ContributorsForSelection>({});

  const showContributorsSelection = Object.keys(multipleFoundedContributors).length > 0;

  const isDataEmpty = works.length === 0;

  const validateXMLFile = async (file: File) => {
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
      languageOptionsAlt,
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
  };

  useEffect(() => {
    if (file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      validateXMLFile(file);
    }
  }, [file]);

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

  const handleSubmit = () => {
    const updatedWorks: WorkEntity[] = [];

    Object.entries(multipleFoundedContributors).forEach(([workId, data]) => {
      const work = [...works, ...chapters].find((work) => work.id === workId);

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

    const updatedChapters = updatedWorks.filter((work) => work.type === WorkTypes.enum.BookChapter);
    const updatedChaptersIds = updatedChapters.map((chapter) => chapter.id);
    const notUpdatedChapters = chapters.filter((chapter) => !updatedChaptersIds.includes(chapter.id));

    const filteredWorks = works.filter((work) => work.type !== WorkTypes.enum.BookChapter);
    const updatedWorksIds = filteredWorks.map((work) => work.id);
    const notUpdatedWorks = works.filter((work) => !updatedWorksIds.includes(work.id));

    console.log('Works', [...notUpdatedWorks, ...filteredWorks]);
    console.log('Chapters', [...notUpdatedChapters, ...updatedChapters]);
    console.log('Series', seriesForUpdate);
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
                const work = [...works, ...chapters].find((work) => work.id === workId);

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
