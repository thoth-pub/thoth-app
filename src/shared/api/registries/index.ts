import { createFragmentRegistry } from '@apollo/client/cache';

import { AFFILIATION_FRAGMENT, CONTRIBUTOR_FRAGMENT, LANGUAGE_FRAGMENT, WORK_FRAGMENT } from '../fragments';

export const fragmentRegistry = createFragmentRegistry();

fragmentRegistry.register(AFFILIATION_FRAGMENT, WORK_FRAGMENT, CONTRIBUTOR_FRAGMENT, LANGUAGE_FRAGMENT);
