'use client';

import { AdditionalResourceStateMachineContext } from '@/src/entities/additional-resource';
import { AwardStateMachineContext } from '@/src/entities/award';
import { BookReviewStateMachineContext } from '@/src/entities/book-review';
import { ContributionStateMachineContext } from '@/src/entities/contribution';
import { EndorsementStateMachineContext } from '@/src/entities/endorsement';
import { FeaturedVideoStateMachineContext } from '@/src/entities/featured-video';
import { FundingStateMachineContext } from '@/src/entities/funding';
import { LocationStateMachineContext } from '@/src/entities/locations';
import { PublicationsStateMachineContext } from '@/src/entities/publication';
import { PublisherStateMachineContext } from '@/src/entities/publisher';
import { ReferenceStateMachineContext } from '@/src/entities/reference';
import { SeriesStateMachineContext } from '@/src/entities/series';
import { SetStateMachineContext } from '@/src/entities/sets';
import { SubjectStateMachineContext } from '@/src/entities/subject';
import { WorkStateMachineContext } from '@/src/entities/work';
import { ServicesProvider } from '@/src/shared/context';
import FormBlockedFeedback from '@/src/shared/store/forms/FormBlockedFeedback';
import { FormStateMachineContext } from '@/src/shared/store/forms/forms.provider';
import { RouteChangeHandler } from '@/src/shared/store/RouteChangeHandler';
import { UIProvider } from '@/src/shared/store/ui/ui.context';
import { composeProviders } from '@/src/shared/utils';

const ComposedProviders = composeProviders(
  PublisherStateMachineContext.Provider,
  FormStateMachineContext.Provider,
  ContributionStateMachineContext.Provider,
  PublicationsStateMachineContext.Provider,
  FundingStateMachineContext.Provider,
  ReferenceStateMachineContext.Provider,
  AdditionalResourceStateMachineContext.Provider,
  AwardStateMachineContext.Provider,
  BookReviewStateMachineContext.Provider,
  EndorsementStateMachineContext.Provider,
  FeaturedVideoStateMachineContext.Provider,
  SeriesStateMachineContext.Provider,
  WorkStateMachineContext.Provider,
  SetStateMachineContext.Provider,
  SubjectStateMachineContext.Provider,
  LocationStateMachineContext.Provider,
  UIProvider,
  ServicesProvider,
);

const StoreProvider = ({ children }: { children: React.ReactNode }) => (
  <ComposedProviders>
    <RouteChangeHandler />
    <FormBlockedFeedback />
    {children}
  </ComposedProviders>
);

export default StoreProvider;
