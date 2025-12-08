import { useWork } from '@/src/entities/work';
import { BaseEditSectionProps, isDefaultId, SubjectTypes } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

import useCreateSubject from '../../api/hooks/useCreateSubject';
import useDeleteSubject from '../../api/hooks/useDeleteSubject';
import useUpdateSubject from '../../api/hooks/useUpdateSubject';
import type { SubjectsFormType, SubjectType } from '../../model/subject.types';

const { SUBJECT_TYPE, SUBJECT_CODE, SUBJECT_CODE_ALT } = FORM_FIELDS;

export const useEditSubjects = (props: BaseEditSectionProps & { onUpdate?: (data: SubjectsFormType) => void }) => {
  const { workId, queryToken, onUpdate } = props;

  const { work } = useWork(workId, queryToken);
  const { close } = useFormStateMachine();

  const { createSubject } = useCreateSubject({ workId, queryToken });
  const { deleteSubject: deleteSubjectMutation } = useDeleteSubject({ workId, queryToken });
  const { updateSubject } = useUpdateSubject({ workId, queryToken });

  const update = async (data: SubjectsFormType) => {
    const newSubjects = data.subjects
      .filter((subject) => isDefaultId(subject.subjectId))
      .map((subject) => {
        const altCode = subject[SUBJECT_CODE_ALT.name];
        const isCustomCode =
          subject[SUBJECT_TYPE.name] === SubjectTypes.enum.Custom ||
          subject[SUBJECT_TYPE.name] === SubjectTypes.enum.Keyword;
        const subjectCode = {
          value: isCustomCode ? altCode : subject[SUBJECT_CODE.name]?.value,
          label: subject[SUBJECT_CODE.name]?.label,
        };

        return {
          ...subject,
          [SUBJECT_CODE.name]: subjectCode,
        };
      });
    const existingSubjects = data.subjects
      .filter((subject) => !isDefaultId(subject.subjectId))
      .map((subject) => {
        const altCode = subject[SUBJECT_CODE_ALT.name];
        const isCustomCode =
          subject[SUBJECT_TYPE.name] === SubjectTypes.enum.Custom ||
          subject[SUBJECT_TYPE.name] === SubjectTypes.enum.Keyword;
        const subjectCode = {
          value: isCustomCode ? altCode : subject[SUBJECT_CODE.name]?.value,
          label: subject[SUBJECT_CODE.name]?.label,
        };

        return {
          ...subject,
          [SUBJECT_CODE.name]: subjectCode,
        };
      });

    if (onUpdate) {
      onUpdate(data);
      return;
    }

    const updatedSubjects = existingSubjects.filter((subject) => {
      const existingSubject = work.subjects.find((workSubject) => workSubject.id === subject.subjectId);

      if (!existingSubject) return false;

      return (
        existingSubject.type !== subject[SUBJECT_TYPE.name] ||
        existingSubject.code !== subject[SUBJECT_CODE.name]?.value
      );
    });

    await Promise.all(
      newSubjects.map(async (subject) => {
        const code = subject[SUBJECT_CODE.name]?.value;

        if (!code) return;

        await createSubject({
          id: '',
          code,
          type: subject[SUBJECT_TYPE.name] as SubjectType,
          ordinal: work.subjects.length + 1,
        });
      }),
    );

    await Promise.all(
      updatedSubjects.map(async (subject) => {
        const code = subject[SUBJECT_CODE.name]?.value;

        if (!code) return;

        await updateSubject({
          id: subject.subjectId,
          code,
          type: subject[SUBJECT_TYPE.name] as SubjectType,
          ordinal: work.subjects.length + 1,
        });
      }),
    );
  };

  const deleteSubject = async (id: string) => {
    if (isDefaultId(id)) return;

    const item = work.subjects.find((item) => item.id === id);

    if (!item) return;

    await deleteSubjectMutation(id);
  };

  const create = async (data: { type: SubjectType; code: string }) => {
    const { type, code } = data;

    const sameTypeSubjects = work.subjects.filter((subject) => subject.type === type);
    let maxOrdinal = 1;

    sameTypeSubjects.forEach((subject) => {
      if (subject.ordinal > maxOrdinal) {
        maxOrdinal = subject.ordinal;
      }
    });

    await createSubject({
      id: '',
      code,
      type,
      ordinal: maxOrdinal > 1 ? maxOrdinal + 1 : 1,
    });
  };

  return {
    subjects: work.subjects ?? [],
    create,
    update,
    deleteSubject,
    close,
  };
};
