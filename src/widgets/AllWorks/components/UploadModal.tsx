'use client';

import DoneIcon from '@mui/icons-material/Done';
import PreviewIcon from '@mui/icons-material/Preview';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';

import { Button, ModalWrapper, Modal, Typography, Stepper, Step, StepLabel, CloseButton } from '@/src/shared/ui';
import { useState } from 'react';
import { TemplateStep } from './TemplateStep';
import { PreviewStep } from './PreviewStep';
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

export const UploadModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const handleModalState = () => {
    setIsOpen((prev) => !prev);
  };

  const handleNextStep = () => {
    const nextStepNumber = activeStep + 1;

    if (nextStepNumber > steps.length) return;

    setActiveStep(nextStepNumber);
  };

  const handlePreviousStep = () => {
    const previousStepNumber = activeStep - 1;

    if (previousStepNumber < 0) return;

    setActiveStep(previousStepNumber);
  };

  return (
    <>
      <Button onClick={handleModalState} variant="contained" startIcon={<UploadIcon />}>
        Upload Books
      </Button>
      <Modal open={isOpen} onClose={handleModalState}>
        <div className="flex h-full items-center justify-center">
          <div className="m-auto flex max-h-160 w-full max-w-225 flex-col gap-4 overflow-auto rounded-xl bg-[var(--color-modal-background)] p-4 lg:gap-8 lg:rounded-2xl lg:p-8">
            <div className="flex items-center justify-between">
              <Typography variant="h2">Upload Multiple Books</Typography>
              <CloseButton onClose={handleModalState} />
            </div>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel icon={index <= activeStep - 1 ? <DoneIcon color="primary" /> : step.icon}>
                    {step.label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
            {activeStep === 0 && <TemplateStep onTemplateSelect={handleNextStep} onSkip={handleNextStep} />}
            {activeStep === 1 && <UploadStep onPreviousStep={handlePreviousStep} onNextStep={handleNextStep} />}
            {activeStep === 2 && <PreviewStep onPreviousStep={handlePreviousStep} />}
          </div>
        </div>
      </Modal>
    </>
  );
};
