import { type Control, useFieldArray } from 'react-hook-form';
import { useEffectOnce } from 'react-use';

import { appConfig } from '@/src/shared/config';
import { currencyOptions, FORM_FIELDS } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
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
  defaultCurrencyOption?: { value: CurrencyCode; label: string };
  onDelete?: (id: string) => void;
};

const { PRICES, CURRENCY, VALUE } = FORM_FIELDS;

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const FormFields = (props: FormFieldsProps) => {
  const {
    control,
    defaultCurrencyOption = currencyOptions[0] as { value: CurrencyCode; label: string },
    onDelete,
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
  };

  return (
    <>
      <ul className={itemsStyle}>
        {fields.map((field, index) => (
          <li key={field.id} className={itemsStyle}>
            <FormFieldWrapper>
              <InputLabel className={`capitalize ${index === 0 ? 'opacity-100' : 'opacity-0'}`}>
                <TranslatedContent content={PRICES.label} namespace={NAMESPACES.enum.forms} />
              </InputLabel>
              <FormFieldWithControlsWrapper>
                <div className="grid w-full grid-cols-2 gap-1">
                  <FormTextField
                    control={control}
                    name={getValueFieldName(index)}
                    type={VALUE.type}
                    min={0.01}
                    step="0.01"
                  />
                  <AutocompleteField
                    control={control}
                    name={getCurrencyFieldName(index)}
                    fullWidth
                    options={currencyOptions}
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
          <TranslatedContent content={PRICES.label} namespace={NAMESPACES.enum.forms} />
        </InputLabel>
        <AddButton type="button" className="mt-4 mr-auto capitalize xl:mt-8" onAdd={handleAdd}>
          <TranslatedContent content="actions.addNewPrice" />
        </AddButton>
      </FormFieldWrapper>
    </>
  );
};
