import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';

import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { useDebouncedValue } from '@/src/shared/hooks';
import { AutocompleteField, ContentWrapper, FormFieldLabel, InputAdornment, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertEntityToSelectFieldOptions } from '@/src/shared/utils';

import useInstitutions from '../../api/hooks/useInstitutions';
import type { InstitutionFormType } from '../../model/institution.types';
import { institutionValidationSchema } from '../../model/institution.validation';

const { INSTITUTION } = FORM_FIELDS;

const { INSTITUTION: INSTITUTION_HELPER_TEXT } = HELPER_TEXT;

type InstitutionFormProps = {
  defaultValue: { value: string; label: string };
  onUpdate: (data: InstitutionFormType) => void;
};

const EditInstitutionForm = (props: InstitutionFormProps) => {
  const { defaultValue, onUpdate } = props;

  const [searchValue, setSearchValue] = useState('');
  const debouncedSearchValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { institutions, loading } = useInstitutions({ filter: debouncedSearchValue });
  const options = convertEntityToSelectFieldOptions(institutions, 'name');

  const value = institutions.find((institution) => institution.id === defaultValue.value);

  return (
    <EditableContent
      formId={IDs.INSTITUTION}
      borderTransparent
      isTableVariant
      validationSchema={institutionValidationSchema}
      defaultValues={{ [INSTITUTION.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data)}
      faq={INSTITUTION_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={INSTITUTION.label} id={INSTITUTION.name} />
          <AutocompleteField
            freeSolo
            disableClearable
            name={INSTITUTION.name}
            id={INSTITUTION.name}
            control={control}
            options={options}
            onInputChange={(_, value) => setSearchValue(value)}
            loading={loading}
            icon={
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            }
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={INSTITUTION.label}
          value={value?.name ?? data?.institution.label}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditInstitutionForm;
