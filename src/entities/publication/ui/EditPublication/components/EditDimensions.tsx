import { useMemo } from 'react';

import { convertMmToIn, convertOzToG, HELPER_TEXT, IDs, WeightUnit } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { MultipleContentWrapper, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { PublicationDimensionsForm } from '../../../model/publication.types';
import { dimensionsValidationSchema } from '../../../model/publication.validation';
import { DimensionsFormField } from './DimensionsFormField';

type EditSizesProps = {
  recommended: boolean;
  width: number;
  height: number;
  depth: number;
  weight: number;
  onSubmit?: (data: PublicationDimensionsForm) => void;
};

const {
  PUBLICATION_WIDTH_MM,
  PUBLICATION_WIDTH_IN,
  PUBLICATION_HEIGHT_MM,
  PUBLICATION_HEIGHT_IN,
  PUBLICATION_DEPTH_MM,
  PUBLICATION_DEPTH_IN,
  PUBLICATION_WEIGHT_G,
  PUBLICATION_WEIGHT_OZ,
  PUBLICATION_DIMENSIONS,
} = FORM_FIELDS;

const {
  PUBLICATION_WIDTH: PUBLICATION_WIDTH_HELPER_TEXT,
  PUBLICATION_HEIGHT: PUBLICATION_HEIGHT_HELPER_TEXT,
  PUBLICATION_DEPTH: PUBLICATION_DEPTH_HELPER_TEXT,
  PUBLICATION_WEIGHT: PUBLICATION_WEIGHT_HELPER_TEXT,
} = HELPER_TEXT;

export const EditDimensions = (props: EditSizesProps) => {
  const { width, height, depth, weight, recommended = false, onSubmit } = props;

  const showWidthIndicator = recommended && width > 0;
  const showHeightIndicator = recommended && height > 0;
  const showDepthIndicator = recommended && depth > 0;
  const showWeightIndicator = recommended && weight > 0;

  const showIndicator = showWidthIndicator || showHeightIndicator || showDepthIndicator || showWeightIndicator;

  const handleSubmit = (data: PublicationDimensionsForm) => {
    onSubmit?.(data);
  };

  const placeholderValues = useMemo(() => {
    const geometryPlaceholderValues = [];
    const imperialGeometryPlaceholderValues = [];
    const weightPlaceholderValues = [];
    const imperialWeightPlaceholderValues = [];

    const roundImperialValue = (value: number) => {
      return value.toFixed(2);
    };

    if (width > 0) {
      geometryPlaceholderValues.push(`${width} mm`);
      imperialGeometryPlaceholderValues.push(`${roundImperialValue(convertMmToIn(width))} in`);
    }

    if (height > 0) {
      geometryPlaceholderValues.push(`${height} mm`);
      imperialGeometryPlaceholderValues.push(`${roundImperialValue(convertMmToIn(height))} in`);
    }

    if (depth > 0) {
      geometryPlaceholderValues.push(`${depth} mm`);
      imperialGeometryPlaceholderValues.push(`${roundImperialValue(convertMmToIn(depth))} in`);
    }

    if (weight > 0) {
      weightPlaceholderValues.push(`${weight} ${WeightUnit.enum.G}`);
      imperialWeightPlaceholderValues.push(`${roundImperialValue(convertOzToG(weight))} ${WeightUnit.enum.Oz}`);
    }

    const geometryPlaceholderValue = geometryPlaceholderValues.join(' x ');
    const imperialGeometryPlaceholderValue = imperialGeometryPlaceholderValues.join(' x ');
    const weightPlaceholderValue = weightPlaceholderValues.join(' x ');
    const imperialWeightPlaceholderValue = imperialWeightPlaceholderValues.join(' x ');

    return [
      geometryPlaceholderValue,
      imperialGeometryPlaceholderValue,
      weightPlaceholderValue,
      imperialWeightPlaceholderValue,
    ]
      .filter((value) => value)
      .join(' | ')
      .toLowerCase();
  }, [width, height, depth, weight]);

  return (
    <EditableContent
      isTableVariant
      formId={IDs.PUBLICATION_SIZES}
      borderTransparent
      defaultValues={{
        [PUBLICATION_WIDTH_MM.name]: width,
        [PUBLICATION_WIDTH_IN.name]: convertMmToIn(width),
        [PUBLICATION_HEIGHT_MM.name]: height,
        [PUBLICATION_HEIGHT_IN.name]: convertMmToIn(height),
        [PUBLICATION_DEPTH_MM.name]: depth,
        [PUBLICATION_DEPTH_IN.name]: convertMmToIn(depth),
        [PUBLICATION_WEIGHT_G.name]: weight,
        [PUBLICATION_WEIGHT_OZ.name]: convertOzToG(weight),
      }}
      validationSchema={dimensionsValidationSchema}
      onSubmit={handleSubmit}
      formFields={({ control, isHelperTextVisible, setValue }) => (
        <MultipleContentWrapper>
          <div className="grid max-w-max grid-cols-[16.5rem_16.5rem] border-b border-[var(--color-table-border)] pb-2 pl-[11.25rem]">
            <Typography>Metric</Typography>
            <Typography className="pl-6">Imperial</Typography>
          </div>

          <DimensionsFormField
            control={control}
            metricFieldName={PUBLICATION_WIDTH_MM.name}
            imperialFieldName={PUBLICATION_WIDTH_IN.name}
            label={PUBLICATION_WIDTH_MM.label}
            recommended={showWidthIndicator}
            isHelperTextVisible={isHelperTextVisible}
            helperText={PUBLICATION_WIDTH_HELPER_TEXT}
            onAutoConvert={setValue}
          />

          <DimensionsFormField
            control={control}
            metricFieldName={PUBLICATION_HEIGHT_MM.name}
            imperialFieldName={PUBLICATION_HEIGHT_IN.name}
            label={PUBLICATION_HEIGHT_MM.label}
            recommended={showHeightIndicator}
            isHelperTextVisible={isHelperTextVisible}
            helperText={PUBLICATION_HEIGHT_HELPER_TEXT}
            onAutoConvert={setValue}
          />

          <DimensionsFormField
            control={control}
            metricFieldName={PUBLICATION_DEPTH_MM.name}
            imperialFieldName={PUBLICATION_DEPTH_IN.name}
            label={PUBLICATION_DEPTH_MM.label}
            recommended={showDepthIndicator}
            isHelperTextVisible={isHelperTextVisible}
            helperText={PUBLICATION_DEPTH_HELPER_TEXT}
            onAutoConvert={setValue}
          />

          <DimensionsFormField
            control={control}
            metricFieldName={PUBLICATION_WEIGHT_G.name}
            imperialFieldName={PUBLICATION_WEIGHT_OZ.name}
            label={PUBLICATION_WEIGHT_G.label}
            recommended={showWeightIndicator}
            isHelperTextVisible={isHelperTextVisible}
            helperText={PUBLICATION_WEIGHT_HELPER_TEXT}
            measurementUnit={WeightUnit.enum.G}
            onAutoConvert={setValue}
          />
        </MultipleContentWrapper>
      )}
      preview={({ onEdit }) => (
        <Preview
          recommended={showIndicator}
          label={PUBLICATION_DIMENSIONS.label}
          value={placeholderValues}
          onEdit={onEdit}
        />
      )}
    />
  );
};
