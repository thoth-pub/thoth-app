import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';

import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { useDebouncedValue } from '@/src/shared/hooks';
import { AutocompleteField, ContentWrapper, FormFieldLabel, InputAdornment, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertEntityToSelectFieldOptions } from '@/src/shared/utils';

import useInstitutions from '../../../institution/api/hooks/useInstitutions';
import { EndorsementAuthorInstitutionForm } from '../../model/endorsement.types';
import { endorsementAuthorInstitutionValidationSchema } from '../../model/endorsement.validation';

const { ENDORSEMENT_AUTHOR_INSTITUTION } = FORM_FIELDS;

const { ENDORSEMENT_AUTHOR_INSTITUTION: ENDORSEMENT_AUTHOR_INSTITUTION_HELPER_TEXT } = HELPER_TEXT;

type EditEndorsementAuthorInstitutionProps = {
  defaultValue: { value: string; label: string };
  onUpdate?: (data: { value: string; label: string; ror: string }) => void;
};

export const EditEndorsementAuthorInstitution = (props: EditEndorsementAuthorInstitutionProps) => {
  const { defaultValue, onUpdate } = props;

  const [searchValue, setSearchValue] = useState('');
  const debouncedSearchValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { institutions, loading } = useInstitutions({ filter: debouncedSearchValue });
  const options = convertEntityToSelectFieldOptions(institutions, 'name');

  const value = institutions.find((institution) => institution.id === defaultValue.value);

  const handleSubmit = (data: EndorsementAuthorInstitutionForm) => {
    const inst = institutions.find((i) => i.id === data.authorInstitution.value);

    onUpdate?.({ ...data.authorInstitution, ror: inst?.ror ?? '' });
  };

  return (
    <EditableContent
      formId={IDs.ENDORSEMENT_AUTHOR_INSTITUTION}
      borderTransparent
      isTableVariant
      validationSchema={endorsementAuthorInstitutionValidationSchema}
      defaultValues={{ [ENDORSEMENT_AUTHOR_INSTITUTION.name]: defaultValue }}
      onSubmit={handleSubmit}
      faq={ENDORSEMENT_AUTHOR_INSTITUTION_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={ENDORSEMENT_AUTHOR_INSTITUTION.label} id={ENDORSEMENT_AUTHOR_INSTITUTION.name} />
          <AutocompleteField
            freeSolo
            disableClearable
            name={ENDORSEMENT_AUTHOR_INSTITUTION.name}
            id={ENDORSEMENT_AUTHOR_INSTITUTION.name}
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
          label={ENDORSEMENT_AUTHOR_INSTITUTION.label}
          value={value?.name ?? data?.authorInstitution.label}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
