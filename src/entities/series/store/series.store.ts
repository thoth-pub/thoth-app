'use client';

import { createEntityStateMachine } from '@/src/shared/store';

import type { SeriesEntity } from '../model/series.types';

export const { useStateMachine: useSeriesStateMachine, StateMachineContext: SeriesStateMachineContext } =
  createEntityStateMachine<SeriesEntity>('seriesEditor');
