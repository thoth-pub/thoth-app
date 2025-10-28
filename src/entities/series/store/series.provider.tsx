'use client';

import { createActorContext } from '@xstate/react';

import { seriesStateMachine } from './series.state-machine';

export const SeriesStateMachineContext = createActorContext(seriesStateMachine);
