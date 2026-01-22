'use client';

import { createActorContext } from '@xstate/react';

import { locationStateMachine } from './locational.state-machine';

export const LocationStateMachineContext = createActorContext(locationStateMachine);
