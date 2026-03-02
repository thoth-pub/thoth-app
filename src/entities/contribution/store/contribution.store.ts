'use client';

import { createEntityStateMachine } from '@/src/shared';

import type { WorkContribution } from '../model/contribution.types';

export const { useStateMachine: useContributionStateMachine, StateMachineContext: ContributionStateMachineContext } =
  createEntityStateMachine<WorkContribution>('contributionEditor');
