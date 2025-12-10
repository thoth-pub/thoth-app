'use client';

import { useState } from 'react';
import type { Control } from 'react-hook-form';

import { type BaseRecommendedSectionProps, convertOptionToString, IDs, SubjectTypes } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { AddButton, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { BIC_CODES } from '@/src/shared/utils/subjects/bic-codes';
import { BISAC_CODES } from '@/src/shared/utils/subjects/bisac-codes';
import { THEMA_CODES } from '@/src/shared/utils/subjects/thema-codes';

import useMoveSubjects from '../../api/hooks/useMoveSubjects';
import type { SubjectEntity, SubjectsFormType, SubjectType } from '../../model/subject.types';
import { subjectsValidationSchema } from '../../model/subject.validation';
import { FormFields } from './components/FormFields';
import { NewSubjectModal } from './components/NewSubjectModal';
import { PreviewList } from './components/PreviewList';
import { useEditSubjects } from './useEditSubjects';

const { SUBJECTS, SUBJECT_TYPE, SUBJECT_CODE, SUBJECT_CODE_ALT } = FORM_FIELDS;

const codes = {
  [SubjectTypes.enum.Bic]: BIC_CODES,
  [SubjectTypes.enum.Bisac]: BISAC_CODES,
  [SubjectTypes.enum.Thema]: THEMA_CODES,
};

const EditSubjects = (props: BaseRecommendedSectionProps) => {
  const { workId, recommended = false } = props;

  const { subjects, update, deleteSubject, close, create } = useEditSubjects({ workId });
  const { moveSubjects } = useMoveSubjects({ workId });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const defaultValues = subjects.map((subject) => {
    const category = codes[subject.type as keyof typeof codes];

    const defaultSubject = {
      subjectId: subject.id,
      [SUBJECT_TYPE.name]: subject.type as SubjectType,
      [SUBJECT_CODE.name]: { value: subject.code, label: subject.code },
      [SUBJECT_CODE_ALT.name]: subject.code,
    };

    if (!category) {
      return defaultSubject;
    }

    const label = `${category[subject.code as keyof typeof category]} (${subject.code})`;

    return {
      subjectId: subject.id,
      [SUBJECT_TYPE.name]: subject.type as SubjectType,
      [SUBJECT_CODE.name]: { value: subject.code, label },
      [SUBJECT_CODE_ALT.name]: subject.code,
    };
  });

  const placeholder =
    subjects.length > 0
      ? subjects.map(({ code, type }) => `${code} | ${convertOptionToString(type)}`).join(', ')
      : undefined;

  const bicubSubjects = subjects
    .filter((subject) => subject.type === SubjectTypes.enum.Bic)
    .sort((a, b) => a.ordinal - b.ordinal);

  const bisacSubjects = subjects
    .filter((subject) => subject.type === SubjectTypes.enum.Bisac)
    .sort((a, b) => a.ordinal - b.ordinal);

  const customSubjects = subjects
    .filter((subject) => subject.type === SubjectTypes.enum.Custom)
    .sort((a, b) => a.ordinal - b.ordinal);

  const keywordSubjects = subjects
    .filter((subject) => subject.type === SubjectTypes.enum.Keyword)
    .sort((a, b) => a.ordinal - b.ordinal);

  const lccSubjects = subjects
    .filter((subject) => subject.type === SubjectTypes.enum.Lcc)
    .sort((a, b) => a.ordinal - b.ordinal);

  const themaSubjects = subjects
    .filter((subject) => subject.type === SubjectTypes.enum.Thema)
    .sort((a, b) => a.ordinal - b.ordinal);

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

  const handleDelete = (id: string) => {
    if (subjects.length === 1) {
      setIsModalOpen(false);
      close();
    }
    deleteSubject(id);
  };

  const handleModalState = () => {
    setIsModalOpen((prev) => !prev);
  };

  const handleAddNewSubject = (value: { type: SubjectType; code: string }) => {
    create(value);
    handleModalState();
  };

  const handleMove = (subjects: SubjectEntity[]) => {
    const updatedSubjects = subjects.map((subject, index) => {
      return {
        ...subject,
        ordinal: index + 1,
      };
    });

    const existingSubjects = subjects.filter((subject) => subject.type === updatedSubjects[0].type);

    const firstUpdatedSubject = updatedSubjects.find((subject) => {
      return existingSubjects.find(
        (existingSubjects) => existingSubjects.id === subject.id && existingSubjects.ordinal !== subject.ordinal,
      );
    });

    if (!firstUpdatedSubject) return;

    moveSubjects({ subjectId: firstUpdatedSubject.id, newOrdinal: firstUpdatedSubject.ordinal });
  };

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
          onDelete={handleDelete}
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
            <div className="flex w-full flex-col gap-[var(--default-gap)]">
              <ul className="flex w-full flex-col gap-0">
                {data.map(({ subjects }, index) => (
                  <PreviewList key={index} subjects={subjects} onDelete={deleteSubject} onDragEnd={handleMove} />
                ))}
                <AddButton onAdd={handleModalState} className="capitalize">
                  add new subject
                </AddButton>
                <NewSubjectModal open={isModalOpen} onClose={handleModalState} onAdd={handleAddNewSubject} />
              </ul>
            </div>
          )}
        </Preview>
      )}
    />
  );
};

export default EditSubjects;
