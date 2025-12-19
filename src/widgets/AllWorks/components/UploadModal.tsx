'use client';

import DownloadIcon from '@mui/icons-material/Download';
import PreviewIcon from '@mui/icons-material/Preview';
import UploadIcon from '@mui/icons-material/Upload';
import { useState } from 'react';

import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import FullScreenModal from '@/src/features/layout/FullScreenModal/FullScreenModal';
import { FormFieldOption } from '@/src/shared';
import { Step, StepLabel, Stepper } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

import { PreviewStep } from './PreviewStep';
import { TemplateStep } from './TemplateStep';
import { UploadStep } from './UploadStep';

const steps = [
  {
    label: 'Select template',
    icon: <DownloadIcon color="primary" fontSize="small" />,
  },
  {
    label: 'Upload data',
    icon: <UploadIcon color="primary" fontSize="small" />,
  },
  {
    label: 'Preview',
    icon: <PreviewIcon color="primary" fontSize="small" />,
  },
];

type UploadModalProps = {
  imprintsOptions: FormFieldOption[];
  serieses: SeriesEntity[];
  isOpen: boolean;
  onClose: () => void;
};

export const UploadModal = (props: UploadModalProps) => {
  const { imprintsOptions, serieses, isOpen, onClose } = props;

  const [data] = useState<WorkEntity[]>([]);

  return (
    <FullScreenModal title="Bulk Upload" isOpen={isOpen} isSubmitHidden onClose={onClose}>
      <ContentSection>
        <Stepper activeStep={0} alternativeLabel>
          {steps.map((step) => (
            <Step key={step.label}>
              <StepLabel icon={step.icon}>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <TemplateStep />
        <UploadStep imprintsOptions={imprintsOptions} serieses={serieses} onSubmit={onClose} />
      </ContentSection>

      {data.length > 0 && (
        <ContentSection>
          <PreviewStep />
        </ContentSection>
      )}
    </FullScreenModal>
  );
};
