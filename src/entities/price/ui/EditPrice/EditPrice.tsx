'use client';

import { Control } from 'react-hook-form';

import { currencyOptions, FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { CurrencyCode, PriceEntity, PricesForm } from '../../model/price.types';
import { pricesValidationSchema } from '../../model/price.validation';
import { FormFields } from './components/FormFields';

const { PRICES } = FORM_FIELDS;
const { PRICE_CURRENCY } = HELPER_TEXT;

type EditPriceProps = Partial<{
  prices: PriceEntity[];
  defaultCurrencyOption?: { value: CurrencyCode; label: string };
  onUpdate: (data: PricesForm) => void;
  onDelete: (id: string) => void;
}>;

const { CURRENCY, VALUE } = FORM_FIELDS;

const emptyPrices: NonNullable<EditPriceProps['prices']> = [];

const EditPrice = (props: EditPriceProps) => {
  const { prices = emptyPrices, defaultCurrencyOption, onUpdate, onDelete } = props;

  const defaultValues = prices.map(({ id, currencyCode, unitPrice }) => {
    const currencyOption = currencyOptions.find((option) => option.value.toLowerCase() === currencyCode.toLowerCase());

    return {
      priceId: id,
      [CURRENCY.name]: {
        value: currencyCode,
        label: currencyOption ? currencyOption.label : currencyCode,
      },
      [VALUE.name]: +unitPrice.toFixed(2),
    };
  });

  const placeholder =
    prices.length > 0
      ? prices.map(({ currencyCode, unitPrice }) => `${unitPrice} ${currencyCode}`).join(', ')
      : undefined;

  return (
    <EditableContent
      formId={IDs.PRICES}
      defaultValues={{ [PRICES.name]: defaultValues }}
      validationSchema={pricesValidationSchema}
      borderTransparent
      isTableVariant
      onSubmit={(data) => onUpdate?.(data)}
      faq={PRICE_CURRENCY}
      formFields={({ control }) => (
        <FormFields
          control={control as unknown as Control<PricesForm>}
          defaultCurrencyOption={defaultCurrencyOption}
          onDelete={onDelete}
        />
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={PRICES.label}
          disabled={disabled}
          onEdit={onEdit}
          value={placeholder}
          namespace={NAMESPACES.enum.forms}
        />
      )}
    />
  );
};

export default EditPrice;
