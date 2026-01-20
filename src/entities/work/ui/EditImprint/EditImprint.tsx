'use client';

import { useWork } from '@/src/entities/work';
import { ImprintForm } from '@/src/entities/work/model/work.types';
import { imprintValidationSchema } from '@/src/entities/work/model/work.validation';
import { type BaseRecommendedSectionProps, type FormFieldOption, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormTextField, MultipleContentWrapper, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

type EditImprintProps = {
  imprintOptions: FormFieldOption[];
} & BaseRecommendedSectionProps;

const { IMPRINT, PLACE } = FORM_FIELDS;

export const EditImprint = ({ workId, imprintOptions, recommended = false }: EditImprintProps) => {
  const { work, updateWork } = useWork(workId);

  const value = work?.publisherName ?? '';
  const placeValue = work?.place ?? '';
  const showIndicator = recommended && !value;

  const placeholder = placeValue.length > 0 ? `${placeValue} ${value}` : value;

  const updateImprint = ({ imprintId, place }: ImprintForm) => {
    updateWork({ ...work, imprintId, place: place ?? '' });
  };

  return (
    <EditableContent
      formId={IDs.WORK_IMPRINT}
      defaultValues={{ [IMPRINT.name]: work.imprintId, [PLACE.name]: work.place }}
      validationSchema={imprintValidationSchema}
      onSubmit={updateImprint}
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
            />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={IMPRINT.label}
          value={placeholder}
          recommended={showIndicator}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditImprint;
