'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { awardStatementValidationSchema } from '../../model/award.validation';

const { AWARD_STATEMENT } = FORM_FIELDS;
const { AWARD_STATEMENT: AWARD_STATEMENT_HELPER_TEXT } = HELPER_TEXT;

type EditAwardStatementProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAwardStatement = (props: EditAwardStatementProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.AWARD_STATEMENT}
      borderTransparent
      isTableVariant
      validationSchema={awardStatementValidationSchema}
      defaultValues={{ [AWARD_STATEMENT.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.statement)}
      faq={AWARD_STATEMENT_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={AWARD_STATEMENT.label} id={AWARD_STATEMENT.name} />
          <FormTextField control={control} name={AWARD_STATEMENT.name} id={AWARD_STATEMENT.name} />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={AWARD_STATEMENT.label} value={data?.statement} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
