'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { featuredVideoTitleValidationSchema } from '../../../model/featured-video.validation';

const { FEATURED_VIDEO_TITLE } = FORM_FIELDS;
const { FEATURED_VIDEO_TITLE: FEATURED_VIDEO_TITLE_HELPER_TEXT } = HELPER_TEXT;

type EditFeaturedVideoTitleProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditFeaturedVideoTitle = (props: EditFeaturedVideoTitleProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.FEATURED_VIDEO_TITLE}
      borderTransparent
      isTableVariant
      validationSchema={featuredVideoTitleValidationSchema}
      defaultValues={{ [FEATURED_VIDEO_TITLE.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.title)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={FEATURED_VIDEO_TITLE.label} id={FEATURED_VIDEO_TITLE.name} />
          <FormTextField
            control={control}
            name={FEATURED_VIDEO_TITLE.name}
            id={FEATURED_VIDEO_TITLE.name}
            helperText={FEATURED_VIDEO_TITLE_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={FEATURED_VIDEO_TITLE.label} value={data?.title} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
