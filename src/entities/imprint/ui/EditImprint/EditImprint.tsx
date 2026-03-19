import type { CurrencyCode, LocaleCode } from '@/gql/graphql';
import { appConfig } from '@/src/shared/config';
import { currencyOptions, FORM_FIELDS, HELPER_TEXT, IDs, languageOptionsAlt } from '@/src/shared/constants';
import {
  AutocompleteField,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormTextField,
  MultipleContentWrapper,
  Preview,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { findCurrencyOption, findLocaleOption } from '@/src/shared/utils';

import type { ImprintEntity, ImprintForm, ImprintId } from '../../model/imprint.types';
import { imprintValidationSchema } from '../../model/imprint.validation';

type EditImprintData = {
  imprintId: string;
  imprintName: string;
  imprintUrl: string;
  crossmarkDoi: string;
  defaultPlace: string;
  defaultCurrency: CurrencyCode;
  defaultLocale: LocaleCode;
};

type EditImprintProps = Partial<{
  imprint: ImprintEntity;
  id: ImprintId;
  disabled: boolean;
  deleteDisabled: boolean;
  onUpdate: (data: EditImprintData) => void;
  onDelete: (imprintId: ImprintId) => void;
}>;

const { IMPRINT, IMPRINT_URL, CROSSMARK_DOI, DEFAULT_PLACE, DEFAULT_CURRENCY, DEFAULT_LOCALE } = FORM_FIELDS;

const {
  EDIT_IMPRINT,
  IMPRINT_URL: IMPRINT_URL_HELPER,
  CROSSMARK_DOI: CROSSMARK_DOI_HELPER,
  DEFAULT_PLACE: DEFAULT_PLACE_HELPER,
  DEFAULT_CURRENCY: DEFAULT_CURRENCY_HELPER,
  DEFAULT_LOCALE: DEFAULT_LOCALE_HELPER,
} = HELPER_TEXT;

const EditImprint = (props: EditImprintProps) => {
  const { imprint, id = '', onUpdate, onDelete, deleteDisabled = false, disabled = false } = props;

  const defaultName = imprint?.name ?? '';
  const isDeleteDisabled = defaultName.length === 0 || id.length === 0 || id === appConfig.defaultId || deleteDisabled;

  const defaultValues = {
    [IMPRINT.name]: defaultName,
    [IMPRINT_URL.name]: imprint?.url ?? '',
    [CROSSMARK_DOI.name]: imprint?.crossmarkDoi ?? '',
    [DEFAULT_PLACE.name]: imprint?.defaultPlace ?? '',
    [DEFAULT_CURRENCY.name]: findCurrencyOption(imprint?.defaultCurrency) as { value: CurrencyCode; label: string },
    [DEFAULT_LOCALE.name]: findLocaleOption(imprint?.defaultLocale),
  };

  const handleUpdate = (data: ImprintForm) => {
    if (!onUpdate) return;

    const {
      [IMPRINT.name]: imprintName,
      [IMPRINT_URL.name]: imprintUrl,
      [CROSSMARK_DOI.name]: crossmarkDoi,
      [DEFAULT_PLACE.name]: defaultPlace,
      [DEFAULT_CURRENCY.name]: defaultCurrency,
      [DEFAULT_LOCALE.name]: defaultLocale,
    } = data;

    onUpdate({
      imprintId: id,
      imprintName: imprintName,
      imprintUrl: imprintUrl ?? '',
      crossmarkDoi: crossmarkDoi ?? '',
      defaultPlace: defaultPlace ?? '',
      defaultCurrency: defaultCurrency.value,
      defaultLocale: defaultLocale.value,
    });
  };

  return (
    <EditableContent
      formId={IDs.IMPRINT(id)}
      validationSchema={imprintValidationSchema}
      defaultValues={defaultValues}
      onSubmit={handleUpdate}
      isDisabled={disabled}
      faq={EDIT_IMPRINT}
      formFields={({ control }) => (
        <div className="flex flex-col gap-(--default-gap)">
          <MultipleContentWrapper>
            <FormFieldLabel label={IMPRINT.label} id={IMPRINT.name} />
            <FormFieldWithControlsWrapper>
              <FormTextField control={control} name={IMPRINT.name} id={IMPRINT.name} fullWidth disabled={disabled} />
              <DeleteButton onClick={() => onDelete?.(id)} disabled={isDeleteDisabled} />
            </FormFieldWithControlsWrapper>
          </MultipleContentWrapper>
          <MultipleContentWrapper>
            <FormFieldLabel label={IMPRINT_URL.label} id={IMPRINT_URL.name} />
            <FormTextField
              control={control}
              name={IMPRINT_URL.name}
              id={IMPRINT_URL.name}
              helperText={IMPRINT_URL_HELPER}
              fullWidth
              isUrlField
              disabled={disabled}
            />
          </MultipleContentWrapper>
          <MultipleContentWrapper>
            <FormFieldLabel label={CROSSMARK_DOI.label} id={CROSSMARK_DOI.name} />
            <FormTextField
              control={control}
              name={CROSSMARK_DOI.name}
              id={CROSSMARK_DOI.name}
              helperText={CROSSMARK_DOI_HELPER}
              fullWidth
              isDoiField
              disabled={disabled}
            />
          </MultipleContentWrapper>
          <MultipleContentWrapper>
            <FormFieldLabel label={DEFAULT_PLACE.label} id={DEFAULT_PLACE.name} />
            <FormTextField
              control={control}
              name={DEFAULT_PLACE.name}
              id={DEFAULT_PLACE.name}
              helperText={DEFAULT_PLACE_HELPER}
              fullWidth
              disabled={disabled}
            />
          </MultipleContentWrapper>
          <MultipleContentWrapper>
            <FormFieldLabel label={DEFAULT_CURRENCY.label} id={DEFAULT_CURRENCY.name} />
            <AutocompleteField
              control={control}
              name={DEFAULT_CURRENCY.name}
              options={currencyOptions}
              helperText={DEFAULT_CURRENCY_HELPER}
              fullWidth
            />
          </MultipleContentWrapper>
          <MultipleContentWrapper>
            <FormFieldLabel label={DEFAULT_LOCALE.label} id={DEFAULT_LOCALE.name} />
            <AutocompleteField
              control={control}
              name={DEFAULT_LOCALE.name}
              options={languageOptionsAlt}
              helperText={DEFAULT_LOCALE_HELPER}
              fullWidth
            />
          </MultipleContentWrapper>
        </div>
      )}
      preview={({ disabled: previewDisabled, onEdit }) => (
        <Preview value={defaultName} disabled={disabled || previewDisabled} onEdit={onEdit} />
      )}
    />
  );
};
export default EditImprint;
