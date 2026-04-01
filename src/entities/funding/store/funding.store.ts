'use client';

import { createEntityStateMachine } from '@/src/shared/store';

import type { FundingEntity } from '../model/funding.types';

export const { useStateMachine: useFundingStateMachine, StateMachineContext: FundingStateMachineContext } =
  createEntityStateMachine<FundingEntity>('fundingEditor');
