'use client';

import { createActorContext } from '@xstate/react';

import { subjectStateMachine } from './subject.state-machine';

export const SubjectStateMachineContext = createActorContext(subjectStateMachine);
