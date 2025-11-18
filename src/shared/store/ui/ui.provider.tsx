'use client';

import { createActorContext } from '@xstate/react';

import { uiStateMachine } from './ui.state-machine';

export const UiStateMachineContext = createActorContext(uiStateMachine);
