'use client';

import { ContributorsTable } from '@/src/entities/contributor';
import type { PublisherId } from '@/src/entities/publisher';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { AddContributorsModal } from '@/src/features';
import { type FormFieldOption, type QueryToken } from '@/src/shared';
import { IDs } from '@/src/shared/constants';
import { AccordionSection } from '@/src/shared/ui';

import { useEditWorkContributors } from './useEditWorkContributors';

const { CONTRIBUTORS } = IDs.FORM_SECTIONS;

type EditWorkContributorsProps = {
  workId: WorkId;
  queryToken: QueryToken;
  contributorTypeOptions: FormFieldOption[];
  linkedPublishers?: PublisherId[];
  isAdmin?: boolean;
};

export const EditWorkContributors = (props: EditWorkContributorsProps) => {
  const { workId, queryToken, contributorTypeOptions, isAdmin = false, linkedPublishers = [] } = props;

  const {
    contributions,
    selectedContributor,
    isOrchidFieldDisabled,
    isWebsiteUrlFieldDisabled,
    preselectContributor,
    updateContributionFullName,
    updateContributionLastName,
    updateContributionOrcid,
    updateContributionWebsite,
    updateContributionType,
    updateContributionAsMain,
    deleteContribution,
    reorderContributions,
    saveContribution,
    edit,
  } = useEditWorkContributors({
    workId,
    queryToken,
    isAdmin,
    linkedPublishers,
  });

  return (
    <AccordionSection title="Contributors" panelId={CONTRIBUTORS} defaultExpanded>
      <ContributorsTable
        data={contributions}
        contributorTypeOptions={contributorTypeOptions}
        selectedId={selectedContributor?.id ?? ''}
        isOrchidFieldDisabled={isOrchidFieldDisabled}
        isWebsiteUrlFieldDisabled={isWebsiteUrlFieldDisabled}
        onEdit={edit}
        onCloseEdit={saveContribution}
        onDelete={deleteContribution}
        onFullNameUpdate={updateContributionFullName}
        onLastNameUpdate={updateContributionLastName}
        onOrcidUpdate={updateContributionOrcid}
        onWebsiteUrlUpdate={updateContributionWebsite}
        onContributorTypeUpdate={updateContributionType}
        onSelectAsMain={updateContributionAsMain}
        onReorderEnd={reorderContributions}
      />
      <AddContributorsModal
        isDisabled={!!selectedContributor}
        onAdd={preselectContributor}
        onCreate={() => preselectContributor({})}
      />
    </AccordionSection>
  );
};
