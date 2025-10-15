'use client';

import { createActorContext } from '@xstate/react';

import { referenceStateMachine } from './reference.state-machine';

export const ReferenceStateMachineContext = createActorContext(referenceStateMachine);
