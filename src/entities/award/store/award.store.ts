'use client';

import { createEntityStateMachine } from '@/src/shared/store';

import type { AwardEntity } from '../model/award.types';

export const { useStateMachine: useAwardStateMachine, StateMachineContext: AwardStateMachineContext } =
  createEntityStateMachine<AwardEntity>('awardEditor');
