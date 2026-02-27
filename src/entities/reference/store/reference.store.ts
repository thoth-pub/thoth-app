'use client';

import { createEntityStateMachine } from '@/src/shared';

import type { ReferenceEntity } from '../model/reference.types';

export const { useStateMachine: useReferenceStateMachine, StateMachineContext: ReferenceStateMachineContext } =
  createEntityStateMachine<ReferenceEntity>('referenceEditor');
