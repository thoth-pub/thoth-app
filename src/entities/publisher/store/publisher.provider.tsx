'use client';

import { createActorContext } from '@xstate/react';

import { publisherStateMachine } from './publisher.state-machine';

export const PublisherStateMachineContext = createActorContext(publisherStateMachine);
