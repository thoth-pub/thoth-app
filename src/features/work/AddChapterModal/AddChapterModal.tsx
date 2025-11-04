'use client';

import {
  useCreateWork,
  useCreateWorkRelation,
  useWork,
  useWorkChapters,
  useWorkChaptersStateMachine,
} from '@/src/entities/work';
import { DoiAndCoversForm, LicenseAndCopyrightHolderForm, WorkTitlesForm } from '@/src/entities/work/model/work.types';
import { BaseEditSectionProps, getDefaultChapter } from '@/src/shared';
import { AddButton } from '@/src/shared/ui';
import { useTranslation } from 'react-i18next';
import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import { Activity, useEffect, useMemo, useState } from 'react';
import EditDescriptions from '../EditDescriptions/EditDescriptions';
import ChaptersModal from '../../layout/ChaptersModal/ChaptersModal';
import { InheritedDataForm } from './components/InheritedDataForm';
import { RelationType } from '@/gql/graphql';
import { licenseOptions } from '@/src/shared/constants/formFields';

// TODO WIP

const steps = {
  selection: 'selection',
  edit: 'edit',
};

const AddChapterModal = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { activeWorkChapters, isChapterSelected, isNewChapterSelected, edit, close } = useWorkChaptersStateMachine();

  const { work } = useWork(workId, queryToken);
  const { chapters } = useWorkChapters({ workId });

  const { createWorkRelation } = useCreateWorkRelation({
    queryToken,
  });

  const { createWork } = useCreateWork({
    queryToken,
    onCompleted: (data) => {
      createWorkRelation({
        variables: {
          data: {
            relatorWorkId: data.createWork.workId,
            relatedWorkId: workId,
            relationOrdinal: chapters.length + 1,
            relationType: RelationType.IsChildOf,
          },
        },
      });
      close();
    },
  });

  const initValue = useMemo(() => {
    return activeWorkChapters && activeWorkChapters.length > 0
      ? activeWorkChapters[0]
      : getDefaultChapter({ status: work.status });
  }, [activeWorkChapters]);

  const [chapter, setChapter] = useState(initValue);

  const initialStep = useMemo(() => {
    console.log('initValue', initValue);
    return initValue.license && initValue.license.length > 0 ? steps.edit : steps.selection;
  }, [initValue]);

  const [step, setStep] = useState(initialStep);

  const { t } = useTranslation();

  useEffect(() => {
    setChapter(initValue);
  }, [initValue]);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    return () => {
      close();
    };
  }, []);

  const handleOpenModal = () => {
    close();

    const defaultChapter = getDefaultChapter({ status: work.status });

    edit([defaultChapter]);
  };

  const handleTitleUpdate = (data: WorkTitlesForm) => {
    const { titles } = data;

    const title = titles.length > 0 ? titles[0].workTitle : chapter.title;
    const subtitle = titles.length > 0 ? titles[0].subtitle : chapter.subtitle;

    setChapter({ ...chapter, title, subtitle: subtitle ?? '' });
  };

  const handleLicenseUpdate = (data: LicenseAndCopyrightHolderForm) => {
    const { license, copyrightHolder } = data;

    setChapter({ ...chapter, license: license.value, copyrightHolder: copyrightHolder ?? '' });
  };

  const handleDoiUpdate = (data: DoiAndCoversForm) => {
    const { doi, landingPage, coverUrl } = data;

    setChapter({ ...chapter, doi: doi ?? '', landingPage: landingPage ?? '', coverUrl: coverUrl ?? '' });
  };

  const handleDone = () => {
    createWork({
      variables: {
        data: {
          title: chapter.title,
          fullTitle: chapter.title,
          subtitle: chapter.subtitle && chapter.subtitle.length > 0 ? chapter.subtitle : null,
          workStatus: chapter.status,
          workType: chapter.type,
          imprintId: work.imprintId,
          license: chapter.license && chapter.license.length > 0 ? chapter.license : licenseOptions[0].value,
          publicationDate: work.publicationDate,
          withdrawnDate: work.withdrawnDate,
          doi: chapter.doi && chapter.doi.length > 0 ? chapter.doi : null,
          landingPage: chapter.landingPage,
          coverUrl: chapter.coverUrl,
        },
      },
    });
  };

  const handleInheritedDataSubmit = (data: { license: boolean; copyrightHolder: boolean }) => {
    const { license, copyrightHolder } = data;

    const updatedChapter = {
      ...chapter,
      coverUrl: work.coverUrl,
      landingPage: work.landingPage,
      license: license ? work.license : chapter.license,
      copyrightHolder: copyrightHolder ? work.copyrightHolder : chapter.copyrightHolder,
    };

    setChapter(updatedChapter);
    setStep(steps.edit);
  };

  return (
    <>
      <AddButton className="px-7 capitalize" onAdd={handleOpenModal} disabled={isChapterSelected}>
        {t('add chapter')}
      </AddButton>
      <ChaptersModal title="add new chapter" isOpen={isNewChapterSelected} onClose={close} onDone={handleDone}>
        <Activity mode={step === steps.selection ? 'visible' : 'hidden'}>
          <InheritedDataForm onSubmit={handleInheritedDataSubmit} />
        </Activity>
        <Activity mode={step === steps.edit ? 'visible' : 'hidden'}>
          <EditChapterBasicDetails
            workId={''}
            queryToken={queryToken}
            title={chapter.title}
            subtitle={chapter.subtitle}
            license={chapter.license ?? ''}
            copyrightHolder={chapter.copyrightHolder ?? ''}
            onTitleUpdate={handleTitleUpdate}
            onLicenseUpdate={handleLicenseUpdate}
            onDoiUpdate={handleDoiUpdate}
          />
          <EditDescriptions
            workId={''}
            queryToken={queryToken}
            onPageCountUpdate={(data) => console.log(data)}
            onMediaUpdate={(data) => console.log(data)}
            onLanguagesUpdate={(data) => console.log(data)}
            onSubjectsUpdate={(data) => console.log(data)}
          />
        </Activity>
      </ChaptersModal>
    </>
  );
};

export default AddChapterModal;
