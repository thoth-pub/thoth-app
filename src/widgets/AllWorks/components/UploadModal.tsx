'use client';

import DownloadIcon from '@mui/icons-material/Download';
import PreviewIcon from '@mui/icons-material/Preview';
import UploadIcon from '@mui/icons-material/Upload';
import { useRouter } from 'next/navigation';
import { Activity, useState } from 'react';

import { WorkEntity } from '@/src/entities/work/model/work.types';
import FullScreenModal from '@/src/features/layout/FullScreenModal/FullScreenModal';
import { ROUTES, SeriesForUpdateItems } from '@/src/shared';
import { Step, StepLabel, Stepper, TranslatedContent } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { PreviewStep } from './PreviewStep';
import { TemplateStep } from './TemplateStep';
import { UploadStep } from './UploadStep';

const steps = [
  {
    label: 'select template',
    icon: <DownloadIcon color="primary" fontSize="small" />,
  },
  {
    label: 'actions.upload',
    icon: <UploadIcon color="primary" fontSize="small" />,
  },
  {
    label: 'preview',
    icon: <PreviewIcon color="primary" fontSize="small" />,
  },
];

type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const UploadModal = (props: UploadModalProps) => {
  const { isOpen, onClose } = props;

  const router = useRouter();

  const [works, setWorks] = useState<WorkEntity[]>([]);
  const [chapters, setChapters] = useState<WorkEntity[]>([]);
  const [updatedSerieses, setUpdatedSerieses] = useState<SeriesForUpdateItems>({});

  const isDataEmpty = works.length === 0 && chapters.length === 0;

  const handlePreview = (works: WorkEntity[], chapters: WorkEntity[], updatedSerieses: SeriesForUpdateItems) => {
    setWorks(works);
    setChapters(chapters);
    setUpdatedSerieses(updatedSerieses);
  };

  const resetData = () => {
    setWorks([]);
    setChapters([]);
    setUpdatedSerieses({});
  };

  const handleSubmit = () => {
    onClose();

    if (isDataEmpty) return;

    resetData();

    router.push(ROUTES.WORKS);
  };

  const closeModal = () => {
    onClose();
    resetData();
  };

  return (
    <FullScreenModal
      title={<TranslatedContent content="bulk upload" />}
      isOpen={isOpen}
      isSubmitHidden
      onClose={closeModal}
    >
      <ContentSection>
        <Stepper activeStep={0} alternativeLabel>
          {steps.map((step) => (
            <Step key={step.label}>
              <StepLabel icon={step.icon} className="capitalize">
                <TranslatedContent content={step.label} />
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        <TemplateStep />
        <Activity mode={isDataEmpty ? 'visible' : 'hidden'}>
          <UploadStep onPreview={handlePreview} />
        </Activity>
        <Activity mode={!isDataEmpty ? 'visible' : 'hidden'}>
          <PreviewStep works={works} chapters={chapters} serieses={updatedSerieses} onSubmit={handleSubmit} />
        </Activity>
      </ContentSection>
    </FullScreenModal>
  );
};
