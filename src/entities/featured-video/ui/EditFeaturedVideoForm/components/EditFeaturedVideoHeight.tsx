'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { featuredVideoHeightValidationSchema } from '../../../model/featured-video.validation';

const { FEATURED_VIDEO_HEIGHT } = FORM_FIELDS;
const { FEATURED_VIDEO_HEIGHT: FEATURED_VIDEO_HEIGHT_HELPER_TEXT } = HELPER_TEXT;

type EditFeaturedVideoHeightProps = {
  defaultValue?: number;
  onUpdate?: (data: number) => void;
};

export const EditFeaturedVideoHeight = (props: EditFeaturedVideoHeightProps) => {
  const { defaultValue, onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.FEATURED_VIDEO_HEIGHT}
      borderTransparent
      isTableVariant
      validationSchema={featuredVideoHeightValidationSchema}
      defaultValues={{ [FEATURED_VIDEO_HEIGHT.name]: defaultValue ?? '' }}
      onSubmit={(data) => onUpdate?.(Number(data.height))}
      faq={FEATURED_VIDEO_HEIGHT_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={FEATURED_VIDEO_HEIGHT.label} id={FEATURED_VIDEO_HEIGHT.name} />
          <FormTextField
            control={control}
            name={FEATURED_VIDEO_HEIGHT.name}
            id={FEATURED_VIDEO_HEIGHT.name}
            type="number"
            inputProps={{ min: 1, step: '1' }}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={FEATURED_VIDEO_HEIGHT.label}
          value={data?.height ? String(data.height) : undefined}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
