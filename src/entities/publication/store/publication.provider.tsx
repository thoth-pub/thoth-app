'use client';

import { createActorContext } from '@xstate/react';

import { publicationStateMachine } from './publication.state-machine';

export const PublicationsStateMachineContext = createActorContext(publicationStateMachine);
