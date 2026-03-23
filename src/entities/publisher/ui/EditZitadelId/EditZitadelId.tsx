'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import usePublisher from '../../api/hooks/usePublisher';
import useUpdatePublisher from '../../api/hooks/useUpdatePublisher';
import type { PublisherZitadelIdForm } from '../../model/publisher.types';
import { publisherZitadelIdValidationSchema } from '../../model/publisher.validation';
import usePublisherStateMachine from '../../store/hooks/usePublisherStateMachine';

const { PUBLISHER_ZITADEL_ID } = FORM_FIELDS;

const { PUBLISHER_ZITADEL_ID: PUBLISHER_ZITADEL_ID_HELPER_TEXT } = HELPER_TEXT;

const EditZitadelId = ({ isDisabled }: { isDisabled?: boolean }) => {
  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher?.id ?? '';
  const { publisher } = usePublisher(publisherId);
  const { updatePublisher } = useUpdatePublisher(publisherId);

  if (!activePublisher || !publisher) return null;

  const defaultValue = publisher.zitadelId;

  const handleSubmit = (data: PublisherZitadelIdForm) => {
    const { publisherZitadelId } = data;

    updatePublisher({ ...publisher, zitadelId: publisherZitadelId ?? '' });
  };

  return (
    <EditableContent
      isDisabled={isDisabled}
      formId={IDs.PUBLISHER_ZITADEL_ID}
      defaultValues={{ [PUBLISHER_ZITADEL_ID.name]: defaultValue }}
      onSubmit={handleSubmit}
      validationSchema={publisherZitadelIdValidationSchema}
      faq={PUBLISHER_ZITADEL_ID_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={PUBLISHER_ZITADEL_ID.label} id={PUBLISHER_ZITADEL_ID.name} />
          <FormTextField control={control} name={PUBLISHER_ZITADEL_ID.name} id={PUBLISHER_ZITADEL_ID.name} />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview label={PUBLISHER_ZITADEL_ID.label} value={defaultValue} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};

export default EditZitadelId;
