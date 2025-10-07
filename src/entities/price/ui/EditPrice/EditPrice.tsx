'use client';

import { Control } from 'react-hook-form';

import { IDs } from '@/src/shared';
import { currencyOptions, FORM_FIELDS } from '@/src/shared/constants/formFields';
import { Chip, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { PriceEntity, PricesForm } from '../../model/price.type';
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
      [VALUE.name]: unitPrice,
    };
  });

  const placeholder = prices.length > 0 ? prices.map(({ currencyCode }) => currencyCode).join(', ') : undefined;

  return (
    <EditableContent
      formId={IDs.PRICES}
      defaultValues={{ [PRICES.name]: defaultValues }}
      validationSchema={pricesValidationSchema}
      borderTransparent
      skipAutoSubmit
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
      preview={({ onEdit }) => (
        <Preview label={PRICES.label} onEdit={onEdit} value={placeholder}>
          {defaultValues.length > 0 && (
            <ul className="flex w-full flex-col gap-[var(--default-gap)]">
              {defaultValues.map(({ priceId, currency: { value }, priceValue }) => (
                <li key={priceId} className="flex items-center gap-1">
                  <Chip label={value} size="small" component="span" />
                  <Typography>{priceValue}</Typography>
                </li>
              ))}
            </ul>
          )}
        </Preview>
      )}
    />
  );
};

export default EditPrice;
