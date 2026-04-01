'use client';

import { createEntityStateMachine } from '@/src/shared/store';

import type { EndorsementEntity } from '../model/endorsement.types';

export const { useStateMachine: useEndorsementStateMachine, StateMachineContext: EndorsementStateMachineContext } =
  createEntityStateMachine<EndorsementEntity>('endorsementEditor');
