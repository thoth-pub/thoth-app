'use client';

import { type ReactNode } from 'react';

import FormAnimationWrapper from '../../FormAnimationWrapper/FormAnimationWrapper';
import FormControlGroup from '../../FormControlGroup/FormControlGroup';
import FormFieldWithControlsWrapper from '../../FormFieldWithControlsWrapper/FormFieldWithControlsWrapper';

type EditTabProps = {
  isDisabled: boolean;
  children: ReactNode;
  formId?: string;
  onSubmit?: () => void;
};

const EditTab = ({ isDisabled, children, formId, onSubmit }: EditTabProps) => {
  return (
    <div className="ml-[1.25rem] flex flex-grow flex-col">
      <FormAnimationWrapper className="flex grow flex-col" key="edit-mode">
        <form onSubmit={onSubmit} id={formId}>
          <FormFieldWithControlsWrapper>
            {children}
            <FormControlGroup isDisabled={isDisabled} formId={formId} />
          </FormFieldWithControlsWrapper>
        </form>
      </FormAnimationWrapper>
    </div>
  );
};

export default EditTab;
