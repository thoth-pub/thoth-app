/* eslint-disable simple-import-sort/imports */
import {
  ProductForm,
  ProductIdentifierType,
  PublishingDateRole,
  TextType,
  WebsiteRole,
} from '@5stones/onix/dist/enums';
import { ONIXMessageRoot } from '@5stones/onix/dist/interfaces';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LanguageCode } from '@/gql/graphql';
import { ContributorService } from '@/src/entities/contributor';
import { InstitutionService } from '@/src/entities/institution';
import { SeriesEntity } from '@/src/entities/series/model/series.types';

import XMLParser from './XMLParser';
import { currencyOptions, languageOptions, licenseOptions } from '../../constants/formFields';
import { SeriesType } from '../../constants/series';
import { ExtendedDescriptiveDetail, ExtendedPublishingDetail } from './interfaces';
import { appConfig, LanguageTypeAlt, SubjectTypes, WorkStatuses } from '../..';
import { AbstractTypes } from '../../constants/abstracts';

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
        imprintId: faker.string.uuid(),
        imprintName: faker.company.name(),
        url: faker.internet.url(),
        description: faker.lorem.sentence(),
        issues: [],
      },
    ];
  });

  describe('parse', () => {
    it('should return failed status if products are empty in XML', async () => {
      const xml: ONIXMessageRoot = {
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
      expect(result.errors).toContain('No products found in XML file');
      expect(result.data.works).toHaveLength(0);
      expect(result.data.chapters).toHaveLength(0);
      expect(result.data.series).toEqual({});
    });

    it('should return failed status if products not found in XML', async () => {
      const xml: ONIXMessageRoot = {
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
      expect(result.errors).toContain('No products found in XML file');
      expect(result.data.works).toHaveLength(0);
      expect(result.data.chapters).toHaveLength(0);
      expect(result.data.series).toEqual({});
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

      const xml: ONIXMessageRoot = {
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
      expect(result.errors).toHaveLength(0);
      expect(result.data.works).toHaveLength(1);
      const work = result.data.works[0];
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
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works).toHaveLength(2);
      expect(result.data.works[0].titles[0].title).toBe(title1);
      expect(result.data.works[1].titles[0].title).toBe(title2);
      expect(result.data.works[0].doi).toContain(doi1);
      expect(result.data.works[1].doi).toContain(doi2);
      expect(result.data.works[0].languages).toHaveLength(1);
      expect(result.data.works[0].languages[0].code).toBe(language1.value as LanguageCode);
      expect(result.data.works[1].languages).toHaveLength(1);
      expect(result.data.works[1].languages[0].code).toBe(language2.value as LanguageCode);
    });

    it('should fail when imprint is not found', async () => {
      const language = languages[0];
      const imprint = faker.company.name();
      const xml: ONIXMessageRoot = {
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
      expect(result.errors).toContain(`Imprint ${imprint} not found for product 1`);
    });

    it('should fail when language is not found', async () => {
      const language = faker.string.sample();
      const xml: ONIXMessageRoot = {
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
      expect(result.errors.some((e) => e.includes(`Language ${language} not found`))).toBe(true);
    });
  });

  describe('specific fields', () => {
    it('should parse DOI with prefix', async () => {
      const prefix = appConfig.validations.doiPrefix;
      const doi = '10.12345/123';
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].doi).toContain(`${prefix}${doi}`);
    });

    it('doi should be empty if not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].doi).toEqual('');
    });

    it('should parse lccn', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const lccn = '2017123456';
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].lccn).toEqual(lccn);
    });

    it('should parse oclc', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const oclc = '1086123456';
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].oclc).toEqual(oclc);
    });

    it('should parse title and subtitle', async () => {
      const title = faker.lorem.sentence();
      const subtitle = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].titles[0].title).toBe(title);
      expect(result.data.works[0].titles[0].subtitle).toBe(subtitle);
      expect(result.data.works[0].titles[0].fullTitle).toBe(`${title} ${subtitle}`);
      expect(result.data.works[0].titles[0].localeCode).toBe(LanguageTypeAlt.enum.En);
    });

    it('should parse title if subtitle is not provided', async () => {
      const title = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].titles[0].title).toBe(title);
      expect(result.data.works[0].titles[0].subtitle).toEqual('');
      expect(result.data.works[0].titles[0].fullTitle).toBe(title);
      expect(result.data.works[0].titles[0].localeCode).toBe(LanguageTypeAlt.enum.En);
    });

    it('should parse abstracts', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const longAbstract = faker.lorem.sentence();
      const shortAbstract = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].abstracts).toHaveLength(2);
      expect(result.data.works[0].abstracts[0].content).toBe(longAbstract);
      expect(result.data.works[0].abstracts[0].type).toBe(AbstractTypes.enum.Long);
      expect(result.data.works[0].abstracts[0].canonical).toBe(true);
      expect(result.data.works[0].abstracts[0].localeCode).toBe(LanguageTypeAlt.enum.En);
      expect(result.data.works[0].abstracts[1].content).toBe(shortAbstract);
      expect(result.data.works[0].abstracts[1].type).toBe(AbstractTypes.enum.Short);
      expect(result.data.works[0].abstracts[1].canonical).toBe(false);
      expect(result.data.works[0].abstracts[1].localeCode).toBe(LanguageTypeAlt.enum.En);
    });

    it('should parse long abstract if short abstract is not provided', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const longAbstract = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].abstracts).toHaveLength(1);
      expect(result.data.works[0].abstracts[0].content).toBe(longAbstract);
      expect(result.data.works[0].abstracts[0].type).toBe(AbstractTypes.enum.Long);
      expect(result.data.works[0].abstracts[0].canonical).toBe(true);
      expect(result.data.works[0].abstracts[0].localeCode).toBe(LanguageTypeAlt.enum.En);
    });

    it('should parse short abstract if long abstract is not provided', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const shortAbstract = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].abstracts).toHaveLength(1);
      expect(result.data.works[0].abstracts[0].content).toBe(shortAbstract);
      expect(result.data.works[0].abstracts[0].type).toBe(AbstractTypes.enum.Short);
      expect(result.data.works[0].abstracts[0].canonical).toBe(false);
      expect(result.data.works[0].abstracts[0].localeCode).toBe(LanguageTypeAlt.enum.En);
    });

    it('abstracts should be empty if not provided', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].abstracts).toHaveLength(0);
    });

    it('should parse license', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const license = licenses[0];
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].license).toBe(license.value);
    });

    it('should return error if license is not found', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const license = faker.string.sample();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works).toHaveLength(0);
      expect(result.errors).toContain(`License ${license} not found for product 1`);
    });

    it('should parse bibliography note', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const bibliographyNote = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].bibliographyNote).toBe(bibliographyNote);
    });

    it('should return empty bibliography note if not provided', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].bibliographyNote).toEqual('');
    });

    it('should parse general note', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const generalNote = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].generalNote).toBe(generalNote);
    });

    it('should return empty general note if not provided', async () => {
      const language = languages[0];
      const imprint = imprints[0];
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].bibliographyNote).toEqual('');
    });

    it('should parse edition number', async () => {
      const language = languages[0];
      const edition = faker.number.int(10);
      const imprint = imprints[0];
      const title = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].edition).toBe(edition);
    });

    it('should default edition to 1 when not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].edition).toBe(1);
    });

    it('should parse page count', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const pageCount = faker.number.int(1000);
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].pageCount).toBe(pageCount);
    });

    it('should parse media counts', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const imageCount = faker.number.int(1);
      const tableCount = faker.number.int(2);
      const audioCount = faker.number.int(3);
      const videoCount = faker.number.int(4);
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].imageCount).toBe(imageCount);
      expect(result.data.works[0].tableCount).toBe(tableCount);
      expect(result.data.works[0].audioCount).toBe(audioCount);
      expect(result.data.works[0].videoCount).toBe(videoCount);
    });

    it('should parse forthcoming work status', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const workStatus = '02';
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].status).toBe(WorkStatuses.enum.Forthcoming);
    });

    it('should parse cancelled work status', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const workStatus = '01';
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].status).toBe(WorkStatuses.enum.Cancelled);
    });

    it('should parse active work status', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const workStatus = '04';
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].status).toBe(WorkStatuses.enum.Active);
    });

    it('should parse withdrawn work status', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const workStatus = '16';
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].status).toBe(WorkStatuses.enum.Withdrawn);
    });

    it('should parse superseded work status', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const workStatus = '21';
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].status).toBe(WorkStatuses.enum.Superseded);
    });

    it('should set work status to forthcoming if invalid work status is provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const workStatus = '000000';
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].status).toBe(WorkStatuses.enum.Forthcoming);
    });

    it('should set work status to forthcoming if not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].status).toBe(WorkStatuses.enum.Forthcoming);
    });

    it('should parse publication and withdrawn dates', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const publicationDate = '20240101';
      const withdrawnDate = '20250101';
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].publicationDate).toBe(publicationDate);
      expect(result.data.works[0].withdrawnDate).toBe(withdrawnDate);
    });

    it('should return empty publication and withdrawn dates if not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].publicationDate).toEqual('');
      expect(result.data.works[0].withdrawnDate).toEqual('');
    });

    it('should parse copyright holder', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const copyrightHolder = faker.person.fullName();
      const imprint = imprints[0];
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].copyrightHolder).toBe(copyrightHolder);
    });

    it('should return empty copyright holder if not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].copyrightHolder).toEqual('');
    });

    it('should parse landing page', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const landingPage = faker.internet.url();
      const imprint = imprints[0];
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].landingPage).toBe(landingPage);
    });

    it('should return empty landing page if not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].landingPage).toEqual('');
    });

    it('should return empty subjects if not provided', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].subjects).toEqual([]);
    });

    it('should parse llc subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].subjects).toHaveLength(1);
      expect(result.data.works[0].subjects[0].code).toBe(subjectText);
      expect(result.data.works[0].subjects[0].type).toBe(SubjectTypes.enum.Lcc);
      expect(result.data.works[0].subjects[0].ordinal).toBe(1);
    });

    it('should parse bisac subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].subjects).toHaveLength(1);
      expect(result.data.works[0].subjects[0].code).toBe(subjectText);
      expect(result.data.works[0].subjects[0].type).toBe(SubjectTypes.enum.Bisac);
      expect(result.data.works[0].subjects[0].ordinal).toBe(1);
    });

    it('should parse bic subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].subjects).toHaveLength(1);
      expect(result.data.works[0].subjects[0].code).toBe(subjectText);
      expect(result.data.works[0].subjects[0].type).toBe(SubjectTypes.enum.Bic);
      expect(result.data.works[0].subjects[0].ordinal).toBe(1);
    });

    it('should parse keyword subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].subjects).toHaveLength(1);
      expect(result.data.works[0].subjects[0].code).toBe(subjectText);
      expect(result.data.works[0].subjects[0].type).toBe(SubjectTypes.enum.Keyword);
      expect(result.data.works[0].subjects[0].ordinal).toBe(1);
    });

    it('should parse thema subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].subjects).toHaveLength(1);
      expect(result.data.works[0].subjects[0].code).toBe(subjectText);
      expect(result.data.works[0].subjects[0].type).toBe(SubjectTypes.enum.Thema);
      expect(result.data.works[0].subjects[0].ordinal).toBe(1);
    });

    it('should parse custom subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].subjects).toHaveLength(1);
      expect(result.data.works[0].subjects[0].code).toBe(subjectText);
      expect(result.data.works[0].subjects[0].type).toBe(SubjectTypes.enum.Custom);
      expect(result.data.works[0].subjects[0].ordinal).toBe(1);
    });

    it('should parse multiple subjects', async () => {
      const language = languages[0];
      const title = faker.lorem.sentence();
      const imprint = imprints[0];
      const subjectText1 = faker.lorem.sentence();
      const subjectText2 = faker.lorem.sentence();
      const xml: ONIXMessageRoot = {
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
      expect(result.data.works[0].subjects).toHaveLength(2);
      expect(result.data.works[0].subjects[0].code).toBe(subjectText2);
      expect(result.data.works[0].subjects[0].type).toBe(SubjectTypes.enum.Lcc);
      expect(result.data.works[0].subjects[0].ordinal).toBe(1);
      expect(result.data.works[0].subjects[1].code).toBe(subjectText1);
      expect(result.data.works[0].subjects[1].type).toBe(SubjectTypes.enum.Custom);
      expect(result.data.works[0].subjects[1].ordinal).toBe(2);
    });
  });
});
