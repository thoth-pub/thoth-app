import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';

import { appConfig, convertEntityToSelectFieldOptions, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { useDebouncedValue } from '@/src/shared/hooks';
import { AutocompleteField, ContentWrapper, FormFieldLabel, InputAdornment, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import useInstitutions from '../../api/hooks/useInstitutions';
import type { InstitutionFormType } from '../../model/institution.types';
import { institutionValidationSchema } from '../../model/institution.validation';

const { INSTITUTION } = FORM_FIELDS;

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
      skipAutoSubmit
      isTableVariant
      validationSchema={institutionValidationSchema}
      defaultValues={{ [INSTITUTION.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data)}
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
      preview={({ onEdit }) => <Preview label={INSTITUTION.label} value={value?.name} onEdit={onEdit} />}
    />
  );
};

export default EditInstitutionForm;
