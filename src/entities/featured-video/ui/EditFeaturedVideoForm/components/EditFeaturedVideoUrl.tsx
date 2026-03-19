'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { prettifyUrlPreview } from '@/src/shared/utils';

import { featuredVideoUrlValidationSchema } from '../../../model/featured-video.validation';

const { FEATURED_VIDEO_URL } = FORM_FIELDS;
const { FEATURED_VIDEO_URL: FEATURED_VIDEO_URL_HELPER_TEXT } = HELPER_TEXT;

type EditFeaturedVideoUrlProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditFeaturedVideoUrl = (props: EditFeaturedVideoUrlProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.FEATURED_VIDEO_URL}
      borderTransparent
      isTableVariant
      validationSchema={featuredVideoUrlValidationSchema}
      defaultValues={{ [FEATURED_VIDEO_URL.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.url)}
      faq={FEATURED_VIDEO_URL_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={FEATURED_VIDEO_URL.label} id={FEATURED_VIDEO_URL.name} />
          <FormTextField control={control} name={FEATURED_VIDEO_URL.name} id={FEATURED_VIDEO_URL.name} isUrlField />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={FEATURED_VIDEO_URL.label}
          value={prettifyUrlPreview(data?.url)}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
