'use client';

import { createActorContext } from '@xstate/react';

import { fundingStateMachine } from './funding.state-machine';

export const FundingStateMachineContext = createActorContext(fundingStateMachine);
