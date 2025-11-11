'use client';

import {
  useCreateWork,
  useCreateWorkRelation,
  useWork,
  useWorkChapters,
  useWorkChaptersStateMachine,
} from '@/src/entities/work';
import { appConfig, BaseEditSectionProps, getDefaultChapter } from '@/src/shared';
import { AddButton } from '@/src/shared/ui';
import { useTranslation } from 'react-i18next';
import ChaptersModal from '../../layout/ChaptersModal/ChaptersModal';
import { InheritedDataForm } from './components/InheritedDataForm';
import { RelationType } from '@/gql/graphql';
import { useEffect, useState } from 'react';
import { licenseOptions } from '@/src/shared/constants/formFields';
import { useWorkContribution } from '@/src/entities/work/api/hooks/useWorkContribution';
import { useCreateFunding } from '@/src/entities/funding';
import { WorkContribution } from '@/src/entities/work/model/work.types';
import { WorkDtoMapper } from '@/src/entities/work/model/work.mapper';
import { useCreateSubject } from '@/src/entities/subject';

const mapper = new WorkDtoMapper();

const AddChapterModal = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { work } = useWork(workId, queryToken);
  const { chapters } = useWorkChapters({ workId });

  const { t } = useTranslation();

  const { edit } = useWorkChaptersStateMachine();

  const [isOpen, setIsOpen] = useState(false);
  const [inheritContributors, setInheritContributors] = useState(false);
  const [inheritFundings, setInheritFundings] = useState(false);
  const [inheritSubjects, setInheritSubjects] = useState(false);

  useEffect(() => {
    return () => {
      close();
    };
  }, []);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const { createWorkRelation } = useCreateWorkRelation({
    queryToken,
    workId,
  });

  const { createContribution: createContributionMutation } = useWorkContribution({
    queryToken,
  });

  const { createFunding } = useCreateFunding({
    queryToken,
    workId,
  });

  const { createSubject } = useCreateSubject({
    queryToken,
    workId,
  });

  const createContribution = async (data: WorkContribution, workId: string) => {
    const dto = mapper.toDtoContribution(data);

    await createContributionMutation({
      variables: { data: { workId, ...dto } },
    });
  };

  const { createWork } = useCreateWork({
    queryToken,
    onCompleted: (newWork) => {
      closeModal();
      edit([newWork]);

      if (inheritContributors) {
        work.contributions.forEach(async ({ id, ...contribution }) => {
          await createContribution({ ...contribution, id: appConfig.defaultId }, newWork.id);
        });
      }

      if (inheritFundings) {
        work.fundings.forEach(async (funding) => {
          await createFunding(funding, newWork.id);
        });
      }

      if (inheritSubjects) {
        work.subjects.forEach(async (subject) => {
          await createSubject(subject, newWork.id);
        });
      }

      createWorkRelation({
        variables: {
          data: {
            relatorWorkId: newWork.id,
            relatedWorkId: workId,
            relationOrdinal: chapters.length + 1,
            relationType: RelationType.IsChildOf,
          },
        },
      });
    },
  });

  const handleInheritedDataSubmit = (data: {
    license: boolean;
    copyrightHolder: boolean;
    contributors: boolean;
    fundings: boolean;
    subjects: boolean;
  }) => {
    const { license, copyrightHolder, contributors, fundings, subjects } = data;

    const defaultChapter = getDefaultChapter({
      title: 'New Chapter',
      fullTitle: 'New Chapter',
      status: work.status,
      coverUrl: work.coverUrl,
      landingPage: work.landingPage,
      imprintId: work.imprintId,
      license: license ? work.license : licenseOptions[0].value,
      copyrightHolder: copyrightHolder ? work.copyrightHolder : '',
    });

    setInheritContributors(contributors);

    setInheritFundings(fundings);

    setInheritSubjects(subjects);

    createWork(defaultChapter);
  };

  return (
    <>
      <AddButton className="px-7 capitalize" onAdd={openModal} disabled={isOpen}>
        {t('add chapter')}
      </AddButton>
      <ChaptersModal title="add new chapter" isOpen={isOpen} isSubmitHidden onClose={closeModal}>
        <InheritedDataForm onSubmit={handleInheritedDataSubmit} />
      </ChaptersModal>
    </>
  );
};

export default AddChapterModal;
