'use client';

import { useWork } from '@/src/entities/work';
import { ImprintForm } from '@/src/entities/work/model/work.types';
import { imprintValidationSchema } from '@/src/entities/work/model/work.validation';
import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import type { FormFieldOption } from '@/src/shared/interfaces';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { ContentWrapper, FormTextField, MultipleContentWrapper, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

type EditImprintProps = {
  disabled?: boolean;
  imprintOptions: FormFieldOption[];
} & BaseRecommendedSectionProps;

const { IMPRINT, PLACE } = FORM_FIELDS;

export const EditImprint = ({ disabled = true, workId, imprintOptions, recommended = false }: EditImprintProps) => {
  const { work, updateWork } = useWork(workId);

  const value = work?.publisherName ?? '';
  const placeValue = work?.place ?? '';
  const showIndicator = recommended && !value;

  const placeholder = placeValue.length > 0 ? `${placeValue}: ${value}` : value;

  const updateImprint = ({ imprintId, place }: ImprintForm) => {
    updateWork({ ...work, imprintId, place: place ?? '' });
  };

  return (
    <EditableContent
      formId={IDs.WORK_IMPRINT}
      defaultValues={{ [IMPRINT.name]: work.imprintId, [PLACE.name]: work.place }}
      validationSchema={imprintValidationSchema}
      onSubmit={updateImprint}
      isDisabled={disabled}
      formFields={({ control, isHelperTextVisible }) => (
        <MultipleContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={IMPRINT.label} id={IMPRINT.name} recommended={showIndicator} />
            <FormTextField
              control={control}
              name={IMPRINT.name}
              id={IMPRINT.name}
              select
              options={imprintOptions}
              helperText={HELPER_TEXT.IMPRINT}
              isHelperTextVisible={isHelperTextVisible}
              disabled={disabled}
            />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={PLACE.label} id={PLACE.name} recommended={showIndicator} />
            <FormTextField
              control={control}
              name={PLACE.name}
              id={PLACE.name}
              helperText={HELPER_TEXT.PLACE}
              isHelperTextVisible={isHelperTextVisible}
              disabled={disabled}
            />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ disabled: previewDisabled, onEdit }) => (
        <Preview
          label={IMPRINT.label}
          value={placeholder}
          recommended={showIndicator}
          disabled={disabled || previewDisabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditImprint;
