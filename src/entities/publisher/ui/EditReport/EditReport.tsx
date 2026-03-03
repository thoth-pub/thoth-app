'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { prettifyUrlPreview } from '@/src/shared/utils';

import usePublisher from '../../api/hooks/usePublisher';
import useUpdatePublisher from '../../api/hooks/useUpdatePublisher';
import type { PublisherReportForm } from '../../model/publisher.types';
import { publisherReportValidationSchema } from '../../model/publisher.validation';
import usePublisherStateMachine from '../../store/hooks/usePublisherStateMachine';

const { PUBLISHER_REPORT } = FORM_FIELDS;

const { PUBLISHER_REPORT: PUBLISHER_REPORT_HELPER_TEXT } = HELPER_TEXT;

const EditReport = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publisherId = activePublisher?.id ?? '';
  const { publisher } = usePublisher(publisherId);
  const { updatePublisher } = useUpdatePublisher(publisherId);

  if (!activePublisher || !publisher) return null;

  const defaultValue = publisher.accessibilityReportUrl;

  const handleSubmit = (data: PublisherReportForm) => {
    const { report } = data;

    updatePublisher({ ...publisher, accessibilityReportUrl: report ?? '' });
  };

  return (
    <EditableContent
      formId={IDs.PUBLISHER_REPORT}
      defaultValues={{ [PUBLISHER_REPORT.name]: defaultValue }}
      onSubmit={handleSubmit}
      validationSchema={publisherReportValidationSchema}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={PUBLISHER_REPORT.label} id={PUBLISHER_REPORT.name} />
          <FormTextField
            control={control}
            name={PUBLISHER_REPORT.name}
            id={PUBLISHER_REPORT.name}
            helperText={PUBLISHER_REPORT_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            isUrlField
          />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={PUBLISHER_REPORT.label}
          value={prettifyUrlPreview(defaultValue)}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditReport;
