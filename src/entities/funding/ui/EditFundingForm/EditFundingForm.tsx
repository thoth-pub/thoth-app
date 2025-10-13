'use client';

import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  ContentWrapper,
  FormFieldLabel,
  FormTextField,
  MultipleContentWrapper,
  Preview,
  TableFormsHeader,
  TableFormsWrapper,
  TableNewEntityFormWrapper,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { fundingValidationSchema } from '../../model/funding.validation';

type EditFundingProps = {
  onDone?: () => void;
  onClose?: () => void;
};

const { FUNDING, INSTITUTION, GRANT_NUMBER, JURISDICTION, PROGRAM, PROJECT_NAME, PROJECT_SHORTNAME } = FORM_FIELDS;
const {
  INSTITUTION: INSTITUTION_HELPER_TEXT,
  GRANT_NUMBER: GRANT_NUMBER_HELPER_TEXT,
  JURISDICTION: JURISDICTION_HELPER_TEXT,
  PROGRAM: PROGRAM_HELPER_TEXT,
  PROJECT_NAME: PROJECT_NAME_HELPER_TEXT,
  PROJECT_SHORTNAME: PROJECT_SHORTNAME_HELPER_TEXT,
} = HELPER_TEXT;

const EditFundingForm = (props: EditFundingProps) => {
  const { onDone, onClose } = props;

  return (
    <TableNewEntityFormWrapper>
      <TableFormsWrapper>
        <TableFormsHeader title="Funding" onDone={onDone} onClose={onClose} />
        <EditableContent
          formId={IDs.FUNDING}
          borderTransparent
          validationSchema={fundingValidationSchema}
          onSubmit={(data) => console.log(data)}
          formFields={({ control, isHelperTextVisible }) => (
            <MultipleContentWrapper>
              <ContentWrapper>
                <FormFieldLabel label={INSTITUTION.label} id={INSTITUTION.name} />
                <FormTextField
                  control={control}
                  name={INSTITUTION.name}
                  id={INSTITUTION.name}
                  helperText={INSTITUTION_HELPER_TEXT}
                  isHelperTextVisible={isHelperTextVisible}
                />
              </ContentWrapper>

              <ContentWrapper>
                <FormFieldLabel label={GRANT_NUMBER.label} id={GRANT_NUMBER.name} />
                <FormTextField
                  control={control}
                  name={GRANT_NUMBER.name}
                  id={GRANT_NUMBER.name}
                  helperText={GRANT_NUMBER_HELPER_TEXT}
                  isHelperTextVisible={isHelperTextVisible}
                />
              </ContentWrapper>

              <ContentWrapper>
                <FormFieldLabel label={JURISDICTION.label} id={JURISDICTION.name} />
                <FormTextField
                  control={control}
                  name={JURISDICTION.name}
                  id={JURISDICTION.name}
                  helperText={JURISDICTION_HELPER_TEXT}
                  isHelperTextVisible={isHelperTextVisible}
                />
              </ContentWrapper>

              <ContentWrapper>
                <FormFieldLabel label={PROGRAM.label} id={PROGRAM.name} />
                <FormTextField
                  control={control}
                  name={PROGRAM.name}
                  id={PROGRAM.name}
                  helperText={PROGRAM_HELPER_TEXT}
                  isHelperTextVisible={isHelperTextVisible}
                />
              </ContentWrapper>

              <ContentWrapper>
                <FormFieldLabel label={PROJECT_NAME.label} id={PROJECT_NAME.name} />
                <FormTextField
                  control={control}
                  name={PROJECT_NAME.name}
                  id={PROJECT_NAME.name}
                  helperText={PROJECT_NAME_HELPER_TEXT}
                  isHelperTextVisible={isHelperTextVisible}
                />
              </ContentWrapper>

              <ContentWrapper>
                <FormFieldLabel label={PROJECT_SHORTNAME.label} id={PROJECT_SHORTNAME.name} />
                <FormTextField
                  control={control}
                  name={PROJECT_SHORTNAME.name}
                  id={PROJECT_SHORTNAME.name}
                  helperText={PROJECT_SHORTNAME_HELPER_TEXT}
                  isHelperTextVisible={isHelperTextVisible}
                />
              </ContentWrapper>
            </MultipleContentWrapper>
          )}
          preview={({ onEdit }) => <Preview label={FUNDING.label} value={''} onEdit={onEdit} />}
        />
      </TableFormsWrapper>
    </TableNewEntityFormWrapper>
  );
};

export default EditFundingForm;
