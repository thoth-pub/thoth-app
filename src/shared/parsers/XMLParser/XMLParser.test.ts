/* eslint-disable simple-import-sort/imports */
import { parse } from '@5stones/onix';
import {
  LanguageRole,
  MeasureType,
  MeasureUnit,
  NameIdentifierType,
  ProductForm,
  ProductIdentifierType,
  TextType,
  WorkRelation,
} from '@5stones/onix/dist/enums';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContributorService } from '@/src/entities/contributor';
import type { ContributorEntity } from '@/src/entities/contributor/model/contributor.types';
import { InstitutionService } from '@/src/entities/institution';
import { SeriesEntity } from '@/src/entities/series/model/series.types';

import {
  MarkupFormat,
} from '@/gql/graphql';
import { appConfig } from '../../config';
import {
  LanguageTypeAlt,
  LocationPlatforms,
  PublicationType,
  currencyOptions,
  languageOptions,
  licenseOptions,
} from '../../constants';
import { AbstractTypes } from '../../constants/abstracts';
import { SeriesType } from '../../constants/series';
import { collectWorkIdentifiers } from '../../utils/importPreflight/identifiers';
import {
  ExtendedCollection,
  ExtendedDescriptiveDetail,
  ExtendedONIXMessageRoot,
  ExtendedProduct,
  ExtendedProductSupply,
  ExtendedPublishingDetail,
  OnixRepeatable,
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
  NotificationType: '03',
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

    it('should successfully parse valid XML with a single product, reading no Work identifier from its Product identifiers', async () => {
      const doi = '10.12345/test';
      const lccn = '2017123456';
      const oclc = '1086123456';
      const isbn = '9781234567890';
      const title = faker.lorem.sentence();
      const subtitle = faker.lorem.sentence();
      const language = languages[0];
      const edition = faker.number.int({ min: 1, max: 10 });
      const imprint = imprints[0];

      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
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
                EditionNumber: edition.toString(),
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
      // The title, like every descriptive family, is the canonical reductions' to decide, never the candidate's.
      expect(work.titles).toEqual([]);
      expect(title.length + subtitle.length).toBeGreaterThan(0);
      // A Product DOI, LCCN and OCLC number identify the Product: none of them becomes the Work's.
      expect(work.doi).toBe('');
      expect(work.lccn).toBe('');
      expect(work.oclc).toBe('');
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
      const manifestationOf = (doi: string) => ({
        RelatedWork: { WorkRelationCode: WorkRelation._01, WorkIdentifier: { WorkIDType: '06', IDValue: doi } },
      });
      const product1 = {
        NotificationType: '03',
        RelatedMaterial: manifestationOf(doi1),
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
        NotificationType: '03',
        RelatedMaterial: manifestationOf(doi2),
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
      expect(result.data.plan.works[0].doi).toContain(doi1);
      expect(result.data.plan.works[1].doi).toContain(doi2);
      // One adapted group per Work, each carrying what its descriptive lookups established.
      expect(result.data.onix?.groups.map(({ workId }) => workId)).toEqual(result.data.plan.works.map(({ id }) => id));
      expect([title1, title2, language1.value, language2.value].every((value) => value.length > 0)).toBe(true);
    });

    it('should fail when imprint is not found', async () => {
      const language = languages[0];
      const imprint = faker.company.name();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
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
  });

  describe('specific fields', () => {
    it('should parse a Work DOI, stated as a WorkIdentifier, with prefix', async () => {
      const prefix = appConfig.validations.doiPrefix;
      const doi = '10.12345/123';
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
              RelatedMaterial: {
                RelatedWork: { WorkRelationCode: WorkRelation._01, WorkIdentifier: { WorkIDType: '06', IDValue: doi } },
              },
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
              NotificationType: '03',
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

    it('should never read a Product LCCN (ProductIDType 13) as the Work LCCN', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const lccn = '2017123456';
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
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
      expect(result.data.plan.works[0].lccn).toEqual('');
      expect(result.data.plan.works[0].lccn).not.toEqual(lccn);
    });

    it('should never read a Product OCLC number (ProductIDType 23) as the Work OCLC number', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const oclc = '1086123456';
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
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
      expect(result.data.plan.works[0].oclc).toEqual('');
      expect(result.data.plan.works[0].oclc).not.toEqual(oclc);
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
              NotificationType: '03',
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
              NotificationType: '03',
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
              NotificationType: '03',
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
              NotificationType: '03',
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

    const parseProductLicense = (enteredLicense: string) => {
      const language = languages[0];
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: faker.lorem.sentence() } },
                Language: { LanguageCode: language.value },
                EpubLicense: {
                  EpubLicenseName: 'A licence',
                  EpubLicenseExpression: { EpubLicenseExpressionType: '01', EpubLicenseExpressionLink: enteredLicense },
                },
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

    // A Work's licence is decided for the grouped Work by the canonical rights reduction (thoth-app#211), never
    // Product by Product here: the adapter's own licence reading, and its "not found" error, are gone.
    it.each([
      ['a supported canonical licence', 'https://creativecommons.org/licenses/by/4.0/'],
      ['a supported legalcode representation', 'https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode'],
      ['a licence Thoth cannot hold', 'https://publisher.example/ebook-licence-agreement.html'],
    ])('decides no licence for the candidate Work from %s, and raises nothing about it', async (_case, link) => {
      const result = await parseProductLicense(link);

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].license).toBe('');
      expect(errorMessages(result)).toEqual([]);
    });

    it('should parse general note', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const generalNote = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
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
              NotificationType: '03',
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

    it('should parse the edition number ONIX states directly in DescriptiveDetail', async () => {
      const language = languages[0];
      const edition = faker.number.int({ min: 1, max: 10 });
      const imprint = imprints[0];
      const title = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                EditionNumber: edition.toString(),
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
              NotificationType: '03',
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
      const isbn = '9783033009608';
      const landingPage = faker.internet.url();
      const fullTextUrl = faker.internet.url();
      const locationPlatform = LocationPlatforms.options[0];
      const currencyCode = currencyOptions[0].value;
      const priceAmount = faker.number.int(1000).toString();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
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
              NotificationType: '03',
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
              NotificationType: '03',
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

    it('never reads AJ (a downloadable audio file) as MP3: the Publication waits for the format', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
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
      expect(result.data.plan.works[0].publications).toHaveLength(0);
      // One candidate per audio type the target has, for the publisher to choose between.
      expect(Object.keys(Object.values(result.data.onix?.groups[0].publications ?? {})[0])).toEqual([
        PublicationType.enum.Mp3,
        PublicationType.enum.Wav,
      ]);
    });

    it('should parse BB publication', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
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
              NotificationType: '03',
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

    it('never reads ED (a digital download) as PDF: the Publication waits for the file format', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
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
      expect(result.data.plan.works[0].publications).toHaveLength(0);
      expect(Object.keys(Object.values(result.data.onix?.groups[0].publications ?? {})[0])).toContain(
        PublicationType.enum.Pdf,
      );
    });

    it('should return empty publications if product form is not valid', async () => {
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
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
              NotificationType: '03',
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
  });

  describe('repeatable and alternative ONIX structures', () => {

    const buildProduct = (descriptiveDetail: Partial<ExtendedDescriptiveDetail>, recordReference?: string) =>
      ({
        NotificationType: '03',
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

    describe('other repeatable composites', () => {
      it('reads a single ProductIdentifier emitted as an object', async () => {
        // A lone ProductIdentifier is not an array, so calling `.find` on it used to throw and
        // fail the entire upload with an opaque parsing error.
        const product = {
          ProductIdentifier: { ProductIDType: ProductIdentifierType._15, IDValue: '9783033009608' },
          ...buildProduct({ TitleDetail: { TitleElement: { TitleText: 'Single identifier work' } } }),
        } as unknown as ExtendedProduct;

        const result = await runParser([product]);

        expect(result.status).toBe('success');
        expect(result.data.plan.works[0].publications[0].isbn).toBe('9783033009608');
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

    describe('the shared import plan', () => {

      it('gives each failed parse its own empty plan', async () => {
        const failing = () => runParser([]);

        const [first, second] = [await failing(), await failing()];

        expect(first.data.plan).not.toBe(second.data.plan);
        expect(first.data.plan.works).not.toBe(second.data.plan.works);
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
    <NotificationType>03</NotificationType>
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

    describe('work DOI', () => {
      const productIdentifier = (type: string, value: string) =>
        `<ProductIdentifier><ProductIDType>${type}</ProductIDType><IDValue>${value}</IDValue></ProductIdentifier>`;

      /** The Work DOI is a WorkIdentifier of the Work a Product manifests (RelatedWork 01), never a Product identifier. */
      const manifestationOf = (...values: string[]) =>
        `<RelatedMaterial><RelatedWork><WorkRelationCode>01</WorkRelationCode>${values
          .map((value) => `<WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>${value}</IDValue></WorkIdentifier>`)
          .join('')}</RelatedWork></RelatedMaterial>`;

      const doiOf = (result: Awaited<ReturnType<XMLParser['parse']>>) => result.data.plan.works[0].doi;
      const doiWarnings = (result: Awaited<ReturnType<XMLParser['parse']>>) =>
        (result.data.onix?.sourcePlan.warnings ?? []).filter(({ code }) => code === 'onix.identifier.unusable_doi');

      it('canonicalises a bare Work DOI', async () => {
        const result = await runFidelityParser(productXml({ relatedMaterial: manifestationOf('10.1234/abcd') }));

        expect(result.issues).toEqual([]);
        expect(doiOf(result)).toBe('https://doi.org/10.1234/abcd');
      });

      it('does not prefix a resolver onto a Work DOI that already has one', async () => {
        // `doiPrefix + value` made this `https://doi.org/https://doi.org/10.1234/abcd`.
        const result = await runFidelityParser(
          productXml({ relatedMaterial: manifestationOf('https://doi.org/10.1234/abcd') }),
        );

        expect(result.issues).toEqual([]);
        expect(doiOf(result)).toBe('https://doi.org/10.1234/abcd');
      });

      it('accepts an older resolver form', async () => {
        const result = await runFidelityParser(
          productXml({ relatedMaterial: manifestationOf('http://dx.doi.org/10.1234/abcd') }),
        );

        expect(doiOf(result)).toBe('https://doi.org/10.1234/abcd');
      });

      it('never takes a Product DOI (ProductIDType 06) as the Work DOI', async () => {
        const result = await runFidelityParser(productXml({ identifiers: productIdentifier('06', '10.1234/abcd') }));

        expect(doiOf(result)).toBe('');
      });

      it('does not report two spellings of one Work DOI as a contradiction', async () => {
        const result = await runFidelityParser(
          productXml({ relatedMaterial: manifestationOf('10.1234/abcd', 'https://doi.org/10.1234/abcd') }),
        );

        expect(result.data.onix?.sourcePlan.blockers).toEqual([]);
        expect(doiOf(result)).toBe('https://doi.org/10.1234/abcd');
      });

      it('refuses to choose between two genuinely different Work DOIs', async () => {
        const result = await runFidelityParser(
          productXml({ relatedMaterial: manifestationOf('10.5678/efgh', '10.1234/abcd') }),
        );

        expect(result.status).toBe('success');
        expect(doiOf(result)).toBe('');
        expect(result.data.onix?.sourcePlan.blockers).toEqual([
          expect.objectContaining({
            code: 'WORK_DOI_CONFLICT',
            classification: 'TARGET_INPUT_REQUIRED',
            detail: { dois: ['https://doi.org/10.1234/abcd', 'https://doi.org/10.5678/efgh'] },
          }),
        ]);
      });

      it('drops a Work DOI the Thoth API would reject rather than dressing it up', async () => {
        const result = await runFidelityParser(productXml({ relatedMaterial: manifestationOf('not-a-doi') }));

        expect(doiOf(result)).toBe('');
        expect(doiOf(result)).not.toBe('https://doi.org/not-a-doi');
        expect(doiWarnings(result)).toEqual([
          {
            severity: 'warning',
            code: 'onix.identifier.unusable_doi',
            message:
              '"not-a-doi" is given as the Work DOI of product 1 (9781641891783), which Thoth cannot read as a DOI, so it was not imported',
            source: { kind: 'onix', productIndex: 1, recordReference: '9781641891783' },
          },
        ]);
      });

      it('keeps a valid Work DOI beside a malformed one and says which was refused', async () => {
        const result = await runFidelityParser(
          productXml({ relatedMaterial: manifestationOf('10.1234/abcd', 'PROD-1234') }),
        );

        expect(doiOf(result)).toBe('https://doi.org/10.1234/abcd');
        expect(doiWarnings(result).map(({ message }) => message)).toEqual([
          expect.stringContaining('"PROD-1234" is given as the Work DOI'),
        ]);
      });

      it('leaves the Work DOI empty when no WorkIdentifier claims to be one', async () => {
        const result = await runFidelityParser(productXml({ identifiers: productIdentifier('13', '2019012345') }));

        expect(result.issues).toEqual([]);
        expect(doiOf(result)).toBe('');
      });

      it('hands the canonical Work DOI to the duplicate preflight unchanged', async () => {
        // Preflight reads `work.doi` straight off the plan, so the corrected value reaches it
        // without any change to preflight itself.
        const result = await runFidelityParser(
          productXml({ relatedMaterial: manifestationOf('http://dx.doi.org/10.1234/abcd') }),
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
          <TextItem><TextItemType>03</TextItemType>${identifiers}</TextItem>
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

    describe('text markup format', () => {
      const collateral = (long: string) =>
        `<CollateralDetail><TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience>${long}</TextContent></CollateralDetail>`;

      const abstractsOf = (result: Awaited<ReturnType<XMLParser['parse']>>) =>
        result.data.plan.works[0].abstracts.map(({ content, sourceMarkupFormat }) => [content, sourceMarkupFormat]);

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
  });

  /**
   * Issue #173. Whether a canonical Location is representable at all depends on the Publication's
   * own type: thoth-api accepts a physical canonical Location with either URL, but requires both a
   * landing page and a full text URL for a digital one. The parser used to append a canonical
   * Supplier Location unconditionally, so a frontlist record with no access URLs yet planned a
   * `('', '')` Location and the import failed at the API partway through, after earlier records had
   * already been created. These cover the matrix from the ONIX side, before any mutation runs.
   */
  describe('publication Location planning', () => {
    const RECORD_REFERENCE = '9781802700000';
    const SUPPLIER_LANDING_PAGE = 'https://supplier.example.com/book/a-frontlist-title';
    const SUPPLIER_FULL_TEXT_URL = 'https://supplier.example.com/book/a-frontlist-title.pdf';
    const PUBLISHER_LANDING_PAGE = 'https://publisher.example.com/book/a-frontlist-title/';

    /** The Supplier Website roles a case supplies: role 02 landing page, role 29 full text. */
    type SupplierUrls = { landingPage?: string; fullTextUrl?: string };

    const supplierWebsites = ({ landingPage, fullTextUrl }: SupplierUrls) => [
      ...(landingPage === undefined ? [] : [{ WebsiteRole: '02', WebsiteLink: landingPage }]),
      ...(fullTextUrl === undefined ? [] : [{ WebsiteRole: '29', WebsiteLink: fullTextUrl }]),
    ];

    /**
     * One priced product — the parser only reaches the Supplier branch when SupplyDetail carries a
     * Price — with whichever Supplier Website roles the case is about. Omitting `supplier`
     * entirely leaves the product with no ProductSupply. The publisher-level Website role 02 is
     * passed separately, because it is Work metadata rather than Publication Location metadata.
     */
    const productWith = ({
      productForm,
      productFormDetail,
      supplier,
      publisherLandingPage,
    }: {
      productForm: ProductForm;
      productFormDetail?: string;
      supplier?: SupplierUrls;
      publisherLandingPage?: string;
    }): ExtendedONIXMessageRoot => ({
      ONIXMessage: {
        Product: [
          {
            NotificationType: '03',
            RecordReference: RECORD_REFERENCE,
            DescriptiveDetail: {
              ProductForm: productForm,
              ...(productFormDetail === undefined ? {} : { ProductFormDetail: productFormDetail }),
              TitleDetail: { TitleElement: { TitleText: 'A frontlist title' } },
              Language: { LanguageCode: languages[0].value },
            } as ExtendedDescriptiveDetail,
            PublishingDetail: {
              Imprint: { ImprintName: imprints[0].label },
              PublishingStatus: '04',
              ...(publisherLandingPage === undefined
                ? {}
                : { Publisher: [{ Website: [{ WebsiteRole: '02', WebsiteLink: publisherLandingPage }] }] }),
            } as ExtendedPublishingDetail,
            ...(supplier === undefined
              ? {}
              : {
                  ProductSupply: {
                    SupplyDetail: {
                      Price: [{ CurrencyCode: currencies[0].value, PriceAmount: '10' }],
                      Supplier: { Website: supplierWebsites(supplier) },
                    },
                    Market: { Territory: { RegionsIncluded: LocationPlatforms.options[0] } },
                  } as ExtendedProductSupply,
                }),
          },
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
        currencies,
      );

      return parser.parse();
    };

    const locationsOf = (result: Awaited<ReturnType<XMLParser['parse']>>) =>
      result.data.plan.works[0].publications[0].locations;

    /**
     * The warning travels with the Publication candidate it belongs to: whether that Publication is planned is
     * the ONIX resolver's decision, and it reports what it plans.
     */
    const unrepresentableWarnings = (result: Awaited<ReturnType<XMLParser['parse']>>) =>
      (result.data.onix?.groups ?? [])
        .flatMap(({ publications }) => Object.values(publications).flatMap((byType) => Object.values(byType)))
        .flatMap((candidate) => candidate?.issues ?? [])
        .filter((issue) => issue.code === 'onix.location.unrepresentable_canonical');

    /** The one canonical Location a representable case should plan, with the platform mapping kept. */
    const canonicalLocation = (landingPage: string, fullTextUrl: string) => [
      {
        id: appConfig.defaultId,
        canonical: true,
        landingPage,
        fullTextUrl,
        locationPlatform: LocationPlatforms.options[0],
      },
    ];

    // Physical: thoth-api's canonical completeness rule for Paperback and Hardback is "at least
    // one URL", so every populated case is representable exactly as the Supplier supplied it.
    describe.each([
      ['Paperback (BC)', ProductForm._BC],
      ['Hardback (BB)', ProductForm._BB],
    ])('a physical publication, %s', (_label, productForm) => {
      it('plans no Location when the Supplier carries neither URL', async () => {
        const result = await run(productWith({ productForm, supplier: {} }));

        expect(result.status).toBe('success');
        expect(errorMessages(result)).toHaveLength(0);
        expect(result.data.plan.works[0].publications).toHaveLength(1);
        expect(locationsOf(result)).toEqual([]);
        expect(unrepresentableWarnings(result)).toHaveLength(0);
      });

      it('plans a canonical Location from a Supplier landing page alone', async () => {
        const result = await run(productWith({ productForm, supplier: { landingPage: SUPPLIER_LANDING_PAGE } }));

        expect(result.status).toBe('success');
        expect(locationsOf(result)).toEqual(canonicalLocation(SUPPLIER_LANDING_PAGE, ''));
        expect(unrepresentableWarnings(result)).toHaveLength(0);
      });

      it('plans a canonical Location from a Supplier full text URL alone', async () => {
        const result = await run(productWith({ productForm, supplier: { fullTextUrl: SUPPLIER_FULL_TEXT_URL } }));

        expect(result.status).toBe('success');
        expect(locationsOf(result)).toEqual(canonicalLocation('', SUPPLIER_FULL_TEXT_URL));
        expect(unrepresentableWarnings(result)).toHaveLength(0);
      });

      it('plans one canonical Location holding both Supplier URLs', async () => {
        const result = await run(
          productWith({
            productForm,
            supplier: { landingPage: SUPPLIER_LANDING_PAGE, fullTextUrl: SUPPLIER_FULL_TEXT_URL },
          }),
        );

        expect(result.status).toBe('success');
        expect(locationsOf(result)).toEqual(canonicalLocation(SUPPLIER_LANDING_PAGE, SUPPLIER_FULL_TEXT_URL));
        expect(unrepresentableWarnings(result)).toHaveLength(0);
      });
    });

    // Digital: a canonical Location needs both URLs. Exactly one of them is therefore
    // unrepresentable — and dropping it silently would lose metadata the publisher did supply.
    describe.each([
      ['PDF (ED + E107)', ProductForm._ED, 'E107'],
      ['MP3 (AJ + A103)', ProductForm._AJ, 'A103'],
    ])('a digital publication, %s', (_label, productForm, productFormDetail) => {
      it('plans no Location, and warns about nothing, when the Supplier carries neither URL', async () => {
        const result = await run(productWith({ productForm, productFormDetail, supplier: {} }));

        expect(result.status).toBe('success');
        expect(errorMessages(result)).toHaveLength(0);
        expect(result.data.plan.works[0].publications).toHaveLength(1);
        expect(locationsOf(result)).toEqual([]);
        // No Location metadata was supplied, so none was lost.
        expect(unrepresentableWarnings(result)).toHaveLength(0);
      });

      it('omits the Location and warns when only the Supplier landing page is supplied', async () => {
        const result = await run(
          productWith({ productForm, productFormDetail, supplier: { landingPage: SUPPLIER_LANDING_PAGE } }),
        );

        expect(result.status).toBe('success');
        expect(locationsOf(result)).toEqual([]);
        expect(unrepresentableWarnings(result)).toHaveLength(1);
      });

      it('omits the Location and warns when only the Supplier full text URL is supplied', async () => {
        const result = await run(
          productWith({ productForm, productFormDetail, supplier: { fullTextUrl: SUPPLIER_FULL_TEXT_URL } }),
        );

        expect(result.status).toBe('success');
        expect(locationsOf(result)).toEqual([]);
        expect(unrepresentableWarnings(result)).toHaveLength(1);
      });

      it('plans one canonical Location when the Supplier supplies both URLs', async () => {
        const result = await run(
          productWith({
            productForm,
            productFormDetail,
            supplier: { landingPage: SUPPLIER_LANDING_PAGE, fullTextUrl: SUPPLIER_FULL_TEXT_URL },
          }),
        );

        expect(result.status).toBe('success');
        expect(locationsOf(result)).toEqual(canonicalLocation(SUPPLIER_LANDING_PAGE, SUPPLIER_FULL_TEXT_URL));
        expect(unrepresentableWarnings(result)).toHaveLength(0);
      });
    });

    describe('the unrepresentable canonical Location warning', () => {
      it('is one non-blocking product-scoped warning naming the missing full text URL', async () => {
        const result = await run(
          productWith({
            productForm: ProductForm._ED,
            productFormDetail: 'E107',
            supplier: { landingPage: SUPPLIER_LANDING_PAGE },
          }),
        );

        expect(result.status).toBe('success');
        expect(unrepresentableWarnings(result)).toEqual([
          {
            severity: 'warning',
            code: 'onix.location.unrepresentable_canonical',
            message: expect.stringContaining('no full text URL was supplied'),
            // The parser numbers products from one, so the sole product here is product 1.
            source: { kind: 'onix', productIndex: 1, recordReference: RECORD_REFERENCE },
          },
        ]);
      });

      it('names the missing landing page when only the full text URL was supplied', async () => {
        const result = await run(
          productWith({
            productForm: ProductForm._ED,
            productFormDetail: 'E107',
            supplier: { fullTextUrl: SUPPLIER_FULL_TEXT_URL },
          }),
        );

        const [warning] = unrepresentableWarnings(result);

        expect(warning.severity).toBe('warning');
        expect(warning.message).toContain('no landing page was supplied');
        expect(warning.message).not.toContain('no full text URL was supplied');
      });

      it('keeps the Work and its Publication in the plan and never says they were dropped', async () => {
        const result = await run(
          productWith({
            productForm: ProductForm._ED,
            productFormDetail: 'E107',
            supplier: { landingPage: SUPPLIER_LANDING_PAGE },
          }),
        );

        expect(result.status).toBe('success');
        expect(result.data.plan.works).toHaveLength(1);
        expect(result.data.plan.works[0].publications).toHaveLength(1);
        expect(result.data.plan.works[0].publications[0].type).toBe(PublicationType.enum.Pdf);

        const [warning] = unrepresentableWarnings(result);

        // The product it came from, so the message is actionable...
        expect(warning.message).toContain(RECORD_REFERENCE);
        // ...and the reassurance that only the Location was left behind.
        expect(warning.message).toContain('The publication itself is imported without it');
      });
    });

    describe('representative frontlist regressions for issue #173', () => {
      it('keeps the publisher landing page on the Work while planning no Location', async () => {
        const result = await run(
          productWith({
            productForm: ProductForm._BC,
            supplier: {},
            publisherLandingPage: PUBLISHER_LANDING_PAGE,
          }),
        );

        expect(result.status).toBe('success');
        expect(errorMessages(result)).toHaveLength(0);
        expect(result.data.plan.works[0].publications).toHaveLength(1);
        expect(locationsOf(result)).toEqual([]);
        expect(unrepresentableWarnings(result)).toHaveLength(0);
      });

      it('plans no Location for a frontlist product carrying no ProductSupply at all', async () => {
        const result = await run(
          productWith({
            productForm: ProductForm._ED,
            productFormDetail: 'E107',
            publisherLandingPage: PUBLISHER_LANDING_PAGE,
          }),
        );

        expect(result.status).toBe('success');
        expect(locationsOf(result)).toEqual([]);
        expect(unrepresentableWarnings(result)).toHaveLength(0);
      });

      it('never completes a half-supplied digital Supplier Location from the Work landing page', async () => {
        // The publisher's own product page and a supplier's full-text platform are different
        // things; pairing them would invent a Location neither source actually claims.
        const result = await run(
          productWith({
            productForm: ProductForm._ED,
            productFormDetail: 'E107',
            supplier: { fullTextUrl: SUPPLIER_FULL_TEXT_URL },
            publisherLandingPage: PUBLISHER_LANDING_PAGE,
          }),
        );

        expect(locationsOf(result)).toEqual([]);
        expect(unrepresentableWarnings(result)).toHaveLength(1);
      });

      it('never turns an unrepresentable digital candidate into a non-canonical Location', async () => {
        // A first non-canonical Location is itself rejected by the API, so it is no workaround.
        const result = await run(
          productWith({
            productForm: ProductForm._ED,
            productFormDetail: 'E107',
            supplier: { landingPage: SUPPLIER_LANDING_PAGE },
          }),
        );

        expect(locationsOf(result).some(({ canonical }) => !canonical)).toBe(false);
        expect(locationsOf(result)).toHaveLength(0);
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
      NotificationType: '03',
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
              TextItem: { TextItemType: '03' },
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

  it('fails the parse when the ONIX ORCID batch request rejects', async () => {
    mockContributorService.getContributorsByOrcids = vi.fn().mockRejectedValue(new Error('502 Bad Gateway'));

    const result = await parseProducts([product('A book', [onixContributor('Jane Doe', orcidIdentifier(ORCID))])]);

    expect(result.status).toBe('failed');
    expect(result.data.plan.works).toEqual([]);
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
});

/**
 * thoth-app#183. The adapter decides nothing descriptive: it asks Thoth exactly what the canonical descriptive
 * reductions need to know - which existing contributor an ORCID names, who shares a name, which Institution a
 * ROR or a FundRef DOI names - and hands the answers to the resolver, which builds the Work from them.
 */
describe('XMLParser: exact descriptive lookups (thoth-app#183)', () => {
  const IMPRINT = { label: 'Lookup Press', value: '66666666-6666-6666-6666-666666666666' };
  const ORCID = '0000-0001-6365-5189';
  const ROR = 'https://ror.org/05dxps055';
  const FUNDREF = 'https://doi.org/10.13039/501100000780';

  const existingContributor = (overrides: Partial<ContributorEntity> = {}): ContributorEntity => ({
    id: 'contributor-existing',
    name: 'Ada Lovelace',
    fullName: 'Ada Lovelace',
    firstName: 'Ada',
    lastName: 'Lovelace',
    orcid: '',
    website: '',
    updatedAt: '',
    lastContributionTitle: 'Notes',
    ...overrides,
  });

  const services = ({
    orcidHits = [] as ContributorEntity[],
    nameHits = [] as ContributorEntity[],
    institutions = [] as Array<{ id: string; name: string; ror: string; doi: string }>,
  } = {}) => ({
    contributorService: {
      getContributors: vi.fn().mockResolvedValue(nameHits),
      getContributorsByOrcids: vi.fn().mockResolvedValue(orcidHits),
    } as unknown as ContributorService,
    institutionService: {
      getInstitutions: vi
        .fn()
        .mockResolvedValue(institutions.map((institution) => ({ countryCode: '', updatedAt: '', ...institution }))),
    } as unknown as InstitutionService,
  });

  const contributor = (orcid?: string) =>
    '<Contributor><ContributorRole>A01</ContributorRole>' +
    (orcid ? `<NameIdentifier><NameIDType>21</NameIDType><IDValue>${orcid}</IDValue></NameIdentifier>` : '') +
    '<PersonName>Ada Lovelace</PersonName><NamesBeforeKey>Ada</NamesBeforeKey><KeyNames>Lovelace</KeyNames>' +
    `<ProfessionalAffiliation><AffiliationIdentifier><AffiliationIDType>40</AffiliationIDType><IDValue>${ROR}</IDValue></AffiliationIdentifier><Affiliation>Example University</Affiliation></ProfessionalAffiliation>` +
    '</Contributor>';

  const productXml = (isbn: string, { orcid, chapter = false }: { orcid?: string; chapter?: boolean } = {}) =>
    `<Product><RecordReference>${isbn}</RecordReference><NotificationType>03</NotificationType>` +
    `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
    '<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>' +
    '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText language="eng">A Work</TitleText></TitleElement></TitleDetail>' +
    `${contributor(orcid)}</DescriptiveDetail>` +
    (chapter
      ? '<ContentDetail><ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>' +
        '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">A Chapter</TitleText></TitleElement></TitleDetail>' +
        `${contributor(orcid)}</ContentItem></ContentDetail>`
      : '') +
    `<PublishingDetail><Imprint><ImprintName>${IMPRINT.label}</ImprintName></Imprint>` +
    '<Publisher><PublishingRole>14</PublishingRole>' +
    `<PublisherIdentifier><PublisherIDType>40</PublisherIDType><IDValue>${ROR}</IDValue></PublisherIdentifier>` +
    `<PublisherIdentifier><PublisherIDType>32</PublisherIDType><IDValue>${FUNDREF}</IDValue></PublisherIdentifier>` +
    '<PublisherName>Example Foundation</PublisherName></Publisher>' +
    '<PublishingStatus>02</PublishingStatus></PublishingDetail></Product>';

  const parseWith = async (products: string[], dependencies = services()) => {
    const xml = parse(
      `<ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference"><Header><Sender><SenderName>Lookup Press</SenderName></Sender><SentDateTime>20260916T1200</SentDateTime></Header>${products.join('')}</ONIXMessage>`,
    ) as ExtendedONIXMessageRoot;
    const result = await new XMLParser(
      xml,
      [IMPRINT],
      licenseOptions,
      [],
      dependencies.contributorService,
      dependencies.institutionService,
      languageOptions,
      currencyOptions,
    ).parse();

    return { xml, result, ...dependencies };
  };

  it('asks for every ORCID in one batch, every name, ROR and funder identity once, across products', async () => {
    const { result, contributorService, institutionService } = await parseWith([
      productXml('9781800000018'),
      productXml('9781800000025'),
    ]);

    expect(result.status).toBe('success');
    expect(contributorService.getContributors).toHaveBeenCalledTimes(1);
    expect(contributorService.getContributors).toHaveBeenCalledWith('Ada Lovelace');
    // One ROR search serves the affiliation and the funder; one DOI search serves the funder's FundRef DOI; and
    // because neither names an institution, one name search each suggests the institutions the publisher may choose.
    expect(institutionService.getInstitutions).toHaveBeenCalledTimes(4);
    expect(institutionService.getInstitutions).toHaveBeenCalledWith(0, appConfig.data.maxItemsPerRequestLimit, ROR);
    expect(institutionService.getInstitutions).toHaveBeenCalledWith(
      0,
      appConfig.data.maxItemsPerRequestLimit,
      '10.13039/501100000780',
    );
    expect(institutionService.getInstitutions).toHaveBeenCalledWith(
      0,
      appConfig.data.maxItemsPerRequestLimit,
      'Example University',
    );
    expect(institutionService.getInstitutions).toHaveBeenCalledWith(
      0,
      appConfig.data.maxItemsPerRequestLimit,
      'Example Foundation',
    );
    expect(result.data.onix?.groups.map(({ descriptive }) => descriptive)).toEqual([
      {
        contributors: {
          '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/Contributor[1]': { orcidMatch: null, alternatives: [] },
        },
        institutions: { [ROR]: { kind: 'NOT_FOUND' } },
        funders: { [`ror:${ROR}`]: { kind: 'NOT_FOUND' } },
        institutionCandidates: { 'Example University': [], 'Example Foundation': [] },
        chapterWorkIds: {},
      },
      {
        contributors: {
          '/ONIXMessage[1]/Product[2]/DescriptiveDetail[1]/Contributor[1]': { orcidMatch: null, alternatives: [] },
        },
        institutions: { [ROR]: { kind: 'NOT_FOUND' } },
        funders: { [`ror:${ROR}`]: { kind: 'NOT_FOUND' } },
        institutionCandidates: { 'Example University': [], 'Example Foundation': [] },
        chapterWorkIds: {},
      },
    ]);
  });

  it('never searches by name for a contributor an exact ORCID identifies, on the Work or its chapters', async () => {
    const existing = existingContributor({ orcid: `https://orcid.org/${ORCID}` });
    const { result, contributorService } = await parseWith([productXml('9781800000018', { orcid: ORCID, chapter: true })], services({ orcidHits: [existing] }));
    const [group] = result.data.onix?.groups ?? [];
    const [chapter] = result.data.plan.chapters;

    expect(contributorService.getContributorsByOrcids).toHaveBeenCalledExactlyOnceWith([`https://orcid.org/${ORCID}`]);
    expect(contributorService.getContributors).not.toHaveBeenCalled();
    expect(Object.values(group.descriptive.contributors).map(({ orcidMatch }) => orcidMatch?.contributorId)).toEqual([
      'contributor-existing',
      'contributor-existing',
    ]);
    expect(group.descriptive.chapterWorkIds).toEqual({
      '/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[1]': chapter.id,
    });
    expect(result.data.contributorsForSelection).toEqual({});
  });

  it('offers the contributors a name search found only as alternatives to the planned identity, one choice per person', async () => {
    const namesake = existingContributor({ lastContributionTitle: '' });
    const { result } = await parseWith([productXml('9781800000018')], services({ nameHits: [namesake] }));
    const [work] = result.data.plan.works;
    const options = result.data.contributorsForSelection[work.id]['/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/Contributor[1]'];

    expect(options.map(({ contributorId, fullName, selected, lastContribution }) => [contributorId, fullName, selected, lastContribution])).toEqual([
      [appConfig.defaultId, 'Ada Lovelace', true, ''],
      ['contributor-existing', 'Ada Lovelace', false, ''],
    ]);
  });

  it('reads identical chapters of grouped manifestations as agreeing, whatever each one asks the publisher', async () => {
    const chapterWithOpenPrimary =
      '<ContentDetail><ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>' +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">A Chapter</TitleText></TitleElement></TitleDetail>' +
      '<Subject><SubjectSchemeIdentifier>93</SubjectSchemeIdentifier><SubjectCode>NHD</SubjectCode></Subject>' +
      '<Subject><SubjectSchemeIdentifier>93</SubjectSchemeIdentifier><SubjectCode>NHB</SubjectCode></Subject>' +
      '</ContentItem></ContentDetail>';
    const grouped = (isbn: string) =>
      productXml(isbn)
        .replace('<PublishingDetail>', `${chapterWithOpenPrimary}<PublishingDetail>`)
        .replace(
          '</Product>',
          '<RelatedMaterial><RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/grouped</IDValue></WorkIdentifier></RelatedWork></RelatedMaterial></Product>',
        );
    const { result } = await parseWith([grouped('9781800000018'), grouped('9781800000025')]);

    expect(result.data.onix?.groups).toHaveLength(1);
    expect(result.data.onix?.groups[0].conflictingFields).toEqual([]);
  });

  it('compares grouped manifestations on no licence: a licensed e-book beside a licence-silent paperback is no conflict (#211)', async () => {
    const grouped = (isbn: string, form: string) =>
      productXml(isbn)
        .replace('<ProductForm>BC</ProductForm>', form)
        .replace(
          '</Product>',
          '<RelatedMaterial><RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/grouped</IDValue></WorkIdentifier></RelatedWork></RelatedMaterial></Product>',
        );
    const licensedEpub =
      '<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail><EpubTechnicalProtection>00</EpubTechnicalProtection>' +
      '<EpubLicense><EpubLicenseName>CC BY-NC-ND 4.0</EpubLicenseName><EpubLicenseExpression><EpubLicenseExpressionType>01</EpubLicenseExpressionType>' +
      '<EpubLicenseExpressionLink>https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode</EpubLicenseExpressionLink></EpubLicenseExpression></EpubLicense>';
    const { result } = await parseWith([
      grouped('9781800000018', '<ProductForm>BC</ProductForm>'),
      grouped('9781800000025', licensedEpub),
    ]);

    expect(result.data.onix?.groups).toHaveLength(1);
    expect(result.data.onix?.groups[0].conflictingFields).toEqual([]);
    expect(result.data.plan.works).toHaveLength(1);
    expect(result.data.plan.works[0].license).toBe('');
  });

  it('lets no chapter inherit a licence from the Product its Work is read from (rules 102, 108)', async () => {
    const licensed = productXml('9781800000018', { chapter: true }).replace(
      '<ProductForm>BC</ProductForm>',
      '<ProductForm>BC</ProductForm><EpubLicense><EpubLicenseName>CC BY 4.0</EpubLicenseName><EpubLicenseExpression><EpubLicenseExpressionType>02</EpubLicenseExpressionType><EpubLicenseExpressionLink>https://creativecommons.org/licenses/by/4.0/</EpubLicenseExpressionLink></EpubLicenseExpression></EpubLicense>',
    );
    const { result } = await parseWith([licensed]);

    expect(result.data.plan.chapters).toHaveLength(1);
    expect(result.data.plan.chapters[0].license).toBe('');
  });

  it('names an Institution only by an exact identifier, and reports a funder whose identifiers name two', async () => {
    const byRor = { id: 'institution-ror', name: 'By ROR', ror: ROR, doi: '' };
    const byDoi = { id: 'institution-doi', name: 'By DOI', ror: '', doi: FUNDREF };
    const { result } = await parseWith([productXml('9781800000018')], services({ institutions: [byRor, byDoi] }));
    const [group] = result.data.onix?.groups ?? [];

    expect(group.descriptive.institutions).toEqual({
      [ROR]: { kind: 'FOUND', institutionId: 'institution-ror', name: 'By ROR', ror: ROR },
    });
    expect(group.descriptive.funders).toEqual({
      [`ror:${ROR}`]: { kind: 'CONFLICT', institutionIds: ['institution-ror', 'institution-doi'] },
    });
    // An exact identity - or a contradiction of one - is never second-guessed by a name search.
    expect(group.descriptive.institutionCandidates).toEqual({});
  });

  describe('institution suggestions for what the file does not identify (#209 F, G)', () => {
    const SAS = 'School of Advanced Study, University of London (United Kingdom)';
    const unidentifiedXml = (isbn: string) =>
      `<Product><RecordReference>${isbn}</RecordReference><NotificationType>03</NotificationType>` +
      `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
      '<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>' +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText language="eng">A Work</TitleText></TitleElement></TitleDetail>' +
      '<Contributor><ContributorRole>B01</ContributorRole><PersonName>Charles Burdett</PersonName><NamesBeforeKey>Charles</NamesBeforeKey><KeyNames>Burdett</KeyNames>' +
      `<ProfessionalAffiliation><ProfessionalPosition>Professor</ProfessionalPosition><Affiliation>${SAS}</Affiliation></ProfessionalAffiliation></Contributor>` +
      `</DescriptiveDetail><PublishingDetail><Imprint><ImprintName>${IMPRINT.label}</ImprintName></Imprint>` +
      '<Publisher><PublishingRole>14</PublishingRole><PublisherName>Arcadia Fund</PublisherName></Publisher>' +
      '<PublishingStatus>02</PublishingStatus></PublishingDetail></Product>';
    const entity = (id: string, name: string, ror = '') => ({ id, name, ror, doi: '', countryCode: '', updatedAt: '' });
    const suggesting = (byFilter: Record<string, ReturnType<typeof entity>[]>) => ({
      contributorService: {
        getContributors: vi.fn().mockResolvedValue([]),
        getContributorsByOrcids: vi.fn().mockResolvedValue([]),
      } as unknown as ContributorService,
      institutionService: {
        getInstitutions: vi.fn(async (_offset: number, _limit: number, filter: string) => byFilter[filter] ?? []),
      } as unknown as InstitutionService,
    });

    it('searches the text as stated and each part it lists, keeping every suggestion once, and identifying none', async () => {
      const sas = entity('institution-sas', 'School of Advanced Study', 'https://ror.org/04kjz2v51');
      const uol = entity('institution-uol', 'University of London', 'https://ror.org/04cw6st05');
      const arcadia = entity('institution-arcadia', 'Arcadia Fund');
      const dependencies = suggesting({
        'School of Advanced Study': [sas],
        'University of London': [uol, sas],
        'Arcadia Fund': [arcadia],
      });
      const { result, institutionService } = await parseWith([unidentifiedXml('9781800000018')], dependencies);
      const [group] = result.data.onix?.groups ?? [];
      const filters = vi.mocked(institutionService.getInstitutions).mock.calls.map(([, , filter]) => filter);

      expect(result.status).toBe('success');
      // Nothing is looked up exactly: the file declares no ROR or FundRef DOI.
      expect(filters.sort()).toEqual(
        [SAS, 'School of Advanced Study', 'University of London', 'United Kingdom', 'Arcadia Fund'].sort(),
      );
      expect(group.descriptive.institutions).toEqual({});
      expect(group.descriptive.funders).toEqual({ 'name:Arcadia Fund': { kind: 'NOT_FOUND' } });
      expect(group.descriptive.institutionCandidates).toEqual({
        [SAS]: [
          {
            institutionId: 'institution-sas',
            name: 'School of Advanced Study',
            ror: 'https://ror.org/04kjz2v51',
            doi: '',
          },
          { institutionId: 'institution-uol', name: 'University of London', ror: 'https://ror.org/04cw6st05', doi: '' },
        ],
        'Arcadia Fund': [{ institutionId: 'institution-arcadia', name: 'Arcadia Fund', ror: '', doi: '' }],
      });
    });

    it('searches no name where the exact ROR or funder identity names an institution', async () => {
      const found = entity('institution-ror', 'By ROR', ROR);
      const { institutionService } = await parseWith([productXml('9781800000018')], {
        ...suggesting({}),
        institutionService: {
          getInstitutions: vi.fn(async (_offset: number, _limit: number, filter: string) =>
            filter === ROR ? [found] : [],
          ),
        } as unknown as InstitutionService,
      });
      const filters = vi.mocked(institutionService.getInstitutions).mock.calls.map(([, , filter]) => filter);

      expect(filters).not.toContain('Example University');
      expect(filters).not.toContain('Example Foundation');
    });

    it('fails the parse when a name search itself fails, rather than reading it as no suggestion', async () => {
      const { result } = await parseWith([unidentifiedXml('9781800000018')], {
        ...suggesting({}),
        institutionService: {
          getInstitutions: vi.fn().mockRejectedValue(new Error('institution search transport failure')),
        } as unknown as InstitutionService,
      });

      expect(result.status).toBe('failed');
      expect(result.issues.map(({ code }) => code)).toEqual(['onix.processing_failed']);
    });
  });
});
