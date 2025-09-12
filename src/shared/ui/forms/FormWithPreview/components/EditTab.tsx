'use client';

import { type ReactNode } from 'react';

import FormControlGroup from '../../FormControlGroup/FormControlGroup';
import FormFieldWithControlsWrapper from '../../FormFieldWithControlsWrapper/FormFieldWithControlsWrapper';
import { AnimationWrapper } from './AnimationWrapper';

type EditTabProps = {
  isDisabled: boolean;
  children: ReactNode;
  formId?: string;
  onSubmit?: () => void;
};

const EditTab = ({ isDisabled, children, formId, onSubmit }: EditTabProps) => {
  return (
    <div className="ml-[1.25rem] flex flex-grow flex-col">
      <AnimationWrapper className="flex grow flex-col" key="edit-mode">
        <form onSubmit={onSubmit} id={formId}>
          <FormFieldWithControlsWrapper>
            {children}
            <FormControlGroup isDisabled={isDisabled} formId={formId} />
          </FormFieldWithControlsWrapper>
        </form>
      </AnimationWrapper>
    </div>
  );
};

export default EditTab;
