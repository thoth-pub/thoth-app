import { SubjectTypes } from '@/src/shared';

import useWork from './useWork';

type UseWorkRecommendationsProps = {
  workId: string;
};

const useWorkRecommendations = (props: UseWorkRecommendationsProps) => {
  const { workId } = props;

  const { work } = useWork(workId, '');

  const isTitleRequired = work && work.title.length === 0;

  const isEditionRequired = work && (!work.edition || work.edition === 0);

  const isImprintRequired = work && work.imprintId === null;

  const isDoiRequired = work && (!work.doi || work.doi.length === 0);

  const isLandingPageRequired = work && (!work.landingPage || work.landingPage.length === 0);

  const isCoverUrlRequired = work && (!work.coverUrl || work.coverUrl.length === 0);

  const isPageCountRequired = work && work.pageCount === 0;

  const isLanguagesRequired = work && work.languages.length === 0;

  const isSubjectsRequired =
    (work && work.subjects.length === 0) || work.subjects.some((subject) => subject.type !== SubjectTypes.enum.Thema);

  const isFundingsEmpty = work && work.fundings.length === 0;

  const isFundingsRequired = isFundingsEmpty || work.fundings.some((funding) => funding.grantNumber.length === 0);

  const isContributionsEmpty = work && work.contributions.length === 0;

  const isContributionsRequired =
    isContributionsEmpty ||
    work.contributions.some(
      (contribution) =>
        !contribution.biography ||
        !contribution.fullName ||
        !contribution.lastName ||
        !contribution.firstName ||
        contribution.affiliations.length === 0,
    );

  const informationForCheck = [
    isTitleRequired,
    isEditionRequired,
    isImprintRequired,
    isDoiRequired,
    isLandingPageRequired,
    isCoverUrlRequired,
    isPageCountRequired,
    isLanguagesRequired,
    isContributionsRequired,
    isSubjectsRequired,
    isFundingsRequired,
  ];

  const isAllInformationFilled = informationForCheck.every(Boolean);

  const isEmpty = informationForCheck.every((value) => value === false);

  const basicDetailsSection = [
    isTitleRequired,
    isEditionRequired,
    isImprintRequired,
    isDoiRequired,
    isLandingPageRequired,
    isCoverUrlRequired,
  ];

  const isBasicDetailsSectionEmpty = basicDetailsSection.every((value) => value === false);

  const isBasicDetailsSectionFilled = basicDetailsSection.every(Boolean);

  const descriptionsSection = [isPageCountRequired, isLanguagesRequired, isSubjectsRequired];

  const isDescriptionsSectionEmpty = descriptionsSection.every((value) => value === false);

  const isDescriptionsSectionFilled = descriptionsSection.every(Boolean);

  return {
    isAllInformationFilled,
    isEmpty,
    isTitleRequired,
    isEditionRequired,
    isImprintRequired,
    isDoiRequired,
    isLandingPageRequired,
    isCoverUrlRequired,
    isBasicDetailsSectionEmpty,
    isBasicDetailsSectionFilled,
    isDescriptionsSectionEmpty,
    isDescriptionsSectionFilled,
    isPageCountRequired,
    isLanguagesRequired,
    isContributionsEmpty,
    isContributionsRequired,
    isSubjectsRequired,
    isFundingsEmpty,
    isFundingsRequired,
  };
};

export default useWorkRecommendations;
