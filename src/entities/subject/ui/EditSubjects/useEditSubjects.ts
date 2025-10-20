import { useWork } from '@/src/entities/work';
import { BaseEditSectionProps, isDefaultId } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';

import useCreateSubject from '../../api/hooks/useCreateSubject';
import useDeleteSubject from '../../api/hooks/useDeleteSubject';
import useUpdateSubject from '../../api/hooks/useUpdateSubject';
import type { SubjectsFormType, SubjectType } from '../../model/subject.types';

const { SUBJECT_TYPE, SUBJECT_CODE } = FORM_FIELDS;

export const useEditSubjects = (props: BaseEditSectionProps) => {
  const { workId, queryToken } = props;

  const { work } = useWork(workId, queryToken);
  const { close } = useFormStateMachine();

  const { createSubject } = useCreateSubject({ workId, queryToken });
  const { deleteSubject: deleteSubjectMutation } = useDeleteSubject({ workId, queryToken });
  const { updateSubject } = useUpdateSubject({ workId, queryToken });

  const update = (data: SubjectsFormType) => {
    const newSubjects = data.subjects.filter((subject) => isDefaultId(subject.subjectId));
    const existingSubjects = data.subjects.filter((subject) => !isDefaultId(subject.subjectId));

    const updatedSubjects = existingSubjects.filter((subject) => {
      const existingSubject = work.subjects.find((workSubject) => workSubject.id === subject.subjectId);

      if (!existingSubject) return false;

      return existingSubject.type !== subject[SUBJECT_TYPE.name] || existingSubject.code !== subject[SUBJECT_CODE.name];
    });

    newSubjects.forEach((subject) => {
      createSubject({
        code: subject[SUBJECT_CODE.name],
        type: subject[SUBJECT_TYPE.name] as SubjectType,
        ordinal: work.subjects.length + 1,
      });
    });

    updatedSubjects.forEach((subject) => {
      updateSubject({
        id: subject.subjectId,
        code: subject[SUBJECT_CODE.name],
        type: subject[SUBJECT_TYPE.name] as SubjectType,
        ordinal: work.subjects.length + 1,
      });
    });
  };

  const deleteSubject = (id: string) => {
    if (isDefaultId(id)) return;

    const item = work.subjects.find((item) => item.id === id);

    if (!item) return;

    deleteSubjectMutation(id);
  };

  return {
    subjects: work.subjects ?? [],
    update,
    deleteSubject,
    close,
  };
};
