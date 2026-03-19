'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { featuredVideoWidthValidationSchema } from '../../../model/featured-video.validation';

const { FEATURED_VIDEO_WIDTH } = FORM_FIELDS;
const { FEATURED_VIDEO_WIDTH: FEATURED_VIDEO_WIDTH_HELPER_TEXT } = HELPER_TEXT;

type EditFeaturedVideoWidthProps = {
  defaultValue?: number;
  onUpdate?: (data: number) => void;
};

export const EditFeaturedVideoWidth = (props: EditFeaturedVideoWidthProps) => {
  const { defaultValue, onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.FEATURED_VIDEO_WIDTH}
      borderTransparent
      isTableVariant
      validationSchema={featuredVideoWidthValidationSchema}
      defaultValues={{ [FEATURED_VIDEO_WIDTH.name]: defaultValue ?? '' }}
      onSubmit={(data) => onUpdate?.(Number(data.width))}
      faq={FEATURED_VIDEO_WIDTH_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={FEATURED_VIDEO_WIDTH.label} id={FEATURED_VIDEO_WIDTH.name} />
          <FormTextField
            control={control}
            name={FEATURED_VIDEO_WIDTH.name}
            id={FEATURED_VIDEO_WIDTH.name}
            type="number"
            inputProps={{ min: 1, step: '1' }}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={FEATURED_VIDEO_WIDTH.label}
          value={data?.width ? String(data.width) : undefined}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
