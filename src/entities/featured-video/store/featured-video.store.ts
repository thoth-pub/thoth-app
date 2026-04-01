import { createEntityStateMachine } from '@/src/shared/store/storeFactory';

import { FeaturedVideoEntity } from '../model/featured-video.types';

export const {
  useStateMachine: useFeaturedVideoStateMachine,
  StateMachineContext: FeaturedVideoStateMachineContext,
} = createEntityStateMachine<FeaturedVideoEntity>('featuredVideoEditor');
