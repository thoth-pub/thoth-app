'use client';

import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import { AnimatePresence } from 'motion/react';
import { type ReactNode, useState } from 'react';

import { IconButton } from '@/components';

import { AnimationWrapper } from './AnimationWrapper';

type FormFieldWithPreviewProps = {
  formField: Readonly<ReactNode>;
  preview: Readonly<ReactNode>;
  icon?: Readonly<ReactNode>;
  isDisabled?: boolean;
};

export const FormFieldWithPreview = (props: FormFieldWithPreviewProps) => {
  const { formField, preview, icon, isDisabled = false } = props;
  const [isInEditState, setIsInEditState] = useState(false);

  const switchEditState = () => {
    setIsInEditState(!isInEditState);
  };

  return (
    <AnimatePresence initial={false} mode="wait">
      {!isInEditState && (
        <AnimationWrapper className="flex grow" key="view-mode" onDoubleClick={switchEditState}>
          {
            <IconButton
              onClick={switchEditState}
              size="small"
              className="mr-2 opacity-0 transition duration-300 ease-in-out"
            >
              {icon ? icon : <EditIcon fontSize="small" />}
            </IconButton>
          }
          {preview}
        </AnimationWrapper>
      )}
      {isInEditState && (
        <div className="flex flex-grow flex-col">
          <AnimationWrapper className="flex grow flex-col" key="edit-mode">
            <div className="flex gap-1">
              {formField}
              <div className="flex gap-1">
                <IconButton
                  disabled={isDisabled}
                  onClick={switchEditState}
                  sx={{
                    backgroundColor: 'var(--color-icon-button-medium-background)',
                    color: 'var(--color-icon-button-medium-text)',
                    borderRadius: '5px',
                    '&:hover': {
                      backgroundColor: 'var(--color-icon-button-medium-background)',
                      opacity: '0.75',
                    },
                  }}
                >
                  <CheckIcon />
                </IconButton>
                <IconButton>
                  <InfoOutlineIcon />
                </IconButton>
              </div>
            </div>
          </AnimationWrapper>
        </div>
      )}
    </AnimatePresence>
  );
};
