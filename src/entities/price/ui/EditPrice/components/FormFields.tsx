import { type Control, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffectOnce } from 'react-use';

import { appConfig, HELPER_TEXT, isDefaultId } from '@/src/shared';
import { currencyOptions, FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  AddButton,
  AutocompleteField,
  AutocompleteGroup,
  DeleteButton,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  InputLabel,
} from '@/src/shared/ui';

import type { CurrencyCode, PricesForm } from '../../../model/price.types';

type FormFieldsProps = {
  control: Control<PricesForm>;
  isHelperTextVisible?: boolean;
  onDelete?: (id: string) => void;
  onClose?: () => void;
};

const { PRICES, CURRENCY, VALUE } = FORM_FIELDS;

const { PRICE_CURRENCY, PRICE_VALUE } = HELPER_TEXT;

const defaultValue = {
  priceId: appConfig.defaultId,
  [CURRENCY.name]: {
    value: currencyOptions[0].value as CurrencyCode,
    label: currencyOptions[0].label,
  },
  [VALUE.name]: 0.01,
};

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const FormFields = (props: FormFieldsProps) => {
  const { control, isHelperTextVisible = false, onDelete, onClose } = props;

  const { t } = useTranslation();

  const { fields, append, remove } = useFieldArray({
    control,
    name: PRICES.name,
  });

  useEffectOnce(() => {
    if (fields.length !== 0) return;

    append(defaultValue);
  });

  const getFormFieldName = (fieldIndex: number, fieldName: string) => {
    return `${PRICES.name}.${fieldIndex}.${fieldName}`;
  };

  const getCurrencyFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, CURRENCY.name);
  };

  const getValueFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, VALUE.name);
  };

  const handleAdd = () => {
    append({ ...defaultValue, priceId: `${appConfig.defaultId}-${fields.length + 1}` });
  };

  const handleRemove = (index: number) => {
    const item = fields[index];

    if (item && item.priceId && onDelete && !isDefaultId(item.priceId)) {
      onDelete(item.priceId);
    }

    remove(index);

    if (fields.length === 1) {
      onClose?.();
    }
  };

  return (
    <>
      <ul className={itemsStyle}>
        {fields.map((field, index) => (
          <li key={field.id} className={itemsStyle}>
            <FormFieldWrapper>
              <InputLabel className={`${index === 0 ? 'opacity-100' : 'opacity-0'}`}>{PRICES.label}</InputLabel>
              <FormFieldWithControlsWrapper>
                <div className="grid w-full grid-cols-2 gap-1">
                  <FormTextField
                    control={control}
                    name={getValueFieldName(index)}
                    helperText={PRICE_VALUE}
                    isHelperTextVisible={isHelperTextVisible}
                    type={VALUE.type}
                    min={0.01}
                    step="0.01"
                  />
                  <AutocompleteField
                    control={control}
                    name={getCurrencyFieldName(index)}
                    fullWidth
                    select
                    options={currencyOptions}
                    helperText={PRICE_CURRENCY}
                    isHelperTextVisible={isHelperTextVisible}
                    groupBy={(option) => option.group ?? ''}
                    renderGroup={({ group, children, key }) => (
                      <AutocompleteGroup key={key} group={group}>
                        {children}
                      </AutocompleteGroup>
                    )}
                  />
                </div>
                <DeleteButton onClick={() => handleRemove(index)} />
              </FormFieldWithControlsWrapper>
            </FormFieldWrapper>
          </li>
        ))}
      </ul>
      <FormFieldWrapper>
        <InputLabel className={`${fields.length === 0 ? 'opacity-1' : 'opacity-0'}`} component="span">
          {PRICES.label}
        </InputLabel>
        <AddButton type="button" className="mt-[2rem] mr-auto capitalize" onAdd={handleAdd}>
          {t('add new price')}
        </AddButton>
      </FormFieldWrapper>
    </>
  );
};
