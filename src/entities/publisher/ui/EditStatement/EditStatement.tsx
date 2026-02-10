'use client';

import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import usePublisher from '../../api/hooks/usePublisher';
import useUpdatePublisher from '../../api/hooks/useUpdatePublisher';
import type { PublisherStatementForm } from '../../model/publisher.types';
import { publisherStatementValidationSchema } from '../../model/publisher.validation';
import usePublisherStateMachine from '../../store/hooks/usePublisherStateMachine';

const { PUBLISHER_STATEMENT } = FORM_FIELDS;

const { PUBLISHER_STATEMENT: PUBLISHER_STATEMENT_HELPER_TEXT } = HELPER_TEXT;

const EditStatement = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher && activePublisher.id ? activePublisher.id : '';
  const { publisher } = usePublisher(publisherId);
  const { updatePublisher } = useUpdatePublisher(publisherId);

  if (!activePublisher || !publisher) return null;

  const defaultValue = publisher.accessibilityStatement;

  const handleSubmit = (data: PublisherStatementForm) => {
    const { statement } = data;

    updatePublisher({ ...publisher, accessibilityStatement: statement ?? '' });
  };

  return (
    <EditableContent
      formId={IDs.PUBLISHER_STATEMENT}
      defaultValues={{ [PUBLISHER_STATEMENT.name]: defaultValue }}
      onSubmit={handleSubmit}
      validationSchema={publisherStatementValidationSchema}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={PUBLISHER_STATEMENT.label} id={PUBLISHER_STATEMENT.name} />
          <FormTextField
            control={control}
            name={PUBLISHER_STATEMENT.name}
            id={PUBLISHER_STATEMENT.name}
            helperText={PUBLISHER_STATEMENT_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          capitalize
          label={PUBLISHER_STATEMENT.label}
          value={defaultValue}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditStatement;
