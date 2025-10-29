import { assign, setup } from 'xstate';

import type { SeriesEntity } from '../model/series.types';

type SeriesContext = {
  activeSeries: SeriesEntity | null;
};

export const seriesStateMachine = setup({
  types: {
    events: {} as { type: 'setActiveSeries'; series: SeriesContext['activeSeries'] } | { type: 'close' },
  },
}).createMachine({
  id: 'seriesEditor',
  context: {
    activeSeries: null,
  } as SeriesContext,
  initial: 'init',
  states: {
    init: {
      on: {
        setActiveSeries: {
          target: 'editing',
          actions: assign({
            activeSeries: ({ event }) => event?.series ?? null,
          }),
        },
      },
    },
    editing: {
      on: { close: { target: 'init', actions: assign({ activeSeries: () => null }) } },
    },
  },
});
