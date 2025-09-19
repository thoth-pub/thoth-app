'use client';

import { useMemo, useState } from 'react';

import { ContributorsTable } from '@/src/entities/contributor';
import type { ContributionType, ContributorEntity } from '@/src/entities/contributor/model/contributor.types';
import { useWork } from '@/src/entities/work';
import type { WorkContribution, WorkId } from '@/src/entities/work/model/work.types';
import { AddContributorsModal } from '@/src/features';
import { config, type FormFieldOption, isDefaultId, type QueryToken } from '@/src/shared';
import { ContributorTypes, IDs } from '@/src/shared/constants';
import { AccordionSection } from '@/src/shared/ui';

const { CONTRIBUTORS } = IDs.FORM_SECTIONS;

type EditWorkContributorsProps = {
  workId: WorkId;
  queryToken: QueryToken;
  contributorTypeOptions: FormFieldOption[];
};

export const EditWorkContributors = (props: EditWorkContributorsProps) => {
  const { workId, queryToken, contributorTypeOptions } = props;

  const { work, createContribution, deleteContribution, updateContribution, contributionToDto } = useWork(
    workId,
    queryToken,
  );

  const [selectedContributor, setSelectedContributor] = useState<WorkContribution | null>(null);
  const isDefault = selectedContributor ? isDefaultId(selectedContributor.id) : false;

  const contributions = useMemo(() => {
    if (!selectedContributor) return work.contributions;

    return [...work.contributions, selectedContributor];
  }, [work.contributions, selectedContributor]);

  const preselectContributor = (contributor: { fullName: string; lastName: string; contributorId: string }) => {
    const id = config.defaultId;

    const newContribution = {
      ...contributor,
      id,
      type: ContributorTypes.enum.Author,
      isMain: false,
      orderNumber: 0,
      biography: '',
      orchidId: '',
      affiliations: [],
    };
    setSelectedContributor(newContribution);
  };

  const addNewContributor = () => {
    if (!selectedContributor) return;

    if (!isDefault) {
      setSelectedContributor(null);
      return;
    }

    createContribution({
      variables: {
        data: {
          workId,
          contributorId: selectedContributor.contributorId,
          contributionType: selectedContributor.type,
          contributionOrdinal: work.contributions.length + 1,
          fullName: selectedContributor.fullName,
          lastName: selectedContributor.lastName,
          mainContribution: isDefault,
        },
      },
    });
    setSelectedContributor(null);
  };

  const deleteContributor = async (id: string) => {
    const index = contributions.findIndex((contribution) => contribution.id === id);

    if (index < 0) return;

    const changedItems = contributions.slice(index + 1).map((contribution) => ({
      ...contribution,
      orderNumber: contribution.orderNumber - 1,
    }));

    await deleteContribution({
      variables: {
        contributionId: id,
      },
    });

    changedItems.forEach(async (contribution) => {
      const data = contributionToDto(contribution);

      await updateContribution({
        variables: {
          data: {
            workId,
            ...data,
          },
        },
      });
    });
  };

  const updateContributorFullName = (fullName: string) => {
    if (!selectedContributor) return;

    if (isDefault) {
      setSelectedContributor({
        ...selectedContributor,
        fullName,
      });
      return;
    }

    const data = contributionToDto({
      ...selectedContributor,
      fullName,
    });

    updateContribution({
      variables: {
        data: {
          workId,
          ...data,
        },
      },
    });
  };

  const updateContributorType = (contributorType: ContributionType) => {
    if (!selectedContributor) return;

    if (isDefault) {
      setSelectedContributor({
        ...selectedContributor,
        type: contributorType,
      });
      return;
    }

    const data = contributionToDto({
      ...selectedContributor,
      type: contributorType,
    });

    updateContribution({
      variables: {
        data: {
          workId,
          ...data,
        },
      },
    });
  };

  const handleEdit = (id: string) => {
    const contributor = contributions.find((contribution) => contribution.id === id);

    if (!contributor) return;

    setSelectedContributor(contributor);
  };

  const setAsMainContributor = (id: string) => {
    const contributor = contributions.find((contribution) => contribution.id === id);

    if (!contributor) return;

    const data = contributionToDto({
      ...contributor,
      isMain: !contributor.isMain,
    });

    updateContribution({
      variables: {
        data: {
          workId,
          ...data,
        },
      },
    });
  };

  const onReorder = async (items: WorkContribution[]) => {
    const reorderedItems = items.map((item, index) => ({
      ...item,
      orderNumber: index + 1,
    }));

    const changedItems = reorderedItems.filter(({ id, orderNumber }) => {
      const previousItem = contributions.find((contribution) => contribution.id === id);

      return previousItem?.orderNumber !== orderNumber;
    });

    changedItems.forEach(async (contribution) => {
      const { contributorId, contributionType, mainContribution, biography, fullName, lastName } =
        contributionToDto(contribution);

      const existingContribution = contributions[contribution.orderNumber - 1];

      if (!existingContribution) return;

      await updateContribution({
        variables: {
          data: {
            workId,
            contributionId: existingContribution.id,
            contributorId,
            contributionType,
            mainContribution,
            biography,
            fullName,
            lastName,
            contributionOrdinal: existingContribution.orderNumber,
          },
        },
      });
    });
  };

  const createNewContributorProfile = ({
    fullName,
    lastName,
    id,
  }: Pick<ContributorEntity, 'fullName' | 'lastName' | 'id'>) => {
    preselectContributor({ fullName: fullName ?? '', lastName, contributorId: id });
  };

  console.log(contributions);

  return (
    <AccordionSection title="Contributors" panelId={CONTRIBUTORS} defaultExpanded>
      <ContributorsTable
        data={contributions}
        contributorTypeOptions={contributorTypeOptions}
        selectedId={selectedContributor ? selectedContributor.id : ''}
        onEdit={handleEdit}
        onCloseEdit={addNewContributor}
        onDelete={deleteContributor}
        onFullNameUpdate={updateContributorFullName}
        onContributorTypeUpdate={updateContributorType}
        onSelectAsMain={setAsMainContributor}
        onReorderEnd={onReorder}
      />
      <AddContributorsModal
        queryToken={queryToken}
        isDisabled={isDefault}
        onAdd={preselectContributor}
        onCreate={createNewContributorProfile}
      />
    </AccordionSection>
  );
};
