'use client';

import { useUpdateWorks, useWorkChapters, useWorkChaptersStateMachine } from '@/src/entities/work';
import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import type { BaseEditSectionProps } from '@/src/shared';
import { useEffect, useState } from 'react';
import EditDescriptions from '../EditDescriptions/EditDescriptions';
import FullScreenModal from '../../layout/FullScreenModal/FullScreenModal';
import { LicenseAndCopyrightHolderForm } from '@/src/entities/work/model/work.types';
import { licenseOptions } from '@/src/shared/constants/formFields';
import EditChaptersContributors from '../../chapters/EditChaptersContributors/EditChaptersContributors';
import EditChaptersFundings from '../../chapters/EditChaptersFundings/EditChaptersFundings';
import { useContributionStateMachine } from '@/src/entities/contribution';

type EditChaptersModalProps = BaseEditSectionProps & {
  title: string;
  onClose?: () => void;
  onDone?: () => void;
};

const EditChaptersModal = (props: EditChaptersModalProps) => {
  const { workId, queryToken, title, onClose, onDone } = props;

  const { activeWorkChapters, isMultipleChaptersSelected, update, close } = useWorkChaptersStateMachine();
  const { close: closeContribution } = useContributionStateMachine();

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
    };
  }, []);

  useEffect(() => {
    setChapters(activeWorkChapters);
  }, [activeWorkChapters]);

  const { updateWorks } = useUpdateWorks(queryToken);

  const handleDone = () => {
    onDone?.();
    close();
    closeContribution();
  };

  const handleClose = () => {
    onClose?.();
    close();
    closeContribution();
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

  return (
    <FullScreenModal title={title} isOpen={isMultipleChaptersSelected} onClose={handleClose} onDone={handleDone}>
      <EditChapterBasicDetails
        workId=""
        queryToken={queryToken}
        isMultipleChaptersEdit
        license={license}
        onLicenseUpdate={onLicenseUpdate}
      />
      <EditDescriptions
        workId=""
        queryToken={queryToken}
        isMultipleChaptersEdit
        // TODO: Implement languages update and reordering
        onLanguagesUpdate={(data) => console.log(data)}
      />
      <EditChaptersContributors queryToken={queryToken} chapters={chapters} />
      <EditChaptersFundings queryToken={queryToken} chapters={chapters} />
    </FullScreenModal>
  );
};

export default EditChaptersModal;
