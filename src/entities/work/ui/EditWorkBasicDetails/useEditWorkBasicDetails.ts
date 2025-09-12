'use client';

import { FormFieldOption, type QueryToken } from '@/src/shared';

import useWork from '../../api/hooks/useWork';
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

type UseEditWorkBasicDetailsProps = {
  licenseOptions: FormFieldOption[];
  workId: WorkId;
  queryToken: QueryToken;
};

export const useEditWorkBasicDetails = ({ workId, queryToken, licenseOptions }: UseEditWorkBasicDetailsProps) => {
  const { work, updateWork, toDto } = useWork(workId, queryToken);
  const defaultLicense = licenseOptions.find((option) => option.value === work.license) ?? licenseOptions[0];

  const changeWorkType = ({ workType }: WorkTypeForm) => {
    const data = toDto({ ...work, type: workType as WorkType });

    updateWork({
      variables: {
        data,
      },
    });
  };

  const changeEdition = ({ edition }: EditionForm) => {
    const data = toDto({ ...work, edition });

    updateWork({
      variables: {
        data,
      },
    });
  };

  const changeImprint = ({ imprintId }: ImprintForm) => {
    const data = toDto({ ...work, imprintId });

    updateWork({
      variables: {
        data,
      },
    });
  };

  const changeLicense = ({ license }: LicenseForm) => {
    const data = toDto({ ...work, license: license.value });

    updateWork({
      variables: {
        data,
      },
    });
  };

  const changeCopyrightHolder = ({ copyrightHolder }: CopyrightHolderForm) => {
    const data = toDto({ ...work, copyrightHolder });

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
    defaultLicense,
    work,
    changeWorkType,
    changeEdition,
    changeImprint,
    changeLicense,
    changeCopyrightHolder,
    changeLandingPage,
    changeCoverUrl,
  };
};
