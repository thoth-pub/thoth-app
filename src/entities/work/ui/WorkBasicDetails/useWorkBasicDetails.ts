'use client';

import { type QueryToken } from '@/src/shared';

import useWork from '../../api/hooks/useWork';
import { WorkDtoMapper } from '../../model/work.mapper';
import type {
  CopyrightHolderForm,
  CoverUrlForm,
  EditionForm,
  ImprintForm,
  LandingPageForm,
  LicenseForm,
  WorkId,
  WorkType,
  WorkTypeForm,
} from '../../model/work.types';

type UseWorkBasicDetailsProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

const mapper = new WorkDtoMapper();

export const useWorkBasicDetails = ({ workId, queryToken }: UseWorkBasicDetailsProps) => {
  const { work, updateWork } = useWork(workId, queryToken);

  const changeWorkType = ({ workType }: WorkTypeForm) => {
    const data = mapper.toDto({ ...work, type: workType as WorkType });

    updateWork({
      variables: {
        data,
      },
    });
  };

  const changeEdition = ({ edition }: EditionForm) => {
    const data = mapper.toDto({ ...work, edition });

    updateWork({
      variables: {
        data,
      },
    });
  };

  const changeImprint = ({ imprintId }: ImprintForm) => {
    const data = mapper.toDto({ ...work, imprintId });

    updateWork({
      variables: {
        data,
      },
    });
  };

  const changeLicense = ({ license }: LicenseForm) => {
    const data = mapper.toDto({ ...work, license });

    updateWork({
      variables: {
        data,
      },
    });
  };

  const changeCopyrightHolder = ({ copyrightHolder }: CopyrightHolderForm) => {
    const data = mapper.toDto({ ...work, copyrightHolder });

    updateWork({
      variables: {
        data,
      },
    });
  };

  const changeLandingPage = ({ landingPage }: LandingPageForm) => {
    const data = mapper.toDto({ ...work, landingPage });

    updateWork({
      variables: {
        data,
      },
    });
  };

  const changeCoverUrl = ({ coverUrl }: CoverUrlForm) => {
    const data = mapper.toDto({ ...work, coverUrl });

    updateWork({
      variables: {
        data,
      },
    });
  };

  return {
    changeWorkType,
    changeEdition,
    changeImprint,
    changeLicense,
    changeCopyrightHolder,
    changeLandingPage,
    changeCoverUrl,
    work,
  };
};
