/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import CSVFileValidator from 'csv-file-validator';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { CurrencyCode, LanguageCode } from '@/gql/graphql';
import type { WorkContribution } from '@/src/entities/contribution/model/contribution.types';
import { ContributorService } from '@/src/entities/contributor';
import { ContributionType, ContributorId } from '@/src/entities/contributor/model/contributor.types';
import { InstitutionService } from '@/src/entities/institution';
import { InstitutionEntity, InstitutionRor } from '@/src/entities/institution/model/institution.types';
import { LocationEntity, LocationPlatform } from '@/src/entities/locations/model/location.types';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { WorkEntity, WorkId, WorkStatus, WorkType } from '@/src/entities/work/model/work.types';
import {
  appConfig,
  CSV_KEYS,
  FormFieldOption,
  getDefaultContribution,
  getDefaultWork,
  LanguageRelation,
  PublicationType,
  SubjectTypes,
} from '@/src/shared';
import { getDefaultAffiliation } from '@/src/shared/constants/affiliations';
import { licenseOptions } from '@/src/shared/constants/formFields';
import {
  Button,
  LinkTooltip,
  OrchidLogo,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableWrapper,
  Typography,
} from '@/src/shared/ui';
import {
  convertOrchidIdToText,
  convertRomanToArabic,
  getDefaultPublication,
  isCsv,
  isDefaultId,
} from '@/src/shared/utils';

import { getCsvConfig } from './utils/getCsvConfig';

type CSVParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onValidationSuccess?: (data: WorkEntity[]) => void;
  onValidationFailure?: (errors: string[]) => void;
};

export type CSVFieldType = string | number | boolean;

const { defaultId } = appConfig;

type Row = {
  [CSVKey in (typeof CSV_KEYS)[keyof typeof CSV_KEYS]]: CSVFieldType;
};

type ContributorSelection = {
  lastContribution: string;
  selected: boolean;
} & WorkContribution;

type MultipleFoundedContributors = Record<WorkId, Record<string, ContributorSelection[]>>;

type SeriesForUpdateItem = WorkEntity & {
  orderNumber: number;
};

export const CSVParse = (props: CSVParseProps) => {
  const { file, imprints, serieses, onValidationFailure } = props;

  const [works, setWorks] = useState<WorkEntity[]>([]);
  const [seriesForUpdate, setSeriesForUpdate] = useState<Record<string, SeriesForUpdateItem[]>>({});
  const [multipleFoundedContributors, setMultipleFoundedContributors] = useState<MultipleFoundedContributors>({});

  const contributorService = new ContributorService();
  const institutionService = new InstitutionService();

  const csvConfig = getCsvConfig(imprints, licenseOptions, serieses);

  const isCsvFile = isCsv(file);

  const isDataEmpty = works.length === 0;

  const showContributorsSelection = Object.keys(multipleFoundedContributors).length > 0;

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
          contribution2FirstName,
          contribution2LastName,
          contribution2Role,
          contribution2Orcid,
          contribution2Website,
          contribution2AffiliationPosition,
          contribution2Biography,
          contribution2AffiliationInstitutionRor,
          contribution3FirstName,
          contribution3LastName,
          contribution3Role,
          contribution3Orcid,
          contribution3Website,
          contribution3AffiliationPosition,
          contribution3Biography,
          contribution3AffiliationInstitutionRor,
          contribution4FirstName,
          contribution4LastName,
          contribution4Role,
          contribution4Orcid,
          contribution4Website,
          contribution4AffiliationPosition,
          contribution4Biography,
          contribution4AffiliationInstitutionRor,
          contribution5FirstName,
          contribution5LastName,
          contribution5Role,
          contribution5Orcid,
          contribution5Website,
          contribution5AffiliationPosition,
          contribution5Biography,
          contribution5AffiliationInstitutionRor,
          contribution6FirstName,
          contribution6LastName,
          contribution6Role,
          contribution6Orcid,
          contribution6Website,
          contribution6AffiliationPosition,
          contribution6Biography,
          contribution6AffiliationInstitutionRor,
          contribution7FirstName,
          contribution7LastName,
          contribution7Role,
          contribution7Orcid,
          contribution7Website,
          contribution7AffiliationPosition,
          contribution7Biography,
          contribution7AffiliationInstitutionRor,
          contribution8FirstName,
          contribution8LastName,
          contribution8Role,
          contribution8Orcid,
          contribution8Website,
          contribution8AffiliationPosition,
          contribution8Biography,
          contribution8AffiliationInstitutionRor,
          contribution9FirstName,
          contribution9LastName,
          contribution9Role,
          contribution9Orcid,
          contribution9Website,
          contribution9AffiliationPosition,
          contribution9Biography,
          contribution9AffiliationInstitutionRor,
          contribution10FirstName,
          contribution10LastName,
          contribution10Role,
          contribution10Orcid,
          contribution10Website,
          contribution10AffiliationPosition,
          contribution10Biography,
          contribution10AffiliationInstitutionRor,
          contribution11FirstName,
          contribution11LastName,
          contribution11Role,
          contribution11Orcid,
          contribution11Website,
          contribution11AffiliationPosition,
          contribution11Biography,
          contribution11AffiliationInstitutionRor,
          contribution12FirstName,
          contribution12LastName,
          contribution12Role,
          contribution12Orcid,
          contribution12Website,
          contribution12AffiliationPosition,
          contribution12Biography,
          contribution12AffiliationInstitutionRor,
          contribution13FirstName,
          contribution13LastName,
          contribution13Role,
          contribution13Orcid,
          contribution13Website,
          contribution13AffiliationPosition,
          contribution13Biography,
          contribution13AffiliationInstitutionRor,
          contribution14FirstName,
          contribution14LastName,
          contribution14Role,
          contribution14Orcid,
          contribution14Website,
          contribution14AffiliationPosition,
          contribution14Biography,
          contribution14AffiliationInstitutionRor,
          contribution15FirstName,
          contribution15LastName,
          contribution15Role,
          contribution15Orcid,
          contribution15Website,
          contribution15AffiliationPosition,
          contribution15Biography,
          contribution15AffiliationInstitutionRor,
          contribution16FirstName,
          contribution16LastName,
          contribution16Role,
          contribution16Orcid,
          contribution16Website,
          contribution16AffiliationPosition,
          contribution16Biography,
          contribution16AffiliationInstitutionRor,
          contribution17FirstName,
          contribution17LastName,
          contribution17Role,
          contribution17Orcid,
          contribution17Website,
          contribution17AffiliationPosition,
          contribution17Biography,
          contribution17AffiliationInstitutionRor,
          contribution18FirstName,
          contribution18LastName,
          contribution18Role,
          contribution18Orcid,
          contribution18Website,
          contribution18AffiliationPosition,
          contribution18Biography,
          contribution18AffiliationInstitutionRor,
          contribution19FirstName,
          contribution19LastName,
          contribution19Role,
          contribution19Orcid,
          contribution19Website,
          contribution19AffiliationPosition,
          contribution19Biography,
          contribution19AffiliationInstitutionRor,
          contribution20FirstName,
          contribution20LastName,
          contribution20Role,
          contribution20Orcid,
          contribution20Website,
          contribution20AffiliationPosition,
          contribution20Biography,
          contribution20AffiliationInstitutionRor,
          originalLanguage,
          themaSubjects,
          bicSubjects,
          bisacSubjects,
          lccSubjects,
          keywords,
          translatedFromLanguage,
          translatedIntoLanguage,
          publicationPaperbackIsbn,
          publicationPaperbackPrice1CurrencyCode,
          publicationPaperbackPrice1UnitPrice,
          publicationHardbackIsbn,
          publicationHardbackPrice1CurrencyCode,
          publicationHardbackPrice1UnitPrice,
          publicationPdfIsbn,
          publicationPdfLocationLandingPage,
          publicationPdfLocationFullTextUrl,
          publicationPdfLocationPlatform,
          seriesName,
          seriesIssueNumber,
        } = row;

        const imprint = imprints.find((imprint) => imprint.label === publisher);

        const [frontmatterCount = '', totalPages = '', backmatterCount = ''] = `${pageBreakdown}`.split('+');
        const foundLicense = licenseOptions.find((option) => option.value.startsWith(`${license}`));

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
          license: foundLicense?.value ?? '',
          copyrightHolder: `${copyrightHolder}`,
          landingPage: `${landingPage}`,
          coverUrl: `${coverUrl}`,
          publicationDate: `${publicationDate}`,
          withdrawnDate: `${withdrawnDate}`,
          imageCount: imageCount ? parseInt(imageCount as string) : 0,
          tableCount: tableCount ? parseInt(tableCount as string) : 0,
          audioCount: audioCount ? parseInt(audioCount as string) : 0,
          videoCount: videoCount ? parseInt(videoCount as string) : 0,
          pageCount: pageCount ? parseInt(pageCount as string) : 0,
          frontmatterCount: convertRomanToArabic(frontmatterCount),
          backmatterCount: convertRomanToArabic(backmatterCount),
          languages: [],
          subjects: [],
          publications: [],
          contributions: [],
        });

        const cachedRors = Object.keys(fetchedInstitutions);

        const institutionsRors = [
          contribution1AffiliationInstitutionRor,
          contribution2AffiliationInstitutionRor,
          contribution3AffiliationInstitutionRor,
          contribution4AffiliationInstitutionRor,
          contribution5AffiliationInstitutionRor,
          contribution6AffiliationInstitutionRor,
          contribution7AffiliationInstitutionRor,
          contribution8AffiliationInstitutionRor,
          contribution9AffiliationInstitutionRor,
          contribution10AffiliationInstitutionRor,
          contribution11AffiliationInstitutionRor,
          contribution12AffiliationInstitutionRor,
          contribution13AffiliationInstitutionRor,
          contribution14AffiliationInstitutionRor,
          contribution15AffiliationInstitutionRor,
          contribution16AffiliationInstitutionRor,
          contribution17AffiliationInstitutionRor,
          contribution18AffiliationInstitutionRor,
          contribution19AffiliationInstitutionRor,
          contribution20AffiliationInstitutionRor,
        ];

        const filteredRors = institutionsRors
          .filter((ror) => ror && `${ror}`.length > 0)
          .filter((ror) => !cachedRors.includes(`${ror}`));

        const institutionsPromises = filteredRors.map((ror) =>
          institutionService.getInstitutions(0, appConfig.data.maxItemsPerRequestLimit, `${ror}`),
        );

        // Instititutions
        const institutions = await Promise.all(institutionsPromises);

        institutions.forEach((institution) => {
          if (institution.length === 0 || !institution[0] || !institution[0].ror) return;

          fetchedInstitutions[institution[0].ror] = institution[0];
        });

        // Languages
        if (originalLanguage && `${originalLanguage}`.length > 0) {
          work.languages.push({
            code: originalLanguage as LanguageCode,
            relation: LanguageRelation.enum.Original,
            isMain: true,
            id: defaultId,
          });
        }

        if (translatedFromLanguage && `${translatedFromLanguage}`.length > 0) {
          work.languages.push({
            code: translatedFromLanguage as LanguageCode,
            relation: LanguageRelation.enum.TranslatedFrom,
            isMain: false,
            id: defaultId,
          });
        }

        if (translatedIntoLanguage && `${translatedIntoLanguage}`.length > 0) {
          work.languages.push({
            code: translatedIntoLanguage as LanguageCode,
            relation: LanguageRelation.enum.TranslatedInto,
            isMain: false,
            id: defaultId,
          });
        }

        // Subjects
        if (themaSubjects && `${themaSubjects}`.length > 0) {
          const startIndex = work.subjects.length;
          const subjects = `${themaSubjects}`.split(',').map((subject) => subject.trim());

          subjects.forEach((subject, index) => {
            work.subjects.push({
              id: defaultId,
              code: subject,
              type: SubjectTypes.enum.Thema,
              ordinal: startIndex + index + 1,
            });
          });
        }

        if (bicSubjects && `${bicSubjects}`.length > 0) {
          const subjects = `${bicSubjects}`.split(',').map((subject) => subject.trim());

          subjects.forEach((subject, index) => {
            work.subjects.push({
              id: defaultId,
              code: subject,
              type: SubjectTypes.enum.Bic,
              ordinal: work.subjects.length + index + 1,
            });
          });
        }

        if (bisacSubjects && `${bisacSubjects}`.length > 0) {
          const subjects = `${bisacSubjects}`.split(',').map((subject) => subject.trim());

          subjects.forEach((subject, index) => {
            work.subjects.push({
              id: defaultId,
              code: subject,
              type: SubjectTypes.enum.Bisac,
              ordinal: work.subjects.length + index + 1,
            });
          });
        }

        if (lccSubjects && `${lccSubjects}`.length > 0) {
          const subjects = `${lccSubjects}`.split(',').map((subject) => subject.trim());

          subjects.forEach((subject, index) => {
            work.subjects.push({
              id: defaultId,
              code: subject,
              type: SubjectTypes.enum.Lcc,
              ordinal: work.subjects.length + index + 1,
            });
          });
        }

        if (keywords && `${keywords}`.length > 0) {
          const subjects = `${keywords}`.split(',').map((subject) => subject.trim());

          subjects.forEach((subject, index) => {
            work.subjects.push({
              id: defaultId,
              code: subject,
              type: SubjectTypes.enum.Keyword,
              ordinal: work.subjects.length + index + 1,
            });
          });
        }

        // Publications
        if (publicationPaperbackIsbn && `${publicationPaperbackIsbn}`.length > 0) {
          const publication = getDefaultPublication({
            isbn: `${publicationPaperbackIsbn}`,
            type: PublicationType.enum.Paperback,
          });

          if (
            publicationPaperbackPrice1CurrencyCode &&
            `${publicationPaperbackPrice1CurrencyCode}`.length > 0 &&
            publicationPaperbackPrice1UnitPrice &&
            `${publicationPaperbackPrice1UnitPrice}`.length > 0
          ) {
            publication.prices.push({
              id: defaultId,
              currencyCode: publicationPaperbackPrice1CurrencyCode as CurrencyCode,
              unitPrice: publicationPaperbackPrice1UnitPrice
                ? parseFloat(publicationPaperbackPrice1UnitPrice as string)
                : 0,
            });
          }

          work.publications.push(publication);
        }

        if (publicationHardbackIsbn && `${publicationHardbackIsbn}`.length > 0) {
          const publication = getDefaultPublication({
            isbn: `${publicationHardbackIsbn}`,
            type: PublicationType.enum.Hardback,
          });

          if (
            publicationHardbackPrice1CurrencyCode &&
            `${publicationHardbackPrice1CurrencyCode}`.length > 0 &&
            publicationHardbackPrice1UnitPrice &&
            `${publicationHardbackPrice1UnitPrice}`.length > 0
          ) {
            publication.prices.push({
              id: defaultId,
              currencyCode: publicationHardbackPrice1CurrencyCode as CurrencyCode,
              unitPrice: publicationHardbackPrice1UnitPrice
                ? parseFloat(publicationHardbackPrice1UnitPrice as string)
                : 0,
            });
          }

          work.publications.push(publication);
        }

        if (publicationPdfIsbn && `${publicationPdfIsbn}`.length > 0) {
          const locations: LocationEntity[] = [];

          if (
            (publicationPdfLocationLandingPage && `${publicationPdfLocationLandingPage}`.length > 0) ||
            (publicationPdfLocationFullTextUrl && `${publicationPdfLocationFullTextUrl}`.length > 0) ||
            (publicationPdfLocationPlatform && `${publicationPdfLocationPlatform}`.length > 0)
          ) {
            locations.push({
              canonical: true,
              id: defaultId,
              landingPage: `${publicationPdfLocationLandingPage}`,
              fullTextUrl: `${publicationPdfLocationFullTextUrl}`,
              locationPlatform: `${publicationPdfLocationPlatform}` as LocationPlatform,
            });
          }

          const publication = getDefaultPublication({
            isbn: `${publicationPdfIsbn}`,
            type: PublicationType.enum.Pdf,
            locations,
          });

          work.publications.push(publication);
        }

        // Contributors
        const contributors = [
          {
            fullName: (contribution1FirstName ?? '') + ' ' + (contribution1LastName ?? ''),
            firstName: contribution1FirstName ?? '',
            lastName: contribution1LastName ?? '',
            orcid: contribution1Orcid ?? '',
            website: contribution1Website ?? '',
            biography: contribution1Biography ?? '',
            type: contribution1Role ?? '',
            affiliationPosition: contribution1AffiliationPosition ?? '',
            affiliationInstitutionRor: contribution1AffiliationInstitutionRor ?? '',
          },
          {
            fullName: (contribution2FirstName ?? '') + ' ' + (contribution2LastName ?? ''),
            firstName: contribution2FirstName ?? '',
            lastName: contribution2LastName ?? '',
            orcid: contribution2Orcid ?? '',
            website: contribution2Website ?? '',
            biography: contribution2Biography ?? '',
            type: contribution2Role ?? '',
            affiliationPosition: contribution2AffiliationPosition ?? '',
            affiliationInstitutionRor: contribution2AffiliationInstitutionRor ?? '',
          },
          {
            fullName: (contribution3FirstName ?? '') + ' ' + (contribution3LastName ?? ''),
            firstName: contribution3FirstName ?? '',
            lastName: contribution3LastName ?? '',
            orcid: contribution3Orcid ?? '',
            website: contribution3Website ?? '',
            biography: contribution3Biography ?? '',
            type: contribution3Role ?? '',
          },
          {
            fullName: (contribution4FirstName ?? '') + ' ' + (contribution4LastName ?? ''),
            firstName: contribution4FirstName ?? '',
            lastName: contribution4LastName ?? '',
            orcid: contribution4Orcid ?? '',
            website: contribution4Website ?? '',
            biography: contribution4Biography ?? '',
            type: contribution4Role ?? '',
          },
          {
            fullName: (contribution5FirstName ?? '') + ' ' + (contribution5LastName ?? ''),
            firstName: contribution5FirstName ?? '',
            lastName: contribution5LastName ?? '',
            orcid: contribution5Orcid ?? '',
            website: contribution5Website ?? '',
            biography: contribution5Biography ?? '',
            type: contribution5Role ?? '',
          },
          {
            fullName: (contribution6FirstName ?? '') + ' ' + (contribution6LastName ?? ''),
            firstName: contribution6FirstName ?? '',
            lastName: contribution6LastName ?? '',
            orcid: contribution6Orcid ?? '',
            website: contribution6Website ?? '',
            biography: contribution6Biography ?? '',
            type: contribution6Role ?? '',
          },
          {
            fullName: (contribution7FirstName ?? '') + ' ' + (contribution7LastName ?? ''),
            firstName: contribution7FirstName ?? '',
            lastName: contribution7LastName ?? '',
            orcid: contribution7Orcid ?? '',
            website: contribution7Website ?? '',
            biography: contribution7Biography ?? '',
            type: contribution7Role ?? '',
          },
          {
            fullName: (contribution8FirstName ?? '') + ' ' + (contribution8LastName ?? ''),
            firstName: contribution8FirstName ?? '',
            lastName: contribution8LastName ?? '',
            orcid: contribution8Orcid ?? '',
            website: contribution8Website ?? '',
            biography: contribution8Biography ?? '',
            type: contribution8Role ?? '',
          },
          {
            fullName: (contribution9FirstName ?? '') + ' ' + (contribution9LastName ?? ''),
            firstName: contribution9FirstName ?? '',
            lastName: contribution9LastName ?? '',
            orcid: contribution9Orcid ?? '',
            website: contribution9Website ?? '',
            biography: contribution9Biography ?? '',
            type: contribution9Role ?? '',
          },
          {
            fullName: (contribution10FirstName ?? '') + ' ' + (contribution10LastName ?? ''),
            firstName: contribution10FirstName ?? '',
            lastName: contribution10LastName ?? '',
            orcid: contribution10Orcid ?? '',
            website: contribution10Website ?? '',
            biography: contribution10Biography ?? '',
            type: contribution10Role ?? '',
          },
          {
            fullName: (contribution11FirstName ?? '') + ' ' + (contribution11LastName ?? ''),
            firstName: contribution11FirstName ?? '',
            lastName: contribution11LastName ?? '',
            orcid: contribution11Orcid ?? '',
            website: contribution11Website ?? '',
            biography: contribution11Biography ?? '',
            type: contribution11Role ?? '',
          },
          {
            fullName: (contribution12FirstName ?? '') + ' ' + (contribution12LastName ?? ''),
            firstName: contribution12FirstName ?? '',
            lastName: contribution12LastName ?? '',
            orcid: contribution12Orcid ?? '',
            website: contribution12Website ?? '',
            biography: contribution12Biography ?? '',
            type: contribution12Role ?? '',
          },
          {
            fullName: (contribution13FirstName ?? '') + ' ' + (contribution13LastName ?? ''),
            firstName: contribution13FirstName ?? '',
            lastName: contribution13LastName ?? '',
            orcid: contribution13Orcid ?? '',
            website: contribution13Website ?? '',
            biography: contribution13Biography ?? '',
            type: contribution13Role ?? '',
          },
          {
            fullName: (contribution14FirstName ?? '') + ' ' + (contribution14LastName ?? ''),
            firstName: contribution14FirstName ?? '',
            lastName: contribution14LastName ?? '',
            orcid: contribution14Orcid ?? '',
            website: contribution14Website ?? '',
            biography: contribution14Biography ?? '',
            type: contribution14Role ?? '',
          },
          {
            fullName: (contribution15FirstName ?? '') + ' ' + (contribution15LastName ?? ''),
            firstName: contribution15FirstName ?? '',
            lastName: contribution15LastName ?? '',
            orcid: contribution15Orcid ?? '',
            website: contribution15Website ?? '',
            biography: contribution15Biography ?? '',
            type: contribution15Role ?? '',
          },
          {
            fullName: (contribution16FirstName ?? '') + ' ' + (contribution16LastName ?? ''),
            firstName: contribution16FirstName ?? '',
            lastName: contribution16LastName ?? '',
            orcid: contribution16Orcid ?? '',
            website: contribution16Website ?? '',
            biography: contribution16Biography ?? '',
            type: contribution16Role ?? '',
          },
          {
            fullName: (contribution17FirstName ?? '') + ' ' + (contribution17LastName ?? ''),
            firstName: contribution17FirstName ?? '',
            lastName: contribution17LastName ?? '',
            orcid: contribution17Orcid ?? '',
            website: contribution17Website ?? '',
            biography: contribution17Biography ?? '',
            type: contribution17Role ?? '',
          },
          {
            fullName: (contribution18FirstName ?? '') + ' ' + (contribution18LastName ?? ''),
            firstName: contribution18FirstName ?? '',
            lastName: contribution18LastName ?? '',
            orcid: contribution18Orcid ?? '',
            website: contribution18Website ?? '',
            biography: contribution18Biography ?? '',
            type: contribution18Role ?? '',
          },
          {
            fullName: (contribution19FirstName ?? '') + ' ' + (contribution19LastName ?? ''),
            firstName: contribution19FirstName ?? '',
            lastName: contribution19LastName ?? '',
            orcid: contribution19Orcid ?? '',
            website: contribution19Website ?? '',
            biography: contribution19Biography ?? '',
            type: contribution19Role ?? '',
          },
          {
            fullName: (contribution20FirstName ?? '') + ' ' + (contribution20LastName ?? ''),
            firstName: contribution20FirstName ?? '',
            lastName: contribution20LastName ?? '',
            orcid: contribution20Orcid ?? '',
            website: contribution20Website ?? '',
            biography: contribution20Biography ?? '',
            type: contribution20Role ?? '',
          },
        ];

        const filteredContributors = contributors.filter(({ fullName }) => fullName && fullName.length > 1);

        const multipleContributions: MultipleFoundedContributors = {
          [workId]: {},
        };

        filteredContributors.forEach(
          async ({ fullName, lastName, firstName, affiliationPosition, type, biography, orcid, website }, index) => {
            const foundedContributors = await contributorService.getContributors(fullName);

            const affiliationRor = `${institutionsRors[index]}`;
            const institution = fetchedInstitutions[affiliationRor];

            const affiliation = institution
              ? getDefaultAffiliation({
                  institutionId: institution?.id ?? '',
                  institutionName: institution?.name ?? '',
                  rorId: institution?.ror ?? '',
                  position: `${affiliationPosition}`.length > 0 ? `${affiliationPosition}` : '',
                })
              : null;

            const contributionWithNewContributor = getDefaultContribution({
              fullName,
              lastName: `${lastName}`,
              firstName: `${firstName}`,
              type: `${type}` as ContributionType,
              isMain: true,
              orderNumber: 1,
              biography: biography ? `${biography}` : '',
              orcidId: orcid ? `${orcid}` : '',
              website: website ? `${website}` : '',
              contributorId: defaultId,
              affiliations: affiliation ? [affiliation] : [],
            });

            work.contributions.push(contributionWithNewContributor);

            const multipleContributionsItemId = uuidv4();

            multipleContributions[workId][multipleContributionsItemId] = [
              { ...contributionWithNewContributor, selected: true, lastContribution: '' },
            ];

            if (foundedContributors.length === 0) return;

            foundedContributors.forEach((foundedContributor) => {
              const contribution = getDefaultContribution({
                fullName: foundedContributor.fullName,
                lastName: foundedContributor.lastName,
                firstName: foundedContributor.firstName,
                contributorId: foundedContributor.id,
                type: type as ContributionType,
                isMain: true,
                orderNumber: 1,
                biography: biography ? `${biography}` : '',
                orcidId: foundedContributor.orcid,
                website: foundedContributor.website,
                affiliations: affiliation ? [affiliation] : [],
              });

              work.contributions.push(contribution);
              multipleContributions[workId][multipleContributionsItemId].push({
                ...contribution,
                selected: false,
                lastContribution: foundedContributor.lastContributionTitle,
              });
            });
          },
        );

        setMultipleFoundedContributors((prev) => ({
          ...prev,
          ...multipleContributions,
        }));

        setWorks((prev) => [...prev, work]);

        // Series
        const existingSeries = serieses.find((series) => series.name === seriesName);

        if (!existingSeries) return;

        const existingData = seriesForUpdate[existingSeries.id] ?? [];
        const orderNumber =
          seriesIssueNumber && `${seriesIssueNumber}`.length > 0 ? parseInt(`${seriesIssueNumber}`) : 1;

        setSeriesForUpdate((prev) => ({
          ...prev,
          [existingSeries.id]: [...existingData, { ...work, orderNumber }],
        }));
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

  const handleSelectContributor = (workId: WorkId, itemId: string, contributorId: ContributorId) => {
    const selectedWork = multipleFoundedContributors[workId];

    if (!selectedWork) return;

    const selectedItems = selectedWork[itemId];

    if (!selectedItems) return;

    const updatedContributors = selectedItems.map((item) => {
      if (item.contributorId !== contributorId) return { ...item, selected: false };

      return { ...item, selected: true };
    });

    setMultipleFoundedContributors((prev) => ({
      ...prev,
      [workId]: {
        ...prev[workId],
        [itemId]: updatedContributors,
      },
    }));
  };

  const handleSubmit = () => {
    const updatedWorks: WorkEntity[] = [];

    Object.entries(multipleFoundedContributors).forEach(([workId, data]) => {
      const work = works.find((work) => work.id === workId);

      if (!work) return;

      const appliedContributions: WorkContribution[] = [];

      Object.entries(data).forEach(([_itemId, contributions]) => {
        const contribution = contributions.find(({ selected }) => selected);

        if (!contribution) return;

        const { selected, lastContribution, ...contributionData } = contribution;

        appliedContributions.push(contributionData);
      });

      const updatedWork = {
        ...work,
        contributions: appliedContributions.length > 0 ? appliedContributions : work.contributions,
      };

      updatedWorks.push(updatedWork);
    });

    const updatedWorksIds = updatedWorks.map((work) => work.id);
    const notUpdatedWorks = works.filter((work) => !updatedWorksIds.includes(work.id));

    console.log('Works', [...notUpdatedWorks, ...updatedWorks]);
    console.log('Series', seriesForUpdate);
  };

  if (isDataEmpty) return null;

  return (
    <div className="flex w-full flex-col gap-4">
      <Typography variant="h1" component="h2">
        Multiple contributors found
      </Typography>
      {showContributorsSelection && (
        <TableWrapper>
          <TableHeader
            cells={['Work', 'Search Value', 'Contributors']}
            cellStyles={['min-w-[210px]', 'min-w-[210px]', 'min-w-[210px]']}
          />
          <TableBody>
            {Object.entries(multipleFoundedContributors).map(([workId, data]) => {
              const work = works.find((work) => work.id === workId);

              if (!work) return null;

              const contributions = Object.entries(data);

              return contributions.map(([itemId, contributions]) => {
                const defaultContributor = contributions.find(({ contributorId }) => isDefaultId(contributorId));

                if (contributions.length < 2) return null;

                return (
                  <TableRow key={`${workId}-${itemId}`} className="group">
                    <TableCell className="firstCell">{work.title}</TableCell>
                    <TableCell className="middleCell">{defaultContributor?.fullName ?? ''}</TableCell>
                    <TableCell className="lastCell">
                      {contributions.map(({ id, fullName, orcidId, contributorId, lastContribution, selected }) => (
                        <div key={id} className="flex items-center gap-2 [&:not(:first-child)&:not(:last-child)]:my-4">
                          <Radio
                            checked={selected}
                            onChange={() => handleSelectContributor(workId, itemId, contributorId)}
                            className="self-start"
                          />
                          <Typography className="flex flex-col gap-2">
                            {isDefaultId(contributorId) ? (
                              'Create new'
                            ) : (
                              <>
                                <Typography className="flex items-center gap-1" fontWeight="bold" component="span">
                                  {fullName}
                                  {orcidId && (
                                    <LinkTooltip link={orcidId} linkText={convertOrchidIdToText(orcidId)}>
                                      <OrchidLogo />
                                    </LinkTooltip>
                                  )}
                                </Typography>
                                {lastContribution && lastContribution.length > 0 && (
                                  <Typography component="span">Latest contribution to: {lastContribution}</Typography>
                                )}
                              </>
                            )}
                          </Typography>
                        </div>
                      ))}
                    </TableCell>
                  </TableRow>
                );
              });
            })}
          </TableBody>
        </TableWrapper>
      )}
      <Button variant="contained" color="primary" className="m-auto" onClick={handleSubmit}>
        Submit
      </Button>
    </div>
  );
};
