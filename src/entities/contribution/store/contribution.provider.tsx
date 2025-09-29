'use client';

import { createActorContext } from '@xstate/react';

import { contributionStateMachine } from './contribution.state-machine';

export const ContributionStateMachineContext = createActorContext(contributionStateMachine);
