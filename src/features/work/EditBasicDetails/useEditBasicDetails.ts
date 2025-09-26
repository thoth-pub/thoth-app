'use client';

import { type QueryToken } from '@/src/shared';

import useWork from '../../../entities/work/api/hooks/useWork';
import type { CoverUrlForm, EditionForm, LandingPageForm, WorkId } from '../../../entities/work/model/work.types';

type UseEditWorkBasicDetailsProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

export const useEditBasicDetails = ({ workId, queryToken }: UseEditWorkBasicDetailsProps) => {
  const { work, updateWork, toDto } = useWork(workId, queryToken);

  const changeEdition = ({ edition }: EditionForm) => {
    const data = toDto({ ...work, edition });

    updateWork({
      variables: {
        data,
      },
    });
  };

  const changeLandingPage = ({ landingPage }: LandingPageForm) => {
    const data = toDto({ ...work, landingPage });

    updateWork({
      variables: {
        data,
      },
    });
  };

  const changeCoverUrl = ({ coverUrl }: CoverUrlForm) => {
    const data = toDto({ ...work, coverUrl });

    updateWork({
      variables: {
        data,
      },
    });
  };

  return {
    work,
    changeEdition,
    changeLandingPage,
    changeCoverUrl,
  };
};
