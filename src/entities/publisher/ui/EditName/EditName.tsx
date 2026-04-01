'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import usePublisher from '../../api/hooks/usePublisher';
import useUpdatePublisher from '../../api/hooks/useUpdatePublisher';
import type { PublisherNameForm } from '../../model/publisher.types';
import { publisherNameValidationSchema } from '../../model/publisher.validation';
import usePublisherStateMachine from '../../store/hooks/usePublisherStateMachine';

const { PUBLISHER_NAME } = FORM_FIELDS;

const { PUBLISHER_NAME: PUBLISHER_NAME_HELPER_TEXT } = HELPER_TEXT;

const EditName = ({ isDisabled }: { isDisabled?: boolean }) => {
  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher?.id ?? '';
  const { publisher } = usePublisher(publisherId);
  const { updatePublisher } = useUpdatePublisher(publisherId);

  if (!activePublisher || !publisher) return null;

  const defaultValue = publisher.name;

  const handleSubmit = (data: PublisherNameForm) => {
    const { publisherName } = data;

    updatePublisher({ ...publisher, name: publisherName });
  };

  return (
    <EditableContent
      isDisabled={isDisabled}
      formId={IDs.PUBLISHER_NAME}
      defaultValues={{ [PUBLISHER_NAME.name]: defaultValue }}
      onSubmit={handleSubmit}
      validationSchema={publisherNameValidationSchema}
      faq={PUBLISHER_NAME_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={PUBLISHER_NAME.label} id={PUBLISHER_NAME.name} />
          <FormTextField control={control} name={PUBLISHER_NAME.name} id={PUBLISHER_NAME.name} />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview capitalize label={PUBLISHER_NAME.label} value={defaultValue} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};

export default EditName;
