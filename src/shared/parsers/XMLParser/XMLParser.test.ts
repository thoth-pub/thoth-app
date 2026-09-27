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

import { appConfig } from '../../config';
import {
  LocationPlatforms,
  PublicationType,
  currencyOptions,
  languageOptions,
  licenseOptions,
} from '../../constants';
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
import { reduceOnixComponents } from './onixComponents';
import { planOnixSource } from './onixPlanning';
import { reduceOnixRelatedMaterial, resolveOnixProductReferences } from './onixRelations';
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

    // A Work's abstracts and general note are the canonical collateral reduction's (thoth-app#225), reconciled for the grouped
    // Work and resolved with the publisher's answers: the adapter never reads a TextContent, and never takes the first one.
    it.each([
      ['a long and a short abstract', [TextType._03, TextType._02]],
      ['a long abstract alone', [TextType._03]],
      ['a short abstract alone', [TextType._02]],
      ["a publisher's notice", [TextType._13]],
    ])('reads no collateral of its own from %s: the candidate Work carries none', async (_case, types) => {
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              NotificationType: '03',
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                Language: { LanguageCode: languages[0].value },
              } as ExtendedDescriptiveDetail,
              CollateralDetail: {
                TextContent: types.map((type) => ({ TextType: type, Text: { '#text': faker.lorem.sentence() } })),
              },
              PublishingDetail: {
                Imprint: { ImprintName: imprints[0].label },
                PublishingStatus: '04',
              },
            },
          ],
        },
      };

      const result = await new XMLParser(
        xml,
        imprints,
        licenses,
        serieses,
        mockContributorService,
        mockInstitutionService,
        languages,
        currencyOptions,
      ).parse();

      expect(result.status).toBe('success');
      expect(result.issues).toEqual([]);
      expect(result.data.plan.works[0].abstracts).toEqual([]);
      expect(result.data.plan.works[0].generalNote).toBe('');
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
      // Its ProductSupply is the canonical commercial reduction's (thoth-app#215): the candidate carries no Price or Location.
      expect(result.data.plan.works[0].publications[0].prices).toEqual([]);
      expect(result.data.plan.works[0].publications[0].locations).toEqual([]);
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
      // Its ProductSupply is the canonical commercial reduction's (thoth-app#215): the candidate carries no Price or Location.
      expect(result.data.plan.works[0].publications[0].prices).toEqual([]);
      expect(result.data.plan.works[0].publications[0].locations).toEqual([]);
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

    it('leaves References to the canonical RelatedMaterial reduction (thoth-app#224)', async () => {
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
      // Neither the cited product nor the translated work becomes anything here: the canonical reduction plans both.
      expect(result.data.plan.works[0].references).toEqual([]);
      expect(result.issues.map(({ code }) => code)).not.toContain('onix.reference.unusable_identifier');
      expect(JSON.stringify(result.data.plan)).not.toContain(citedDoi);
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

    describe('collateral (thoth-app#225)', () => {
      const collateral = (texts: string) => `<CollateralDetail>${texts}</CollateralDetail>`;
      const textContent = (type: string, text: string) =>
        `<TextContent><TextType>${type}</TextType><ContentAudience>00</ContentAudience>${text}</TextContent>`;

      // What a Work's texts become - their locale, their markup, whether one can be imported at all - is the canonical
      // collateral reduction's, decided for the grouped Work and answerable in the app: the adapter raises nothing about it.
      it.each([
        ['an abstract in its own language', textContent('03', '<Text language="fre">Une description.</Text>')],
        ['an untagged abstract', textContent('02', '<Text textformat="03">A short one.</Text>')],
        [
          'non-JATS markup declared XML',
          textContent('03', '<Text textformat="03">&lt;p&gt;&lt;em&gt;x&lt;/em&gt;&lt;/p&gt;</Text>'),
        ],
        [
          'markup nothing classifies',
          textContent('03', '<Text textformat="06">A &lt;blink&gt;bad&lt;/blink&gt; one</Text>'),
        ],
        [
          'malformed HTML',
          textContent(
            '03',
            '<Text textformat="02">&lt;p&gt;&lt;em&gt;one&lt;br&gt;two&lt;/strong&gt;&lt;/p&gt;</Text>',
          ),
        ],
        ['a single plain-text line break', textContent('03', '<Text textformat="06">Hello\nworld</Text>')],
        [
          'a table of contents and a notice',
          `${textContent('04', '<Text>1. One</Text>')}${textContent('13', '<Text>A notice.</Text>')}`,
        ],
      ])('reads nothing of %s into the candidate Work, and raises no issue about it', async (_case, texts) => {
        const result = await runFidelityParser(productXml({ collateralDetail: collateral(texts) }));

        expect(result.status).toBe('success');
        expect(result.issues).toEqual([]);
        expect(result.data.plan.works[0]).toMatchObject({ abstracts: [], generalNote: '' });
      });

      const groupedXml = (first: string, second: string) => {
        const manifestation = (isbn: string, form: string, item: string) => `<Product>
          <RecordReference>${isbn}</RecordReference>
          <NotificationType>03</NotificationType>
          <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>
          <DescriptiveDetail>
            <ProductComposition>00</ProductComposition>
            <ProductForm>${form}</ProductForm>
            <TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Beowulf by All</TitleText></TitleElement></TitleDetail>
            <Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>
          </DescriptiveDetail>
          <ContentDetail><ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>
            <TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText>A Chapter</TitleText></TitleElement></TitleDetail>
            ${item}</ContentItem></ContentDetail>
          <PublishingDetail>
            <Imprint><ImprintName>${FIDELITY_IMPRINT.label}</ImprintName></Imprint>
            <PublishingStatus>04</PublishingStatus>
          </PublishingDetail>
          <RelatedMaterial><RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/beowulf</IDValue></WorkIdentifier></RelatedWork></RelatedMaterial>
        </Product>`;

        return `<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="3.0">${manifestation('9781641891783', 'BC', first)}${manifestation('9781641891790', 'BB', second)}</ONIXMessage>`;
      };

      it('never plans one manifestation’s chapter collateral while another states different collateral for it', async () => {
        const abstract = (text: string) => textContent('30', `<Text>${text}</Text>`);
        const note = textContent('13', '<Text>A chapter note.</Text>');
        const differing = await runFidelityParser(groupedXml(abstract('One abstract.'), abstract('Another abstract.')));
        const reordered = await runFidelityParser(
          groupedXml(`${abstract('One abstract.')}${note}`, `${note}${abstract('One abstract.')}`),
        );

        expect(differing.data.onix?.groups).toHaveLength(1);
        expect(differing.data.onix?.groups[0].conflictingFields).toEqual(['componentCollateral']);
        expect(differing.data.plan.works).toEqual([]);
        // What a ContentItem states is compared, never the order it states it in.
        expect(reordered.data.onix?.groups[0].conflictingFields).toEqual([]);
        expect(reordered.data.plan.works).toHaveLength(1);
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

      it.each([
        ['a bare DOI', textItemIdentifier('06', '10.1234/chapter')],
        ['a resolver-prefixed DOI', textItemIdentifier('06', 'https://doi.org/10.1234/chapter')],
        [
          'a DOI behind a proprietary identifier',
          `${textItemIdentifier('01', 'SKU-1')}${textItemIdentifier('06', '10.1234/chapter')}`,
        ],
        ['a proprietary identifier alone', textItemIdentifier('01', '10.1234/not-a-doi-scheme')],
        [
          'two spellings of one DOI',
          `${textItemIdentifier('06', '10.1234/chapter')}${textItemIdentifier('06', 'http://dx.doi.org/10.1234/chapter')}`,
        ],
        [
          'two different DOIs',
          `${textItemIdentifier('06', '10.1234/abcd')}${textItemIdentifier('06', '10.5678/efgh')}`,
        ],
        ['a malformed DOI', textItemIdentifier('06', 'not-a-doi')],
        [
          'a valid DOI beside a malformed one',
          `${textItemIdentifier('06', '10.1234/chapter')}${textItemIdentifier('06', 'PROD-1234')}`,
        ],
        ['no identifier', ''],
      ])(
        'agrees exactly with the canonical component reduction for %s, which alone the plan takes (thoth-app#223)',
        async (_label, identifiers) => {
          const xml = productXml({ contentDetail: contentDetailXml(identifiers) });
          const parsed = (await parse(xml)) as ExtendedONIXMessageRoot;
          const sourcePlan = planOnixSource(parsed);
          const [component] = Object.values(reduceOnixComponents(parsed, sourcePlan).products)[0].components;
          const canonical = component.doi.kind === 'DOI' ? component.doi.doi : '';

          expect(chapterDoiOf(await runFidelityParser(xml))).toBe(canonical);
        },
      );
    });

    describe('candidate chapters (thoth-app#223)', () => {
      const item = (lsn: string, inner: string, type = '03') => `<ContentItem>
          <LevelSequenceNumber>${lsn}</LevelSequenceNumber>
          <TextItem><TextItemType>${type}</TextItemType>${inner}</TextItem>
          <TitleDetail><TitleType>01</TitleType><TitleElement>
            <TitleElementLevel>04</TitleElementLevel><TitleText>Chapter ${lsn}</TitleText>
          </TitleElement></TitleDetail>
        </ContentItem>`;
      const pageRun = (first: string, last?: string) =>
        `<PageRun><FirstPageNumber>${first}</FirstPageNumber>${last === undefined ? '' : `<LastPageNumber>${last}</LastPageNumber>`}</PageRun>`;

      it('reads pages and page counts inside the TextItem, where ONIX states them, and never sorts by LevelSequenceNumber', async () => {
        const result = await runFidelityParser(
          productXml({
            contentDetail: `<ContentDetail>${item('2', `${pageRun('21', '40')}<NumberOfPages>20</NumberOfPages>`)}${item('1', pageRun('1', '20'))}${item('3', `${pageRun('41', '50')}${pageRun('60', '70')}`)}</ContentDetail>`,
          }),
        );

        expect(result.status).toBe('success');
        // In source order, with the exact facts of the canonical reduction: one range, or none where the file states
        // several - which one is kept is the publisher's decision, never the first.
        expect(
          result.data.plan.chapters.map(({ pageCount, firstPage, lastPage }) => [pageCount, firstPage, lastPage]),
        ).toEqual([
          [20, '21', '40'],
          [0, '1', '20'],
          [0, '', ''],
        ]);
        expect(result.data.onix?.groups[0].descriptive.chapterWorkIds).toEqual(
          Object.fromEntries(
            result.data.plan.chapters.map(({ id }, index) => [
              `/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[${index + 1}]`,
              id,
            ]),
          ),
        );
      });

      it('builds no candidate chapter for a contained Work, an audiovisual item or an unsupported item', async () => {
        const result = await runFidelityParser(
          productXml({
            contentDetail: `<ContentDetail>${item('1', '')}${item('2', '', '01')}${item('3', '', '07')}<ContentItem><LevelSequenceNumber>4</LevelSequenceNumber><AVItem><AVItemType>01</AVItemType></AVItem><TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText>A Film</TitleText></TitleElement></TitleDetail></ContentItem></ContentDetail>`,
          }),
        );

        expect(result.data.plan.chapters).toHaveLength(1);
        expect(Object.keys(result.data.onix?.groups[0].descriptive.chapterWorkIds ?? {})).toEqual([
          '/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[1]',
        ]);
      });

      it('hands on the component reduction it built its candidates from: the one it was given, or its own', async () => {
        const xml = productXml({ contentDetail: `<ContentDetail>${item('1', '')}</ContentDetail>` });
        const parsed = (await parse(xml)) as ExtendedONIXMessageRoot;
        const sourcePlan = planOnixSource(parsed);
        const components = reduceOnixComponents(parsed, sourcePlan);
        const given = await new XMLParser(
          parsed,
          [FIDELITY_IMPRINT],
          licenses,
          [],
          mockContributorService,
          mockInstitutionService,
          languages,
          currencyOptions,
          { sourcePlan, components },
        ).parse();
        const own = await runFidelityParser(xml);

        expect(given.data.onix?.groups[0].components).toBe(components);
        expect(own.data.onix?.groups[0].components).toEqual(components);
      });
    });

    describe('related material', () => {
      const relatedMaterialXml = (relations: string) => `<RelatedMaterial>${relations}</RelatedMaterial>`;
      const cited = (identifiers: string) =>
        `<RelatedProduct><ProductRelationCode>34</ProductRelationCode>${identifiers}</RelatedProduct>`;
      const doi = (value: string) =>
        `<ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>${value}</IDValue></ProductIdentifier>`;
      const citation = (value: string, name = 'Unstructured citation') =>
        `<ProductIdentifier><ProductIDType>01</ProductIDType><IDTypeName>${name}</IDTypeName><IDValue>${value}</IDValue></ProductIdentifier>`;

      const referencesOf = (result: Awaited<ReturnType<XMLParser['parse']>>) => result.data.plan.works[0].references;

      /*
       * The adapter is no longer the authority on References or relations (thoth-app#224): every RelatedWork and
       * RelatedProduct is the canonical RelatedMaterial reduction's, which reads each identifier by its declared type,
       * applies Thoth's own citation convention only under its verified profile, and decides every loss - its own suite
       * proves each of the cases below. The candidate Work carries none, and the adapter reports nothing about them.
       */
      it.each([
        [
          'an alternative format',
          '<RelatedProduct><ProductRelationCode>06</ProductRelationCode><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier></RelatedProduct>',
        ],
        ['a cited DOI', cited(doi('10.1234/abcd'))],
        ['a cited DOI with its resolver', cited(doi('http://dx.doi.org/10.1234/abcd'))],
        ['a cited value that is no DOI', cited(doi('not-a-doi'))],
        ['two cited DOIs', cited(doi('10.1234/abcd') + doi('10.5678/efgh'))],
        ['a cited DOI and a Thoth citation', cited(citation('Hopkins, Lisa. 2019.') + doi('10.1234/abcd'))],
        ['two Thoth citations', cited(citation('Hopkins, Lisa. 2019.') + citation('Somebody Else. 2020.'))],
        ['an arbitrary proprietary identifier', cited(citation('PROD-1234', 'Publisher product code'))],
        [
          'a cited ISBN alone',
          cited(
            '<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier>',
          ),
        ],
        [
          'part and replacement relations',
          ['01', '02', '03', '05']
            .map(
              (relation) =>
                `<RelatedProduct><ProductRelationCode>${relation}</ProductRelationCode>${doi(`10.1234/other-${relation}`)}</RelatedProduct>`,
            )
            .join(''),
        ],
        [
          'translation relations',
          '<RelatedWork><WorkRelationCode>29</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/original</IDValue></WorkIdentifier></RelatedWork>',
        ],
      ])(
        'plans no Reference from %s and reports nothing about it: the canonical reduction decides',
        async (_label, relations) => {
          const result = await runFidelityParser(productXml({ relatedMaterial: relatedMaterialXml(relations) }));

          expect(result.status).toBe('success');
          expect(referencesOf(result)).toEqual([]);
          expect(result.issues).toEqual([]);
        },
      );

      it('reads, in the canonical reduction, what the adapter used to: the DOI and the Thoth citation, in source order', async () => {
        const xml = (await parse(
          productXml({
            relatedMaterial: relatedMaterialXml(
              cited(citation('Hopkins, Lisa. 2019.') + doi('10.1234/abcd')) +
                cited(doi('http://dx.doi.org/10.1234/second')),
            ),
          }),
        )) as ExtendedONIXMessageRoot;
        const sourcePlan = planOnixSource(xml);
        const [product] = sourcePlan.products;
        const reduced = reduceOnixRelatedMaterial(xml, sourcePlan);
        const references = (thothProfileActive: boolean) =>
          resolveOnixProductReferences(reduced, product.productKey, product.groupKey, {
            thothProfileActive,
            describe: 'product 1',
          }).references.references.map(({ referenceOrdinal, doi: value, unstructuredCitation }) => [
            referenceOrdinal,
            value,
            unstructuredCitation,
          ]);

        // Thoth's citation convention is its own export's: only its verified profile reads it as citation text.
        expect(references(true)).toEqual([
          [1, 'https://doi.org/10.1234/abcd', 'Hopkins, Lisa. 2019.'],
          [2, 'https://doi.org/10.1234/second', null],
        ]);
        expect(references(false)).toEqual([
          [1, 'https://doi.org/10.1234/abcd', null],
          [2, 'https://doi.org/10.1234/second', null],
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

  it('never plans a grouped Work whose manifestations state different components, whichever kind differs (thoth-app#223)', async () => {
    const chapter = (lsn: string) =>
      `<ContentItem><LevelSequenceNumber>${lsn}</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>` +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">A Chapter</TitleText></TitleElement></TitleDetail></ContentItem>';
    const film =
      '<ContentItem><LevelSequenceNumber>2</LevelSequenceNumber><AVItem><AVItemType>01</AVItemType></AVItem>' +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">A Film</TitleText></TitleElement></TitleDetail></ContentItem>';
    const grouped = (isbn: string, items: string) =>
      productXml(isbn)
        .replace('<PublishingDetail>', `<ContentDetail>${items}</ContentDetail><PublishingDetail>`)
        .replace(
          '</Product>',
          '<RelatedMaterial><RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/grouped</IDValue></WorkIdentifier></RelatedWork></RelatedMaterial></Product>',
        );

    const agreeing = await parseWith([grouped('9781800000018', chapter('1')), grouped('9781800000025', chapter('1'))]);
    const withFilm = await parseWith([
      grouped('9781800000018', chapter('1')),
      grouped('9781800000025', `${chapter('1')}${film}`),
    ]);
    const reordered = await parseWith([grouped('9781800000018', chapter('1')), grouped('9781800000025', chapter('2'))]);

    expect(agreeing.result.data.onix?.groups[0].conflictingFields).toEqual([]);
    // Only the representative Product's components are planned, so another that states more, or states them
    // differently, is a disagreement - never a component quietly dropped or a position quietly taken from one of them.
    expect(withFilm.result.data.onix?.groups[0].conflictingFields).toContain('components');
    expect(reordered.result.data.onix?.groups[0].conflictingFields).toContain('components');
  });

  it('compares grouped manifestations by the components they state, never by where the file puts them (thoth-app#223)', async () => {
    const component = ({
      lsn,
      type = '03',
      text,
      inner = '',
    }: {
      lsn?: string;
      type?: string;
      text: string;
      inner?: string;
    }) =>
      `<ContentItem>${lsn === undefined ? '' : `<LevelSequenceNumber>${lsn}</LevelSequenceNumber>`}` +
      `<TextItem><TextItemType>${type}</TextItemType>${inner}</TextItem>` +
      `<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">${text}</TitleText></TitleElement></TitleDetail></ContentItem>`;
    const film =
      '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><AVItem><AVItemType>01</AVItemType></AVItem>' +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">A Film</TitleText></TitleElement></TitleDetail></ContentItem>';
    const body = (
      pages = '<PageRun><FirstPageNumber>13</FirstPageNumber><LastPageNumber>40</LastPageNumber></PageRun>',
    ) =>
      component({
        lsn: '2',
        text: 'The Body',
        inner: `<TextItemIdentifier><TextItemIDType>06</TextItemIDType><IDValue>10.1234/body</IDValue></TextItemIdentifier>${pages}<NumberOfPages>28</NumberOfPages>`,
      });
    const front = component({ lsn: '1', type: '02', text: 'The Front' });
    const grouped = (isbn: string, items: string[]) =>
      productXml(isbn)
        .replace('<PublishingDetail>', `<ContentDetail>${items.join('')}</ContentDetail><PublishingDetail>`)
        .replace(
          '</Product>',
          '<RelatedMaterial><RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/grouped</IDValue></WorkIdentifier></RelatedWork></RelatedMaterial></Product>',
        );
    const conflicts = async (first: string[], second: string[]) =>
      (await parseWith([grouped('9781800000018', first), grouped('9781800000025', second)])).result.data.onix?.groups[0]
        .conflictingFields;

    // The same explicitly numbered components in opposite XML order are the same components.
    const reversed = await parseWith([
      grouped('9781800000018', [front, body(), film]),
      grouped('9781800000025', [film, body(), front]),
    ]);

    expect(reversed.result.data.onix?.groups).toHaveLength(1);
    expect(reversed.result.data.onix?.groups[0].conflictingFields).toEqual([]);
    expect(reversed.result.data.plan.works).toHaveLength(1);
    // Only the representative's chapters are planned, in its own file order.
    expect(reversed.result.data.plan.chapters.map(({ firstPage }) => firstPage)).toEqual(['', '13']);

    // Every component counts, however many state the same: a repeated one is never collapsed into one.
    const unnumbered = component({ text: 'Untitled' });

    expect(await conflicts([unnumbered, unnumbered], [unnumbered, unnumbered])).toEqual([]);
    expect(await conflicts([unnumbered, unnumbered], [unnumbered])).toContain('components');

    // A real difference in any one component still conflicts, whatever the order.
    expect(
      await conflicts([front, body()], [body('<PageRun><FirstPageNumber>13</FirstPageNumber></PageRun>'), front]),
    ).toContain('components');
    expect(
      await conflicts([front, body()], [body(), component({ lsn: '1', type: '03', text: 'The Front' })]),
    ).toContain('components');
    expect(
      await conflicts([front, body()], [body(), component({ lsn: '3', type: '02', text: 'The Front' })]),
    ).toContain('components');
    expect(
      await conflicts([front, body()], [body(), component({ lsn: '1.1', type: '02', text: 'The Front' })]),
    ).toContain('components');
    expect(await conflicts([front, body()], [body().replace('10.1234/body', '10.1234/other'), front])).toEqual(
      expect.arrayContaining(['chapters', 'components']),
    );
    // And each chapter is compared with the one stating the same component: two positions that swap their titles differ.
    expect(
      await conflicts(
        [component({ lsn: '1', text: 'One' }), component({ lsn: '2', text: 'Two' })],
        [component({ lsn: '2', text: 'One' }), component({ lsn: '1', text: 'Two' })],
      ),
    ).toEqual(['chapterDescriptions']);
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

/**
 * thoth-app#215. The adapter decides nothing about supply, prices or Publication Locations: every ProductSupply fact is
 * the canonical commercial reduction's, which the resolver applies to the Publications it plans. A candidate Publication
 * therefore carries no Price and no Location, whatever the record's ProductSupply states.
 */
describe('XMLParser: no commercial decision of its own (thoth-app#215)', () => {
  const IMPRINT = { label: 'Supply Press', value: '77777777-7777-7777-7777-777777777777' };

  const productXml = (isbn: string, form: string, supply: string) =>
    `<Product><RecordReference>${isbn}</RecordReference><NotificationType>03</NotificationType>` +
    `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
    `<DescriptiveDetail><ProductComposition>00</ProductComposition>${form}` +
    '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText language="eng">A Work</TitleText></TitleElement></TitleDetail></DescriptiveDetail>' +
    `<PublishingDetail><Imprint><ImprintName>${IMPRINT.label}</ImprintName></Imprint><PublishingStatus>02</PublishingStatus></PublishingDetail>` +
    `${supply}</Product>`;
  const supplier =
    '<Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName>' +
    '<Website><WebsiteRole>02</WebsiteRole><WebsiteLink>https://supplier.example.com/a</WebsiteLink></Website>' +
    '<Website><WebsiteRole>29</WebsiteRole><WebsiteLink>https://supplier.example.com/a.epub</WebsiteLink></Website></Supplier>';

  it('builds every candidate Publication with no Price and no Location, and raises nothing about a currency or an amount', async () => {
    const xml = parse(
      `<ONIXMessage release="3.0" xmlns="http://ns.editeur.org/onix/3.0/reference"><Header><Sender><SenderName>Supply Press</SenderName></Sender><SentDateTime>20260917</SentDateTime></Header>` +
        productXml(
          '9781800000018',
          '<ProductForm>BC</ProductForm>',
          `<ProductSupply><Market><Territory><RegionsIncluded>JSTOR</RegionsIncluded></Territory></Market><SupplyDetail>${supplier}<ProductAvailability>20</ProductAvailability>` +
            '<Price><PriceType>02</PriceType><PriceAmount>20.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>' +
            '<Price><PriceType>02</PriceType><PriceAmount>150000</PriceAmount><CurrencyCode>SLE</CurrencyCode></Price></SupplyDetail></ProductSupply>',
        ) +
        // The University of London Press digital shape: an unpriced reason and no amount, which is never a zero price.
        productXml(
          '9781800000025',
          '<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>',
          `<ProductSupply><SupplyDetail>${supplier}<ProductAvailability>10</ProductAvailability>` +
            '<Price><PriceType>02</PriceType><PriceQualifier>05</PriceQualifier><PriceStatus>00</PriceStatus><UnpricedItemType>01</UnpricedItemType><CurrencyCode>GBP</CurrencyCode></Price>' +
            '</SupplyDetail></ProductSupply>',
        ) +
        '</ONIXMessage>',
    ) as ExtendedONIXMessageRoot;

    const result = await new XMLParser(
      xml,
      [IMPRINT],
      licenseOptions,
      [],
      {
        getContributors: vi.fn().mockResolvedValue([]),
        getContributorsByOrcids: vi.fn().mockResolvedValue([]),
      } as unknown as ContributorService,
      { getInstitutions: vi.fn().mockResolvedValue([]) } as unknown as InstitutionService,
      languageOptions,
      currencyOptions,
    ).parse();
    const candidates = (result.data.onix?.groups ?? []).flatMap(({ publications }) =>
      Object.values(publications).flatMap((byType) => Object.values(byType)),
    );

    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);
    expect(candidates).toHaveLength(2);
    expect(
      candidates.map((candidate) => [
        candidate?.publication.prices,
        candidate?.publication.locations,
        candidate?.issues,
      ]),
    ).toEqual([
      [[], [], []],
      [[], [], []],
    ]);
    expect(
      result.data.plan.works.flatMap(({ publications }) =>
        publications.map(({ prices, locations }) => [prices, locations]),
      ),
    ).toEqual([
      [[], []],
      [[], []],
    ]);
  });
});
