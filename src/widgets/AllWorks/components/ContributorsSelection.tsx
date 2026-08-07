import { useState } from 'react';

import { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributorId } from '@/src/entities/contributor/model/contributor.types';
import { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';
import type { ContributorsForSelection, ImportPlan } from '@/src/shared/types';
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
import { getDisplayTitle, isDefaultId } from '@/src/shared/utils';

type ContributorsSelectionProps = {
  contributors: ContributorsForSelection;
  plan: ImportPlan;
  onPreview?: (plan: ImportPlan) => void;
};

/**
 * Resolves the contributors an import found several candidates for, and hands on the same plan
 * with those choices applied.
 *
 * It knows nothing about diagnostics: warnings travel around it, not through it. What it does
 * own is that resolving a contributor changes a work's contributions and nothing else — not its
 * id, not its position in the import, and not its series membership.
 */
export const ContributorsSelection = (props: ContributorsSelectionProps) => {
  const { contributors, plan, onPreview } = props;
  const { works, chapters } = plan;

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

  /**
   * Applies this work's resolved contributors, if it had any to resolve.
   *
   * A work with no selection options, or with options none of which were chosen, keeps the
   * contributions the parser gave it.
   */
  const applySelections = (work: WorkEntity): WorkEntity => {
    const selections = multipleFoundedContributors[work.id];

    if (!selections) return work;

    const appliedContributions: WorkContribution[] = [];

    Object.values(selections).forEach((contributions) => {
      const contribution = contributions.find(({ selected }) => selected);

      if (!contribution) return;

      const { selected, lastContribution, ...contributionData } = contribution;

      appliedContributions.push(contributionData);
    });

    if (appliedContributions.length === 0) return work;

    return { ...work, contributions: appliedContributions };
  };

  const handleSubmit = () => {
    // Mapped over the plan's own arrays, so every work keeps its place. Rebuilding them from the
    // contributor map instead — resolved works first, untouched ones after — is what used to
    // send a middle work to the end of the import, and source order is now the plan's to keep.
    // `series` is passed through untouched: membership is by work id, which nothing here alters.
    onPreview?.({
      ...plan,
      works: works.map(applySelections),
      chapters: chapters.map(applySelections),
    });
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
                      <TableCell className="firstCell pl-4">{getDisplayTitle(work.titles).title}</TableCell>
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
                                    {orcidId && <OrcidLink orcidId={orcidId} />}
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
