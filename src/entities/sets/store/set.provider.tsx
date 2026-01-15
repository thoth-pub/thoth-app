'use client';

import { createActorContext } from '@xstate/react';

import { setStateMachine } from './set.state-machine';

export const SetStateMachineContext = createActorContext(setStateMachine);
