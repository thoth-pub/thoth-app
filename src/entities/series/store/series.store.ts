'use client';

import { createEntityStateMachine } from '@/src/shared';

import type { SeriesEntity } from '../model/series.types';

export const { useStateMachine: useSeriesStateMachine, StateMachineContext: SeriesStateMachineContext } =
  createEntityStateMachine<SeriesEntity>('seriesEditor');
