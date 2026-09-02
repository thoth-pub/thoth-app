/* eslint-disable simple-import-sort/imports */
import { parse } from '@5stones/onix';
import {
  CollectionType,
  LanguageRole,
  MeasureType,
  MeasureUnit,
  NameIdentifierType,
  ProductForm,
  ProductIdentifierType,
  PublishingDateRole,
  TextItemIdentifierType,
  TextType,
  TitleElementLevel,
  TitleType,
  WebsiteRole,
} from '@5stones/onix/dist/enums';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContributorService } from '@/src/entities/contributor';
import type { ContributorEntity } from '@/src/entities/contributor/model/contributor.types';
import { InstitutionService } from '@/src/entities/institution';
import { SeriesEntity } from '@/src/entities/series/model/series.types';

import { LanguageCode, MarkupFormat } from '@/gql/graphql';
import { WorkEntity, WorkId } from '@/src/entities/work/model/work.types';
import { appConfig } from '../../config';
import {
  ContributorTypes,
  LanguageRelation,
  LanguageTypeAlt,
  LocationPlatforms,
  PublicationType,
  SubjectTypes,
  WorkStatuses,
  currencyOptions,
  languageOptions,
  licenseOptions,
} from '../../constants';
import { AbstractTypes } from '../../constants/abstracts';
import { SeriesType } from '../../constants/series';
import { ContributorsForSelection, SeriesImportGroup, SeriesImportPlan } from '../../types';
import { collectWorkIdentifiers } from '../../utils/importPreflight/identifiers';
import {
  ExtendedCollection,
  ExtendedDescriptiveDetail,
  ExtendedONIXMessageRoot,
  ExtendedProduct,
  ExtendedProductSupply,
  ExtendedPublishingDetail,
  OnixRepeatable,
  OnixSubject,
  OnixText,
} from './interfaces';
import { toOnixArray } from './onix';
import XMLParser, { ONIX_PROCESSING_FAILURE_MESSAGE } from './XMLParser';

/**
 * The messages of a result's error issues, in the order the parser reported them. Structured
 * issues are asserted directly where the structure is the point; elsewhere the wording and the
 * order are what these tests are about.
 */
const errorMessages = (result: Awaited<ReturnType<XMLParser['parse']>>) =>
  result.issues.filter(({ severity }) => severity === 'error').map(({ message }) => message);

const lookupProduct = ({
  title,
  imprintName,
  languageCode,
  contributorName,
  contributorRor,
  fundingRor,
}: {
  title: string;
  imprintName: string;
  languageCode: string;
  contributorName?: string;
  contributorRor?: string;
  /** `null` includes a funding publisher with no ROR identifier; `undefined` includes none. */
  fundingRor?: string | null;
}): ExtendedProduct => ({
  DescriptiveDetail: {
    ProductForm: ProductForm._BC,
    TitleDetail: { TitleElement: { TitleText: title } },
    Language: { LanguageCode: languageCode },
    Contributor: contributorName
      ? [
          {
            ContributorRole: 'A01',
            PersonName: contributorName,
            ProfessionalAffiliation:
              contributorRor === undefined ? undefined : { AffiliationIdentifier: { IDValue: contributorRor } },
          },
        ]
      : undefined,
  } as ExtendedDescriptiveDetail,
  PublishingDetail: {
    Imprint: { ImprintName: imprintName },
    PublishingStatus: '04',
    Publisher:
      fundingRor === undefined
        ? undefined
        : [
            {
              PublishingRole: '16',
              PublisherIdentifier: fundingRor === null ? undefined : { PublisherIDType: '40', IDValue: fundingRor },
              Funding: [{ FundingIdentifier: [] }],
            },
          ],
  } as ExtendedPublishingDetail,
});

describe('XMLParser', () => {
  let mockContributorService: ContributorService;
  let mockInstitutionService: InstitutionService;
  let imprints: Array<{ label: string; value: string }>;
  let licenses: Array<{ label: string; value: string }>;
  let languages: Array<{ label: string; value: string }>;
  let serieses: SeriesEntity[];
  let currencies: Array<{ label: string; value: string }>;

  beforeEach(() => {
    mockContributorService = {
      getContributors: vi.fn().mockResolvedValue([]),
      getContributorsByOrcids: vi.fn().mockResolvedValue([]),
    } as unknown as ContributorService;

    mockInstitutionService = {
      getInstitutions: vi.fn().mockResolvedValue([]),
    } as unknown as InstitutionService;

    imprints = [
      { label: faker.company.name(), value: faker.string.uuid() },
      { label: faker.company.name(), value: faker.string.uuid() },
    ];

    licenses = licenseOptions;
    languages = languageOptions;
    currencies = currencyOptions;

    serieses = [
      {
        id: faker.string.uuid(),
        name: faker.string.sample(),
        type: SeriesType.enum.BookSeries,
        issnPrint: faker.string.uuid(),
        issnDigital: faker.string.uuid(),
        updatedAt: faker.date.recent().toISOString(),
        imprintId: imprints[0].value,
        imprintName: faker.company.name(),
        url: faker.internet.url(),
        cfpUrl: faker.internet.url(),
        description: faker.lorem.sentence(),
        issues: [],
      },
    ];
  });

  describe('parse', () => {
    it('reports a safe file-level diagnostic while logging the original unexpected error', async () => {
      const originalError = new Error('backend contributor lookup exploded');
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(mockContributorService.getContributors).mockRejectedValue(originalError);
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: lookupProduct({
            title: 'A valid book',
            imprintName: imprints[0].label,
            languageCode: languages[0].value,
            contributorName: 'Jane Doe',
          }),
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencies,
      );

      try {
        const result = await parser.parse();

        expect(result).toEqual({
          status: 'failed',
          data: {
            plan: { works: [], chapters: [], series: [] },
            contributorsForSelection: {},
          },
          issues: [
            {
              severity: 'error',
              code: 'onix.processing_failed',
              message: ONIX_PROCESSING_FAILURE_MESSAGE,
              source: { kind: 'file' },
            },
          ],
        });
        expect(result.issues[0].message).not.toBe('errors.xmlParsingError');
        expect(result.issues[0].message).not.toContain(originalError.message);
        expect(consoleError).toHaveBeenCalledWith('Unexpected error while processing ONIX bulk import', originalError);
      } finally {
        consoleError.mockRestore();
      }
    });

    it('should return failed status if products are empty in XML', async () => {
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencies,
      );

      const result = await parser.parse();

      expect(result.status).toBe('failed');
      // A message with no product to blame: the problem is the file itself.
      expect(result.issues).toEqual([
        {
          severity: 'error',
          code: 'onix.no_products',
          message: 'No products found in XML file',
          source: { kind: 'file' },
        },
      ]);
      expect(result.data.plan.works).toHaveLength(0);
      expect(result.data.plan.chapters).toHaveLength(0);
      expect(result.data.plan.series).toEqual([]);
    });

    it('should return failed status if products not found in XML', async () => {
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: undefined,
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencies,
      );

      const result = await parser.parse();

      expect(result.status).toBe('failed');
      expect(errorMessages(result)).toContain('No products found in XML file');
      expect(result.data.plan.works).toHaveLength(0);
      expect(result.data.plan.chapters).toHaveLength(0);
      expect(result.data.plan.series).toEqual([]);
    });

    it('coalesces repeated contributor and shared contributor/funding ROR lookups across products', async () => {
      const ror = 'https://ror.org/03vek6s52';
      const contributorName = 'Jane Doe';
      const existingContributor = {
        id: 'existing-contributor',
        name: contributorName,
        fullName: contributorName,
        firstName: 'Jane',
        lastName: 'Doe',
        orcid: '',
        website: '',
        updatedAt: '',
        lastContributionTitle: 'Earlier work',
      };
      const exactInstitution = {
        id: 'exact-institution',
        name: 'Exact Institution',
        ror,
        doi: '',
        countryCode: '',
        updatedAt: '',
      };
      vi.mocked(mockContributorService.getContributors).mockResolvedValue([existingContributor]);
      vi.mocked(mockInstitutionService.getInstitutions).mockResolvedValue([exactInstitution]);
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: ['First', 'Second', 'Third'].map((title) =>
            lookupProduct({
              title,
              imprintName: imprints[0].label,
              languageCode: languages[0].value,
              contributorName,
              contributorRor: ror,
              fundingRor: ror,
            }),
          ),
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencies,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(mockContributorService.getContributors).toHaveBeenCalledTimes(1);
      expect(mockContributorService.getContributors).toHaveBeenCalledWith(contributorName);
      expect(mockInstitutionService.getInstitutions).toHaveBeenCalledTimes(1);
      expect(mockInstitutionService.getInstitutions).toHaveBeenCalledWith(
        0,
        appConfig.data.maxItemsPerRequestLimit,
        ror,
      );
      expect(result.data.plan.works.map((work) => work.titles[0].title)).toEqual(['First', 'Second', 'Third']);
      expect(result.data.plan.works.every((work) => work.fundings[0]?.institutionRor === ror)).toBe(true);

      for (const work of result.data.plan.works) {
        const [options] = Object.values(result.data.contributorsForSelection[work.id]);

        expect(options.map(({ selected }) => selected)).toEqual([true, false]);
        expect(options.map(({ fullName }) => fullName)).toEqual([contributorName, contributorName]);
      }
    });

    it('keeps a matched contributor selectable when no latest-contribution hint is available', async () => {
      // Issue #107: this is the lookup result for a contributor whose historical work has no
      // canonical title. It used to never exist — the whole GetContributors operation rejected
      // instead — and that rejection made a valid ONIX file fail before preview.
      const contributorName = 'David Joseph Example';
      const hintlessContributor = {
        id: 'existing-hintless',
        name: contributorName,
        fullName: contributorName,
        firstName: 'David Joseph',
        lastName: 'Example',
        orcid: '',
        website: '',
        updatedAt: '',
        lastContributionTitle: '',
      };
      vi.mocked(mockContributorService.getContributors).mockResolvedValue([hintlessContributor]);
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: lookupProduct({
            title: 'A valid book',
            imprintName: imprints[0].label,
            languageCode: languages[0].value,
            contributorName,
          }),
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencies,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.issues.filter(({ code }) => code === 'onix.processing_failed')).toEqual([]);

      const [work] = result.data.plan.works;
      const [options] = Object.values(result.data.contributorsForSelection[work.id]);

      // The create-new default plus the matched existing identity, hint simply absent.
      expect(options.map(({ selected, contributorId, lastContribution }) => ({ selected, contributorId, lastContribution }))).toEqual([
        { selected: true, contributorId: work.contributions[0].contributorId, lastContribution: '' },
        { selected: false, contributorId: 'existing-hintless', lastContribution: '' },
      ]);
      expect(options[1].fullName).toBe(contributorName);
    });

    it('does not query institutions for absent or blank contributor and funding RORs', async () => {
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            lookupProduct({
              title: 'Absent RORs',
              imprintName: imprints[0].label,
              languageCode: languages[0].value,
              contributorName: 'Absent ROR Contributor',
              fundingRor: null,
            }),
            lookupProduct({
              title: 'Blank RORs',
              imprintName: imprints[0].label,
              languageCode: languages[0].value,
              contributorName: 'Blank ROR Contributor',
              contributorRor: '   ',
              fundingRor: '   ',
            }),
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencies,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(mockInstitutionService.getInstitutions).not.toHaveBeenCalled();
      expect(result.data.plan.works.every((work) => work.contributions[0].affiliations.length === 0)).toBe(true);
      expect(result.data.plan.works.every((work) => work.fundings.length === 0)).toBe(true);
    });

    it('should successfully parse valid XML with a single product', async () => {
      const doi = '10.12345/test';
      const lccn = '2017123456';
      const oclc = '1086123456';
      const isbn = '9781234567890';
      const title = faker.lorem.sentence();
      const subtitle = faker.lorem.sentence();
      const language = languages[0];
      const edition = faker.number.int(10);
      const imprint = imprints[0];

      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              ProductIdentifier: [
                { ProductIDType: ProductIdentifierType._06, IDValue: doi },
                { ProductIDType: ProductIdentifierType._13, IDValue: lccn },
                { ProductIDType: ProductIdentifierType._23, IDValue: oclc },
                { ProductIDType: ProductIdentifierType._15, IDValue: isbn },
              ],
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: {
                  TitleElement: {
                    TitleText: title,
                    Subtitle: subtitle,
                  },
                },
                Edition: {
                  EditionNumber: edition.toString(),
                },
                Language: {
                  LanguageCode: language.value,
                },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: {
                  ImprintName: imprint.label,
                },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencies,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works).toHaveLength(1);
      const work = result.data.plan.works[0];
      expect(work.titles[0].title).toBe(title);
      expect(work.titles[0].subtitle).toBe(subtitle);
      expect(work.doi).toContain(doi);
      expect(work.lccn).toBe(lccn);
      expect(work.oclc).toBe(oclc);
      expect(work.edition).toBe(edition);
    });

    it('should successfully parse multiple products', async () => {
      const doi1 = '10.12345/123';
      const doi2 = '10.12345/345';
      const title1 = faker.lorem.sentence();
      const title2 = faker.lorem.sentence();
      const language1 = languages[0];
      const language2 = languages[1];
      const imprint1 = imprints[0];
      const imprint2 = imprints[1];
      const product1 = {
        ProductIdentifier: [{ ProductIDType: ProductIdentifierType._06, IDValue: doi1 }],
        DescriptiveDetail: {
          ProductForm: ProductForm._BC,
          TitleDetail: { TitleElement: { TitleText: title1 } },
          Language: { LanguageCode: language1.value },
        } as ExtendedDescriptiveDetail,
        PublishingDetail: {
          Imprint: { ImprintName: imprint1.label },
          PublishingStatus: '04',
        },
      };
      const product2 = {
        ProductIdentifier: [{ ProductIDType: ProductIdentifierType._06, IDValue: doi2 }],
        DescriptiveDetail: {
          ProductForm: ProductForm._BC,
          TitleDetail: { TitleElement: { TitleText: title2 } },
          Language: { LanguageCode: language2.value },
        } as ExtendedDescriptiveDetail,
        PublishingDetail: {
          Imprint: { ImprintName: imprint2.label },
          PublishingStatus: '04',
        },
      };
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [product1, product2],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works).toHaveLength(2);
      expect(result.data.plan.works[0].titles[0].title).toBe(title1);
      expect(result.data.plan.works[1].titles[0].title).toBe(title2);
      expect(result.data.plan.works[0].doi).toContain(doi1);
      expect(result.data.plan.works[1].doi).toContain(doi2);
      expect(result.data.plan.works[0].languages).toHaveLength(1);
      expect(result.data.plan.works[0].languages[0].code).toBe(language1.value as LanguageCode);
      expect(result.data.plan.works[1].languages).toHaveLength(1);
      expect(result.data.plan.works[1].languages[0].code).toBe(language2.value as LanguageCode);
    });

    it('should fail when imprint is not found', async () => {
      const language = languages[0];
      const imprint = faker.company.name();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: faker.lorem.sentence() } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('failed');
      expect(errorMessages(result)).toContain(`Imprint ${imprint} not found for product 1`);
    });

    it('should fail when language is not found', async () => {
      const language = faker.string.sample();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: 'Test Book' } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: 'My Publisher Imprint' },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('failed');
      expect(errorMessages(result).some((e) => e.includes(`Language ${language} not found`))).toBe(true);
    });
  });

  describe('specific fields', () => {
    it('should parse DOI with prefix', async () => {
      const prefix = appConfig.validations.doiPrefix;
      const doi = '10.12345/123';
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              ProductIdentifier: [{ ProductIDType: ProductIdentifierType._06, IDValue: doi }],
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].doi).toContain(`${prefix}${doi}`);
    });

    it('doi should be empty if not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].doi).toEqual('');
    });

    it('should parse lccn', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const lccn = '2017123456';
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              ProductIdentifier: [{ ProductIDType: ProductIdentifierType._13, IDValue: lccn }],
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].lccn).toEqual(lccn);
    });

    it('should parse oclc', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const oclc = '1086123456';
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              ProductIdentifier: [{ ProductIDType: ProductIdentifierType._23, IDValue: oclc }],
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].oclc).toEqual(oclc);
    });

    it('should parse title and subtitle', async () => {
      const title = faker.lorem.sentence();
      const subtitle = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title, Subtitle: subtitle } },
                Language: { LanguageCode: languages[0].value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprints[0].label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].titles[0].title).toBe(title);
      expect(result.data.plan.works[0].titles[0].subtitle).toBe(subtitle);
      expect(result.data.plan.works[0].titles[0].fullTitle).toBe(`${title} ${subtitle}`);
      expect(result.data.plan.works[0].titles[0].localeCode).toBe(LanguageTypeAlt.enum.En);
    });

    it('should parse title if subtitle is not provided', async () => {
      const title = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: languages[0].value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprints[0].label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].titles[0].title).toBe(title);
      expect(result.data.plan.works[0].titles[0].subtitle).toEqual('');
      expect(result.data.plan.works[0].titles[0].fullTitle).toBe(title);
      expect(result.data.plan.works[0].titles[0].localeCode).toBe(LanguageTypeAlt.enum.En);
    });

    it('should parse abstracts', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const longAbstract = faker.lorem.sentence();
      const shortAbstract = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              CollateralDetail: {
                TextContent: [
                  { TextType: TextType._03, Text: { '#text': longAbstract } },
                  { TextType: TextType._02, Text: { '#text': shortAbstract } },
                ],
              },
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].abstracts).toHaveLength(2);
      expect(result.data.plan.works[0].abstracts[0].content).toBe(longAbstract);
      expect(result.data.plan.works[0].abstracts[0].type).toBe(AbstractTypes.enum.Long);
      expect(result.data.plan.works[0].abstracts[0].canonical).toBe(true);
      expect(result.data.plan.works[0].abstracts[0].localeCode).toBe(LanguageTypeAlt.enum.En);
      expect(result.data.plan.works[0].abstracts[1].content).toBe(shortAbstract);
      expect(result.data.plan.works[0].abstracts[1].type).toBe(AbstractTypes.enum.Short);
      expect(result.data.plan.works[0].abstracts[1].canonical).toBe(false);
      expect(result.data.plan.works[0].abstracts[1].localeCode).toBe(LanguageTypeAlt.enum.En);
    });

    it('should parse long abstract if short abstract is not provided', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const longAbstract = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              CollateralDetail: {
                TextContent: [{ TextType: TextType._03, Text: { '#text': longAbstract } }],
              },
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].abstracts).toHaveLength(1);
      expect(result.data.plan.works[0].abstracts[0].content).toBe(longAbstract);
      expect(result.data.plan.works[0].abstracts[0].type).toBe(AbstractTypes.enum.Long);
      expect(result.data.plan.works[0].abstracts[0].canonical).toBe(true);
      expect(result.data.plan.works[0].abstracts[0].localeCode).toBe(LanguageTypeAlt.enum.En);
    });

    it('should parse short abstract if long abstract is not provided', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const shortAbstract = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              CollateralDetail: {
                TextContent: [{ TextType: TextType._02, Text: { '#text': shortAbstract } }],
              },
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].abstracts).toHaveLength(1);
      expect(result.data.plan.works[0].abstracts[0].content).toBe(shortAbstract);
      expect(result.data.plan.works[0].abstracts[0].type).toBe(AbstractTypes.enum.Short);
      expect(result.data.plan.works[0].abstracts[0].canonical).toBe(false);
      expect(result.data.plan.works[0].abstracts[0].localeCode).toBe(LanguageTypeAlt.enum.En);
    });

    it('abstracts should be empty if not provided', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].abstracts).toHaveLength(0);
    });

    const parseProductLicense = (enteredLicense?: string) => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                EpubLicense:
                  enteredLicense === undefined
                    ? undefined
                    : { EpubLicenseExpression: { EpubLicenseExpressionLink: enteredLicense } },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };

      return new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      ).parse();
    };

    it('keeps an exact configured canonical licence unchanged', async () => {
      const canonicalLicense = 'https://creativecommons.org/licenses/by/4.0/';

      const result = await parseProductLicense(canonicalLicense);

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].license).toBe(canonicalLicense);
    });

    it('canonicalizes a configured CC BY 4.0 legalcode locale URL', async () => {
      const canonicalLicense = 'https://creativecommons.org/licenses/by/4.0/';

      const result = await parseProductLicense(`${canonicalLicense}legalcode.en`);

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0]?.license).toBe(canonicalLicense);
    });

    it('canonicalizes a configured CC BY 4.0 legalcode URL without a locale', async () => {
      const canonicalLicense = 'https://creativecommons.org/licenses/by/4.0/';

      const result = await parseProductLicense(`${canonicalLicense}legalcode`);

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0]?.license).toBe(canonicalLicense);
    });

    it('canonicalizes a configured CC BY 4.0 deed URL without a locale', async () => {
      const canonicalLicense = 'https://creativecommons.org/licenses/by/4.0/';

      const result = await parseProductLicense(`${canonicalLicense}deed`);

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0]?.license).toBe(canonicalLicense);
    });

    it('canonicalizes a configured CC BY 4.0 deed locale URL', async () => {
      const canonicalLicense = 'https://creativecommons.org/licenses/by/4.0/';

      const result = await parseProductLicense(`${canonicalLicense}deed.fr`);

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0]?.license).toBe(canonicalLicense);
    });

    it('canonicalizes a configured CC BY-SA representation to its own family', async () => {
      const canonicalLicense = 'https://creativecommons.org/licenses/by-sa/4.0/';

      const result = await parseProductLicense(`${canonicalLicense}legalcode.en`);

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0]?.license).toBe(canonicalLicense);
    });

    it('keeps a missing licence empty', async () => {
      const result = await parseProductLicense();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0]?.license).toBe('');
      expect(errorMessages(result)).toEqual([]);
    });

    it('keeps a blank licence empty', async () => {
      const result = await parseProductLicense('   ');

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0]?.license).toBe('');
      expect(errorMessages(result)).toEqual([]);
    });

    it('keeps a bare representation suffix blocking', async () => {
      const enteredLicense = 'legalcode.en';

      const result = await parseProductLicense(enteredLicense);

      expect(result.status).toBe('failed');
      expect(result.data.plan.works).toHaveLength(0);
      expect(errorMessages(result)).toContain(`License ${enteredLicense} not found for product 1`);
    });

    it('keeps an exact configured CC0 licence unchanged', async () => {
      const canonicalLicense = 'https://creativecommons.org/publicdomain/zero/1.0/';

      const result = await parseProductLicense(canonicalLicense);

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0]?.license).toBe(canonicalLicense);
    });

    it('keeps an exact configured Public Domain Mark licence unchanged', async () => {
      const canonicalLicense = 'https://creativecommons.org/publicdomain/mark/1.0/';

      const result = await parseProductLicense(canonicalLicense);

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0]?.license).toBe(canonicalLicense);
    });

    it('keeps a CC0 representation suffix blocking', async () => {
      const enteredLicense = 'https://creativecommons.org/publicdomain/zero/1.0/legalcode.en';

      const result = await parseProductLicense(enteredLicense);

      expect(result.status).toBe('failed');
      expect(result.data.plan.works).toHaveLength(0);
      expect(errorMessages(result)).toContain(`License ${enteredLicense} not found for product 1`);
    });

    it('keeps a Public Domain Mark representation suffix blocking', async () => {
      const enteredLicense = 'https://creativecommons.org/publicdomain/mark/1.0/deed.en';

      const result = await parseProductLicense(enteredLicense);

      expect(result.status).toBe('failed');
      expect(result.data.plan.works).toHaveLength(0);
      expect(errorMessages(result)).toContain(`License ${enteredLicense} not found for product 1`);
    });

    it('keeps a representation suffix with a punctuation-only locale blocking', async () => {
      const enteredLicense = 'https://creativecommons.org/licenses/by/4.0/legalcode.---';

      const result = await parseProductLicense(enteredLicense);

      expect(result.status).toBe('failed');
      expect(result.data.plan.works).toHaveLength(0);
      expect(errorMessages(result)).toContain(`License ${enteredLicense} not found for product 1`);
    });

    it('keeps a representation suffix with arbitrary text blocking', async () => {
      const enteredLicense =
        'https://creativecommons.org/licenses/by/4.0/legalcode.not-a-license-page';

      const result = await parseProductLicense(enteredLicense);

      expect(result.status).toBe('failed');
      expect(result.data.plan.works).toHaveLength(0);
      expect(errorMessages(result)).toContain(`License ${enteredLicense} not found for product 1`);
    });

    it('canonicalizes a representation URL with an ordinary hyphenated locale', async () => {
      const canonicalLicense = 'https://creativecommons.org/licenses/by/4.0/';

      const result = await parseProductLicense(`${canonicalLicense}deed.zh-Hant-TW`);

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0]?.license).toBe(canonicalLicense);
    });

    it('keeps an unknown noncanonical licence URL blocking', async () => {
      const enteredLicense = 'https://example.com/licenses/unknown';

      const result = await parseProductLicense(enteredLicense);

      expect(result.status).toBe('failed');
      expect(result.data.plan.works).toHaveLength(0);
      expect(errorMessages(result)).toContain(`License ${enteredLicense} not found for product 1`);
    });

    it('keeps a deceptive continuation of a configured licence URL blocking', async () => {
      const enteredLicense = 'https://creativecommons.org/licenses/by/4.0/not-a-license-page';

      const result = await parseProductLicense(enteredLicense);

      expect(result.status).toBe('failed');
      expect(result.data.plan.works).toHaveLength(0);
      expect(errorMessages(result)).toContain(`License ${enteredLicense} not found for product 1`);
    });

    it('should parse bibliography note', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const bibliographyNote = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                Language: { LanguageCode: language.value },
                IllustrationsNote: { IllustrationsNoteText: bibliographyNote },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].bibliographyNote).toBe(bibliographyNote);
    });

    it('should return empty bibliography note if not provided', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].bibliographyNote).toEqual('');
    });

    it('should parse general note', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const generalNote = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              CollateralDetail: {
                TextContent: [{ TextType: TextType._13, Text: { '#text': generalNote } }],
              },
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].generalNote).toBe(generalNote);
    });

    it('should return empty general note if not provided', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].bibliographyNote).toEqual('');
    });

    it('should parse edition number', async () => {
      const language = languages[0];
      const edition = faker.number.int(10);
      const imprint = imprints[0];
      const title = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                Edition: { EditionNumber: edition.toString() },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].edition).toBe(edition);
    });

    it('should default edition to 1 when not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].edition).toBe(1);
    });

    it('should parse page count', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const pageCount = faker.number.int(1000);
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                Extent: { ExtentValue: pageCount.toString() },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].pageCount).toBe(pageCount);
    });

    it('should parse media counts', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const imageCount = faker.number.int(1);
      const tableCount = faker.number.int(2);
      const audioCount = faker.number.int(3);
      const videoCount = faker.number.int(4);
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                AncillaryContent: [
                  { AncillaryContentType: '09', Number: imageCount }, // images
                  { AncillaryContentType: '11', Number: tableCount }, // tables
                  { AncillaryContentType: '19', Number: audioCount }, // audio
                  { AncillaryContentType: '00', Number: videoCount }, // video
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].imageCount).toBe(imageCount);
      expect(result.data.plan.works[0].tableCount).toBe(tableCount);
      expect(result.data.plan.works[0].audioCount).toBe(audioCount);
      expect(result.data.plan.works[0].videoCount).toBe(videoCount);
    });

    it('should parse forthcoming work status', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const workStatus = '02';
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: workStatus,
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].status).toBe(WorkStatuses.enum.Forthcoming);
    });

    it('should parse cancelled work status', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const workStatus = '01';
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: workStatus,
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].status).toBe(WorkStatuses.enum.Cancelled);
    });

    it('should parse active work status', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const workStatus = '04';
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: workStatus,
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].status).toBe(WorkStatuses.enum.Active);
    });

    it('should parse withdrawn work status', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const workStatus = '16';
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: workStatus,
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].status).toBe(WorkStatuses.enum.Withdrawn);
    });

    it('should parse superseded work status', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const workStatus = '21';
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: workStatus,
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].status).toBe(WorkStatuses.enum.Superseded);
    });

    it('should set work status to forthcoming if invalid work status is provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const workStatus = '000000';
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: workStatus,
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].status).toBe(WorkStatuses.enum.Forthcoming);
    });

    it('should set work status to forthcoming if not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].status).toBe(WorkStatuses.enum.Forthcoming);
    });

    it('should parse publication and withdrawn dates', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const publicationDate = '20240101';
      const withdrawnDate = '20250101';
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprints[0].label },
                // 16 Withdrawn: the only kind of work Thoth stores a withdrawn date for.
                PublishingStatus: '16',
                PublishingDate: [
                  { PublishingDateRole: PublishingDateRole._01, Date: { '#text': publicationDate } },
                  { PublishingDateRole: PublishingDateRole._13, Date: { '#text': withdrawnDate } },
                ],
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      // ONIX writes a complete date as YYYYMMDD; Thoth stores a calendar date.
      expect(result.data.plan.works[0].publicationDate).toBe('2024-01-01');
      expect(result.data.plan.works[0].withdrawnDate).toBe('2025-01-01');
    });

    it('should return empty publication and withdrawn dates if not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprints[0].label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].publicationDate).toEqual('');
      expect(result.data.plan.works[0].withdrawnDate).toEqual('');
    });

    it('should parse copyright holder', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const copyrightHolder = faker.person.fullName();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                CopyrightStatement: { CopyrightOwner: { PersonName: copyrightHolder } },
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].copyrightHolder).toBe(copyrightHolder);
    });

    it('should return empty copyright holder if not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].copyrightHolder).toEqual('');
    });

    it('should parse landing page', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const landingPage = faker.internet.url();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
                Publisher: [
                  {
                    Website: [
                      { WebsiteRole: WebsiteRole._01, WebsiteLink: landingPage },
                      { WebsiteRole: WebsiteRole._02, WebsiteLink: landingPage },
                    ],
                  },
                ],
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].landingPage).toBe(landingPage);
    });

    it('should return empty landing page if not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].landingPage).toEqual('');
    });

    const parseSubjectEntities = async (subjects: OnixSubject[]) => {
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: faker.lorem.sentence() } },
                Language: { LanguageCode: languages[0].value },
                Subject: subjects,
              },
              PublishingDetail: {
                Imprint: { ImprintName: imprints[0].label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');

      return result.data.plan.works[0].subjects;
    };

    it('should return empty subjects if not provided', async () => {
      expect(await parseSubjectEntities([])).toEqual([]);
    });

    it('imports Arc’s Thema code instead of its descriptive heading', async () => {
      const heading = 'Literary studies: c 1600 to c 1800';
      const subjects = await parseSubjectEntities([
        { SubjectSchemeIdentifier: '93', SubjectCode: 'DSBD', SubjectHeadingText: heading },
      ]);

      expect(subjects).toEqual([{ id: appConfig.defaultId, code: 'DSBD', type: SubjectTypes.enum.Thema, ordinal: 1 }]);
      expect(subjects[0].code).not.toBe(heading);
    });

    it.each([
      ['04', SubjectTypes.enum.Lcc, 'PS3563.O8749', 'Morrison, Toni'],
      ['10', SubjectTypes.enum.Bisac, 'LIT004290', 'LITERARY CRITICISM / Women Authors'],
      ['12', SubjectTypes.enum.Bic, 'DSBD', 'Literary studies: c 1500 to c 1800'],
    ])('imports controlled scheme %s from SubjectCode', async (scheme, type, code, heading) => {
      const subjects = await parseSubjectEntities([
        { SubjectSchemeIdentifier: scheme, SubjectCode: code, SubjectHeadingText: heading },
      ]);

      expect(subjects).toEqual([{ id: appConfig.defaultId, code, type, ordinal: 1 }]);
      expect(subjects[0].code).not.toBe(heading);
    });

    it('uses codes for controlled schemes, headings for text schemes, and preserves grouped ordering', async () => {
      const keyword = 'literary culture; aristocratic life; women’s writing';
      const custom = 'My publisher subject';
      const subjects = await parseSubjectEntities([
        {
          SubjectSchemeIdentifier: 'B2',
          SubjectCode: 'INCIDENTAL-CUSTOM-CODE',
          SubjectHeadingText: custom,
        },
        {
          SubjectSchemeIdentifier: '93',
          SubjectCode: 'DSBD',
          SubjectHeadingText: 'Literary studies: c 1600 to c 1800',
        },
        {
          SubjectSchemeIdentifier: '20',
          SubjectCode: 'INCIDENTAL-KEYWORD-CODE',
          SubjectHeadingText: keyword,
        },
        {
          SubjectSchemeIdentifier: '12',
          SubjectCode: 'HBLH',
          SubjectHeadingText: 'Early modern history: c 1450/1500 to c 1700',
        },
        {
          SubjectSchemeIdentifier: '10',
          SubjectCode: 'LIT004290',
          SubjectHeadingText: 'LITERARY CRITICISM / Women Authors',
        },
        {
          SubjectSchemeIdentifier: '04',
          SubjectCode: 'PS3563.O8749',
          SubjectHeadingText: 'Morrison, Toni',
        },
      ]);

      expect(subjects).toEqual([
        {
          id: appConfig.defaultId,
          code: 'PS3563.O8749',
          type: SubjectTypes.enum.Lcc,
          ordinal: 1,
        },
        {
          id: appConfig.defaultId,
          code: 'LIT004290',
          type: SubjectTypes.enum.Bisac,
          ordinal: 2,
        },
        {
          id: appConfig.defaultId,
          code: 'HBLH',
          type: SubjectTypes.enum.Bic,
          ordinal: 3,
        },
        {
          id: appConfig.defaultId,
          code: keyword,
          type: SubjectTypes.enum.Keyword,
          ordinal: 4,
        },
        {
          id: appConfig.defaultId,
          code: 'DSBD',
          type: SubjectTypes.enum.Thema,
          ordinal: 5,
        },
        {
          id: appConfig.defaultId,
          code: custom,
          type: SubjectTypes.enum.Custom,
          ordinal: 6,
        },
      ]);
      expect(subjects.map(({ code }) => code)).not.toContain('Literary studies: c 1600 to c 1800');
      expect(subjects.map(({ code }) => code)).not.toContain('LITERARY CRITICISM / Women Authors');
      expect(subjects[3].code).toBe(keyword);
      expect(subjects[5].code).toBe(custom);
    });

    it('omits missing controlled codes and leaves unsupported schemes ignored', async () => {
      const themaHeading = 'Literary studies: c 1600 to c 1800';
      const bisacHeading = 'LITERARY CRITICISM / Women Authors';
      const subjects = await parseSubjectEntities([
        { SubjectSchemeIdentifier: '93', SubjectHeadingText: themaHeading },
        { SubjectSchemeIdentifier: '10', SubjectCode: '   ', SubjectHeadingText: bisacHeading },
        { SubjectSchemeIdentifier: '20', SubjectCode: 'INCIDENTAL-KEYWORD-CODE' },
        { SubjectSchemeIdentifier: 'B2', SubjectCode: 'INCIDENTAL-CUSTOM-CODE' },
        { SubjectSchemeIdentifier: '94', SubjectCode: '1DDB' },
        { SubjectSchemeIdentifier: '96', SubjectCode: '3MPQS' },
        { SubjectSchemeIdentifier: 'ZZ', SubjectHeadingText: 'Unknown scheme' },
      ]);

      expect(subjects).toEqual([]);
      expect(subjects).not.toContainEqual(
        expect.objectContaining({ type: SubjectTypes.enum.Thema, code: themaHeading }),
      );
      expect(subjects).not.toContainEqual(
        expect.objectContaining({ type: SubjectTypes.enum.Bisac, code: bisacHeading }),
      );
    });

    it('should return error if language is not provided', async () => {
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('failed');
      expect(errorMessages(result).some((e) => e.includes('Language'))).toBe(true);
      expect(result.data.plan.works).toHaveLength(0);
    });

    it('should return error if language is not found', async () => {
      const language = faker.string.sample();
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('failed');
      expect(errorMessages(result).some((e) => e.includes('Language'))).toBe(true);
      expect(result.data.plan.works).toHaveLength(0);
    });

    it('should parse language if language is valid', async () => {
      const language = languages[0].value;
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].languages).toHaveLength(1);
      expect(result.data.plan.works[0].languages[0].code).toBe(language);
      expect(result.data.plan.works[0].languages[0].relation).toBe(LanguageRelation.enum.Original);
      expect(errorMessages(result)).toHaveLength(0);
    });

    it('should return empty fundings if ror of institution is not found', async () => {
      const language = languages[0].value;
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].fundings).toHaveLength(0);
    });

    it('should parse funding if institution is found by ror', async () => {
      const institutionRor = faker.string.sample();
      const mockInstitution = {
        id: faker.string.sample(),
        name: faker.lorem.sentence(),
        ror: institutionRor,
        doi: faker.string.sample(),
        countryCode: faker.string.sample(),
        updatedAt: faker.date.recent().toISOString(),
      };
      vi.mocked(mockInstitutionService.getInstitutions).mockResolvedValue([mockInstitution]);
      const language = languages[0].value;
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const program = faker.lorem.sentence();
      const projectName = faker.lorem.sentence();
      const projectShortname = faker.lorem.sentence();
      const grantNumber = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
                Publisher: [
                  {
                    PublishingRole: '16',
                    PublisherIdentifier: {
                      PublisherIDType: '40',
                      IDValue: institutionRor,
                    },
                    Funding: [
                      {
                        FundingIdentifier: [
                          {
                            FundingIDType: '01',
                            IDTypeName: 'programname',
                            IDValue: program,
                          },
                          {
                            FundingIDType: '01',
                            IDTypeName: 'projectname',
                            IDValue: projectName,
                          },
                          {
                            FundingIDType: '01',
                            IDTypeName: 'projectshortname',
                            IDValue: projectShortname,
                          },
                          {
                            FundingIDType: '01',
                            IDTypeName: 'grantnumber',
                            IDValue: grantNumber,
                          },
                        ],
                      },
                    ],
                  },
                ],
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].fundings).toHaveLength(1);
      expect(result.data.plan.works[0].fundings[0].institutionId).toBe(mockInstitution.id);
      expect(result.data.plan.works[0].fundings[0].institutionName).toBe(mockInstitution.name);
      expect(result.data.plan.works[0].fundings[0].institutionRor).toBe(mockInstitution.ror);
      expect(result.data.plan.works[0].fundings[0].program).toBe(program);
      expect(result.data.plan.works[0].fundings[0].projectName).toBe(projectName);
      expect(result.data.plan.works[0].fundings[0].projectShortname).toBe(projectShortname);
      expect(result.data.plan.works[0].fundings[0].grantNumber).toBe(grantNumber);
      expect(errorMessages(result)).toHaveLength(0);
    });

    it('should parse publication', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const height = faker.number.int(1000).toString();
      const heightIn = faker.number.int(1000).toString();
      const width = faker.number.int(1000).toString();
      const widthIn = faker.number.int(1000).toString();
      const depth = faker.number.int(1000).toString();
      const depthIn = faker.number.int(1000).toString();
      const weight = faker.number.int(1000).toString();
      const weightOz = faker.number.int(1000).toString();
      const measures = [
        { MeasureType: MeasureType._01, MeasureUnitCode: MeasureUnit.mm, Measurement: height },
        { MeasureType: MeasureType._01, MeasureUnitCode: MeasureUnit.in, Measurement: heightIn },
        { MeasureType: MeasureType._02, MeasureUnitCode: MeasureUnit.mm, Measurement: width },
        { MeasureType: MeasureType._02, MeasureUnitCode: MeasureUnit.in, Measurement: widthIn },
        { MeasureType: MeasureType._03, MeasureUnitCode: MeasureUnit.mm, Measurement: depth },
        { MeasureType: MeasureType._03, MeasureUnitCode: MeasureUnit.in, Measurement: depthIn },
        { MeasureType: MeasureType._08, MeasureUnitCode: MeasureUnit.gr, Measurement: weight },
        { MeasureType: MeasureType._08, MeasureUnitCode: MeasureUnit.oz, Measurement: weightOz },
      ];
      const isbn = '978-3-033-00960-8';
      const landingPage = faker.internet.url();
      const fullTextUrl = faker.internet.url();
      const locationPlatform = LocationPlatforms.options[0];
      const currencyCode = currencyOptions[0].value;
      const priceAmount = faker.number.int(1000).toString();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Measure: measures,
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
              ProductIdentifier: [{ ProductIDType: ProductIdentifierType._15, IDValue: isbn }],
              ProductSupply: {
                SupplyDetail: {
                  Price: [{ CurrencyCode: currencyCode, PriceAmount: priceAmount }],
                  Supplier: {
                    Website: [
                      {
                        WebsiteRole: '02',
                        WebsiteLink: landingPage,
                      },
                      {
                        WebsiteRole: '29',
                        WebsiteLink: fullTextUrl,
                      },
                    ],
                  },
                },
                Market: {
                  Territory: {
                    RegionsIncluded: locationPlatform,
                  },
                },
              } as ExtendedProductSupply,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].publications).toHaveLength(1);
      expect(result.data.plan.works[0].publications[0].height.toString()).toBe(height);
      expect(result.data.plan.works[0].publications[0].heightIn.toString()).toBe(heightIn);
      expect(result.data.plan.works[0].publications[0].width.toString()).toBe(width);
      expect(result.data.plan.works[0].publications[0].widthIn.toString()).toBe(widthIn);
      expect(result.data.plan.works[0].publications[0].depth.toString()).toBe(depth);
      expect(result.data.plan.works[0].publications[0].depthIn.toString()).toBe(depthIn);
      expect(result.data.plan.works[0].publications[0].weight.toString()).toBe(weight);
      expect(result.data.plan.works[0].publications[0].weightOz.toString()).toBe(weightOz);
      expect(result.data.plan.works[0].publications[0].isbn).toBe(isbn);
      expect(result.data.plan.works[0].publications[0].prices).toHaveLength(1);
      expect(result.data.plan.works[0].publications[0].prices[0].currencyCode).toBe(currencyCode);
      expect(result.data.plan.works[0].publications[0].prices[0].unitPrice.toString()).toBe(priceAmount);
      expect(result.data.plan.works[0].publications[0].locations).toHaveLength(1);
      expect(result.data.plan.works[0].publications[0].locations[0].landingPage).toBe(landingPage);
      expect(result.data.plan.works[0].publications[0].locations[0].fullTextUrl).toBe(fullTextUrl);
      expect(result.data.plan.works[0].publications[0].locations[0].locationPlatform).toBe(locationPlatform);
    });

    it('should exclude isbn if it is not valid', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const isbn = faker.string.sample();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
              ProductIdentifier: [{ ProductIDType: ProductIdentifierType._15, IDValue: isbn }],
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].publications).toHaveLength(1);
      expect(result.data.plan.works[0].publications[0].isbn).toBe('');
    });

    it('should parse float numbers', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const height = faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }).toString();
      const heightIn = faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }).toString();
      const width = faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }).toString();
      const widthIn = faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }).toString();
      const depth = faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }).toString();
      const depthIn = faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }).toString();
      const weight = faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }).toString();
      const weightOz = faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }).toString();
      const measures = [
        { MeasureType: MeasureType._01, MeasureUnitCode: MeasureUnit.mm, Measurement: height },
        { MeasureType: MeasureType._01, MeasureUnitCode: MeasureUnit.in, Measurement: heightIn },
        { MeasureType: MeasureType._02, MeasureUnitCode: MeasureUnit.mm, Measurement: width },
        { MeasureType: MeasureType._02, MeasureUnitCode: MeasureUnit.in, Measurement: widthIn },
        { MeasureType: MeasureType._03, MeasureUnitCode: MeasureUnit.mm, Measurement: depth },
        { MeasureType: MeasureType._03, MeasureUnitCode: MeasureUnit.in, Measurement: depthIn },
        { MeasureType: MeasureType._08, MeasureUnitCode: MeasureUnit.gr, Measurement: weight },
        { MeasureType: MeasureType._08, MeasureUnitCode: MeasureUnit.oz, Measurement: weightOz },
      ];
      const landingPage = faker.internet.url();
      const fullTextUrl = faker.internet.url();
      const locationPlatform = LocationPlatforms.options[0];
      const currencyCode = currencyOptions[0].value;
      const priceAmount = faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }).toString();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Measure: measures,
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
              ProductSupply: {
                SupplyDetail: {
                  Price: [{ CurrencyCode: currencyCode, PriceAmount: priceAmount }],
                  Supplier: {
                    Website: [
                      {
                        WebsiteRole: '02',
                        WebsiteLink: landingPage,
                      },
                      {
                        WebsiteRole: '29',
                        WebsiteLink: fullTextUrl,
                      },
                    ],
                  },
                },
                Market: {
                  Territory: {
                    RegionsIncluded: locationPlatform,
                  },
                },
              } as ExtendedProductSupply,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].publications).toHaveLength(1);
      expect(result.data.plan.works[0].publications[0].height.toString()).toBe(height);
      expect(result.data.plan.works[0].publications[0].heightIn.toString()).toBe(heightIn);
      expect(result.data.plan.works[0].publications[0].width.toString()).toBe(width);
      expect(result.data.plan.works[0].publications[0].widthIn.toString()).toBe(widthIn);
      expect(result.data.plan.works[0].publications[0].depth.toString()).toBe(depth);
      expect(result.data.plan.works[0].publications[0].depthIn.toString()).toBe(depthIn);
      expect(result.data.plan.works[0].publications[0].weight.toString()).toBe(weight);
      expect(result.data.plan.works[0].publications[0].weightOz.toString()).toBe(weightOz);
      expect(result.data.plan.works[0].publications[0].prices).toHaveLength(1);
      expect(result.data.plan.works[0].publications[0].prices[0].currencyCode).toBe(currencyCode);
      expect(result.data.plan.works[0].publications[0].prices[0].unitPrice.toString()).toBe(priceAmount);
      expect(result.data.plan.works[0].publications[0].locations).toHaveLength(1);
      expect(result.data.plan.works[0].publications[0].locations[0].landingPage).toBe(landingPage);
      expect(result.data.plan.works[0].publications[0].locations[0].fullTextUrl).toBe(fullTextUrl);
      expect(result.data.plan.works[0].publications[0].locations[0].locationPlatform).toBe(locationPlatform);
    });

    it('should parse AJ publication', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._AJ,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].publications).toHaveLength(1);
      expect(result.data.plan.works[0].publications[0].type).toBe(PublicationType.enum.Mp3);
    });

    it('should parse BB publication', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BB,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].publications).toHaveLength(1);
      expect(result.data.plan.works[0].publications[0].type).toBe(PublicationType.enum.Hardback);
    });

    it('should parse BC publication', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].publications).toHaveLength(1);
      expect(result.data.plan.works[0].publications[0].type).toBe(PublicationType.enum.Paperback);
    });

    it('should parse ED publication', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._ED,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].publications).toHaveLength(1);
      expect(result.data.plan.works[0].publications[0].type).toBe(PublicationType.enum.Pdf);
    });

    it('should return empty publications if product form is not valid', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: faker.string.sample(),
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].publications).toHaveLength(0);
    });

    it('should parse series', async () => {
      const seriesName = serieses[0].name;
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Collection: [
                  {
                    TitleDetail: { TitleElement: { TitleText: seriesName } },
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            },
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      const plan = result.data.plan.series as SeriesImportPlan;
      expect(plan).toHaveLength(1);
      expect(plan[0].target).toEqual({ kind: 'existing', seriesId: serieses[0].id });
      // Membership is a reference to the plan's own work, not a copy of it.
      expect(plan[0].members).toEqual([{ workId: result.data.plan.works[0].id, orderNumber: 1 }]);
      expect(result.data.plan.works[0].titles[0].title).toBe(title);
    });

    it('should parser references', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      // A DOI has to look like one: the importer no longer prefixes a resolver onto any string.
      const citedDoi = `10.${faker.string.numeric(5)}/${faker.string.alpha(8)}`;
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
              RelatedMaterial: {
                // A translation of the work, which is a work relation and not a citation.
                RelatedWork: [
                  {
                    WorkRelationCode: '29',
                    WorkIdentifier: { WorkIDType: '06', IDValue: `10.${faker.string.numeric(5)}/original` },
                  },
                ],
                RelatedProduct: [
                  {
                    ProductRelationCode: '34',
                    ProductIdentifier: { ProductIDType: '06', IDValue: citedDoi },
                  },
                ],
              },
            },
          ] as ExtendedProduct[],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      // Only the cited product becomes a reference: the related work is a translation.
      expect(result.data.plan.works[0].references).toHaveLength(1);
      expect(result.data.plan.works[0].references[0].doi).toContain(citedDoi);
    });

    it('should parse contributors', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorLastName = faker.person.fullName();
      const contributorFirstName = faker.person.fullName();
      const contributorFullName = faker.person.fullName();
      // A declared ORCID, as ONIX defines one. This used to be an undeclared `faker.string.sample()`
      // read straight out of the first NameIdentifier, which asserted that any identifier of any
      // scheme became the contributor's ORCID — the misreading issue #135's review corrected.
      const contributorOrcid = '0000-0001-6365-5189';
      const contributorWebsite = faker.internet.url();
      const biography = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A19',
                    PersonName: contributorFullName,
                    KeyNames: contributorLastName,
                    NamesBeforeKey: contributorFirstName,
                    NameIdentifier: {
                      NameIDType: NameIdentifierType._21,
                      IDValue: contributorOrcid,
                    },
                    Website: {
                      WebsiteLink: contributorWebsite,
                    },
                    BiographicalNote: biography,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].lastName).toBe(contributorLastName);
      expect(result.data.plan.works[0].contributions[0].firstName).toBe(contributorFirstName);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].orcidId).toBe(contributorOrcid);
      expect(result.data.plan.works[0].contributions[0].website).toBe(contributorWebsite);
      expect(result.data.plan.works[0].contributions[0].biographies[0].content).toBe(biography);
    });

    it('should parse A19 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A19',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.AfterwordBy);
    });

    it('should parse A01 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A01',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.Author);
    });

    it('should parse A32 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A32',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.ContributionsBy);
    });

    it('should parse B01 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'B01',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.Editor);
    });

    it('should parse A23 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A23',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.ForewordBy);
    });

    it('should parse A12 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A12',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.Illustrator);
    });

    it('should parse A34 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A34',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.Indexer);
    });

    it('should parse A24 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A24',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.IntroductionBy);
    });

    it('should parse A06 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A06',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.MusicEditor);
    });

    it('should parse A08 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A08',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.Photographer);
    });

    it('should parse A15 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A15',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.PrefaceBy);
    });

    it('should parse A51 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A51',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.ResearchBy);
    });

    it('should parse A30 contributor role', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A30',
                    PersonName: contributorFullName,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.SoftwareBy);
    });

    it('should parse affiliation if institution is found by ror id', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const contributorAffiliationRor = faker.string.sample();
      const affiliationPosition = faker.lorem.sentence();
      const mockInstitution = {
        id: faker.string.sample(),
        name: faker.lorem.sentence(),
        ror: contributorAffiliationRor,
        doi: faker.string.sample(),
        countryCode: faker.string.sample(),
        updatedAt: faker.date.recent().toISOString(),
      };
      vi.mocked(mockInstitutionService.getInstitutions).mockResolvedValue([mockInstitution]);
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A01',
                    PersonName: contributorFullName,
                    ProfessionalAffiliation: {
                      AffiliationIdentifier: { IDValue: contributorAffiliationRor },
                      ProfessionalPosition: affiliationPosition,
                    },
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].type).toBe(ContributorTypes.enum.Author);
      expect(result.data.plan.works[0].contributions[0].affiliations).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].affiliations[0].position).toBe(affiliationPosition);
      expect(result.data.plan.works[0].contributions[0].affiliations[0].institutionName).toBe(mockInstitution.name);
      expect(result.data.plan.works[0].contributions[0].affiliations[0].rorId).toBe(contributorAffiliationRor);
    });

    it('should parse multiple contributors', async () => {
      const mockContributor = {
        id: faker.string.sample(),
        name: faker.lorem.sentence(),
        ror: faker.string.sample(),
        orcid: faker.string.sample(),
        lastName: faker.person.fullName(),
        firstName: faker.person.fullName(),
        fullName: faker.person.fullName(),
        website: faker.internet.url(),
        lastContributionTitle: faker.lorem.sentence(),
        doi: faker.string.sample(),
        countryCode: faker.string.sample(),
        updatedAt: faker.date.recent().toISOString(),
      };
      vi.mocked(mockContributorService.getContributors).mockResolvedValue([mockContributor]);
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorLastName = faker.person.fullName();
      const contributorFirstName = faker.person.fullName();
      const contributorFullName = faker.person.fullName();
      const contributorOrcid = faker.string.sample();
      const contributorWebsite = faker.internet.url();
      const biography = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
                Contributor: [
                  {
                    ContributorRole: 'A19',
                    PersonName: contributorFullName,
                    KeyNames: contributorLastName,
                    NamesBeforeKey: contributorFirstName,
                    NameIdentifier: {
                      IDValue: contributorOrcid,
                    },
                    Website: {
                      WebsiteLink: contributorWebsite,
                    },
                    BiographicalNote: biography,
                  },
                ],
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      // The ImportPlan carries exactly the default "create new" intent for the one source
      // contributor — the existing-contributor match is an alternative, not a second contribution.
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[0].contributorId).toBe(appConfig.defaultId);

      const workId = result.data.plan.works[0].id as WorkId;
      const contributorsForSelection = result.data.contributorsForSelection as ContributorsForSelection;
      const workContributorsForSelection = contributorsForSelection[workId];

      // Both identities remain offered for selection: the default new contributor and the match.
      const [options] = Object.values(workContributorsForSelection);
      expect(options).toHaveLength(2);
      expect(options.map(({ fullName }) => fullName)).toEqual([contributorFullName, mockContributor.fullName]);
    });

    it('should parse chapters', async () => {
      const chapterTitle = faker.lorem.sentence();
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const chapterDoi = `10.${faker.string.numeric(5)}/${faker.string.alpha(8)}`;
      const chapterPageCount = faker.number.int(100);
      const chapterFirstPage = faker.number.int(100);
      const chapterLastPage = faker.number.int(100);

      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
              ContentDetail: {
                ContentItem: [
                  {
                    LevelSequenceNumber: '1',
                    TitleDetail: { TitleElement: { TitleText: chapterTitle } },
                    TextItem: {
                      TextItemIdentifier: {
                        TextItemIDType: TextItemIdentifierType._06,
                        IDValue: chapterDoi,
                      },
                    },
                    NumberOfPages: chapterPageCount,
                    PageRun: {
                      FirstPageNumber: chapterFirstPage.toString(),
                      LastPageNumber: chapterLastPage.toString(),
                    },
                  },
                ] as unknown as ExtendedCollection[],
              },
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works).toHaveLength(1);
      expect(result.data.plan.chapters).toHaveLength(1);
      expect(result.data.plan.chapters[0].titles[0].title).toBe(chapterTitle);
      expect(result.data.plan.chapters[0].doi).toBe(appConfig.validations.doiPrefix + chapterDoi);
      expect(result.data.plan.chapters[0].pageCount).toBe(chapterPageCount);
      expect(result.data.plan.chapters[0].firstPage).toBe(chapterFirstPage.toString());
      expect(result.data.plan.chapters[0].lastPage).toBe(chapterLastPage.toString());
    });

    it('should parse chapters with contributors', async () => {
      const chapterTitle = faker.lorem.sentence();
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const contributorFullName = faker.person.fullName();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language },
              } as ExtendedDescriptiveDetail,
              PublishingDetail: {
                Imprint: { ImprintName: imprint.label },
                PublishingStatus: '04',
              } as ExtendedPublishingDetail,
              ContentDetail: {
                ContentItem: [
                  {
                    LevelSequenceNumber: '1',
                    TitleDetail: { TitleElement: { TitleText: chapterTitle } },
                    Contributor: [
                      {
                        ContributorRole: 'A19',
                        PersonName: contributorFullName,
                      },
                    ],
                  },
                ] as unknown as ExtendedCollection[],
              },
            } as ExtendedProduct,
          ],
        },
      };
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      const result = await parser.parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toHaveLength(0);
      expect(result.data.plan.works).toHaveLength(1);
      expect(result.data.plan.chapters).toHaveLength(1);
      expect(result.data.plan.chapters[0].titles[0].title).toBe(chapterTitle);
      expect(result.data.plan.chapters[0].contributions).toHaveLength(1);
      expect(result.data.plan.chapters[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.chapters[0].contributions[0].type).toBe(ContributorTypes.enum.AfterwordBy);
    });
  });

  describe('contributor ordering', () => {
    type ContributorInput = { name: string; sequenceNumber?: string };

    const contributorNode = ({ name, sequenceNumber }: ContributorInput) => ({
      ...(sequenceNumber === undefined ? {} : { SequenceNumber: sequenceNumber }),
      ContributorRole: 'A01',
      PersonName: name,
    });

    /** A one-product message whose contributors sit at the product (work) level. */
    const workWithContributors = (inputs: ContributorInput[]): ExtendedONIXMessageRoot => ({
      ONIXMessage: {
        Product: [
          {
            DescriptiveDetail: {
              ProductForm: ProductForm._BC,
              TitleDetail: { TitleElement: { TitleText: 'A work' } },
              Language: { LanguageCode: languages[0].value },
              Contributor: inputs.map(contributorNode),
            } as unknown as ExtendedDescriptiveDetail,
            PublishingDetail: {
              Imprint: { ImprintName: imprints[0].label },
              PublishingStatus: '04',
            } as ExtendedPublishingDetail,
          } as ExtendedProduct,
        ],
      },
    });

    /** The same contributors, but on a single chapter of an otherwise contributor-free work. */
    const chapterWithContributors = (inputs: ContributorInput[]): ExtendedONIXMessageRoot => ({
      ONIXMessage: {
        Product: [
          {
            DescriptiveDetail: {
              ProductForm: ProductForm._BC,
              TitleDetail: { TitleElement: { TitleText: 'A work' } },
              Language: { LanguageCode: languages[0].value },
            } as ExtendedDescriptiveDetail,
            PublishingDetail: {
              Imprint: { ImprintName: imprints[0].label },
              PublishingStatus: '04',
            } as ExtendedPublishingDetail,
            ContentDetail: {
              ContentItem: [
                {
                  LevelSequenceNumber: '1',
                  TitleDetail: { TitleElement: { TitleText: 'A chapter' } },
                  Contributor: inputs.map(contributorNode),
                },
              ] as unknown as ExtendedCollection[],
            },
          } as ExtendedProduct,
        ],
      },
    });

    const run = async (xml: ExtendedONIXMessageRoot) => {
      const parser = new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      );

      return parser.parse();
    };

    /** Every contribution's `[fullName, orderNumber]`, in the order the plan lists them. */
    const ordinalsOf = (contributions: { fullName: string; orderNumber: number }[]) =>
      contributions.map(({ fullName, orderNumber }) => [fullName, orderNumber] as const);

    /** The invariant the backend's constraints require of every planned contribution list. */
    const assertPlanOrdinals = (contributions: { orderNumber: number }[]) => {
      const ordinals = contributions.map(({ orderNumber }) => orderNumber);

      expect(ordinals.every((ordinal) => Number.isInteger(ordinal) && ordinal >= 1)).toBe(true);
      expect(new Set(ordinals).size).toBe(ordinals.length);
      expect([...ordinals].sort((a, b) => a - b)).toEqual(ordinals.map((_, position) => position + 1));
    };

    const sequenceFallbackWarnings = (result: Awaited<ReturnType<XMLParser['parse']>>) =>
      result.issues.filter((issue) => issue.code === 'onix.contributor.sequence_fallback');

    it('gives two work contributors unique ordinals from their SequenceNumbers', async () => {
      const result = await run(
        workWithContributors([
          { name: 'Lisa Hopkins', sequenceNumber: '1' },
          { name: 'Tom Rutter', sequenceNumber: '2' },
        ]),
      );

      expect(result.status).toBe('success');
      expect(ordinalsOf(result.data.plan.works[0].contributions)).toEqual([
        ['Lisa Hopkins', 1],
        ['Tom Rutter', 2],
      ]);
      assertPlanOrdinals(result.data.plan.works[0].contributions);
      expect(sequenceFallbackWarnings(result)).toHaveLength(0);
    });

    it('interprets SequenceNumber, re-sorting contributors listed in reverse', async () => {
      // Person A is listed first but numbered 2 — proof the number is read, not the position.
      const result = await run(
        workWithContributors([
          { name: 'Person A', sequenceNumber: '2' },
          { name: 'Person B', sequenceNumber: '1' },
        ]),
      );

      expect(ordinalsOf(result.data.plan.works[0].contributions)).toEqual([
        ['Person B', 1],
        ['Person A', 2],
      ]);
      assertPlanOrdinals(result.data.plan.works[0].contributions);
    });

    it('preserves order but not the raw numbers for a gapped sequence', async () => {
      const result = await run(
        workWithContributors([
          { name: 'First', sequenceNumber: '10' },
          { name: 'Second', sequenceNumber: '20' },
        ]),
      );

      expect(ordinalsOf(result.data.plan.works[0].contributions)).toEqual([
        ['First', 1],
        ['Second', 2],
      ]);
    });

    it('uses source order when no contributor has a SequenceNumber, without warning', async () => {
      const result = await run(workWithContributors([{ name: 'First' }, { name: 'Second' }]));

      expect(ordinalsOf(result.data.plan.works[0].contributions)).toEqual([
        ['First', 1],
        ['Second', 2],
      ]);
      expect(sequenceFallbackWarnings(result)).toHaveLength(0);
    });

    it('falls back to source order and warns once when only some contributors are numbered', async () => {
      const result = await run(workWithContributors([{ name: 'First', sequenceNumber: '1' }, { name: 'Second' }]));

      expect(ordinalsOf(result.data.plan.works[0].contributions)).toEqual([
        ['First', 1],
        ['Second', 2],
      ]);
      const warnings = sequenceFallbackWarnings(result);
      // One warning for the list, not one per contributor.
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe('warning');
    });

    it('falls back to source order and warns when SequenceNumbers collide', async () => {
      const result = await run(
        workWithContributors([
          { name: 'First', sequenceNumber: '1' },
          { name: 'Second', sequenceNumber: '1' },
        ]),
      );

      expect(ordinalsOf(result.data.plan.works[0].contributions)).toEqual([
        ['First', 1],
        ['Second', 2],
      ]);
      expect(sequenceFallbackWarnings(result)).toHaveLength(1);
    });

    it.each([['0'], ['-1'], ['1.5'], ['abc']])(
      'never lets the malformed SequenceNumber %s reach a planned ordinal',
      async (bad) => {
        const result = await run(
          workWithContributors([
            { name: 'First', sequenceNumber: bad },
            { name: 'Second', sequenceNumber: '2' },
          ]),
        );

        expect(ordinalsOf(result.data.plan.works[0].contributions)).toEqual([
          ['First', 1],
          ['Second', 2],
        ]);
        assertPlanOrdinals(result.data.plan.works[0].contributions);
        expect(sequenceFallbackWarnings(result)).toHaveLength(1);
      },
    );

    it('gives two chapter contributors unique ordinals from their SequenceNumbers', async () => {
      const result = await run(
        chapterWithContributors([
          { name: 'Lisa Hopkins', sequenceNumber: '1' },
          { name: 'Tom Rutter', sequenceNumber: '2' },
        ]),
      );

      expect(result.status).toBe('success');
      expect(ordinalsOf(result.data.plan.chapters[0].contributions)).toEqual([
        ['Lisa Hopkins', 1],
        ['Tom Rutter', 2],
      ]);
      assertPlanOrdinals(result.data.plan.chapters[0].contributions);
    });

    it('gives every identity alternative for one source contributor the same ordinal', async () => {
      const existing = {
        id: 'existing-tom',
        name: 'Tom Rutter',
        fullName: 'Tom Rutter',
        firstName: 'Tom',
        lastName: 'Rutter',
        orcid: '',
        website: '',
        updatedAt: '',
        lastContributionTitle: 'An earlier book',
      };
      // Only Tom (the second, ordinal-2 contributor) matches an existing Thoth record.
      vi.mocked(mockContributorService.getContributors).mockImplementation(async (name: string) =>
        name === 'Tom Rutter' ? [existing] : [],
      );

      const result = await run(
        workWithContributors([
          { name: 'Lisa Hopkins', sequenceNumber: '1' },
          { name: 'Tom Rutter', sequenceNumber: '2' },
        ]),
      );

      // The plan still carries exactly one contribution per author, with the resolved ordinals.
      expect(ordinalsOf(result.data.plan.works[0].contributions)).toEqual([
        ['Lisa Hopkins', 1],
        ['Tom Rutter', 2],
      ]);

      const workId = result.data.plan.works[0].id as WorkId;
      const selection = result.data.contributorsForSelection[workId];
      const items = Object.values(selection);

      // Tom's selection item has two options (create-new + existing), and both carry ordinal 2 —
      // the ordinal is a property of the source contributor, not of the identity chosen for it.
      const tomOptions = items.find((options) => options.some(({ fullName }) => fullName === 'Tom Rutter'));
      expect(tomOptions).toHaveLength(2);
      expect(tomOptions?.map(({ orderNumber }) => orderNumber)).toEqual([2, 2]);
      expect(tomOptions?.map(({ contributorId }) => contributorId)).toEqual([appConfig.defaultId, 'existing-tom']);
    });
  });

  describe('repeatable and alternative ONIX structures', () => {
    const ARC_SERIES_ID = 'arc-companions-id';
    const ARC_SERIES_NAME = 'Arc Companions';

    const seriesPlan = (result: Awaited<ReturnType<XMLParser['parse']>>) => result.data.plan.series as SeriesImportPlan;

    /**
     * A group's works, resolved through the plan the way the importer does: membership is a work
     * id, and the work itself lives once, in `plan.works`.
     */
    const memberWorks = (result: Awaited<ReturnType<XMLParser['parse']>>, group?: SeriesImportGroup) =>
      (group?.members ?? []).map(
        ({ workId }) => result.data.plan.works.find((work) => work.id === workId) as WorkEntity,
      );

    const memberTitles = (result: Awaited<ReturnType<XMLParser['parse']>>, group?: SeriesImportGroup) =>
      memberWorks(result, group).map((work) => work.titles[0].title);

    const memberOrdinals = (group?: SeriesImportGroup) => (group?.members ?? []).map(({ orderNumber }) => orderNumber);

    const existingGroup = (result: Awaited<ReturnType<XMLParser['parse']>>, seriesId: string) =>
      seriesPlan(result).find(({ target }) => target.kind === 'existing' && target.seriesId === seriesId);

    const proposedGroups = (result: Awaited<ReturnType<XMLParser['parse']>>) =>
      seriesPlan(result).filter(({ target }) => target.kind === 'proposed');

    const collection = (title: string, collectionType = '10', sequenceNumber?: string): ExtendedCollection =>
      ({
        CollectionType: collectionType,
        ...(sequenceNumber
          ? { CollectionSequence: { CollectionSequenceType: '03', CollectionSequenceNumber: sequenceNumber } }
          : {}),
        TitleDetail: {
          TitleType: TitleType._01,
          TitleElement: { TitleElementLevel: TitleElementLevel._02, NoPrefix: '', TitleWithoutPrefix: title },
        },
      }) as unknown as ExtendedCollection;

    const buildSeries = (
      id: string,
      name: string,
      issueOrdinals: number[] = [],
      imprintId = imprints[0].value,
    ): SeriesEntity => ({
      id,
      name,
      type: SeriesType.enum.BookSeries,
      issnPrint: '',
      issnDigital: '',
      updatedAt: '',
      imprintId,
      imprintName: '',
      url: '',
      cfpUrl: '',
      description: '',
      issues: issueOrdinals.map((ordinal) => ({
        id: `issue-${ordinal}`,
        ordinal,
        workId: `work-${ordinal}`,
        title: 'Existing member',
        seriesId: id,
        coverUrl: '',
      })),
    });

    const buildProduct = (descriptiveDetail: Partial<ExtendedDescriptiveDetail>, recordReference?: string) =>
      ({
        ...(recordReference ? { RecordReference: recordReference } : {}),
        DescriptiveDetail: {
          ProductForm: ProductForm._BC,
          Language: { LanguageRole: LanguageRole._01, LanguageCode: 'eng' },
          ...descriptiveDetail,
        } as ExtendedDescriptiveDetail,
        PublishingDetail: {
          Imprint: { ImprintName: imprints[0].label },
          PublishingStatus: '04',
        } as ExtendedPublishingDetail,
      }) as ExtendedProduct;

    const runParser = (products: ExtendedProduct[], parserSerieses: SeriesEntity[] = serieses) =>
      new XMLParser(
        { ONIXMessage: { Product: products } },
        imprints,
        licenses,
        parserSerieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      ).parse();

    describe('languages', () => {
      it('parses a single Language composite emitted as an object', async () => {
        const result = await runParser([
          buildProduct({ TitleDetail: { TitleElement: { TitleText: 'Single language work' } } }),
        ]);

        expect(result.status).toBe('success');
        expect(result.data.plan.works[0].languages).toEqual([
          { code: 'ENG', relation: LanguageRelation.enum.Original, id: appConfig.defaultId },
        ]);
      });

      it('parses repeated Language composites emitted as an array', async () => {
        const result = await runParser([
          buildProduct({
            TitleDetail: { TitleElement: { TitleText: 'Repeated languages' } },
            Language: [
              { LanguageRole: LanguageRole._01, LanguageCode: 'eng' },
              { LanguageRole: LanguageRole._02, LanguageCode: 'fao' },
            ],
          }),
        ]);

        expect(result.status).toBe('success');
        expect(errorMessages(result)).toHaveLength(0);
        expect(result.data.plan.works[0].languages).toHaveLength(2);
      });

      it('maps English role 01 and Faroese role 02 to Original and TranslatedFrom', async () => {
        const result = await runParser([
          buildProduct({
            TitleDetail: {
              TitleElement: { TitleWithoutPrefix: 'Völsung Ballads from the Faroe Islands in English Translation' },
            },
            Language: [
              { LanguageRole: LanguageRole._01, LanguageCode: 'eng' },
              { LanguageRole: LanguageRole._02, LanguageCode: 'fao' },
            ],
          }),
        ]);

        expect(result.status).toBe('success');
        expect(result.data.plan.works[0].languages).toEqual([
          { code: 'ENG', relation: LanguageRelation.enum.Original, id: appConfig.defaultId },
          { code: 'FAO', relation: LanguageRelation.enum.TranslatedFrom, id: appConfig.defaultId },
        ]);
      });

      it('maps English role 01 and French role 02 to Original and TranslatedFrom', async () => {
        const result = await runParser([
          buildProduct({
            TitleDetail: {
              TitleElement: { TitleWithoutPrefix: 'Women Religious Crossing between Cloister and the World' },
            },
            Language: [
              { LanguageRole: LanguageRole._01, LanguageCode: 'eng' },
              { LanguageRole: LanguageRole._02, LanguageCode: 'fre' },
            ],
          }),
        ]);

        expect(result.status).toBe('success');
        expect(result.data.plan.works[0].languages).toEqual([
          { code: 'ENG', relation: LanguageRelation.enum.Original, id: appConfig.defaultId },
          { code: 'FRE', relation: LanguageRelation.enum.TranslatedFrom, id: appConfig.defaultId },
        ]);
      });

      it('reports the offending code and product for an unsupported language code', async () => {
        const result = await runParser([
          buildProduct(
            {
              TitleDetail: { TitleElement: { TitleText: 'Bad language' } },
              Language: { LanguageRole: LanguageRole._01, LanguageCode: 'xyz' },
            },
            '9781641891783',
          ),
        ]);

        expect(result.status).toBe('failed');
        expect(errorMessages(result)).toContain('Language xyz not found for product 1 (9781641891783)');
        // The old message pasted every supported language into the UI.
        expect(errorMessages(result)[0].length).toBeLessThan(120);
      });

      it('ignores language roles Thoth cannot express but keeps the usable one', async () => {
        const result = await runParser([
          buildProduct({
            TitleDetail: { TitleElement: { TitleText: 'Rights language work' } },
            Language: [
              { LanguageRole: LanguageRole._01, LanguageCode: 'eng' },
              // Role 03 is the language of abstracts, which Thoth does not model.
              { LanguageRole: LanguageRole._03, LanguageCode: 'ger' },
            ],
          }),
        ]);

        expect(result.status).toBe('success');
        expect(result.data.plan.works[0].languages).toEqual([
          { code: 'ENG', relation: LanguageRelation.enum.Original, id: appConfig.defaultId },
        ]);
      });

      it('reports a product whose every language role is unsupported', async () => {
        const result = await runParser([
          buildProduct(
            {
              TitleDetail: { TitleElement: { TitleText: 'No usable language' } },
              Language: { LanguageRole: LanguageRole._03, LanguageCode: 'eng' },
            },
            '9781641891783',
          ),
        ]);

        expect(result.status).toBe('failed');
        expect(errorMessages(result)).toContain('No supported language role found for product 1 (9781641891783)');
      });

      it('reports a product with no Language composite at all', async () => {
        const result = await runParser([
          buildProduct(
            { TitleDetail: { TitleElement: { TitleText: 'No language' } }, Language: undefined },
            '9781641891783',
          ),
        ]);

        expect(result.status).toBe('failed');
        expect(errorMessages(result)).toContain('Language not provided for product 1 (9781641891783)');
      });
    });

    it('reports errors in ONIX product order even though products parse concurrently', async () => {
      const badProduct = (recordReference: string) =>
        buildProduct(
          {
            TitleDetail: { TitleElement: { TitleText: 'Bad language' } },
            Language: { LanguageRole: LanguageRole._01, LanguageCode: 'xyz' },
          },
          recordReference,
        );

      const result = await runParser([
        buildProduct({ TitleDetail: { TitleElement: { TitleText: 'Fine' } } }),
        badProduct('9780000000002'),
        buildProduct({ TitleDetail: { TitleElement: { TitleText: 'Fine' } } }),
        badProduct('9780000000004'),
      ]);

      expect(errorMessages(result)).toEqual([
        'Language xyz not found for product 2 (9780000000002)',
        'Language xyz not found for product 4 (9780000000004)',
      ]);
      // The product each one came from is carried, not only spelled out in the message.
      expect(result.issues.map(({ severity, code, source }) => ({ severity, code, source }))).toEqual([
        {
          severity: 'error',
          code: 'onix.validation',
          source: { kind: 'onix', productIndex: 2, recordReference: '9780000000002' },
        },
        {
          severity: 'error',
          code: 'onix.validation',
          source: { kind: 'onix', productIndex: 4, recordReference: '9780000000004' },
        },
      ]);
    });

    it('carries a product position even when the record has no RecordReference to name it by', async () => {
      const result = await runParser([
        buildProduct({
          TitleDetail: { TitleElement: { TitleText: 'Bad language' } },
          Language: { LanguageRole: LanguageRole._01, LanguageCode: 'xyz' },
        }),
      ]);

      expect(result.status).toBe('failed');
      expect(result.issues.map(({ source }) => source)).toEqual([{ kind: 'onix', productIndex: 1 }]);
    });

    describe('other repeatable composites', () => {
      it('reads a single ProductIdentifier emitted as an object', async () => {
        // A lone ProductIdentifier is not an array, so calling `.find` on it used to throw and
        // fail the entire upload with an opaque parsing error.
        const product = {
          ProductIdentifier: { ProductIDType: ProductIdentifierType._06, IDValue: '10.12345/single' },
          ...buildProduct({ TitleDetail: { TitleElement: { TitleText: 'Single identifier work' } } }),
        } as unknown as ExtendedProduct;

        const result = await runParser([product]);

        expect(result.status).toBe('success');
        expect(result.data.plan.works[0].doi).toBe(appConfig.validations.doiPrefix + '10.12345/single');
      });

      it('reads a single Measure emitted as an object', async () => {
        const product = {
          ...buildProduct({
            TitleDetail: { TitleElement: { TitleText: 'Single measure work' } },
            Measure: { MeasureType: MeasureType._01, MeasureUnitCode: MeasureUnit.mm, Measurement: 234 },
          } as unknown as Partial<ExtendedDescriptiveDetail>),
        } as ExtendedProduct;

        const result = await runParser([product]);

        expect(result.status).toBe('success');
        expect(result.data.plan.works[0].publications[0].height).toBe(234);
      });
    });

    describe('titles', () => {
      it('parses a product title supplied as TitleWithoutPrefix', async () => {
        const result = await runParser([
          buildProduct({
            TitleDetail: {
              TitleType: TitleType._01,
              TitleElement: {
                TitleElementLevel: TitleElementLevel._01,
                NoPrefix: '',
                TitleWithoutPrefix: 'Antiracist Medievalisms',
              },
            },
          }),
        ]);

        expect(result.status).toBe('success');
        expect(result.data.plan.works[0].titles[0].title).toBe('Antiracist Medievalisms');
      });

      it('builds a complete title from TitlePrefix and TitleWithoutPrefix', async () => {
        const result = await runParser([
          buildProduct({
            TitleDetail: {
              TitleType: TitleType._01,
              TitleElement: {
                TitleElementLevel: TitleElementLevel._01,
                TitlePrefix: { '#text': 'A' },
                TitleWithoutPrefix: { '#text': 'Companion to the Cavendishes' },
              },
            },
          }),
        ]);

        expect(result.status).toBe('success');
        expect(result.data.plan.works[0].titles[0].title).toBe('A Companion to the Cavendishes');
        expect(result.data.plan.works[0].titles[0].fullTitle).toBe('A Companion to the Cavendishes');
      });

      it('keeps the subtitle separate from a prefixed title', async () => {
        const result = await runParser([
          buildProduct({
            TitleDetail: {
              TitleType: TitleType._01,
              TitleElement: {
                TitleElementLevel: TitleElementLevel._01,
                TitlePrefix: 'The',
                TitleWithoutPrefix: 'Medieval Womb',
                Subtitle: 'Gender and Power in the Premodern World',
              },
            },
          }),
        ]);

        expect(result.data.plan.works[0].titles[0].title).toBe('The Medieval Womb');
        expect(result.data.plan.works[0].titles[0].subtitle).toBe('Gender and Power in the Premodern World');
        expect(result.data.plan.works[0].titles[0].fullTitle).toBe(
          'The Medieval Womb Gender and Power in the Premodern World',
        );
      });

      it('picks the distinctive title when TitleDetail is emitted as an array', async () => {
        const result = await runParser([
          buildProduct({
            TitleDetail: [
              {
                TitleType: TitleType._01,
                TitleElement: {
                  TitleElementLevel: TitleElementLevel._01,
                  TitlePrefix: 'A',
                  TitleWithoutPrefix: 'Companion to the Cavendishes',
                },
              },
              {
                TitleType: TitleType._05,
                TitleElement: {
                  TitleElementLevel: TitleElementLevel._01,
                  NoPrefix: '',
                  TitleWithoutPrefix: 'COMP_Hopkins-Cavendishes',
                },
              },
            ],
          }),
        ]);

        expect(result.data.plan.works[0].titles[0].title).toBe('A Companion to the Cavendishes');
      });

      it('picks the product-level element when TitleElement is emitted as an array', async () => {
        const result = await runParser([
          buildProduct({
            TitleDetail: {
              TitleType: TitleType._01,
              TitleElement: [
                { TitleElementLevel: TitleElementLevel._02, TitleWithoutPrefix: 'Arc Companions' },
                { TitleElementLevel: TitleElementLevel._01, TitleWithoutPrefix: 'Companion to the Cavendishes' },
              ],
            },
          }),
        ]);

        expect(result.data.plan.works[0].titles[0].title).toBe('Companion to the Cavendishes');
      });
    });

    describe('the shared import plan', () => {
      const arcSerieses = () => [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME)];

      const chapteredProduct = (title: string, chapterTitle: string, seriesName?: string) =>
        ({
          ...buildProduct({
            TitleDetail: { TitleElement: { TitleText: title } },
            ...(seriesName ? { Collection: collection(seriesName) } : {}),
          }),
          ContentDetail: {
            ContentItem: [
              {
                LevelSequenceNumber: '1',
                TitleDetail: {
                  TitleType: TitleType._01,
                  TitleElement: { TitleElementLevel: TitleElementLevel._04, TitleWithoutPrefix: chapterTitle },
                },
              },
            ],
          },
        }) as unknown as ExtendedProduct;

      it('carries works, chapters and series in one plan', async () => {
        const result = await runParser(
          [chapteredProduct('First', 'Chapter one', ARC_SERIES_NAME), chapteredProduct('Second', 'Chapter two')],
          arcSerieses(),
        );

        const { works, chapters, series } = result.data.plan;

        expect(works.map((work) => work.titles[0].title)).toEqual(['First', 'Second']);
        expect(chapters.map((chapter) => chapter.titles[0].title)).toEqual(['Chapter one', 'Chapter two']);
        // Chapters point at the work they belong to, which is the work the plan holds.
        expect(chapters.map((chapter) => chapter.relationId)).toEqual([works[0].id, works[1].id]);
        expect(series).toEqual([
          {
            name: ARC_SERIES_NAME,
            target: { kind: 'existing', seriesId: ARC_SERIES_ID },
            members: [{ workId: works[0].id, orderNumber: 1 }],
          },
        ]);
      });

      it('keeps every series member pointing at a work the plan actually holds', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'First' } },
              Collection: collection(ARC_SERIES_NAME),
            }),
            buildProduct({ TitleDetail: { TitleElement: { TitleText: 'Second' } } }),
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Third' } },
              Collection: collection('Borderlines'),
            }),
          ],
          arcSerieses(),
        );

        const { works, series } = result.data.plan;
        const workIds = new Set(works.map((work) => work.id));

        expect(series.flatMap((group) => group.members).every(({ workId }) => workIds.has(workId))).toBe(true);
      });

      it('returns an empty plan and no contributor options when the parse fails', async () => {
        const result = await runParser([
          buildProduct(
            {
              TitleDetail: { TitleElement: { TitleText: 'Bad language' } },
              Language: { LanguageRole: LanguageRole._01, LanguageCode: 'xyz' },
            },
            '9781641891783',
          ),
        ]);

        expect(result.status).toBe('failed');
        expect(result.data.plan).toEqual({ works: [], chapters: [], series: [] });
        expect(result.data.contributorsForSelection).toEqual({});
        expect(result.issues).toHaveLength(1);
      });

      it('returns a complete, runnable plan when the only findings are warnings', async () => {
        const result = await runParser(
          [
            chapteredProduct('Kept', 'Chapter one', ARC_SERIES_NAME),
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Warned about' } },
              Collection: collection('Editorial Studies', '11'),
            }),
          ],
          arcSerieses(),
        );

        expect(result.status).toBe('success');
        // A warning withholds nothing: both works, the chapter and the series group are all here.
        expect(result.data.plan.works).toHaveLength(2);
        expect(result.data.plan.chapters).toHaveLength(1);
        expect(result.data.plan.series).toHaveLength(1);
        expect(result.issues.map(({ severity }) => severity)).toEqual(['warning']);
      });

      it('gives each failed parse its own empty plan', async () => {
        const failing = () => runParser([]);

        const [first, second] = [await failing(), await failing()];

        expect(first.data.plan).not.toBe(second.data.plan);
        expect(first.data.plan.works).not.toBe(second.data.plan.works);
      });
    });

    describe('series matching and creation', () => {
      // Built lazily: `imprints` is only populated in beforeEach.
      const arcSerieses = () => [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME)];

      it('matches an existing series whose collection title uses TitleWithoutPrefix', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'A Companion to the Cavendishes' } },
              Collection: collection(ARC_SERIES_NAME),
            }),
          ],
          arcSerieses(),
        );

        expect(result.status).toBe('success');
        expect(errorMessages(result)).toHaveLength(0);
        expect(existingGroup(result, ARC_SERIES_ID)?.members).toHaveLength(1);
        expect(memberTitles(result, existingGroup(result, ARC_SERIES_ID))[0]).toBe('A Companion to the Cavendishes');
      });

      it('no longer reports "Series not found" for a missing supported series', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Borderlines member' } },
              Collection: collection('Borderlines'),
            }),
          ],
          arcSerieses(),
        );

        expect(result.status).toBe('success');
        expect(errorMessages(result)).toHaveLength(0);
      });

      it('represents a missing supported series as a proposed series', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Borderlines member' } },
              Collection: collection('Borderlines'),
            }),
          ],
          arcSerieses(),
        );

        const [group] = seriesPlan(result);

        expect(group.name).toBe('Borderlines');
        // Only what ONIX supplies; Thoth's optional series fields are not part of a proposal.
        expect(group.target).toEqual({
          kind: 'proposed',
          series: {
            name: 'Borderlines',
            imprintId: imprints[0].value,
            type: SeriesType.enum.BookSeries,
          },
        });
        expect(group.members).toHaveLength(1);
      });

      it('is side-effect free: parsing twice yields the same plan and does not touch the series list', async () => {
        const products = [
          buildProduct({
            TitleDetail: { TitleElement: { TitleText: 'Existing series member' } },
            Collection: collection(ARC_SERIES_NAME),
          }),
          buildProduct({
            TitleDetail: { TitleElement: { TitleText: 'Missing series member' } },
            Collection: collection('Borderlines'),
          }),
        ];
        const thothSerieses = arcSerieses();
        const snapshot = structuredClone(thothSerieses);

        const first = await runParser(products, thothSerieses);
        const second = await runParser(products, thothSerieses);

        // No series was created, renamed or given an issue by parsing.
        expect(thothSerieses).toEqual(snapshot);
        expect(seriesPlan(first).map(({ target }) => target)).toEqual(seriesPlan(second).map(({ target }) => target));
        expect(seriesPlan(first).map(({ target }) => target.kind)).toEqual(['existing', 'proposed']);
      });

      it('prefers the publisher collection when several Collection composites exist', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Multi collection work' } },
              Collection: [collection('Some Ascribed List', '20'), collection(ARC_SERIES_NAME, '10')],
            }),
          ],
          arcSerieses(),
        );

        expect(result.status).toBe('success');
        expect(existingGroup(result, ARC_SERIES_ID)?.members).toHaveLength(1);
      });

      it('ignores an ascribed collection rather than turning it into a series', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Ascribed only' } },
              Collection: collection('A Bookseller Grouping', '20'),
            }),
          ],
          arcSerieses(),
        );

        expect(result.status).toBe('success');
        expect(seriesPlan(result)).toHaveLength(0);
      });

      it('still matches an existing series through an ambiguous CollectionType', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Unspecified collection' } },
              Collection: collection(ARC_SERIES_NAME, '00'),
            }),
          ],
          arcSerieses(),
        );

        expect(result.status).toBe('success');
        expect(existingGroup(result, ARC_SERIES_ID)?.members).toHaveLength(1);
      });

      it('reports a collection whose title cannot be extracted', async () => {
        const result = await runParser(
          [
            buildProduct(
              {
                TitleDetail: { TitleElement: { TitleText: 'Titleless collection' } },
                Collection: { CollectionType: CollectionType._10 } as ExtendedCollection,
              },
              '9781641891783',
            ),
          ],
          arcSerieses(),
        );

        expect(result.status).toBe('failed');
        expect(errorMessages(result)).toContain('Collection has no usable series title for product 1 (9781641891783)');
        expect(result.issues).toEqual([
          {
            severity: 'error',
            code: 'onix.validation',
            message: 'Collection has no usable series title for product 1 (9781641891783)',
            source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
          },
        ]);
      });
    });

    /**
     * A Collection that is not a publisher collection (CollectionType 10) may still name a real
     * series, so it is matched against Thoth. What it cannot do is authorise creating one. When
     * there is nothing to match, the association is dropped and the user is told — the work
     * itself is perfectly importable, and refusing the whole upload over a code list value the
     * publisher may not control was never proportionate.
     */
    describe('a missing series behind a non-publisher collection', () => {
      // Built lazily: `imprints` is only populated in beforeEach.
      const arcSerieses = () => [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME)];

      /** ONIX makes CollectionType mandatory, but real files omit it; it reads as unspecified. */
      const untypedCollection = (title: string): ExtendedCollection =>
        ({
          TitleDetail: {
            TitleType: TitleType._01,
            TitleElement: { TitleElementLevel: TitleElementLevel._02, NoPrefix: '', TitleWithoutPrefix: title },
          },
        }) as unknown as ExtendedCollection;

      const member = (title: string, seriesCollection: ExtendedCollection, recordReference?: string) =>
        buildProduct(
          { TitleDetail: { TitleElement: { TitleText: title } }, Collection: seriesCollection },
          recordReference,
        );

      it('creates the series and says nothing when the collection is a publisher collection', async () => {
        const result = await runParser([member('Borderlines member', collection('Borderlines', '10'))], []);

        expect(result.status).toBe('success');
        expect(proposedGroups(result)).toHaveLength(1);
        expect(result.issues).toEqual([]);
      });

      it.each([
        ['unspecified (00)', () => collection('Editorial Studies', '00')],
        ['a collection éditoriale (11)', () => collection('Editorial Studies', '11')],
        ['absent', () => untypedCollection('Editorial Studies')],
      ])('imports the work without the series when the CollectionType is %s', async (_label, build) => {
        const result = await runParser([member('Ambiguous collection', build(), '9781641891783')], arcSerieses());

        // The work is kept, and nothing about it blocks the import.
        expect(result.status).toBe('success');
        expect(result.data.plan.works.map((work) => work.titles[0].title)).toEqual(['Ambiguous collection']);
        // No series is invented for it.
        expect(seriesPlan(result)).toHaveLength(0);
        expect(result.issues).toEqual([
          {
            severity: 'warning',
            code: 'onix.series.non_publisher_collection_skipped',
            message:
              'Series "Editorial Studies" does not exist in Thoth and will not be created, because its ONIX ' +
              'CollectionType is not a publisher collection (10). product 1 (9781641891783) will be imported ' +
              'without this series association',
            source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
          },
        ]);
      });

      it('says nothing when the ambiguous collection does name a series Thoth has', async () => {
        const result = await runParser([member('Known series', collection(ARC_SERIES_NAME, '11'))], arcSerieses());

        expect(result.status).toBe('success');
        expect(existingGroup(result, ARC_SERIES_ID)?.members).toHaveLength(1);
        expect(result.issues).toEqual([]);
      });

      it('keeps ignoring an ascribed collection silently', async () => {
        // CollectionType 20 is somebody else's grouping, not a series the publisher failed to
        // register, so there is nothing to tell the user about.
        const result = await runParser([member('Ascribed only', collection('A Bookseller Grouping', '20'))], []);

        expect(result.status).toBe('success');
        expect(seriesPlan(result)).toHaveLength(0);
        expect(result.issues).toEqual([]);
      });

      it('warns once for a whole group rather than once per product', async () => {
        const result = await runParser(
          [
            member('First', collection('Editorial Studies', '11'), '9780000000001'),
            buildProduct({ TitleDetail: { TitleElement: { TitleText: 'Unrelated' } } }, '9780000000002'),
            member('Second', collection('editorial  studies', '11'), '9780000000003'),
            buildProduct({ TitleDetail: { TitleElement: { TitleText: 'Also unrelated' } } }, '9780000000004'),
            member('Third', collection('Editorial Studies', '11'), '9780000000005'),
          ],
          [],
        );

        expect(result.status).toBe('success');
        // Every work survives, in ONIX product order.
        expect(result.data.plan.works.map((work) => work.titles[0].title)).toEqual([
          'First',
          'Unrelated',
          'Second',
          'Also unrelated',
          'Third',
        ]);
        expect(seriesPlan(result)).toHaveLength(0);
        expect(result.issues).toHaveLength(1);
        // Tagged with the earliest affected product, and naming the affected products.
        expect(result.issues[0].source).toEqual({
          kind: 'onix',
          productIndex: 1,
          recordReference: '9780000000001',
        });
        expect(result.issues[0].message).toContain(
          'product 1 (9780000000001) and product 3 (9780000000003) and product 5 (9780000000005)',
        );
      });

      it.each([
        ['the publisher collection comes first', ['10', '11']],
        ['the ambiguous collection comes first', ['11', '10']],
      ])('creates the series once when only one product authorises it, whichever %s', async (_label, types) => {
        // The two products name the same series in the same imprint, so they are one group. A
        // publisher collection anywhere in it is the authority to create; the other product is
        // not authorising a second series, it is joining the one this import will create.
        const result = await runParser(
          types.map((type, index) => member(`Work ${index + 1}`, collection('Studies in Things', type))),
          [],
        );

        expect(result.status).toBe('success');
        expect(proposedGroups(result)).toHaveLength(1);
        expect(proposedGroups(result)[0].target).toMatchObject({
          kind: 'proposed',
          series: { name: 'Studies in Things', imprintId: imprints[0].value },
        });
        // Both works belong to it, in product order, and nothing was left behind to warn about.
        expect(memberTitles(result, proposedGroups(result)[0])).toEqual(['Work 1', 'Work 2']);
        expect(memberOrdinals(proposedGroups(result)[0])).toEqual([1, 2]);
        expect(result.issues).toEqual([]);
      });

      it.each([
        ['the publisher collection comes second', ['11', '10']],
        ['the publisher collection comes first', ['10', '11']],
      ])("creates the series with the publisher collection's own spelling when %s", async (_label, types) => {
        // Both spellings normalise to one identity, so this is one group. Only one spelling can
        // be stored, and it must not be the one from the collection that could not have
        // authorised the creation.
        const spellings: Record<string, string> = { '10': 'Editorial Studies', '11': 'editorial   studies' };

        const result = await runParser(
          types.map((type, index) => member(`Work ${index + 1}`, collection(spellings[type], type))),
          [],
        );

        expect(result.status).toBe('success');
        expect(proposedGroups(result)).toHaveLength(1);
        expect(proposedGroups(result)[0].target).toMatchObject({
          kind: 'proposed',
          series: { name: 'Editorial Studies', imprintId: imprints[0].value },
        });
        // The preview names the series the import will actually create.
        expect(proposedGroups(result)[0].name).toBe('Editorial Studies');
        expect(proposedGroups(result)[0].members).toHaveLength(2);
        expect(result.issues).toEqual([]);
      });

      it('still reports an ordinal collision inside a mixed-authority group', async () => {
        const result = await runParser(
          [
            member('First', collection('Studies in Things', '10', '4'), '9780000000001'),
            member('Second', collection('Studies in Things', '11', '4'), '9780000000002'),
          ],
          [],
        );

        expect(result.status).toBe('failed');
        expect(errorMessages(result)[0]).toContain('is given issue number 4 by more than one product');
        expect(seriesPlan(result)).toHaveLength(0);
      });

      it('keeps the works of an unrelated product alongside a warned-about one', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Normal' } },
              Collection: collection(ARC_SERIES_NAME, '10'),
            }),
            member('Warned about', collection('Editorial Studies', '00')),
          ],
          arcSerieses(),
        );

        expect(result.status).toBe('success');
        expect(result.data.plan.works.map((work) => work.titles[0].title)).toEqual(['Normal', 'Warned about']);
        expect(existingGroup(result, ARC_SERIES_ID)?.members).toHaveLength(1);
        expect(result.issues.map(({ severity }) => severity)).toEqual(['warning']);
      });

      it('orders warnings by product even when products finish parsing out of order', async () => {
        // The first product's contributor lookup is much the slowest, so without ordering by
        // source the second product's warning would be reported first.
        let call = 0;
        mockContributorService.getContributors = vi.fn().mockImplementation(async () => {
          call += 1;
          await new Promise((resolve) => setTimeout(resolve, call === 1 ? 20 : 0));

          return [];
        });

        const withContributor = (title: string, seriesName: string, recordReference: string) =>
          buildProduct(
            {
              TitleDetail: { TitleElement: { TitleText: title } },
              Collection: collection(seriesName, '11'),
              Contributor: [{ ContributorRole: 'A01', PersonName: `Author of ${title}` }],
            } as unknown as Partial<ExtendedDescriptiveDetail>,
            recordReference,
          );

        const result = await runParser(
          [
            withContributor('Slow', 'Alpha Studies', '9780000000001'),
            withContributor('Fast', 'Beta Studies', '9780000000002'),
          ],
          [],
        );

        expect(result.status).toBe('success');
        expect(result.issues.map(({ source }) => source)).toEqual([
          { kind: 'onix', productIndex: 1, recordReference: '9780000000001' },
          { kind: 'onix', productIndex: 2, recordReference: '9780000000002' },
        ]);
      });

      it('does not let severity reorder issues: a row 1 warning still precedes a row 2 error', async () => {
        const result = await runParser(
          [
            member('Warned about', collection('Editorial Studies', '00'), '9780000000001'),
            buildProduct(
              {
                TitleDetail: { TitleElement: { TitleText: 'Bad language' } },
                Language: { LanguageRole: LanguageRole._01, LanguageCode: 'xyz' },
              },
              '9780000000002',
            ),
          ],
          [],
        );

        // One error anywhere still fails the parse.
        expect(result.status).toBe('failed');
        expect(result.issues.map(({ severity, source }) => [severity, source])).toEqual([
          ['warning', { kind: 'onix', productIndex: 1, recordReference: '9780000000001' }],
          ['error', { kind: 'onix', productIndex: 2, recordReference: '9780000000002' }],
        ]);
      });
    });

    describe('series identity', () => {
      it('scopes matching by imprint', async () => {
        const otherImprintSeries = buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME, [], imprints[1].value);

        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Belongs to imprint one' } },
              Collection: collection(ARC_SERIES_NAME),
            }),
          ],
          [otherImprintSeries],
        );

        // The existing "Arc Companions" belongs to a different imprint, so it must not be
        // reused; the work's own imprint gets its own proposed series.
        expect(result.status).toBe('success');
        expect(existingGroup(result, ARC_SERIES_ID)).toBeUndefined();
        expect(proposedGroups(result)).toHaveLength(1);
        expect(proposedGroups(result)[0].target).toMatchObject({
          kind: 'proposed',
          series: { name: ARC_SERIES_NAME, imprintId: imprints[0].value },
        });
      });

      it('keeps the same series name under two imprints as two separate series', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Imprint one book' } },
              Collection: collection(ARC_SERIES_NAME),
            }),
            {
              ...buildProduct({
                TitleDetail: { TitleElement: { TitleText: 'Imprint two book' } },
                Collection: collection(ARC_SERIES_NAME),
              }),
              PublishingDetail: {
                Imprint: { ImprintName: imprints[1].label },
                PublishingStatus: '04',
              },
            } as ExtendedProduct,
          ],
          [],
        );

        expect(result.status).toBe('success');
        expect(proposedGroups(result)).toHaveLength(2);
        expect(proposedGroups(result).map((group) => group.target)).toMatchObject([
          { series: { imprintId: imprints[0].value } },
          { series: { imprintId: imprints[1].value } },
        ]);
      });

      it('treats case and whitespace variants within one imprint as the same series', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'First' } },
              Collection: collection('Arc Companions'),
            }),
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Second' } },
              Collection: collection('arc companions'),
            }),
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Third' } },
              Collection: collection('  Arc   Companions  '),
            }),
          ],
          [],
        );

        expect(result.status).toBe('success');
        expect(proposedGroups(result)).toHaveLength(1);
        expect(proposedGroups(result)[0].members).toHaveLength(3);
        // The first spelling seen is the one stored, not a normalised one.
        expect(proposedGroups(result)[0].name).toBe('Arc Companions');
      });

      it('matches an existing series despite case and whitespace differences', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Casing' } },
              Collection: collection('  arc   companions '),
            }),
          ],
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME)],
        );

        expect(result.status).toBe('success');
        expect(existingGroup(result, ARC_SERIES_ID)?.members).toHaveLength(1);
        expect(proposedGroups(result)).toHaveLength(0);
      });

      it('does not over-normalise punctuation or materially different names', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'First' } },
              Collection: collection('Foundations'),
            }),
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Second' } },
              Collection: collection('Foundations II'),
            }),
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Third' } },
              Collection: collection('Collection Development, Cultural Heritage, and Digital Humanities'),
            }),
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Fourth' } },
              Collection: collection('Collection Development: Cultural Heritage and Digital Humanities'),
            }),
          ],
          [],
        );

        expect(result.status).toBe('success');
        expect(proposedGroups(result).map((group) => group.name)).toEqual([
          'Foundations',
          'Foundations II',
          'Collection Development, Cultural Heritage, and Digital Humanities',
          'Collection Development: Cultural Heritage and Digital Humanities',
        ]);
      });
    });

    describe('existing series ambiguity', () => {
      const ambiguousProduct = () =>
        buildProduct({
          TitleDetail: { TitleElement: { TitleText: 'Ambiguous' } },
          Collection: collection(ARC_SERIES_NAME),
        });

      it('reports two identically named existing series in one imprint rather than picking one', async () => {
        // Thoth enforces no uniqueness on series name or on (imprint, series name), so picking
        // the first match would depend on the order the API returned rows in.
        const result = await runParser(
          [ambiguousProduct()],
          [buildSeries('series-a', ARC_SERIES_NAME), buildSeries('series-b', ARC_SERIES_NAME)],
        );

        expect(result.status).toBe('failed');
        expect(errorMessages(result)[0]).toContain(`Series "${ARC_SERIES_NAME}" matches 2 existing Thoth series`);
        expect(seriesPlan(result)).toHaveLength(0);
      });

      it('reports existing series that only differ by case or whitespace', async () => {
        const result = await runParser(
          [ambiguousProduct()],
          [buildSeries('series-a', 'arc companions'), buildSeries('series-b', '  Arc   Companions ')],
        );

        expect(result.status).toBe('failed');
        expect(errorMessages(result)[0]).toContain('matches 2 existing Thoth series');
        expect(seriesPlan(result)).toHaveLength(0);
      });

      it('prefers a single exact match over several normalised candidates', async () => {
        const result = await runParser(
          [ambiguousProduct()],
          [
            buildSeries('series-lower', 'arc companions'),
            buildSeries('series-exact', ARC_SERIES_NAME),
            buildSeries('series-spaced', '  Arc   Companions '),
          ],
        );

        expect(result.status).toBe('success');
        expect(existingGroup(result, 'series-exact')?.members).toHaveLength(1);
      });

      it('keeps the same name under different imprints valid and unambiguous', async () => {
        const result = await runParser(
          [ambiguousProduct()],
          [buildSeries('series-a', ARC_SERIES_NAME), buildSeries('series-b', ARC_SERIES_NAME, [], imprints[1].value)],
        );

        expect(result.status).toBe('success');
        expect(existingGroup(result, 'series-a')?.members).toHaveLength(1);
      });

      it('does not propose a new series when the existing match is merely ambiguous', async () => {
        const result = await runParser(
          [ambiguousProduct()],
          [buildSeries('series-a', ARC_SERIES_NAME), buildSeries('series-b', ARC_SERIES_NAME)],
        );

        expect(proposedGroups(result)).toHaveLength(0);
      });
    });

    describe('series ordinal collisions', () => {
      const memberProduct = (title: string, sequenceNumber?: string, recordReference?: string) =>
        buildProduct(
          {
            TitleDetail: { TitleElement: { TitleText: title } },
            Collection: collection(ARC_SERIES_NAME, '10', sequenceNumber),
          },
          recordReference,
        );

      it('reports an explicit ordinal that an existing Thoth issue already uses', async () => {
        // `issue` has UNIQUE (series_id, issue_ordinal), so this would otherwise fail at
        // CreateIssue partway through an import that had already created works.
        const result = await runParser(
          [memberProduct('Clashing work', '2', '9780000000001')],
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME, [1, 2])],
        );

        expect(result.status).toBe('failed');
        expect(errorMessages(result)).toContain(
          `Series "${ARC_SERIES_NAME}" already has issue number 2 in Thoth, supplied again by product 1 (9780000000001)`,
        );
        expect(seriesPlan(result)).toHaveLength(0);
      });

      it('reports two imported works claiming the same explicit ordinal', async () => {
        const result = await runParser(
          [memberProduct('First', '4', '9780000000001'), memberProduct('Second', '4', '9780000000002')],
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME)],
        );

        expect(result.status).toBe('failed');
        expect(errorMessages(result)).toContain(
          `Series "${ARC_SERIES_NAME}" is given issue number 4 by more than one product: product 1 (9780000000001) and product 2 (9780000000002)`,
        );
        expect(seriesPlan(result)).toHaveLength(0);
      });

      it('applies the same validation to a series the import would create', async () => {
        // A proposed series has no existing issues, but two products can still claim one
        // ordinal, and the unique constraint would reject the second CreateIssue.
        const result = await runParser(
          [memberProduct('First', '4', '9780000000001'), memberProduct('Second', '4', '9780000000002')],
          [],
        );

        expect(result.status).toBe('failed');
        expect(errorMessages(result)[0]).toContain('is given issue number 4 by more than one product');
        expect(proposedGroups(result)).toHaveLength(0);
      });

      it('reports collisions deterministically when there are several', async () => {
        const result = await runParser(
          [
            memberProduct('First', '5', '9780000000001'),
            memberProduct('Second', '3', '9780000000002'),
            memberProduct('Third', '3', '9780000000003'),
          ],
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME, [5])],
        );

        expect(result.status).toBe('failed');
        // Ordered by the lowest product index involved, then by the order raised.
        expect(errorMessages(result)).toEqual([
          `Series "${ARC_SERIES_NAME}" already has issue number 5 in Thoth, supplied again by product 1 (9780000000001)`,
          `Series "${ARC_SERIES_NAME}" is given issue number 3 by more than one product: product 2 (9780000000002) and product 3 (9780000000003)`,
        ]);
      });

      it('preserves explicit ordinals when nothing collides', async () => {
        const result = await runParser(
          [memberProduct('First', '4'), memberProduct('Second', '7')],
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME, [1, 2])],
        );

        expect(result.status).toBe('success');
        expect(errorMessages(result)).toHaveLength(0);
        expect(memberOrdinals(existingGroup(result, ARC_SERIES_ID))).toEqual([4, 7]);
      });

      it('appends unnumbered works safely around explicit ordinals', async () => {
        const result = await runParser(
          [memberProduct('Unnumbered A'), memberProduct('Numbered', '9'), memberProduct('Unnumbered B')],
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME, [1, 2])],
        );

        expect(result.status).toBe('success');
        expect(errorMessages(result)).toHaveLength(0);
        // Automatic ordinals start above every known ordinal, existing and explicit alike.
        expect(memberOrdinals(existingGroup(result, ARC_SERIES_ID))).toEqual([10, 9, 11]);
      });
    });

    describe('series deduplication', () => {
      it('creates one proposed series for many works sharing it', async () => {
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Work 1' } },
              Collection: collection(ARC_SERIES_NAME),
            }),
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Work 2' } },
              Collection: collection(ARC_SERIES_NAME),
            }),
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Work 3' } },
              Collection: collection(ARC_SERIES_NAME),
            }),
          ],
          [],
        );

        expect(result.status).toBe('success');
        expect(seriesPlan(result)).toHaveLength(1);
        expect(memberTitles(result, seriesPlan(result)[0])).toEqual(['Work 1', 'Work 2', 'Work 3']);
      });

      it('deduplicates deterministically regardless of parse completion order', async () => {
        // parseWork resolves contributor lookups concurrently, so make the first product much
        // slower than the rest and confirm grouping still follows ONIX product order.
        let call = 0;
        mockContributorService.getContributors = vi.fn().mockImplementation(async () => {
          call += 1;
          const delay = call === 1 ? 20 : 0;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return [];
        });

        const withContributor = (title: string) =>
          buildProduct({
            TitleDetail: { TitleElement: { TitleText: title } },
            Collection: collection(ARC_SERIES_NAME),
            Contributor: [{ ContributorRole: 'A01', PersonName: `Author of ${title}` }],
          } as unknown as Partial<ExtendedDescriptiveDetail>);

        const result = await runParser([withContributor('Slow'), withContributor('Fast')], []);

        expect(result.status).toBe('success');
        expect(seriesPlan(result)).toHaveLength(1);
        expect(memberTitles(result, seriesPlan(result)[0])).toEqual(['Slow', 'Fast']);
        expect(memberOrdinals(seriesPlan(result)[0])).toEqual([1, 2]);
      });

      it('reuses an existing series rather than proposing a duplicate on a retried import', async () => {
        // Models a retry after a partial failure: the series now exists in Thoth because the
        // previous attempt created it.
        const result = await runParser(
          [
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Work 1' } },
              Collection: collection(ARC_SERIES_NAME),
            }),
            buildProduct({
              TitleDetail: { TitleElement: { TitleText: 'Work 2' } },
              Collection: collection(ARC_SERIES_NAME),
            }),
          ],
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME, [1])],
        );

        expect(result.status).toBe('success');
        expect(proposedGroups(result)).toHaveLength(0);
        expect(memberOrdinals(existingGroup(result, ARC_SERIES_ID))).toEqual([2, 3]);
      });
    });

    describe('series ordering', () => {
      const memberProduct = (title: string, sequenceNumber?: string) =>
        buildProduct({
          TitleDetail: { TitleElement: { TitleText: title } },
          Collection: collection(ARC_SERIES_NAME, '10', sequenceNumber),
        });

      it('preserves a CollectionSequenceNumber supplied by the publisher', async () => {
        const result = await runParser(
          [memberProduct('Numbered work', '7')],
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME)],
        );

        expect(memberOrdinals(existingGroup(result, ARC_SERIES_ID))[0]).toBe(7);
      });

      it('preserves a CollectionSequenceNumber for a newly proposed series', async () => {
        const result = await runParser([memberProduct('Numbered work', '7')], []);

        expect(memberOrdinals(proposedGroups(result)[0])[0]).toBe(7);
      });

      it('does not give every unnumbered work in a series the ordinal 1', async () => {
        const result = await runParser(
          [memberProduct('First work'), memberProduct('Second work'), memberProduct('Third work')],
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME)],
        );

        expect(memberOrdinals(existingGroup(result, ARC_SERIES_ID))).toEqual([1, 2, 3]);
      });

      it('starts a newly proposed empty series at ordinal 1 and appends deterministically', async () => {
        const result = await runParser(
          [memberProduct('First work'), memberProduct('Second work'), memberProduct('Third work')],
          [],
        );

        expect(memberOrdinals(proposedGroups(result)[0])).toEqual([1, 2, 3]);
        expect(memberTitles(result, proposedGroups(result)[0])).toEqual(['First work', 'Second work', 'Third work']);
      });

      it('appends unnumbered works in ONIX product order', async () => {
        const result = await runParser(
          [memberProduct('First work'), memberProduct('Second work'), memberProduct('Third work')],
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME)],
        );

        expect(memberTitles(result, existingGroup(result, ARC_SERIES_ID))).toEqual([
          'First work',
          'Second work',
          'Third work',
        ]);
      });

      it('appends after the issues the series already has in Thoth', async () => {
        const result = await runParser(
          [memberProduct('First work'), memberProduct('Second work')],
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME, [1, 2, 5])],
        );

        expect(memberOrdinals(existingGroup(result, ARC_SERIES_ID))).toEqual([6, 7]);
      });

      it('does not collide with an explicit ordinal supplied later in the same import', async () => {
        const result = await runParser(
          [memberProduct('Unnumbered work'), memberProduct('Numbered work', '4')],
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME)],
        );

        expect(memberOrdinals(existingGroup(result, ARC_SERIES_ID))).toEqual([5, 4]);
      });
    });

    describe('chapters', () => {
      it('parses a content item title supplied as TitleWithoutPrefix', async () => {
        const result = await runParser([
          {
            ...buildProduct({ TitleDetail: { TitleElement: { TitleText: 'Chaptered work' } } }),
            ContentDetail: {
              ContentItem: [
                {
                  LevelSequenceNumber: '2',
                  TitleDetail: {
                    TitleType: TitleType._01,
                    TitleElement: {
                      TitleElementLevel: TitleElementLevel._04,
                      NoPrefix: '',
                      TitleWithoutPrefix: 'List of Illustrations',
                    },
                  },
                },
                {
                  LevelSequenceNumber: '1',
                  TitleDetail: {
                    TitleType: TitleType._01,
                    TitleElement: {
                      TitleElementLevel: TitleElementLevel._04,
                      NoPrefix: '',
                      TitleWithoutPrefix: 'Table of Contents',
                    },
                  },
                },
              ],
            },
          } as unknown as ExtendedProduct,
        ]);

        expect(result.status).toBe('success');
        expect(result.data.plan.chapters.map((chapter) => chapter.titles[0].title)).toEqual([
          'Table of Contents',
          'List of Illustrations',
        ]);
      });
    });

    describe('end to end with @5stones/onix', () => {
      const ARC_LIKE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>9781641891783</RecordReference>
    <ProductIdentifier>
      <ProductIDType>15</ProductIDType>
      <IDValue>9781641891783</IDValue>
    </ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <Collection>
        <CollectionType>10</CollectionType>
        <TitleDetail>
          <TitleType>01</TitleType>
          <TitleElement>
            <TitleElementLevel>02</TitleElementLevel>
            <NoPrefix/>
            <TitleWithoutPrefix>Arc Companions</TitleWithoutPrefix>
          </TitleElement>
        </TitleDetail>
      </Collection>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <TitlePrefix language="eng">A</TitlePrefix>
          <TitleWithoutPrefix language="eng">Companion to the Cavendishes</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <TitleDetail>
        <TitleType>05</TitleType>
        <TitleElement>
          <TitleElementLevel>01</TitleElementLevel>
          <NoPrefix/>
          <TitleWithoutPrefix language="eng">COMP_Hopkins-Cavendishes</TitleWithoutPrefix>
        </TitleElement>
      </TitleDetail>
      <Language>
        <LanguageRole>01</LanguageRole>
        <LanguageCode>eng</LanguageCode>
      </Language>
      <Language>
        <LanguageRole>02</LanguageRole>
        <LanguageCode>fre</LanguageCode>
      </Language>
    </DescriptiveDetail>
    <PublishingDetail>
      <Imprint>
        <ImprintName>IMPRINT_NAME</ImprintName>
      </Imprint>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
    <ContentDetail>
      <ContentItem>
        <LevelSequenceNumber>1</LevelSequenceNumber>
        <TitleDetail>
          <TitleType>01</TitleType>
          <TitleElement>
            <TitleElementLevel>04</TitleElementLevel>
            <NoPrefix/>
            <TitleWithoutPrefix>Table of Contents</TitleWithoutPrefix>
          </TitleElement>
        </TitleDetail>
      </ContentItem>
    </ContentDetail>
  </Product>
</ONIXMessage>`;

      it('imports an Arc-shaped record parsed by the real library', async () => {
        const xml = (await parse(ARC_LIKE_XML.replace('IMPRINT_NAME', imprints[0].label))) as ExtendedONIXMessageRoot;

        const parser = new XMLParser(
          xml,
          imprints,
          licenses,
          [buildSeries(ARC_SERIES_ID, ARC_SERIES_NAME, [1, 2])],
          mockContributorService,
          mockInstitutionService,
          languages,
          currencyOptions,
        );

        const result = await parser.parse();

        expect(errorMessages(result)).toEqual([]);
        expect(result.status).toBe('success');
        expect(result.data.plan.works[0].titles[0].title).toBe('A Companion to the Cavendishes');
        expect(result.data.plan.works[0].languages).toEqual([
          { code: 'ENG', relation: LanguageRelation.enum.Original, id: appConfig.defaultId },
          { code: 'FRE', relation: LanguageRelation.enum.TranslatedFrom, id: appConfig.defaultId },
        ]);
        expect(result.data.plan.chapters[0].titles[0].title).toBe('Table of Contents');
        expect(memberOrdinals(existingGroup(result, ARC_SERIES_ID))[0]).toBe(3);
      });
    });
  });

  /**
   * ONIX fidelity: what the importer makes of the parts of a record that say what language
   * something is in, where a work sits in its series, and which of the products listed beside it
   * are actually cited.
   *
   * Everything here goes through the real `@5stones/onix` parser, because the whole point is what
   * survives the journey from an XML attribute to a Thoth field.
   */
  describe('ONIX fidelity', () => {
    const FIDELITY_IMPRINT = { label: 'Fidelity Press', value: '44444444-4444-4444-4444-444444444444' };
    const FIDELITY_SERIES_ID = '55555555-5555-5555-5555-555555555555';

    /** One product, with the parts each test cares about slotted in. */
    const productXml = ({
      identifiers = '',
      titleDetails = '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Beowulf by All</TitleText></TitleElement></TitleDetail>',
      languages:
        productLanguages = '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>',
      contributors = '',
      collateralDetail = '',
      collection = '',
      contentDetail = '',
      publishingStatus = '04',
      publishingDates = '',
      relatedMaterial = '',
    }: {
      identifiers?: string;
      titleDetails?: string;
      languages?: string;
      contributors?: string;
      collateralDetail?: string;
      collection?: string;
      contentDetail?: string;
      publishingStatus?: string;
      publishingDates?: string;
      relatedMaterial?: string;
    }) => `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>9781641891783</RecordReference>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641891783</IDValue></ProductIdentifier>
    ${identifiers}
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      ${collection}
      ${titleDetails}
      ${productLanguages}
      ${contributors}
    </DescriptiveDetail>
    ${collateralDetail}
    ${contentDetail}
    <PublishingDetail>
      <Imprint><ImprintName>${FIDELITY_IMPRINT.label}</ImprintName></Imprint>
      <PublishingStatus>${publishingStatus}</PublishingStatus>
      ${publishingDates}
    </PublishingDetail>
    ${relatedMaterial}
  </Product>
</ONIXMessage>`;

    const fidelitySeries = (name: string): SeriesEntity => ({
      id: FIDELITY_SERIES_ID,
      name,
      type: SeriesType.enum.BookSeries,
      issnPrint: '',
      issnDigital: '',
      updatedAt: '',
      imprintId: FIDELITY_IMPRINT.value,
      imprintName: FIDELITY_IMPRINT.label,
      url: '',
      cfpUrl: '',
      description: '',
      issues: [],
    });

    const runFidelityParser = async (xml: string, parserSerieses: SeriesEntity[] = []) => {
      const parsed = (await parse(xml)) as ExtendedONIXMessageRoot;

      return new XMLParser(
        parsed,
        [...imprints, FIDELITY_IMPRINT],
        licenses,
        parserSerieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      ).parse();
    };

    describe('title locale', () => {
      it('takes the canonical title locale from the title language attribute', async () => {
        const result = await runFidelityParser(
          productXml({
            titleDetails: `<TitleDetail><TitleType>01</TitleType><TitleElement>
              <TitleElementLevel>01</TitleElementLevel>
              <TitleText language="fre">L’Étranger</TitleText>
              <Subtitle language="fre">Un roman</Subtitle>
            </TitleElement></TitleDetail>`,
            languages: '<Language><LanguageRole>01</LanguageRole><LanguageCode>fre</LanguageCode></Language>',
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(result.data.plan.works[0].titles[0]).toMatchObject({
          canonical: true,
          title: 'L’Étranger',
          subtitle: 'Un roman',
          localeCode: LanguageTypeAlt.enum.Fr,
        });
      });

      it("falls back to the product's language of text when the title says nothing", async () => {
        const result = await runFidelityParser(
          productXml({
            titleDetails: `<TitleDetail><TitleType>01</TitleType><TitleElement>
              <TitleElementLevel>01</TitleElementLevel><TitleText>Don Quijote</TitleText>
            </TitleElement></TitleDetail>`,
            languages: `<Language><LanguageRole>01</LanguageRole><LanguageCode>spa</LanguageCode></Language>
              <Language><LanguageRole>02</LanguageRole><LanguageCode>fre</LanguageCode></Language>`,
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        // The translated-from language is not what the title is written in.
        expect(result.data.plan.works[0].titles[0].localeCode).toBe(LanguageTypeAlt.enum.Es);
      });

      it('prefers the title language attribute over the language of text', async () => {
        const result = await runFidelityParser(
          productXml({
            titleDetails: `<TitleDetail><TitleType>01</TitleType><TitleElement>
              <TitleElementLevel>01</TitleElementLevel><TitleText language="ger">Der Fremde</TitleText>
            </TitleElement></TitleDetail>`,
            languages: '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>',
          }),
        );

        expect(result.data.plan.works[0].titles[0].localeCode).toBe(LanguageTypeAlt.enum.De);
      });

      it('keeps the English fallback when neither the title nor the product resolves', async () => {
        const result = await runFidelityParser(
          productXml({
            // `nor` is Norwegian the macro-language; Thoth models nb and nn, so there is no safe
            // answer and the historical fallback stands.
            languages: '<Language><LanguageRole>01</LanguageRole><LanguageCode>nor</LanguageCode></Language>',
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(result.data.plan.works[0].titles[0].localeCode).toBe(LanguageTypeAlt.enum.En);
      });

      it('gives no locale evidence when the product declares two languages of text', async () => {
        const result = await runFidelityParser(
          productXml({
            languages: `<Language><LanguageRole>01</LanguageRole><LanguageCode>fre</LanguageCode></Language>
              <Language><LanguageRole>01</LanguageRole><LanguageCode>ger</LanguageCode></Language>`,
          }),
        );

        expect(result.data.plan.works[0].titles[0].localeCode).toBe(LanguageTypeAlt.enum.En);
      });

      it('stays ambiguous when the second language of text has no Thoth locale', async () => {
        // The declaration is what makes this bilingual. `nor` having no Thoth locale to collide
        // with does not turn the product into a French one.
        const result = await runFidelityParser(
          productXml({
            languages: `<Language><LanguageRole>01</LanguageRole><LanguageCode>fre</LanguageCode></Language>
              <Language><LanguageRole>01</LanguageRole><LanguageCode>nor</LanguageCode></Language>`,
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(result.data.plan.works[0].titles[0].localeCode).toBe(LanguageTypeAlt.enum.En);
      });

      it('is not confused by the same language of text declared twice', async () => {
        const result = await runFidelityParser(
          productXml({
            languages: `<Language><LanguageRole>01</LanguageRole><LanguageCode>fre</LanguageCode></Language>
              <Language><LanguageRole>01</LanguageRole><LanguageCode>FRE </LanguageCode></Language>`,
          }),
        );

        expect(result.data.plan.works[0].titles[0].localeCode).toBe(LanguageTypeAlt.enum.Fr);
      });

      it('still prefers an explicit title language over ambiguous product languages', async () => {
        const result = await runFidelityParser(
          productXml({
            titleDetails: `<TitleDetail><TitleType>01</TitleType><TitleElement>
              <TitleElementLevel>01</TitleElementLevel><TitleText language="spa">Don Quijote</TitleText>
            </TitleElement></TitleDetail>`,
            languages: `<Language><LanguageRole>01</LanguageRole><LanguageCode>fre</LanguageCode></Language>
              <Language><LanguageRole>01</LanguageRole><LanguageCode>nor</LanguageCode></Language>`,
          }),
        );

        expect(result.data.plan.works[0].titles[0].localeCode).toBe(LanguageTypeAlt.enum.Es);
      });
    });

    describe('alternate-language titles', () => {
      it('imports TitleType 06 as a non-canonical title in its own locale', async () => {
        const result = await runFidelityParser(
          productXml({
            titleDetails: `<TitleDetail><TitleType>01</TitleType><TitleElement>
                <TitleElementLevel>01</TitleElementLevel><TitleText language="fre">L’Étranger</TitleText>
              </TitleElement></TitleDetail>
              <TitleDetail><TitleType>06</TitleType><TitleElement>
                <TitleElementLevel>01</TitleElementLevel><TitleText language="eng">The Stranger</TitleText>
              </TitleElement></TitleDetail>`,
            languages: '<Language><LanguageRole>01</LanguageRole><LanguageCode>fre</LanguageCode></Language>',
          }),
        );

        expect(
          result.data.plan.works[0].titles.map(({ title, canonical, localeCode }) => ({
            title,
            canonical,
            localeCode,
          })),
        ).toEqual([
          { title: 'L’Étranger', canonical: true, localeCode: LanguageTypeAlt.enum.Fr },
          { title: 'The Stranger', canonical: false, localeCode: LanguageTypeAlt.enum.En },
        ]);
      });

      it('never imports a publisher’s internal title (TitleType 05)', async () => {
        const result = await runFidelityParser(
          productXml({
            titleDetails: `<TitleDetail><TitleType>01</TitleType><TitleElement>
                <TitleElementLevel>01</TitleElementLevel>
                <TitlePrefix language="eng">A</TitlePrefix>
                <TitleWithoutPrefix language="eng">Companion to the Cavendishes</TitleWithoutPrefix>
              </TitleElement></TitleDetail>
              <TitleDetail><TitleType>05</TitleType><TitleElement>
                <TitleElementLevel>01</TitleElementLevel>
                <TitleWithoutPrefix language="eng">COMP_Hopkins-Cavendishes</TitleWithoutPrefix>
              </TitleElement></TitleDetail>`,
          }),
        );

        // Arc's shape: the Type 01 title is canonical, and the Type 05 title is nowhere.
        expect(result.data.plan.works[0].titles).toHaveLength(1);
        expect(result.data.plan.works[0].titles[0]).toMatchObject({
          canonical: true,
          title: 'A Companion to the Cavendishes',
        });
      });

      it('preserves ONIX order among several alternate titles', async () => {
        const result = await runFidelityParser(
          productXml({
            titleDetails: `<TitleDetail><TitleType>01</TitleType><TitleElement>
                <TitleElementLevel>01</TitleElementLevel><TitleText language="fre">L’Étranger</TitleText>
              </TitleElement></TitleDetail>
              <TitleDetail><TitleType>06</TitleType><TitleElement>
                <TitleElementLevel>01</TitleElementLevel><TitleText language="ger">Der Fremde</TitleText>
              </TitleElement></TitleDetail>
              <TitleDetail><TitleType>06</TitleType><TitleElement>
                <TitleElementLevel>01</TitleElementLevel><TitleText language="eng">The Stranger</TitleText>
              </TitleElement></TitleDetail>`,
            languages: '<Language><LanguageRole>01</LanguageRole><LanguageCode>fre</LanguageCode></Language>',
          }),
        );

        expect(result.data.plan.works[0].titles.map(({ title }) => title)).toEqual([
          'L’Étranger',
          'Der Fremde',
          'The Stranger',
        ]);
      });

      it('falls back to the product language for an alternate title that names none', async () => {
        const result = await runFidelityParser(
          productXml({
            titleDetails: `<TitleDetail><TitleType>01</TitleType><TitleElement>
                <TitleElementLevel>01</TitleElementLevel><TitleText language="eng">The Stranger</TitleText>
              </TitleElement></TitleDetail>
              <TitleDetail><TitleType>06</TitleType><TitleElement>
                <TitleElementLevel>01</TitleElementLevel><TitleText>Der Fremde</TitleText>
              </TitleElement></TitleDetail>`,
            languages: '<Language><LanguageRole>01</LanguageRole><LanguageCode>ger</LanguageCode></Language>',
          }),
        );

        // Not the canonical title's English, and not guessed from the text: the product's own.
        expect(result.data.plan.works[0].titles[1]).toMatchObject({
          title: 'Der Fremde',
          canonical: false,
          localeCode: LanguageTypeAlt.enum.De,
        });
      });

      it('does not repeat a Type 06 title that had to serve as the canonical one', async () => {
        const result = await runFidelityParser(
          productXml({
            titleDetails: `<TitleDetail><TitleType>06</TitleType><TitleElement>
                <TitleElementLevel>01</TitleElementLevel><TitleText language="ger">Der Fremde</TitleText>
              </TitleElement></TitleDetail>`,
          }),
        );

        expect(result.data.plan.works[0].titles).toHaveLength(1);
        expect(result.data.plan.works[0].titles[0]).toMatchObject({ title: 'Der Fremde', canonical: true });
      });
    });

    describe('abstract locale', () => {
      const collateral = (short: string, long: string) => `<CollateralDetail>
        <TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience>${short}</TextContent>
        <TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience>${long}</TextContent>
      </CollateralDetail>`;

      it('takes each abstract locale from its own Text element', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(
              '<Text textformat="03" language="eng">A short description.</Text>',
              '<Text textformat="03" language="fre">Une description longue.</Text>',
            ),
          }),
        );

        // Neither abstract inherits the other's language.
        expect(
          result.data.plan.works[0].abstracts.map(({ type, content, localeCode }) => ({ type, content, localeCode })),
        ).toEqual([
          {
            type: AbstractTypes.enum.Long,
            content: 'Une description longue.',
            localeCode: LanguageTypeAlt.enum.Fr,
          },
          {
            type: AbstractTypes.enum.Short,
            content: 'A short description.',
            localeCode: LanguageTypeAlt.enum.En,
          },
        ]);
      });

      it("falls back to the product's language of text for an untagged abstract", async () => {
        // Thoth's own ONIX exporter writes `textformat` on abstract text but never `language`,
        // so this is the path a Thoth-produced file takes.
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(
              '<Text textformat="03">Una descripción breve.</Text>',
              '<Text textformat="03">Una descripción larga.</Text>',
            ),
            languages: '<Language><LanguageRole>01</LanguageRole><LanguageCode>spa</LanguageCode></Language>',
          }),
        );

        expect(result.data.plan.works[0].abstracts.map(({ localeCode }) => localeCode)).toEqual([
          LanguageTypeAlt.enum.Es,
          LanguageTypeAlt.enum.Es,
        ]);
      });

      it('keeps the English fallback when nothing says otherwise', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral('<Text>Short.</Text>', '<Text>Long.</Text>'),
            languages: '<Language><LanguageRole>01</LanguageRole><LanguageCode>nor</LanguageCode></Language>',
          }),
        );

        expect(result.data.plan.works[0].abstracts.map(({ localeCode }) => localeCode)).toEqual([
          LanguageTypeAlt.enum.En,
          LanguageTypeAlt.enum.En,
        ]);
      });
    });

    describe('collection sequence', () => {
      const collectionXml = (sequences: string) => `<Collection>
        <CollectionType>10</CollectionType>
        ${sequences}
        <TitleDetail><TitleType>01</TitleType><TitleElement>
          <TitleElementLevel>02</TitleElementLevel><TitleWithoutPrefix>Arc Companions</TitleWithoutPrefix>
        </TitleElement></TitleDetail>
      </Collection>`;

      const sequenceXml = (number: string, type?: string) => `<CollectionSequence>
        ${type ? `<CollectionSequenceType>${type}</CollectionSequenceType>` : ''}
        <CollectionSequenceNumber>${number}</CollectionSequenceNumber>
      </CollectionSequence>`;

      const ordinalOf = (result: Awaited<ReturnType<XMLParser['parse']>>) =>
        (result.data.plan.series as SeriesImportPlan)[0]?.members[0]?.orderNumber;

      it('uses the publication-order sequence even when another comes first', async () => {
        const result = await runFidelityParser(
          productXml({ collection: collectionXml(`${sequenceXml('7', '02')}${sequenceXml('11', '03')}`) }),
          [fidelitySeries('Arc Companions')],
        );

        expect(errorMessages(result)).toEqual([]);
        expect(ordinalOf(result)).toBe(11);
      });

      it('ignores a sequence that declares a different order entirely', async () => {
        // Alphabetical position 7 is not issue 7. With no publication order supplied, the planner
        // assigns the next ordinal itself — here the first in a series Thoth does not yet have.
        const result = await runFidelityParser(productXml({ collection: collectionXml(sequenceXml('7', '02')) }), [
          fidelitySeries('Arc Companions'),
        ]);

        expect(errorMessages(result)).toEqual([]);
        expect(ordinalOf(result)).toBe(1);
      });

      it('accepts an untyped sequence, as older files supply', async () => {
        const result = await runFidelityParser(productXml({ collection: collectionXml(sequenceXml('4')) }), [
          fidelitySeries('Arc Companions'),
        ]);

        expect(ordinalOf(result)).toBe(4);
      });

      it('refuses to choose between contradictory publication-order numbers', async () => {
        const result = await runFidelityParser(
          productXml({ collection: collectionXml(`${sequenceXml('11', '03')}${sequenceXml('2', '03')}`) }),
          [fidelitySeries('Arc Companions')],
        );

        expect(result.status).toBe('failed');
        expect(result.issues).toEqual([
          {
            severity: 'error',
            code: 'onix.validation',
            message:
              'Series "Arc Companions" is given more than one publication-order number (2, 11) by product 1 (9781641891783)',
            source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
          },
        ]);
      });

      it('refuses a publication-order number Thoth has no room for', async () => {
        // `issue_ordinal` is `Int4`. Treating this as "no sequence supplied" would have the
        // planner number the work itself, so the publisher's issue 2147483648 would become 1.
        const result = await runFidelityParser(
          productXml({ collection: collectionXml(sequenceXml('2147483648', '03')) }),
          [fidelitySeries('Arc Companions')],
        );

        expect(result.status).toBe('failed');
        expect(result.data.plan.series).toEqual([]);
        expect(errorMessages(result)).toEqual([
          'Series "Arc Companions" is given publication-order number 2147483648 by product 1 (9781641891783), which is outside the range of issue numbers Thoth can store (1 to 2147483647)',
        ]);
      });

      it('accepts the largest ordinal Thoth can store', async () => {
        const result = await runFidelityParser(
          productXml({ collection: collectionXml(sequenceXml('2147483647', '03')) }),
          [fidelitySeries('Arc Companions')],
        );

        expect(errorMessages(result)).toEqual([]);
        expect(ordinalOf(result)).toBe(2147483647);
      });
    });

    describe('work DOI', () => {
      const productIdentifier = (type: string, value: string) =>
        `<ProductIdentifier><ProductIDType>${type}</ProductIDType><IDValue>${value}</IDValue></ProductIdentifier>`;

      const doiOf = (result: Awaited<ReturnType<XMLParser['parse']>>) => result.data.plan.works[0].doi;

      it('canonicalises a bare DOI', async () => {
        const result = await runFidelityParser(productXml({ identifiers: productIdentifier('06', '10.1234/abcd') }));

        expect(result.issues).toEqual([]);
        expect(doiOf(result)).toBe('https://doi.org/10.1234/abcd');
      });

      it('does not prefix a resolver onto a DOI that already has one', async () => {
        // `doiPrefix + value` made this `https://doi.org/https://doi.org/10.1234/abcd`.
        const result = await runFidelityParser(
          productXml({ identifiers: productIdentifier('06', 'https://doi.org/10.1234/abcd') }),
        );

        expect(result.issues).toEqual([]);
        expect(doiOf(result)).toBe('https://doi.org/10.1234/abcd');
      });

      it('accepts an older resolver form', async () => {
        const result = await runFidelityParser(
          productXml({ identifiers: productIdentifier('06', 'http://dx.doi.org/10.1234/abcd') }),
        );

        expect(doiOf(result)).toBe('https://doi.org/10.1234/abcd');
      });

      it('finds a DOI listed behind an unrelated identifier', async () => {
        // The product's own ISBN is already the first ProductIdentifier, and a `.find()` over an
        // unnormalised composite saw an array and matched nothing at all.
        const result = await runFidelityParser(
          productXml({
            identifiers: `${productIdentifier('13', '2019012345')}${productIdentifier('06', '10.1234/abcd')}`,
          }),
        );

        expect(doiOf(result)).toBe('https://doi.org/10.1234/abcd');
      });

      it('does not report two spellings of one DOI as a contradiction', async () => {
        const result = await runFidelityParser(
          productXml({
            identifiers: `${productIdentifier('06', '10.1234/abcd')}${productIdentifier('06', 'https://doi.org/10.1234/abcd')}`,
          }),
        );

        expect(result.issues).toEqual([]);
        expect(doiOf(result)).toBe('https://doi.org/10.1234/abcd');
      });

      it('refuses to choose between two genuinely different DOIs', async () => {
        const result = await runFidelityParser(
          productXml({
            identifiers: `${productIdentifier('06', '10.5678/efgh')}${productIdentifier('06', '10.1234/abcd')}`,
          }),
        );

        // A warning, not an error: a DOI is optional metadata, so the work still imports.
        expect(result.status).toBe('success');
        expect(doiOf(result)).toBe('');
        expect(result.issues).toEqual([
          {
            severity: 'warning',
            code: 'onix.identifier.unusable_doi',
            message:
              'More than one distinct DOI (https://doi.org/10.1234/abcd, https://doi.org/10.5678/efgh) is given for product 1 (9781641891783), so it was imported without a work DOI',
            source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
          },
        ]);
      });

      it('drops a DOI the Thoth API would reject rather than dressing it up', async () => {
        const result = await runFidelityParser(productXml({ identifiers: productIdentifier('06', 'not-a-doi') }));

        expect(doiOf(result)).toBe('');
        expect(doiOf(result)).not.toBe('https://doi.org/not-a-doi');
        expect(result.issues).toEqual([
          {
            severity: 'warning',
            code: 'onix.identifier.unusable_doi',
            message:
              '"not-a-doi" is given as a DOI for product 1 (9781641891783), which Thoth cannot represent as one, so it was not imported',
            source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
          },
        ]);
      });

      it('keeps a valid DOI beside a malformed one and says which was refused', async () => {
        const result = await runFidelityParser(
          productXml({
            identifiers: `${productIdentifier('06', '10.1234/abcd')}${productIdentifier('06', 'PROD-1234')}`,
          }),
        );

        expect(doiOf(result)).toBe('https://doi.org/10.1234/abcd');
        expect(result.issues.map(({ severity, code }) => [severity, code])).toEqual([
          ['warning', 'onix.identifier.unusable_doi'],
        ]);
        expect(result.issues[0].message).toContain('"PROD-1234" is given as a DOI');
      });

      it('leaves the DOI empty when no identifier claims to be one', async () => {
        const result = await runFidelityParser(productXml({ identifiers: productIdentifier('13', '2019012345') }));

        expect(result.issues).toEqual([]);
        expect(doiOf(result)).toBe('');
      });

      it('hands the canonical DOI to the duplicate preflight unchanged', async () => {
        // Preflight reads `work.doi` straight off the plan, so the corrected value reaches it
        // without any change to preflight itself.
        const result = await runFidelityParser(
          productXml({ identifiers: productIdentifier('06', 'http://dx.doi.org/10.1234/abcd') }),
        );

        expect(collectWorkIdentifiers(result.data.plan.works[0])).toContainEqual({
          basis: 'doi',
          value: 'https://doi.org/10.1234/abcd',
        });
      });
    });

    describe('chapter DOI', () => {
      const textItemIdentifier = (type: string, value: string) =>
        `<TextItemIdentifier><TextItemIDType>${type}</TextItemIDType><IDValue>${value}</IDValue></TextItemIdentifier>`;

      const contentDetailXml = (identifiers: string) => `<ContentDetail>
        <ContentItem>
          <LevelSequenceNumber>1</LevelSequenceNumber>
          <TitleDetail><TitleType>01</TitleType><TitleElement>
            <TitleElementLevel>04</TitleElementLevel><TitleText>A Chapter</TitleText>
          </TitleElement></TitleDetail>
          <TextItem>${identifiers}</TextItem>
        </ContentItem>
      </ContentDetail>`;

      const chapterDoiOf = (result: Awaited<ReturnType<XMLParser['parse']>>) => result.data.plan.chapters[0].doi;

      it('reads one TextItemIdentifier as the object the parser emits', async () => {
        const parsed = (await parse(
          productXml({ contentDetail: contentDetailXml(textItemIdentifier('06', '10.1234/chapter')) }),
        )) as ExtendedONIXMessageRoot;
        const [product] = toOnixArray(parsed.ONIXMessage.Product);
        const [chapter] = toOnixArray(product.ContentDetail?.ContentItem);

        expect(Array.isArray(chapter.TextItem?.TextItemIdentifier)).toBe(false);
        expect(chapter.TextItem?.TextItemIdentifier).toEqual({ TextItemIDType: '06', IDValue: '10.1234/chapter' });
      });

      it('reads two TextItemIdentifiers as the array the parser emits', async () => {
        const parsed = (await parse(
          productXml({
            contentDetail: contentDetailXml(
              `${textItemIdentifier('01', 'SKU-1')}${textItemIdentifier('06', '10.1234/chapter')}`,
            ),
          }),
        )) as ExtendedONIXMessageRoot;
        const [product] = toOnixArray(parsed.ONIXMessage.Product);
        const [chapter] = toOnixArray(product.ContentDetail?.ContentItem);

        expect(Array.isArray(chapter.TextItem?.TextItemIdentifier)).toBe(true);
        expect(toOnixArray(chapter.TextItem?.TextItemIdentifier)).toHaveLength(2);
      });

      it('canonicalises a bare chapter DOI', async () => {
        const result = await runFidelityParser(
          productXml({ contentDetail: contentDetailXml(textItemIdentifier('06', '10.1234/chapter')) }),
        );

        expect(result.issues).toEqual([]);
        expect(chapterDoiOf(result)).toBe('https://doi.org/10.1234/chapter');
      });

      it('does not prefix a resolver onto a chapter DOI that already has one', async () => {
        const result = await runFidelityParser(
          productXml({
            contentDetail: contentDetailXml(textItemIdentifier('06', 'https://doi.org/10.1234/chapter')),
          }),
        );

        expect(chapterDoiOf(result)).toBe('https://doi.org/10.1234/chapter');
      });

      it('finds a chapter DOI listed behind an identifier of another type', async () => {
        // Reading `TextItemIdentifier.IDValue` without checking the type made `SKU-1` the DOI.
        const result = await runFidelityParser(
          productXml({
            contentDetail: contentDetailXml(
              `${textItemIdentifier('01', 'SKU-1')}${textItemIdentifier('06', '10.1234/chapter')}`,
            ),
          }),
        );

        expect(result.issues).toEqual([]);
        expect(chapterDoiOf(result)).toBe('https://doi.org/10.1234/chapter');
      });

      it('never makes an identifier of another type into a chapter DOI', async () => {
        const result = await runFidelityParser(
          productXml({ contentDetail: contentDetailXml(textItemIdentifier('01', 'SKU-1')) }),
        );

        expect(result.issues).toEqual([]);
        expect(chapterDoiOf(result)).toBe('');
      });

      it('does not report two spellings of one chapter DOI as a contradiction', async () => {
        const result = await runFidelityParser(
          productXml({
            contentDetail: contentDetailXml(
              `${textItemIdentifier('06', '10.1234/chapter')}${textItemIdentifier('06', 'http://dx.doi.org/10.1234/chapter')}`,
            ),
          }),
        );

        expect(result.issues).toEqual([]);
        expect(chapterDoiOf(result)).toBe('https://doi.org/10.1234/chapter');
      });

      it('refuses to choose between two different chapter DOIs, whichever order they come in', async () => {
        const identifiers = [textItemIdentifier('06', '10.5678/efgh'), textItemIdentifier('06', '10.1234/abcd')];
        const message =
          'More than one distinct DOI (https://doi.org/10.1234/abcd, https://doi.org/10.5678/efgh) is given for a chapter of product 1 (9781641891783), so the chapter was imported without one';

        const forwards = await runFidelityParser(productXml({ contentDetail: contentDetailXml(identifiers.join('')) }));
        const backwards = await runFidelityParser(
          productXml({ contentDetail: contentDetailXml([...identifiers].reverse().join('')) }),
        );

        [forwards, backwards].forEach((result) => {
          expect(result.status).toBe('success');
          expect(chapterDoiOf(result)).toBe('');
          expect(result.issues.map(({ code, message: text }) => [code, text])).toEqual([
            ['onix.identifier.unusable_doi', message],
          ]);
        });
      });

      it('never lets a malformed chapter DOI reach the plan', async () => {
        const result = await runFidelityParser(
          productXml({ contentDetail: contentDetailXml(textItemIdentifier('06', 'not-a-doi')) }),
        );

        expect(chapterDoiOf(result)).toBe('');
        expect(chapterDoiOf(result)).not.toBe('https://doi.org/not-a-doi');
        expect(result.issues).toEqual([
          {
            severity: 'warning',
            code: 'onix.identifier.unusable_doi',
            message:
              '"not-a-doi" is given as a DOI for a chapter of product 1 (9781641891783), which Thoth cannot represent as one, so it was not imported',
            source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
          },
        ]);
      });

      it('keeps a valid chapter DOI beside a malformed one', async () => {
        const result = await runFidelityParser(
          productXml({
            contentDetail: contentDetailXml(
              `${textItemIdentifier('06', '10.1234/chapter')}${textItemIdentifier('06', 'PROD-1234')}`,
            ),
          }),
        );

        expect(chapterDoiOf(result)).toBe('https://doi.org/10.1234/chapter');
        expect(result.issues[0].message).toContain('"PROD-1234" is given as a DOI for a chapter');
      });

      it('leaves the chapter DOI empty when the TextItem has no identifier at all', async () => {
        const result = await runFidelityParser(productXml({ contentDetail: contentDetailXml('') }));

        expect(result.issues).toEqual([]);
        expect(chapterDoiOf(result)).toBe('');
      });
    });

    describe('publishing dates', () => {
      const publishingDateXml = (role: string, value: string, dateformat?: string) =>
        `<PublishingDate><PublishingDateRole>${role}</PublishingDateRole>${
          dateformat === undefined ? `<Date>${value}</Date>` : `<Date dateformat="${dateformat}">${value}</Date>`
        }</PublishingDate>`;

      const datesOf = (result: Awaited<ReturnType<XMLParser['parse']>>) => [
        result.data.plan.works[0]?.publicationDate,
        result.data.plan.works[0]?.withdrawnDate,
      ];

      it('reads the complete dates Thoth itself writes', async () => {
        const result = await runFidelityParser(
          productXml({
            publishingStatus: '16',
            publishingDates: `${publishingDateXml('01', '20240807', '00')}${publishingDateXml('13', '20250101', '00')}`,
          }),
        );

        expect(result.issues).toEqual([]);
        expect(datesOf(result)).toEqual(['2024-08-07', '2025-01-01']);
      });

      it('treats a Date with no dateformat as a complete date, as ONIX defines', async () => {
        const result = await runFidelityParser(productXml({ publishingDates: publishingDateXml('01', '20240807') }));

        expect(result.issues).toEqual([]);
        expect(datesOf(result)[0]).toBe('2024-08-07');
      });

      it('never turns a year into the first of January', async () => {
        // `dayjs('2024')` says 1 January 2024. The status here does not need a publication date,
        // so the work imports without one and the loss is reported.
        const result = await runFidelityParser(
          productXml({ publishingStatus: '02', publishingDates: publishingDateXml('01', '2024', '05') }),
        );

        expect(result.status).toBe('success');
        expect(datesOf(result)[0]).toBe('');
        expect(result.issues).toEqual([
          {
            severity: 'warning',
            code: 'onix.date.unrepresentable',
            message:
              'Publication date "2024" in product 1 (9781641891783) is not a complete calendar date Thoth can store, so it was not imported',
            source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
          },
        ]);
      });

      it('never turns a year and month into the first of the month', async () => {
        const result = await runFidelityParser(
          productXml({ publishingStatus: '02', publishingDates: publishingDateXml('01', '202408', '01') }),
        );

        expect(datesOf(result)[0]).toBe('');
        expect(result.issues[0].message).toContain('"202408"');
      });

      it('refuses a day that never existed', async () => {
        const result = await runFidelityParser(
          productXml({ publishingStatus: '02', publishingDates: publishingDateXml('01', '20240230', '00') }),
        );

        expect(datesOf(result)[0]).toBe('');
        expect(datesOf(result)[0]).not.toBe('2024-03-01');
      });

      it('blocks the import when the status makes the date it could not read compulsory', async () => {
        // `WorkProperties::validate` rejects a published work with no publication date, so
        // importing this work without one would fail at the API halfway through the upload.
        const result = await runFidelityParser(
          productXml({ publishingStatus: '04', publishingDates: publishingDateXml('01', '2024', '05') }),
        );

        expect(result.status).toBe('failed');
        expect(result.issues).toEqual([
          {
            severity: 'error',
            code: 'onix.validation',
            message:
              'Publication date "2024" in product 1 (9781641891783) is not a complete calendar date Thoth can store, and a work with status ACTIVE must have one',
            source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
          },
        ]);
      });

      it('blocks the import when an out-of-print work loses its withdrawn date', async () => {
        const result = await runFidelityParser(
          productXml({
            publishingStatus: '16',
            publishingDates: `${publishingDateXml('01', '20240807', '00')}${publishingDateXml('13', '2025', '05')}`,
          }),
        );

        expect(result.status).toBe('failed');
        expect(errorMessages(result)).toEqual([
          'Withdrawn date "2025" in product 1 (9781641891783) is not a complete calendar date Thoth can store, and a work with status WITHDRAWN must have one',
        ]);
      });

      it('collapses one date stated twice', async () => {
        const result = await runFidelityParser(
          productXml({
            publishingDates: `${publishingDateXml('01', '20240807', '00')}${publishingDateXml('01', '20240807')}`,
          }),
        );

        expect(result.issues).toEqual([]);
        expect(datesOf(result)[0]).toBe('2024-08-07');
      });

      it('refuses to choose between two publication dates, whichever order they come in', async () => {
        const dates = [publishingDateXml('01', '20240807', '00'), publishingDateXml('01', '20240808', '00')];
        const message =
          'More than one publication date (2024-08-07, 2024-08-08) is given for product 1 (9781641891783), so none can be imported';

        const forwards = await runFidelityParser(productXml({ publishingDates: dates.join('') }));
        const backwards = await runFidelityParser(productXml({ publishingDates: [...dates].reverse().join('') }));

        [forwards, backwards].forEach((result) => {
          expect(result.status).toBe('failed');
          expect(errorMessages(result)).toEqual([message]);
        });
      });

      it('refuses to choose between two withdrawn dates', async () => {
        const result = await runFidelityParser(
          productXml({
            publishingStatus: '16',
            publishingDates: `${publishingDateXml('01', '20240807', '00')}${publishingDateXml('13', '20250101', '00')}${publishingDateXml('13', '20250202', '00')}`,
          }),
        );

        expect(result.status).toBe('failed');
        expect(errorMessages(result)).toEqual([
          'More than one withdrawn date (2025-01-01, 2025-02-02) is given for product 1 (9781641891783), so none can be imported',
        ]);
      });

      it('keeps the two roles independent', async () => {
        // A withdrawn date this importer cannot read does not cost the work its publication date.
        const result = await runFidelityParser(
          productXml({
            publishingStatus: '04',
            publishingDates: `${publishingDateXml('01', '20240807', '00')}${publishingDateXml('13', '2025', '05')}`,
          }),
        );

        expect(result.status).toBe('success');
        expect(datesOf(result)).toEqual(['2024-08-07', '']);
      });

      it('gives a chapter the dates its product ended up with', async () => {
        const result = await runFidelityParser(
          productXml({
            publishingDates: publishingDateXml('01', '20240807', '00'),
            contentDetail: `<ContentDetail><ContentItem>
              <LevelSequenceNumber>1</LevelSequenceNumber>
              <TitleDetail><TitleType>01</TitleType><TitleElement>
                <TitleElementLevel>04</TitleElementLevel><TitleText>A Chapter</TitleText>
              </TitleElement></TitleDetail>
            </ContentItem></ContentDetail>`,
          }),
        );

        expect(result.data.plan.chapters[0].publicationDate).toBe('2024-08-07');
      });

      /**
       * `WorkProperties::validate` stores a withdrawn date for exactly the out-of-print statuses:
       * it demands one for those (`NoWithdrawnDateError`) and refuses one for every other status
       * (`WithdrawnDateError`). A complete withdrawal date on a work that is not out of print is
       * therefore a date with nowhere to go, and a plan that carried it would fail at `createWork`.
       */
      describe('against the work status', () => {
        it('drops a withdrawn date an active work cannot store', async () => {
          const result = await runFidelityParser(
            productXml({
              publishingStatus: '04',
              publishingDates: `${publishingDateXml('01', '20240807', '00')}${publishingDateXml('13', '20250101', '00')}`,
            }),
          );

          expect(result.status).toBe('success');
          // The publication date is untouched: only the date the status has no room for goes.
          expect(datesOf(result)).toEqual(['2024-08-07', '']);
          expect(result.issues).toEqual([
            {
              severity: 'warning',
              code: 'onix.date.incompatible_status',
              message:
                'Withdrawn date "2025-01-01" in product 1 (9781641891783) cannot be stored for a work with status ACTIVE, so it was not imported',
              source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
            },
          ]);
        });

        it('drops a withdrawn date a forthcoming work cannot store', async () => {
          const result = await runFidelityParser(
            productXml({ publishingStatus: '02', publishingDates: publishingDateXml('13', '20250101', '00') }),
          );

          expect(result.status).toBe('success');
          expect(datesOf(result)[1]).toBe('');
          expect(result.issues.map(({ code }) => code)).toEqual(['onix.date.incompatible_status']);
          expect(result.issues[0].message).toContain('with status FORTHCOMING');
        });

        it('does not change the work status to make room for the date', async () => {
          const result = await runFidelityParser(
            productXml({ publishingStatus: '04', publishingDates: publishingDateXml('13', '20250101', '00') }),
          );

          expect(result.data.plan.works[0].status).toBe(WorkStatuses.enum.Active);
        });

        it('keeps both dates on a withdrawn work', async () => {
          const result = await runFidelityParser(
            productXml({
              publishingStatus: '16',
              publishingDates: `${publishingDateXml('01', '20240807', '00')}${publishingDateXml('13', '20250101', '00')}`,
            }),
          );

          expect(result.issues).toEqual([]);
          expect(datesOf(result)).toEqual(['2024-08-07', '2025-01-01']);
        });

        it('keeps both dates on a superseded work', async () => {
          const result = await runFidelityParser(
            productXml({
              publishingStatus: '21',
              publishingDates: `${publishingDateXml('01', '20240807', '00')}${publishingDateXml('13', '20250101', '00')}`,
            }),
          );

          expect(result.issues).toEqual([]);
          expect(result.data.plan.works[0].status).toBe(WorkStatuses.enum.Superseded);
          expect(datesOf(result)).toEqual(['2024-08-07', '2025-01-01']);
        });

        it('refuses a withdrawal that precedes publication, whichever order the file lists them', async () => {
          // Both fields are compulsory for a withdrawn work, so there is nothing to drop that
          // would leave a mutation that could succeed. It blocks rather than warns.
          const dates = [publishingDateXml('01', '20250101', '00'), publishingDateXml('13', '20240101', '00')];
          const message =
            'Withdrawn date 2024-01-01 is earlier than publication date 2025-01-01 in product 1 (9781641891783), which Thoth does not accept';

          const forwards = await runFidelityParser(
            productXml({ publishingStatus: '16', publishingDates: dates.join('') }),
          );
          const backwards = await runFidelityParser(
            productXml({ publishingStatus: '16', publishingDates: [...dates].reverse().join('') }),
          );

          [forwards, backwards].forEach((result) => {
            expect(result.status).toBe('failed');
            expect(errorMessages(result)).toEqual([message]);
          });
        });

        it('refuses the same chronology on a superseded work', async () => {
          const result = await runFidelityParser(
            productXml({
              publishingStatus: '21',
              publishingDates: `${publishingDateXml('01', '20250101', '00')}${publishingDateXml('13', '20240101', '00')}`,
            }),
          );

          expect(result.status).toBe('failed');
          expect(errorMessages(result)).toEqual([
            'Withdrawn date 2024-01-01 is earlier than publication date 2025-01-01 in product 1 (9781641891783), which Thoth does not accept',
          ]);
        });

        it('accepts a work withdrawn on the day it was published', async () => {
          // The backend's rule is `withdrawn < publication`, not `<=`.
          const result = await runFidelityParser(
            productXml({
              publishingStatus: '16',
              publishingDates: `${publishingDateXml('01', '20240807', '00')}${publishingDateXml('13', '20240807', '00')}`,
            }),
          );

          expect(result.issues).toEqual([]);
          expect(datesOf(result)).toEqual(['2024-08-07', '2024-08-07']);
        });

        it('does not complain twice about a withdrawn date that was already unrepresentable', async () => {
          // The status check runs on the resolved value, so a date already dropped as partial
          // cannot also be reported as incompatible with a status it was never going to reach.
          const result = await runFidelityParser(
            productXml({ publishingStatus: '04', publishingDates: publishingDateXml('13', '2025', '05') }),
          );

          expect(result.status).toBe('success');
          expect(datesOf(result)[1]).toBe('');
          expect(result.issues.map(({ code }) => code)).toEqual(['onix.date.unrepresentable']);
        });
      });
    });

    describe('contributor biography', () => {
      const contributorXml = (biographicalNotes: string) => `<Contributor>
        <SequenceNumber>1</SequenceNumber>
        <ContributorRole>A01</ContributorRole>
        <PersonName>Umberto Eco</PersonName>
        ${biographicalNotes}
      </Contributor>`;

      const biographiesOf = (result: Awaited<ReturnType<XMLParser['parse']>>) =>
        result.data.plan.works[0].contributions[0].biographies.map(({ content, localeCode, canonical }) => [
          content,
          localeCode,
          canonical,
        ]);

      it('keeps a bare biography in the English every import used to get', async () => {
        const result = await runFidelityParser(
          productXml({ contributors: contributorXml('<BiographicalNote>A made-up author</BiographicalNote>') }),
        );

        expect(biographiesOf(result)).toEqual([['A made-up author', LanguageTypeAlt.enum.En, true]]);
      });

      it('keeps the language an attributed biography declares', async () => {
        const result = await runFidelityParser(
          productXml({
            contributors: contributorXml('<BiographicalNote language="fre">Un auteur inventé</BiographicalNote>'),
          }),
        );

        expect(biographiesOf(result)).toEqual([['Un auteur inventé', LanguageTypeAlt.enum.Fr, true]]);
      });

      it('reads the text of an attributed biography rather than the object holding it', async () => {
        const result = await runFidelityParser(
          productXml({
            contributors: contributorXml(
              '<BiographicalNote language="eng" textformat="05">A made-up author</BiographicalNote>',
            ),
          }),
        );

        expect(biographiesOf(result)[0][0]).toBe('A made-up author');
        expect(biographiesOf(result)[0][0]).not.toContain('object Object');
      });

      it('falls back to English for a language Thoth has no locale for', async () => {
        // `nor` is a macro-language Thoth splits into Nb and Nn, so there is no honest answer.
        const result = await runFidelityParser(
          productXml({
            contributors: contributorXml('<BiographicalNote language="nor">En oppdiktet forfatter</BiographicalNote>'),
          }),
        );

        expect(biographiesOf(result)).toEqual([['En oppdiktet forfatter', LanguageTypeAlt.enum.En, true]]);
      });

      it('does not make an untagged biography follow the language of the book', async () => {
        // A biography is prose about a person, not part of the work's text: an English note about
        // a Spanish author is entirely ordinary.
        const result = await runFidelityParser(
          productXml({
            languages: '<Language><LanguageRole>01</LanguageRole><LanguageCode>spa</LanguageCode></Language>',
            contributors: contributorXml('<BiographicalNote>A made-up author</BiographicalNote>'),
          }),
        );

        expect(biographiesOf(result)).toEqual([['A made-up author', LanguageTypeAlt.enum.En, true]]);
      });

      it('keeps every language a repeated biography is written in', async () => {
        // ONIX repeats BiographicalNote rather than Contributor for a multilingual biography.
        const result = await runFidelityParser(
          productXml({
            contributors: contributorXml(
              `<BiographicalNote language="eng">A made-up author</BiographicalNote>
               <BiographicalNote language="ita">Un autore inventato</BiographicalNote>`,
            ),
          }),
        );

        expect(biographiesOf(result)).toEqual([
          ['A made-up author', LanguageTypeAlt.enum.En, true],
          ['Un autore inventato', LanguageTypeAlt.enum.It, false],
        ]);
      });

      it('gives a contributor with no biography none', async () => {
        const result = await runFidelityParser(productXml({ contributors: contributorXml('') }));

        expect(biographiesOf(result)).toEqual([]);
      });
    });

    describe('text markup format', () => {
      const collateral = (long: string) =>
        `<CollateralDetail><TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience>${long}</TextContent></CollateralDetail>`;

      const contributorXml = (biographicalNotes: string) => `<Contributor>
        <SequenceNumber>1</SequenceNumber>
        <ContributorRole>A01</ContributorRole>
        <PersonName>Lisa Hopkins</PersonName>
        ${biographicalNotes}
      </Contributor>`;

      const abstractsOf = (result: Awaited<ReturnType<XMLParser['parse']>>) =>
        result.data.plan.works[0].abstracts.map(({ content, sourceMarkupFormat }) => [content, sourceMarkupFormat]);

      const biographiesOf = (result: Awaited<ReturnType<XMLParser['parse']>>) =>
        result.data.plan.works[0].contributions[0].biographies.map(({ content, sourceMarkupFormat }) => [
          content,
          sourceMarkupFormat,
        ]);

      it('keeps a declared-HTML abstract as HTML rather than reading its tags as JATS', async () => {
        // The Arc failure: `textformat="02"` with `<em>` inside used to reach the API declared
        // as JATS XML and fail its validator on the first HTML tag.
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(
              '<Text textformat="02">&lt;p&gt;The &lt;em&gt;A Companion to the Cavendishes&lt;/em&gt; volume.&lt;/p&gt;</Text>',
            ),
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(abstractsOf(result)).toEqual([
          ['<p>The <em>A Companion to the Cavendishes</em> volume.</p>', MarkupFormat.Html],
        ]);
      });

      it('sends a declared-HTML abstract with no tags as plain text', async () => {
        // The API's HTML input path refuses content with nothing tag-shaped in it, and a
        // markup-free string means the same in both formats.
        const result = await runFidelityParser(
          productXml({ collateralDetail: collateral('<Text textformat="02">A plain description</Text>') }),
        );

        expect(abstractsOf(result)).toEqual([['A plain description', MarkupFormat.PlainText]]);
      });

      it('keeps a declared-XML abstract in the Thoth JATS subset as JATS', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(
              '<Text textformat="03">&lt;p&gt;The &lt;italic&gt;book&lt;/italic&gt;.&lt;/p&gt;</Text>',
            ),
          }),
        );

        expect(abstractsOf(result)).toEqual([['<p>The <italic>book</italic>.</p>', MarkupFormat.JatsXml]]);
      });

      it('keeps a plain declared-plain abstract plain', async () => {
        const result = await runFidelityParser(
          productXml({ collateralDetail: collateral('<Text textformat="06">Plain description</Text>') }),
        );

        expect(abstractsOf(result)).toEqual([['Plain description', MarkupFormat.PlainText]]);
      });

      it('routes a plain-text declaration that really contains HTML through HTML, not JATS', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(
              '<Text textformat="06">&lt;p&gt;The &lt;em&gt;book&lt;/em&gt;.&lt;/p&gt;</Text>',
            ),
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(abstractsOf(result)).toEqual([['<p>The <em>book</em>.</p>', MarkupFormat.Html]]);
      });

      it('resolves the short and long abstract formats independently', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: `<CollateralDetail>
              <TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience>
                <Text textformat="06">A plain short description</Text>
              </TextContent>
              <TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience>
                <Text textformat="02">&lt;p&gt;An &lt;em&gt;HTML&lt;/em&gt; long description&lt;/p&gt;</Text>
              </TextContent>
            </CollateralDetail>`,
          }),
        );

        expect(abstractsOf(result)).toEqual([
          ['<p>An <em>HTML</em> long description</p>', MarkupFormat.Html],
          ['A plain short description', MarkupFormat.PlainText],
        ]);
      });

      it('blocks the import when an abstract declares XML but contains non-JATS markup', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(
              '<Text textformat="03">&lt;p&gt;The &lt;em&gt;book&lt;/em&gt;.&lt;/p&gt;</Text>',
            ),
          }),
        );

        expect(result.status).toBe('failed');
        expect(result.data.plan.works).toEqual([]);
        expect(result.issues).toContainEqual({
          severity: 'error',
          code: 'onix.text.unrepresentable_format',
          message: expect.stringContaining('long abstract'),
          source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
        });
        expect(errorMessages(result)[0]).toContain('textformat "03"');
        expect(errorMessages(result)[0]).toContain('<em>');
      });

      it('blocks the import when markup cannot be classified at all', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral('<Text textformat="06">A &lt;blink&gt;bad&lt;/blink&gt; description</Text>'),
          }),
        );

        expect(result.status).toBe('failed');
        expect(result.issues).toContainEqual(
          expect.objectContaining({ severity: 'error', code: 'onix.text.unrepresentable_format' }),
        );
      });

      it('imports the real Arc biography shape as HTML, never as JATS or plain text', async () => {
        const result = await runFidelityParser(
          productXml({
            contributors: contributorXml(
              '<BiographicalNote textformat="06">Lisa Hopkins is co-editor of &lt;I&gt;Shakespeare&lt;/I&gt;.</BiographicalNote>',
            ),
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(biographiesOf(result)).toEqual([
          ['Lisa Hopkins is co-editor of <I>Shakespeare</I>.', MarkupFormat.Html],
        ]);
      });

      it('gives each repeated biography its own format rather than the first one’s', async () => {
        const result = await runFidelityParser(
          productXml({
            contributors: contributorXml(
              `<BiographicalNote textformat="02" language="eng">&lt;p&gt;An &lt;em&gt;editor&lt;/em&gt;.&lt;/p&gt;</BiographicalNote>
               <BiographicalNote textformat="06" language="ita">Un autore inventato</BiographicalNote>`,
            ),
          }),
        );

        expect(biographiesOf(result)).toEqual([
          ['<p>An <em>editor</em>.</p>', MarkupFormat.Html],
          ['Un autore inventato', MarkupFormat.PlainText],
        ]);
      });

      it('keeps a bare biography with no declared format plain', async () => {
        const result = await runFidelityParser(
          productXml({ contributors: contributorXml('<BiographicalNote>A made-up author</BiographicalNote>') }),
        );

        expect(biographiesOf(result)).toEqual([['A made-up author', MarkupFormat.PlainText]]);
      });

      it('blocks the import when a biography’s markup cannot be classified, naming the author', async () => {
        const result = await runFidelityParser(
          productXml({
            contributors: contributorXml(
              '<BiographicalNote textformat="06">A &lt;marquee&gt;showy&lt;/marquee&gt; author</BiographicalNote>',
            ),
          }),
        );

        expect(result.status).toBe('failed');
        expect(result.issues).toContainEqual({
          severity: 'error',
          code: 'onix.text.unrepresentable_format',
          message: expect.stringContaining('biography of Lisa Hopkins'),
          source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
        });
      });

      it('removes an Arc empty spacer paragraph and keeps the abstract as HTML', async () => {
        // The exact production shape of Arc product 9781802700596: a real paragraph followed by an
        // empty <p style="text-align:justify;"><br></p> layout paragraph.
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(
              '<Text textformat="02">&lt;p&gt;This book examines the Baltic crusades.&lt;/p&gt;&lt;p style="text-align:justify;"&gt;&lt;br&gt;&lt;/p&gt;</Text>',
            ),
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(abstractsOf(result)).toEqual([['<p>This book examines the Baltic crusades.</p>', MarkupFormat.Html]]);
      });

      it('omits an abstract that is nothing but spacer markup, and raises no issue', async () => {
        const result = await runFidelityParser(
          productXml({ collateralDetail: collateral('<Text textformat="02">&lt;p&gt;&lt;br&gt;&lt;/p&gt;</Text>') }),
        );

        expect(result.status).toBe('success');
        expect(result.issues).toEqual([]);
        expect(abstractsOf(result)).toEqual([]);
      });

      it('blocks malformed HTML with a structurally accurate diagnostic', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(
              '<Text textformat="02">&lt;p&gt;&lt;em&gt;one&lt;br&gt;two&lt;/strong&gt;&lt;/p&gt;</Text>',
            ),
          }),
        );

        expect(result.status).toBe('failed');
        expect(result.data.plan.works).toEqual([]);
        expect(result.issues).toContainEqual({
          severity: 'error',
          code: 'onix.text.unrepresentable_structure',
          message: expect.stringContaining('contains HTML structure Thoth cannot safely normalise or represent'),
          source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
        });
        expect(errorMessages(result)[0]).toContain('without inventing semantics or losing content');
        expect(errorMessages(result)[0]).not.toContain('line break');
      });

      it('normalises meaningful HTML line breaks in a long abstract into paragraphs', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral('<Text textformat="02">&lt;p&gt;Hello&lt;br&gt;world&lt;/p&gt;</Text>'),
          }),
        );

        expect(result.status).toBe('success');
        expect(result.issues).toEqual([]);
        expect(abstractsOf(result)).toEqual([['<p>Hello</p><p>world</p>', MarkupFormat.Html]]);
      });

      it('normalises meaningful HTML line breaks in a short abstract into paragraphs', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: `<CollateralDetail>
              <TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience>
                <Text textformat="02">&lt;p&gt;Short&lt;br&gt;break&lt;/p&gt;</Text>
              </TextContent>
            </CollateralDetail>`,
          }),
        );

        expect(result.status).toBe('success');
        expect(result.issues).toEqual([]);
        expect(abstractsOf(result)).toEqual([['<p>Short</p><p>break</p>', MarkupFormat.Html]]);
      });

      it('removes a spacer paragraph from a biography and keeps it as HTML', async () => {
        const result = await runFidelityParser(
          productXml({
            contributors: contributorXml(
              '<BiographicalNote textformat="02">&lt;p&gt;A real biography.&lt;/p&gt;&lt;p&gt;&lt;br&gt;&lt;/p&gt;</BiographicalNote>',
            ),
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(biographiesOf(result)).toEqual([['<p>A real biography.</p>', MarkupFormat.Html]]);
      });

      it('normalises meaningful HTML line breaks in a biography into paragraphs', async () => {
        const result = await runFidelityParser(
          productXml({
            contributors: contributorXml(
              '<BiographicalNote textformat="02">&lt;p&gt;Hello&lt;br&gt;world&lt;/p&gt;</BiographicalNote>',
            ),
          }),
        );

        expect(result.status).toBe('success');
        expect(result.issues).toEqual([]);
        expect(biographiesOf(result)).toEqual([['<p>Hello</p><p>world</p>', MarkupFormat.Html]]);
      });

      it('keeps a contradictory textformat="06" abstract on the HTML path after removing its spacer', async () => {
        // Arc's textformat 06 + <I> compatibility (PR #85) must survive spacer removal: the
        // meaningful markup stays HTML and the empty spacer paragraph is dropped.
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(
              '<Text textformat="06">&lt;p&gt;&lt;I&gt;Something&lt;/I&gt;&lt;/p&gt;&lt;p&gt;&lt;br&gt;&lt;/p&gt;</Text>',
            ),
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(abstractsOf(result)).toEqual([['<p><I>Something</I></p>', MarkupFormat.Html]]);
      });

      it('collapses the source-line wrapping of a tagless declared-HTML abstract, keeping it plain text', async () => {
        // The production shape of Arc product 9781942401353: an abstract declared textformat="02"
        // (HTML) containing no tags at all, wrapped across physical lines by the publisher's XML
        // tooling. HTML whitespace collapses when rendered, so the newlines are formatting, not
        // line breaks — and the markup-free result still belongs on the plain-text input path.
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(`<Text textformat="02">In this unique collection the authors present a
wide range of interdisciplinary methods.</Text>`),
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(abstractsOf(result)).toEqual([
          [
            'In this unique collection the authors present a wide range of interdisciplinary methods.',
            MarkupFormat.PlainText,
          ],
        ]);
      });

      it('collapses a tagless declared-XHTML (05) abstract the same way', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(`<Text textformat="05">Hello
world</Text>`),
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(abstractsOf(result)).toEqual([['Hello world', MarkupFormat.PlainText]]);
      });

      it('blocks a plain-text abstract holding a single line break, and creates no work', async () => {
        // textformat 06 declares plain text, where a newline is a deliberate line break — one the
        // API's plain-text path would turn into a Break no abstract paragraph may hold. Blocking in
        // preview is what keeps the failure out of a half-finished bulk import.
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(`<Text textformat="06">Hello
world</Text>`),
          }),
        );

        expect(result.status).toBe('failed');
        expect(result.data.plan.works).toEqual([]);
        expect(result.issues).toContainEqual({
          severity: 'error',
          code: 'onix.text.unrepresentable_structure',
          message: expect.stringContaining('long abstract'),
          source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
        });
        expect(errorMessages(result)[0]).toContain('single line break');
        // Never the raw backend wording, which is misleading for this case.
        expect(errorMessages(result)[0]).not.toContain('nested block elements');
      });

      it('blocks an abstract with no declared format holding a single line break, conservatively', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(`<Text>Hello
world</Text>`),
          }),
        );

        expect(result.status).toBe('failed');
        expect(result.issues).toContainEqual(expect.objectContaining({ code: 'onix.text.unrepresentable_structure' }));
      });

      it('keeps blank-line paragraph separation in a plain-text abstract: the API represents it', async () => {
        const result = await runFidelityParser(
          productXml({
            collateralDetail: collateral(`<Text textformat="06">Paragraph one.

Paragraph two.</Text>`),
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(abstractsOf(result)).toEqual([['Paragraph one.\n\nParagraph two.', MarkupFormat.PlainText]]);
      });

      it('blocks a plain-text biography holding a single line break, naming the author', async () => {
        const result = await runFidelityParser(
          productXml({
            contributors: contributorXml(`<BiographicalNote textformat="06">Lisa Hopkins writes.
She edits too.</BiographicalNote>`),
          }),
        );

        expect(result.status).toBe('failed');
        expect(result.data.plan.works).toEqual([]);
        expect(result.issues).toContainEqual({
          severity: 'error',
          code: 'onix.text.unrepresentable_structure',
          message: expect.stringContaining('biography of Lisa Hopkins'),
          source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
        });
      });

      it('collapses a tagless declared-HTML biography like an abstract', async () => {
        const result = await runFidelityParser(
          productXml({
            contributors: contributorXml(`<BiographicalNote textformat="02">Lisa Hopkins is
Professor Emerita of English.</BiographicalNote>`),
          }),
        );

        expect(errorMessages(result)).toEqual([]);
        expect(biographiesOf(result)).toEqual([
          ['Lisa Hopkins is Professor Emerita of English.', MarkupFormat.PlainText],
        ]);
      });
    });

    describe('related material', () => {
      const relatedMaterialXml = (relations: string) => `<RelatedMaterial>${relations}</RelatedMaterial>`;

      const referencesOf = (result: Awaited<ReturnType<XMLParser['parse']>>) => result.data.plan.works[0].references;

      it('does not turn an alternative format into a reference', async () => {
        // Exactly what Thoth's exporter writes for another ISBN of the same work: relation 06,
        // with the ISBN-13 and the GTIN-13 of the same product.
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>06</ProductRelationCode>
              <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier>
              <ProductIdentifier><ProductIDType>03</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(result.issues).toEqual([]);
        expect(referencesOf(result)).toEqual([]);
      });

      it('turns a cited product with a DOI into a reference', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/abcd</IDValue></ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)).toEqual([
          expect.objectContaining({
            doi: 'https://doi.org/10.1234/abcd',
            unstructuredCitation: '',
            orderNumber: 1,
          }),
        ]);
      });

      it('does not prefix a DOI that already carries its resolver', async () => {
        // Not what Thoth writes — its `Doi` Display strips the resolver, so Thoth's own ONIX
        // carries the bare identifier — but plenty of other senders write the full URL.
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier>
                <ProductIDType>06</ProductIDType><IDValue>https://doi.org/10.1234/abcd</IDValue>
              </ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)[0].doi).toBe('https://doi.org/10.1234/abcd');
      });

      it('canonicalises the older resolver forms the Thoth API accepts', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier>
                <ProductIDType>06</ProductIDType><IDValue>http://dx.doi.org/10.1234/abcd</IDValue>
              </ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)[0].doi).toBe('https://doi.org/10.1234/abcd');
      });

      it('drops a DOI the Thoth API would reject rather than dressing it up', async () => {
        // The old behaviour concatenated the resolver onto anything, so a publisher's product
        // code arrived at the API as `https://doi.org/PROD-1234` and failed there.
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>not-a-doi</IDValue></ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)).toEqual([]);
        expect(result.status).toBe('success');
        expect(result.issues.map(({ code, severity }) => [code, severity])).toEqual([
          ['onix.reference.unusable_identifier', 'warning'],
          ['onix.reference.unrepresentable_citation', 'warning'],
        ]);
        expect(result.issues[0].message).toContain('supplies "not-a-doi" as a DOI, which Thoth cannot read as one');
      });

      it('keeps the citation when only the DOI beside it is unusable', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>not-a-doi</IDValue></ProductIdentifier>
              <ProductIdentifier>
                <ProductIDType>01</ProductIDType><IDTypeName>Unstructured citation</IDTypeName>
                <IDValue>Hopkins, Lisa. 2019.</IDValue>
              </ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        // The reference survives with what Thoth can store, and the loss is named.
        expect(referencesOf(result)).toEqual([
          expect.objectContaining({ doi: '', unstructuredCitation: 'Hopkins, Lisa. 2019.' }),
        ]);
        expect(result.status).toBe('success');
        expect(result.issues.map(({ code }) => code)).toEqual(['onix.reference.unusable_identifier']);
      });

      it('never lets a malformed DOI reach the plan', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>PROD-1234</IDValue></ProductIdentifier>
              <ProductIdentifier>
                <ProductIDType>01</ProductIDType><IDTypeName>Unstructured citation</IDTypeName>
                <IDValue>Some citation.</IDValue>
              </ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result).map(({ doi }) => doi)).toEqual(['']);
        expect(referencesOf(result).map(({ doi }) => doi)).not.toContain('https://doi.org/PROD-1234');
      });

      it('refuses to choose between two DOIs on one cited product', async () => {
        const both = `<ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/abcd</IDValue></ProductIdentifier>
          <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.5678/efgh</IDValue></ProductIdentifier>`;
        const reversed = `<ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.5678/efgh</IDValue></ProductIdentifier>
          <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/abcd</IDValue></ProductIdentifier>`;

        const results = await Promise.all(
          [both, reversed].map((identifiers) =>
            runFidelityParser(
              productXml({
                relatedMaterial: relatedMaterialXml(`<RelatedProduct>
                  <ProductRelationCode>34</ProductRelationCode>
                  ${identifiers}
                  <ProductIdentifier>
                    <ProductIDType>01</ProductIDType><IDTypeName>Unstructured citation</IDTypeName>
                    <IDValue>Hopkins, Lisa. 2019.</IDValue>
                  </ProductIdentifier>
                </RelatedProduct>`),
              }),
            ),
          ),
        );

        // Reversing the file's identifier order must not change what is imported.
        results.forEach((result) => {
          expect(referencesOf(result)).toEqual([
            expect.objectContaining({ doi: '', unstructuredCitation: 'Hopkins, Lisa. 2019.' }),
          ]);
          expect(result.issues.map(({ code }) => code)).toEqual(['onix.reference.unusable_identifier']);
          // The conflict is between the DOIs, so the message names them as Thoth writes them.
          expect(result.issues[0].message).toContain(
            'supplies more than one DOI (https://doi.org/10.1234/abcd, https://doi.org/10.5678/efgh)',
          );
        });
      });

      it('does not call one DOI written two ways a contradiction', async () => {
        // Selection canonicalises before comparing, so the bare DOI and its resolver-prefixed
        // twin are one identifier. Comparing the raw strings reported them as disagreeing.
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/abcd</IDValue></ProductIdentifier>
              <ProductIdentifier>
                <ProductIDType>06</ProductIDType><IDValue>https://doi.org/10.1234/abcd</IDValue>
              </ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(result.issues).toEqual([]);
        expect(referencesOf(result)).toEqual([
          expect.objectContaining({ doi: 'https://doi.org/10.1234/abcd', unstructuredCitation: '' }),
        ]);
      });

      it('keeps a cited DOI beside a malformed one rather than dropping both', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/abcd</IDValue></ProductIdentifier>
              <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>PROD-1234</IDValue></ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)).toEqual([expect.objectContaining({ doi: 'https://doi.org/10.1234/abcd' })]);
        expect(result.issues.map(({ code }) => code)).toEqual(['onix.reference.unusable_identifier']);
        expect(result.issues[0].message).toContain('supplies "PROD-1234" as a DOI');
      });

      it('refuses to choose between two unstructured citations', async () => {
        const citation = (value: string) => `<ProductIdentifier>
          <ProductIDType>01</ProductIDType><IDTypeName>Unstructured citation</IDTypeName>
          <IDValue>${value}</IDValue>
        </ProductIdentifier>`;

        const results = await Promise.all(
          [
            `${citation('Hopkins, Lisa. 2019.')}${citation('Somebody Else. 2020.')}`,
            `${citation('Somebody Else. 2020.')}${citation('Hopkins, Lisa. 2019.')}`,
          ].map((identifiers) =>
            runFidelityParser(
              productXml({
                relatedMaterial: relatedMaterialXml(`<RelatedProduct>
                  <ProductRelationCode>34</ProductRelationCode>
                  ${identifiers}
                  <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/abcd</IDValue></ProductIdentifier>
                </RelatedProduct>`),
              }),
            ),
          ),
        );

        results.forEach((result) => {
          expect(referencesOf(result)).toEqual([
            expect.objectContaining({ doi: 'https://doi.org/10.1234/abcd', unstructuredCitation: '' }),
          ]);
          expect(result.issues.map(({ code }) => code)).toEqual(['onix.reference.unusable_identifier']);
        });
      });

      it('finds a DOI that is not the first identifier', async () => {
        // The Arc lesson applied to RelatedMaterial: ProductIdentifier is repeatable, and an
        // unrelated identifier listed first must not hide the DOI behind it.
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier>
              <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/abcd</IDValue></ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)[0].doi).toBe('https://doi.org/10.1234/abcd');
      });

      it('keeps an unstructured citation and leaves its DOI empty', async () => {
        // What Thoth exports for a reference that has no DOI: ProductIDType 01 narrowed by the
        // IDTypeName, which is the only thing separating a citation from a stock number.
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier>
                <ProductIDType>01</ProductIDType>
                <IDTypeName>Unstructured citation</IDTypeName>
                <IDValue>Hopkins, Lisa. 2019. A Companion to the Cavendishes.</IDValue>
              </ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)).toEqual([
          expect.objectContaining({
            doi: '',
            unstructuredCitation: 'Hopkins, Lisa. 2019. A Companion to the Cavendishes.',
          }),
        ]);
        // Never the resolver on its own.
        expect(referencesOf(result)[0].doi).not.toBe('https://doi.org/');
      });

      it('keeps both a DOI and a citation when the file supplies both', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier>
                <ProductIDType>01</ProductIDType><IDTypeName>Unstructured citation</IDTypeName>
                <IDValue>Hopkins, Lisa. 2019.</IDValue>
              </ProductIdentifier>
              <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/abcd</IDValue></ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)).toEqual([
          expect.objectContaining({
            doi: 'https://doi.org/10.1234/abcd',
            unstructuredCitation: 'Hopkins, Lisa. 2019.',
          }),
        ]);
      });

      it('tolerates case and whitespace in the citation IDTypeName', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier>
                <ProductIDType>01</ProductIDType>
                <IDTypeName>  unstructured CITATION  </IDTypeName>
                <IDValue>Hopkins, Lisa. 2019.</IDValue>
              </ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)).toEqual([
          expect.objectContaining({ doi: '', unstructuredCitation: 'Hopkins, Lisa. 2019.' }),
        ]);
      });

      it('does not read an arbitrary proprietary identifier as citation text', async () => {
        // ProductIDType 01 is a container for whatever the sender wants — a product code, an
        // internal SKU — and only the IDTypeName says which of those is a citation.
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier>
                <ProductIDType>01</ProductIDType>
                <IDTypeName>Publisher product code</IDTypeName>
                <IDValue>PROD-1234</IDValue>
              </ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)).toEqual([]);
        expect(result.issues.map(({ code }) => code)).toEqual(['onix.reference.unrepresentable_citation']);
      });

      it('does not read a nameless proprietary identifier as citation text', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier><ProductIDType>01</ProductIDType><IDValue>Some opaque value</IDValue></ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)).toEqual([]);
        expect(result.status).toBe('success');
        expect(result.issues.map(({ code }) => code)).toEqual(['onix.reference.unrepresentable_citation']);
      });

      it('keeps a DOI beside an unrelated proprietary identifier, with no citation text', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier>
                <ProductIDType>01</ProductIDType><IDTypeName>Distributor key</IDTypeName><IDValue>SKU-9</IDValue>
              </ProductIdentifier>
              <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/abcd</IDValue></ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)).toEqual([
          expect.objectContaining({ doi: 'https://doi.org/10.1234/abcd', unstructuredCitation: '' }),
        ]);
        expect(result.issues).toEqual([]);
      });

      it('never creates the resolver on its own as a DOI', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier>
                <ProductIDType>01</ProductIDType><IDTypeName>Unstructured citation</IDTypeName>
                <IDValue>Some citation text</IDValue>
              </ProductIdentifier>
            </RelatedProduct>
            <RelatedProduct>
              <ProductRelationCode>06</ProductRelationCode>
              <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result).map(({ doi }) => doi)).toEqual(['']);
        expect(referencesOf(result).map(({ doi }) => doi)).not.toContain(appConfig.validations.doiPrefix);
      });

      it('leaves non-citation product relations alone', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(
              ['01', '02', '03', '05', '06']
                .map(
                  (relation) => `<RelatedProduct>
                    <ProductRelationCode>${relation}</ProductRelationCode>
                    <ProductIdentifier>
                      <ProductIDType>06</ProductIDType><IDValue>10.1234/other-${relation}</IDValue>
                    </ProductIdentifier>
                  </RelatedProduct>`,
                )
                .join(''),
            ),
          }),
        );

        expect(referencesOf(result)).toEqual([]);
      });

      it('leaves a related work alone, whatever its relation', async () => {
        // ONIX List 164 has no citation relation, so a RelatedWork is never a reference. These
        // two are the translation relations Thoth's own exporter writes.
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedWork>
                <WorkRelationCode>29</WorkRelationCode>
                <WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/original</IDValue></WorkIdentifier>
              </RelatedWork>
              <RelatedWork>
                <WorkRelationCode>49</WorkRelationCode>
                <WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/translation</IDValue></WorkIdentifier>
              </RelatedWork>`),
          }),
        );

        expect(result.issues).toEqual([]);
        expect(referencesOf(result)).toEqual([]);
      });

      it('reports a citation it cannot represent instead of storing an empty one', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result)).toEqual([]);
        // A warning, not an error: the work is still perfectly importable.
        expect(result.status).toBe('success');
        expect(result.issues).toEqual([
          {
            severity: 'warning',
            code: 'onix.reference.unrepresentable_citation',
            message:
              'A cited work in product 1 (9781641891783) carries no citation metadata Thoth can represent, so the reference was skipped',
            source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
          },
        ]);
      });

      it('numbers surviving references consecutively', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
                <ProductRelationCode>06</ProductRelationCode>
                <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier>
              </RelatedProduct>
              <RelatedProduct>
                <ProductRelationCode>34</ProductRelationCode>
                <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/first</IDValue></ProductIdentifier>
              </RelatedProduct>
              <RelatedProduct>
                <ProductRelationCode>34</ProductRelationCode>
                <ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/second</IDValue></ProductIdentifier>
              </RelatedProduct>`),
          }),
        );

        expect(referencesOf(result).map(({ doi, orderNumber }) => [doi, orderNumber])).toEqual([
          ['https://doi.org/10.1234/first', 1],
          ['https://doi.org/10.1234/second', 2],
        ]);
      });
    });

    describe('a record shaped like Thoth’s own ONIX output', () => {
      /**
       * Everything Thoth's ONIX 3 exporter writes for the fields this PR touches, in the shapes
       * it writes them: the canonical title tagged with the language its locale converts to, a
       * non-canonical title as TitleType 06, the issue ordinal as CollectionSequenceType 03, the
       * other ISBN of the same book as relation 06, and a reference as relation 34 carrying the
       * bare DOI — `Doi`'s Display strips the resolver, so Thoth's own ONIX never contains one.
       *
       * The claim is semantic round-tripping, not byte-identical ONIX: what Thoth exported comes
       * back as the same Thoth metadata, minus what ONIX itself cannot carry.
       */
      const THOTH_SHAPED_XML = productXml({
        titleDetails: `<TitleDetail><TitleType>01</TitleType><TitleElement>
            <TitleElementLevel>01</TitleElementLevel>
            <TitleText language="fre">L’Étranger</TitleText>
            <Subtitle language="fre">Un roman</Subtitle>
          </TitleElement></TitleDetail>
          <TitleDetail><TitleType>06</TitleType><TitleElement>
            <TitleElementLevel>01</TitleElementLevel>
            <TitleText language="eng">The Stranger</TitleText>
          </TitleElement></TitleDetail>`,
        languages: '<Language><LanguageRole>01</LanguageRole><LanguageCode>fre</LanguageCode></Language>',
        collection: `<Collection>
          <CollectionType>10</CollectionType>
          <CollectionIdentifier>
            <CollectionIDType>01</CollectionIDType><IDTypeName>Series ID</IDTypeName>
            <IDValue>${FIDELITY_SERIES_ID}</IDValue>
          </CollectionIdentifier>
          <CollectionIdentifier><CollectionIDType>02</CollectionIDType><IDValue>26343643</IDValue></CollectionIdentifier>
          <CollectionSequence>
            <CollectionSequenceType>03</CollectionSequenceType>
            <CollectionSequenceNumber>11</CollectionSequenceNumber>
          </CollectionSequence>
          <TitleDetail><TitleType>01</TitleType><TitleElement>
            <TitleElementLevel>02</TitleElementLevel><TitleText>Arc Companions</TitleText>
          </TitleElement></TitleDetail>
        </Collection>`,
        collateralDetail: `<CollateralDetail>
          <TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience>
            <Text textformat="03">Une description brève.</Text>
          </TextContent>
          <TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience>
            <Text textformat="03">Une description longue.</Text>
          </TextContent>
        </CollateralDetail>`,
        relatedMaterial: `<RelatedMaterial>
          <RelatedProduct>
            <ProductRelationCode>06</ProductRelationCode>
            <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier>
            <ProductIdentifier><ProductIDType>03</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier>
          </RelatedProduct>
          <RelatedProduct>
            <ProductRelationCode>34</ProductRelationCode>
            <ProductIdentifier>
              <ProductIDType>06</ProductIDType><IDValue>10.1234/cited</IDValue>
            </ProductIdentifier>
          </RelatedProduct>
        </RelatedMaterial>`,
      });

      it('comes back as the metadata Thoth started with', async () => {
        const result = await runFidelityParser(THOTH_SHAPED_XML, [fidelitySeries('Arc Companions')]);

        expect(errorMessages(result)).toEqual([]);
        expect(result.issues).toEqual([]);

        const [work] = result.data.plan.works;

        // Canonical stays canonical, the other title stays non-canonical, and each keeps the
        // locale ONIX could carry. `fre` cannot say whether Thoth held Fr or FrCa: the region is
        // the one thing ONIX genuinely loses.
        expect(
          work.titles.map(({ title, subtitle, canonical, localeCode }) => [title, subtitle, canonical, localeCode]),
        ).toEqual([
          ['L’Étranger', 'Un roman', true, LanguageTypeAlt.enum.Fr],
          ['The Stranger', '', false, LanguageTypeAlt.enum.En],
        ]);

        // Thoth writes `textformat` but no `language` on abstract text, so the abstracts come
        // back through the product's language of text.
        expect(work.abstracts.map(({ type, localeCode }) => [type, localeCode])).toEqual([
          [AbstractTypes.enum.Long, LanguageTypeAlt.enum.Fr],
          [AbstractTypes.enum.Short, LanguageTypeAlt.enum.Fr],
        ]);

        // The publication-order sequence is the issue ordinal.
        expect((result.data.plan.series as SeriesImportPlan)[0].members[0].orderNumber).toBe(11);

        // The other format of the same book is not a citation; the cited work is.
        expect(work.references.map(({ doi, unstructuredCitation }) => [doi, unstructuredCitation])).toEqual([
          ['https://doi.org/10.1234/cited', ''],
        ]);
      });
    });
  });
});

/**
 * Issue #135, ONIX side. CSV and ONIX go through the same shared lookup, so the identity rule
 * has to read identically from both: an exact ORCID resolves an existing contributor whatever
 * the name says, and a repeated previously unseen ORCID stays one identity for execution —
 * including between a product and its chapters, which are created concurrently.
 */
describe('ONIX contributor identity by ORCID (issue #135)', () => {
  const ORCID = '0000-0001-6365-5189';
  const CANONICAL_ORCID = `https://orcid.org/${ORCID}`;
  const OTHER_ORCID = '0000-0002-1825-0097';
  const OTHER_CANONICAL_ORCID = `https://orcid.org/${OTHER_ORCID}`;

  let mockContributorService: ContributorService;
  let mockInstitutionService: InstitutionService;
  let imprints: Array<{ label: string; value: string }>;
  let languages: Array<{ label: string; value: string }>;

  const stored = (overrides: Partial<ContributorEntity> = {}): ContributorEntity => ({
    id: 'existing-contributor',
    name: 'J. A. Doe-Smith',
    fullName: 'J. A. Doe-Smith',
    firstName: 'J. A.',
    lastName: 'Doe-Smith',
    orcid: CANONICAL_ORCID,
    website: 'https://stored.example',
    updatedAt: '',
    lastContributionTitle: 'An Earlier Book',
    ...overrides,
  });

  /** Answers a name search and an ORCID search differently, as the backend filter would. */
  const byFilter = (results: Record<string, ContributorEntity[]>) =>
    vi.fn((filter: string) => Promise.resolve(results[filter] ?? []));

  /**
   * One NameIdentifier composite, with its scheme declared as ONIX requires. Real files always
   * carry a NameIDType; a helper that omitted it would test a shape ONIX does not define.
   */
  const identifier = (nameIdType: OnixText, idValue: string) => ({
    NameIDType: nameIdType,
    IDValue: idValue,
  });

  const orcidIdentifier = (value: string) => identifier(NameIdentifierType._21, value);
  const proprietaryIdentifier = (value: string) => identifier(NameIdentifierType._01, value);

  /**
   * `identifiers` is passed through exactly as given: a single composite stays a bare object and
   * several stay an array, which is precisely what fast-xml-parser emits for a repeatable
   * element. Flattening it here would hide the repeat this parser has to handle.
   */
  const onixContributor = (
    fullName: string,
    identifiers?: OnixRepeatable<ReturnType<typeof identifier>>,
    role = 'A01',
  ) => ({
    ContributorRole: role,
    PersonName: fullName,
    KeyNames: fullName.split(' ').slice(-1)[0],
    NamesBeforeKey: fullName.split(' ')[0],
    NameIdentifier: identifiers,
  });

  const product = (
    title: string,
    contributors: ReturnType<typeof onixContributor>[],
    chapters?: { title: string; contributors: ReturnType<typeof onixContributor>[] }[],
  ): ExtendedProduct =>
    ({
      DescriptiveDetail: {
        ProductForm: ProductForm._BC,
        TitleDetail: { TitleElement: { TitleText: title } },
        Language: { LanguageCode: languages[0].value },
        Contributor: contributors,
      } as ExtendedDescriptiveDetail,
      PublishingDetail: {
        Imprint: { ImprintName: imprints[0].label },
        PublishingStatus: '04',
      } as ExtendedPublishingDetail,
      ContentDetail: chapters
        ? {
            ContentItem: chapters.map((chapter, index) => ({
              LevelSequenceNumber: `${index + 1}`,
              TitleDetail: { TitleElement: { TitleText: chapter.title } },
              Contributor: chapter.contributors,
            })) as unknown as ExtendedCollection[],
          }
        : undefined,
    }) as ExtendedProduct;

  const parseProducts = (products: ExtendedProduct[]) =>
    new XMLParser(
      { ONIXMessage: { Product: products } },
      imprints,
      licenseOptions,
      [],
      mockContributorService,
      mockInstitutionService,
      languages,
      currencyOptions,
    ).parse();

  beforeEach(() => {
    mockContributorService = {
      getContributors: vi.fn().mockResolvedValue([]),
      getContributorsByOrcids: vi.fn().mockResolvedValue([]),
    } as unknown as ContributorService;
    mockInstitutionService = { getInstitutions: vi.fn().mockResolvedValue([]) } as unknown as InstitutionService;
    imprints = [{ label: faker.company.name(), value: faker.string.uuid() }];
    languages = languageOptions;
  });

  it('prefetches hundreds of distinct ONIX ORCIDs in one batch before product fanout', async () => {
    const canonicalOrcid = (index: number) =>
      `https://orcid.org/0000-0002-0000-${index.toString().padStart(4, '0')}`;
    const contributors = Array.from({ length: 200 }, (_, index) =>
      onixContributor(`Author ${index}`, orcidIdentifier(canonicalOrcid(index))),
    );
    const getContributors = vi.fn().mockResolvedValue([]);
    const getContributorsByOrcids = vi.fn().mockResolvedValue([]);
    mockContributorService.getContributors = getContributors;
    mockContributorService.getContributorsByOrcids = getContributorsByOrcids;

    const result = await parseProducts([product('A book', contributors)]);

    expect(result.status).toBe('success');
    expect(getContributorsByOrcids).toHaveBeenCalledTimes(1);
    expect(getContributorsByOrcids).toHaveBeenCalledWith(
      Array.from({ length: 200 }, (_, index) => canonicalOrcid(index)),
    );
    expect(getContributors).toHaveBeenCalledTimes(200);
  });

  it('prefetches work and chapter ORCIDs but excludes identifiers whose NameIDType is not 21', async () => {
    const getContributorsByOrcids = vi.fn().mockResolvedValue([]);
    mockContributorService.getContributorsByOrcids = getContributorsByOrcids;

    const result = await parseProducts([
      product(
        'A book',
        [
          onixContributor('Work Author', orcidIdentifier(ORCID)),
          onixContributor('Proprietary Author', proprietaryIdentifier('0000-0003-1111-2222')),
        ],
        [{ title: 'A chapter', contributors: [onixContributor('Chapter Author', orcidIdentifier(OTHER_ORCID))] }],
      ),
    ]);

    expect(result.status).toBe('success');
    expect(getContributorsByOrcids).toHaveBeenCalledTimes(1);
    expect(getContributorsByOrcids).toHaveBeenCalledWith([CANONICAL_ORCID, OTHER_CANONICAL_ORCID]);
  });

  it('uses an exact batch hit without issuing the redundant ONIX name lookup', async () => {
    const getContributors = vi.fn().mockResolvedValue([stored({ id: 'name-only-candidate', orcid: '' })]);
    mockContributorService.getContributors = getContributors;
    mockContributorService.getContributorsByOrcids = vi.fn().mockResolvedValue([stored({ id: 'orcid-holder' })]);

    const result = await parseProducts([product('A book', [onixContributor('Jane Doe', orcidIdentifier(ORCID))])]);

    expect(result.data.plan.works[0].contributions[0].contributorId).toBe('orcid-holder');
    expect(mockContributorService.getContributorsByOrcids).toHaveBeenCalledWith([CANONICAL_ORCID]);
    expect(getContributors).not.toHaveBeenCalled();
  });

  it('fails the parse when the ONIX ORCID batch request rejects', async () => {
    mockContributorService.getContributorsByOrcids = vi.fn().mockRejectedValue(new Error('502 Bad Gateway'));

    const result = await parseProducts([product('A book', [onixContributor('Jane Doe', orcidIdentifier(ORCID))])]);

    expect(result.status).toBe('failed');
    expect(result.data.plan.works).toEqual([]);
  });

  it('resolves an existing ORCID even when the ONIX PersonName would never have found it', async () => {
    mockContributorService.getContributorsByOrcids = vi.fn().mockResolvedValue([stored()]);

    const result = await parseProducts([product('A book', [onixContributor('Jane Doe', orcidIdentifier(ORCID))])]);

    expect(result.status).toBe('success');

    const [contribution] = result.data.plan.works[0].contributions;

    expect(contribution.contributorId).toBe('existing-contributor');
    expect(contribution.fullName).toBe('J. A. Doe-Smith');
    // The stored identity fields, all of them: the reuse consumes firstName and website off the
    // looked-up contributor, and GET_CONTRIBUTORS omitting them once turned both into '' on the
    // real query -> mapper path (issue #144). The ONIX name parts must not leak in either.
    expect(contribution.firstName).toBe('J. A.');
    expect(contribution.lastName).toBe('Doe-Smith');
    expect(contribution.website).toBe('https://stored.example');
    expect(contribution.orcidId).toBe(CANONICAL_ORCID);

    const options = Object.values(result.data.contributorsForSelection[result.data.plan.works[0].id])[0];

    // Nothing left for the user to resolve, and no create intent the ORCID index would reject.
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ selected: true, contributorId: 'existing-contributor' });
  });

  it('keeps the ONIX role, ordinal, biography and affiliation while sharing the resolved identity', async () => {
    const ror = 'https://ror.org/03vek6s52';

    mockContributorService.getContributorsByOrcids = vi.fn().mockResolvedValue([stored()]);
    mockInstitutionService.getInstitutions = vi
      .fn()
      .mockResolvedValue([{ id: 'institution', name: 'Harvard University', ror }]);

    const result = await parseProducts([
      product('A book', [
        onixContributor('Someone Else', undefined, 'A01'),
        {
          ...onixContributor('Jane Doe', orcidIdentifier(ORCID), 'B01'),
          BiographicalNote: 'Writes about arcs.',
          ProfessionalAffiliation: {
            ProfessionalPosition: 'Professor',
            AffiliationIdentifier: { IDValue: ror },
          },
        },
      ]),
    ]);

    const [, resolved] = result.data.plan.works[0].contributions;

    // Who the contribution points at is Thoth's stored identity; everything the file said about
    // the contribution itself stays the file's.
    expect(resolved).toMatchObject({ contributorId: 'existing-contributor', type: 'EDITOR', orderNumber: 2 });
    expect(resolved.firstName).toBe('J. A.');
    expect(resolved.biographies.map(({ content }) => content)).toEqual(['Writes about arcs.']);
    expect(resolved.affiliations[0]).toMatchObject({
      institutionId: 'institution',
      institutionName: 'Harvard University',
      rorId: ror,
      position: 'Professor',
    });
  });

  it('rejects a substring ORCID candidate rather than treating it as identity', async () => {
    mockContributorService.getContributorsByOrcids = vi
      .fn()
      .mockResolvedValue([stored({ id: 'substring-holder', orcid: `${CANONICAL_ORCID}0` })]);

    const result = await parseProducts([product('A book', [onixContributor('Jane Doe', orcidIdentifier(ORCID))])]);

    expect(result.data.plan.works[0].contributions[0].contributorId).toBe(appConfig.defaultId);
  });

  it('plans one shared identity for a repeated previously unseen ORCID across products', async () => {
    const getContributors = vi.fn().mockResolvedValue([]);
    const getContributorsByOrcids = vi.fn().mockResolvedValue([]);
    mockContributorService.getContributors = getContributors;
    mockContributorService.getContributorsByOrcids = getContributorsByOrcids;

    const result = await parseProducts([
      product('First book', [onixContributor('Jane Doe', orcidIdentifier(ORCID))]),
      product('Second book', [onixContributor('J. Doe', orcidIdentifier(CANONICAL_ORCID))]),
    ]);

    expect(result.status).toBe('success');
    expect(result.data.plan.works.map((work) => work.contributions[0].contributorId)).toEqual([
      appConfig.defaultId,
      appConfig.defaultId,
    ]);
    // Both occurrences carry the one ORCID the execution registry keys on, and the identity
    // lookup itself was seeded once for the whole parse.
    expect(getContributorsByOrcids).toHaveBeenCalledOnce();
    expect(getContributorsByOrcids).toHaveBeenCalledWith([CANONICAL_ORCID]);
  });

  it('plans one shared identity for an ORCID repeated between a product and its chapters', async () => {
    const getContributors = vi.fn().mockResolvedValue([]);
    const getContributorsByOrcids = vi.fn().mockResolvedValue([]);
    mockContributorService.getContributors = getContributors;
    mockContributorService.getContributorsByOrcids = getContributorsByOrcids;

    const result = await parseProducts([
      product('A book', [onixContributor('Jane Doe', orcidIdentifier(ORCID))], [
        { title: 'Chapter one', contributors: [onixContributor('Jane Doe', orcidIdentifier(ORCID))] },
        { title: 'Chapter two', contributors: [onixContributor('J. Doe', orcidIdentifier(CANONICAL_ORCID))] },
      ]),
    ]);

    expect(result.status).toBe('success');
    expect(result.data.plan.chapters).toHaveLength(2);

    const everyContribution = [...result.data.plan.works, ...result.data.plan.chapters].flatMap(
      (work) => work.contributions,
    );

    expect(everyContribution).toHaveLength(3);
    // Chapters are created concurrently with each other and inside one top-level work, which is
    // exactly why execution keys on the ORCID rather than on completion order.
    expect(everyContribution.every(({ contributorId }) => contributorId === appConfig.defaultId)).toBe(true);
    expect(getContributorsByOrcids).toHaveBeenCalledOnce();
    expect(getContributorsByOrcids).toHaveBeenCalledWith([CANONICAL_ORCID]);
  });

  it('resolves the same existing ORCID for a chapter contributor as for the product', async () => {
    mockContributorService.getContributorsByOrcids = vi.fn().mockResolvedValue([stored()]);

    const result = await parseProducts([
      product('A book', [onixContributor('Jane Doe', orcidIdentifier(ORCID))], [
        { title: 'Chapter one', contributors: [onixContributor('Someone Different', orcidIdentifier(ORCID))] },
      ]),
    ]);

    expect(result.data.plan.works[0].contributions[0].contributorId).toBe('existing-contributor');
    expect(result.data.plan.chapters[0].contributions[0].contributorId).toBe('existing-contributor');
  });

  it('leaves name-only behaviour untouched where the file supplies no ORCID', async () => {
    const getContributors = byFilter({ 'Jane Doe': [stored({ id: 'name-candidate', orcid: '' })] });
    mockContributorService.getContributors = getContributors;

    const result = await parseProducts([product('A book', [onixContributor('Jane Doe')])]);

    const options = Object.values(result.data.contributorsForSelection[result.data.plan.works[0].id])[0];

    expect(options).toHaveLength(2);
    expect(options.map(({ selected }) => selected)).toEqual([true, false]);
    expect(options[0].contributorId).toBe(appConfig.defaultId);
    expect(options[1].contributorId).toBe('name-candidate');
    // Only the name search ran: a missing identifier is not an identity question to ask.
    expect(getContributors.mock.calls.map(([filter]) => filter)).toEqual(['Jane Doe']);
  });

  /**
   * ONIX NameIdentifier is a repeatable composite whose NameIDType (List 44) declares the
   * scheme, and `21` is ORCID. Reading `IDValue` off the first composite and judging it by shape
   * gets all three of those wrong: it misses an ORCID sitting behind another identifier, it
   * mistakes an ORCID-shaped proprietary key for an ORCID, and it never converts ONIX's normal
   * hyphenless encoding into the form Thoth stores.
   */
  describe('NameIdentifier scheme and representation', () => {
    const HYPHENLESS_ORCID = '0000000163655189';

    it('finds the ORCID behind another identifier scheme', async () => {
      mockContributorService.getContributorsByOrcids = vi.fn().mockResolvedValue([stored()]);

      const result = await parseProducts([
        product('A book', [
          onixContributor('Jane Doe', [proprietaryIdentifier('PUB-AUTHOR-99'), orcidIdentifier(ORCID)]),
        ]),
      ]);

      // The ORCID is not the first composite, and a first-identifier read would never see it —
      // leaving the #135 duplicate-creation failure fully reachable through ONIX.
      expect(result.data.plan.works[0].contributions[0].contributorId).toBe('existing-contributor');
    });

    it('reads NameIDType through the ONIX text helper when it carries attributes', async () => {
      mockContributorService.getContributorsByOrcids = vi.fn().mockResolvedValue([stored()]);

      const result = await parseProducts([
        product('A book', [onixContributor('Jane Doe', identifier({ '#text': '21' }, ORCID))]),
      ]);

      expect(result.data.plan.works[0].contributions[0].contributorId).toBe('existing-contributor');
    });

    it('never treats a declared non-ORCID identifier as ORCID identity, however it is shaped', async () => {
      // A proprietary key that happens to be a syntactically valid ORCID. Its NameIDType says it
      // is not one, and the declaration wins over the shape.
      const getContributors = byFilter({
        'Jane Doe': [stored({ id: 'name-candidate', orcid: '' })],
        [ORCID]: [stored({ id: 'orcid-holder' })],
      });
      mockContributorService.getContributors = getContributors;

      const result = await parseProducts([
        product('A book', [onixContributor('Jane Doe', proprietaryIdentifier(ORCID))]),
      ]);

      const [contribution] = result.data.plan.works[0].contributions;

      // Name-based behaviour stays authoritative, and nothing carries the misread identifier
      // forward as an ORCID — least of all into contributor creation.
      expect(contribution.contributorId).toBe(appConfig.defaultId);
      expect(contribution.orcidId).toBe('');
      expect(getContributors.mock.calls.map(([filter]) => filter)).toEqual(['Jane Doe']);

      const options = Object.values(result.data.contributorsForSelection[result.data.plan.works[0].id])[0];

      expect(options.map(({ contributorId }) => contributorId)).toEqual([appConfig.defaultId, 'name-candidate']);
    });

    it('converts a hyphenless ONIX ORCID into the form Thoth stores', async () => {
      const getContributorsByOrcids = vi.fn().mockResolvedValue([stored()]);
      mockContributorService.getContributorsByOrcids = getContributorsByOrcids;

      const result = await parseProducts([
        product('A book', [onixContributor('Jane Doe', orcidIdentifier(HYPHENLESS_ORCID))]),
      ]);

      // `0000000163655189` is the normal ONIX encoding of `0000-0001-6365-5189`, and only the
      // latter is what Thoth stores, what the exact lookup can match, and what the API accepts.
      expect(getContributorsByOrcids).toHaveBeenCalledWith([CANONICAL_ORCID]);
      expect(result.data.plan.works[0].contributions[0].contributorId).toBe('existing-contributor');
    });

    it('plans the Thoth-form ORCID for a new contributor sent hyphenless', async () => {
      mockContributorService.getContributors = vi.fn().mockResolvedValue([]);

      const result = await parseProducts([
        product('A book', [onixContributor('Jane Doe', orcidIdentifier(HYPHENLESS_ORCID))]),
      ]);

      const [contribution] = result.data.plan.works[0].contributions;

      // What execution will send to createContributor, so it may not be the ONIX encoding.
      expect(contribution.contributorId).toBe(appConfig.defaultId);
      expect(contribution.orcidId).toBe(ORCID);
    });

    it('keeps a repeated hyphenless ORCID one identity across products and chapters', async () => {
      const getContributors = vi.fn().mockResolvedValue([]);
      const getContributorsByOrcids = vi.fn().mockResolvedValue([]);
      mockContributorService.getContributors = getContributors;
      mockContributorService.getContributorsByOrcids = getContributorsByOrcids;

      const result = await parseProducts([
        product('First book', [onixContributor('Jane Doe', orcidIdentifier(HYPHENLESS_ORCID))], [
          { title: 'Chapter one', contributors: [onixContributor('J. Doe', orcidIdentifier(ORCID))] },
        ]),
        product('Second book', [onixContributor('Jane Doe', orcidIdentifier(HYPHENLESS_ORCID))]),
      ]);

      const everyContribution = [...result.data.plan.works, ...result.data.plan.chapters].flatMap(
        (work) => work.contributions,
      );

      expect(everyContribution).toHaveLength(3);
      // One normalized ORCID across all three occurrences is what lets the execution registry
      // key them together and create the contributor exactly once.
      expect(new Set(everyContribution.map(({ orcidId }) => orcidId))).toEqual(new Set([ORCID]));
      expect(getContributorsByOrcids).toHaveBeenCalledOnce();
      expect(getContributorsByOrcids).toHaveBeenCalledWith([CANONICAL_ORCID]);
    });

    it('still accepts a NameIDType 21 identifier already written with hyphens', async () => {
      // The form `public/templates/template.xml` itself demonstrates, so files written against
      // the repository's own template keep working exactly as before.
      mockContributorService.getContributorsByOrcids = vi.fn().mockResolvedValue([stored()]);

      const result = await parseProducts([
        product('A book', [onixContributor('Jane Doe', orcidIdentifier(ORCID))]),
      ]);

      expect(result.data.plan.works[0].contributions[0].contributorId).toBe('existing-contributor');
    });

    it('leaves a contributor with no identifier at all untouched', async () => {
      mockContributorService.getContributors = vi.fn().mockResolvedValue([]);

      const result = await parseProducts([product('A book', [onixContributor('Jane Doe')])]);

      expect(result.data.plan.works[0].contributions[0].orcidId).toBe('');
    });

    /**
     * The same rules, but read off real XML rather than a hand-built composite.
     *
     * Every case above constructs the parsed shape directly, which asserts what the adapter does
     * with a value it is handed and says nothing about the value it is actually handed. An
     * uploaded file reaches the adapter only after `@5stones/onix` has parsed it, and that
     * library configures `fast-xml-parser` itself: whether `<IDValue>0000000163655189</IDValue>`
     * survives as those sixteen characters, or arrives as something a tag-value conversion has
     * already rewritten, is decided there and nowhere the adapter can see. This is the raw parsing
     * boundary `XMLParse.tsx` crosses in the browser, so it is the boundary the ORCID contract has
     * to hold across.
     */
    describe('through the real @5stones/onix parser', () => {
      /** One product carrying one contributor, as an uploaded file would actually write it. */
      const contributorProductXml = (nameIdType: string, idValue: string) => `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>9781641891783</RecordReference>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      <TitleDetail>
        <TitleType>01</TitleType>
        <TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>A book</TitleText></TitleElement>
      </TitleDetail>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>${languages[0].value.toLowerCase()}</LanguageCode></Language>
      <Contributor>
        <SequenceNumber>1</SequenceNumber>
        <ContributorRole>A01</ContributorRole>
        <PersonName>Jane Doe</PersonName>
        <KeyNames>Doe</KeyNames>
        <NamesBeforeKey>Jane</NamesBeforeKey>
        <NameIdentifier>
          <NameIDType>${nameIdType}</NameIDType>
          <IDValue>${idValue}</IDValue>
        </NameIdentifier>
      </Contributor>
    </DescriptiveDetail>
    <PublishingDetail>
      <Imprint><ImprintName>${imprints[0].label}</ImprintName></Imprint>
      <PublishingStatus>04</PublishingStatus>
    </PublishingDetail>
  </Product>
</ONIXMessage>`;

      const parseRealXml = async (xml: string) =>
        new XMLParser(
          (await parse(xml)) as ExtendedONIXMessageRoot,
          imprints,
          licenseOptions,
          [],
          mockContributorService,
          mockInstitutionService,
          languages,
          currencyOptions,
        ).parse();

      it('plans the Thoth-form ORCID for a hyphenless NameIDType 21 identifier in real XML', async () => {
        mockContributorService.getContributors = vi.fn().mockResolvedValue([]);

        const result = await parseRealXml(contributorProductXml('21', HYPHENLESS_ORCID));

        expect(result.status).toBe('success');
        // The sixteen characters the file wrote, hyphenated — not what a numeric reading of them
        // would leave behind, and not the ONIX encoding itself.
        expect(result.data.plan.works[0].contributions[0].orcidId).toBe(ORCID);
      });

      it('resolves an existing contributor from a hyphenless ORCID in real XML', async () => {
        const getContributorsByOrcids = vi.fn().mockResolvedValue([stored()]);
        mockContributorService.getContributorsByOrcids = getContributorsByOrcids;

        const result = await parseRealXml(contributorProductXml('21', HYPHENLESS_ORCID));

        expect(result.data.plan.works[0].contributions[0].contributorId).toBe('existing-contributor');
        // The identity lookup is made on the canonical form, which is the only form that can
        // match what Thoth stored.
        expect(getContributorsByOrcids).toHaveBeenCalledWith([CANONICAL_ORCID]);
      });

      it('leaves an already-hyphenated ORCID in real XML unchanged', async () => {
        mockContributorService.getContributors = vi.fn().mockResolvedValue([]);

        const result = await parseRealXml(contributorProductXml('21', ORCID));

        expect(result.data.plan.works[0].contributions[0].orcidId).toBe(ORCID);
      });

      it('canonicalises a real-XML terminal lower-case check character to upper case', async () => {
        mockContributorService.getContributors = vi.fn().mockResolvedValue([]);

        const result = await parseRealXml(contributorProductXml('21', '000000015109376x'));

        expect(result.data.plan.works[0].contributions[0].orcidId).toBe('0000-0001-5109-376X');
      });

      it('keeps an ORCID-shaped value under another scheme non-ORCID in real XML', async () => {
        const getContributors = byFilter({ [ORCID]: [stored({ id: 'orcid-holder' })] });
        mockContributorService.getContributors = getContributors;

        const result = await parseRealXml(contributorProductXml('01', HYPHENLESS_ORCID));

        // NameIDType 01 is a proprietary key. The declaration decides the scheme, so nothing here
        // is an ORCID however ORCID-shaped it looks.
        expect(result.data.plan.works[0].contributions[0].orcidId).toBe('');
        expect(result.data.plan.works[0].contributions[0].contributorId).toBe(appConfig.defaultId);
        expect(getContributors.mock.calls.map(([filter]) => filter)).toEqual(['Jane Doe']);
      });

      it('never manufactures an ORCID from a short numeric NameIDType 21 value', async () => {
        const getContributors = vi.fn().mockResolvedValue([]);
        mockContributorService.getContributors = getContributors;

        const result = await parseRealXml(contributorProductXml('21', '123'));

        // `123` is malformed, not an ORCID missing its leading zeros. Left-padding it to sixteen
        // characters would invent `0000-0000-0000-0123`, a plausible identifier for a real
        // person who is not this one, so the value stays exactly as the file wrote it and the
        // shared ORCID validation is left to reject it.
        expect(result.data.plan.works[0].contributions[0].orcidId).toBe('123');
        expect(getContributors.mock.calls.map(([filter]) => filter)).toEqual(['Jane Doe']);
      });
    });
  });

  it('makes no identity decision from a proprietary NameIdentifier', async () => {
    // ONIX NameIdentifier carries whatever scheme the file used; only an actual ORCID decides.
    const getContributors = vi.fn().mockResolvedValue([]);
    mockContributorService.getContributors = getContributors;

    const result = await parseProducts([product('A book', [onixContributor('Jane Doe', proprietaryIdentifier('PROPRIETARY-1234'))])]);

    expect(result.data.plan.works[0].contributions[0].contributorId).toBe(appConfig.defaultId);
    expect(getContributors.mock.calls.map(([filter]) => filter)).toEqual(['Jane Doe']);
  });
});
