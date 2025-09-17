'use client';

import { type ContributorEntity, ContributorsTable } from '@/src/entities/contributor';
import type { ContributionType } from '@/src/entities/contributor/model/contributor.types';
import { useWork } from '@/src/entities/work';
import { type WorkId } from '@/src/entities/work/model/work.types';
import { AddContributorsModal } from '@/src/features';
import type { FormFieldOption, QueryToken } from '@/src/shared';
import { IDs } from '@/src/shared/constants';
import { AccordionSection } from '@/src/shared/ui';

const { CONTRIBUTORS } = IDs.FORM_SECTIONS;

type EditWorkContributorsProps = {
  workId: WorkId;
  queryToken: QueryToken;
  contributorTypeOptions: FormFieldOption[];
};

export const EditWorkContributors = (props: EditWorkContributorsProps) => {
  const { workId, queryToken, contributorTypeOptions } = props;

  const { createContribution } = useWork(workId, queryToken);

  const addContributor = ({ id, fullName, lastName }: ContributorEntity, contributionType: ContributionType) => {
    createContribution({
      variables: {
        data: {
          workId,
          contributorId: id,
          contributionType,
          contributionOrdinal: 1,
          fullName,
          lastName,
          mainContribution: false,
        },
      },
    });
  };

  return (
    <AccordionSection title="Contributors" panelId={CONTRIBUTORS} defaultExpanded>
      <ContributorsTable />
      <AddContributorsModal onAdd={addContributor} contributorTypeOptions={contributorTypeOptions} />
    </AccordionSection>
  );
};
