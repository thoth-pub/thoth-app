// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Element } from 'slimdom';
import { describe, expect, it, vi } from 'vitest';

import { strictDisposition } from './dispositions';
import { type FindingClass, makeFinding, type SourceFinding } from './findings';
import { inventoryBindings } from './inventory/inventory';
import { applyRecoveryOverlay } from './recovery';
import { SCHEMA_MODELS } from './schemaModel';
import { evaluateStrict } from './strict/evaluate';
import { buildRuleset, compileRuleset, type Ruleset } from './strict/ruleset';
import type { OnixRelease } from './types';
import { createOnixSourceValidator } from './validator';
import { buildXdm, serializeXdm } from './xdm';

// The validator compiles the pinned XSDs and ~1,300 strict assertions per release on first use.
vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
const loadResource = async (fileName: string) => new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName)));
const validator = createOnixSourceValidator({ loadResource });
const encode = (text: string) => new TextEncoder().encode(text);

const SCHEMA_RELEASE = { '3.0': '3.0.8', '3.1': '3.1.3' } as const;
const rulesets = new Map<OnixRelease, Ruleset>();
const rulesetFor = (release: OnixRelease) => {
  let ruleset = rulesets.get(release);
  if (!ruleset) {
    const xsd = readFileSync(join(PUBLIC_DIR, `ONIX_BookProduct_${release}_reference_strict.xsd`), 'utf8');
    ruleset = compileRuleset(buildRuleset(xsd), SCHEMA_MODELS[release]);
    rulesets.set(release, ruleset);
  }
  return ruleset;
};

// ---------------------------------------------------------------------------
// Minimal synthetic messages (no publisher file content)
// ---------------------------------------------------------------------------
const SUBJECT = (scheme: string, body = '') =>
  `<Subject><SubjectSchemeIdentifier>${scheme}</SubjectSchemeIdentifier>${body}</Subject>`;
const PUBLISHER_ID = (type: string, value: string, extra = '') =>
  `<PublisherIdentifier><PublisherIDType>${type}</PublisherIDType>${extra}<IDValue>${value}</IDValue></PublisherIdentifier>`;

/** A valid ISBN-13 per Product: 978 00000000 n, with its check digit. */
const isbn = (n: number) => `97800000000${n}${(10 - ((38 + 3 * n) % 10)) % 10}`;

const product = (n: number, subjects = '', publisherIds = '', extraDescriptive = '') =>
  `<Product><RecordReference>recovery.${n}</RecordReference><NotificationType>03</NotificationType>` +
  `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn(n)}</IDValue></ProductIdentifier>` +
  '<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>' +
  '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Recovery</TitleText></TitleElement></TitleDetail>' +
  `<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>${extraDescriptive}${subjects}</DescriptiveDetail>` +
  `<PublishingDetail><Publisher><PublishingRole>01</PublishingRole>${publisherIds}<PublisherName>Recovery Press</PublisherName></Publisher>` +
  '<PublishingStatus>04</PublishingStatus><PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20260101</Date></PublishingDate>' +
  '</PublishingDetail></Product>';

const message = (release: OnixRelease, products: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><ONIXMessage release="${release}" xmlns="http://ns.editeur.org/onix/${release}/reference">` +
  '<Header><Sender><SenderName>Recovery</SenderName></Sender><SentDateTime>20260915T1200</SentDateTime></Header>' +
  `${products}</ONIXMessage>`;

const P1 = '/ONIXMessage[1]/Product[1]';
const PID = (p = 1, i = 1) =>
  `/ONIXMessage[1]/Product[${p}]/PublishingDetail[1]/Publisher[1]/PublisherIdentifier[${i}]`;
const SUBJECT_PATH = (p = 1, i = 1) => `/ONIXMessage[1]/Product[${p}]/DescriptiveDetail[1]/Subject[${i}]`;
const HYPHENATED = '0000-0001-2161-2573';
const CANONICAL = '0000000121612573';

/** The strict-tier ledger of one synthetic message, as the validator builds it, with each context element by index. */
function strictLedger(xml: string, release: OnixRelease = '3.0') {
  const { document } = buildXdm(xml);
  const ruleset = rulesetFor(release);
  const contexts = new Map<number, Element>();
  const findings = evaluateStrict(ruleset, document).findings.map((f, index) => {
    contexts.set(index, f.node);
    const klass = strictDisposition(SCHEMA_RELEASE[release], f.id)![0] as FindingClass;
    return makeFinding({
      id: f.id,
      tier: 'STRICT',
      stage: 6,
      scope: 'VALIDITY',
      class: klass,
      blocking: klass === 'NORMATIVE_INVALID',
      path: f.path,
      message: f.message,
    });
  });
  return { document, ruleset, findings, contexts, schemaRelease: SCHEMA_RELEASE[release] };
}

const overlay = (ledger: ReturnType<typeof strictLedger>, findings: readonly SourceFinding[] = ledger.findings) =>
  applyRecoveryOverlay({ ...ledger, findings });

/** Every field of a finding except the two the recovery disposition may change. */
const identity = ({ recoverability: _r, counts: _c, ...rest }: SourceFinding) => rest;

// ---------------------------------------------------------------------------
// Recovery A: declared publisher ISNI lexical form (_20171126_b_42)
// ---------------------------------------------------------------------------
describe('NORMALIZE_IDENTIFIER_LEXICAL_FORM', () => {
  it.each([
    ['hyphens', HYPHENATED],
    ['spaces', '0000 0001 2161 2573'],
    ['mixed spaces and hyphens', ' 0000-0001 2161-2573 '],
  ])(
    'recovers a declared ISNI written with %s, keeping the finding truthful and canonicalising only IDValue',
    (_label, value) => {
      const ledger = strictLedger(message('3.0', product(1, '', PUBLISHER_ID('16', value))));
      expect(ledger.findings.map((f) => [f.id, f.path, f.counts])).toEqual([['_20171126_b_42', PID(), true]]);

      const result = overlay(ledger);

      expect(result.findings).toHaveLength(1);
      const [recovered] = result.findings;
      expect(identity(recovered)).toEqual(identity(ledger.findings[0]));
      expect(recovered).toMatchObject({
        id: '_20171126_b_42',
        tier: 'STRICT',
        class: 'NORMATIVE_INVALID',
        blocking: true,
        projection: 'AUTHORITATIVE',
        recoverability: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
        counts: false,
      });
      expect(result.recoveries).toEqual([
        {
          recovery: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
          rule: '_20171126_b_42',
          path: PID(),
          valuePath: `${PID()}/IDValue[1]`,
          scheme: { element: 'PublisherIDType', code: '16' },
          original: value,
          canonical: CANONICAL,
        },
      ]);
      const xml = serializeXdm(ledger.document);
      expect(xml).toContain(`<IDValue>${CANONICAL}</IDValue>`);
      expect(xml).not.toContain(value);
      expect(xml).toContain('<PublisherIDType>16</PublisherIDType>');
    },
  );

  it('never mutates the ledger it is given', () => {
    const ledger = strictLedger(message('3.0', product(1, '', PUBLISHER_ID('16', HYPHENATED))));
    const before = JSON.stringify(ledger.findings);
    overlay(ledger);
    expect(JSON.stringify(ledger.findings)).toBe(before);
  });

  it('produces nothing for an ISNI already in canonical form', () => {
    const ledger = strictLedger(message('3.0', product(1, '', PUBLISHER_ID('16', CANONICAL))));
    const before = serializeXdm(ledger.document);
    expect(ledger.findings).toEqual([]);
    expect(overlay(ledger)).toEqual({ findings: [], recoveries: [] });
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it.each([
    ['a check-character error', '0000-0001-2161-2574'],
    ['too few characters', '0000-0001-2161-257'],
    ['an out-of-range value', '0000-0002-0000-0000'],
    ['a non-ASCII hyphen (U+2010)', '0000‐0001‐2161‐2573'],
    ['a no-break space', '0000 0001 2161 2573'],
    ['a tab', '0000\t0001\t2161\t2573'],
    ['an underscore', '0000_0001_2161_2573'],
    ['a letter to repair', '0000-0001-2161-257O'],
  ])('leaves a declared ISNI with %s blocking and the source tree untouched', (_label, value) => {
    const ledger = strictLedger(message('3.0', product(1, '', PUBLISHER_ID('16', value))));
    const before = serializeXdm(ledger.document);
    expect(ledger.findings.filter((f) => f.id === '_20171126_b_42')).toHaveLength(1);

    const result = overlay(ledger);

    expect(result.findings).toEqual(ledger.findings);
    expect(result.recoveries).toEqual([]);
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it.each([
    ['a proprietary identifier', '01', '<IDTypeName>Internal</IDTypeName>'],
    ['a GLN', '06', ''],
    ['an ORCID-typed identifier', '21', ''],
  ])('never treats %s shaped like an ISNI as an ISNI', (_label, type, extra) => {
    const ledger = strictLedger(message('3.0', product(1, '', PUBLISHER_ID(type, HYPHENATED, extra))));
    const before = serializeXdm(ledger.document);
    expect(ledger.findings.filter((f) => f.id === '_20171126_b_42')).toEqual([]);
    // Even a _20171126_b_42 finding pinned onto that composite is refused: the declared scheme decides, never the value.
    const forged = forgedIsni(PID());
    const contexts = new Map(ledger.contexts);
    contexts.set(ledger.findings.length, contextOf(ledger.document, 'PublisherIdentifier'));

    const result = applyRecoveryOverlay({ ...ledger, contexts, findings: [...ledger.findings, forged] });

    expect(result.recoveries).toEqual([]);
    expect(result.findings.at(-1)).toEqual(forged);
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it('refuses a PublisherIdentifier with no declared PublisherIDType', () => {
    const ledger = strictLedger(message('3.0', product(1, '', PUBLISHER_ID('16', HYPHENATED))));
    const identifier = contextOf(ledger.document, 'PublisherIdentifier');
    identifier.removeChild(identifier.getElementsByTagName('PublisherIDType')[0]);
    const result = overlay(ledger);
    expect(result.recoveries).toEqual([]);
    expect(result.findings).toEqual(ledger.findings);
  });

  it('never recovers the equivalent Contributor NameIdentifier ISNI rule', () => {
    const contributor =
      '<Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>A01</ContributorRole>' +
      `<NameIdentifier><NameIDType>16</NameIDType><IDValue>${HYPHENATED}</IDValue></NameIdentifier><PersonName>A</PersonName></Contributor>`;
    const ledger = strictLedger(message('3.0', product(1, '', '', contributor)));
    expect(ledger.findings.map((f) => f.counts)).toContain(true);
    expect(ledger.findings.map((f) => f.id)).not.toContain('_20171126_b_42');
    const result = overlay(ledger);
    expect(result.findings).toEqual(ledger.findings);
    expect(result.recoveries).toEqual([]);
  });

  it.each([
    ['SECONDARY', { projection: 'SECONDARY' as const }],
    ['NOT_EVALUABLE', { projection: 'NOT_EVALUABLE' as const, class: 'RULE_NOT_EVALUABLE' as const, blocking: false }],
    ['a Schematron finding', { tier: 'SCHEMATRON' as const, stage: 7 as const }],
    ['an inventory finding', { tier: 'INVENTORY' as const, stage: 8 as const }],
    ['an ADVISORY finding', { class: 'ADVISORY' as const, blocking: false }],
    ['a SUPPORT finding', { scope: 'SUPPORT' as const }],
    ['an already recovered finding', { recoverability: 'OMIT_INVALID_COMPOSITE' as const }],
    ['a finding whose path is not its context', { path: `${P1}/PublishingDetail[1]/Publisher[1]` }],
    ['a different rule id', { id: '_20171126_b_43' }],
  ])('only recovers the expected authoritative STRICT validity finding, never %s', (_label, change) => {
    const ledger = strictLedger(message('3.0', product(1, '', PUBLISHER_ID('16', HYPHENATED))));
    const altered = makeFinding({ ...ledger.findings[0], ...change });
    const before = serializeXdm(ledger.document);

    const result = overlay(ledger, [altered]);

    expect(result.findings).toEqual([altered]);
    expect(result.recoveries).toEqual([]);
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it.each([
    ['SECONDARY', { projection: 'SECONDARY' as const }],
    ['non-blocking', { blocking: false }],
    ['NOT_EVALUABLE', { projection: 'NOT_EVALUABLE' as const }],
  ])('checks every dimension itself, refusing a %s finding that still claims to count', (_label, change) => {
    const ledger = strictLedger(message('3.0', product(1, '', PUBLISHER_ID('16', HYPHENATED))));
    const inconsistent: SourceFinding = { ...ledger.findings[0], ...change, counts: true };
    expect(overlay(ledger, [inconsistent])).toEqual({ findings: [inconsistent], recoveries: [] });
  });

  it('refuses a finding with no context element', () => {
    const ledger = strictLedger(message('3.0', product(1, '', PUBLISHER_ID('16', HYPHENATED))));
    const result = applyRecoveryOverlay({ ...ledger, contexts: new Map() });
    expect(result.findings).toEqual(ledger.findings);
    expect(result.recoveries).toEqual([]);
  });

  it('refuses when IDValue carries anything but text', () => {
    const ledger = strictLedger(message('3.0', product(1, '', PUBLISHER_ID('16', '0000-0001-<!-- kept -->2161-2573'))));
    expect(ledger.findings.map((f) => f.id)).toEqual(['_20171126_b_42']);
    const before = serializeXdm(ledger.document);
    expect(overlay(ledger).recoveries).toEqual([]);
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it('does not recover when another blocking rule applies to the same PublisherIdentifier', () => {
    // A declared ISNI must not carry IDTypeName (_20171126_b_37): an independent defect of the same composite.
    const ledger = strictLedger(
      message('3.0', product(1, '', PUBLISHER_ID('16', HYPHENATED, '<IDTypeName>x</IDTypeName>'))),
    );
    expect(ledger.findings.map((f) => [f.id, f.counts])).toEqual([
      ['_20171126_b_37', true],
      ['_20171126_b_42', true],
    ]);
    const before = serializeXdm(ledger.document);

    const result = overlay(ledger);

    expect(result.findings).toEqual(ledger.findings);
    expect(result.recoveries).toEqual([]);
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it('does not canonicalise into a duplicate PublisherIdentifier the source never contained', () => {
    const ids = PUBLISHER_ID('16', HYPHENATED) + PUBLISHER_ID('16', CANONICAL);
    const ledger = strictLedger(message('3.0', product(1, '', ids)));
    expect(ledger.findings.map((f) => [f.id, f.path])).toEqual([['_20171126_b_42', PID(1, 1)]]);
    const before = serializeXdm(ledger.document);

    const result = overlay(ledger);

    expect(result.findings).toEqual(ledger.findings);
    expect(result.recoveries).toEqual([]);
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it.each(['3.0', '3.1'] as const)(
    '%s: no rule outside the checked scope can read a PublisherIdentifier IDValue',
    (release) => {
      const ruleset = rulesetFor(release);
      // Message-level assertions are the only strict ancestors the recovery does not re-evaluate.
      const message = ruleset.byElement.get('ONIXMessage') ?? [];
      expect(message.length).toBeGreaterThan(0);
      expect(message.filter((rule) => /Publisher/.test(rule.test)).map((rule) => rule.id)).toEqual([]);
      // Schematron and the stage-8 inventory saw the supplied value; none of them can see the canonical one differently.
      expect(ruleset.schematron.filter((r) => /PublisherIdentifier/.test(r.test + r.context)).map((r) => r.id)).toEqual(
        [],
      );
      expect(
        ruleset.schematron
          .filter((r) => /IDValue/.test(r.test))
          .map((r) => r.id)
          .sort(),
      ).toEqual(['_20180202_d_54', '_20190410_c_3']);
      const bindings = inventoryBindings(release);
      const xpathOf = (b: (typeof bindings)[number]) => ('xpath' in b ? b.xpath : null);
      // Stage-8 rules of a PublisherIdentifier read IDValue only under a declared type other than ISNI (16).
      const own = bindings.filter((b) => b.owner === 'PublisherIdentifier');
      expect(own.length).toBeGreaterThan(0);
      for (const b of own) {
        expect(xpathOf(b), b.id).toMatch(
          /^let \$t := \*\[matches\(local-name\(\), 'IDType\$'\)\](, \$v := string\(IDValue\))? return not\(\$t = '(?!16')\d\d'/,
        );
      }
      // Its ancestors' and children's stage-8 rules never read IDValue or a PublisherIdentifier.
      const around = bindings.filter((b) =>
        [
          'Publisher',
          'PublishingDetail',
          'Product',
          'ONIXMessage',
          'PublisherIDType',
          'IDValue',
          'IDTypeName',
        ].includes(b.owner),
      );
      const reads = (b: (typeof bindings)[number], pattern: RegExp) => pattern.test(xpathOf(b) ?? '');
      expect(around.filter((b) => reads(b, /PublisherIdentifier|PublisherIDType/)).map((b) => b.id)).toEqual([]);
      // Product-level rules read ProductIdentifier/IDValue, never a Publisher's; nothing closer reads IDValue at all.
      expect(
        around
          .filter(
            (b) => reads(b, /IDValue/) && (reads(b, /Publisher/) || !['Product', 'ONIXMessage'].includes(b.owner)),
          )
          .map((b) => b.id),
      ).toEqual([]);
      // Native rules cannot be read statically: they are enumerated so a new one is reviewed against this recovery.
      expect(bindings.filter((b) => xpathOf(b) === null).map((b) => b.id)).toEqual([
        'R-MSG-XMLDECL',
        'R-XHTML-EVENTATTR',
        'R-XHTML-INTERLINEAR',
        ...(release === '3.1' ? ['R-JSONLD-CONTEXT-31'] : []),
      ]);
    },
  );

  it('recovers each PublisherIdentifier independently', () => {
    const ids = PUBLISHER_ID('16', HYPHENATED) + PUBLISHER_ID('16', '0000-0001-2161-2574');
    const ledger = strictLedger(message('3.1', product(1, '', ids)), '3.1');
    expect(ledger.findings.map((f) => [f.id, f.path])).toEqual([
      ['_20171126_b_42', PID(1, 1)],
      ['_20171126_b_42', PID(1, 2)],
    ]);

    const result = overlay(ledger);

    expect(result.findings.map((f) => [f.path, f.recoverability, f.counts])).toEqual([
      [PID(1, 1), 'NORMALIZE_IDENTIFIER_LEXICAL_FORM', false],
      [PID(1, 2), 'NOT_RECOVERABLE', true],
    ]);
    expect(result.recoveries.map((r) => r.path)).toEqual([PID(1, 1)]);
    const xml = serializeXdm(ledger.document);
    expect(xml).toContain(`<IDValue>${CANONICAL}</IDValue>`);
    expect(xml).toContain('<IDValue>0000-0001-2161-2574</IDValue>');
  });
});

// ---------------------------------------------------------------------------
// Recovery B: List 27 code 23 publisher category without SubjectSchemeName (_20171218_a_2)
// ---------------------------------------------------------------------------
describe('PUBLISHER_CATEGORY_TO_CUSTOM', () => {
  it.each([
    ['a SubjectCode', '<SubjectCode>HIS037000</SubjectCode>', 'SubjectCode', 'SubjectCode[1]', 'HIS037000'],
    [
      'a SubjectCode, which takes precedence over heading text',
      '<SubjectCode>HIS037000</SubjectCode><SubjectHeadingText>Modern history</SubjectHeadingText>',
      'SubjectCode',
      'SubjectCode[1]',
      'HIS037000',
    ],
    [
      'only SubjectHeadingText, trimmed',
      '<SubjectHeadingText>  Modern history  </SubjectHeadingText>',
      'SubjectHeadingText',
      'SubjectHeadingText[1]',
      'Modern history',
    ],
  ])(
    'recovers a code-23 category with %s, without inventing a scheme name',
    (_label, body, valueSource, valueStep, value) => {
      const ledger = strictLedger(message('3.0', product(1, SUBJECT('23', body))));
      expect(ledger.findings.map((f) => [f.id, f.path, f.counts])).toEqual([['_20171218_a_2', SUBJECT_PATH(), true]]);
      const before = serializeXdm(ledger.document);

      const result = overlay(ledger);

      expect(identity(result.findings[0])).toEqual(identity(ledger.findings[0]));
      expect(result.findings[0]).toMatchObject({ recoverability: 'PUBLISHER_CATEGORY_TO_CUSTOM', counts: false });
      expect(result.recoveries).toEqual([
        {
          recovery: 'PUBLISHER_CATEGORY_TO_CUSTOM',
          rule: '_20171218_a_2',
          path: SUBJECT_PATH(),
          scheme: { element: 'SubjectSchemeIdentifier', code: '23' },
          valueSource,
          valuePath: `${SUBJECT_PATH()}/${valueStep}`,
          value,
        },
      ]);
      // The Subject composite is left exactly as supplied: nothing is synthesised or rewritten.
      expect(serializeXdm(ledger.document)).toBe(before);
      expect(before).not.toContain('SubjectSchemeName');
    },
  );

  it('falls back to heading text when SubjectCode is blank', () => {
    const ledger = strictLedger(
      message(
        '3.0',
        product(1, SUBJECT('23', '<SubjectCode> </SubjectCode><SubjectHeadingText>History</SubjectHeadingText>')),
      ),
    );
    const result = overlay(ledger);
    expect(result.recoveries).toEqual([
      expect.objectContaining({ valueSource: 'SubjectHeadingText', value: 'History' }),
    ]);
  });

  it.each([
    ['no category value at all', ''],
    ['only blank heading text', '<SubjectHeadingText>   </SubjectHeadingText>'],
    [
      'several heading texts and no code, which is not one deterministic value',
      '<SubjectHeadingText language="eng">History</SubjectHeadingText><SubjectHeadingText language="ger">Geschichte</SubjectHeadingText>',
    ],
  ])('does not recover a code-23 Subject with %s', (_label, body) => {
    const ledger = strictLedger(message('3.0', product(1, SUBJECT('23', body))));
    // Strict evaluation alone leaves the finding authoritative: no category value still means no recovery.
    expect(ledger.findings.filter((f) => f.id === '_20171218_a_2')).toEqual([
      expect.objectContaining({ projection: 'AUTHORITATIVE', counts: true }),
    ]);

    const result = overlay(ledger);

    expect(result.findings).toEqual(ledger.findings);
    expect(result.recoveries).toEqual([]);
  });

  it.each(['24', 'B2', '04', '94', '95', '96', '97', '98', '99', '10', '20'])(
    'never extends the recovery to scheme %s, even for a finding pinned onto that Subject',
    (scheme) => {
      const ledger = strictLedger(message('3.0', product(1, SUBJECT(scheme, '<SubjectCode>HIST</SubjectCode>'))));
      expect(ledger.findings.filter((f) => f.id === '_20171218_a_2')).toEqual([]);
      const forged = forgedCategory(SUBJECT_PATH());
      const contexts = new Map(ledger.contexts);
      contexts.set(ledger.findings.length, contextOf(ledger.document, 'Subject'));

      const result = applyRecoveryOverlay({ ...ledger, contexts, findings: [...ledger.findings, forged] });

      expect(result.findings.at(-1)).toEqual(forged);
      expect(result.recoveries).toEqual([]);
    },
  );

  it('refuses a finding pinned onto a Subject that does carry SubjectSchemeName', () => {
    const body = '<SubjectSchemeName>Press categories</SubjectSchemeName><SubjectCode>HIST</SubjectCode>';
    const ledger = strictLedger(message('3.0', product(1, SUBJECT('23', body))));
    expect(ledger.findings).toEqual([]);
    const forged = forgedCategory(SUBJECT_PATH());
    const result = applyRecoveryOverlay({
      ...ledger,
      contexts: new Map([[0, contextOf(ledger.document, 'Subject')]]),
      findings: [forged],
    });
    expect(result).toEqual({ findings: [forged], recoveries: [] });
  });

  it.each([
    ['SECONDARY', { projection: 'SECONDARY' as const }],
    ['a Schematron finding', { tier: 'SCHEMATRON' as const, stage: 7 as const }],
    ['an ADVISORY finding', { class: 'ADVISORY' as const, blocking: false }],
    ['the proprietary-scheme rule', { id: '_20171218_a_1' }],
  ])('only recovers the expected authoritative STRICT validity finding, never %s', (_label, change) => {
    const ledger = strictLedger(message('3.0', product(1, SUBJECT('23', '<SubjectCode>HIST</SubjectCode>'))));
    const altered = makeFinding({ ...ledger.findings[0], ...change });
    const result = overlay(ledger, [altered]);
    expect(result).toEqual({ findings: [altered], recoveries: [] });
  });

  it('leaves another blocking finding of the same Subject counting', () => {
    const body =
      '<SubjectCode>HIST</SubjectCode><SubjectHeadingText>History</SubjectHeadingText><SubjectHeadingText>Modern history</SubjectHeadingText>';
    const ledger = strictLedger(message('3.0', product(1, SUBJECT('23', body))));
    expect(ledger.findings.map((f) => [f.id, f.path, f.counts])).toEqual([
      ['_20171218_a_2', SUBJECT_PATH(), true],
      ['_20171208_a_38', SUBJECT_PATH(), true],
    ]);

    const result = overlay(ledger);

    expect(result.findings.map((f) => [f.id, f.recoverability, f.counts])).toEqual([
      ['_20171218_a_2', 'PUBLISHER_CATEGORY_TO_CUSTOM', false],
      ['_20171208_a_38', 'NOT_RECOVERABLE', true],
    ]);
    expect(result.findings[1]).toBe(ledger.findings[1]);
  });
});

// ---------------------------------------------------------------------------
// Through the canonical validator
// ---------------------------------------------------------------------------
describe('the recovery overlay in the canonical validator', () => {
  const ledgerOf = (findings: readonly SourceFinding[]) =>
    findings.map((f) => `${f.tier}|${f.id}|${f.class}|${f.projection}|${f.recoverability}|${f.counts}|${f.path}`);

  it.each(['3.0', '3.1'] as const)(
    '%s: a standards-valid source is unchanged and produces no recovery',
    async (release) => {
      const xml = message(
        release,
        product(1, SUBJECT('10', '<SubjectCode>HIS037000</SubjectCode>'), PUBLISHER_ID('16', CANONICAL)),
      );
      const result = await validator.validate(encode(xml));
      expect(result.sourceValid).toBe(true);
      expect(result.summary.blocking).toBe(0);
      expect(result.summary.recovered).toBe(0);
      expect(result.normalized?.recoveries).toEqual([]);
      expect(result.findings.every((f) => f.recoverability === 'NOT_RECOVERABLE')).toBe(true);
      expect(result.normalized?.serialize()).toBe(serializeXdm(buildXdm(xml).document));
    },
  );

  it.each(['3.0', '3.1'] as const)(
    '%s: both approved defects stay in the ledger, recovered, and the source becomes ingestible',
    async (release) => {
      const xml = message(
        release,
        product(1, SUBJECT('23', '<SubjectCode>HIST</SubjectCode>'), PUBLISHER_ID('16', HYPHENATED)),
      );
      const result = await validator.validate(encode(xml));

      expect(result.status).toBe('COMPLETED');
      expect(ledgerOf(result.findings.filter((f) => f.tier === 'STRICT'))).toEqual([
        `STRICT|_20171218_a_2|NORMATIVE_INVALID|AUTHORITATIVE|PUBLISHER_CATEGORY_TO_CUSTOM|false|${SUBJECT_PATH()}`,
        `STRICT|_20171126_b_42|NORMATIVE_INVALID|AUTHORITATIVE|NORMALIZE_IDENTIFIER_LEXICAL_FORM|false|${PID()}`,
      ]);
      expect(result.summary).toMatchObject({ blocking: 0, recovered: 2, total: result.findings.length });
      expect(result.sourceValid).toBe(true);
      expect(result.normalized?.recoveries.map((r) => r.recovery)).toEqual([
        'PUBLISHER_CATEGORY_TO_CUSTOM',
        'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
      ]);
      const normalized = result.normalized!.serialize();
      expect(normalized).toContain(`<IDValue>${CANONICAL}</IDValue>`);
      expect(normalized).not.toContain(HYPHENATED);
      expect(normalized).not.toContain('SubjectSchemeName');
      expect(normalized).toContain('<SubjectCode>HIST</SubjectCode>');
    },
  );

  it.each(['3.0', '3.1'] as const)(
    '%s: the recovered source has exactly the ledger of its canonical twin apart from the recovered finding',
    async (release) => {
      const subjects = SUBJECT('10', '<SubjectCode>HIS037000</SubjectCode>');
      const [supplied, twin] = await Promise.all(
        [HYPHENATED, CANONICAL].map((value) =>
          validator.validate(encode(message(release, product(1, subjects, PUBLISHER_ID('16', value))))),
        ),
      );
      const withoutRecovered = (findings: readonly SourceFinding[]) =>
        ledgerOf(findings.filter((f) => f.recoverability === 'NOT_RECOVERABLE'));
      expect(withoutRecovered(supplied.findings)).toEqual(ledgerOf(twin.findings));
      expect(supplied.findings.filter((f) => f.recoverability !== 'NOT_RECOVERABLE').map((f) => f.id)).toEqual([
        '_20171126_b_42',
      ]);
      expect(supplied.normalized?.serialize()).toBe(twin.normalized?.serialize());
      expect(supplied.sourceValid).toBe(twin.sourceValid);
    },
  );

  it('keeps a separator-stripped but check-invalid ISNI blocking', async () => {
    const result = await validator.validate(
      encode(message('3.0', product(1, '', PUBLISHER_ID('16', '0000-0001-2161-2574')))),
    );
    expect(result.findings.filter((f) => f.id === '_20171126_b_42')).toEqual([
      expect.objectContaining({ recoverability: 'NOT_RECOVERABLE', counts: true }),
    ]);
    expect(result.sourceValid).toBe(false);
    expect(result.summary).toMatchObject({ blocking: 1, recovered: 0 });
    expect(result.normalized?.serialize()).toContain('<IDValue>0000-0001-2161-2574</IDValue>');
  });

  it('keeps a code-23 Subject with no category value unrecovered and the source invalid', async () => {
    const result = await validator.validate(encode(message('3.0', product(1, SUBJECT('23')))));
    expect(result.findings.filter((f) => f.id === '_20171218_a_2')).toEqual([
      expect.objectContaining({ recoverability: 'NOT_RECOVERABLE' }),
    ]);
    expect(result.normalized?.recoveries).toEqual([]);
    expect(result.sourceValid).toBe(false);
  });

  it.each(['24', 'B2', '04', '94', '99'])('scheme %s never inherits the code-23 recovery', async (scheme) => {
    const body =
      scheme === 'B2' || scheme === '04'
        ? '<SubjectHeadingText>History</SubjectHeadingText>'
        : '<SubjectCode>1</SubjectCode>';
    const result = await validator.validate(encode(message('3.0', product(1, SUBJECT(scheme, body)))));
    expect(result.findings.filter((f) => f.recoverability !== 'NOT_RECOVERABLE')).toEqual([]);
    expect(result.normalized?.recoveries).toEqual([]);
    if (scheme === '24') {
      expect(result.findings.filter((f) => f.id === '_20171218_a_1')).toEqual([
        expect.objectContaining({ counts: true }),
      ]);
      expect(result.sourceValid).toBe(false);
    }
  });

  it('never lets a recovery clear an unrelated blocking finding in the same Product or message', async () => {
    const languages =
      '<Language><LanguageRole>01</LanguageRole><LanguageCode>ger</LanguageCode></Language>' +
      '<Language><LanguageRole>02</LanguageRole><LanguageCode>ger</LanguageCode></Language>';
    const xml = message(
      '3.0',
      product(1, SUBJECT('23', '<SubjectCode>HIST</SubjectCode>'), PUBLISHER_ID('16', HYPHENATED), languages) +
        product(2, '', PUBLISHER_ID('16', '0000-0001-2161-2574')),
    );
    const result = await validator.validate(encode(xml));

    expect(result.findings.filter((f) => f.counts).map((f) => `${f.id} ${f.path}`)).toEqual([
      expect.stringMatching(/^_20171218_f_2 \/ONIXMessage\[1\]\/Product\[1\]\//),
      `_20171126_b_42 ${PID(2)}`,
    ]);
    expect(result.summary).toMatchObject({ blocking: 2, recovered: 2 });
    expect(result.sourceValid).toBe(false);
  });

  it('recovers the observed four-manifestation shape independently for every Product', async () => {
    const categories =
      SUBJECT('23', '<SubjectCode>UOLP-HIST</SubjectCode><SubjectHeadingText>History</SubjectHeadingText>') +
      SUBJECT('23', '<SubjectCode>UOLP-LAW</SubjectCode>') +
      SUBJECT('23', '<SubjectHeadingText> Legal history </SubjectHeadingText>');
    const products = [1, 2, 3, 4].map((n) => product(n, categories, PUBLISHER_ID('16', HYPHENATED))).join('');
    const result = await validator.validate(encode(message('3.1', products)));

    const recoveries = result.normalized!.recoveries;
    expect(recoveries.filter((r) => r.recovery === 'PUBLISHER_CATEGORY_TO_CUSTOM')).toHaveLength(12);
    expect(recoveries.filter((r) => r.recovery === 'NORMALIZE_IDENTIFIER_LEXICAL_FORM')).toHaveLength(4);
    expect(recoveries.map((r) => ('path' in r ? r.path : null))).toEqual(
      [1, 2, 3, 4].flatMap((p) => [SUBJECT_PATH(p, 1), SUBJECT_PATH(p, 2), SUBJECT_PATH(p, 3), PID(p)]),
    );
    expect(
      recoveries.map((r) =>
        r.recovery === 'PUBLISHER_CATEGORY_TO_CUSTOM' ? `${r.valueSource}:${r.value}` : r.recovery,
      ),
    ).toEqual(
      Array(4)
        .fill([
          'SubjectCode:UOLP-HIST',
          'SubjectCode:UOLP-LAW',
          'SubjectHeadingText:Legal history',
          'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
        ])
        .flat(),
    );
    // Every recovered finding is the exact finding of its own path, and nothing else changed disposition.
    const recovered = result.findings.filter((f) => f.recoverability !== 'NOT_RECOVERABLE');
    expect(recovered.map((f) => f.path)).toEqual(recoveries.map((r) => ('path' in r ? r.path : null)));
    expect(result.findings.filter((f) => f.counts)).toEqual([]);
    // Unrelated advisories stay visible and non-blocking.
    expect(result.findings.filter((f) => f.class === 'ADVISORY').length).toBeGreaterThan(0);
    expect(result.summary).toMatchObject({ blocking: 0, recovered: 16 });
    expect(result.sourceValid).toBe(true);
    const normalized = result.normalized!.serialize();
    expect(normalized.split(`<IDValue>${CANONICAL}</IDValue>`)).toHaveLength(5);
    expect(normalized).not.toContain(HYPHENATED);
    expect(normalized).not.toContain('SubjectSchemeName');
  });

  it('is deterministic', async () => {
    const xml = message(
      '3.0',
      product(1, SUBJECT('23', '<SubjectCode>HIST</SubjectCode>'), PUBLISHER_ID('16', HYPHENATED)),
    );
    const [first, second] = [await validator.validate(encode(xml)), await validator.validate(encode(xml))];
    expect(JSON.stringify(second.findings)).toBe(JSON.stringify(first.findings));
    expect(JSON.stringify(second.normalized?.recoveries)).toBe(JSON.stringify(first.normalized?.recoveries));
    expect(second.normalized?.serialize()).toBe(first.normalized?.serialize());
  });
});

function contextOf(document: ReturnType<typeof buildXdm>['document'], localName: string): Element {
  return document.getElementsByTagName(localName)[0] as Element;
}

function forgedIsni(path: string): SourceFinding {
  return forged('_20171126_b_42', path);
}

function forgedCategory(path: string): SourceFinding {
  return forged('_20171218_a_2', path);
}

function forged(id: string, path: string): SourceFinding {
  return makeFinding({
    id,
    tier: 'STRICT',
    stage: 6,
    scope: 'VALIDITY',
    class: 'NORMATIVE_INVALID',
    blocking: true,
    path,
    message: 'forged',
  });
}
