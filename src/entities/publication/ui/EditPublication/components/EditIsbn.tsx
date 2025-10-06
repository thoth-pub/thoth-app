import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { PublicationIsbnForm } from '../../../model/publication.types';
import { isbnValidationSchema } from '../../../model/publication.validation';

type EditIsbnProps = Partial<{
  isbn: string;
  recommended: boolean;
  onSubmit: (data: string) => void;
}>;

const { PUBLICATION_ISBN } = FORM_FIELDS;

const { PUBLICATION_ISBN: PUBLICATION_ISBN_HELPER_TEXT } = HELPER_TEXT;

const EditIsbn = (props: EditIsbnProps) => {
  const { isbn = '', recommended = false, onSubmit } = props;

  const showIndicator = recommended && isbn?.length > 0;

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
          <FormFieldLabel recommended={showIndicator} label={PUBLICATION_ISBN.label} id={PUBLICATION_ISBN.name} />
          <FormTextField
            control={control}
            name={PUBLICATION_ISBN.name}
            fullWidth
            helperText={PUBLICATION_ISBN_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, onEdit }) => (
        <Preview recommended={showIndicator} label={PUBLICATION_ISBN.label} value={data?.isbn} onEdit={onEdit} />
      )}
    />
  );
};

export default EditIsbn;
