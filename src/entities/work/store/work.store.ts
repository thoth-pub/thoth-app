'use client';

import { createEntityStateMachine } from '@/src/shared';

import type { WorkEntity } from '../model/work.types';

export const { useStateMachine: useWorkStateMachine, StateMachineContext: WorkStateMachineContext } =
  createEntityStateMachine<WorkEntity[]>('workEditor');
