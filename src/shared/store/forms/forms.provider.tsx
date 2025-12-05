'use client';

// import { createBrowserInspector } from '@statelyai/inspect';
import { createActorContext } from '@xstate/react';

import { formStateMachine } from './forms.state-machine';

// const { inspect } = createBrowserInspector();

export const FormStateMachineContext = createActorContext(formStateMachine);
