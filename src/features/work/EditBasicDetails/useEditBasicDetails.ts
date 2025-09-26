'use client';

import { FormFieldOption, type QueryToken } from '@/src/shared';

import useWork from '../../../entities/work/api/hooks/useWork';
import type {
  CopyrightHolderForm,
  CoverUrlForm,
  EditionForm,
  LandingPageForm,
  LicenseForm,
  WorkId,
} from '../../../entities/work/model/work.types';

type UseEditWorkBasicDetailsProps = {
  licenseOptions: FormFieldOption[];
  workId: WorkId;
  queryToken: QueryToken;
};

export const useEditBasicDetails = ({ workId, queryToken, licenseOptions }: UseEditWorkBasicDetailsProps) => {
  const { work, updateWork, toDto } = useWork(workId, queryToken);
  const defaultLicense = licenseOptions.find((option) => option.value === work.license) ?? licenseOptions[0];

  const changeEdition = ({ edition }: EditionForm) => {
    const data = toDto({ ...work, edition });

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
    changeEdition,
    changeLicense,
    changeCopyrightHolder,
    changeLandingPage,
    changeCoverUrl,
  };
};
