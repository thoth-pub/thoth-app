'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import usePublisher from '../../api/hooks/usePublisher';
import useUpdatePublisher from '../../api/hooks/useUpdatePublisher';
import type { PublisherShortnameForm } from '../../model/publisher.types';
import { publisherShortnameValidationSchema } from '../../model/publisher.validation';
import usePublisherStateMachine from '../../store/hooks/usePublisherStateMachine';

const { PUBLISHER_SHORTNAME } = FORM_FIELDS;

const { PUBLISHER_SHORTNAME: PUBLISHER_SHORTNAME_HELPER_TEXT } = HELPER_TEXT;

const EditShortname = ({ isDisabled }: { isDisabled?: boolean }) => {
  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher?.id ?? '';
  const { publisher } = usePublisher(publisherId);
  const { updatePublisher } = useUpdatePublisher(publisherId);

  if (!activePublisher || !publisher) return null;

  const defaultValue = publisher.shortName;

  const handleSubmit = (data: PublisherShortnameForm) => {
    const { publisherShortname } = data;

    updatePublisher({ ...publisher, shortName: publisherShortname ?? '' });
  };

  return (
    <EditableContent
      isDisabled={isDisabled}
      formId={IDs.PUBLISHER_SHORTNAME}
      defaultValues={{ [PUBLISHER_SHORTNAME.name]: defaultValue }}
      onSubmit={handleSubmit}
      validationSchema={publisherShortnameValidationSchema}
      faq={PUBLISHER_SHORTNAME_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={PUBLISHER_SHORTNAME.label} id={PUBLISHER_SHORTNAME.name} />
          <FormTextField control={control} name={PUBLISHER_SHORTNAME.name} id={PUBLISHER_SHORTNAME.name} />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          capitalize
          label={PUBLISHER_SHORTNAME.label}
          value={defaultValue}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditShortname;
