'use client';

import DownloadIcon from '@mui/icons-material/Download';
import PreviewIcon from '@mui/icons-material/Preview';
import UploadIcon from '@mui/icons-material/Upload';
import { useRouter } from 'next/navigation';
import { Activity, useState } from 'react';

import FullScreenModal from '@/src/features/layout/FullScreenModal/FullScreenModal';
import { ROUTES } from '@/src/shared/constants';
import type { ImportIssue, ImportPlan, ImportSource } from '@/src/shared/types';
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
  // Importer type and filename, held only so the running display and the failure report can name
  // the file. Null until a file has been parsed; carries no file contents and never reaches the API.
  const [source, setSource] = useState<ImportSource | null>(null);
  // True only while a bulk import is actually running. It is what locks the modal's exits: an
  // import runs in this tab and is not atomic, so it must not be dismissed out from under itself.
  const [isImporting, setIsImporting] = useState(false);

  const isDataEmpty = plan.works.length === 0 && plan.chapters.length === 0;

  const handlePreview = (plan: ImportPlan, warnings: ImportIssue[], source: ImportSource) => {
    setPlan(plan);
    setWarnings(warnings);
    setSource(source);
  };

  const resetData = () => {
    setPlan(createEmptyImportPlan());
    setWarnings([]);
    setSource(null);
  };

  const handleSubmit = () => {
    onClose();

    if (isDataEmpty) return;

    resetData();

    router.push(ROUTES.WORKS);
  };

  const closeModal = () => {
    // While a run is in flight the modal cannot be dismissed, so this never fires mid-import; the
    // guard keeps that true even if a future caller wires a close path that ignores it.
    if (isImporting) return;

    onClose();
    resetData();
  };

  return (
    <FullScreenModal
      title={<TranslatedContent content="bulk upload" />}
      isOpen={isOpen}
      isSubmitHidden
      isDismissible={!isImporting}
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
          <PreviewStep
            plan={plan}
            warnings={warnings}
            source={source}
            onSubmit={handleSubmit}
            onRunningChange={setIsImporting}
          />
        </Activity>
      </ContentSection>
    </FullScreenModal>
  );
};
