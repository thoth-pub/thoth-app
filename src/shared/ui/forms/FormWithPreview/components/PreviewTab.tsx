'use client';

import type { ReactNode } from 'react';

import { Typography } from '@/src/shared/ui';
import { isUrl } from '@/src/shared/utils';

import FormFieldAnimationWrapper from '../../FormAnimationWrapper/FormAnimationWrapper';

type PreviewTabProps = {
  value: string;
  preview: ReactNode;
  children?: ReactNode;
  onEdit: () => void;
};

const PreviewTab = ({ value, preview, children, onEdit }: PreviewTabProps) => {
  const isUrlValue = isUrl(value);

  return (
    <FormFieldAnimationWrapper
      className="flex hover:[&>button>span>svg]:opacity-100"
      key="view-mode"
      onDoubleClick={onEdit}
    >
      {children}
      {preview ? (
        preview
      ) : (
        <Typography variant="button" className={isUrlValue ? 'lowercase' : 'capitalize'}>
          {value.toLowerCase()}
        </Typography>
      )}
    </FormFieldAnimationWrapper>
  );
};

export default PreviewTab;
