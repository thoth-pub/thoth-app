import { type Control, useFieldArray } from 'react-hook-form';
import { useEffectOnce } from 'react-use';

import { appConfig, HELPER_TEXT, isDefaultId } from '@/src/shared';
import { FORM_FIELDS, locationPlatformOptions } from '@/src/shared/constants/formFields';
import {
  AddButton,
  AutocompleteField,
  AutocompleteGroup,
  CheckboxFormField,
  DeleteButton,
  FormFieldWithControlsWrapper,
  FormFieldWrapper,
  FormTextField,
  InputLabel,
} from '@/src/shared/ui';

import type { LocationPlatform, LocationsForm } from '../../../model/location.type';

const { LOCATIONS, PLATFORM, CANONICAL, URL, LANDING_PAGE } = FORM_FIELDS;

const { LOCATION_PLATFORM, LOCATION_URL_HELPER_TEXT, LANDING_PAGE_HELPER_TEXT } = HELPER_TEXT;

type FormFieldsProps = {
  control: Control<LocationsForm>;
  isHelperTextVisible?: boolean;
  onDelete?: (id: string) => void;
  onClose?: () => void;
};

const defaultValue = {
  platformId: appConfig.defaultId,
  [PLATFORM.name]: {
    value: locationPlatformOptions[0].value as LocationPlatform,
    label: locationPlatformOptions[0].label,
  },
  [CANONICAL.name]: false,
  [URL.name]: '',
  [LANDING_PAGE.name]: '',
};

const itemsStyle = 'flex flex-col gap-[var(--default-gap)]';

export const FormFields = (props: FormFieldsProps) => {
  const { control, isHelperTextVisible = false, onDelete, onClose } = props;

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
    return getFormFieldName(fieldIndex, URL.name);
  };

  const getLandingPageFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, LANDING_PAGE.name);
  };

  const getCanonicalFieldName = (fieldIndex: number) => {
    return getFormFieldName(fieldIndex, CANONICAL.name);
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
              <InputLabel>{LOCATIONS.label}</InputLabel>
              <FormFieldWithControlsWrapper>
                <AutocompleteField
                  control={control}
                  name={getPlatformFieldName(index)}
                  fullWidth
                  select
                  options={locationPlatformOptions}
                  helperText={LOCATION_PLATFORM}
                  isHelperTextVisible={isHelperTextVisible}
                  groupBy={(option) => option.group ?? ''}
                  renderGroup={({ group, children, key }) => (
                    <AutocompleteGroup key={key} group={group}>
                      {children}
                    </AutocompleteGroup>
                  )}
                />
                <DeleteButton onDelete={() => handleRemove(index)} />
              </FormFieldWithControlsWrapper>
            </FormFieldWrapper>
            <FormFieldWrapper>
              <InputLabel>{LANDING_PAGE.label}</InputLabel>
              <FormTextField
                control={control}
                name={getLandingPageFieldName(index)}
                helperText={LANDING_PAGE_HELPER_TEXT}
                isHelperTextVisible={isHelperTextVisible}
                isUrlField
              />
            </FormFieldWrapper>
            <FormFieldWrapper>
              <InputLabel>{URL.label}</InputLabel>
              <FormTextField
                control={control}
                name={getUrlFieldName(index)}
                helperText={LOCATION_URL_HELPER_TEXT}
                isHelperTextVisible={isHelperTextVisible}
                isUrlField
              />
            </FormFieldWrapper>
            <FormFieldWrapper>
              <InputLabel>{CANONICAL.label}</InputLabel>
              <CheckboxFormField
                control={control}
                name={getCanonicalFieldName(index)}
                className="mr-auto p-0"
                isHelperTextVisible={isHelperTextVisible}
              />
            </FormFieldWrapper>
          </li>
        ))}
      </ul>

      <FormFieldWrapper>
        <InputLabel className={`${fields.length === 0 ? 'opacity-1' : 'opacity-0'}`} component="span">
          {LOCATIONS.label}
        </InputLabel>
        <AddButton type="button" className="mt-[2rem] mr-auto" onAdd={handleAdd}>
          Add New Location
        </AddButton>
      </FormFieldWrapper>
    </>
  );
};
