'use client';

import type { Control } from 'react-hook-form';

import { convertOptionToString, FormFieldOption, HELPER_TEXT, IDs, SeriesType } from '@/src/shared';
import { FORM_FIELDS, seriesTypeOptions } from '@/src/shared/constants/formFields';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
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

const {
  SERIES_NAME: SERIES_NAME_HELPER_TEXT,
  SERIES_TYPE: SERIES_TYPE_HELPER_TEXT,
  IMPRINT: IMPRINT_HELPER_TEXT,
  ISSN: ISSN_HELPER_TEXT,
  SERIES_URL: SERIES_URL_HELPER_TEXT,
  SERIES_DESCRIPTION: SERIES_DESCRIPTION_HELPER_TEXT,
} = HELPER_TEXT;

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
        formFields={({ control, isHelperTextVisible }) => (
          <ContentWrapper>
            <FormFieldLabel label={SERIES_NAME.label} id={SERIES_NAME.name} namespace={NAMESPACES.enum.common} />
            <FormTextField
              control={control as unknown as Control<SeriesNameFormType>}
              name={SERIES_NAME.name}
              id={SERIES_NAME.name}
              placeholder={SERIES_NAME.placeholder}
              helperText={SERIES_NAME_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
            />
          </ContentWrapper>
        )}
        preview={({ disabled, onEdit }) => (
          <Preview
            label={SERIES_NAME.label}
            namespace={NAMESPACES.enum.common}
            disabled={disabled}
            onEdit={onEdit}
            value={name}
          />
        )}
      />

      <EditableContent
        formId={IDs.SERIES_TYPE}
        validationSchema={seriesTypeValidationSchema}
        defaultValues={{ [SERIES_TYPE.name]: type }}
        onSubmit={onTypeChange}
        isTableVariant={isTableVariant}
        borderTransparent={borderTransparent}
        formFields={({ control, isHelperTextVisible }) => (
          <ContentWrapper>
            <FormFieldLabel label={SERIES_TYPE.label} id={SERIES_TYPE.name} />
            <FormTextField
              control={control as unknown as Control<SeriesTypeFormType>}
              name={SERIES_TYPE.name}
              id={SERIES_TYPE.name}
              select
              options={seriesTypeOptions}
              helperText={SERIES_TYPE_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              isOptionsWithTranslations
            />
          </ContentWrapper>
        )}
        preview={({ disabled, onEdit }) => (
          <Preview
            label={SERIES_TYPE.label}
            disabled={disabled}
            onEdit={onEdit}
            value={convertOptionToString(type).toLowerCase()}
          />
        )}
      />

      <EditableContent
        formId={IDs.SERIES_IMPRINT}
        validationSchema={seriesImprintValidation}
        defaultValues={{ [SERIES_IMPRINT.name]: imprint }}
        onSubmit={onImprintChange}
        isTableVariant={isTableVariant}
        borderTransparent={borderTransparent}
        formFields={({ control, isHelperTextVisible }) => (
          <ContentWrapper>
            <FormFieldLabel label={SERIES_IMPRINT.label} id={SERIES_IMPRINT.name} />
            <FormTextField
              control={control as unknown as Control<SeriesImprintFormType>}
              name={SERIES_IMPRINT.name}
              id={SERIES_IMPRINT.name}
              select
              options={imprintOptions}
              helperText={IMPRINT_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
            />
          </ContentWrapper>
        )}
        preview={({ disabled, onEdit }) => (
          <Preview label={SERIES_IMPRINT.label} disabled={disabled} onEdit={onEdit} value={imprint} />
        )}
      />

      <EditableContent
        formId={IDs.SERIES_ISSN_PRINT}
        validationSchema={seriesIssnValidation}
        defaultValues={{ [SERIES_ISSN_PRINT.name]: issnPrint, [SERIES_ISSN_DIGITAL.name]: issnDigital }}
        onSubmit={onIssnChange}
        isTableVariant={isTableVariant}
        borderTransparent={borderTransparent}
        formFields={({ control, isHelperTextVisible }) => (
          <ContentWrapper>
            <FormFieldLabel label="ISSN" id={SERIES_ISSN_PRINT.name} />
            <div className="flex flex-col gap-2 lg:flex-row">
              <FormTextField
                control={control as unknown as Control<SeriesIssnFormType>}
                name={SERIES_ISSN_DIGITAL.name}
                id={SERIES_ISSN_DIGITAL.name}
                placeholder={SERIES_ISSN_DIGITAL.placeholder}
                fullWidth
                helperText={ISSN_HELPER_TEXT}
                isHelperTextVisible={isHelperTextVisible}
              />
              <FormTextField
                control={control as unknown as Control<SeriesIssnFormType>}
                name={SERIES_ISSN_PRINT.name}
                id={SERIES_ISSN_PRINT.name}
                placeholder={SERIES_ISSN_PRINT.placeholder}
                fullWidth
              />
            </div>
          </ContentWrapper>
        )}
        preview={({ disabled, onEdit }) => (
          <Preview label="ISSN" disabled={disabled} onEdit={onEdit} value={issnPrint ?? issnDigital ?? ''} />
        )}
      />

      <EditableContent
        formId={IDs.SERIES_URL}
        validationSchema={seriesUrlValidation}
        defaultValues={{ [SERIES_URL.name]: url }}
        onSubmit={onUrlChange}
        isTableVariant={isTableVariant}
        borderTransparent={borderTransparent}
        formFields={({ control, isHelperTextVisible }) => (
          <ContentWrapper>
            <FormFieldLabel label={SERIES_URL.label} id={SERIES_URL.name} />
            <FormTextField
              control={control as unknown as Control<SeriesUrlFormType>}
              name={SERIES_URL.name}
              id={SERIES_URL.name}
              placeholder={SERIES_URL.placeholder}
              isUrlField
              helperText={SERIES_URL_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
            />
          </ContentWrapper>
        )}
        preview={({ disabled, onEdit }) => (
          <Preview label={SERIES_URL.label} disabled={disabled} onEdit={onEdit} value={url ?? ''} />
        )}
      />

      <EditableContent
        formId={IDs.SERIES_DESCRIPTION}
        validationSchema={seriesDescriptionValidation}
        defaultValues={{ [SERIES_DESCRIPTION.name]: description }}
        onSubmit={onDescriptionChange}
        isTableVariant={isTableVariant}
        borderTransparent={borderTransparent}
        formFields={({ control, isHelperTextVisible }) => (
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
              helperText={SERIES_DESCRIPTION_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
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
        preview={({ disabled, onEdit }) => (
          <Preview label={SERIES_DESCRIPTION.label} disabled={disabled} onEdit={onEdit} value={description} />
        )}
      />
    </div>
  );
};

export default EditSeriesForm;
