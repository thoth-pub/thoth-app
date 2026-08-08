/* eslint-disable simple-import-sort/imports */
import { parse } from '@5stones/onix';
import {
  CollectionType,
  LanguageRole,
  MeasureType,
  MeasureUnit,
  ProductForm,
  ProductIdentifierType,
  PublishingDateRole,
  TextType,
  TitleElementLevel,
  TitleType,
  WebsiteRole,
} from '@5stones/onix/dist/enums';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContributorService } from '@/src/entities/contributor';
import { InstitutionService } from '@/src/entities/institution';
import { SeriesEntity } from '@/src/entities/series/model/series.types';

import { LanguageCode } from '@/gql/graphql';
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
import {
  ExtendedCollection,
  ExtendedDescriptiveDetail,
  ExtendedONIXMessageRoot,
  ExtendedProduct,
  ExtendedProductSupply,
  ExtendedPublishingDetail,
} from './interfaces';
import XMLParser from './XMLParser';

/**
 * The messages of a result's error issues, in the order the parser reported them. Structured
 * issues are asserted directly where the structure is the point; elsewhere the wording and the
 * order are what these tests are about.
 */
const errorMessages = (result: Awaited<ReturnType<XMLParser['parse']>>) =>
  result.issues.filter(({ severity }) => severity === 'error').map(({ message }) => message);

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

    it('should parse license', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const license = licenses[0];
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                EpubLicense: { EpubLicenseExpression: { EpubLicenseExpressionLink: license.value } },
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
      expect(result.data.plan.works[0].license).toBe(license.value);
    });

    it('should return error if license is not found', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const license = faker.string.sample();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                EpubLicense: { EpubLicenseExpression: { EpubLicenseExpressionLink: license } },
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

      expect(result.status).toBe('failed');
      expect(result.data.plan.works).toHaveLength(0);
      expect(errorMessages(result)).toContain(`License ${license} not found for product 1`);
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
                PublishingStatus: '04',
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
      expect(result.data.plan.works[0].publicationDate).toBe(publicationDate);
      expect(result.data.plan.works[0].withdrawnDate).toBe(withdrawnDate);
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

    it('should return empty subjects if not provided', async () => {
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
      expect(result.data.plan.works[0].subjects).toEqual([]);
    });

    it('should parse llc subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                Subject: [
                  {
                    SubjectSchemeIdentifier: '04',
                    SubjectHeadingText: subjectText,
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
      expect(result.data.plan.works[0].subjects).toHaveLength(1);
      expect(result.data.plan.works[0].subjects[0].code).toBe(subjectText);
      expect(result.data.plan.works[0].subjects[0].type).toBe(SubjectTypes.enum.Lcc);
      expect(result.data.plan.works[0].subjects[0].ordinal).toBe(1);
    });

    it('should parse bisac subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                Subject: [
                  {
                    SubjectSchemeIdentifier: '10',
                    SubjectHeadingText: subjectText,
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
      expect(result.data.plan.works[0].subjects).toHaveLength(1);
      expect(result.data.plan.works[0].subjects[0].code).toBe(subjectText);
      expect(result.data.plan.works[0].subjects[0].type).toBe(SubjectTypes.enum.Bisac);
      expect(result.data.plan.works[0].subjects[0].ordinal).toBe(1);
    });

    it('should parse bic subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                Subject: [
                  {
                    SubjectSchemeIdentifier: '12',
                    SubjectHeadingText: subjectText,
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
      expect(result.data.plan.works[0].subjects).toHaveLength(1);
      expect(result.data.plan.works[0].subjects[0].code).toBe(subjectText);
      expect(result.data.plan.works[0].subjects[0].type).toBe(SubjectTypes.enum.Bic);
      expect(result.data.plan.works[0].subjects[0].ordinal).toBe(1);
    });

    it('should parse keyword subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                Subject: [
                  {
                    SubjectSchemeIdentifier: '20',
                    SubjectHeadingText: subjectText,
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
      expect(result.data.plan.works[0].subjects).toHaveLength(1);
      expect(result.data.plan.works[0].subjects[0].code).toBe(subjectText);
      expect(result.data.plan.works[0].subjects[0].type).toBe(SubjectTypes.enum.Keyword);
      expect(result.data.plan.works[0].subjects[0].ordinal).toBe(1);
    });

    it('should parse thema subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                Subject: [
                  {
                    SubjectSchemeIdentifier: '93',
                    SubjectHeadingText: subjectText,
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
      expect(result.data.plan.works[0].subjects).toHaveLength(1);
      expect(result.data.plan.works[0].subjects[0].code).toBe(subjectText);
      expect(result.data.plan.works[0].subjects[0].type).toBe(SubjectTypes.enum.Thema);
      expect(result.data.plan.works[0].subjects[0].ordinal).toBe(1);
    });

    it('should parse custom subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                Subject: [
                  {
                    SubjectSchemeIdentifier: 'B2',
                    SubjectHeadingText: subjectText,
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
      expect(result.data.plan.works[0].subjects).toHaveLength(1);
      expect(result.data.plan.works[0].subjects[0].code).toBe(subjectText);
      expect(result.data.plan.works[0].subjects[0].type).toBe(SubjectTypes.enum.Custom);
      expect(result.data.plan.works[0].subjects[0].ordinal).toBe(1);
    });

    it('should parse multiple subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText1 = faker.lorem.sentence();
      const subjectText2 = faker.lorem.sentence();
      const xml: ExtendedONIXMessageRoot = {
        ONIXMessage: {
          Product: [
            {
              DescriptiveDetail: {
                ProductForm: ProductForm._BC,
                TitleDetail: { TitleElement: { TitleText: title } },
                Language: { LanguageCode: language.value },
                Subject: [
                  {
                    SubjectSchemeIdentifier: 'B2',
                    SubjectHeadingText: subjectText1,
                  },
                  {
                    SubjectSchemeIdentifier: '04',
                    SubjectHeadingText: subjectText2,
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
      expect(result.data.plan.works[0].subjects).toHaveLength(2);
      expect(result.data.plan.works[0].subjects[0].code).toBe(subjectText2);
      expect(result.data.plan.works[0].subjects[0].type).toBe(SubjectTypes.enum.Lcc);
      expect(result.data.plan.works[0].subjects[0].ordinal).toBe(1);
      expect(result.data.plan.works[0].subjects[1].code).toBe(subjectText1);
      expect(result.data.plan.works[0].subjects[1].type).toBe(SubjectTypes.enum.Custom);
      expect(result.data.plan.works[0].subjects[1].ordinal).toBe(2);
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
      const citedDoi = faker.string.sample();
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
                    WorkIdentifier: { WorkIDType: '06', IDValue: faker.string.sample() },
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
      expect(result.data.plan.works[0].contributions).toHaveLength(2);
      expect(result.data.plan.works[0].contributions[0].fullName).toBe(contributorFullName);
      expect(result.data.plan.works[0].contributions[1].fullName).toBe(mockContributor.fullName);

      const workId = result.data.plan.works[0].id as WorkId;
      const contributorsForSelection = result.data.contributorsForSelection as ContributorsForSelection;
      const workContributorsForSelection = contributorsForSelection[workId];

      expect(Object.values(workContributorsForSelection)[0].length).toBe(2);
    });

    it('should parse chapters', async () => {
      const chapterTitle = faker.lorem.sentence();
      const title = faker.lorem.sentence();
      const language = languages[0].value;
      const imprint = imprints[0];
      const chapterDoi = faker.string.sample();
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
      titleDetails = '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Beowulf by All</TitleText></TitleElement></TitleDetail>',
      languages:
        productLanguages = '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>',
      collateralDetail = '',
      collection = '',
      relatedMaterial = '',
    }: {
      titleDetails?: string;
      languages?: string;
      collateralDetail?: string;
      collection?: string;
      relatedMaterial?: string;
    }) => `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="3.0">
  <Product>
    <RecordReference>9781641891783</RecordReference>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781641891783</IDValue></ProductIdentifier>
    <DescriptiveDetail>
      <ProductForm>BC</ProductForm>
      ${collection}
      ${titleDetails}
      ${productLanguages}
    </DescriptiveDetail>
    ${collateralDetail}
    <PublishingDetail>
      <Imprint><ImprintName>${FIDELITY_IMPRINT.label}</ImprintName></Imprint>
      <PublishingStatus>04</PublishingStatus>
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
        // What Thoth exports for a reference that has no DOI.
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

      it('never creates the resolver on its own as a DOI', async () => {
        const result = await runFidelityParser(
          productXml({
            relatedMaterial: relatedMaterialXml(`<RelatedProduct>
              <ProductRelationCode>34</ProductRelationCode>
              <ProductIdentifier><ProductIDType>01</ProductIDType><IDValue>Some citation text</IDValue></ProductIdentifier>
            </RelatedProduct>
            <RelatedProduct>
              <ProductRelationCode>06</ProductRelationCode>
              <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781802700000</IDValue></ProductIdentifier>
            </RelatedProduct>`),
          }),
        );

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
              'A cited work in product 1 (9781641891783) carries no DOI or citation text, so its citation metadata could not be represented and the reference was skipped',
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
       * other ISBN of the same book as relation 06, and a reference as relation 34.
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
              <ProductIDType>06</ProductIDType><IDValue>https://doi.org/10.1234/cited</IDValue>
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
