import { createFragmentRegistry } from '@apollo/client/cache';

import {
  AFFILIATION_FRAGMENT,
  CONTRIBUTOR_FRAGMENT,
  LANGUAGE_FRAGMENT,
  PUBLICATION_FRAGMENT,
  REFERENCE_FRAGMENT,
  WORK_FRAGMENT,
} from '../fragments';

export const fragmentRegistry = createFragmentRegistry();

fragmentRegistry.register(
  AFFILIATION_FRAGMENT,
  CONTRIBUTOR_FRAGMENT,
  LANGUAGE_FRAGMENT,
  PUBLICATION_FRAGMENT,
  REFERENCE_FRAGMENT,
  WORK_FRAGMENT,
);
