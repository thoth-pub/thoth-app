'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { AdditionalResourceStateMachineContext } from '@/src/entities/additional-resource';
import { AwardStateMachineContext } from '@/src/entities/award';
import { BookReviewStateMachineContext } from '@/src/entities/book-review';
import { ContributionStateMachineContext } from '@/src/entities/contribution';
import { EndorsementStateMachineContext } from '@/src/entities/endorsement';
import { FeaturedVideoStateMachineContext } from '@/src/entities/featured-video';
import { FundingStateMachineContext } from '@/src/entities/funding';
import { LocationStateMachineContext } from '@/src/entities/locations';
import { PublicationsStateMachineContext } from '@/src/entities/publication';
import { ReferenceStateMachineContext } from '@/src/entities/reference';
import { SeriesStateMachineContext } from '@/src/entities/series';
import { SetStateMachineContext } from '@/src/entities/sets';
import { SubjectStateMachineContext } from '@/src/entities/subject';
import { WorkStateMachineContext } from '@/src/entities/work';

import { FormStateMachineContext } from './forms/forms.provider';

export const RouteChangeHandler = () => {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  const formActor = FormStateMachineContext.useActorRef();
  const contributionActor = ContributionStateMachineContext.useActorRef();
  const publicationsActor = PublicationsStateMachineContext.useActorRef();
  const fundingActor = FundingStateMachineContext.useActorRef();
  const referenceActor = ReferenceStateMachineContext.useActorRef();
  const additionalResourceActor = AdditionalResourceStateMachineContext.useActorRef();
  const awardActor = AwardStateMachineContext.useActorRef();
  const bookReviewActor = BookReviewStateMachineContext.useActorRef();
  const endorsementActor = EndorsementStateMachineContext.useActorRef();
  const featuredVideoActor = FeaturedVideoStateMachineContext.useActorRef();
  const seriesActor = SeriesStateMachineContext.useActorRef();
  const workActor = WorkStateMachineContext.useActorRef();
  const setActor = SetStateMachineContext.useActorRef();
  const subjectActor = SubjectStateMachineContext.useActorRef();
  const locationActor = LocationStateMachineContext.useActorRef();

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;

      formActor.send({ type: 'close' });
      contributionActor.send({ type: 'close' });
      publicationsActor.send({ type: 'close' });
      fundingActor.send({ type: 'close' });
      referenceActor.send({ type: 'close' });
      additionalResourceActor.send({ type: 'close' });
      awardActor.send({ type: 'close' });
      bookReviewActor.send({ type: 'close' });
      endorsementActor.send({ type: 'close' });
      featuredVideoActor.send({ type: 'close' });
      seriesActor.send({ type: 'close' });
      workActor.send({ type: 'close' });
      setActor.send({ type: 'close' });
      subjectActor.send({ type: 'close' });
      locationActor.send({ type: 'close' });
    }
  }, [
    pathname,
    formActor,
    contributionActor,
    publicationsActor,
    fundingActor,
    referenceActor,
    additionalResourceActor,
    awardActor,
    bookReviewActor,
    endorsementActor,
    featuredVideoActor,
    seriesActor,
    workActor,
    setActor,
    subjectActor,
    locationActor,
  ]);

  return null;
};
