'use client';

import { useState } from 'react';

import { type BaseRecommendedSectionProps, convertOptionToString, SubjectTypes } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { AddButton, ContentWrapper, InputLabel, TranslatedContent } from '@/src/shared/ui';

import useMoveSubjects from '../../api/hooks/useMoveSubjects';
import type { SubjectEntity, SubjectType } from '../../model/subject.types';
import { NewSubjectModal } from './components/NewSubjectModal';
import { PreviewList } from './components/PreviewList';
import { useEditSubjects } from './useEditSubjects';

const { SUBJECTS } = FORM_FIELDS;

const EditSubjects = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { editDisabled, activeSubject, subjects, deleteSubject, create, edit } = useEditSubjects({ workId });
  const { moveSubjects } = useMoveSubjects({ workId });
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    <ContentWrapper className="gap-y-(--default-gap) p-4">
      <InputLabel>
        <TranslatedContent content={SUBJECTS.label} namespace={NAMESPACES.enum.forms} />
      </InputLabel>
      {placeholder ? (
        <div className="flex w-full flex-col gap-(--default-gap)">
          <ul className="flex w-full flex-col gap-0">
            {data.map(({ subjects }, index) => (
              <PreviewList
                workId={workId}
                activeSubjectId={activeSubject?.id ?? ''}
                isEditDisabled={editDisabled}
                key={index}
                subjects={subjects}
                onDelete={deleteSubject}
                onDragEnd={handleMove}
                onEdit={edit}
              />
            ))}
            <AddButton onAdd={handleModalState} className="capitalize xl:-ml-4">
              <TranslatedContent content="actions.addSubject" />
            </AddButton>
          </ul>
        </div>
      ) : (
        <AddButton onAdd={handleModalState} className="py-0 capitalize xl:-ml-4">
          <TranslatedContent content="actions.addSubject" />
        </AddButton>
      )}
      <NewSubjectModal open={isModalOpen} onClose={handleModalState} onAdd={handleAddNewSubject} />
    </ContentWrapper>
  );
};

export default EditSubjects;
