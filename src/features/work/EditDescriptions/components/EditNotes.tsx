import { useWork } from '@/src/entities/work';
import { NotesForm } from '@/src/entities/work/model/work.types';
import { notesValidationSchema } from '@/src/entities/work/model/work.validation';
import { BaseRecommendedSectionProps, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  ContentWrapper,
  FormFieldLabel,
  FormTextField,
  MultipleContentWrapper,
  Preview,
  Typography,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

const { WORK_GENERAL_NOTE, WORK_BIBLIOGRAPHY_NOTE } = FORM_FIELDS;

const { WORK_GENERAL_NOTE: WORK_GENERAL_NOTE_HELPER_TEXT, WORK_BIBLIOGRAPHY_NOTE: WORK_BIBLIOGRAPHY_NOTE_HELPER_TEXT } =
  HELPER_TEXT;

export const EditNotes = (props: BaseRecommendedSectionProps) => {
  const { workId, queryToken } = props;

  const { work, updateWork } = useWork(workId, queryToken);

  let placeholderValue = '';

  if (work.generalNote && work.generalNote.length > 0) {
    placeholderValue += work.generalNote;
  }
  if (work.bibliographyNote && work.bibliographyNote.length > 0) {
    placeholderValue += ` ${work.bibliographyNote}`;
  }

  const handleSubmit = (data: NotesForm) => {
    const { generalNote = '', bibliographyNote = '' } = data;

    updateWork({ ...work, generalNote, bibliographyNote });
  };

  return (
    <EditableContent
      formId={IDs.WORK_NOTES}
      defaultValues={{
        [WORK_GENERAL_NOTE.name]: work.generalNote,
        [WORK_BIBLIOGRAPHY_NOTE.name]: work.bibliographyNote,
      }}
      onSubmit={handleSubmit}
      validationSchema={notesValidationSchema}
      formFields={({ control, isHelperTextVisible }) => (
        <MultipleContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={WORK_GENERAL_NOTE.label} id={WORK_GENERAL_NOTE.name} />
            <FormTextField
              control={control}
              name={WORK_GENERAL_NOTE.name}
              id={WORK_GENERAL_NOTE.name}
              isHelperTextVisible={isHelperTextVisible}
              helperText={WORK_GENERAL_NOTE_HELPER_TEXT}
            />
          </ContentWrapper>
          <ContentWrapper>
            <FormFieldLabel label={WORK_BIBLIOGRAPHY_NOTE.label} id={WORK_BIBLIOGRAPHY_NOTE.name} />
            <FormTextField
              control={control}
              name={WORK_BIBLIOGRAPHY_NOTE.name}
              id={WORK_BIBLIOGRAPHY_NOTE.name}
              isHelperTextVisible={isHelperTextVisible}
              helperText={WORK_BIBLIOGRAPHY_NOTE_HELPER_TEXT}
            />
          </ContentWrapper>
        </MultipleContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview label="Notes" value={placeholderValue} disabled={disabled} onEdit={onEdit}>
          <div className="flex flex-col gap-2">
            {work.generalNote && work.generalNote.length > 0 && <Typography>{work.generalNote}</Typography>}
            {work.bibliographyNote && work.bibliographyNote.length > 0 && (
              <Typography className="lg:mt-2">{work.bibliographyNote}</Typography>
            )}
          </div>
        </Preview>
      )}
    />
  );
};
