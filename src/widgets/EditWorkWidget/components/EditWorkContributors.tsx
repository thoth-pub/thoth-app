'use client';

import { useMemo, useState } from 'react';

import { ContributorsTable, useCreateContributor, useUpdateContributor } from '@/src/entities/contributor';
import type { ContributionType } from '@/src/entities/contributor/model/contributor.types';
import { ContributorForm } from '@/src/entities/contributor/model/contributor.validation';
import { useWork } from '@/src/entities/work';
import type { WorkContribution, WorkId } from '@/src/entities/work/model/work.types';
import { AddContributorsModal, EditContributorModal } from '@/src/features';
import { config, type FormFieldOption, isDefaultId, type QueryToken } from '@/src/shared';
import { ContributorTypes, IDs, NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';
import { AccordionSection } from '@/src/shared/ui';

const { CONTRIBUTORS } = IDs.FORM_SECTIONS;

const {
  CONTRIBUTOR_CREATION_SUCCESS,
  CONTRIBUTOR_CREATION_FAILED,
  CONTRIBUTOR_UPDATE_FAILED,
  CONTRIBUTOR_UPDATE_SUCCESS,
} = NOTIFICATIONS;

type EditWorkContributorsProps = {
  workId: WorkId;
  queryToken: QueryToken;
  contributorTypeOptions: FormFieldOption[];
  isAdmin?: boolean;
};

export const EditWorkContributors = (props: EditWorkContributorsProps) => {
  const { workId, queryToken, contributorTypeOptions, isAdmin = false } = props;

  const { work, createContribution, deleteContribution, updateContribution, contributionToDto } = useWork(
    workId,
    queryToken,
  );

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedContributor, setSelectedContributor] = useState<WorkContribution | null>(null);
  const isDefault = selectedContributor ? isDefaultId(selectedContributor.id) : false;
  const isNew = !selectedContributor || (selectedContributor && isDefaultId(selectedContributor.id));

  const editFormDefaultValues =
    !isDefault && selectedContributor
      ? { ...selectedContributor, orcid: selectedContributor.orchidId ?? '' }
      : {
          lastName: '',
          fullName: '',
          firstName: '',
          orcid: '',
          websiteUrl: '',
        };
  // TODO: check if we need this in this flow
  const isOrchidDisabled = !isAdmin && editFormDefaultValues.orcid;

  const contributions = useMemo(() => {
    if (!selectedContributor) return work.contributions;

    if (!isDefault) return work.contributions;

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
      website: '',
      firstName: '',
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

  // const createNewContributorProfile = ({
  //   fullName,
  //   lastName,
  //   id,
  // }: Pick<ContributorEntity, 'fullName' | 'lastName' | 'id'>) => {
  //   preselectContributor({ fullName: fullName ?? '', lastName, contributorId: id });
  //   setIsProfileModalOpen(false);
  // };

  const handleEditContributorProfile = (id: string) => {
    const contributor = contributions.find((contribution) => contribution.id === id);

    if (!contributor) return;

    setSelectedContributor(contributor);
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    if (!isDefault) {
      setSelectedContributor(null);
    }

    setIsProfileModalOpen(false);
  };

  const handleCreateProfile = () => {
    setSelectedContributor(null);
    setIsProfileModalOpen(true);
  };

  const { sendSuccessNotification, sendErrorNotification } = useNotifications();
  const { createContributor } = useCreateContributor({
    queryToken,
    onCompleted: (data) => {
      const { fullName, lastName, contributorId } = data;
      console.log(data);
      sendSuccessNotification(CONTRIBUTOR_CREATION_SUCCESS);
      preselectContributor({ fullName: fullName ?? '', lastName, contributorId });
      setIsProfileModalOpen(false);
    },
    onError: () => sendErrorNotification(CONTRIBUTOR_CREATION_FAILED),
  });

  const { updateContributor } = useUpdateContributor({
    queryToken,
    onCompleted: (data) => {
      const { contributorId, fullName, lastName, orcid, website, firstName } = data;

      const alreadyCreatedContributions = contributions.filter(
        (contribution) => contribution.contributorId === contributorId,
      );

      alreadyCreatedContributions.forEach((contribution) => {
        const data = contributionToDto({
          ...contribution,
          fullName,
          lastName,
          orchidId: orcid ?? '',
          firstName: firstName ?? '',
          website: website ?? '',
        });

        updateContribution({
          variables: {
            data: { workId, ...data },
            contributionId: contribution.id,
          },
        });
      });

      setIsProfileModalOpen(false);
    },
    onError: () => sendErrorNotification(CONTRIBUTOR_UPDATE_FAILED),
  });

  const handleCreate = ({ firstName, lastName, fullName, orcid, websiteUrl }: ContributorForm) => {
    const createContributorData = {
      firstName: firstName && firstName !== '' ? firstName : null,
      lastName,
      fullName,
      orcid: orcid && orcid.length > 0 ? config.validations.orcidPrefix + orcid : null,
      website: websiteUrl && websiteUrl.length > 0 ? websiteUrl : null,
    };

    createContributor({ variables: { data: createContributorData } });
  };

  const handleUpdateProfile = ({ firstName, lastName, fullName, orcid, websiteUrl }: ContributorForm) => {
    const updatedContributorData = {
      firstName: firstName && firstName !== '' ? firstName : null,
      lastName,
      fullName,
      orcid: orcid && orcid.length > 0 ? config.validations.orcidPrefix + orcid : null,
      website: websiteUrl && websiteUrl.length > 0 ? websiteUrl : null,
      contributorId: selectedContributor?.contributorId,
    };

    updateContributor({
      variables: { data: { ...updatedContributorData } },
    });
    setSelectedContributor(null);
    setIsProfileModalOpen(false);
  };

  const handleEditProfile = (data: ContributorForm) => {
    if (!selectedContributor) {
      handleCreate(data);
      return;
    }

    handleUpdateProfile(data);
  };

  return (
    <AccordionSection title="Contributors" panelId={CONTRIBUTORS} defaultExpanded>
      <ContributorsTable
        data={contributions}
        contributorTypeOptions={contributorTypeOptions}
        selectedId={selectedContributor && !isProfileModalOpen ? selectedContributor.id : ''}
        onEdit={handleEdit}
        onCloseEdit={addNewContributor}
        onDelete={deleteContributor}
        onFullNameUpdate={updateContributorFullName}
        onContributorTypeUpdate={updateContributorType}
        onSelectAsMain={setAsMainContributor}
        onReorderEnd={onReorder}
        onEditProfile={handleEditContributorProfile}
      />
      <AddContributorsModal isDisabled={isDefault} onAdd={preselectContributor} onCreate={handleCreateProfile} />
      <EditContributorModal
        isOpen={isProfileModalOpen}
        defaultValues={editFormDefaultValues}
        isNew={isNew}
        onEdit={handleEditProfile}
        onClose={closeProfileModal}
      />
    </AccordionSection>
  );
};
