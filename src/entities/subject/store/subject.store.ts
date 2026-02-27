'use client';

import { createEntityStateMachine } from '@/src/shared';

import { SubjectEntity } from '../model/subject.types';

export const { useStateMachine: useSubjectStateMachine, StateMachineContext: SubjectStateMachineContext } =
  createEntityStateMachine<SubjectEntity>('subjectEditor');
