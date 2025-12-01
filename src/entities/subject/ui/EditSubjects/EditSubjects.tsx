'use client';

import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Control } from 'react-hook-form';

import { type BaseRecommendedSectionProps, convertOptionToString, IDs, SubjectTypes } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { AddButton, IconButton, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { SubjectsFormType, SubjectType } from '../../model/subject.types';
import { subjectsValidationSchema } from '../../model/subject.validation';
import { FormFields } from './components/FormFields';
import { PreviewList } from './components/PreviewList';
import { useEditSubjects } from './useEditSubjects';
import { Activity, Fragment, useState } from 'react';
import { ShrinkedListItem } from './components/ShrinkedListItem';

const { SUBJECTS, SUBJECT_TYPE, SUBJECT_CODE } = FORM_FIELDS;

const EditSubjects = (props: BaseRecommendedSectionProps) => {
  const { workId, queryToken, recommended = false } = props;

  const { subjects, update, deleteSubject, close } = useEditSubjects({ workId, queryToken });
  const [isExpanded, setIsExpanded] = useState(false);

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

  const data = [
    {
      text: 'add bicub subject',
      subjects: bicubSubjects,
    },
    {
      text: 'add bisac subject',
      subjects: bisacSubjects,
    },
    {
      text: 'add custom subject',
      subjects: customSubjects,
    },
    {
      text: 'add keyword subject',
      subjects: keywordSubjects,
    },
    {
      text: 'add lcc subject',
      subjects: lccSubjects,
    },
    {
      text: 'add thema subject',
      subjects: themaSubjects,
    },
  ].sort((a, b) => b.subjects.length - a.subjects.length);

  return (
    <EditableContent
      formId={IDs.WORK_SUBJECTS}
      validationSchema={subjectsValidationSchema}
      onSubmit={update}
      defaultValues={{ [SUBJECTS.name]: defaultValues }}
      formFields={({ control }) => (
        <FormFields
          recommended={recommended}
          control={control as unknown as Control<SubjectsFormType>}
          onClose={close}
          onDelete={deleteSubject}
        />
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={SUBJECTS.label}
          onEdit={onEdit}
          disabled={disabled}
          value={placeholder}
          recommended={recommended}
          tooltip="Theme subject is recommended"
          editButtonClassName="mt-3.5 lg:mt-2"
        >
          {placeholder && (
            <div className="flex flex-col gap-[var(--default-gap)]">
              <ul className={`flex w-full flex-col ${isExpanded ? 'gap-0' : 'gap-[var(--default-gap)]'}`}>
                <Activity mode={isExpanded || subjects.length < 10 ? 'visible' : 'hidden'}>
                  {data.map(({ subjects, text }, index) => (
                    <Fragment key={index}>
                      <PreviewList subjects={subjects} onDelete={deleteSubject} />
                      <AddButton onAdd={() => {}} className="capitalize">
                        {text}
                      </AddButton>
                    </Fragment>
                  ))}
                </Activity>
                <Activity mode={!isExpanded && subjects.length > 10 ? 'visible' : 'hidden'}>
                  {bicubSubjects.length > 0 && (
                    <ShrinkedListItem subjects={bicubSubjects} type={SubjectTypes.enum.Bic} />
                  )}
                  {bisacSubjects.length > 0 && (
                    <ShrinkedListItem subjects={bisacSubjects} type={SubjectTypes.enum.Bisac} />
                  )}
                  {customSubjects.length > 0 && (
                    <ShrinkedListItem subjects={customSubjects} type={SubjectTypes.enum.Custom} />
                  )}
                  {keywordSubjects.length > 0 && (
                    <ShrinkedListItem subjects={keywordSubjects} type={SubjectTypes.enum.Keyword} />
                  )}
                  {lccSubjects.length > 0 && <ShrinkedListItem subjects={lccSubjects} type={SubjectTypes.enum.Lcc} />}
                  {themaSubjects.length > 0 && (
                    <ShrinkedListItem subjects={themaSubjects} type={SubjectTypes.enum.Thema} />
                  )}
                </Activity>
              </ul>

              {subjects.length > 10 && (
                <IconButton onClick={() => setIsExpanded(!isExpanded)} className="m-auto mt-4">
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
            </div>
          )}
        </Preview>
      )}
    />
  );
};

export default EditSubjects;
