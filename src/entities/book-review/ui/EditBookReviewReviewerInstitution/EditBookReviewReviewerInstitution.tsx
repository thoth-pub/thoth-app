import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';

import { appConfig } from '@/src/shared/config';
import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { useDebouncedValue } from '@/src/shared/hooks';
import { AutocompleteField, ContentWrapper, FormFieldLabel, InputAdornment, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertEntityToSelectFieldOptions } from '@/src/shared/utils';

import useInstitutions from '../../../institution/api/hooks/useInstitutions';
import { BookReviewReviewerInstitutionForm } from '../../model/book-review.types';
import { bookReviewReviewerInstitutionValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_REVIEWER_INSTITUTION } = FORM_FIELDS;

const { BOOK_REVIEW_REVIEWER_INSTITUTION: BOOK_REVIEW_REVIEWER_INSTITUTION_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewReviewerInstitutionProps = {
  defaultValue: { value: string; label: string };
  onUpdate?: (data: { value: string; label: string; ror: string }) => void;
};

export const EditBookReviewReviewerInstitution = (props: EditBookReviewReviewerInstitutionProps) => {
  const { defaultValue, onUpdate } = props;

  const [searchValue, setSearchValue] = useState('');
  const debouncedSearchValue = useDebouncedValue(searchValue, appConfig.fieldsDebounceDelay);
  const { institutions, loading } = useInstitutions({ filter: debouncedSearchValue });
  const options = convertEntityToSelectFieldOptions(institutions, 'name');

  const value = institutions.find((institution) => institution.id === defaultValue.value);

  const handleSubmit = (data: BookReviewReviewerInstitutionForm) => {
    const inst = institutions.find((i) => i.id === data.reviewerInstitution.value);

    onUpdate?.({ ...data.reviewerInstitution, ror: inst?.ror ?? '' });
  };

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_REVIEWER_INSTITUTION}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewReviewerInstitutionValidationSchema}
      defaultValues={{ [BOOK_REVIEW_REVIEWER_INSTITUTION.name]: defaultValue }}
      onSubmit={handleSubmit}
      faq={BOOK_REVIEW_REVIEWER_INSTITUTION_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={BOOK_REVIEW_REVIEWER_INSTITUTION.label} id={BOOK_REVIEW_REVIEWER_INSTITUTION.name} />
          <AutocompleteField
            freeSolo
            disableClearable
            name={BOOK_REVIEW_REVIEWER_INSTITUTION.name}
            id={BOOK_REVIEW_REVIEWER_INSTITUTION.name}
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
          label={BOOK_REVIEW_REVIEWER_INSTITUTION.label}
          value={value?.name ?? data?.reviewerInstitution.label}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
