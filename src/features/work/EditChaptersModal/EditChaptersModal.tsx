'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import { useFundingStateMachine } from '@/src/entities/funding';
import { useUpdateWorks, useWorkChapters } from '@/src/entities/work';
import { LicenseAndCopyrightHolderForm } from '@/src/entities/work/model/work.types';
import { useWorkChaptersStateMachine } from '@/src/entities/work/store/hooks/useWorkChaptersStateMachine';
import type { BaseEditSectionProps } from '@/src/shared/types';

import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import EditChaptersContributors from '../../chapters/EditChaptersContributors/EditChaptersContributors';
import EditChaptersFundings from '../../chapters/EditChaptersFundings/EditChaptersFundings';
import FullScreenModal from '../../layout/FullScreenModal/FullScreenModal';
import EditDescriptions from '../EditDescriptions/EditDescriptions';
import { useChaptersLanguages } from './useChaptersLanguages';

type EditChaptersModalProps = BaseEditSectionProps & {
  title: string;
  onClose?: () => void;
  onDone?: () => void;
};

const EditChaptersModal = (props: EditChaptersModalProps) => {
  const { workId, title, onClose, onDone } = props;

  const { activeWorkChapters, isMultipleChaptersSelected, update, finishEditing } = useWorkChaptersStateMachine();
  const { finishEditing: finishEditingContribution } = useContributionStateMachine();
  const { finishEditing: finishEditingFunding } = useFundingStateMachine();
  const { updateLanguages, deleteLanguages } = useChaptersLanguages();

  const initValue = activeWorkChapters && activeWorkChapters.length > 0 ? activeWorkChapters : null;
  const [chapters, setChapters] = useState(initValue);

  const { chapters: currentWorkChapters } = useWorkChapters({ workId });

  // Refresh the store's chapters when the query data changes, reading the latest store
  // value without re-firing on it: `update` writes a new array to the store, so listing
  // `activeWorkChapters` as a dependency would loop.
  const syncActiveWorkChapters = useEffectEvent(() => {
    if (!activeWorkChapters) return;

    const chaptersIds = activeWorkChapters.map((chapter) => chapter.id);

    const activeChapters = currentWorkChapters.filter((chapter) => chaptersIds.includes(chapter.id));

    if (activeChapters.length !== chaptersIds.length) return;

    update(activeChapters);
  });

  useEffect(() => {
    syncActiveWorkChapters();
  }, [currentWorkChapters]);

  useEffect(() => {
    return () => {
      finishEditing();
      finishEditingContribution();
      finishEditingFunding();
    };
  }, [finishEditing, finishEditingContribution, finishEditingFunding]);

  useEffect(() => {
    setChapters(activeWorkChapters);
  }, [activeWorkChapters]);

  const { updateWorks } = useUpdateWorks();

  const handleDone = () => {
    onDone?.();
    finishEditing();
    finishEditingContribution();
    finishEditingFunding();
  };

  const handleClose = () => {
    onClose?.();
    finishEditing();
    finishEditingContribution();
    finishEditingFunding();
  };

  const onLicenseUpdate = async (data: LicenseAndCopyrightHolderForm) => {
    if (!chapters) return;

    const chaptersWithUpdatedLicense = chapters.map((chapter) => ({
      ...chapter,
      license: data.license.value,
      copyrightHolder: data.copyrightHolder,
    }));

    await updateWorks(chaptersWithUpdatedLicense);

    setChapters(chaptersWithUpdatedLicense);
  };

  if (!chapters || !isMultipleChaptersSelected) return null;

  const firstChapterId = activeWorkChapters?.[0].id ?? '';

  return (
    <FullScreenModal title={title} isOpen={isMultipleChaptersSelected} onClose={handleClose} onDone={handleDone}>
      <EditChapterBasicDetails workId="" isMultipleChaptersEdit onLicenseUpdate={onLicenseUpdate} />
      <EditDescriptions
        workId={firstChapterId}
        isMultipleChaptersEdit
        onLanguagesUpdate={updateLanguages}
        onLanguagesDelete={deleteLanguages}
      />
      <EditChaptersContributors chapters={chapters} />
      <EditChaptersFundings chapters={chapters} />
    </FullScreenModal>
  );
};

export default EditChaptersModal;
