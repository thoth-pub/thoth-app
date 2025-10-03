import { HELPER_TEXT, IDs, LengthUnit, WeightUnit } from '@/src/shared';
import { FORM_FIELDS, lengthUnitOptions, weightUnitOptions } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, MultipleContentWrapper, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { PublicationDimensionsForm } from '../../../model/publication.types';
import { dimensionsValidationSchema } from '../../../model/publication.validation';

type EditSizesProps = {
  width: number;
  height: number;
  depth: number;
  weight: number;
  onSubmit?: (data: PublicationDimensionsForm) => void;
};

const {
  PUBLICATION_WIDTH,
  PUBLICATION_HEIGHT,
  PUBLICATION_DEPTH,
  PUBLICATION_WEIGHT,
  PUBLICATION_DIMENSIONS,
  LENGTH_UNIT,
  WEIGHT_UNIT,
} = FORM_FIELDS;

const {
  PUBLICATION_WIDTH: PUBLICATION_WIDTH_HELPER_TEXT,
  PUBLICATION_HEIGHT: PUBLICATION_HEIGHT_HELPER_TEXT,
  PUBLICATION_DEPTH: PUBLICATION_DEPTH_HELPER_TEXT,
  PUBLICATION_WEIGHT: PUBLICATION_WEIGHT_HELPER_TEXT,
  LENGTH_UNIT: LENGTH_UNIT_HELPER_TEXT,
  WEIGHT_UNIT: WEIGHT_UNIT_HELPER_TEXT,
} = HELPER_TEXT;

export const EditDimensions = (props: EditSizesProps) => {
  const { width, height, depth, weight, onSubmit } = props;

  const handleSubmit = (data: PublicationDimensionsForm) => {
    onSubmit?.(data);
  };

  return (
    <EditableContent
      isTableVariant
      formId={IDs.PUBLICATION_SIZES}
      defaultValues={{
        [PUBLICATION_WIDTH.name]: width,
        [PUBLICATION_HEIGHT.name]: height,
        [PUBLICATION_DEPTH.name]: depth,
        [LENGTH_UNIT.name]: LengthUnit.enum.Mm,
        [WEIGHT_UNIT.name]: WeightUnit.enum.G,
        [PUBLICATION_WEIGHT.name]: weight,
      }}
      validationSchema={dimensionsValidationSchema}
      onSubmit={handleSubmit}
      formFields={({ control, isHelperTextVisible }) => (
        <MultipleContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={LENGTH_UNIT.label} id={LENGTH_UNIT.name} />
            <FormTextField
              control={control}
              name={LENGTH_UNIT.name}
              fullWidth
              select
              options={lengthUnitOptions}
              helperText={LENGTH_UNIT_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              type={LENGTH_UNIT.type}
            />
          </ContentWrapper>

          <ContentWrapper>
            <FormFieldLabel label={PUBLICATION_WIDTH.label} id={PUBLICATION_WIDTH.name} />
            <FormTextField
              control={control}
              name={PUBLICATION_WIDTH.name}
              fullWidth
              helperText={PUBLICATION_WIDTH_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              type={PUBLICATION_WIDTH.type}
              min={0}
            />
          </ContentWrapper>

          <ContentWrapper>
            <FormFieldLabel label={PUBLICATION_HEIGHT.label} id={PUBLICATION_HEIGHT.name} />
            <FormTextField
              control={control}
              name={PUBLICATION_HEIGHT.name}
              fullWidth
              helperText={PUBLICATION_HEIGHT_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              type={PUBLICATION_HEIGHT.type}
              min={0}
            />
          </ContentWrapper>

          <ContentWrapper>
            <FormFieldLabel label={PUBLICATION_DEPTH.label} id={PUBLICATION_DEPTH.name} />
            <FormTextField
              control={control}
              name={PUBLICATION_DEPTH.name}
              fullWidth
              helperText={PUBLICATION_DEPTH_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              type={PUBLICATION_DEPTH.type}
              min={0}
            />
          </ContentWrapper>

          <ContentWrapper>
            <FormFieldLabel label={WEIGHT_UNIT.label} id={WEIGHT_UNIT.name} />
            <FormTextField
              control={control}
              name={WEIGHT_UNIT.name}
              fullWidth
              select
              options={weightUnitOptions}
              helperText={WEIGHT_UNIT_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              type={WEIGHT_UNIT.type}
            />
          </ContentWrapper>

          <ContentWrapper>
            <FormFieldLabel label={PUBLICATION_WEIGHT.label} id={PUBLICATION_WEIGHT.name} />
            <FormTextField
              control={control}
              name={PUBLICATION_WEIGHT.name}
              fullWidth
              helperText={PUBLICATION_WEIGHT_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              type={PUBLICATION_WEIGHT.type}
              min={0}
            />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ data, onEdit }) => (
        <Preview label={PUBLICATION_DIMENSIONS.label} value={Object.values(data ?? {}).join(', ')} onEdit={onEdit} />
      )}
    />
  );
};
