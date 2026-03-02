'use client';

import { useEffect, useState } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import { useFundingStateMachine } from '@/src/entities/funding';
import { useUpdateWorks, useWorkChapters } from '@/src/entities/work';
import { LicenseAndCopyrightHolderForm } from '@/src/entities/work/model/work.types';
import { useWorkChaptersStateMachine } from '@/src/entities/work/store/hooks/useWorkChaptersStateMachine';
import type { BaseEditSectionProps } from '@/src/shared';
import { licenseOptions } from '@/src/shared/constants/formFields';

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

  const { activeWorkChapters, isMultipleChaptersSelected, update, close } = useWorkChaptersStateMachine();
  const { close: closeContribution } = useContributionStateMachine();
  const { close: closeFunding } = useFundingStateMachine();
  const { updateLanguages, deleteLanguages } = useChaptersLanguages();

  const initValue = activeWorkChapters && activeWorkChapters.length > 0 ? activeWorkChapters : null;
  const [chapters, setChapters] = useState(initValue);

  const { chapters: currentWorkChapters } = useWorkChapters({ workId });

  useEffect(() => {
    if (!activeWorkChapters) return;

    const chaptersIds = activeWorkChapters.map((chapter) => chapter.id);

    const activeChapters = currentWorkChapters.filter((chapter) => chaptersIds.includes(chapter.id));

    if (activeChapters.length !== chaptersIds.length) return;

    update(activeChapters);
  }, [currentWorkChapters]);

  useEffect(() => {
    return () => {
      close();
      closeContribution();
      closeFunding();
    };
  }, []);

  useEffect(() => {
    setChapters(activeWorkChapters);
  }, [activeWorkChapters]);

  const { updateWorks } = useUpdateWorks();

  const handleDone = () => {
    onDone?.();
    close();
    closeContribution();
    closeFunding();
  };

  const handleClose = () => {
    onClose?.();
    close();
    closeContribution();
    closeFunding();
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

  const license = chapters[0].license ? chapters[0].license : licenseOptions[0].value;
  const firstChapterId = activeWorkChapters?.[0].id ?? '';

  return (
    <FullScreenModal title={title} isOpen={isMultipleChaptersSelected} onClose={handleClose} onDone={handleDone}>
      <EditChapterBasicDetails workId="" isMultipleChaptersEdit license={license} onLicenseUpdate={onLicenseUpdate} />
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
