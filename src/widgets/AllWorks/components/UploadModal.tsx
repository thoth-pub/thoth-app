'use client';

import PreviewIcon from '@mui/icons-material/Preview';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';

import { Stepper, Step, StepLabel } from '@/src/shared/ui';
import { useState } from 'react';
import { TemplateStep } from './TemplateStep';
import { PreviewStep } from './PreviewStep';
import { UploadStep } from './UploadStep';
import FullScreenModal from '@/src/features/layout/FullScreenModal/FullScreenModal';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import { FormFieldOption } from '@/src/shared';

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
  isOpen: boolean;
  onClose: () => void;
};

export const UploadModal = (props: UploadModalProps) => {
  const { imprintsOptions, isOpen, onClose } = props;

  const [data, setData] = useState<WorkEntity[]>([]);

  return (
    <FullScreenModal title="Upload Multiple Books" isOpen={isOpen} isSubmitHidden onClose={onClose}>
      <ContentSection>
        <Stepper activeStep={0} alternativeLabel>
          {steps.map((step) => (
            <Step key={step.label}>
              <StepLabel icon={step.icon}>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <TemplateStep />
      </ContentSection>

      <UploadStep imprintsOptions={imprintsOptions} />

      {data.length > 0 && (
        <ContentSection>
          <PreviewStep />
        </ContentSection>
      )}
    </FullScreenModal>
  );
};
