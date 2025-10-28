'use client';

import type { Control } from 'react-hook-form';

import { convertOptionToString, FormFieldOption, IDs, SeriesType } from '@/src/shared';
import { FORM_FIELDS, seriesTypeOptions } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type {
  SeriesDescriptionFormType,
  SeriesImprintFormType,
  SeriesIssnFormType,
  SeriesNameFormType,
  SeriesType as TSeriesType,
  SeriesTypeFormType,
  SeriesUrlFormType,
} from '../../model/series.types';
import {
  seriesDescriptionValidation,
  seriesImprintValidation,
  seriesIssnValidation,
  seriesNameValidation,
  seriesTypeValidationSchema,
  seriesUrlValidation,
} from '../../model/series.validation';

const {
  SERIES_TYPE,
  SERIES_NAME,
  SERIES_ISSN_PRINT,
  SERIES_ISSN_DIGITAL,
  SERIES_IMPRINT,
  SERIES_URL,
  SERIES_DESCRIPTION,
} = FORM_FIELDS;

type EditSeriesFormProps = {
  imprintOptions: FormFieldOption[];
  type?: TSeriesType;
  name?: string;
  issnPrint?: string;
  issnDigital?: string;
  url?: string;
  imprint?: string;
  description?: string;
  isTableVariant?: boolean;
  borderTransparent?: boolean;
  onTypeChange: (type: SeriesTypeFormType) => void;
  onUrlChange: (url: SeriesUrlFormType) => void;
  onNameChange: (name: SeriesNameFormType) => void;
  onIssnChange: (data: SeriesIssnFormType) => void;
  onImprintChange: (data: SeriesImprintFormType) => void;
  onDescriptionChange: (description: SeriesDescriptionFormType) => void;
};

const EditSeriesForm = ({
  imprintOptions,
  type = SeriesType.enum.BookSeries,
  name = '',
  issnPrint = '',
  issnDigital = '',
  url = '',
  imprint = '',
  description = '',
  isTableVariant = false,
  borderTransparent = false,
  onUrlChange,
  onTypeChange,
  onNameChange,
  onIssnChange,
  onImprintChange,
  onDescriptionChange,
}: EditSeriesFormProps) => {
  return (
    <div className="flex flex-col gap-2">
      <EditableContent
        formId={IDs.SERIES_NAME}
        validationSchema={seriesNameValidation}
        defaultValues={{ [SERIES_NAME.name]: name }}
        onSubmit={onNameChange}
        isTableVariant={isTableVariant}
        borderTransparent={borderTransparent}
        formFields={({ control }) => (
          <ContentWrapper>
            <FormFieldLabel label={SERIES_NAME.label} id={SERIES_NAME.name} />
            <FormTextField
              control={control as unknown as Control<SeriesNameFormType>}
              name={SERIES_NAME.name}
              id={SERIES_NAME.name}
              placeholder={SERIES_NAME.placeholder}
            />
          </ContentWrapper>
        )}
        preview={({ onEdit }) => <Preview label={SERIES_NAME.label} onEdit={onEdit} value={name} />}
      />

      <EditableContent
        formId={IDs.SERIES_TYPE}
        validationSchema={seriesTypeValidationSchema}
        defaultValues={{ [SERIES_TYPE.name]: type }}
        onSubmit={onTypeChange}
        isTableVariant={isTableVariant}
        borderTransparent={borderTransparent}
        formFields={({ control }) => (
          <ContentWrapper>
            <FormFieldLabel label={SERIES_TYPE.label} id={SERIES_TYPE.name} />
            <FormTextField
              control={control as unknown as Control<SeriesTypeFormType>}
              name={SERIES_TYPE.name}
              id={SERIES_TYPE.name}
              select
              options={seriesTypeOptions}
            />
          </ContentWrapper>
        )}
        preview={({ onEdit }) => (
          <Preview label={SERIES_TYPE.label} onEdit={onEdit} value={convertOptionToString(type)} />
        )}
      />

      <EditableContent
        formId={IDs.SERIES_IMPRINT}
        validationSchema={seriesImprintValidation}
        defaultValues={{ [SERIES_IMPRINT.name]: imprint }}
        onSubmit={onImprintChange}
        isTableVariant={isTableVariant}
        borderTransparent={borderTransparent}
        formFields={({ control }) => (
          <ContentWrapper>
            <FormFieldLabel label={SERIES_IMPRINT.label} id={SERIES_IMPRINT.name} />
            <FormTextField
              control={control as unknown as Control<SeriesImprintFormType>}
              name={SERIES_IMPRINT.name}
              id={SERIES_IMPRINT.name}
              select
              options={imprintOptions}
            />
          </ContentWrapper>
        )}
        preview={({ onEdit }) => <Preview label={SERIES_IMPRINT.label} onEdit={onEdit} value={imprint} />}
      />

      <EditableContent
        formId={IDs.SERIES_ISSN_PRINT}
        validationSchema={seriesIssnValidation}
        defaultValues={{ [SERIES_ISSN_PRINT.name]: issnPrint, [SERIES_ISSN_DIGITAL.name]: issnDigital }}
        onSubmit={onIssnChange}
        isTableVariant={isTableVariant}
        borderTransparent={borderTransparent}
        formFields={({ control }) => (
          <ContentWrapper>
            <FormFieldLabel label="ISSN" id={SERIES_ISSN_PRINT.name} />
            <div className="flex flex-col gap-2 lg:flex-row">
              <FormTextField
                control={control as unknown as Control<SeriesIssnFormType>}
                name={SERIES_ISSN_PRINT.name}
                id={SERIES_ISSN_PRINT.name}
                placeholder={SERIES_ISSN_PRINT.placeholder}
                fullWidth
              />
              <FormTextField
                control={control as unknown as Control<SeriesIssnFormType>}
                name={SERIES_ISSN_DIGITAL.name}
                id={SERIES_ISSN_DIGITAL.name}
                placeholder={SERIES_ISSN_DIGITAL.placeholder}
                fullWidth
              />
            </div>
          </ContentWrapper>
        )}
        preview={({ onEdit }) => <Preview label="ISSN" onEdit={onEdit} value={issnPrint ?? issnDigital ?? ''} />}
      />

      <EditableContent
        formId={IDs.SERIES_URL}
        validationSchema={seriesUrlValidation}
        defaultValues={{ [SERIES_URL.name]: url }}
        onSubmit={onUrlChange}
        isTableVariant={isTableVariant}
        borderTransparent={borderTransparent}
        formFields={({ control }) => (
          <ContentWrapper>
            <FormFieldLabel label={SERIES_URL.label} id={SERIES_URL.name} />
            <FormTextField
              control={control as unknown as Control<SeriesUrlFormType>}
              name={SERIES_URL.name}
              id={SERIES_URL.name}
              placeholder={SERIES_URL.placeholder}
              isUrlField
            />
          </ContentWrapper>
        )}
        preview={({ onEdit }) => <Preview label={SERIES_URL.label} onEdit={onEdit} value={url ?? ''} />}
      />

      <EditableContent
        formId={IDs.SERIES_DESCRIPTION}
        validationSchema={seriesDescriptionValidation}
        defaultValues={{ [SERIES_DESCRIPTION.name]: description }}
        onSubmit={onDescriptionChange}
        isTableVariant={isTableVariant}
        borderTransparent={borderTransparent}
        formFields={({ control }) => (
          <ContentWrapper>
            <FormFieldLabel
              label={SERIES_DESCRIPTION.label}
              id={SERIES_DESCRIPTION.name}
              className="mt-2 self-start lg:mt-4"
            />
            <FormTextField
              control={control as unknown as Control<SeriesDescriptionFormType>}
              name={SERIES_DESCRIPTION.name}
              id={SERIES_DESCRIPTION.name}
              placeholder={SERIES_DESCRIPTION.placeholder}
              multiline
              maxRows={4}
              sx={{
                '& .MuiInputBase-root': {
                  minHeight: '7.5rem',
                },
                '& .MuiInputBase-input.MuiOutlinedInput-input': {
                  height: '100% !important',
                },
              }}
            />
          </ContentWrapper>
        )}
        preview={({ onEdit }) => <Preview label={SERIES_DESCRIPTION.label} onEdit={onEdit} value={description} />}
      />
    </div>
  );
};

export default EditSeriesForm;
