'use client';

import { EditButton, FormAnimationWrapper, FormFieldWrapper, MarkdownPreview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';

import { LanguagesList } from './LanguagesList';

type PreviewProps = {
  isHighlighted: boolean;
  title: string;
  list: string[];
  onEdit: () => void;
};

export const Preview = ({ isHighlighted, title, list, onEdit }: PreviewProps) => {
  return (
    <FormAnimationWrapper key="preview-mode">
      <FormFieldWrapper>
        <FormFieldLabel label="Main Title" isHighlighted={isHighlighted} />
        <div>
          <div className="flex" onDoubleClick={onEdit}>
            <EditButton isEmpty={!title} isValueHighlighted={isHighlighted} placeholder="Add Title" onEdit={onEdit} />
            {title && <MarkdownPreview source={title} isHighlighted={isHighlighted} />}
          </div>
          <LanguagesList list={list} />
        </div>
      </FormFieldWrapper>
    </FormAnimationWrapper>
  );
};
