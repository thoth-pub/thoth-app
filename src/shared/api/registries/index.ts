import { createFragmentRegistry } from '@apollo/client/cache';

import { CONTRIBUTOR_FRAGMENT,WORK_FRAGMENT } from '../fragments';

export const fragmentRegistry = createFragmentRegistry();

fragmentRegistry.register(WORK_FRAGMENT, CONTRIBUTOR_FRAGMENT);
