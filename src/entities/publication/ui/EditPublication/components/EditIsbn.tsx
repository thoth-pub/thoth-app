import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { PublicationIsbnForm } from '../../../model/publication.types';
import { isbnValidationSchema } from '../../../model/publication.validation';

type EditIsbnProps = Partial<{
  isbn: string;
  onSubmit: (data: string) => void;
}>;

const { PUBLICATION_ISBN } = FORM_FIELDS;

const { PUBLICATION_ISBN: PUBLICATION_ISBN_HELPER_TEXT } = HELPER_TEXT;

const EditIsbn = (props: EditIsbnProps) => {
  const { isbn = '', onSubmit } = props;

  const handleSubmit = (data: PublicationIsbnForm) => {
    onSubmit?.(data.isbn ?? '');
  };

  return (
    <EditableContent
      isTableVariant
      formId={IDs.PUBLICATION_ISBN}
      defaultValues={{ [PUBLICATION_ISBN.name]: isbn }}
      validationSchema={isbnValidationSchema}
      onSubmit={handleSubmit}
      borderTransparent
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={PUBLICATION_ISBN.label} id={PUBLICATION_ISBN.name} />
          <FormTextField
            control={control}
            name={PUBLICATION_ISBN.name}
            id={PUBLICATION_ISBN.name}
            helperText={PUBLICATION_ISBN_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, onEdit }) => (
        <Preview label={PUBLICATION_ISBN.label} value={data?.isbn} onEdit={onEdit} />
      )}
    />
  );
};

export default EditIsbn;
