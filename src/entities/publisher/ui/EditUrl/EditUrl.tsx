'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { prettifyUrlPreview } from '@/src/shared/utils';

import usePublisher from '../../api/hooks/usePublisher';
import useUpdatePublisher from '../../api/hooks/useUpdatePublisher';
import type { PublisherUrlForm } from '../../model/publisher.types';
import { publisherUrlValidationSchema } from '../../model/publisher.validation';
import usePublisherStateMachine from '../../store/hooks/usePublisherStateMachine';

const { PUBLISHER_URL } = FORM_FIELDS;

const { PUBLISHER_URL: PUBLISHER_URL_HELPER_TEXT } = HELPER_TEXT;

const EditUrl = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher?.id ?? '';
  const { publisher } = usePublisher(publisherId);
  const { updatePublisher } = useUpdatePublisher(publisherId);

  if (!activePublisher || !publisher) return null;

  const defaultValue = publisher.url;

  const handleSubmit = (data: PublisherUrlForm) => {
    const { publisherUrl } = data;

    updatePublisher({ ...publisher, url: publisherUrl ?? '' });
  };

  return (
    <EditableContent
      formId={IDs.PUBLISHER_URL}
      defaultValues={{ [PUBLISHER_URL.name]: defaultValue }}
      onSubmit={handleSubmit}
      validationSchema={publisherUrlValidationSchema}
      faq={PUBLISHER_URL_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={PUBLISHER_URL.label} id={PUBLISHER_URL.name} />
          <FormTextField control={control} name={PUBLISHER_URL.name} id={PUBLISHER_URL.name} isUrlField />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={PUBLISHER_URL.label}
          value={prettifyUrlPreview(defaultValue)}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditUrl;
