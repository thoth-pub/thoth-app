'use client';

import DownloadIcon from '@mui/icons-material/Download';
import PreviewIcon from '@mui/icons-material/Preview';
import UploadIcon from '@mui/icons-material/Upload';
import { useRouter } from 'next/navigation';
import { Activity, useState } from 'react';

import FullScreenModal from '@/src/features/layout/FullScreenModal/FullScreenModal';
import { ROUTES } from '@/src/shared/constants';
import type { ImportIssue, ImportPlan } from '@/src/shared/types';
import { ContentSection, Step, StepLabel, Stepper, TranslatedContent } from '@/src/shared/ui';
import { createEmptyImportPlan } from '@/src/shared/utils';

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

  // One plan, held whole: it arrives already assembled from the parse and contributor-resolution
  // flow — the parser's plan with the user's contributor choices applied — and is handed to the
  // preview and then to the mutation unchanged from there on. A fresh empty plan on every reset,
  // never a shared one, so a closed upload cannot leave anything behind for the next.
  const [plan, setPlan] = useState<ImportPlan>(createEmptyImportPlan);
  // Non-blocking findings from the parse: source metadata the import cannot represent. Kept
  // beside the plan rather than in it — they describe the file, not what will be created.
  const [warnings, setWarnings] = useState<ImportIssue[]>([]);

  const isDataEmpty = plan.works.length === 0 && plan.chapters.length === 0;

  const handlePreview = (plan: ImportPlan, warnings: ImportIssue[]) => {
    setPlan(plan);
    setWarnings(warnings);
  };

  const resetData = () => {
    setPlan(createEmptyImportPlan());
    setWarnings([]);
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
          <PreviewStep plan={plan} warnings={warnings} onSubmit={handleSubmit} />
        </Activity>
      </ContentSection>
    </FullScreenModal>
  );
};
