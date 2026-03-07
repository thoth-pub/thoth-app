import { type Control, useFieldArray } from 'react-hook-form';
import { useEffectOnce } from 'react-use';

import { appConfig } from '@/src/shared/config';
import { currencyOptions, FORM_FIELDS, HELPER_TEXT } from '@/src/shared/constants';
import {
  AddButton,
  AutocompleteField,
  AutocompleteGroup,
  DeleteButton,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  InputLabel,
  TranslatedContent,
} from '@/src/shared/ui';
import { isDefaultId } from '@/src/shared/utils';

import type { CurrencyCode, PricesForm } from '../../../model/price.types';

type FormFieldsProps = {
  control: Control<PricesForm>;
  isHelperTextVisible?: boolean;
  defaultCurrencyOption?: { value: CurrencyCode; label: string };
  onDelete?: (id: string) => void;
  onClose?: () => void;
};

const { PRICES, CURRENCY, VALUE } = FORM_FIELDS;

const { PRICE_CURRENCY, PRICE_VALUE } = HELPER_TEXT;

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const FormFields = (props: FormFieldsProps) => {
  const {
    control,
    isHelperTextVisible = false,
    defaultCurrencyOption = currencyOptions[0] as { value: CurrencyCode; label: string },
    onDelete,
    onClose,
  } = props;

  const { fields, append, remove } = useFieldArray({
    control,
    name: PRICES.name,
  });

  const defaultValue = {
    priceId: appConfig.defaultId,
    [CURRENCY.name]: defaultCurrencyOption,
    [VALUE.name]: 0.01,
  };

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
              <InputLabel className={`capitalize ${index === 0 ? 'opacity-100' : 'opacity-0'}`}>
                <TranslatedContent content={PRICES.label} />
              </InputLabel>
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
        <InputLabel className={`capitalize ${fields.length === 0 ? 'opacity-1' : 'opacity-0'}`} component="span">
          <TranslatedContent content={PRICES.label} />
        </InputLabel>
        <AddButton type="button" className="mt-4 mr-auto capitalize xl:mt-8" onAdd={handleAdd}>
          <TranslatedContent content="actions.addNewPrice" />
        </AddButton>
      </FormFieldWrapper>
    </>
  );
};
