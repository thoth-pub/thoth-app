import { assign, setup } from 'xstate';

import type { SubjectEntity } from '../model/subject.types';

type SubjectContext = {
  activeSubject: SubjectEntity | null;
};

export const subjectStateMachine = setup({
  types: {
    events: {} as { type: 'setActiveSubject'; subject: SubjectContext['activeSubject'] } | { type: 'close' },
  },
}).createMachine({
  id: 'subjectEditor',
  context: {
    activeSubject: null,
  } as SubjectContext,
  initial: 'init',
  states: {
    init: {
      on: {
        setActiveSubject: {
          target: 'editing',
          actions: assign({
            activeSubject: ({ event }) => event?.subject ?? null,
          }),
        },
      },
    },
    editing: {
      on: { close: { target: 'init', actions: assign({ activeSubject: () => null }) } },
    },
  },
});
