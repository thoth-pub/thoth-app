import { FORM_FIELDS, HELPER_TEXT, IDs, publicationTypeOptions } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { PublicationType, PublicationTypeForm } from '../../../model/publication.types';
import { publicationTypeValidationSchema } from '../../../model/publication.validation';

const { PUBLICATION_TYPE } = FORM_FIELDS;

const { PUBLICATION_TYPE: PUBLICATION_TYPE_HELPER_TEXT } = HELPER_TEXT;

type EditPublicationTypeProps = Partial<{
  publicationType: PublicationType;
  onSubmit: (data: PublicationType) => void | Promise<void>;
}>;

const EditPublicationType = (props: EditPublicationTypeProps) => {
  const { publicationType, onSubmit } = props;

  const defaultValue =
    publicationTypeOptions.find((option) => option.value === publicationType) ?? publicationTypeOptions[0];

  // Return the mutation promise so EditableContent awaits it before staging/closing.
  const handleSubmit = (data: PublicationTypeForm) => onSubmit?.(data.publicationType);

  return (
    <EditableContent
      isTableVariant
      formId={IDs.PUBLICATION_TYPE}
      defaultValues={{ [PUBLICATION_TYPE.name]: defaultValue.value as PublicationType }}
      validationSchema={publicationTypeValidationSchema}
      onSubmit={handleSubmit}
      borderTransparent
      faq={PUBLICATION_TYPE_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={PUBLICATION_TYPE.label} id={PUBLICATION_TYPE.name} />
          <FormTextField
            control={control}
            name={PUBLICATION_TYPE.name}
            select
            options={publicationTypeOptions}
            id={PUBLICATION_TYPE.name}
            translateOptions
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={PUBLICATION_TYPE.label}
          value={data?.publicationType.toLowerCase() ?? ''}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditPublicationType;
