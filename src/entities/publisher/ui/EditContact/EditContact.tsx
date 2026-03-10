'use client';

import { useUser } from '@/src/entities/user';
import { appConfig } from '@/src/shared/config';
import { contactTypeOptions, ContactTypes, FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import {
  ContentWrapper,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormTextField,
  Preview,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertOptionToString } from '@/src/shared/utils';

import useCreateContact from '../../api/hooks/useCreateContact';
import useDeleteContact from '../../api/hooks/useDeleteContact';
import usePublisher from '../../api/hooks/usePublisher';
import type { PublisherContactForm } from '../../model/publisher.types';
import { publisherContactValidationSchema } from '../../model/publisher.validation';
import usePublisherStateMachine from '../../store/hooks/usePublisherStateMachine';

const { PUBLISHER_CONTACT } = FORM_FIELDS;

const { PUBLISHER_CONTACT: PUBLISHER_CONTACT_HELPER_TEXT } = HELPER_TEXT;

const EditContact = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher?.id ?? '';
  const { publisher } = usePublisher(publisherId);
  const { user } = useUser();
  const { createContact } = useCreateContact(publisherId);
  const { deleteContact, loading: deleteLoading } = useDeleteContact(publisherId);
  const { closeForm } = useFormStateMachine();

  if (!activePublisher || !publisher) return null;

  const existingOptions = ContactTypes.options;
  const defaultValue = publisher.contacts.find((contact) => existingOptions.includes(contact.type))?.type;

  const handleSubmit = (data: PublisherContactForm) => {
    const { contact } = data;

    const existingContact = publisher.contacts.find(({ type }) => type === contact);

    if (existingContact || publisherId === '') return;

    createContact({
      data: { type: contact, email: user.email, id: appConfig.defaultId },
      publisherId,
    });
  };

  const handleDelete = () => {
    if (!defaultValue) return;

    const existingContact = publisher.contacts.find(({ type }) => type === defaultValue);

    if (!existingContact) return;

    deleteContact(existingContact.id);
    closeForm();
  };

  return (
    <EditableContent
      formId={IDs.PUBLISHER_CONTACT}
      defaultValues={{ [PUBLISHER_CONTACT.name]: defaultValue }}
      onSubmit={handleSubmit}
      validationSchema={publisherContactValidationSchema}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={PUBLISHER_CONTACT.label} id={PUBLISHER_CONTACT.name} />
          <FormFieldWithControlsWrapper>
            <FormTextField
              control={control}
              name={PUBLISHER_CONTACT.name}
              select
              options={contactTypeOptions}
              id={PUBLISHER_CONTACT.name}
              helperText={PUBLISHER_CONTACT_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              fullWidth
            />
            <DeleteButton onClick={handleDelete} disabled={!defaultValue || deleteLoading} />
          </FormFieldWithControlsWrapper>
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          capitalize
          label={PUBLISHER_CONTACT.label}
          value={convertOptionToString(defaultValue ?? '')}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditContact;
