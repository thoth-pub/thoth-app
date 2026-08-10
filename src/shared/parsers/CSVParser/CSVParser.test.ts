import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';

import { ContributorService } from '@/src/entities/contributor';
import { InstitutionService } from '@/src/entities/institution';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { appConfig } from '@/src/shared/config';
import { licenseOptions } from '@/src/shared/constants/formFields';

import CSVParser from './CSVParser';
import { getCsvConfig } from './getCsvConfig';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const IMPRINT_LABEL = 'My Publisher';
const IMPRINT_VALUE = 'pub-id';
const OTHER_IMPRINT_LABEL = 'Other Publisher';
const OTHER_IMPRINT_VALUE = 'pub-id-2';
const SERIES_NAME = 'My Series Name';
const SERIES_ISSN = '1122-1122';
const SERIES_ID = 'series-id-1';

const imprints = [
  { label: IMPRINT_LABEL, value: IMPRINT_VALUE },
  { label: OTHER_IMPRINT_LABEL, value: OTHER_IMPRINT_VALUE },
];

const makeSeries = (series: Partial<SeriesEntity> & Pick<SeriesEntity, 'id' | 'name'>): SeriesEntity => ({
  type: 'BOOK_SERIES' as SeriesEntity['type'],
  issnPrint: '',
  issnDigital: '',
  updatedAt: '',
  imprintId: IMPRINT_VALUE,
  imprintName: IMPRINT_LABEL,
  url: '',
  cfpUrl: '',
  description: '',
  issues: [],
  ...series,
});

const makeIssues = (ordinals: number[]) =>
  ordinals.map((ordinal) => ({
    id: `issue-${ordinal}`,
    ordinal,
    workId: `work-${ordinal}`,
    title: 'Existing',
    seriesId: SERIES_ID,
    coverUrl: '',
  }));

const testSeries: SeriesEntity[] = [makeSeries({ id: SERIES_ID, name: SERIES_NAME, issnPrint: SERIES_ISSN })];

const t = (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key);

const makeFile = (content: string) => new File([content], 'test.csv', { type: 'text/csv' });

const makeParser = (
  file: File,
  opts: {
    series?: SeriesEntity[];
    contributorResults?: object[];
    institutionResults?: object[];
    getContributors?: (fullName: string) => Promise<object[]>;
    getInstitutions?: (offset: number, limit: number, filter: string) => Promise<object[]>;
  } = {},
) => {
  const series = opts.series ?? testSeries;
  const config = getCsvConfig(imprints, licenseOptions, t);
  const getContributors = opts.getContributors ?? vi.fn().mockResolvedValue(opts.contributorResults ?? []);
  const getInstitutions = opts.getInstitutions ?? vi.fn().mockResolvedValue(opts.institutionResults ?? []);

  return new CSVParser(
    file,
    config,
    imprints,
    licenseOptions,
    series,
    { getContributors } as unknown as ContributorService,
    { getInstitutions } as unknown as InstitutionService,
    t,
  );
};

/**
 * The messages of a result's error issues, in the order the parser reported them. Structured
 * issues are asserted directly where the structure is the point; elsewhere the wording and the
 * order are what these tests are about.
 */
const errorMessages = (result: Awaited<ReturnType<CSVParser['parse']>>) =>
  result.issues.filter(({ severity }) => severity === 'error').map(({ message }) => message);

const escapeCell = (value: string) =>
  value.includes(',') || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value;

// Builds a full 223-column CSV in getCsvConfig header order.
// Supply only the columns you want; the rest are filled with empty strings.
const buildCsvRows = (rows: Record<string, string>[]) => {
  const headers = getCsvConfig(imprints, licenseOptions, t).headers.map((h) => h.name);

  return [
    headers.join(','),
    ...rows.map((values) => headers.map((name) => escapeCell(values[name] ?? '')).join(',')),
  ].join('\n');
};

const buildCsv = (values: Record<string, string>) => buildCsvRows([values]);

// Minimum required fields for a valid row
const BASE: Record<string, string> = {
  imprint: IMPRINT_LABEL,
  work_type: 'EDITED_BOOK',
  work_status: 'ACTIVE',
  title: 'Test Book',
};

// Minimal template header matching the downloadable template structure
const TEMPLATE_HEADER =
  'publisher,work_type,work_status,title,subtitle,edition,publication_date,withdrawn_date,' +
  'place_of_publication,cover_url,doi,page_count,page_breakdown,image_count,table_count,' +
  'audio_count,video_count,license,copyright_holder,landing_page,short_abstract,long_abstract,' +
  'contribution_1_first_name,contribution_1_surname,contribution_1_role,contribution_1_biography,' +
  'contribution_1_orcid,contribution_1_website,contribution_1_affiliation_position,' +
  'contribution_1_affiliation_institution_name,contribution_1_affiliation_institution_ror,' +
  'contribution_2_first_name,contribution_2_surname,contribution_2_role,contribution_2_biography,' +
  'contribution_2_orcid,contribution_2_website,contribution_2_affiliation_position,' +
  'contribution_2_affiliation_institution_name,contribution_2_affiliation_institution_ror,' +
  'contribution_3_first_name,contribution_3_surname,contribution_3_role,contribution_3_biography,' +
  'contribution_3_orcid,contribution_3_website,contribution_3_affiliation_position,' +
  'contribution_3_affiliation_institution_name,contribution_3_affiliation_institution_ror,' +
  'contribution_4_first_name,contribution_4_surname,contribution_4_role,contribution_4_biography,' +
  'contribution_4_orcid,contribution_4_website,contribution_4_affiliation_position,' +
  'contribution_4_affiliation_institution_name,contribution_4_affiliation_institution_ror,' +
  'contribution_5_first_name,contribution_5_surname,contribution_5_role,contribution_5_biography,' +
  'contribution_5_orcid,contribution_5_website,contribution_5_affiliation_position,' +
  'contribution_5_affiliation_institution_name,contribution_5_affiliation_institution_ror,' +
  'original_language,translated_from_language,translated_into_language,' +
  'thema_subjects,bic_subjects,bisac_subjects,keywords,' +
  'publication_paperback_isbn,publication_paperback_price_1_currency_code,publication_paperback_price_1_unit_price,' +
  'publication_paperback_price_2_currency_code,publication_paperback_price_2_unit_price,' +
  'publication_hardback_isbn,publication_hardback_price_1_currency_code,publication_hardback_price_1_unit_price,' +
  'publication_hardback_price_2_currency_code,publication_hardback_price_2_unit_price,' +
  'publication_pdf_isbn,publication_pdf_location_landing_page,publication_pdf_location_full_text_url,' +
  'publication_pdf_location_platform,' +
  'publication_epub_isbn,publication_epub_location_landing_page,publication_epub_location_full_text_url,' +
  'publication_epub_location_platform,' +
  'series_name,series_issn,series_issue_number';

const makeTemplateDataRow = (imprintValue: string) => {
  const cols = TEMPLATE_HEADER.split(',').length;
  const values: string[] = new Array(cols).fill('');
  values[0] = imprintValue;
  values[1] = 'EDITED_BOOK';
  values[2] = 'ACTIVE';
  values[3] = 'Test Book';
  return values.join(',');
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CSVParser', () => {
  // -------------------------------------------------------------------------
  // Header normalisation
  // -------------------------------------------------------------------------
  describe('header normalisation', () => {
    it('accepts "imprint" as the first column', async () => {
      const header = TEMPLATE_HEADER.replace(/^publisher/, 'imprint');
      const csv = makeFile(`${header}\n${makeTemplateDataRow(IMPRINT_LABEL)}`);
      const result = await makeParser(csv).parse();
      expect(errorMessages(result)).toEqual([]);
      expect(result.status).toBe('success');
    });

    it('accepts "publisher" as an alias for "imprint"', async () => {
      const csv = makeFile(`${TEMPLATE_HEADER}\n${makeTemplateDataRow(IMPRINT_LABEL)}`);
      const result = await makeParser(csv).parse();
      expect(errorMessages(result)).toEqual([]);
      expect(result.status).toBe('success');
    });

    it('trims headers and detects the publisher alias case-insensitively', async () => {
      const csv = makeFile(' title , work_status , PuBliShEr , work_type \nBook,ACTIVE,My Publisher,MONOGRAPH');
      const result = await makeParser(csv).parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].titles[0].title).toBe('Book');
    });

    it('rewrites arbitrary input order to schema order and ignores unknown extra columns', async () => {
      const csv = makeFile('title,unknown,work_status,work_type,imprint\nBook,ignored,ACTIVE,MONOGRAPH,My Publisher');
      const result = await makeParser(csv).parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0]).toMatchObject({ type: 'MONOGRAPH', status: 'ACTIVE' });
      expect(result.data.plan.works[0].titles[0].title).toBe('Book');
    });
  });

  // -------------------------------------------------------------------------
  // Optional columns
  // -------------------------------------------------------------------------
  describe('optional columns', () => {
    it('does not error when every contributor column after slot 1 is absent', async () => {
      const csv = makeFile('imprint,work_type,work_status,title\nMy Publisher,MONOGRAPH,ACTIVE,Book');
      const result = await makeParser(csv).parse();

      expect(result.status).toBe('success');
      expect(result.issues).toEqual([]);
    });

    it('does not error when contribution columns 6-20 are absent', async () => {
      const csv = makeFile(`${TEMPLATE_HEADER}\n${makeTemplateDataRow(IMPRINT_LABEL)}`);
      const result = await makeParser(csv).parse();
      const headerErrors = errorMessages(result).filter(
        (e) => e.includes('contribution_6') || e.includes('contribution_7'),
      );
      expect(headerErrors).toEqual([]);
    });

    it('does not error when lcc_subjects column is absent', async () => {
      const csv = makeFile(`${TEMPLATE_HEADER}\n${makeTemplateDataRow(IMPRINT_LABEL)}`);
      const result = await makeParser(csv).parse();
      expect(errorMessages(result).filter((e) => e.includes('lcc_subjects'))).toEqual([]);
    });

    it('does not error when extra epub and price_2 columns are present', async () => {
      const csv = makeFile(`${TEMPLATE_HEADER}\n${makeTemplateDataRow(IMPRINT_LABEL)}`);
      const result = await makeParser(csv).parse();
      expect(errorMessages(result)).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Template data — the downloadable template must parse successfully
  // -------------------------------------------------------------------------
  describe('template data', () => {
    it('parses the downloadable template file without errors', async () => {
      const templatePath = join(process.cwd(), 'public/templates/template.csv');
      const content = readFileSync(templatePath, 'utf-8');
      const file = makeFile(content);
      const result = await makeParser(file).parse();
      expect(errorMessages(result)).toEqual([]);
      expect(result.status).toBe('success');
      expect(result.data.plan.works).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Titles
  // -------------------------------------------------------------------------
  describe('titles', () => {
    it('creates a canonical title when only title is provided', async () => {
      const csv = buildCsv({ ...BASE, title: 'Only Title' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      const work = result.data.plan.works[0];
      expect(work.titles).toHaveLength(1);
      expect(work.titles[0]).toMatchObject({ canonical: true, title: 'Only Title', subtitle: '' });
    });

    it('includes subtitle in fullTitle when both are provided', async () => {
      const csv = buildCsv({ ...BASE, title: 'Main Title', subtitle: 'The Subtitle' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      const title = result.data.plan.works[0].titles[0];
      expect(title.title).toBe('Main Title');
      expect(title.subtitle).toBe('The Subtitle');
      expect(title.fullTitle).toBe('Main Title: The Subtitle');
    });
  });

  describe('work fields', () => {
    it('imports place_of_publication directly into WorkEntity.place', async () => {
      const csv = buildCsv({ ...BASE, place_of_publication: 'Cambridge' });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].place).toBe('Cambridge');
    });
  });

  // -------------------------------------------------------------------------
  // Abstracts
  // -------------------------------------------------------------------------
  describe('abstracts', () => {
    it('parses a long abstract', async () => {
      const csv = buildCsv({ ...BASE, long_abstract: 'The long text.' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      const abstracts = result.data.plan.works[0].abstracts;
      expect(abstracts).toHaveLength(1);
      expect(abstracts[0]).toMatchObject({ content: 'The long text.', type: 'LONG' });
    });

    it('parses a short abstract', async () => {
      const csv = buildCsv({ ...BASE, short_abstract: 'The short text.' });
      const result = await makeParser(makeFile(csv)).parse();
      const abstracts = result.data.plan.works[0].abstracts;
      expect(abstracts).toHaveLength(1);
      expect(abstracts[0]).toMatchObject({ content: 'The short text.', type: 'SHORT' });
    });

    it('parses both long and short abstracts', async () => {
      const csv = buildCsv({ ...BASE, long_abstract: 'Long.', short_abstract: 'Short.' });
      const result = await makeParser(makeFile(csv)).parse();
      const abstracts = result.data.plan.works[0].abstracts;
      expect(abstracts).toHaveLength(2);
      expect(abstracts.find((a) => a.type === 'LONG')).toBeTruthy();
      expect(abstracts.find((a) => a.type === 'SHORT')).toBeTruthy();
    });

    it('produces no abstracts when both fields are empty', async () => {
      const csv = buildCsv({ ...BASE });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.data.plan.works[0].abstracts).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Page breakdown
  // -------------------------------------------------------------------------
  describe('page breakdown', () => {
    it('parses Roman-numeral frontmatter from page_breakdown', async () => {
      const csv = buildCsv({ ...BASE, page_breakdown: 'xxiv+278' });
      const result = await makeParser(makeFile(csv)).parse();
      const work = result.data.plan.works[0];
      expect(work.pageCount).toBe(278);
      expect(work.frontmatterCount).toBe(24);
    });

    it('falls back to page_count when page_breakdown is empty', async () => {
      const csv = buildCsv({ ...BASE, page_count: '150' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.data.plan.works[0].pageCount).toBe(150);
    });

    it('uses page_breakdown pageCount over explicit page_count', async () => {
      const csv = buildCsv({ ...BASE, page_breakdown: 'iv+100', page_count: '999' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.data.plan.works[0].pageCount).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // Imprint
  // -------------------------------------------------------------------------
  describe('imprint', () => {
    it('resolves the imprint id from the label', async () => {
      const csv = buildCsv({ ...BASE });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].imprintId).toBe(IMPRINT_VALUE);
    });

    it('returns failed status when the imprint label is not found', async () => {
      const csv = buildCsv({ ...BASE, imprint: 'Unknown Publisher' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('failed');
      expect(errorMessages(result).some((e) => e.includes('csvFieldNotValidOptions'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // License
  // -------------------------------------------------------------------------
  describe('license', () => {
    it('resolves a valid license URL', async () => {
      const licenseUrl = 'https://creativecommons.org/licenses/by-nc/4.0/';
      const csv = buildCsv({ ...BASE, license: licenseUrl });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].license).toBe(licenseUrl);
    });

    it('returns failed status for an unknown license URL', async () => {
      const csv = buildCsv({ ...BASE, license: 'https://unknown-license.example/' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('failed');
      expect(errorMessages(result).some((e) => e.includes('csvFieldNotValid'))).toBe(true);
    });

    it('allows an empty license field without error', async () => {
      const csv = buildCsv({ ...BASE, license: '' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].license).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Languages
  // -------------------------------------------------------------------------
  describe('languages', () => {
    it('adds an ORIGINAL language relation', async () => {
      const csv = buildCsv({ ...BASE, original_language: 'ENG' });
      const result = await makeParser(makeFile(csv)).parse();
      const langs = result.data.plan.works[0].languages;
      expect(langs.find((l) => l.relation === 'ORIGINAL')?.code).toBe('ENG');
    });

    it('adds a TRANSLATED_FROM language relation', async () => {
      const csv = buildCsv({ ...BASE, translated_from_language: 'GER' });
      const result = await makeParser(makeFile(csv)).parse();
      const langs = result.data.plan.works[0].languages;
      expect(langs.find((l) => l.relation === 'TRANSLATED_FROM')?.code).toBe('GER');
    });

    it('adds a TRANSLATED_INTO language relation', async () => {
      const csv = buildCsv({ ...BASE, translated_into_language: 'SPA' });
      const result = await makeParser(makeFile(csv)).parse();
      const langs = result.data.plan.works[0].languages;
      expect(langs.find((l) => l.relation === 'TRANSLATED_INTO')?.code).toBe('SPA');
    });

    it('adds all three language relations when all are provided', async () => {
      const csv = buildCsv({
        ...BASE,
        original_language: 'ENG',
        translated_from_language: 'FRE',
        translated_into_language: 'SPA',
      });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.data.plan.works[0].languages).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Subjects
  // -------------------------------------------------------------------------
  describe('subjects', () => {
    it('parses comma-separated thema subjects', async () => {
      const csv = buildCsv({ ...BASE, thema_subjects: 'FYM,QDTK' });
      const result = await makeParser(makeFile(csv)).parse();
      const subjects = result.data.plan.works[0].subjects;
      const thema = subjects.filter((s) => s.type === 'THEMA');
      expect(thema.map((s) => s.code)).toEqual(['FYM', 'QDTK']);
    });

    it('parses BIC subjects', async () => {
      const csv = buildCsv({ ...BASE, bic_subjects: 'HPK' });
      const result = await makeParser(makeFile(csv)).parse();
      const bic = result.data.plan.works[0].subjects.filter((s) => s.type === 'BIC');
      expect(bic).toHaveLength(1);
      expect(bic[0].code).toBe('HPK');
    });

    it('parses BISAC subjects', async () => {
      const csv = buildCsv({ ...BASE, bisac_subjects: 'FIC057000,PHI014000' });
      const result = await makeParser(makeFile(csv)).parse();
      const bisac = result.data.plan.works[0].subjects.filter((s) => s.type === 'BISAC');
      expect(bisac.map((s) => s.code)).toEqual(['FIC057000', 'PHI014000']);
    });

    it('parses LCC subjects', async () => {
      const csv = buildCsv({ ...BASE, lcc_subjects: 'PN1650' });
      const result = await makeParser(makeFile(csv)).parse();
      const lcc = result.data.plan.works[0].subjects.filter((s) => s.type === 'LCC');
      expect(lcc).toHaveLength(1);
      expect(lcc[0].code).toBe('PN1650');
    });

    it('parses keyword subjects', async () => {
      const csv = buildCsv({ ...BASE, keywords: 'embodiment,philosophy' });
      const result = await makeParser(makeFile(csv)).parse();
      const keywords = result.data.plan.works[0].subjects.filter((s) => s.type === 'KEYWORD');
      expect(keywords.map((s) => s.code)).toEqual(['embodiment', 'philosophy']);
    });

    it('assigns sequential ordinals across all subject types', async () => {
      const csv = buildCsv({ ...BASE, thema_subjects: 'A', bic_subjects: 'B', keywords: 'C' });
      const result = await makeParser(makeFile(csv)).parse();
      const ordinals = result.data.plan.works[0].subjects.map((s) => s.ordinal);
      expect(ordinals).toEqual([1, 2, 3]);
    });
  });

  // -------------------------------------------------------------------------
  // Publications
  // -------------------------------------------------------------------------
  describe('publications', () => {
    // 9789800000007 is a valid ISBN-13 (check digit = 7)
    it('creates a paperback publication from ISBN alone', async () => {
      const csv = buildCsv({ ...BASE, publication_paperback_isbn: '9789800000007' });
      const result = await makeParser(makeFile(csv)).parse();
      const pubs = result.data.plan.works[0].publications;
      expect(pubs).toHaveLength(1);
      expect(pubs[0]).toMatchObject({ isbn: '9789800000007', type: 'PAPERBACK' });
    });

    it('attaches a price to a hardback publication', async () => {
      const csv = buildCsv({
        ...BASE,
        publication_hardback_isbn: '9789800000014',
        publication_hardback_price_1_currency_code: 'USD',
        publication_hardback_price_1_unit_price: '29.99',
      });
      const result = await makeParser(makeFile(csv)).parse();
      const hardback = result.data.plan.works[0].publications.find((p) => p.type === 'HARDBACK');
      expect(hardback).toBeDefined();
      expect(hardback!.prices).toHaveLength(1);
      expect(hardback!.prices[0]).toMatchObject({ currencyCode: 'USD', unitPrice: 29.99 });
    });

    it('attaches a location to a PDF publication', async () => {
      const csv = buildCsv({
        ...BASE,
        publication_pdf_isbn: '9789800000021',
        publication_pdf_location_landing_page: 'https://example.com/landing',
        publication_pdf_location_full_text_url: 'https://example.com/pdf',
        publication_pdf_location_platform: 'PUBLISHER_WEBSITE',
      });
      const result = await makeParser(makeFile(csv)).parse();
      const pdf = result.data.plan.works[0].publications.find((p) => p.type === 'PDF');
      expect(pdf).toBeDefined();
      expect(pdf!.locations).toHaveLength(1);
      expect(pdf!.locations[0]).toMatchObject({
        landingPage: 'https://example.com/landing',
        fullTextUrl: 'https://example.com/pdf',
        locationPlatform: 'PUBLISHER_WEBSITE',
      });
    });

    it('skips a publication when the ISBN field is empty', async () => {
      const csv = buildCsv({ ...BASE, publication_paperback_isbn: '' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.data.plan.works[0].publications).toHaveLength(0);
    });

    it('creates three publications when all ISBNs are present', async () => {
      const csv = buildCsv({
        ...BASE,
        publication_paperback_isbn: '9789800000007',
        publication_hardback_isbn: '9789800000014',
        publication_pdf_isbn: '9789800000021',
      });
      const result = await makeParser(makeFile(csv)).parse();
      const types = result.data.plan.works[0].publications.map((p) => p.type);
      expect(types).toContain('PAPERBACK');
      expect(types).toContain('HARDBACK');
      expect(types).toContain('PDF');
    });
  });

  // -------------------------------------------------------------------------
  // Series
  // -------------------------------------------------------------------------
  describe('series', () => {
    it('associates the work with a known series', async () => {
      const csv = buildCsv({
        ...BASE,
        series_name: SERIES_NAME,
        series_issue_number: '3',
      });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      const group = result.data.plan.series.find(
        ({ target }) => target.kind === 'existing' && target.seriesId === SERIES_ID,
      );
      expect(group?.members).toHaveLength(1);
      expect(group?.members[0]).toEqual({ workId: result.data.plan.works[0].id, orderNumber: 3 });
    });

    it('produces no series entries when series_name is empty', async () => {
      const csv = buildCsv({ ...BASE, series_name: '' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      expect(Object.keys(result.data.plan.series)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Series matching — the same identity rules the ONIX importer uses
  // -------------------------------------------------------------------------
  describe('series matching', () => {
    it('matches an existing series exactly within the row imprint', async () => {
      const csv = buildCsv({ ...BASE, series_name: SERIES_NAME });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.series).toHaveLength(1);
      expect(result.data.plan.series[0].target).toEqual({ kind: 'existing', seriesId: SERIES_ID });
    });

    it('matches an existing series despite case and whitespace differences', async () => {
      const csv = buildCsv({ ...BASE, series_name: '  my   SERIES   name ' });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.series[0].target).toEqual({ kind: 'existing', seriesId: SERIES_ID });
    });

    it('does not bind a row to an identically named series in another imprint', async () => {
      const elsewhere = [
        makeSeries({
          id: 'series-elsewhere',
          name: SERIES_NAME,
          imprintId: OTHER_IMPRINT_VALUE,
          imprintName: OTHER_IMPRINT_LABEL,
        }),
      ];
      const csv = buildCsv({ ...BASE, series_name: SERIES_NAME });
      const result = await makeParser(makeFile(csv), { series: elsewhere }).parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.series[0].target).toEqual({
        kind: 'proposed',
        series: { name: SERIES_NAME, imprintId: IMPRINT_VALUE, type: 'BOOK_SERIES' },
      });
    });

    it('treats the same series name under two row imprints as two separate series', async () => {
      const csv = buildCsvRows([
        { ...BASE, series_name: 'Shared Name' },
        { ...BASE, imprint: OTHER_IMPRINT_LABEL, series_name: 'Shared Name' },
      ]);
      const result = await makeParser(makeFile(csv), { series: [] }).parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.series).toHaveLength(2);
      expect(result.data.plan.series.map((group) => group.target)).toEqual([
        { kind: 'proposed', series: { name: 'Shared Name', imprintId: IMPRINT_VALUE, type: 'BOOK_SERIES' } },
        { kind: 'proposed', series: { name: 'Shared Name', imprintId: OTHER_IMPRINT_VALUE, type: 'BOOK_SERIES' } },
      ]);
    });

    it('proposes a BookSeries when Thoth has no such series', async () => {
      const csv = buildCsv({ ...BASE, series_name: 'Arc Companions' });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toEqual([]);
      expect(result.data.plan.series).toEqual([
        {
          name: 'Arc Companions',
          target: {
            kind: 'proposed',
            series: { name: 'Arc Companions', imprintId: IMPRINT_VALUE, type: 'BOOK_SERIES' },
          },
          members: [{ workId: expect.any(String), orderNumber: 1 }],
        },
      ]);
    });

    it('creates one proposed group for three rows naming the same missing series', async () => {
      const csv = buildCsvRows([
        { ...BASE, title: 'One', series_name: 'Arc Companions' },
        { ...BASE, title: 'Two', series_name: 'arc  companions' },
        { ...BASE, title: 'Three', series_name: 'Arc Companions' },
      ]);
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.series).toHaveLength(1);
      expect(result.data.plan.series[0].target.kind).toBe('proposed');
      expect(result.data.plan.series[0].members).toHaveLength(3);
    });

    it('reports two identically named existing series in one imprint rather than picking one', async () => {
      const duplicates = [
        makeSeries({ id: 'series-a', name: 'Foundations' }),
        makeSeries({ id: 'series-b', name: 'Foundations' }),
      ];
      const csv = buildCsv({ ...BASE, series_name: 'Foundations' });
      const result = await makeParser(makeFile(csv), { series: duplicates }).parse();

      expect(result.status).toBe('failed');
      expect(errorMessages(result)).toHaveLength(1);
      expect(errorMessages(result)[0]).toContain('csvSeriesAmbiguous');
      expect(errorMessages(result)[0]).toContain('"count":2');
      expect(errorMessages(result)[0]).toContain('csvRow');
      expect(result.data.plan.series).toEqual([]);
    });

    it('reports existing series that only differ by case or whitespace', async () => {
      const duplicates = [
        makeSeries({ id: 'series-a', name: 'Foundations' }),
        makeSeries({ id: 'series-b', name: 'foundations' }),
      ];
      const csv = buildCsv({ ...BASE, series_name: 'FOUNDATIONS' });
      const result = await makeParser(makeFile(csv), { series: duplicates }).parse();

      expect(result.status).toBe('failed');
      expect(errorMessages(result)[0]).toContain('csvSeriesAmbiguous');
    });

    it('prefers a single exact match over several normalised candidates', async () => {
      const duplicates = [
        makeSeries({ id: 'series-exact', name: 'Foundations' }),
        makeSeries({ id: 'series-lower', name: 'foundations' }),
        makeSeries({ id: 'series-spaced', name: 'Foundations ' }),
      ];
      const csv = buildCsv({ ...BASE, series_name: 'Foundations' });
      const result = await makeParser(makeFile(csv), { series: duplicates }).parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.series[0].target).toEqual({ kind: 'existing', seriesId: 'series-exact' });
    });

    it('does not over-normalise punctuation', async () => {
      const existing = [makeSeries({ id: 'series-comma', name: 'Foundations, Old and New' })];
      const csv = buildCsv({ ...BASE, series_name: 'Foundations: Old and New' });
      const result = await makeParser(makeFile(csv), { series: existing }).parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.series[0].target).toEqual({
        kind: 'proposed',
        series: { name: 'Foundations: Old and New', imprintId: IMPRINT_VALUE, type: 'BOOK_SERIES' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Series issue ordinals
  // -------------------------------------------------------------------------
  describe('series issue numbers', () => {
    const ordinalsOf = (result: Awaited<ReturnType<CSVParser['parse']>>) =>
      result.data.plan.series.flatMap((group) => group.members.map((member) => member.orderNumber));

    it('numbers blank issue numbers on a new series from 1', async () => {
      const csv = buildCsvRows([
        { ...BASE, title: 'One', series_name: 'New Series' },
        { ...BASE, title: 'Two', series_name: 'New Series' },
        { ...BASE, title: 'Three', series_name: 'New Series' },
      ]);
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(ordinalsOf(result)).toEqual([1, 2, 3]);
    });

    it('appends blank issue numbers after the issues the series already has', async () => {
      const existing = [makeSeries({ id: SERIES_ID, name: SERIES_NAME, issues: makeIssues([1, 2, 5]) })];
      const csv = buildCsvRows([
        { ...BASE, title: 'One', series_name: SERIES_NAME },
        { ...BASE, title: 'Two', series_name: SERIES_NAME },
      ]);
      const result = await makeParser(makeFile(csv), { series: existing }).parse();

      expect(result.status).toBe('success');
      expect(ordinalsOf(result)).toEqual([6, 7]);
    });

    it('preserves an explicit issue number verbatim', async () => {
      const csv = buildCsv({ ...BASE, series_name: 'New Series', series_issue_number: '42' });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(ordinalsOf(result)).toEqual([42]);
    });

    it('reserves an explicit issue number supplied by a later row before numbering automatically', async () => {
      const csv = buildCsvRows([
        { ...BASE, title: 'One', series_name: 'New Series' },
        { ...BASE, title: 'Two', series_name: 'New Series', series_issue_number: '10' },
        { ...BASE, title: 'Three', series_name: 'New Series' },
      ]);
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(ordinalsOf(result)).toEqual([11, 10, 12]);
    });

    it('reports two rows claiming the same explicit issue number', async () => {
      const csv = buildCsvRows([
        { ...BASE, title: 'One', series_name: 'New Series', series_issue_number: '4' },
        { ...BASE, title: 'Two', series_name: 'New Series', series_issue_number: '4' },
      ]);
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('failed');
      expect(errorMessages(result)).toHaveLength(1);
      expect(errorMessages(result)[0]).toContain('csvSeriesDuplicateIssueNumber');
      expect(errorMessages(result)[0]).toContain('"ordinal":4');
      expect(result.data.plan.series).toEqual([]);
    });

    it('reports an explicit issue number an existing Thoth issue already uses', async () => {
      const existing = [makeSeries({ id: SERIES_ID, name: SERIES_NAME, issues: makeIssues([1, 2]) })];
      const csv = buildCsv({ ...BASE, series_name: SERIES_NAME, series_issue_number: '2' });
      const result = await makeParser(makeFile(csv), { series: existing }).parse();

      expect(result.status).toBe('failed');
      expect(errorMessages(result)).toHaveLength(1);
      expect(errorMessages(result)[0]).toContain('csvSeriesIssueNumberTaken');
      expect(errorMessages(result)[0]).toContain('"ordinal":2');
      expect(result.data.plan.series).toEqual([]);
    });

    it.each(['0', '-1', '1.5', 'two', ' ', '1e3', 'Infinity'])(
      'rejects the non-empty issue number %s',
      async (value) => {
        const csv = buildCsv({ ...BASE, series_name: 'New Series', series_issue_number: value });
        const result = await makeParser(makeFile(csv)).parse();

        // A whitespace-only cell is blank once trimmed, so it means "no explicit ordinal".
        if (value.trim().length === 0) {
          expect(result.status).toBe('success');

          return;
        }

        expect(result.status).toBe('failed');
        expect(errorMessages(result).some((error) => error.includes('csvSeriesIssueNumberNotValid'))).toBe(true);
        expect(errorMessages(result).some((error) => error.includes(`"row":1`))).toBe(true);
      },
    );

    // `issueOrdinal` is a GraphQL Int, so the boundary is the signed 32-bit maximum. Above it the
    // API would reject the CreateIssue partway through an otherwise-successful import.
    it('accepts the largest issue number the API can store', async () => {
      const csv = buildCsv({ ...BASE, series_name: 'New Series', series_issue_number: '2147483647' });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(ordinalsOf(result)).toEqual([2147483647]);
    });

    it('rejects an issue number one above what the API can store', async () => {
      const csv = buildCsv({ ...BASE, series_name: 'New Series', series_issue_number: '2147483648' });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('failed');
      expect(errorMessages(result).some((error) => error.includes('csvSeriesIssueNumberNotValid'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // series_issue_number depends on series_name
  // -------------------------------------------------------------------------
  describe('series issue number without a series name', () => {
    it('imports with no series when both fields are blank', async () => {
      const csv = buildCsv({ ...BASE, series_name: '', series_issue_number: '' });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(errorMessages(result)).toEqual([]);
      expect(result.data.plan.series).toEqual([]);
    });

    it('rejects a valid issue number that has no series to belong to', async () => {
      const csv = buildCsv({ ...BASE, series_name: '', series_issue_number: '4' });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('failed');
      expect(errorMessages(result)).toHaveLength(1);
      expect(errorMessages(result)[0]).toContain('csvSeriesIssueNumberWithoutSeries');
      expect(errorMessages(result)[0]).toContain('"value":"4"');
      expect(errorMessages(result)[0]).toContain('"row":1');
    });

    it('rejects an invalid issue number that has no series to belong to', async () => {
      const csv = buildCsv({ ...BASE, series_name: '', series_issue_number: 'two' });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('failed');
      // The missing series is the actionable problem, so it is reported once rather than
      // alongside a complaint about the value's shape.
      expect(errorMessages(result)).toEqual([expect.stringContaining('csvSeriesIssueNumberWithoutSeries')]);
    });
  });

  // -------------------------------------------------------------------------
  // The shared import plan
  // -------------------------------------------------------------------------
  describe('import plan', () => {
    it('produces a plan with the parsed works, no chapters, and the planned series', async () => {
      const csv = buildCsvRows([
        { ...BASE, title: 'One', series_name: SERIES_NAME },
        { ...BASE, title: 'Two', series_name: SERIES_NAME },
      ]);
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');

      const { works, chapters, series } = result.data.plan;

      expect(works.map((work) => work.titles[0].title)).toEqual(['One', 'Two']);
      // A CSV row is one work; the template has no equivalent of an ONIX ContentItem.
      expect(chapters).toEqual([]);
      expect(series).toEqual([
        {
          name: SERIES_NAME,
          target: { kind: 'existing', seriesId: SERIES_ID },
          members: [
            { workId: works[0].id, orderNumber: 1 },
            { workId: works[1].id, orderNumber: 2 },
          ],
        },
      ]);
    });

    it('refers to a proposed series by member id as well', async () => {
      const csv = buildCsv({ ...BASE, series_name: 'Arc Companions', series_issue_number: '7' });
      const result = await makeParser(makeFile(csv)).parse();

      const { works, series } = result.data.plan;

      expect(series[0].target).toEqual({
        kind: 'proposed',
        series: { name: 'Arc Companions', imprintId: IMPRINT_VALUE, type: 'BOOK_SERIES' },
      });
      expect(series[0].members).toEqual([{ workId: works[0].id, orderNumber: 7 }]);
    });

    it('keeps every series member pointing at a work the plan actually holds', async () => {
      const csv = buildCsvRows([
        { ...BASE, title: 'One', series_name: SERIES_NAME },
        { ...BASE, title: 'Two', series_name: 'Arc Companions' },
        { ...BASE, title: 'Three', series_name: SERIES_NAME },
      ]);
      const result = await makeParser(makeFile(csv)).parse();

      const { works, series } = result.data.plan;
      const workIds = new Set(works.map((work) => work.id));

      expect(series.flatMap((group) => group.members).every(({ workId }) => workIds.has(workId))).toBe(true);
    });

    it('returns an empty plan and no contributor options when the parse fails', async () => {
      const csv = buildCsv({ ...BASE, work_status: 'Published' });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('failed');
      expect(result.data.plan).toEqual({ works: [], chapters: [], series: [] });
      expect(result.data.contributorsForSelection).toEqual({});
      // Nothing partially executable, but the diagnostics are all there.
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('gives each failed parse its own empty plan', async () => {
      const csv = buildCsv({ ...BASE, work_status: 'Published' });
      const first = await makeParser(makeFile(csv)).parse();
      const second = await makeParser(makeFile(csv)).parse();

      // Not one shared value that a caller could append to and leak into the next import.
      expect(first.data.plan).not.toBe(second.data.plan);
      expect(first.data.plan.works).not.toBe(second.data.plan.works);
    });
  });

  // -------------------------------------------------------------------------
  // Structured issues
  // -------------------------------------------------------------------------
  describe('issues', () => {
    it('reports nothing at all for a valid file', async () => {
      const csv = buildCsv({ ...BASE });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(result.issues).toEqual([]);
    });

    it('tags a row-level failure with its severity, code and CSV row', async () => {
      // `page_count` is not validated by the CSV config, so this is raised by the parser itself
      // rather than up front by the file validator.
      const csv = buildCsvRows([
        { ...BASE, title: 'One' },
        { ...BASE, title: 'Two', page_count: 'not a number' },
      ]);
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('failed');
      expect(result.issues).toEqual([
        {
          severity: 'error',
          code: 'csv.validation',
          message: expect.stringContaining('csvFieldNotNumber'),
          source: { kind: 'csv', row: 2 },
        },
      ]);
    });

    it('reports a series-planning failure against the row that caused it', async () => {
      const duplicates = [
        makeSeries({ id: 'series-a', name: 'Foundations' }),
        makeSeries({ id: 'series-b', name: 'Foundations' }),
      ];
      const csv = buildCsvRows([
        { ...BASE, title: 'One' },
        { ...BASE, title: 'Two', series_name: 'Foundations' },
      ]);
      const result = await makeParser(makeFile(csv), { series: duplicates }).parse();

      expect(result.status).toBe('failed');
      expect(result.issues).toEqual([
        {
          severity: 'error',
          code: 'csv.validation',
          message: expect.stringContaining('csvSeriesAmbiguous'),
          source: { kind: 'csv', row: 2 },
        },
      ]);
    });

    /**
     * `csv-file-validator` findings arrive before any row is parsed and are numbered by the
     * library's own conventions; `toValidatorIssues` normalises them onto this parser's rows.
     * These cases pin that mapping against the real library rather than a stub.
     */
    describe('findings from the file validator', () => {
      it('files an invalid cell against the data row it is in', async () => {
        // `work_status` has a real enum validator, so this is rejected by the file validator.
        const csv = buildCsvRows([{ ...BASE, work_status: 'Published' }]);
        const result = await makeParser(makeFile(csv)).parse();

        expect(result.status).toBe('failed');
        expect(result.issues).toEqual([
          {
            severity: 'error',
            code: 'csv.validation',
            message: expect.stringContaining('csvFieldNotValidOptions'),
            source: { kind: 'csv', row: 1 },
          },
        ]);
      });

      it('files the same failure on a later row against that row', async () => {
        const csv = buildCsvRows([{ ...BASE }, { ...BASE }, { ...BASE, work_status: 'Published' }]);
        const result = await makeParser(makeFile(csv)).parse();

        expect(result.issues.map(({ source }) => source)).toEqual([{ kind: 'csv', row: 3 }]);
      });

      it('files a missing required cell against its row', async () => {
        const csv = buildCsvRows([{ ...BASE }, { ...BASE, title: '' }]);
        const result = await makeParser(makeFile(csv)).parse();

        // The message keeps the library's own row numbering, which counts the header as row 1.
        // That wording is not ours to change here; the structured source is what is now right.
        expect(result.issues).toEqual([
          {
            severity: 'error',
            code: 'csv.validation',
            message: 'title is required in the 3 row / 4 column',
            source: { kind: 'csv', row: 2 },
          },
        ]);
      });

      it('files a header problem against the file, not against data row 1', async () => {
        // An unterminated quote defeats the header normaliser, which hands the original file to
        // the validator — the one path on which real header findings reach us.
        const result = await makeParser(makeFile('publisher,title\n"unclosed,Book')).parse();

        expect(result.status).toBe('failed');

        const sourceOf = (fragment: string) => result.issues.find(({ message }) => message.includes(fragment))?.source;

        // Both header categories are file-level: the one that names no row at all, and the one
        // the library numbers as row 1 with a column — which is the header, not data row 1.
        expect(sourceOf('Header name imprint is not correct or missing')).toEqual({ kind: 'file' });
        expect(sourceOf('is not correct or missing in the 1 row')).toEqual({ kind: 'file' });
        // The malformed data row is a row, and keeps its own row despite the library numbering
        // this category from the first data row instead of from the header.
        expect(sourceOf('Number of fields mismatch')).toEqual({ kind: 'csv', row: 1 });
      });

      it('orders normalised findings by row, with file-level problems first', async () => {
        const csv = buildCsvRows([
          { ...BASE, work_status: 'Published' },
          { ...BASE },
          { ...BASE, title: '' },
          { ...BASE, license: 'not a licence' },
        ]);
        const result = await makeParser(makeFile(csv)).parse();

        expect(result.issues.map(({ source }) => source)).toEqual([
          { kind: 'csv', row: 1 },
          { kind: 'csv', row: 3 },
          { kind: 'csv', row: 4 },
        ]);
      });
    });

    it('orders issues by CSV row even when a later row finishes parsing first', async () => {
      const getContributors = async (fullName: string) => {
        await new Promise((resolve) => setTimeout(resolve, fullName === 'First Author' ? 30 : 0));

        return [];
      };

      const csv = buildCsvRows([
        {
          ...BASE,
          title: 'First',
          page_count: 'not a number',
          contribution_1_first_name: 'First',
          contribution_1_surname: 'Author',
          contribution_1_role: 'AUTHOR',
        },
        {
          ...BASE,
          title: 'Second',
          page_count: 'also not a number',
          contribution_1_first_name: 'Second',
          contribution_1_surname: 'Author',
          contribution_1_role: 'AUTHOR',
        },
      ]);

      const result = await makeParser(makeFile(csv), { getContributors }).parse();

      expect(result.issues.map(({ source }) => source)).toEqual([
        { kind: 'csv', row: 1 },
        { kind: 'csv', row: 2 },
      ]);
    });

    it('raises no warning of any kind: CSV has no non-blocking rules yet', async () => {
      const csv = buildCsvRows([
        // Every shape of CSV series row: existing, proposed, and one carrying a series_issn.
        { ...BASE, title: 'Existing', series_name: SERIES_NAME },
        { ...BASE, title: 'Proposed', series_name: 'Arc Companions' },
        { ...BASE, title: 'With ISSN', series_name: SERIES_NAME, series_issn: SERIES_ISSN },
      ]);
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(result.issues.filter(({ severity }) => severity === 'warning')).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // series_issn is accepted and ignored, and says nothing at all
  // -------------------------------------------------------------------------
  describe('series_issn', () => {
    it('does not match on ISSN, and does not warn about ignoring it', async () => {
      // The ISSN belongs to the existing series, but the name does not: matching is by name
      // alone, so this is still a proposed series, silently.
      const csv = buildCsv({ ...BASE, series_name: 'Unrelated Name', series_issn: SERIES_ISSN });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(result.issues).toEqual([]);
      expect(result.data.plan.series[0].target).toEqual({
        kind: 'proposed',
        series: { name: 'Unrelated Name', imprintId: IMPRINT_VALUE, type: 'BOOK_SERIES' },
      });
    });

    it('changes nothing about a row that matches an existing series by name', async () => {
      const withIssn = buildCsv({ ...BASE, series_name: SERIES_NAME, series_issn: SERIES_ISSN });
      const withoutIssn = buildCsv({ ...BASE, series_name: SERIES_NAME });

      const withResult = await makeParser(makeFile(withIssn)).parse();
      const withoutResult = await makeParser(makeFile(withoutIssn)).parse();

      expect(withResult.issues).toEqual(withoutResult.issues);
      expect(withResult.data.plan.series.map(({ target }) => target)).toEqual(
        withoutResult.data.plan.series.map(({ target }) => target),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Deterministic row assembly
  // -------------------------------------------------------------------------
  describe('deterministic row order', () => {
    it('keeps works and series members in CSV row order when a later row finishes first', async () => {
      const completions: string[] = [];
      // Row 1's contributor lookup is deliberately the slowest, so without ordered assembly the
      // rows would land in the reverse of their CSV order.
      const delays: Record<string, number> = { 'First Author': 30, 'Second Author': 15, 'Third Author': 0 };

      const getContributors = async (fullName: string) => {
        await new Promise((resolve) => setTimeout(resolve, delays[fullName] ?? 0));
        completions.push(fullName);

        return [];
      };

      const csv = buildCsvRows([
        {
          ...BASE,
          title: 'First',
          series_name: 'New Series',
          contribution_1_first_name: 'First',
          contribution_1_surname: 'Author',
          contribution_1_role: 'AUTHOR',
        },
        {
          ...BASE,
          title: 'Second',
          series_name: 'New Series',
          contribution_1_first_name: 'Second',
          contribution_1_surname: 'Author',
          contribution_1_role: 'AUTHOR',
        },
        {
          ...BASE,
          title: 'Third',
          series_name: 'New Series',
          contribution_1_first_name: 'Third',
          contribution_1_surname: 'Author',
          contribution_1_role: 'AUTHOR',
        },
      ]);

      const result = await makeParser(makeFile(csv), { getContributors }).parse();

      // The lookups really did finish in the reverse of CSV row order.
      expect(completions).toEqual(['Third Author', 'Second Author', 'First Author']);

      expect(result.status).toBe('success');
      expect(result.data.plan.works.map((work) => work.titles[0].title)).toEqual(['First', 'Second', 'Third']);

      const [group] = result.data.plan.series;

      expect(group.members.map((member) => member.orderNumber)).toEqual([1, 2, 3]);
      // Membership is by id, and those ids are the plan's own works, in source order.
      expect(group.members.map((member) => member.workId)).toEqual(result.data.plan.works.map((work) => work.id));
      // Each work still owns its own contributor selection options.
      expect(result.data.plan.works.every((work) => !!result.data.contributorsForSelection[work.id])).toBe(true);
    });

    it('reports row-tagged errors in CSV row order regardless of completion order', async () => {
      const getContributors = async (fullName: string) => {
        await new Promise((resolve) => setTimeout(resolve, fullName === 'First Author' ? 30 : 0));

        return [];
      };

      // `page_count` is not validated by the CSV config, so the error is raised inside the
      // concurrent row parsing rather than up front by the file validator.
      const csv = buildCsvRows([
        {
          ...BASE,
          title: 'First',
          page_count: 'not a number',
          contribution_1_first_name: 'First',
          contribution_1_surname: 'Author',
          contribution_1_role: 'AUTHOR',
        },
        {
          ...BASE,
          title: 'Second',
          page_count: 'also not a number',
          contribution_1_first_name: 'Second',
          contribution_1_surname: 'Author',
          contribution_1_role: 'AUTHOR',
        },
      ]);

      const result = await makeParser(makeFile(csv), { getContributors }).parse();

      expect(result.status).toBe('failed');
      expect(errorMessages(result).map((error) => error.match(/"row":(\d+)/)?.[1])).toEqual(['1', '2']);
    });

    it('orders publication errors by row even though they are raised after the awaited lookup', async () => {
      // parsePublication runs after `await parseContributors`, so with row 1's lookup delayed
      // row 2 reaches parsePublication first and pushes its error first. Both errors used to be
      // filed under the synthetic row 0 and tie-broken by insertion order, which made the output
      // depend on lookup completion order and left the messages with no row number at all.
      const completions: string[] = [];

      const getContributors = async (fullName: string) => {
        await new Promise((resolve) => setTimeout(resolve, fullName === 'First Author' ? 30 : 0));
        completions.push(fullName);

        return [];
      };

      // Unit price is not numerically validated by getCsvConfig, so this is a parser-level error.
      const priceRow = (title: string, firstName: string, unitPrice: string) => ({
        ...BASE,
        title,
        publication_paperback_isbn: '9789800000007',
        publication_paperback_price_1_currency_code: 'USD',
        publication_paperback_price_1_unit_price: unitPrice,
        contribution_1_first_name: firstName,
        contribution_1_surname: 'Author',
        contribution_1_role: 'AUTHOR',
      });

      const csv = buildCsvRows([
        priceRow('First', 'First', 'not a price'),
        priceRow('Second', 'Second', 'also not a price'),
      ]);

      const result = await makeParser(makeFile(csv), { getContributors }).parse();

      // Row 2 really did finish its lookup — and therefore its publication parsing — first.
      expect(completions).toEqual(['Second Author', 'First Author']);

      expect(result.status).toBe('failed');
      expect(errorMessages(result)).toHaveLength(2);
      expect(errorMessages(result).map((error) => error.match(/"row":(\d+)/)?.[1])).toEqual(['1', '2']);
      // Each message names its own row, rather than the synthetic row 0 or an empty string.
      expect(errorMessages(result)[0]).toContain('csvFieldNotNumber');
      expect(errorMessages(result)[0]).toContain('"row":1');
      expect(errorMessages(result)[1]).toContain('"row":2');
    });
  });

  // -------------------------------------------------------------------------
  // Contributors
  // -------------------------------------------------------------------------
  describe('contributors', () => {
    it('parses a single contributor', async () => {
      const csv = buildCsv({
        ...BASE,
        contribution_1_first_name: 'Jane',
        contribution_1_surname: 'Doe',
        contribution_1_role: 'AUTHOR',
      });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      const contributions = result.data.plan.works[0].contributions;
      expect(contributions).toHaveLength(1);
      expect(contributions[0]).toMatchObject({
        firstName: 'Jane',
        lastName: 'Doe',
        type: 'AUTHOR',
      });
    });

    it('parses multiple contributors in order', async () => {
      const csv = buildCsv({
        ...BASE,
        contribution_1_first_name: 'Alice',
        contribution_1_surname: 'Smith',
        contribution_1_role: 'AUTHOR',
        contribution_2_first_name: 'Bob',
        contribution_2_surname: 'Jones',
        contribution_2_role: 'EDITOR',
      });
      const result = await makeParser(makeFile(csv)).parse();
      const contributions = result.data.plan.works[0].contributions;
      expect(contributions).toHaveLength(2);
      expect(contributions[0].firstName).toBe('Alice');
      expect(contributions[1].firstName).toBe('Bob');
    });

    it('stores contributor ORCID', async () => {
      const csv = buildCsv({
        ...BASE,
        contribution_1_first_name: 'Jane',
        contribution_1_surname: 'Doe',
        contribution_1_role: 'AUTHOR',
        contribution_1_orcid: '0000-0001-6365-5189',
      });
      const result = await makeParser(makeFile(csv)).parse();
      const contribution = result.data.plan.works[0].contributions[0];
      expect(contribution.orcidId).toBe('0000-0001-6365-5189');
    });

    it('skips contributor rows where both first name and surname are empty', async () => {
      const csv = buildCsv({
        ...BASE,
        contribution_1_first_name: 'Jane',
        contribution_1_surname: 'Doe',
        contribution_1_role: 'AUTHOR',
        contribution_2_first_name: '',
        contribution_2_surname: '',
        contribution_2_role: '',
      });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.data.plan.works[0].contributions).toHaveLength(1);
    });

    it('includes found contributors from ContributorService in selection options', async () => {
      const existingContributor = {
        id: 'contributor-1',
        fullName: 'Jane Doe',
        firstName: 'Jane',
        lastName: 'Doe',
        orcid: '0000-0001-6365-5189',
        website: '',
        lastContributionTitle: 'Some Book',
      };
      const csv = buildCsv({
        ...BASE,
        contribution_1_first_name: 'Jane',
        contribution_1_surname: 'Doe',
        contribution_1_role: 'AUTHOR',
      });
      const result = await makeParser(makeFile(csv), {
        contributorResults: [existingContributor],
      }).parse();
      const workId = result.data.plan.works[0].id;
      const selectionOptions = Object.values(result.data.contributorsForSelection[workId]);
      expect(selectionOptions[0]).toHaveLength(2);
      expect(selectionOptions[0][0].selected).toBe(true);
      expect(selectionOptions[0][1].selected).toBe(false);
    });

    it('does not query or attach an institution when no affiliation ROR is supplied', async () => {
      const getInstitutions = vi
        .fn()
        .mockResolvedValue([{ id: 'unrelated', name: 'Unrelated Institution', ror: 'https://ror.org/unrelated' }]);
      const csv = buildCsv({
        ...BASE,
        contribution_1_first_name: 'Jane',
        contribution_1_surname: 'Doe',
        contribution_1_role: 'AUTHOR',
      });
      const result = await makeParser(makeFile(csv), { getInstitutions }).parse();

      expect(result.status).toBe('success');
      expect(getInstitutions).not.toHaveBeenCalled();
      expect(result.data.plan.works[0].contributions[0].affiliations).toEqual([]);
    });

    it('accepts institution name for compatibility without using it as an implicit lookup filter', async () => {
      const getInstitutions = vi
        .fn()
        .mockResolvedValue([{ id: 'matching', name: 'Named Institution', ror: 'https://ror.org/matching' }]);
      const csv = buildCsv({
        ...BASE,
        contribution_1_first_name: 'Jane',
        contribution_1_surname: 'Doe',
        contribution_1_role: 'AUTHOR',
        contribution_1_affiliation_institution_name: 'Named Institution',
      });
      const result = await makeParser(makeFile(csv), { getInstitutions }).parse();

      expect(result.status).toBe('success');
      expect(result.issues).toEqual([]);
      expect(getInstitutions).not.toHaveBeenCalled();
      expect(result.data.plan.works[0].contributions[0].affiliations).toEqual([]);
    });

    it('still resolves an affiliation when an explicit ROR is supplied', async () => {
      const ror = 'https://ror.org/03vek6s52';
      const getInstitutions = vi.fn().mockResolvedValue([{ id: 'institution', name: 'Harvard University', ror }]);
      const csv = buildCsv({
        ...BASE,
        contribution_1_first_name: 'Jane',
        contribution_1_surname: 'Doe',
        contribution_1_role: 'AUTHOR',
        contribution_1_affiliation_position: 'Professor',
        contribution_1_affiliation_institution_ror: ror,
      });
      const result = await makeParser(makeFile(csv), { getInstitutions }).parse();

      expect(result.status).toBe('success');
      expect(getInstitutions).toHaveBeenCalledWith(0, appConfig.data.maxItemsPerRequestLimit, ror);
      expect(result.data.plan.works[0].contributions[0].affiliations[0]).toMatchObject({
        institutionId: 'institution',
        institutionName: 'Harvard University',
        rorId: ror,
        position: 'Professor',
      });
    });
  });

  // -------------------------------------------------------------------------
  // Enum value aliases (human-readable labels accepted alongside canonical codes)
  // -------------------------------------------------------------------------
  describe('enum aliases', () => {
    it('accepts "Edited Book" as work_type (normalises to EDITED_BOOK)', async () => {
      const csv = buildCsv({ ...BASE, work_type: 'Edited Book' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
    });

    it('accepts "EditedBook" as work_type (normalises to EDITED_BOOK)', async () => {
      const csv = buildCsv({ ...BASE, work_type: 'EditedBook' });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].type).toBe('EDITED_BOOK');
    });

    it('accepts "Active" as work_status (normalises to ACTIVE)', async () => {
      const csv = buildCsv({ ...BASE, work_status: 'Active' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
    });

    it('accepts "Author" as contribution role (normalises to AUTHOR)', async () => {
      const csv = buildCsv({
        ...BASE,
        contribution_1_first_name: 'Jane',
        contribution_1_surname: 'Doe',
        contribution_1_role: 'Author',
      });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].contributions[0].type).toBe('AUTHOR');
    });

    it('accepts "Introduction By" as contribution role (normalises to INTRODUCTION_BY)', async () => {
      const csv = buildCsv({
        ...BASE,
        contribution_1_first_name: 'James',
        contribution_1_surname: 'Holden',
        contribution_1_role: 'Introduction By',
      });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].contributions[0].type).toBe('INTRODUCTION_BY');
    });

    it('normalises the configured maximum contributor slot from the generated role metadata', async () => {
      const max = appConfig.maxCsvContributorsCount;
      const csv = buildCsv({
        ...BASE,
        [`contribution_${max}_first_name`]: 'Max',
        [`contribution_${max}_surname`]: 'Contributor',
        [`contribution_${max}_role`]: 'Introduction By',
      });
      const result = await makeParser(makeFile(csv)).parse();

      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].contributions[0]).toMatchObject({
        fullName: 'Max Contributor',
        type: 'INTRODUCTION_BY',
      });
    });

    it('accepts "Publisher Website" as pdf_location_platform (normalises to PUBLISHER_WEBSITE)', async () => {
      const csv = buildCsv({
        ...BASE,
        publication_pdf_isbn: '9789800000021',
        publication_pdf_location_platform: 'Publisher Website',
      });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      const pdf = result.data.plan.works[0].publications.find((p) => p.type === 'PDF');
      expect(pdf!.locations[0].locationPlatform).toBe('PUBLISHER_WEBSITE');
    });

    it('still accepts canonical codes (EDITED_BOOK, ACTIVE, AUTHOR)', async () => {
      const csv = buildCsv({
        ...BASE,
        work_type: 'EDITED_BOOK',
        work_status: 'ACTIVE',
        contribution_1_first_name: 'Jane',
        contribution_1_surname: 'Doe',
        contribution_1_role: 'AUTHOR',
      });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('success');
      expect(result.data.plan.works[0].contributions[0].type).toBe('AUTHOR');
    });
  });

  // -------------------------------------------------------------------------
  // Validation errors
  // -------------------------------------------------------------------------
  describe('validation errors', () => {
    it('returns failed status for an unrecognised work_status value', async () => {
      // work_status uses a real enum validator; a nonsense value fails it
      const csv = buildCsv({ ...BASE, work_status: 'Published' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('failed');
      expect(errorMessages(result).length).toBeGreaterThan(0);
    });

    it('returns failed status when required title is blank', async () => {
      const csv = buildCsv({ ...BASE, title: '' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('failed');
    });

    it('returns failed status for an invalid ISBN-13 check digit', async () => {
      const csv = buildCsv({ ...BASE, publication_paperback_isbn: '9789800000001' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('failed');
    });

    it('returns failed status when work_status is missing', async () => {
      const csv = buildCsv({ ...BASE, work_status: '' });
      const result = await makeParser(makeFile(csv)).parse();
      expect(result.status).toBe('failed');
    });
  });
});
