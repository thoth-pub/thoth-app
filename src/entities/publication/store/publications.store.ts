'use client';

import { createEntityStateMachine } from '@/src/shared/store';

import type { PublicationEntity } from '../model/publication.types';

export const { useStateMachine: usePublicationsStateMachine, StateMachineContext: PublicationsStateMachineContext } =
  createEntityStateMachine<PublicationEntity>('publicationsEditor');
