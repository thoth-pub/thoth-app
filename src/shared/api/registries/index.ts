import { createFragmentRegistry } from '@apollo/client/cache';

import { WORK_FRAGMENT } from '../fragments';

export const fragmentRegistry = createFragmentRegistry();

fragmentRegistry.register(WORK_FRAGMENT);
