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

  // issue ordinal req
  // const isIssueOrdinalRequired = work && work.issueOrdinal === null;

  const isPageCountRequired = work && work.pageCount === 0;

  const isLanguagesRequired = work && work.languages.length === 0;

  const isSubjectsRequired =
    (work && work.subjects.length === 0) || work.subjects.some((subject) => subject.type !== SubjectTypes.enum.Thema);

  const isFundingsRequired =
    work && work.fundings.length > 0 && work.fundings.some((funding) => funding.grantNumber.length === 0);

  // contributions rec
  const isContributionsRequired =
    (work && work.contributions.length === 0) ||
    work.contributions.some(
      (contribution) =>
        !contribution.biography ||
        !contribution.fullName ||
        !contribution.lastName ||
        !contribution.firstName ||
        contribution.affiliations.length === 0,
    );

  const isAllInformationFilled = [
    isTitleRequired,
    isEditionRequired,
    // isWorkTypeRequired,
    isImprintRequired,
    // isLicenseRequired,
    isDoiRequired,
    isLandingPageRequired,
    isCoverUrlRequired,
    // isIssueOrdinalRequired,
    isPageCountRequired,
    isLanguagesRequired,
    isContributionsRequired,
    isSubjectsRequired,
    isFundingsRequired,
  ].every(Boolean);

  return {
    isAllInformationFilled,
    isTitleRequired,
    isEditionRequired,
    isImprintRequired,
    isDoiRequired,
    isLandingPageRequired,
    isCoverUrlRequired,
    // isIssueOrdinalRequired,
    isPageCountRequired,
    isLanguagesRequired,
    isContributionsRequired,
    isSubjectsRequired,
    isFundingsRequired,
  };
};

export default useWorkRecommendations;
