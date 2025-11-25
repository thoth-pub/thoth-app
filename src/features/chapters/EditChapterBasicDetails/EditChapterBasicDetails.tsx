'use client';

import { EditDoi, EditLicense, EditWorkTitle, useWorkRecommendations } from '@/src/entities/work';
import type { LicenseAndCopyrightHolderForm } from '@/src/entities/work/model/work.types';
import { type BaseEditSectionProps } from '@/src/shared';
import { RecommendedSection } from '@/src/shared/ui';

type EditChapterBasicDetailsProps = BaseEditSectionProps &
  Partial<{
    title: string;
    subtitle: string;
    license?: string;
    copyrightHolder?: string;
    isMultipleChaptersEdit: boolean;
    onLicenseUpdate?: (data: LicenseAndCopyrightHolderForm) => void;
  }>;

const EditChapterBasicDetails = (props: EditChapterBasicDetailsProps) => {
  const {
    workId,
    queryToken,
    title,
    subtitle,
    license,
    copyrightHolder,
    isMultipleChaptersEdit = false,
    onLicenseUpdate,
  } = props;

  const { isDoiRequired, isLandingPageRequired } = useWorkRecommendations({ workId });

  return (
    <RecommendedSection title="Basic details" isEmpty={false} isValid={!isDoiRequired && !isLandingPageRequired}>
      {({ showRecommendations }) => (
        <div>
          {!isMultipleChaptersEdit && (
            <EditWorkTitle
              title={title}
              subtitle={subtitle}
              workId={workId}
              queryToken={queryToken}
              recommended={showRecommendations}
              withEdition={false}
            />
          )}
          <EditLicense
            workId={workId}
            queryToken={queryToken}
            license={license}
            copyrightHolder={copyrightHolder}
            onUpdate={onLicenseUpdate}
          />
          {!isMultipleChaptersEdit && (
            <EditDoi workId={workId} queryToken={queryToken} recommended={showRecommendations} isChapter />
          )}
        </div>
      )}
    </RecommendedSection>
  );
};

export default EditChapterBasicDetails;
