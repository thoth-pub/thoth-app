'use client';

import { createActorContext } from '@xstate/react';

import { workChaptersStateMachine } from './work.state-machine';

export const WorkChaptersStateMachineContext = createActorContext(workChaptersStateMachine);
