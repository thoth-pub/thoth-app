'use client';

import { FormAnimationWrapper, FormEditButton, FormFieldWrapper, MarkdownPreview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';

import { LanguagesList } from './LanguagesList';

type PreviewProps = {
  title: string;
  list: string[];
  onEdit: () => void;
};

export const Preview = ({ title, list, onEdit }: PreviewProps) => {
  return (
    <FormAnimationWrapper key="preview-mode">
      <FormFieldWrapper>
        <FormFieldLabel label="Main Title" />
        <div>
          <div className="flex" onDoubleClick={onEdit}>
            <FormEditButton isEmpty={!title} placeholder="Add Title" onEdit={onEdit} />
            {title && <MarkdownPreview source={title} />}
          </div>
          <LanguagesList list={list} />
        </div>
      </FormFieldWrapper>
    </FormAnimationWrapper>
  );
};
