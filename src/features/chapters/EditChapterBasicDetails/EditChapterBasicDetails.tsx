'use client';

import { EditDoi, EditLicense, EditWorkTitle, useWorkRecommendations } from '@/src/entities/work';
import type { LicenseAndCopyrightHolderForm } from '@/src/entities/work/model/work.types';
import { type BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

type EditChapterBasicDetailsProps = BaseEditSectionProps &
  Partial<{
    license: string;
    copyrightHolder: string;
    isMultipleChaptersEdit: boolean;
    onLicenseUpdate: (data: LicenseAndCopyrightHolderForm) => void;
  }>;

const EditChapterBasicDetails = (props: EditChapterBasicDetailsProps) => {
  const { workId, license, copyrightHolder, isMultipleChaptersEdit = false, onLicenseUpdate } = props;

  const { isDoiRequired, isLandingPageRequired } = useWorkRecommendations({ workId });

  return (
    <RecommendedSection title="Core details" isEmpty={false} isValid={!isDoiRequired && !isLandingPageRequired}>
      {({ showRecommendations }) => (
        <div>
          {!isMultipleChaptersEdit && (
            <EditWorkTitle workId={workId} recommended={showRecommendations} withEdition={false} />
          )}
          <EditLicense workId={workId} license={license} copyrightHolder={copyrightHolder} onUpdate={onLicenseUpdate} />
          {!isMultipleChaptersEdit && <EditDoi workId={workId} recommended={showRecommendations} isChapter />}
        </div>
      )}
    </RecommendedSection>
  );
};

export default EditChapterBasicDetails;
