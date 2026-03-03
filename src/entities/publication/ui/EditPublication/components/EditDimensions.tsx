import { useMemo } from 'react';

import { FORM_FIELDS, HELPER_TEXT, IDs, WeightUnit } from '@/src/shared/constants';
import { MultipleContentWrapper, Preview, TranslatedContent, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { PublicationDimensionsForm } from '../../../model/publication.types';
import { dimensionsValidationSchema } from '../../../model/publication.validation';
import { DimensionsFormField } from './DimensionsFormField';

type EditSizesProps = {
  width: number;
  widthIn: number;
  height: number;
  heightIn: number;
  depth: number;
  depthIn: number;
  weight: number;
  weightOz: number;
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
  const { width, height, depth, weight, widthIn, heightIn, depthIn, weightOz, onSubmit } = props;

  const handleSubmit = (data: PublicationDimensionsForm) => {
    onSubmit?.(data);
  };

  const placeholderValues = useMemo(() => {
    const geometryPlaceholderValues = [];
    const imperialGeometryPlaceholderValues = [];
    const weightPlaceholderValues = [];
    const imperialWeightPlaceholderValues = [];

    if (width > 0) {
      geometryPlaceholderValues.push(`${width} mm`);
    }

    if (widthIn > 0) {
      imperialGeometryPlaceholderValues.push(`${widthIn} in`);
    }

    if (height > 0) {
      geometryPlaceholderValues.push(`${height} mm`);
    }

    if (heightIn > 0) {
      imperialGeometryPlaceholderValues.push(`${heightIn} in`);
    }

    if (depth > 0) {
      geometryPlaceholderValues.push(`${depth} mm`);
    }

    if (depthIn > 0) {
      imperialGeometryPlaceholderValues.push(`${depthIn} in`);
    }

    if (weight > 0) {
      weightPlaceholderValues.push(`${weight} ${WeightUnit.enum.G}`);
    }

    if (weightOz > 0) {
      imperialWeightPlaceholderValues.push(`${weightOz} ${WeightUnit.enum.Oz}`);
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
  }, [width, height, depth, weight, widthIn, heightIn, depthIn, weightOz]);

  return (
    <EditableContent
      isTableVariant
      formId={IDs.PUBLICATION_SIZES}
      borderTransparent
      defaultValues={{
        [PUBLICATION_WIDTH_MM.name]: width,
        [PUBLICATION_WIDTH_IN.name]: widthIn,
        [PUBLICATION_HEIGHT_MM.name]: height,
        [PUBLICATION_HEIGHT_IN.name]: heightIn,
        [PUBLICATION_DEPTH_MM.name]: depth,
        [PUBLICATION_DEPTH_IN.name]: depthIn,
        [PUBLICATION_WEIGHT_G.name]: weight,
        [PUBLICATION_WEIGHT_OZ.name]: weightOz,
      }}
      validationSchema={dimensionsValidationSchema}
      onSubmit={handleSubmit}
      formFields={({ control, isHelperTextVisible, setValue }) => (
        <MultipleContentWrapper>
          <div className="grid grid-cols-[1fr_1fr] border-b border-(--color-table-border) pb-2 lg:pl-45">
            <Typography>
              <TranslatedContent content="metric" />
            </Typography>
            <Typography className="pl-6">
              <TranslatedContent content="imperial" />
            </Typography>
          </div>

          <DimensionsFormField
            control={control}
            metricFieldName={PUBLICATION_WIDTH_MM.name}
            imperialFieldName={PUBLICATION_WIDTH_IN.name}
            label={PUBLICATION_WIDTH_MM.label}
            isHelperTextVisible={isHelperTextVisible}
            helperText={PUBLICATION_WIDTH_HELPER_TEXT}
            onAutoConvert={setValue}
          />

          <DimensionsFormField
            control={control}
            metricFieldName={PUBLICATION_HEIGHT_MM.name}
            imperialFieldName={PUBLICATION_HEIGHT_IN.name}
            label={PUBLICATION_HEIGHT_MM.label}
            isHelperTextVisible={isHelperTextVisible}
            helperText={PUBLICATION_HEIGHT_HELPER_TEXT}
            onAutoConvert={setValue}
          />

          <DimensionsFormField
            control={control}
            metricFieldName={PUBLICATION_DEPTH_MM.name}
            imperialFieldName={PUBLICATION_DEPTH_IN.name}
            label={PUBLICATION_DEPTH_MM.label}
            isHelperTextVisible={isHelperTextVisible}
            helperText={PUBLICATION_DEPTH_HELPER_TEXT}
            onAutoConvert={setValue}
          />

          <DimensionsFormField
            control={control}
            metricFieldName={PUBLICATION_WEIGHT_G.name}
            imperialFieldName={PUBLICATION_WEIGHT_OZ.name}
            label={PUBLICATION_WEIGHT_G.label}
            isHelperTextVisible={isHelperTextVisible}
            helperText={PUBLICATION_WEIGHT_HELPER_TEXT}
            measurementUnit={WeightUnit.enum.G}
            onAutoConvert={setValue}
          />
        </MultipleContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview label={PUBLICATION_DIMENSIONS.label} value={placeholderValues} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
