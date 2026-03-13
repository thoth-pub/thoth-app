'use client';

import { createEntityStateMachine } from '@/src/shared/store';

import type { AdditionalResourceEntity } from '../model/additional-resource.types';

export const {
  useStateMachine: useAdditionalResourceStateMachine,
  StateMachineContext: AdditionalResourceStateMachineContext,
} = createEntityStateMachine<AdditionalResourceEntity>('additionalResourceEditor');
