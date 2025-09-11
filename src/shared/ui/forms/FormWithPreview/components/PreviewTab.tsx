'use client';

import type { ReactNode } from 'react';

import { Typography } from '@/src/shared/ui';
import { isUrl } from '@/src/shared/utils';

import { AnimationWrapper } from './AnimationWrapper';

type PreviewTabProps = {
  value: string;
  isValueHighlighted: boolean;
  preview: ReactNode;
  children?: ReactNode;
  onEdit: () => void;
};

const PreviewTab = ({ value, preview, children, isValueHighlighted, onEdit }: PreviewTabProps) => {
  const isUrlValue = isUrl(value);

  return (
    <AnimationWrapper className="flex hover:[&>button>span>svg]:opacity-100" key="view-mode" onDoubleClick={onEdit}>
      {children}
      {preview ? (
        preview
      ) : (
        <Typography
          variant="button"
          color={isValueHighlighted ? 'success' : 'primary'}
          className={isUrlValue ? 'lowercase' : 'capitalize'}
        >
          {value.toLowerCase()}
        </Typography>
      )}
    </AnimationWrapper>
  );
};

export default PreviewTab;
