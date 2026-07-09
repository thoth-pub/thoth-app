import { useState } from 'react';

import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributorId } from '@/src/entities/contributor/model/contributor.types';
import { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';
import { WorkTypes } from '@/src/shared/constants';
import type { ContributorsForSelection } from '@/src/shared/types';
import {
  Button,
  OrcidLink,
  Radio,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableWrapper,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';
import { getMainTitle, isDefaultId } from '@/src/shared/utils';

type ContributorsSelectionProps = {
  contributors: ContributorsForSelection;
  works: WorkEntity[];
  chapters: WorkEntity[];
  onPreview?: (works: WorkEntity[], chapters: WorkEntity[]) => void;
};

export const ContributorsSelection = (props: ContributorsSelectionProps) => {
  const { contributors, works, chapters, onPreview } = props;

  const [multipleFoundedContributors, setMultipleFoundedContributors] =
    useState<ContributorsForSelection>(contributors);

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

    const filteredWorks = updatedWorks.filter((work) => work.type !== WorkTypes.enum.BookChapter);
    const updatedWorksIds = filteredWorks.map((work) => work.id);
    const notUpdatedWorks = works.filter((work) => !updatedWorksIds.includes(work.id));

    onPreview?.([...notUpdatedWorks, ...filteredWorks], [...notUpdatedChapters, ...updatedChapters]);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      {showContributorsSelection && (
        <>
          <Typography variant="h1" component="h2" className="pl-4">
            <TranslatedContent content="multiple contributors found" />
          </Typography>
          <TableWrapper>
            <TableHeader
              cells={['work', 'search value', 'contributors']}
              cellStyles={['min-w-[210px] pl-4 capitalize', 'min-w-[210px] capitalize', 'min-w-[210px] capitalize']}
            />
            <TableBody>
              {Object.entries(multipleFoundedContributors).map(([workId, data]) => {
                const work = [...works, ...chapters].find((work) => work.id === workId);

                if (!work) return null;

                const contributions = Object.entries(data);

                return contributions.map(([itemId, contributions]) => {
                  const defaultContributor = contributions.find(({ contributorId }) => isDefaultId(contributorId));

                  if (contributions.length < 2) return null;

                  return (
                    <TableRow key={`${workId}-${itemId}`} className="group">
                      <TableCell className="firstCell pl-4">{getMainTitle(work.titles).title}</TableCell>
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
                            <Typography className="flex flex-col gap-2 capitalize">
                              {isDefaultId(contributorId) ? (
                                <TranslatedContent content="actions.create" />
                              ) : (
                                <>
                                  <Typography className="flex items-center gap-1" fontWeight="bold" component="span">
                                    {fullName}
                                    {orcidId && (
                                      <OrcidLink orcidId={orcidId} />
                                    )}
                                  </Typography>
                                  {lastContribution && lastContribution.length > 0 && (
                                    <Typography component="span">
                                      <TranslatedContent content="latest contribution to" />: {lastContribution}
                                    </Typography>
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
        <TranslatedContent content="preview" />
      </Button>
    </div>
  );
};
