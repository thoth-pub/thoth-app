'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { awardRoleOptions } from '@/src/shared/utils';

import type { AwardRole } from '../../model/award.types';
import { awardRoleValidationSchema } from '../../model/award.validation';

const { AWARD_ROLE } = FORM_FIELDS;
const { AWARD_ROLE: AWARD_ROLE_HELPER_TEXT } = HELPER_TEXT;

type EditAwardRoleProps = {
  defaultValue?: AwardRole | null;
  onUpdate?: (data: AwardRole | null) => void;
};

export const EditAwardRole = (props: EditAwardRoleProps) => {
  const { defaultValue = null, onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.AWARD_ROLE}
      borderTransparent
      isTableVariant
      validationSchema={awardRoleValidationSchema}
      defaultValues={{ [AWARD_ROLE.name]: defaultValue ?? '' }}
      onSubmit={(data) => onUpdate?.(data.role as AwardRole)}
      faq={AWARD_ROLE_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={AWARD_ROLE.label} id={AWARD_ROLE.name} />
          <FormTextField
            control={control}
            name={AWARD_ROLE.name}
            id={AWARD_ROLE.name}
            options={awardRoleOptions}
            translateOptions
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={AWARD_ROLE.label} value={data?.role} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
