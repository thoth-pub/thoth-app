'use client';

import { createEntityStateMachine } from '@/src/shared';

import type { LocationEntity } from '../model/location.types';

export const { useStateMachine: useLocationStateMachine, StateMachineContext: LocationStateMachineContext } =
  createEntityStateMachine<LocationEntity>('locationEditor');
