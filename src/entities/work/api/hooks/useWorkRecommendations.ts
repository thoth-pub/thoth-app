import { isAllContributionRecommendationsFilled, isAllFundingRecommendationsFilled, SubjectTypes } from '@/src/shared';

import useWork from './useWork';

type UseWorkRecommendationsProps = {
  workId: string;
};

const useWorkRecommendations = (props: UseWorkRecommendationsProps) => {
  const { workId } = props;

  const { work } = useWork(workId);

  const isTitleRequired = work && work.titles.length === 0;

  const isDoiRequired = !work.doi || work.doi.length === 0;

  const isLandingPageRequired = !work.landingPage || work.landingPage.length === 0;

  const isCoverUrlRequired = !work.coverUrl || work.coverUrl.length === 0;

  const isPageCountRequired = work.pageCount === 0;

  const isLanguagesRequired = work.languages.length === 0;

  const isSubjectsRequired =
    work.subjects.length === 0 || work.subjects.some((subject) => subject.type !== SubjectTypes.enum.Thema);

  const isFundingsEmpty = work.fundings.length === 0;

  const isFundingsRequired = isFundingsEmpty || work.fundings.some(isAllFundingRecommendationsFilled);

  const isContributionsEmpty = work.contributions.length === 0;

  const isContributionsRequired =
    isContributionsEmpty || work.contributions.some(isAllContributionRecommendationsFilled);

  const isEmpty =
    isTitleRequired &&
    isDoiRequired &&
    isLandingPageRequired &&
    isCoverUrlRequired &&
    isPageCountRequired &&
    isLanguagesRequired &&
    isContributionsRequired &&
    isSubjectsRequired &&
    isFundingsRequired;

  const isAllInformationFilled =
    !isTitleRequired &&
    !isDoiRequired &&
    !isLandingPageRequired &&
    !isCoverUrlRequired &&
    !isPageCountRequired &&
    !isLanguagesRequired &&
    !isContributionsRequired &&
    !isSubjectsRequired &&
    !isFundingsRequired;

  const isBasicDetailsSectionEmpty = isTitleRequired && isDoiRequired && isLandingPageRequired && isCoverUrlRequired;

  const isBasicDetailsSectionFilled =
    !isTitleRequired && !isDoiRequired && !isLandingPageRequired && !isCoverUrlRequired;

  const isDescriptionsSectionEmpty = isPageCountRequired && isLanguagesRequired && isSubjectsRequired;

  const isDescriptionsSectionFilled = !isPageCountRequired && !isLanguagesRequired && !isSubjectsRequired;

  return {
    isAllInformationFilled,
    isEmpty,
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
