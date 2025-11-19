'use client';

import { v4 as uuidv4 } from 'uuid';

import CSVFileValidator from 'csv-file-validator';
import { ContributorService } from '@/src/entities/contributor';
import { InstitutionService } from '@/src/entities/institution';
import { convertOrchidIdToText, isCsv } from '@/src/shared/utils';
import { useApolloClient } from '@apollo/client/react';
import { licenseOptions } from '@/src/shared/constants/formFields';
import { appConfig, CSV_KEYS, FormFieldOption, getDefaultContribution, getDefaultWork } from '@/src/shared';
import { InstitutionEntity, InstitutionRor } from '@/src/entities/institution/model/institution.types';
import { ContributionType, ContributorId } from '@/src/entities/contributor/model/contributor.types';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { WorkEntity, WorkId, WorkStatus, WorkType } from '@/src/entities/work/model/work.types';
import { useEffect, useState } from 'react';
import { getDefaultAffiliation } from '@/src/shared/constants/affiliations';
import { Button, Typography } from '@mui/material';
import { Checkbox, LinkTooltip, OrchidLogo } from '@/src/shared/ui';
import { getCsvConfig } from './utils/getCsvConfig';

type CSVParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onValidationSuccess?: (data: WorkEntity[]) => void;
  onValidationFailure?: (errors: string[]) => void;
};

export type CSVFieldType = string | number | boolean;

const {
  PUBLISHER,
  WORK_TYPE,
  WORK_STATUS,
  TITLE,
  SUBTITLE,
  EDITION,
  PUBLICATION_DATE,
  WITHDRAWN_DATE,
  PLACE_OF_PUBLICATION,
  COVER_URL,
  DOI,
  PAGE_COUNT,
  PAGE_BREAKDOWN,
  IMAGE_COUNT,
  TABLE_COUNT,
  AUDIO_COUNT,
  VIDEO_COUNT,
  LICENSE,
  COPYRIGHT_HOLDER,
  LANDING_PAGE,
  SHORT_ABSTRACT,
  LONG_ABSTRACT,
  CONTRIBUTION_1_FIRST_NAME,
  CONTRIBUTION_1_LAST_NAME,
  CONTRIBUTION_1_ROLE,
  CONTRIBUTION_1_BIOGRAPHY,
  CONTRIBUTION_1_ORCID,
  CONTRIBUTION_1_WEBSITE,
  CONTRIBUTION_1_AFFILIATION_POSITION,
  CONTRIBUTION_1_AFFILIATION_INSTITUTION_NAME,
  CONTRIBUTION_1_AFFILIATION_INSTITUTION_ROR,
  SERIES_NAME,
  SERIES_ISSN,
  SERIES_ISSN_NUMBER,
} = CSV_KEYS;

type Row = {
  [PUBLISHER]: CSVFieldType;
  [WORK_TYPE]: CSVFieldType;
  [WORK_STATUS]: CSVFieldType;
  [TITLE]: CSVFieldType;
  [SUBTITLE]: CSVFieldType;
  [EDITION]: CSVFieldType;
  [PUBLICATION_DATE]: CSVFieldType;
  [WITHDRAWN_DATE]: CSVFieldType;
  [PLACE_OF_PUBLICATION]: CSVFieldType;
  [COVER_URL]: CSVFieldType;
  [DOI]: CSVFieldType;
  [PAGE_COUNT]: CSVFieldType;
  [PAGE_BREAKDOWN]: CSVFieldType;
  [IMAGE_COUNT]: CSVFieldType;
  [TABLE_COUNT]: CSVFieldType;
  [AUDIO_COUNT]: CSVFieldType;
  [VIDEO_COUNT]: CSVFieldType;
  [LICENSE]: CSVFieldType;
  [COPYRIGHT_HOLDER]: CSVFieldType;
  [LANDING_PAGE]: CSVFieldType;
  [SHORT_ABSTRACT]: CSVFieldType;
  [LONG_ABSTRACT]: CSVFieldType;
  [CONTRIBUTION_1_FIRST_NAME]: CSVFieldType;
  [CONTRIBUTION_1_LAST_NAME]: CSVFieldType;
  [CONTRIBUTION_1_ROLE]: CSVFieldType;
  [CONTRIBUTION_1_BIOGRAPHY]: CSVFieldType;
  [CONTRIBUTION_1_ORCID]: CSVFieldType;
  [CONTRIBUTION_1_WEBSITE]: CSVFieldType;
  [CONTRIBUTION_1_AFFILIATION_POSITION]: CSVFieldType;
  [CONTRIBUTION_1_AFFILIATION_INSTITUTION_NAME]: CSVFieldType;
  [CONTRIBUTION_1_AFFILIATION_INSTITUTION_ROR]: CSVFieldType;
  [SERIES_NAME]: CSVFieldType;
  [SERIES_ISSN]: CSVFieldType;
  [SERIES_ISSN_NUMBER]: CSVFieldType;
};

type MultipleFoundedContributors = Record<WorkId, ContributorId[]>;

export const CSVParse = (props: CSVParseProps) => {
  const { file, imprints, serieses, onValidationFailure } = props;

  const [works, setWorks] = useState<WorkEntity[]>([]);
  const [multipleFoundedContributors, setMultipleFoundedContributors] = useState<MultipleFoundedContributors>({});
  const [selectedContributors, setSelectedContributors] = useState<string[]>([]);

  const queryClient = useApolloClient();

  const contributorService = new ContributorService(queryClient.query);
  const institutionService = new InstitutionService(queryClient.query);

  const csvConfig = getCsvConfig(imprints, licenseOptions, serieses);

  const isCsvFile = isCsv(file);

  const isMultipleFoundedContributors = Object.keys(multipleFoundedContributors).length > 0;

  const fetchedInstitutions: Record<InstitutionRor, InstitutionEntity> = {};

  const validateCsvFile = async (file: File) => {
    try {
      const csvParseResult = await CSVFileValidator(file, csvConfig);

      const isErrors = csvParseResult.inValidData.length > 0;

      if (isErrors) {
        const errors = csvParseResult.inValidData.map((error) => error.message);

        onValidationFailure?.(errors);
        return;
      }

      const data = csvParseResult.data as Row[];

      data.forEach(async (row: Row) => {
        const workId = uuidv4();

        const {
          title,
          subtitle,
          workType,
          workStatus,
          doi,
          publisher,
          edition,
          license,
          copyrightHolder,
          landingPage,
          coverUrl,
          publicationDate,
          withdrawnDate,
          imageCount,
          tableCount,
          audioCount,
          videoCount,
          pageCount,
          pageBreakdown,
          contribution1AffiliationInstitutionRor,
          contribution1FirstName,
          contribution1LastName,
          contribution1Role,
          contribution1Orcid,
          contribution1Website,
          contribution1AffiliationPosition,
          contribution1Biography,
        } = row;

        const imprint = imprints.find((imprint) => imprint.label === publisher);

        const work: WorkEntity = getDefaultWork({
          id: workId,
          title: `${title}`,
          subtitle: `${subtitle}`,
          fullTitle: `${title}`,
          type: workType as WorkType,
          doi: `${doi}`,
          publisherName: `${publisher}`,
          imprintId: imprint?.value ?? '',
          status: workStatus as WorkStatus,
          edition: edition ? parseInt(edition as string) : 1,
          license: `${license}`,
          copyrightHolder: `${copyrightHolder}`,
          landingPage: `${landingPage}`,
          coverUrl: `${coverUrl}`,
          publicationDate: `${publicationDate}`,
          withdrawnDate: `${withdrawnDate}`,
          imageCount: imageCount ? parseInt(imageCount as string) : 0,
          tableCount: tableCount ? parseInt(tableCount as string) : 0,
          audioCount: audioCount ? parseInt(audioCount as string) : 0,
          videoCount: videoCount ? parseInt(videoCount as string) : 0,
          contributions: [],
        });

        const cachedRors = Object.keys(fetchedInstitutions);

        const institutionsRors = [contribution1AffiliationInstitutionRor];

        const filteredRors = institutionsRors
          .filter((ror) => ror && `${ror}`.length > 0)
          .filter((ror) => !cachedRors.includes(`${ror}`));

        const institutionsPromises = filteredRors.map((ror) =>
          institutionService.getInstitutions(0, appConfig.data.maxItemsPerRequestLimit, `${ror}`),
        );

        const institutions = await Promise.all(institutionsPromises);

        institutions.forEach((institution) => {
          if (institution.length === 0 || !institution[0] || !institution[0].ror) return;

          fetchedInstitutions[institution[0].ror] = institution[0];
        });

        const contributors1SearchName = `${contribution1FirstName ?? ''} ${contribution1LastName ?? ''}`.trim();

        const contributorsTypes = [contribution1Role];
        const contributorsOrcids = [contribution1Orcid];
        const contributorsWebsites = [contribution1Website];
        const contributorsBiographies = [contribution1Biography];
        const contributorsNames = [contributors1SearchName];
        const contributorsAffiliationPositions = [contribution1AffiliationPosition];

        const filteredContributorsNames = contributorsNames.filter((name) => name && name.length > 0);

        const contributorsPromises = filteredContributorsNames.map((name) => contributorService.getContributors(name));

        const contributors = await Promise.all(contributorsPromises);

        contributors.forEach((contributors, index) => {
          const affiliationRor = `${institutionsRors[index]}`;
          const institution = fetchedInstitutions[affiliationRor];

          const fullName = `${contributorsNames[index]}`;
          const firstName = `${fullName.split(' ')[0]}`;
          const lastName = `${fullName.split(' ')[1]}`;
          const biography = `${contributorsBiographies[index]}`;
          const type = `${contributorsTypes[index]}`;
          const orcid = `${contributorsOrcids[index]}`;
          const website = `${contributorsWebsites[index]}`;
          const position = `${contributorsAffiliationPositions[index]}`;

          const affiliation = institution
            ? getDefaultAffiliation({
                institutionId: institution?.id ?? '',
                institutionName: institution?.name ?? '',
                rorId: institution?.ror ?? '',
                position,
              })
            : null;

          if (contributors.length === 0) {
            const contribution = getDefaultContribution({
              fullName,
              lastName,
              firstName,
              type: type as ContributionType,
              isMain: true,
              orderNumber: 1,
              biography,
              orcidId: orcid,
              website,
              affiliations: affiliation ? [affiliation] : [],
            });

            work.contributions.push(contribution);

            return;
          }

          const foundOnlyOneContributor = contributors.length === 1;

          if (foundOnlyOneContributor) {
            const firstContributor = contributors[0];

            const contribution = getDefaultContribution({
              fullName: firstContributor.fullName,
              lastName: firstContributor.lastName,
              firstName: firstContributor.firstName,
              contributorId: firstContributor.id,
              type: type as ContributionType,
              isMain: true,
              orderNumber: 1,
              biography,
              orcidId: firstContributor.orcid,
              website: firstContributor.website,
              affiliations: affiliation ? [affiliation] : [],
            });

            work.contributions.push(contribution);

            return;
          }

          const contributions = contributors.map((contributor) => {
            return getDefaultContribution({
              fullName: contributor.fullName,
              lastName: contributor.lastName,
              firstName: contributor.firstName,
              contributorId: contributor.id,
              type: type as ContributionType,
              isMain: true,
              orderNumber: 1,
              biography,
              orcidId: contributor.orcid,
              website: contributor.website,
              affiliations: affiliation ? [affiliation] : [],
            });
          });

          const contributorsIds = contributors.map((contributor) => contributor.id);

          work.contributions.push(...contributions);

          setMultipleFoundedContributors((prev) => ({
            ...prev,
            [workId]: contributorsIds,
          }));
        });

        // TODO add logic for serieses
        // const seriesNames = csvParseResult.data.map((row) => row.seriesName).filter((value) => value && value.length > 0);

        // const seriesesEntities: Record<string, SeriesEntity> = {};

        // serieses.forEach((series) => {
        //   if (!seriesNames.includes(series.name)) return;

        //   seriesesEntities[series.name] = series;
        // });

        setWorks((prev) => [...prev, work]);
      });
    } catch (error) {
      console.error(error);

      if (onValidationFailure) {
        onValidationFailure(['An error occurred while parsing the CSV file']);
      }
    }
  };

  useEffect(() => {
    if (!isCsvFile) return;

    validateCsvFile(file);
  }, [file]);

  const handleSelectContributor = (workId: WorkId, contributorId: ContributorId) => {
    const isSelected = selectedContributors.includes(`${workId}-${contributorId}`);

    if (isSelected) {
      setSelectedContributors((prev) => prev.filter((selected) => selected !== `${workId}-${contributorId}`));
      return;
    }

    setSelectedContributors((prev) => [...prev, `${workId}-${contributorId}`]);
  };

  console.log(works);

  if (!isMultipleFoundedContributors) {
    return null;
  }

  return (
    <div>
      <Typography variant="h1" component="h2">
        Multiple founded contributors, please select the correct one:
      </Typography>
      {Object.entries(multipleFoundedContributors).map(([workId, contributorsIds]) => {
        const work = works.find((work) => work.id === workId);

        if (!work) return null;

        const contributorsForSelection = work.contributions.filter(({ contributorId }) =>
          contributorsIds.includes(contributorId),
        );

        return (
          <div key={workId}>
            <Typography variant="h2" component="h4">
              {work.title}
            </Typography>
            <ul>
              {contributorsForSelection.map(({ fullName, contributorId, orcidId }) => {
                return (
                  <li key={contributorId} className="flex items-center gap-1">
                    <Checkbox
                      checked={selectedContributors.includes(`${workId}-${contributorId}`)}
                      onChange={() => handleSelectContributor(workId, contributorId)}
                    />
                    <Typography className="flex items-center gap-1">
                      {fullName}
                      {orcidId && (
                        <LinkTooltip link={orcidId} linkText={convertOrchidIdToText(orcidId)}>
                          <OrchidLogo />
                        </LinkTooltip>
                      )}
                    </Typography>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <Button variant="contained" color="primary">
        Submit
      </Button>
    </div>
  );
};
