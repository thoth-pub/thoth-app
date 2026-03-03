import { useWork } from '@/src/entities/work';
import { IDs } from '@/src/shared/constants';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import type { BaseEditSectionProps } from '@/src/shared/types';
import { isDefaultId } from '@/src/shared/utils';

import useCreateSubject from '../../api/hooks/useCreateSubject';
import useDeleteSubject from '../../api/hooks/useDeleteSubject';
import type { SubjectId, SubjectType } from '../../model/subject.types';
import { useSubjectStateMachine } from '../../store/subject.store';

export const useEditSubjects = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { work } = useWork(workId);

  const { activeFormId, edit: editForm } = useFormStateMachine();
  const { activeEntity: activeSubject, edit, close: closeSubjectEdit } = useSubjectStateMachine();

  const { createSubject } = useCreateSubject({ workId });
  const { deleteSubject: deleteSubjectMutation } = useDeleteSubject();

  const deleteSubject = async (id: string) => {
    if (isDefaultId(id)) return;

    const item = work.subjects.find((item) => item.id === id);

    if (!item) return;

    await deleteSubjectMutation(id);
  };

  const create = async (data: { type: SubjectType; code: string }) => {
    const { type, code } = data;

    const sameTypeSubjects = work.subjects.filter((subject) => subject.type === type);
    let maxOrdinal = 0;

    sameTypeSubjects.forEach((subject) => {
      if (subject.ordinal > maxOrdinal) {
        maxOrdinal = subject.ordinal;
      }
    });

    await createSubject({
      id: '',
      code,
      type,
      ordinal: maxOrdinal ? maxOrdinal + 1 : 1,
    });
  };

  const editSubject = (id: SubjectId) => {
    const subject = work.subjects.find((subject) => subject.id === id);
    if (subject) {
      edit(subject);
    }

    if (!subject) return;

    closeSubjectEdit();
    editForm(IDs.WORK_SUBJECT);
    edit(subject);
  };

  return {
    activeSubject,
    subjects: work.subjects ?? [],
    create,
    deleteSubject,
    edit: editSubject,
    editDisabled: !!activeFormId,
  };
};
