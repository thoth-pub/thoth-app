'use client';

import { Control } from 'react-hook-form';

import { IDs } from '@/src/shared';
import { currencyOptions, FORM_FIELDS } from '@/src/shared/constants/formFields';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { PriceEntity, PricesForm } from '../../model/price.types';
import { pricesValidationSchema } from '../../model/price.validation';
import { FormFields } from './components/FormFields';

const { PRICES } = FORM_FIELDS;

type EditPriceProps = Partial<{
  prices: PriceEntity[];
  onUpdate: (data: PricesForm) => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}>;

const { CURRENCY, VALUE } = FORM_FIELDS;

const EditPrice = (props: EditPriceProps) => {
  const { prices = [], onUpdate, onDelete, onClose } = props;

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
      formFields={({ control, isHelperTextVisible }) => (
        <FormFields
          control={control as unknown as Control<PricesForm>}
          isHelperTextVisible={isHelperTextVisible}
          onDelete={onDelete}
          onClose={onClose}
        />
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={PRICES.label}
          disabled={disabled}
          onEdit={onEdit}
          value={placeholder}
          namespace={NAMESPACES.enum.common}
        />
      )}
    />
  );
};

export default EditPrice;
