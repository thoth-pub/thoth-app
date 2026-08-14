import { describe, expect, it, vi } from 'vitest';

import { ContributorService } from '@/src/entities/contributor';
import { InstitutionService } from '@/src/entities/institution';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { licenseOptions } from '@/src/shared/constants/formFields';

import CSVParser from './CSVParser';
import { getCsvConfig } from './getCsvConfig';

// ---------------------------------------------------------------------------
// Fixtures — mirrors the harness of CSVParser.test.ts so both suites read alike
// ---------------------------------------------------------------------------

const IMPRINT_LABEL = 'My Publisher';
const IMPRINT_VALUE = 'pub-id';

const imprints = [{ label: IMPRINT_LABEL, value: IMPRINT_VALUE }];

const t = (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key);

const makeFile = (content: string) => new File([content], 'test.csv', { type: 'text/csv' });

type LookupSpies = {
  getContributors: ReturnType<typeof vi.fn>;
  getInstitutions: ReturnType<typeof vi.fn>;
};

const makeParser = (
  file: File,
  opts: {
    series?: SeriesEntity[];
    getContributors?: ReturnType<typeof vi.fn>;
    getInstitutions?: ReturnType<typeof vi.fn>;
  } = {},
): { parser: CSVParser; spies: LookupSpies } => {
  const config = getCsvConfig(imprints, licenseOptions, t);
  const getContributors = opts.getContributors ?? vi.fn().mockResolvedValue([]);
  const getInstitutions = opts.getInstitutions ?? vi.fn().mockResolvedValue([]);

  const parser = new CSVParser(
    file,
    config,
    imprints,
    licenseOptions,
    opts.series ?? [],
    { getContributors } as unknown as ContributorService,
    { getInstitutions } as unknown as InstitutionService,
    t,
  );

  return { parser, spies: { getContributors, getInstitutions } };
};

const escapeCell = (value: string, delimiter = ',') =>
  value.includes(delimiter) || value.includes('"') || value.includes('\n')
    ? `"${value.replace(/"/g, '""')}"`
    : value;

/** A full-width CSV in schema order, in any delimiter the current parser can safely read. */
const buildDelimitedCsv = (rows: Record<string, string>[], delimiter: string) => {
  const headers = getCsvConfig(imprints, licenseOptions, t).headers.map((h) => h.name);

  return [
    headers.join(delimiter),
    ...rows.map((values) => headers.map((name) => escapeCell(values[name] ?? '', delimiter)).join(delimiter)),
  ].join('\n');
};

const BASE: Record<string, string> = {
  imprint: IMPRINT_LABEL,
  work_type: 'MONOGRAPH',
  work_status: 'ACTIVE',
  title: 'Test Book',
};

// ---------------------------------------------------------------------------
// Delimiter compatibility — pins what current dev safely parses, before and
// after the preflight refactor. Papa Parse auto-detects these delimiters and
// the canonical rewrite has always reduced them to the comma-delimited schema.
// ---------------------------------------------------------------------------

describe('CSV preflight: delimiter compatibility', () => {
  it('parses a comma-delimited file', async () => {
    const { parser } = makeParser(makeFile(buildDelimitedCsv([BASE], ',')));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works).toHaveLength(1);
    expect(result.data.plan.works[0].titles[0].title).toBe('Test Book');
  });

  it('parses a semicolon-delimited file', async () => {
    const { parser } = makeParser(makeFile(buildDelimitedCsv([BASE], ';')));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works).toHaveLength(1);
    expect(result.data.plan.works[0].titles[0].title).toBe('Test Book');
  });

  it('parses a tab-delimited file', async () => {
    const { parser } = makeParser(makeFile(buildDelimitedCsv([BASE], '\t')));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works).toHaveLength(1);
    expect(result.data.plan.works[0].titles[0].title).toBe('Test Book');
  });

  it('parses a pipe-delimited file', async () => {
    const { parser } = makeParser(makeFile(buildDelimitedCsv([BASE], '|')));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works).toHaveLength(1);
  });

  it('reads quoted cells containing the delimiter', async () => {
    const { parser } = makeParser(
      makeFile(buildDelimitedCsv([{ ...BASE, title: 'One, Two, Three', subtitle: 'A; B' }], ';')),
    );

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].titles[0].title).toBe('One, Two, Three');
    expect(result.data.plan.works[0].titles[0].subtitle).toBe('A; B');
  });
});
