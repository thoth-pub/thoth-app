import { type Control, useFieldArray } from 'react-hook-form';
import { useEffectOnce } from 'react-use';

import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS, locationPlatformOptions } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import {
  AddButton,
  AutocompleteField,
  AutocompleteGroup,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  InputLabel,
  TranslatedContent,
} from '@/src/shared/ui';
import { getProtocolPrefix, isDefaultId } from '@/src/shared/utils';

import type { LocationPlatform, LocationsForm } from '../../../model/location.types';

const { LOCATIONS, PLATFORM, FULL_TEXT_URL, LANDING_PAGE } = FORM_FIELDS;

type FormFieldsProps = {
  control: Control<LocationsForm>;
  onDelete?: (id: string) => void;
  onClose?: () => void;
};

const defaultValue = {
  platformId: appConfig.defaultId,
  [PLATFORM.name]: {
    value: locationPlatformOptions[0].value as LocationPlatform,
    label: locationPlatformOptions[0].label,
  },
  [FULL_TEXT_URL.name]: '',
  [LANDING_PAGE.name]: '',
};

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const FormFields = (props: FormFieldsProps) => {
  const { control, onDelete, onClose } = props;

  const { fields, append, remove } = useFieldArray({
    control,
    name: LOCATIONS.name,
  });

  useEffectOnce(() => {
    if (fields.length !== 0) return;

    append(defaultValue);
  });

  const getFormFieldName = (fieldIndex: number, fieldName: string) => {
    return `${LOCATIONS.name}.${fieldIndex}.${fieldName}`;
  };

  const getPlatformFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, PLATFORM.name);
  };

  const getUrlFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, FULL_TEXT_URL.name);
  };

  const getLandingPageFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, LANDING_PAGE.name);
  };

  const handleAdd = () => {
    append({ ...defaultValue, platformId: `${appConfig.defaultId}-${fields.length + 1}` });
  };

  const handleRemove = (index: number) => {
    const item = fields[index];

    if (item && item.platformId && onDelete && !isDefaultId(item.platformId)) {
      onDelete(item.platformId);
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
              <FormFieldLabel label={LOCATIONS.label} id={getPlatformFieldName(index)} />
              <FormFieldWithControlsWrapper>
                <AutocompleteField
                  control={control}
                  name={getPlatformFieldName(index)}
                  id={getPlatformFieldName(index)}
                  options={locationPlatformOptions}
                  groupBy={(option) => option.group ?? ''}
                  renderGroup={({ group, children, key }) => (
                    <AutocompleteGroup key={key} group={group}>
                      {children}
                    </AutocompleteGroup>
                  )}
                />
                <DeleteButton onClick={() => handleRemove(index)} />
              </FormFieldWithControlsWrapper>
            </FormFieldWrapper>
            <FormFieldWrapper>
              <FormFieldLabel label={LANDING_PAGE.label} id={getLandingPageFieldName(index)} />
              <FormTextField
                control={control}
                name={getLandingPageFieldName(index)}
                id={getLandingPageFieldName(index)}
                isUrlField
                predefinedPrefix={getProtocolPrefix(field.landingPage ?? '')}
              />
            </FormFieldWrapper>
            <FormFieldWrapper>
              <FormFieldLabel label={FULL_TEXT_URL.label} id={getUrlFieldName(index)} />
              <FormTextField
                control={control}
                name={getUrlFieldName(index)}
                id={getUrlFieldName(index)}
                isUrlField
                predefinedPrefix={getProtocolPrefix(field.fullTextUrl ?? '')}
              />
            </FormFieldWrapper>
          </li>
        ))}
      </ul>

      <FormFieldWrapper>
        <InputLabel className={`${fields.length === 0 ? 'opacity-1' : 'opacity-0'}`} component="span">
          <TranslatedContent content={LOCATIONS.label} namespace={NAMESPACES.enum.forms} />
        </InputLabel>
        <AddButton type="button" className="mt-4 mr-auto capitalize xl:mt-8" onAdd={handleAdd}>
          <TranslatedContent content="actions.addNewLocation" />
        </AddButton>
      </FormFieldWrapper>
    </>
  );
};
