import type { Control } from 'react-hook-form';

import { type BaseRecommendedSectionProps, convertOptionToString, IDs, SubjectTypes } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { SubjectsFormType, SubjectType } from '../../model/subject.types';
import { subjectsValidationSchema } from '../../model/subject.validation';
import { FormFields } from './components/FormFields';
import { PreviewList } from './components/PreviewList';
import { useEditSubjects } from './useEditSubjects';

const { SUBJECTS, SUBJECT_TYPE, SUBJECT_CODE } = FORM_FIELDS;

const EditSubjects = (props: BaseRecommendedSectionProps) => {
  const { workId, queryToken, recommended = false } = props;

  const { subjects, update, deleteSubject, close } = useEditSubjects({ workId, queryToken });

  const defaultValues = subjects.map((subject) => ({
    subjectId: subject.id,
    [SUBJECT_TYPE.name]: subject.type as SubjectType,
    [SUBJECT_CODE.name]: subject.code,
  }));

  const placeholder =
    subjects.length > 0
      ? subjects.map(({ code, type }) => `${code} | ${convertOptionToString(type)}`).join(', ')
      : undefined;

  const bicubSubjects = subjects.filter((subject) => subject.type === SubjectTypes.enum.Bic);

  const bisacSubjects = subjects.filter((subject) => subject.type === SubjectTypes.enum.Bisac);

  const customSubjects = subjects.filter((subject) => subject.type === SubjectTypes.enum.Custom);

  const keywordSubjects = subjects.filter((subject) => subject.type === SubjectTypes.enum.Keyword);

  const lccSubjects = subjects.filter((subject) => subject.type === SubjectTypes.enum.Lcc);

  const themaSubjects = subjects.filter((subject) => subject.type === SubjectTypes.enum.Thema);

  return (
    <EditableContent
      formId={IDs.WORK_SUBJECTS}
      validationSchema={subjectsValidationSchema}
      onSubmit={update}
      defaultValues={{ [SUBJECTS.name]: defaultValues }}
      skipAutoSubmit
      formFields={({ control }) => (
        <FormFields
          recommended={recommended}
          control={control as unknown as Control<SubjectsFormType>}
          onClose={close}
          onDelete={deleteSubject}
        />
      )}
      preview={({ onEdit }) => (
        <Preview
          label={SUBJECTS.label}
          onEdit={onEdit}
          value={placeholder}
          recommended={recommended}
          tooltip="Theme subject is recommended"
        >
          {placeholder && (
            <ul className="flex w-full flex-col gap-[var(--default-gap)]">
              {bicubSubjects.length > 0 && <PreviewList subjects={bicubSubjects} onDelete={deleteSubject} />}
              {bisacSubjects.length > 0 && <PreviewList subjects={bisacSubjects} onDelete={deleteSubject} />}
              {customSubjects.length > 0 && <PreviewList subjects={customSubjects} onDelete={deleteSubject} />}
              {keywordSubjects.length > 0 && <PreviewList subjects={keywordSubjects} onDelete={deleteSubject} />}
              {lccSubjects.length > 0 && <PreviewList subjects={lccSubjects} onDelete={deleteSubject} />}
              {themaSubjects.length > 0 && <PreviewList subjects={themaSubjects} onDelete={deleteSubject} />}
            </ul>
          )}
        </Preview>
      )}
    />
  );
};

export default EditSubjects;
