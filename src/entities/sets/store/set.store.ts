'use client';

import { createEntityStateMachine } from '@/src/shared/store';

import type { SetEntity } from '../model/set.types';

export const { useStateMachine: useSetStateMachine, StateMachineContext: SetStateMachineContext } =
  createEntityStateMachine<SetEntity>('setEditor');
