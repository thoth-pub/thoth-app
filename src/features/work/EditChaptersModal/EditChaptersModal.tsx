'use client';

import { useUpdateWorks, useWorkChaptersStateMachine } from '@/src/entities/work';
import EditChapterBasicDetails from '../../chapters/EditChapterBasicDetails/EditChapterBasicDetails';
import type { BaseEditSectionProps } from '@/src/shared';
import { useEffect, useState } from 'react';
import EditDescriptions from '../EditDescriptions/EditDescriptions';
import ChaptersModal from '../../layout/ChaptersModal/ChaptersModal';
import { LicenseAndCopyrightHolderForm } from '@/src/entities/work/model/work.types';
import { licenseOptions } from '@/src/shared/constants/formFields';
import EditChaptersContributors from '../../chapters/EditChaptersContributors/EditChaptersContributors';
import EditChaptersFundings from '../../chapters/EditChaptersFundings/EditChaptersFundings';

// TODO WIP

type EditChaptersModalProps = Omit<BaseEditSectionProps, 'workId'> & {
  title: string;
  onClose?: () => void;
  onDone?: () => void;
};

const EditChaptersModal = (props: EditChaptersModalProps) => {
  const { queryToken, title, onClose, onDone } = props;

  const { activeWorkChapters, isMultipleChaptersSelected, edit, close } = useWorkChaptersStateMachine();

  const initValue = activeWorkChapters && activeWorkChapters.length > 0 ? activeWorkChapters : null;
  const [chapters, setChapters] = useState(initValue);

  useEffect(() => {
    return () => {
      close();
    };
  }, []);

  useEffect(() => {
    setChapters(activeWorkChapters);
  }, [activeWorkChapters]);

  const { updateWorks } = useUpdateWorks(queryToken);

  const handleDone = () => {
    onDone?.();
    close();
  };

  const handleClose = () => {
    onClose?.();
    close();
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
    <ChaptersModal
      title={title}
      capitalizeTitle={false}
      isOpen={isMultipleChaptersSelected}
      onClose={handleClose}
      onDone={handleDone}
    >
      <EditChapterBasicDetails
        workId={''}
        queryToken={queryToken}
        isMultipleChaptersEdit
        license={license}
        onLicenseUpdate={onLicenseUpdate}
      />
      <EditDescriptions
        workId={''}
        queryToken={queryToken}
        isMultipleChaptersEdit
        onLanguagesUpdate={(data) => console.log(data)}
      />
      <EditChaptersContributors queryToken={queryToken} chapters={chapters} />
      <EditChaptersFundings queryToken={queryToken} chapters={chapters} />
    </ChaptersModal>
  );
};

export default EditChaptersModal;
