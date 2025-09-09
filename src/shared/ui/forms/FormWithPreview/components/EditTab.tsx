'use client';

import CheckIcon from '@mui/icons-material/Check';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import type { ReactNode } from 'react';

import { IconButton } from '@/src/shared/ui';

import { AnimationWrapper } from './AnimationWrapper';

type EditTabProps = {
  isDisabled: boolean;
  children: ReactNode;
  onClose: () => void;
};

const EditTab = ({ isDisabled, children, onClose }: EditTabProps) => {
  return (
    <div className="flex flex-grow flex-col">
      <AnimationWrapper className="flex grow flex-col" key="edit-mode">
        <form className="flex gap-1">
          {children}
          <div className="flex gap-1">
            <IconButton
              disabled={isDisabled}
              onClick={onClose}
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
        </form>
      </AnimationWrapper>
    </div>
  );
};

export default EditTab;
