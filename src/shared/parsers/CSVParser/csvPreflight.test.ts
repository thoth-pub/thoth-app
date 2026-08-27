import { describe, expect, it, vi } from 'vitest';

import { ContributorService } from '@/src/entities/contributor';
import { InstitutionService } from '@/src/entities/institution';
import { SeriesEntity } from '@/src/entities/series/model/series.types';
import { licenseOptions } from '@/src/shared/constants/formFields';
import { canonicaliseRor } from '@/src/shared/utils/validations';

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

// ---------------------------------------------------------------------------
// Structure: untrustworthy sources fail at file level, without guessed rows
// ---------------------------------------------------------------------------

const buildCsv = (rows: Record<string, string>[]) => buildDelimitedCsv(rows, ',');

const errorMessages = (result: Awaited<ReturnType<CSVParser['parse']>>) =>
  result.issues.filter(({ severity }) => severity === 'error').map(({ message }) => message);

const FILE_LEVEL_FAILURE = {
  severity: 'error',
  code: 'csv.validation',
  message: 'errors.csvParsingError',
  source: { kind: 'file' },
};

describe('CSV preflight: structural trust', () => {
  it('reports broken quoting as one file-level failure with an empty plan', async () => {
    const { parser, spies } = makeParser(makeFile('imprint,title\n"broken,Book'));

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(result.issues).toEqual([FILE_LEVEL_FAILURE]);
    expect(result.data.plan.works).toHaveLength(0);
    expect(spies.getContributors).not.toHaveBeenCalled();
    expect(spies.getInstitutions).not.toHaveBeenCalled();
  });

  it('reports a file with no recognisable template column as one file-level failure', async () => {
    const { parser } = makeParser(makeFile('foo,bar,baz\n1,2,3\n4,5,6'));

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(result.issues).toEqual([FILE_LEVEL_FAILURE]);
  });

  it('fails file-level on an unquoted delimiter instead of silently truncating the split cell', async () => {
    // "War, Peace" without quotes parses as five cells against a four-column header. Mapping by
    // header position would plan title="War" and discard " Peace" — silent metadata truncation.
    const { parser, spies } = makeParser(
      makeFile('imprint,work_type,work_status,title\nMy Publisher,MONOGRAPH,ACTIVE,War, Peace'),
    );

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(result.issues).toEqual([FILE_LEVEL_FAILURE]);
    expect(result.data.plan.works).toHaveLength(0);
    expect(spies.getContributors).not.toHaveBeenCalled();
    expect(spies.getInstitutions).not.toHaveBeenCalled();
  });

  it('fails file-level on a too-short row instead of synthesizing its missing cells', async () => {
    const { parser, spies } = makeParser(
      makeFile('imprint,work_type,work_status,title\nMy Publisher,MONOGRAPH,ACTIVE'),
    );

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(result.issues).toEqual([FILE_LEVEL_FAILURE]);
    expect(spies.getContributors).not.toHaveBeenCalled();
    expect(spies.getInstitutions).not.toHaveBeenCalled();
  });

  it('fails file-level when two source columns resolve to the same canonical field', async () => {
    // `publisher` is an alias of `imprint`: with both present there is no honest answer to which
    // column holds the value, and last-header-wins would silently discard one of them.
    const { parser } = makeParser(
      makeFile('publisher,imprint,work_type,work_status,title\nA,My Publisher,MONOGRAPH,ACTIVE,Book'),
    );

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(result.issues).toEqual([FILE_LEVEL_FAILURE]);
  });

  it('fails file-level on a literally duplicated canonical header', async () => {
    const { parser } = makeParser(
      makeFile('imprint,imprint,work_type,work_status,title\nMy Publisher,Other,MONOGRAPH,ACTIVE,Book'),
    );

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(result.issues).toEqual([FILE_LEVEL_FAILURE]);
  });

  it('still allows duplicate unknown compatibility columns, which are ignored either way', async () => {
    const { parser } = makeParser(
      makeFile('imprint,work_type,work_status,title,custom,custom\nMy Publisher,MONOGRAPH,ACTIVE,Book,x,y'),
    );

    expect((await parser.parse()).status).toBe('success');
  });
});

// ---------------------------------------------------------------------------
// canonicaliseRor: exact parity with the API's Ror::from_str
// ---------------------------------------------------------------------------

describe('canonicaliseRor', () => {
  it('canonicalises the forms Ror::from_str accepts', () => {
    expect(canonicaliseRor('03vek6s52')).toBe('https://ror.org/03vek6s52');
    expect(canonicaliseRor('ror.org/03vek6s52')).toBe('https://ror.org/03vek6s52');
    expect(canonicaliseRor('https://ror.org/03vek6s52')).toBe('https://ror.org/03vek6s52');
    expect(canonicaliseRor('HTTPS://WWW.ROR.ORG/03vek6s52')).toBe('https://ror.org/03vek6s52');
  });

  it('rejects what Ror::from_str rejects, including boundary whitespace — no silent trim', () => {
    expect(canonicaliseRor(' 03vek6s52')).toBe('');
    expect(canonicaliseRor('03vek6s52 ')).toBe('');
    expect(canonicaliseRor('not-a-ror')).toBe('');
    expect(canonicaliseRor('3vek6s52')).toBe('');
    expect(canonicaliseRor('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Boundary whitespace: reported, not repaired
// ---------------------------------------------------------------------------

describe('CSV preflight: boundary whitespace policy', () => {
  it('does not let a whitespace-wrapped date become valid by trimming', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, publication_date: ' 2026-07-22' }])));

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    // Exactly one finding: the residual date is valid, so no derivative format error is added.
    expect(errorMessages(result)).toEqual([
      'errors.csvFieldWhitespace:{"field":"publication_date","row":1}',
    ]);
  });

  it('reports a trailing-whitespace date the same way', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, withdrawn_date: '2026-07-22 ' }])));

    expect(errorMessages(await parser.parse())).toEqual([
      'errors.csvFieldWhitespace:{"field":"withdrawn_date","row":1}',
    ]);
  });

  it('reports both findings when fixing the whitespace would still leave an invalid date', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, publication_date: ' 22.07.26' }])));

    expect(errorMessages(await parser.parse())).toEqual([
      'errors.csvFieldWhitespace:{"field":"publication_date","row":1}',
      'errors.csvFieldNotIsoDate:{"field":"publication_date","value":"22.07.26","row":1}',
    ]);
  });

  it('reports a whitespace-wrapped imprint once, without the derivative options error', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, imprint: ' My Publisher' }])));

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(errorMessages(result)).toEqual(['errors.csvFieldWhitespace:{"field":"imprint","row":1}']);
  });

  it('keeps both findings for an imprint that is wrong beyond its whitespace', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, imprint: ' No Such Publisher' }])));

    const result = await parser.parse();
    const messages = errorMessages(result);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('csvFieldNotValidOptions'); // the validator's finding, first
    expect(messages[1]).toBe('errors.csvFieldWhitespace:{"field":"imprint","row":1}');
  });

  it('reports a whitespace-wrapped ORCID once, without a derivative invalid-ORCID error', async () => {
    const { parser } = makeParser(
      makeFile(
        buildCsv([
          {
            ...BASE,
            contribution_1_first_name: 'A',
            contribution_1_surname: 'B',
            contribution_1_orcid: '0000-0002-1825-0097 ',
          },
        ]),
      ),
    );

    expect(errorMessages(await parser.parse())).toEqual([
      'errors.csvFieldWhitespace:{"field":"contribution_1_orcid","row":1}',
    ]);
  });

  it('reports both findings when the ORCID would still be malformed after the whitespace fix', async () => {
    const { parser } = makeParser(
      makeFile(
        buildCsv([
          { ...BASE, contribution_1_first_name: 'A', contribution_1_surname: 'B', contribution_1_orcid: ' 0000-0002' },
        ]),
      ),
    );

    expect(errorMessages(await parser.parse())).toEqual([
      'errors.csvFieldWhitespace:{"field":"contribution_1_orcid","row":1}',
      'errors.csvOrcidNotValid:{"field":"contribution_1_orcid","value":"0000-0002","row":1}',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Strict dates
// ---------------------------------------------------------------------------

describe('CSV preflight: dates', () => {
  it('accepts a complete YYYY-MM-DD date', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, publication_date: '2026-07-22' }])));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].publicationDate).toBe('2026-07-22');
  });

  it('accepts a blank optional date', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, publication_date: '' }])));

    expect((await parser.parse()).status).toBe('success');
  });

  it('rejects the non-ISO 22.07.26 form', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, publication_date: '22.07.26' }])));

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(errorMessages(result)).toEqual([
      'errors.csvFieldNotIsoDate:{"field":"publication_date","value":"22.07.26","row":1}',
    ]);
  });

  it('rejects the impossible calendar date 2026-02-30', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, withdrawn_date: '2026-02-30' }])));

    const result = await parser.parse();

    expect(errorMessages(result)).toEqual([
      'errors.csvFieldNotIsoDate:{"field":"withdrawn_date","value":"2026-02-30","row":1}',
    ]);
  });

  it('rejects a partial date', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, publication_date: '2026-07' }])));

    expect(errorMessages(await parser.parse())).toEqual([
      'errors.csvFieldNotIsoDate:{"field":"publication_date","value":"2026-07","row":1}',
    ]);
  });

  it('accepts 2024-02-29: a leap day is a real date', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, publication_date: '2024-02-29' }])));

    expect((await parser.parse()).status).toBe('success');
  });
});

// ---------------------------------------------------------------------------
// DOI: accept what the Thoth contract accepts, canonicalise, reject the rest
// ---------------------------------------------------------------------------

describe('CSV preflight: DOI', () => {
  it('accepts the canonical resolver URL unchanged', async () => {
    const doi = 'https://doi.org/10.12345/test-book';
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, doi }])));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].doi).toBe(doi);
  });

  it('accepts a bare DOI and canonicalises it into the plan', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, doi: '10.12345/test-book' }])));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].doi).toBe('https://doi.org/10.12345/test-book');
  });

  it('accepts the legacy dx.doi.org resolver form and canonicalises it', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, doi: 'http://dx.doi.org/10.12345/test-book' }])));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].doi).toBe('https://doi.org/10.12345/test-book');
  });

  it('rejects a product code instead of prefixing it into a plausible DOI', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, doi: 'PROD-1234' }])));

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(errorMessages(result)).toEqual(['errors.csvDoiNotValid:{"value":"PROD-1234","row":1}']);
  });
});

// ---------------------------------------------------------------------------
// Identifiers and whitespace
// ---------------------------------------------------------------------------

describe('CSV preflight: identifiers and whitespace', () => {
  it('reports an ISBN with a trailing tab: the authoritative ISBN contract does not trim', async () => {
    // One actionable finding, not two: the file validator trims before checking, so it passes
    // this cell, and the residual ISBN is valid, so no derivative "invalid ISBN" is added. The
    // raw value can also no longer be validated in trimmed form and then planned raw — the
    // boundary error blocks the import until the cell itself is fixed.
    const { parser } = makeParser(
      makeFile(buildCsv([{ ...BASE, publication_paperback_isbn: '978-3-16-148410-0\t' }])),
    );

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(errorMessages(result)).toEqual([
      'errors.csvFieldWhitespace:{"field":"publication_paperback_isbn","row":1}',
    ]);
  });

  it('accepts a clean valid ISBN and plans it exactly as supplied', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, publication_paperback_isbn: '978-3-16-148410-0' }])));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].publications[0].isbn).toBe('978-3-16-148410-0');
  });

  it('still rejects an invalid ISBN check digit', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, publication_paperback_isbn: '9781234567890' }])));

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(errorMessages(result)).toHaveLength(1);
  });

  it('accepts a valid ORCID in bare and URL forms', async () => {
    const rows = [
      { ...BASE, contribution_1_first_name: 'A', contribution_1_surname: 'B', contribution_1_orcid: '0000-0002-1825-0097' },
      {
        ...BASE,
        contribution_1_first_name: 'C',
        contribution_1_surname: 'D',
        contribution_1_orcid: 'https://orcid.org/0000-0002-1825-0097',
      },
    ];
    const { parser } = makeParser(makeFile(buildCsv(rows)));

    expect((await parser.parse()).status).toBe('success');
  });

  it('rejects a malformed ORCID under the existing authoritative rule', async () => {
    // The authoritative orcidValidation checks the identifier shape; a truncated iD fails it.
    const { parser } = makeParser(
      makeFile(
        buildCsv([
          { ...BASE, contribution_1_first_name: 'A', contribution_1_surname: 'B', contribution_1_orcid: '0000-0002-1825' },
        ]),
      ),
    );

    const result = await parser.parse();

    expect(errorMessages(result)).toEqual([
      'errors.csvOrcidNotValid:{"field":"contribution_1_orcid","value":"0000-0002-1825","row":1}',
    ]);
  });

  /**
   * The other representation of an ORCID a publisher's export really produces.
   *
   * ORCID's own registry displays the hyphenated form, but the sixteen bare characters are an
   * equally valid expression of the same iD — it is how ONIX encodes one, and it is what falls
   * out of a spreadsheet column that has been through anything numeric. Both are the same
   * person, so both have to reach the same contributor; canonicalising in the importer is what
   * makes the value that is validated the value that is looked up and planned, exactly as
   * `canonicaliseDoi` and `canonicaliseRor` already do for their identifiers.
   */
  describe('hyphenless ORCID', () => {
    const orcidRow = (value: string, overrides: Record<string, string> = {}) => ({
      ...BASE,
      contribution_1_first_name: 'A',
      contribution_1_surname: 'B',
      contribution_1_orcid: value,
      ...overrides,
    });

    it('accepts a valid 16-character hyphenless ORCID', async () => {
      const { parser } = makeParser(makeFile(buildCsv([orcidRow('0000000163655189')])));

      expect(errorMessages(await parser.parse())).toEqual([]);
    });

    it('plans the hyphenated form for a hyphenless ORCID', async () => {
      const { parser } = makeParser(makeFile(buildCsv([orcidRow('0000000163655189')])));

      const result = await parser.parse();

      expect(result.status).toBe('success');
      // What execution will send to createContributor. The bare encoding is not what Thoth
      // stores, so planning it would put a second representation of one person in the database.
      expect(result.data.plan.works[0].contributions[0].orcidId).toBe('0000-0001-6365-5189');
    });

    it('canonicalises a terminal lower-case check character to upper case', async () => {
      const { parser } = makeParser(makeFile(buildCsv([orcidRow('000000015109376x')])));

      const result = await parser.parse();

      expect(result.status).toBe('success');
      // Only the check character of an ORCID can be a letter, and Thoth writes it upper case, so
      // `…376x` and `…376X` are one iD rather than two.
      expect(result.data.plan.works[0].contributions[0].orcidId).toBe('0000-0001-5109-376X');
    });

    it('looks a hyphenless ORCID up by the canonical form, so it resolves the same contributor', async () => {
      const stored = {
        id: 'existing-contributor',
        name: 'J. A. Doe-Smith',
        fullName: 'J. A. Doe-Smith',
        firstName: 'J. A.',
        lastName: 'Doe-Smith',
        orcid: '0000-0001-6365-5189',
        website: '',
        updatedAt: '',
        lastContributionTitle: 'An Earlier Book',
      };
      const getContributors = vi.fn((filter: string) =>
        Promise.resolve(filter === '0000-0001-6365-5189' ? [stored] : []),
      );
      const { parser } = makeParser(makeFile(buildCsv([orcidRow('0000000163655189')])), { getContributors });

      const result = await parser.parse();

      // The #135 exact-ORCID reuse, reached from the representation the file happened to use:
      // one identity, not a create intent the ORCID unique index would reject.
      expect(result.data.plan.works[0].contributions[0].contributorId).toBe('existing-contributor');
    });

    it('still rejects a hyphenless value that is not a valid ORCID', async () => {
      const { parser } = makeParser(makeFile(buildCsv([orcidRow('123')])));

      // `123` is malformed, not an ORCID missing its leading zeros. Padding it out would invent
      // a plausible identifier belonging to somebody else, so it stays an error and the value
      // reported is the one the file supplied.
      expect(errorMessages(await parser.parse())).toEqual([
        'errors.csvOrcidNotValid:{"field":"contribution_1_orcid","value":"123","row":1}',
      ]);
    });

    it('still reports boundary whitespace around an otherwise valid hyphenless ORCID', async () => {
      const { parser } = makeParser(makeFile(buildCsv([orcidRow('0000000163655189 ')])));

      // Canonicalisation is not licence to repair a boundary defect: `contribution_N_orcid` is a
      // `report` field, and silently trimming it to make the iD valid is precisely the silent
      // repair that policy exists to prevent.
      expect(errorMessages(await parser.parse())).toEqual([
        'errors.csvFieldWhitespace:{"field":"contribution_1_orcid","row":1}',
      ]);
    });
  });

  it('accepts a bare ROR, canonicalises it, and looks the institution up by the canonical form', async () => {
    const canonical = 'https://ror.org/03vek6s52';
    const getInstitutions = vi.fn().mockResolvedValue([{ id: 'inst-1', name: 'Harvard', ror: canonical }]);
    const { parser } = makeParser(
      makeFile(
        buildCsv([
          {
            ...BASE,
            contribution_1_first_name: 'A',
            contribution_1_surname: 'B',
            contribution_1_role: 'AUTHOR',
            contribution_1_affiliation_institution_ror: '03vek6s52',
          },
        ]),
      ),
      { getInstitutions },
    );

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(getInstitutions).toHaveBeenCalledWith(expect.anything(), expect.anything(), canonical);
    expect(result.data.plan.works[0].contributions[0].affiliations[0].rorId).toBe(canonical);
  });

  it('rejects a value that is not a ROR in any accepted form', async () => {
    const { parser } = makeParser(
      makeFile(
        buildCsv([
          {
            ...BASE,
            contribution_1_first_name: 'A',
            contribution_1_surname: 'B',
            contribution_1_affiliation_institution_ror: 'not-a-ror',
          },
        ]),
      ),
    );

    expect(errorMessages(await parser.parse())).toEqual([
      'errors.csvRorNotValid:{"field":"contribution_1_affiliation_institution_ror","value":"not-a-ror","row":1}',
    ]);
  });

  it('reports contributor-name boundary whitespace instead of silently altering the lookup identity', async () => {
    const { parser, spies } = makeParser(
      makeFile(buildCsv([{ ...BASE, contribution_1_first_name: ' Jane', contribution_1_surname: 'Doe​' }])),
    );

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(errorMessages(result)).toEqual([
      'errors.csvFieldWhitespace:{"field":"contribution_1_first_name","row":1}',
      'errors.csvFieldWhitespace:{"field":"contribution_1_surname","row":1}',
    ]);
    expect(spies.getContributors).not.toHaveBeenCalled();
  });

  it('does not trim free-text fields: a title keeps its boundary whitespace verbatim', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, title: ' My Book ' }])));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].titles[0].title).toBe(' My Book ');
  });
});

// ---------------------------------------------------------------------------
// Malformed numeric values
// ---------------------------------------------------------------------------

describe('CSV preflight: numeric fields', () => {
  it('reports a malformed integer count during preflight', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, page_count: 'many' }])));

    expect(errorMessages(await parser.parse())).toEqual([
      'errors.csvFieldNotNumber:{"field":"page_count","row":1}',
    ]);
  });

  it('reports a malformed price during preflight', async () => {
    const { parser } = makeParser(
      makeFile(
        buildCsv([
          {
            ...BASE,
            publication_paperback_isbn: '978-3-16-148410-0',
            publication_paperback_price_1_currency_code: 'USD',
            publication_paperback_price_1_unit_price: 'twenty',
          },
        ]),
      ),
    );

    expect(errorMessages(await parser.parse())).toEqual([
      'errors.csvFieldNotNumber:{"field":"publication_paperback_price_1_unit_price","row":1}',
    ]);
  });

  it('still accepts valid numerics', async () => {
    const { parser } = makeParser(
      makeFile(buildCsv([{ ...BASE, page_count: '302', image_count: '12' }])),
    );

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].pageCount).toBe(302);
  });
});

// ---------------------------------------------------------------------------
// Abstract / biography representability
// ---------------------------------------------------------------------------

describe('CSV preflight: text representability', () => {
  it('keeps plain text valid', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, long_abstract: 'One plain paragraph.' }])));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].abstracts[0].content).toBe('One plain paragraph.');
  });

  it('keeps blank-line paragraph separation valid, exactly as the API stores it', async () => {
    const abstract = 'First paragraph.\n\nSecond paragraph.';
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, long_abstract: abstract }])));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].abstracts[0].content).toBe(abstract);
  });

  it('keeps supported JATS structure valid and unrewritten', async () => {
    const abstract = '<p>First <bold>bold</bold> paragraph.</p><list list-type="bullet"><list-item><p>a</p></list-item></list>';
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, long_abstract: abstract }])));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].abstracts[0].content).toBe(abstract);
  });

  it('keeps a top-level JATS paragraph valid', async () => {
    const abstract = '<p>Valid paragraph</p>';
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, long_abstract: abstract }])));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].abstracts[0].content).toBe(abstract);
  });

  it('keeps a valid JATS list valid: the historical denylist is HTML lists, not JATS ones', async () => {
    const abstract =
      '<list list-type="bullet"><list-item><p>First</p></list-item><list-item><p>Second</p></list-item></list>';
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, long_abstract: abstract }])));

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.data.plan.works[0].abstracts[0].content).toBe(abstract);
  });

  it('rejects a lone line break inside a plain-text abstract before any mutation could', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, long_abstract: 'Line one\nline two.' }])));

    expect(errorMessages(await parser.parse())).toEqual([
      'errors.csvTextLineBreak:{"field":"long_abstract","row":1}',
    ]);
  });

  it('rejects a line-break element, the known unrepresentable markup regression', async () => {
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, short_abstract: '<p>Read<br>this</p>' }])));

    expect(errorMessages(await parser.parse())).toEqual([
      'errors.csvTextUnsupportedMarkup:{"field":"short_abstract","row":1,"tag":"br"}',
    ]);
  });

  // The block-HTML structures publisher support kept correcting by hand: an abstract pasted out of
  // a word processor or a web page. Every one of these is submitted as JATS_XML and refused by the
  // mutation, so preflight has to catch them here rather than after the user has waited for it.
  it.each([
    ['a div', '<div>My abstract</div>', 'div'],
    ['a heading', '<h2>Heading</h2><p>My abstract</p>', 'h2'],
    ['a blockquote', '<blockquote>Quoted</blockquote>', 'blockquote'],
    ['an HTML unordered list', '<ul><li>First</li><li>Second</li></ul>', 'ul'],
    ['an HTML ordered list', '<ol><li>First</li></ol>', 'ol'],
    ['a bare HTML list item', '<li>First</li>', 'li'],
    ['an uppercase div, since HTML element names are case-insensitive', '<DIV>My abstract</DIV>', 'DIV'],
    ['a stray closing block tag left behind by a paste', 'My abstract</div>', 'div'],
  ])('rejects %s, a known historical block-HTML fault, before lookup or mutation', async (_, abstract, tag) => {
    const { parser, spies } = makeParser(makeFile(buildCsv([{ ...BASE, long_abstract: abstract }])));

    const result = await parser.parse();

    expect(errorMessages(result)).toEqual([
      `errors.csvTextUnsupportedMarkup:{"field":"long_abstract","row":1,"tag":"${tag}"}`,
    ]);
    expect(result.data.plan.works).toHaveLength(0);
    expect(spies.getContributors).not.toHaveBeenCalled();
    expect(spies.getInstitutions).not.toHaveBeenCalled();
  });

  it('leaves markup outside the historical regression set to the API, by design', async () => {
    // Intentional fail-open. `<b>` is not in Thoth's JATS subset, but which elements are is backend
    // policy: the app keeps a small historical-regression denylist, not a copy of the backend
    // rulebook, so an element outside it passes preflight and the API stays the judge. Replacing
    // this with "reject every tag that is not explicitly allowed" is the thing being guarded against.
    const { parser } = makeParser(makeFile(buildCsv([{ ...BASE, short_abstract: '<p>Read <b>this</b></p>' }])));

    expect((await parser.parse()).status).toBe('success');
  });

  it('rejects the known nested-block regression: a block element inside a paragraph', async () => {
    const { parser } = makeParser(
      makeFile(buildCsv([{ ...BASE, long_abstract: '<p>Intro<list list-type="bullet"><list-item><p>a</p></list-item></list></p>' }])),
    );

    expect(errorMessages(await parser.parse())).toEqual([
      'errors.csvTextNestedBlock:{"field":"long_abstract","row":1}',
    ]);
  });

  it('applies the same representability rules to contributor biographies', async () => {
    const { parser } = makeParser(
      makeFile(
        buildCsv([
          {
            ...BASE,
            contribution_1_first_name: 'A',
            contribution_1_surname: 'B',
            contribution_1_biography: '<p>Bio<br></p>',
          },
        ]),
      ),
    );

    expect(errorMessages(await parser.parse())).toEqual([
      'errors.csvTextUnsupportedMarkup:{"field":"contribution_1_biography","row":1,"tag":"br"}',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Aggregation, ordering and cascade suppression
// ---------------------------------------------------------------------------

describe('CSV preflight: aggregation', () => {
  it('returns every independent error in one row together', async () => {
    const { parser } = makeParser(
      makeFile(
        buildCsv([{ ...BASE, publication_date: '22.07.26', doi: 'PROD-1', page_count: 'many' }]),
      ),
    );

    const result = await parser.parse();

    expect(errorMessages(result)).toEqual([
      'errors.csvFieldNotIsoDate:{"field":"publication_date","value":"22.07.26","row":1}',
      'errors.csvDoiNotValid:{"value":"PROD-1","row":1}',
      'errors.csvFieldNotNumber:{"field":"page_count","row":1}',
    ]);
  });

  it('does not let an earlier validator finding suppress later deterministic checks', async () => {
    // work_status is a csv-file-validator rule; the date rule is app-owned and runs later.
    const { parser } = makeParser(
      makeFile(buildCsv([{ ...BASE, work_status: 'Published', publication_date: '22.07.26' }])),
    );

    const result = await parser.parse();
    const messages = errorMessages(result);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('csvFieldNotValidOptions');
    expect(messages[1]).toBe('errors.csvFieldNotIsoDate:{"field":"publication_date","value":"22.07.26","row":1}');
  });

  it('aggregates independent errors across several rows in row order', async () => {
    const { parser } = makeParser(
      makeFile(
        buildCsv([
          { ...BASE, publication_date: '22.07.26' },
          { ...BASE },
          { ...BASE, doi: 'PROD-3' },
        ]),
      ),
    );

    const result = await parser.parse();

    expect(errorMessages(result)).toEqual([
      'errors.csvFieldNotIsoDate:{"field":"publication_date","value":"22.07.26","row":1}',
      'errors.csvDoiNotValid:{"value":"PROD-3","row":3}',
    ]);
  });

  it('suppresses series-identity cascades behind an unresolved imprint but keeps independent checks', async () => {
    // The imprint is wrong, so series identity cannot be scoped: no series noise. The issue
    // number is checked independently of the imprint, so its own error still surfaces.
    const { parser } = makeParser(
      makeFile(
        buildCsv([{ ...BASE, imprint: 'No Such Publisher', series_name: 'Some Series', series_issue_number: 'x' }]),
      ),
    );

    const result = await parser.parse();
    const messages = errorMessages(result);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('csvFieldNotValidOptions');
    expect(messages[1]).toBe('errors.csvSeriesIssueNumberNotValid:{"value":"x","row":1}');
  });

  it('returns the identical issue list when the same file is parsed again', async () => {
    const csv = buildCsv([
      { ...BASE, publication_date: '22.07.26', doi: 'PROD-1', contribution_1_first_name: ' A', contribution_1_surname: 'B' },
      { ...BASE, page_count: 'many' },
    ]);

    const first = await makeParser(makeFile(csv)).parser.parse();
    const second = await makeParser(makeFile(csv)).parser.parse();

    expect(first.issues).toEqual(second.issues);
    expect(first.issues.length).toBeGreaterThan(2);
  });
});

// ---------------------------------------------------------------------------
// Network / side-effect boundary
// ---------------------------------------------------------------------------

describe('CSV preflight: side-effect boundary', () => {
  it('performs no contributor or institution lookup while blocking errors exist', async () => {
    const { parser, spies } = makeParser(
      makeFile(
        buildCsv([
          {
            ...BASE,
            publication_date: '22.07.26',
            contribution_1_first_name: 'Jane',
            contribution_1_surname: 'Doe',
            contribution_1_role: 'AUTHOR',
            contribution_1_affiliation_institution_ror: 'https://ror.org/03vek6s52',
          },
        ]),
      ),
    );

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(result.data.plan.works).toHaveLength(0);
    expect(result.data.contributorsForSelection).toEqual({});
    expect(spies.getContributors).not.toHaveBeenCalled();
    expect(spies.getInstitutions).not.toHaveBeenCalled();
  });

  it('still performs lookups after a clean preflight', async () => {
    const { parser, spies } = makeParser(
      makeFile(
        buildCsv([
          { ...BASE, contribution_1_first_name: 'Jane', contribution_1_surname: 'Doe', contribution_1_role: 'AUTHOR' },
        ]),
      ),
    );

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(spies.getContributors).toHaveBeenCalledWith('Jane Doe');
  });

  it('keeps a genuine lookup rejection after a clean preflight as a hard failure', async () => {
    const getContributors = vi.fn().mockRejectedValue(new Error('auth failed'));
    const { parser } = makeParser(
      makeFile(
        buildCsv([
          { ...BASE, contribution_1_first_name: 'Jane', contribution_1_surname: 'Doe', contribution_1_role: 'AUTHOR' },
        ]),
      ),
      { getContributors },
    );

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(result.issues).toEqual([
      {
        severity: 'error',
        code: 'csv.parsing_failed',
        message: 'errors.csvParsingError',
        source: { kind: 'file' },
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// One file, many faults: the required aggregate regression
// ---------------------------------------------------------------------------

describe('CSV preflight: one file, many faults', () => {
  const faultyRows: Record<string, string>[] = [
    {
      ...BASE,
      work_status: 'Published', // csv-file-validator enum error
      publication_date: '22.07.26', // non-ISO date
      doi: 'PROD-1234', // not a DOI in any accepted form
      page_count: 'many', // malformed numeric
      short_abstract: '<div>My abstract</div>', // known historical block-HTML fault
      long_abstract: 'Line one\nline two.', // unrepresentable lone line break
      contribution_1_first_name: ' Jane', // boundary whitespace on a lookup identity
      contribution_1_surname: 'Doe',
      contribution_1_role: 'AUTHOR',
      contribution_1_orcid: '0000-0002-1825', // malformed ORCID
      contribution_1_affiliation_institution_ror: 'not-a-ror', // invalid ROR
    },
    {
      ...BASE,
      withdrawn_date: '2026-02-30', // impossible calendar date
      publication_paperback_isbn: '9781234567890', // invalid ISBN check digit
      contribution_1_first_name: 'John',
      contribution_1_surname: 'Smith',
      contribution_1_role: 'AUTHOR',
      contribution_1_biography: '<p>Bio<br></p>', // markup outside the JATS subset
    },
  ];

  it('returns the complete independently actionable set from one parse, in deterministic order', async () => {
    const { parser, spies } = makeParser(makeFile(buildCsv(faultyRows)));

    const result = await parser.parse();

    expect(result.status).toBe('failed');
    expect(result.data.plan.works).toHaveLength(0);
    expect(spies.getContributors).not.toHaveBeenCalled();
    expect(spies.getInstitutions).not.toHaveBeenCalled();

    const messages = errorMessages(result);

    // Row 1: the validator's finding first, then the app-owned rules in template column order.
    expect(messages[0]).toContain('csvFieldNotValidOptions'); // work_status
    expect(messages.slice(1, 9)).toEqual([
      'errors.csvFieldNotIsoDate:{"field":"publication_date","value":"22.07.26","row":1}',
      'errors.csvDoiNotValid:{"value":"PROD-1234","row":1}',
      'errors.csvFieldNotNumber:{"field":"page_count","row":1}',
      'errors.csvTextUnsupportedMarkup:{"field":"short_abstract","row":1,"tag":"div"}',
      'errors.csvTextLineBreak:{"field":"long_abstract","row":1}',
      'errors.csvFieldWhitespace:{"field":"contribution_1_first_name","row":1}',
      'errors.csvOrcidNotValid:{"field":"contribution_1_orcid","value":"0000-0002-1825","row":1}',
      'errors.csvRorNotValid:{"field":"contribution_1_affiliation_institution_ror","value":"not-a-ror","row":1}',
    ]);

    // Row 2: again validator finding first (ISBN), then the app-owned rules.
    expect(messages[9]).toContain('publication_paperback_isbn');
    expect(messages.slice(10)).toEqual([
      'errors.csvFieldNotIsoDate:{"field":"withdrawn_date","value":"2026-02-30","row":2}',
      'errors.csvTextUnsupportedMarkup:{"field":"contribution_1_biography","row":2,"tag":"br"}',
    ]);

    expect(messages).toHaveLength(12);

    // Every issue names its source row, in source order.
    expect(result.issues.map(({ source }) => source.kind === 'csv' && source.row)).toEqual([
      1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2,
    ]);
  });

  it('reaches normal planning and contributor selection once every fault is corrected', async () => {
    const correctedRows = [
      {
        ...faultyRows[0],
        work_status: 'ACTIVE',
        publication_date: '2026-07-22',
        doi: '10.12345/test-book',
        page_count: '302',
        short_abstract: '<p>My abstract</p>',
        long_abstract: 'Line one line two.',
        contribution_1_first_name: 'Jane',
        contribution_1_orcid: '0000-0002-1825-0097',
        contribution_1_affiliation_institution_ror: '03vek6s52',
      },
      {
        ...faultyRows[1],
        withdrawn_date: '',
        publication_paperback_isbn: '978-3-16-148410-0',
        contribution_1_biography: '<p>Bio</p>',
      },
    ];
    const getInstitutions = vi
      .fn()
      .mockResolvedValue([{ id: 'inst-1', name: 'Harvard', ror: 'https://ror.org/03vek6s52' }]);
    const { parser, spies } = makeParser(makeFile(buildCsv(correctedRows)), { getInstitutions });

    const result = await parser.parse();

    expect(result.status).toBe('success');
    expect(result.issues).toEqual([]);
    expect(result.data.plan.works).toHaveLength(2);
    expect(result.data.plan.works[0].doi).toBe('https://doi.org/10.12345/test-book');
    expect(result.data.plan.works[1].publications[0].isbn).toBe('978-3-16-148410-0');
    expect(Object.keys(result.data.contributorsForSelection)).toHaveLength(2);
    expect(spies.getContributors).toHaveBeenCalled();
  });
});
