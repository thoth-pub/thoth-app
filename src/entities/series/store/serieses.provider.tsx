'use client';

import { createActorContext } from '@xstate/react';

import { seriesStateMachine } from './serieses.state-machine';

export const SeriesStateMachineContext = createActorContext(seriesStateMachine);
