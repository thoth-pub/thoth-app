// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Element } from 'slimdom';
import { describe, expect, it, vi } from 'vitest';

import { createPublisherFixContext } from '../onixSourceBridge';
import { strictDisposition } from './dispositions';
import { type FindingClass, makeFinding, type SourceFinding } from './findings';
import { inventoryBindings } from './inventory/inventory';
import {
  applyPublisherFixToTree,
  applyRecoveryOverlay,
  canOmitShortDescription,
  checkEditionNumber,
  editableTextOf,
  EDITION_STATEMENT_RULE,
  elementAtPath,
  isPublisherFixable,
  judgeRevalidation,
  measureShortDescription,
  pathBeforeFix,
  type PublisherFix,
  recordPublisherFix,
  SHORT_DESCRIPTION_LENGTH_RULE,
  suggestEditionNumber,
  writeXhtmlForm,
} from './recovery';
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
// Recovery C: declared ORCID lexical form (_20171126_b_32; thoth#923 BULK-IMPORT-ONIX-ORCID-RECOVERY-01)
// ---------------------------------------------------------------------------
const ORCID = '0000-0002-1825-0097';
const ORCID_BARE = '0000000218250097';
const ORCID_X = '0000-0002-0001-001X';
const NAME_ID = (type: string, value: string, extra = '') =>
  `<NameIdentifier><NameIDType>${type}</NameIDType>${extra}<IDValue>${value}</IDValue></NameIdentifier>`;
const CONTRIBUTOR = (identifiers: string, n = 1) =>
  `<Contributor><SequenceNumber>${n}</SequenceNumber><ContributorRole>A01</ContributorRole>${identifiers}` +
  '<PersonName>Ada Lovelace</PersonName><NamesBeforeKey>Ada</NamesBeforeKey><KeyNames>Lovelace</KeyNames></Contributor>';
/** A Product whose Contributors sit where ONIX puts them, between TitleDetail and Language. */
const contributorProduct = (n: number, contributors: string, extraDescriptive = '') =>
  product(n, '', '', extraDescriptive).replace('</TitleDetail>', `</TitleDetail>${contributors}`);
const NID = (p = 1, c = 1, i = 1) =>
  `/ONIXMessage[1]/Product[${p}]/DescriptiveDetail[1]/Contributor[${c}]/NameIdentifier[${i}]`;
const orcidLedger = (value: string, release: OnixRelease = '3.0', extra = '') =>
  strictLedger(message(release, contributorProduct(1, CONTRIBUTOR(NAME_ID('21', value, extra)))), release);

/** Every approved non-bare spelling of one ORCID: the canonical hyphenated form, bare or hyphenated behind a resolver prefix. */
const APPROVED_SPELLINGS = (hyphenated: string) => {
  const bare = hyphenated.replace(/-/g, '');
  return [
    ['canonical hyphenated', hyphenated],
    ['HTTPS resolver, hyphenated', `https://orcid.org/${hyphenated}`],
    ['HTTPS resolver, bare', `https://orcid.org/${bare}`],
    ['scheme-less resolver, hyphenated', `orcid.org/${hyphenated}`],
    ['scheme-less resolver, bare', `orcid.org/${bare}`],
  ] as const;
};

describe('NORMALIZE_ORCID_LEXICAL_FORM', () => {
  it.each(
    (['3.0', '3.1'] as const).flatMap((release) =>
      APPROVED_SPELLINGS(ORCID).map(([label, value]) => [release, label, value] as const),
    ),
  )(
    '%s: recovers a declared ORCID in %s spelling, keeping the finding truthful and canonicalising only IDValue',
    (release, _label, value) => {
      const ledger = orcidLedger(value, release);
      expect(ledger.findings.map((f) => [f.id, f.path, f.counts])).toEqual([['_20171126_b_32', NID(), true]]);

      const result = overlay(ledger);

      expect(result.findings).toHaveLength(1);
      const [recovered] = result.findings;
      expect(identity(recovered)).toEqual(identity(ledger.findings[0]));
      expect(recovered).toMatchObject({
        id: '_20171126_b_32',
        tier: 'STRICT',
        stage: 6,
        scope: 'VALIDITY',
        class: 'NORMATIVE_INVALID',
        blocking: true,
        projection: 'AUTHORITATIVE',
        recoverability: 'NORMALIZE_ORCID_LEXICAL_FORM',
        counts: false,
      });
      expect(result.recoveries).toEqual([
        {
          recovery: 'NORMALIZE_ORCID_LEXICAL_FORM',
          rule: '_20171126_b_32',
          path: NID(),
          valuePath: `${NID()}/IDValue[1]`,
          scheme: { element: 'NameIDType', code: '21' },
          original: value,
          canonical: ORCID_BARE,
        },
      ]);
      const xml = serializeXdm(ledger.document);
      expect(xml).toContain(`<IDValue>${ORCID_BARE}</IDValue>`);
      expect(xml).not.toContain(value);
      expect(xml).toContain('<NameIDType>21</NameIDType>');
    },
  );

  it('needs nothing for a bare ORCID the pinned rules already accept', () => {
    const ledger = orcidLedger(ORCID_BARE);
    const before = serializeXdm(ledger.document);
    expect(ledger.findings).toEqual([]);
    expect(overlay(ledger)).toEqual({ findings: [], recoveries: [] });
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it.each([
    ['upper-case', ORCID_X, '000000020001001X'],
    ['lower-case', ORCID_X.toLowerCase(), '000000020001001x'],
  ])('keeps a %s terminal check character exactly as supplied', (_label, value, canonical) => {
    const ledger = orcidLedger(`https://orcid.org/${value}`);

    const result = overlay(ledger);

    expect(result.recoveries).toEqual([expect.objectContaining({ original: `https://orcid.org/${value}`, canonical })]);
    expect(serializeXdm(ledger.document)).toContain(`<IDValue>${canonical}</IDValue>`);
    // The bare lower-case form is already standards-valid: the pinned rules accept X and x alike.
    expect(orcidLedger(canonical).findings).toEqual([]);
  });

  it('never mutates the ledger it is given', () => {
    const ledger = orcidLedger(ORCID);
    const before = JSON.stringify(ledger.findings);
    overlay(ledger);
    expect(JSON.stringify(ledger.findings)).toBe(before);
  });

  it.each([
    ['an http:// resolver', `http://orcid.org/${ORCID}`],
    ['a www. host', `www.orcid.org/${ORCID}`],
    ['an https://www. host', `https://www.orcid.org/${ORCID}`],
    ['an upper-case scheme', `HTTPS://orcid.org/${ORCID}`],
    ['an upper-case host', `https://ORCID.org/${ORCID}`],
    ['a capitalised scheme-less host', `Orcid.org/${ORCID}`],
    ['a query string', `https://orcid.org/${ORCID}?lang=en`],
    ['a fragment', `https://orcid.org/${ORCID}#works`],
    ['trailing path material', `https://orcid.org/${ORCID}/works`],
    ['a trailing slash', `https://orcid.org/${ORCID}/`],
    ['a doubled slash', `orcid.org//${ORCID}`],
    ['a repeated prefix', `https://orcid.org/orcid.org/${ORCID}`],
    ['the prefix alone', 'https://orcid.org/'],
    ['percent-encoding', `https://orcid.org/0000%2D0002%2D1825%2D0097`],
    ['a leading space', ` ${ORCID}`],
    ['a trailing space', `${ORCID} `],
    ['a wrapping tab', `\t${ORCID}\t`],
    ['inner spaces', '0000 0002 1825 0097'],
    ['a non-ASCII hyphen (U+2010)', '0000‐0002‐1825‐0097'],
    ['misplaced hyphens', '00000-002-1825-0097'],
    ['a missing hyphen', '0000-00021825-0097'],
    ['a doubled hyphen', '0000--0002-1825-0097'],
    ['a trailing hyphen', `${ORCID}-`],
    ['too few characters', '0000-0002-1825-009'],
    ['too many characters', '0000-0002-1825-00977'],
    ['a letter to repair', '0000-0002-1825-OO97'],
    ['an interior check character', '0000-0002-18X5-0097'],
    ['an out-of-range value', '0000-0000-0000-0001'],
    ['a check-character error', '0000-0002-1825-0098'],
    ['a resolver-prefixed check-character error', 'https://orcid.org/0000-0002-1825-0098'],
  ])('leaves a declared ORCID with %s blocking and the source tree untouched', (_label, value) => {
    const ledger = orcidLedger(value);
    const before = serializeXdm(ledger.document);
    expect(ledger.findings.filter((f) => f.id === '_20171126_b_32')).toEqual([
      expect.objectContaining({ path: NID(), counts: true }),
    ]);

    const result = overlay(ledger);

    expect(result.findings).toEqual(ledger.findings);
    expect(result.recoveries).toEqual([]);
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it.each([
    ['a proprietary identifier', '01', '<IDTypeName>Regression Press author</IDTypeName>'],
    ['an ISNI', '16', ''],
    ['a GND', '25', ''],
  ])('never treats %s shaped like an ORCID as an ORCID', (_label, type, extra) => {
    const ledger = strictLedger(message('3.0', contributorProduct(1, CONTRIBUTOR(NAME_ID(type, ORCID, extra)))));
    const before = serializeXdm(ledger.document);
    expect(ledger.findings.filter((f) => f.id === '_20171126_b_32')).toEqual([]);
    // Even a _20171126_b_32 finding pinned onto that composite is refused: the declared scheme decides, never the value.
    const forgedOrcid = forged('_20171126_b_32', NID());
    const contexts = new Map(ledger.contexts);
    contexts.set(ledger.findings.length, contextOf(ledger.document, 'NameIdentifier'));

    const result = applyRecoveryOverlay({ ...ledger, contexts, findings: [...ledger.findings, forgedOrcid] });

    expect(result.recoveries).toEqual([]);
    expect(result.findings.at(-1)).toEqual(forgedOrcid);
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it('refuses a NameIdentifier with no declared NameIDType', () => {
    const ledger = orcidLedger(ORCID);
    const identifier = contextOf(ledger.document, 'NameIdentifier');
    identifier.removeChild(identifier.getElementsByTagName('NameIDType')[0]);
    const result = overlay(ledger);
    expect(result.recoveries).toEqual([]);
    expect(result.findings).toEqual(ledger.findings);
  });

  it('never recovers the ISNI rule of a PublisherIdentifier declared as an ORCID', () => {
    const ledger = strictLedger(message('3.0', product(1, '', PUBLISHER_ID('21', ORCID))));
    const recovered = overlay(ledger).findings.filter((f) => f.recoverability === 'NORMALIZE_ORCID_LEXICAL_FORM');
    expect(recovered).toEqual([]);
  });

  it.each([
    ['SECONDARY', { projection: 'SECONDARY' as const }],
    ['NOT_EVALUABLE', { projection: 'NOT_EVALUABLE' as const, class: 'RULE_NOT_EVALUABLE' as const, blocking: false }],
    ['a Schematron finding', { tier: 'SCHEMATRON' as const, stage: 7 as const }],
    ['an inventory finding', { tier: 'INVENTORY' as const, stage: 8 as const }],
    ['an ADVISORY finding', { class: 'ADVISORY' as const, blocking: false }],
    ['a SUPPORT finding', { scope: 'SUPPORT' as const }],
    ['an already recovered finding', { recoverability: 'OMIT_INVALID_COMPOSITE' as const }],
    ['a finding whose path is not its context', { path: `${P1}/DescriptiveDetail[1]/Contributor[1]` }],
    ['the range rule', { id: '_20171126_b_106' }],
    ['the check-character rule', { id: '_20171126_b_33' }],
    ['the ISNI rule', { id: '_20171126_b_42' }],
  ])('only recovers the expected authoritative STRICT validity finding, never %s', (_label, change) => {
    const ledger = orcidLedger(ORCID);
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
    const ledger = orcidLedger(ORCID);
    const inconsistent: SourceFinding = { ...ledger.findings[0], ...change, counts: true };
    expect(overlay(ledger, [inconsistent])).toEqual({ findings: [inconsistent], recoveries: [] });
  });

  it('refuses a finding with no context element', () => {
    const ledger = orcidLedger(ORCID);
    const result = applyRecoveryOverlay({ ...ledger, contexts: new Map() });
    expect(result.findings).toEqual(ledger.findings);
    expect(result.recoveries).toEqual([]);
  });

  it('refuses when IDValue carries anything but text', () => {
    const ledger = orcidLedger('0000-0002-<!-- kept -->1825-0097');
    expect(ledger.findings.map((f) => f.id)).toEqual(['_20171126_b_32']);
    const before = serializeXdm(ledger.document);
    expect(overlay(ledger).recoveries).toEqual([]);
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it('does not recover when another blocking rule applies to the same NameIdentifier', () => {
    // A declared ORCID must not carry IDTypeName: an independent defect of the same composite.
    const ledger = orcidLedger(ORCID, '3.0', '<IDTypeName>ORCID</IDTypeName>');
    const own = ledger.findings.filter((f) => f.path === NID() && f.counts);
    expect(own.map((f) => f.id)).toContain('_20171126_b_32');
    expect(own.length).toBeGreaterThan(1);
    const before = serializeXdm(ledger.document);

    const result = overlay(ledger);

    expect(result.findings).toEqual(ledger.findings);
    expect(result.recoveries).toEqual([]);
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it('does not canonicalise into a duplicate NameIdentifier the source never contained', () => {
    const ledger = strictLedger(
      message('3.0', contributorProduct(1, CONTRIBUTOR(NAME_ID('21', ORCID_BARE) + NAME_ID('21', ORCID)))),
    );
    expect(ledger.findings.map((f) => [f.id, f.path])).toEqual([['_20171126_b_32', NID(1, 1, 2)]]);
    const before = serializeXdm(ledger.document);

    const result = overlay(ledger);

    expect(result.findings).toEqual(ledger.findings);
    expect(result.recoveries).toEqual([]);
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  it('recovers each declared ORCID independently', () => {
    const contributors =
      CONTRIBUTOR(NAME_ID('21', `https://orcid.org/${ORCID}`)) + CONTRIBUTOR(NAME_ID('21', '0000-0002-1825-0098'), 2);
    const ledger = strictLedger(message('3.1', contributorProduct(1, contributors)), '3.1');
    expect(ledger.findings.map((f) => [f.id, f.path])).toEqual([
      ['_20171126_b_32', NID(1, 1)],
      ['_20171126_b_32', NID(1, 2)],
    ]);

    const result = overlay(ledger);

    expect(result.findings.map((f) => [f.path, f.recoverability, f.counts])).toEqual([
      [NID(1, 1), 'NORMALIZE_ORCID_LEXICAL_FORM', false],
      [NID(1, 2), 'NOT_RECOVERABLE', true],
    ]);
    expect(result.recoveries.map((r) => r.path)).toEqual([NID(1, 1)]);
    const xml = serializeXdm(ledger.document);
    expect(xml).toContain(`<IDValue>${ORCID_BARE}</IDValue>`);
    expect(xml).toContain('<IDValue>0000-0002-1825-0098</IDValue>');
  });

  it.each(['3.0', '3.1'] as const)(
    '%s: no rule outside the checked scope can read a declared ORCID IDValue',
    (release) => {
      const ruleset = rulesetFor(release);
      // Every strict assertion that mentions a NameIdentifier sits on it or on an ancestor within its Product.
      const readers = [...ruleset.byElement.entries()]
        .filter(([, rules]) => rules.some((rule) => /NameIdentifier|NameIDType/.test(rule.test)))
        .map(([element]) => element)
        .sort();
      expect(readers).toEqual([
        'AlternativeName',
        'Contributor',
        'ContributorReference',
        'NameAsSubject',
        'NameIdentifier',
        'Product',
      ]);
      expect((ruleset.byElement.get('ONIXMessage') ?? []).filter((rule) => /NameIdentifier/.test(rule.test))).toEqual(
        [],
      );
      // The three pinned ORCID rules the recovery proves a candidate against are all on the NameIdentifier itself.
      const own = (ruleset.byElement.get('NameIdentifier') ?? []).map((rule) => rule.id);
      expect(own).toEqual(expect.arrayContaining(['_20171126_b_32', '_20171126_b_106', '_20171126_b_33']));
      // Schematron reads only the declared type code, and IDValue only of a ProductIdentifier or a code-03 identifier.
      expect(
        ruleset.schematron
          .filter((r) => /IDValue/.test(r.test))
          .map((r) => r.id)
          .sort(),
      ).toEqual(['_20180202_d_54', '_20190410_c_3']);
      // Stage-8 rules of a NameIdentifier read IDValue only under a declared type other than ORCID (21).
      const bindings = inventoryBindings(release);
      const xpathOf = (b: (typeof bindings)[number]) => ('xpath' in b ? b.xpath : null);
      for (const b of bindings.filter((binding) => binding.owner === 'NameIdentifier')) {
        expect(xpathOf(b), b.id).toMatch(/(\$t = '(?!21')\d\d'|NameIDType = '(?!21')\d\d')/);
      }
      // The one stage-8 rule reading NameIdentifier values across a Product mirrors strict _20191128_c_1, which the
      // recovery re-evaluates on the Product ancestor.
      expect(
        bindings
          .filter((b) => b.owner !== 'NameIdentifier' && /NameIdentifier/.test(xpathOf(b) ?? ''))
          .map((b) => [b.id, b.owner]),
      ).toEqual([['R-KERNEL-CONTRIBREF-MATCH', 'Product']]);
    },
  );
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

describe('the ORCID recovery in the canonical validator', () => {
  const ledgerOf = (findings: readonly SourceFinding[]) =>
    findings.map((f) => `${f.tier}|${f.id}|${f.class}|${f.projection}|${f.recoverability}|${f.counts}|${f.path}`);
  const orcidMessage = (release: OnixRelease, value: string, extraDescriptive = '') =>
    message(release, contributorProduct(1, CONTRIBUTOR(NAME_ID('21', value)), extraDescriptive));

  it.each(['3.0', '3.1'] as const)('%s: a bare ORCID is unchanged, valid and never recovered', async (release) => {
    const xml = orcidMessage(release, ORCID_BARE);
    const result = await validator.validate(encode(xml));
    expect(result.sourceValid).toBe(true);
    expect(result.summary).toMatchObject({ blocking: 0, recovered: 0 });
    expect(result.findings.filter((f) => f.id === '_20171126_b_32')).toEqual([]);
    expect(result.normalized?.recoveries).toEqual([]);
    expect(result.normalized?.serialize()).toBe(serializeXdm(buildXdm(xml).document));
  });

  it.each(
    (['3.0', '3.1'] as const).flatMap((release) =>
      APPROVED_SPELLINGS(ORCID).map(([label, value]) => [release, label, value] as const),
    ),
  )(
    '%s: a %s ORCID has exactly the ledger and normalised source of its bare twin, apart from its recovered finding',
    async (release, _label, value) => {
      const [supplied, twin] = await Promise.all(
        [value, ORCID_BARE].map((v) => validator.validate(encode(orcidMessage(release, v)))),
      );

      expect(supplied.status).toBe('COMPLETED');
      const recovered = supplied.findings.filter((f) => f.recoverability !== 'NOT_RECOVERABLE');
      expect(ledgerOf(recovered)).toEqual([
        `STRICT|_20171126_b_32|NORMATIVE_INVALID|AUTHORITATIVE|NORMALIZE_ORCID_LEXICAL_FORM|false|${NID()}`,
      ]);
      expect(recovered[0]).toMatchObject({ blocking: true, stage: 6, scope: 'VALIDITY' });
      expect(ledgerOf(supplied.findings.filter((f) => f.recoverability === 'NOT_RECOVERABLE'))).toEqual(
        ledgerOf(twin.findings),
      );
      expect(supplied.summary).toMatchObject({ blocking: 0, recovered: 1 });
      expect(supplied.sourceValid).toBe(true);
      expect(supplied.normalized?.recoveries).toEqual([
        expect.objectContaining({ recovery: 'NORMALIZE_ORCID_LEXICAL_FORM', original: value, canonical: ORCID_BARE }),
      ]);
      expect(supplied.normalized?.serialize()).toBe(twin.normalized?.serialize());
      expect(supplied.normalized?.serialize()).toContain(`<IDValue>${ORCID_BARE}</IDValue>`);
    },
  );

  it('keeps the recovered finding exactly as the standard reported it, message and detail included', async () => {
    const result = await validator.validate(encode(orcidMessage('3.1', `orcid.org/${ORCID}`)));
    const [finding] = result.findings.filter((f) => f.id === '_20171126_b_32');
    expect(finding.message).toContain('valid ORCID (invalid characters)');
    expect(finding.detail).toEqual(expect.objectContaining({ authorityKind: 'SPEC-IDVAL' }));
    expect(finding).toEqual(
      makeFinding({
        ...finding,
        recoverability: 'NORMALIZE_ORCID_LEXICAL_FORM',
      }),
    );
  });

  it.each(['3.0', '3.1'] as const)(
    '%s: a check-invalid ORCID stays blocking whatever its spelling',
    async (release) => {
      for (const value of [
        '0000-0002-1825-0098',
        'https://orcid.org/0000-0002-1825-0098',
        'orcid.org/0000000218250098',
      ]) {
        const result = await validator.validate(encode(orcidMessage(release, value)));
        expect(result.findings.filter((f) => f.id === '_20171126_b_32')).toEqual([
          expect.objectContaining({ recoverability: 'NOT_RECOVERABLE', counts: true }),
        ]);
        expect(result.sourceValid).toBe(false);
        expect(result.normalized?.recoveries).toEqual([]);
        expect(result.normalized?.serialize()).toContain(`<IDValue>${value}</IDValue>`);
      }
    },
  );

  it('never lets an ORCID recovery clear the same-key LanguageRole 01 + 02 finding or another Product', async () => {
    const languages = '<Language><LanguageRole>02</LanguageRole><LanguageCode>eng</LanguageCode></Language>';
    const xml = message(
      '3.0',
      contributorProduct(1, CONTRIBUTOR(NAME_ID('21', `https://orcid.org/${ORCID}`)), languages) +
        contributorProduct(2, CONTRIBUTOR(NAME_ID('21', 'orcid.org/0000-0002-1825-0098'))),
    );
    const result = await validator.validate(encode(xml));

    expect(result.findings.filter((f) => f.counts).map((f) => `${f.id} ${f.path}`)).toEqual([
      expect.stringMatching(/^_20171218_f_2 \/ONIXMessage\[1\]\/Product\[1\]\//),
      `_20171126_b_32 ${NID(2)}`,
    ]);
    expect(result.normalized?.recoveries.map((r) => [r.recovery, 'path' in r ? r.path : null])).toEqual([
      ['NORMALIZE_ORCID_LEXICAL_FORM', NID(1)],
    ]);
    expect(result.summary).toMatchObject({ blocking: 2, recovered: 1 });
    expect(result.sourceValid).toBe(false);
  });

  it('orders the ORCID recovery deterministically beside the existing recoveries, each exact', async () => {
    const products = contributorProduct(
      1,
      CONTRIBUTOR(NAME_ID('21', ORCID)),
      SUBJECT('23', '<SubjectCode>HIST</SubjectCode>'),
    ).replace('<PublisherName>', `${PUBLISHER_ID('16', HYPHENATED)}<PublisherName>`);
    const xml = message('3.1', products);
    const [first, second] = [await validator.validate(encode(xml)), await validator.validate(encode(xml))];

    expect(first.normalized?.recoveries).toEqual([
      {
        recovery: 'NORMALIZE_ORCID_LEXICAL_FORM',
        rule: '_20171126_b_32',
        path: NID(),
        valuePath: `${NID()}/IDValue[1]`,
        scheme: { element: 'NameIDType', code: '21' },
        original: ORCID,
        canonical: ORCID_BARE,
      },
      expect.objectContaining({ recovery: 'PUBLISHER_CATEGORY_TO_CUSTOM', rule: '_20171218_a_2', value: 'HIST' }),
      expect.objectContaining({
        recovery: 'NORMALIZE_IDENTIFIER_LEXICAL_FORM',
        rule: '_20171126_b_42',
        scheme: { element: 'PublisherIDType', code: '16' },
        canonical: CANONICAL,
      }),
    ]);
    expect(first.sourceValid).toBe(true);
    expect(JSON.stringify(second.findings)).toBe(JSON.stringify(first.findings));
    expect(JSON.stringify(second.normalized?.recoveries)).toBe(JSON.stringify(first.normalized?.recoveries));
    expect(second.normalized?.serialize()).toBe(first.normalized?.serialize());
  });
});

// ---------------------------------------------------------------------------
// CR-1: ORCIDs a Product-level assertion compares are proved together
// ---------------------------------------------------------------------------
describe('coordinated ORCID recovery across a Product (thoth-app#240 CR-1)', () => {
  const REFERENCE_AT = (r: number) =>
    `/ONIXMessage[1]/Product[1]/PromotionDetail[1]/PromotionalEvent[1]/ContributorReference[${r}]/NameIdentifier[1]`;
  const REFERENCE = REFERENCE_AT(1);
  // An explicit date format keeps the OccurrenceDate valid under both releases' defaults.
  const EVENT = (references: readonly string[]) =>
    '<PromotionDetail><PromotionalEvent><EventType>01</EventType><ContentAudience>00</ContentAudience><EventName>Launch</EventName>' +
    references
      .map(
        (identifiers, r) =>
          `<ContributorReference><SequenceNumber>${r + 1}</SequenceNumber><ContributorRole>A01</ContributorRole>${identifiers}</ContributorReference>`,
      )
      .join('') +
    '<EventOccurrence><OccurrenceDate><OccurrenceDateRole>01</OccurrenceDateRole><Date dateformat="13">20260301T1800</Date></OccurrenceDate>' +
    '<EventStatus>A</EventStatus></EventOccurrence></PromotionalEvent></PromotionDetail>';
  /** One Product whose contributors (identifiers of each, in order) are named again by PromotionalEvent ContributorReferences. */
  const promotedAll = (release: OnixRelease, contributors: readonly string[], references: readonly string[]) =>
    message(
      release,
      contributorProduct(1, contributors.map((identifiers, c) => CONTRIBUTOR(identifiers, c + 1)).join('')).replace(
        '</DescriptiveDetail>',
        `</DescriptiveDetail>${EVENT(references)}`,
      ),
    );
  /** One Product whose contributor is named again by a PromotionalEvent ContributorReference. */
  const promoted = (release: OnixRelease, contributor: string, reference: string) =>
    promotedAll(release, [contributor], [reference]);
  const orcidFindings = (findings: readonly SourceFinding[]) =>
    findings.filter((f) => f.id === '_20171126_b_32').map((f) => [f.path, f.recoverability, f.counts]);
  const referenceFindings = (findings: readonly SourceFinding[]) =>
    findings
      .filter((f) => f.id === '_20191128_c_1' || f.id === 'R-KERNEL-CONTRIBREF-MATCH')
      .map(({ recoverability: _r, counts: _c, ...rest }) => [rest, _r, _c]);

  // A: the same approved non-bare ORCID on both sides.
  it.each(
    (['3.0', '3.1'] as const).flatMap((release) =>
      [`https://orcid.org/${ORCID}`, `orcid.org/${ORCID_BARE}`, ORCID].map((spelling) => [release, spelling] as const),
    ),
  )('%s: recovers a contributor and its ContributorReference both spelt %s, together', async (release, spelling) => {
    const [supplied, twin] = await Promise.all(
      [spelling, ORCID_BARE].map((value) =>
        validator.validate(encode(promoted(release, NAME_ID('21', value), NAME_ID('21', value)))),
      ),
    );

    // The submitted source satisfies the Product-level equality, exactly as its bare twin does.
    expect(twin.sourceValid).toBe(true);
    expect(referenceFindings(supplied.findings)).toEqual([]);
    expect(orcidFindings(supplied.findings)).toEqual([
      [NID(), 'NORMALIZE_ORCID_LEXICAL_FORM', false],
      [REFERENCE, 'NORMALIZE_ORCID_LEXICAL_FORM', false],
    ]);
    expect(supplied.normalized?.recoveries).toEqual([
      expect.objectContaining({ path: NID(), original: spelling, canonical: ORCID_BARE }),
      expect.objectContaining({ path: REFERENCE, original: spelling, canonical: ORCID_BARE }),
    ]);
    const normalized = supplied.normalized!.serialize();
    expect(normalized.split(`<IDValue>${ORCID_BARE}</IDValue>`)).toHaveLength(3);
    expect(normalized).toBe(twin.normalized?.serialize());
    expect(supplied.summary).toMatchObject({ blocking: 0, recovered: 2 });
    expect(supplied.sourceValid).toBe(true);
  });

  // B: a genuine mismatch stays exactly as the submitted source reported it.
  it.each(['3.0', '3.1'] as const)(
    '%s: never clears a contributor/reference mismatch the submitted source genuinely has',
    async (release) => {
      const [supplied, twin] = await Promise.all(
        [
          [`https://orcid.org/${ORCID}`, `https://orcid.org/${ORCID_X}`],
          [ORCID_BARE, ORCID_X.replace(/-/g, '')],
        ].map(([contributor, reference]) =>
          validator.validate(encode(promoted(release, NAME_ID('21', contributor), NAME_ID('21', reference)))),
        ),
      );

      expect(referenceFindings(twin.findings).length).toBeGreaterThan(0);
      expect(referenceFindings(supplied.findings)).toEqual(referenceFindings(twin.findings));
      expect(supplied.findings.find((f) => f.id === '_20191128_c_1')).toMatchObject({
        recoverability: 'NOT_RECOVERABLE',
      });
      expect(supplied.findings.find((f) => f.id === 'R-KERNEL-CONTRIBREF-MATCH')).toMatchObject({
        recoverability: 'NOT_RECOVERABLE',
        counts: true,
      });
      expect(supplied.sourceValid).toBe(false);
    },
  );

  it('keeps the historical mismatch when two different spellings of one ORCID only match once normalised', async () => {
    const result = await validator.validate(
      encode(promoted('3.0', NAME_ID('21', `https://orcid.org/${ORCID}`), NAME_ID('21', `orcid.org/${ORCID}`))),
    );

    // The submitted IDValues differ, so the submitted source fails the equality, and that truth stands.
    expect(result.findings.find((f) => f.id === '_20191128_c_1')).toMatchObject({ recoverability: 'NOT_RECOVERABLE' });
    expect(result.findings.find((f) => f.id === 'R-KERNEL-CONTRIBREF-MATCH')).toMatchObject({
      recoverability: 'NOT_RECOVERABLE',
      counts: true,
    });
    expect(result.sourceValid).toBe(false);
  });

  // C: one side cannot be recovered, so the other is not rewritten to satisfy the equality.
  it('rewrites neither side when the reference has an independent defect of its own', async () => {
    const spelling = `https://orcid.org/${ORCID}`;
    const result = await validator.validate(
      encode(promoted('3.1', NAME_ID('21', spelling), NAME_ID('21', spelling, '<IDTypeName>ORCID</IDTypeName>'))),
    );

    expect(result.findings.filter((f) => f.counts && f.path === REFERENCE).length).toBeGreaterThan(1);
    expect(orcidFindings(result.findings)).toEqual([
      [NID(), 'NOT_RECOVERABLE', true],
      [REFERENCE, 'NOT_RECOVERABLE', true],
    ]);
    expect(result.normalized?.recoveries).toEqual([]);
    expect(result.normalized!.serialize().split(`<IDValue>${spelling}</IDValue>`)).toHaveLength(3);
    expect(result.sourceValid).toBe(false);
  });

  it('rewrites neither side when only one of an equal pair is a recoverable finding', () => {
    const spelling = `https://orcid.org/${ORCID}`;
    const ledger = strictLedger(promoted('3.0', NAME_ID('21', spelling), NAME_ID('21', spelling)));
    expect(ledger.findings.filter((f) => f.id === '_20171126_b_32').map((f) => f.path)).toEqual([NID(), REFERENCE]);
    const before = serializeXdm(ledger.document);
    // Only the contributor's finding reaches the overlay with its context: canonicalising it alone would break
    // an equality the submitted source satisfies, so it is not rewritten either.
    const contexts = new Map([...ledger.contexts].filter(([index]) => ledger.findings[index].path !== REFERENCE));

    const result = applyRecoveryOverlay({ ...ledger, contexts });

    expect(result.recoveries).toEqual([]);
    expect(result.findings).toEqual(ledger.findings);
    expect(serializeXdm(ledger.document)).toBe(before);
  });

  // D: the ledger's order changes nothing.
  it.each(['3.0', '3.1'] as const)(
    '%s: reaches the same result whatever order the ledger lists the findings in',
    (release) => {
      const spelling = `https://orcid.org/${ORCID}`;
      const xml = promoted(release, NAME_ID('21', spelling), NAME_ID('21', spelling));
      const forward = strictLedger(xml, release);
      const backward = strictLedger(xml, release);
      const reversed = [...backward.findings.keys()].reverse();
      const reversedLedger = {
        ...backward,
        findings: reversed.map((index) => backward.findings[index]),
        contexts: new Map(reversed.map((index, position) => [position, backward.contexts.get(index)!])),
      };

      const first = overlay(forward);
      const second = applyRecoveryOverlay(reversedLedger);

      const recovered = (findings: readonly SourceFinding[]) =>
        findings
          .filter((f) => f.recoverability !== 'NOT_RECOVERABLE')
          .map((f) => `${f.path} ${f.recoverability}`)
          .sort();
      expect(recovered(first.findings)).toEqual([
        `${NID()} NORMALIZE_ORCID_LEXICAL_FORM`,
        `${REFERENCE} NORMALIZE_ORCID_LEXICAL_FORM`,
      ]);
      expect(recovered(second.findings)).toEqual(recovered(first.findings));
      expect([...second.recoveries].sort((a, b) => a.path.localeCompare(b.path))).toEqual(
        [...first.recoveries].sort((a, b) => a.path.localeCompare(b.path)),
      );
      expect(serializeXdm(backward.document)).toBe(serializeXdm(forward.document));
    },
  );

  // E: a cluster that cannot be recovered rolls back only itself, never the Product's unrelated ORCIDs.
  const A_SPELLING = `https://orcid.org/${ORCID}`;
  const B_BARE = '0000000151093700';
  const B_SPELLING = `orcid.org/${B_BARE}`;
  /** An IDTypeName on an ORCID NameIdentifier: `_20171126_b_25` counts against that same composite. */
  const DEFECT = '<IDTypeName>ORCID</IDTypeName>';
  type Party = readonly [label: string, identifiers: string];
  /** Validates a Product built from labelled contributors and references, reporting each ORCID finding and recovery by label. */
  const validateLabelled = async (
    release: OnixRelease,
    contributors: readonly Party[],
    references: readonly Party[],
  ) => {
    const labels = new Map([
      ...contributors.map(([label], c) => [NID(1, c + 1), label] as const),
      ...references.map(([label], r) => [REFERENCE_AT(r + 1), label] as const),
    ]);
    const xml = promotedAll(
      release,
      contributors.map(([, identifiers]) => identifiers),
      references.map(([, identifiers]) => identifiers),
    );
    const result = await validator.validate(encode(xml));
    return {
      xml,
      result,
      orcids: result.findings
        .filter((f) => f.id === '_20171126_b_32')
        .map((f) => `${labels.get(f.path!)} ${f.recoverability} ${f.counts}`)
        .sort(),
      recoveries: (result.normalized?.recoveries ?? [])
        .map((m) =>
          m.recovery === 'NORMALIZE_ORCID_LEXICAL_FORM'
            ? `${labels.get(m.path)} ${m.original} -> ${m.canonical}`
            : m.recovery,
        )
        .sort(),
    };
  };

  it.each(['3.0', '3.1'] as const)(
    '%s: rolls back only the contributor/reference pair that cannot be recovered, in either source order',
    async (release) => {
      const contributorA: Party = ['A', NAME_ID('21', A_SPELLING)];
      const independentB: Party = ['B', NAME_ID('21', B_SPELLING)];
      // Pair A's reference has an independent counting defect of its own, so only its contributor is a candidate.
      const referenceA: Party = ['A reference', NAME_ID('21', A_SPELLING, DEFECT)];
      const outcomes = await Promise.all(
        [
          [contributorA, independentB],
          [independentB, contributorA],
        ].map((contributors) => validateLabelled(release, contributors, [referenceA])),
      );

      for (const { xml, result, orcids, recoveries } of outcomes) {
        expect(orcids).toEqual([
          'A NOT_RECOVERABLE true',
          'A reference NOT_RECOVERABLE true',
          'B NORMALIZE_ORCID_LEXICAL_FORM false',
        ]);
        expect(recoveries).toEqual([`B ${B_SPELLING} -> ${B_BARE}`]);
        expect(
          result.findings
            .filter((f) => f.counts && f.path === REFERENCE)
            .map((f) => f.id)
            .sort(),
        ).toEqual(['_20171126_b_25', '_20171126_b_32']);
        // The submitted source satisfies the Product-level equality, and that truth stands.
        expect(referenceFindings(result.findings)).toEqual([]);
        // Only B changed, so the normalised source still satisfies it: pair A was not half rewritten.
        const normalized = result.normalized!.serialize();
        const twin = await validator.validate(encode(xml.replace(B_SPELLING, B_BARE)));
        expect(normalized).toBe(twin.normalized?.serialize());
        expect(normalized.split(`<IDValue>${A_SPELLING}</IDValue>`)).toHaveLength(3);
        expect(referenceFindings((await validator.validate(encode(normalized))).findings)).toEqual([]);
        expect(result.summary).toMatchObject({ blocking: 3, recovered: 1 });
        expect(result.sourceValid).toBe(false);
      }
    },
  );

  it.each(
    (['3.0', '3.1'] as const).flatMap((release) =>
      (['reference', 'contributor'] as const).map((ineligible) => [release, ineligible] as const),
    ),
  )(
    '%s: recovers the unrelated ORCID alone whatever order the ledger lists the findings in, with the %s of pair A ineligible',
    (release, ineligible) => {
      const xml = promotedAll(
        release,
        [NAME_ID('21', A_SPELLING), NAME_ID('21', B_SPELLING)],
        [NAME_ID('21', A_SPELLING, ineligible === 'reference' ? DEFECT : '')],
      );
      const ledgerOf = () => {
        const ledger = strictLedger(xml, release);
        // A counting finding of the contributor's own NameIdentifier is an independent defect of that composite.
        if (ineligible === 'reference') return ledger;
        return { ...ledger, findings: [...ledger.findings, forged('_20171126_b_25', NID())] };
      };
      const forward = ledgerOf();
      const backward = ledgerOf();
      const reversed = [...backward.findings.keys()].reverse();
      const reversedLedger = {
        ...backward,
        findings: reversed.map((index) => backward.findings[index]),
        contexts: new Map(
          reversed.flatMap((index, position) => {
            const context = backward.contexts.get(index);
            return context ? [[position, context] as const] : [];
          }),
        ),
      };

      const first = applyRecoveryOverlay(forward);
      const second = applyRecoveryOverlay(reversedLedger);

      const recovered = (findings: readonly SourceFinding[]) =>
        findings.filter((f) => f.recoverability !== 'NOT_RECOVERABLE').map((f) => `${f.path} ${f.recoverability}`);
      expect(recovered(first.findings)).toEqual([`${NID(1, 2)} NORMALIZE_ORCID_LEXICAL_FORM`]);
      expect(recovered(second.findings)).toEqual(recovered(first.findings));
      expect(first.recoveries).toEqual([
        expect.objectContaining({ path: NID(1, 2), original: B_SPELLING, canonical: B_BARE }),
      ]);
      expect(second.recoveries).toEqual(first.recoveries);
      const normalized = serializeXdm(forward.document);
      expect(serializeXdm(backward.document)).toBe(normalized);
      expect(normalized.split(`<IDValue>${A_SPELLING}</IDValue>`)).toHaveLength(3);
      expect(normalized.split(`<IDValue>${B_BARE}</IDValue>`)).toHaveLength(2);
    },
  );

  it.each(['3.0', '3.1'] as const)(
    '%s: still proves a complete pair together when two other clusters roll back, in either source order',
    async (release) => {
      const C_SPELLING = `https://orcid.org/${ORCID_X}`;
      const C_BARE = ORCID_X.replace(/-/g, '');
      const D_SPELLING = 'orcid.org/0000-0002-1694-233X';
      const contributors: Party[] = [
        ['A', NAME_ID('21', A_SPELLING)],
        ['B', NAME_ID('21', B_SPELLING)],
        ['C', NAME_ID('21', C_SPELLING)],
        ['D', NAME_ID('21', D_SPELLING)],
      ];
      // Pairs A and D each fail on their own; pair C is complete; B is referenced by nothing.
      const references: Party[] = [
        ['A reference', NAME_ID('21', A_SPELLING, DEFECT)],
        ['C reference', NAME_ID('21', C_SPELLING)],
        ['D reference', NAME_ID('21', D_SPELLING, DEFECT)],
      ];
      const outcomes = await Promise.all([
        validateLabelled(release, contributors, references),
        validateLabelled(release, [...contributors].reverse(), [...references].reverse()),
      ]);

      for (const { xml, result, orcids, recoveries } of outcomes) {
        expect(orcids).toEqual([
          'A NOT_RECOVERABLE true',
          'A reference NOT_RECOVERABLE true',
          'B NORMALIZE_ORCID_LEXICAL_FORM false',
          'C NORMALIZE_ORCID_LEXICAL_FORM false',
          'C reference NORMALIZE_ORCID_LEXICAL_FORM false',
          'D NOT_RECOVERABLE true',
          'D reference NOT_RECOVERABLE true',
        ]);
        expect(recoveries).toEqual([
          `B ${B_SPELLING} -> ${B_BARE}`,
          `C ${C_SPELLING} -> ${C_BARE}`,
          `C reference ${C_SPELLING} -> ${C_BARE}`,
        ]);
        expect(referenceFindings(result.findings)).toEqual([]);
        const normalized = result.normalized!.serialize();
        const twin = await validator.validate(encode(xml.replace(B_SPELLING, B_BARE).replaceAll(C_SPELLING, C_BARE)));
        expect(normalized).toBe(twin.normalized?.serialize());
        expect(referenceFindings((await validator.validate(encode(normalized))).findings)).toEqual([]);
        expect(result.summary).toMatchObject({ recovered: 3 });
        expect(result.sourceValid).toBe(false);
      }
    },
  );
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

// ---------------------------------------------------------------------------
// Publisher-supplied recoveries (thoth-app#283 APP-IMPORT-ONIX-INLINE-FIX-01, Phase A)
// ---------------------------------------------------------------------------

describe('publisher-supplied recoveries', () => {
  // The importer's own rule for an abstract `Text` and the pinned XHTML subset, exactly as the bridge supplies them.
  const CONTEXT = createPublisherFixContext(readFileSync(join(PUBLIC_DIR, 'ONIX_XHTML_Subset.xsd'), 'utf8'));
  const apply = (document: Parameters<typeof applyPublisherFixToTree>[0], fix: PublisherFix) =>
    applyPublisherFixToTree(document, fix, CONTEXT);
  const canOmit = (document: Parameters<typeof canOmitShortDescription>[0], path: string) =>
    canOmitShortDescription(document, path, CONTEXT);
  const NS = 'http://ns.editeur.org/onix/3.0/reference';
  const DETAIL = '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]';
  const COLLATERAL = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]';
  const tree = (detail: string, collateral = '', prefix = '', content = '') => {
    const p = prefix ? `${prefix}:` : '';
    const declaration = prefix ? `xmlns:${prefix}="${NS}"` : `xmlns="${NS}"`;
    const tag = (xml: string) => (prefix ? xml.replace(/<(\/?)([A-Za-z])/g, `<$1${p}$2`) : xml);
    return buildXdm(
      `<${p}ONIXMessage release="3.0" ${declaration}>${tag(
        `<Product><DescriptiveDetail>${detail}</DescriptiveDetail>${collateral ? `<CollateralDetail>${collateral}</CollateralDetail>` : ''}${content ? `<ContentDetail>${content}</ContentDetail>` : ''}</Product>`,
      )}</${p}ONIXMessage>`,
    ).document;
  };
  const textContent = (type: string, body: string) =>
    `<TextContent><TextType>${type}</TextType><ContentAudience>00</ContentAudience><Text>${body}</Text></TextContent>`;

  describe('suggestEditionNumber', () => {
    it.each([
      ['Third', 3],
      ['Third, revised edition', 3],
      ['third edition', 3],
      ['3rd', 3],
      ['3rd edition', 3],
      ['2nd revised', 2],
      ['1st', 1],
      ['11th edition', 11],
      ['21st edition', 21],
      ['Fourth edition 2019', 4],
      ['3rd ed.', 3],
      ['Second revised and expanded edition', 2],
      ['3 edition', 3],
      ['  Second  ', 2],
    ])('%j begins with %d', (statement, expected) => {
      expect(suggestEditionNumber(statement)).toBe(expected);
    });

    it.each([
      'New edition',
      'Revised',
      'Revised and expanded',
      'Twenty-first edition',
      '2rd edition',
      '11st edition',
      '0th edition',
      '3.5',
      '2nd-hand',
      '2023 edition',
      'Edition 3',
      // The leading ordinal must be followed, as its own phrase, by edition wording or an edition qualifier.
      'Twentieth anniversary edition',
      'Second impression',
      'First published 1990',
      '3 volumes',
      '3',
      // A statement naming more than one edition says no one edition.
      'Second and third editions',
      'Third edition, revised from the 2nd',
      '',
      null,
      undefined,
    ])('%j offers no suggestion', (statement) => {
      expect(suggestEditionNumber(statement)).toBeNull();
    });
  });

  describe('checkEditionNumber', () => {
    it.each([
      [3, 3],
      ['3', 3],
      [' 12 ', 12],
      ['007', 7],
      [2_147_483_647, 2_147_483_647],
    ])('accepts %j as %d', (raw, value) => {
      expect(checkEditionNumber(raw)).toEqual({ ok: true, value });
    });

    it.each([
      [0, 'EDITION_NOT_POSITIVE'],
      ['00', 'EDITION_NOT_POSITIVE'],
      [-1, 'EDITION_NOT_POSITIVE'],
      ['-3', 'EDITION_NOT_POSITIVE'],
      [1.5, 'EDITION_NOT_AN_INTEGER'],
      ['1.0', 'EDITION_NOT_AN_INTEGER'],
      ['1e3', 'EDITION_NOT_AN_INTEGER'],
      ['three', 'EDITION_NOT_AN_INTEGER'],
      ['', 'EDITION_NOT_AN_INTEGER'],
      [Number.POSITIVE_INFINITY, 'EDITION_NOT_AN_INTEGER'],
      [2_147_483_648, 'EDITION_TOO_LARGE'],
      ['99999999999999999999', 'EDITION_TOO_LARGE'],
    ])('refuses %j (%s)', (raw, reason) => {
      expect(checkEditionNumber(raw)).toEqual({ ok: false, reason });
    });
  });

  describe('measureShortDescription', () => {
    it('counts code points, markup included, and accepts exactly 350', () => {
      expect(measureShortDescription('x'.repeat(350))).toEqual({ length: 350, limit: 350, withinLimit: true });
      expect(measureShortDescription('x'.repeat(351))).toEqual({ length: 351, limit: 350, withinLimit: false });
      expect(measureShortDescription('<p>ab</p>').length).toBe(9);
      // XPath string-length counts characters, not UTF-16 code units.
      expect(measureShortDescription('\u{1F4D6}'.repeat(350))).toEqual({ length: 350, limit: 350, withinLimit: true });
    });
  });

  describe('tree access', () => {
    it('resolves canonical paths by local name whatever the prefix, and reads Text in its editable form', () => {
      const document = tree('', `${textContent('02', '<p>Some <em>markup</em> &amp; text</p>')}`, 'onix');
      const text = elementAtPath(document, `${COLLATERAL}/TextContent[1]/Text[1]`)!;

      expect(text.localName).toBe('Text');
      // A prefixed source's XHTML is offered as HTML names it: bare local names, no prefix, no declarations.
      expect(editableTextOf(text)).toBe('<p>Some <em>markup</em> &amp; text</p>');
      expect(elementAtPath(document, `${COLLATERAL}/TextContent[2]`)).toBeNull();
      expect(elementAtPath(document, 'not a path')).toBeNull();
      expect(
        editableTextOf(
          elementAtPath(tree('', textContent('02', 'a &amp; b')), `${COLLATERAL}/TextContent[1]/Text[1]`)!,
        ),
      ).toBe('a & b');
    });

    it('offers an empty element with an explicit end tag unless HTML parses it as void (#283 review L1)', () => {
      // Stored as escaped HTML, `<span/>` would be read as an opening tag: a different structure from the one validated.
      const xhtml =
        '<p><a id="top"></a>Text<span></span> and <em/>.</p><p>Line<br/>break</p><hr/><p><img src="c.png" alt=""/></p>';
      for (const prefix of ['', 'onix'] as const) {
        const text = elementAtPath(tree('', textContent('02', xhtml), prefix), `${COLLATERAL}/TextContent[1]/Text[1]`)!;

        expect(editableTextOf(text), prefix).toBe(
          '<p><a id="top"></a>Text<span></span> and <em></em>.</p><p>Line<br/>break</p><hr/><p><img src="c.png" alt=""/></p>',
        );
      }
    });

    it('lets a short description be left out only when its Product keeps another description', () => {
      const path = `${COLLATERAL}/TextContent[1]`;
      expect(canOmit(tree('', textContent('02', 'x')), path)).toBe(false);
      expect(canOmit(tree('', textContent('02', 'x') + textContent('04', 'toc')), path)).toBe(false);
      expect(canOmit(tree('', textContent('02', 'x') + textContent('03', 'long')), path)).toBe(true);
      expect(canOmit(tree('', textContent('02', 'x') + textContent('30', 'abstract')), path)).toBe(true);
      expect(canOmit(tree('', textContent('02', 'x') + textContent('02', 'other')), path)).toBe(true);
      // Only a short description may be left out this way.
      expect(canOmit(tree('', textContent('03', 'x') + textContent('03', 'long')), path)).toBe(false);
    });

    it("counts only a description the importer would take for the same Work, by the collateral reducer's rules", () => {
      const path = `${COLLATERAL}/TextContent[1]`;
      const short = textContent('02', 'x'.repeat(400));
      const other = (audiences: string, extra = '', text = '<Text>A long description.</Text>') =>
        `<TextContent><TextType>03</TextType>${audiences}${text}${extra}</TextContent>`;
      const omit = (collateral: string, content = '') => canOmit(tree('', collateral, '', content), path);

      expect(omit(short + other('<ContentAudience>00</ContentAudience>'))).toBe(true);
      // Only for a targeted audience (a search index), or restricted: imported only if chosen, or never.
      expect(omit(short + other('<ContentAudience>09</ContentAudience>'))).toBe(false);
      expect(omit(short + other('<ContentAudience>00</ContentAudience><ContentAudience>01</ContentAudience>'))).toBe(
        false,
      );
      // A date controlling when it may be used keeps it out of the import.
      const until = '<ContentDate><ContentDateRole>15</ContentDateRole><Date>20300101</Date></ContentDate>';
      expect(omit(short + other('<ContentAudience>00</ContentAudience>', until))).toBe(false);
      // A Text holding elements, or holding nothing, is not imported as it stands.
      expect(
        omit(short + other('<ContentAudience>00</ContentAudience>', '', '<Text textformat="05"><p>Long.</p></Text>')),
      ).toBe(false);
      expect(omit(short + other('<ContentAudience>00</ContentAudience>', '', '<Text></Text>'))).toBe(false);
    });

    it("never counts a chapter's description for the book, nor the book's for a chapter", () => {
      const chapter = (texts: string) =>
        `<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>${texts}</ContentItem>`;
      const CHAPTER = '/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[1]';

      // The book's short description with a publisher's notice beside it, and a chapter's long description.
      const book = tree(
        '',
        textContent('02', 'x'.repeat(400)) + textContent('13', 'Notice.'),
        '',
        chapter(textContent('03', 'A chapter description.')),
      );
      expect(canOmit(book, `${COLLATERAL}/TextContent[1]`)).toBe(false);
      expect(
        apply(book, {
          kind: 'OMIT_SHORT_DESCRIPTION',
          rule: SHORT_DESCRIPTION_LENGTH_RULE,
          path: `${COLLATERAL}/TextContent[1]`,
        }),
      ).toBe('ONLY_DESCRIPTION');

      // A chapter's short description beside the book's long description.
      const component = tree('', textContent('03', 'The book.'), '', chapter(textContent('02', 'y'.repeat(400))));
      expect(canOmit(component, `${CHAPTER}/TextContent[1]`)).toBe(false);

      // A chapter's own long description does count for that chapter.
      const own = tree('', '', '', chapter(textContent('02', 'y'.repeat(400)) + textContent('03', 'Its own.')));
      expect(canOmit(own, `${CHAPTER}/TextContent[1]`)).toBe(true);
    });

    it('selects the over-limit Text by what the rule measures, its character data, not its markup', () => {
      // A plain 360-character Text fires the rule; an XHTML one with 320 characters of text does not, although its
      // markup makes it 360 characters long.
      const xhtml = `<p><em>${'z'.repeat(160)}</em></p><p><strong>${'z'.repeat(160)}</strong></p>`;
      const document = tree(
        '',
        `<TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience><Text language="eng">${'y'.repeat(360)}</Text><Text language="fre" textformat="05">${xhtml}</Text></TextContent>`,
      );
      expect(measureShortDescription(xhtml).withinLimit).toBe(false);

      const applied = apply(document, {
        kind: 'REPLACE_SHORT_DESCRIPTION',
        rule: SHORT_DESCRIPTION_LENGTH_RULE,
        path: `${COLLATERAL}/TextContent[1]`,
        text: 'Short.',
      });
      expect(applied).toEqual(
        expect.objectContaining({
          marker: expect.objectContaining({
            valuePath: `${COLLATERAL}/TextContent[1]/Text[1]`,
            original: 'y'.repeat(360),
            value: 'Short.',
          }),
        }),
      );
      expect(editableTextOf(elementAtPath(document, `${COLLATERAL}/TextContent[1]/Text[2]`)!)).toBe(xhtml);
    });
  });

  describe('applyPublisherFixToTree', () => {
    const edition = (value: number | string): PublisherFix => ({
      kind: 'SET_EDITION_NUMBER',
      rule: EDITION_STATEMENT_RULE,
      path: DETAIL,
      edition: value,
    });

    it('adds the EditionNumber before the statements, in the source namespace and prefix', () => {
      const document = tree('<EditionStatement>3rd</EditionStatement><Language/>', '', 'onix');
      const applied = apply(document, edition(3));

      expect(applied).toEqual({
        marker: {
          recovery: 'PUBLISHER_SUPPLIED_VALUE',
          decision: 'PUBLISHER',
          action: 'SET_EDITION_NUMBER',
          rule: EDITION_STATEMENT_RULE,
          path: DETAIL,
          valuePath: `${DETAIL}/EditionNumber[1]`,
          original: null,
          value: '3',
          originalTextFormat: null,
          valueTextFormat: null,
        },
        removed: null,
        escapedXhtml: null,
      });
      expect(serializeXdm(elementAtPath(document, DETAIL)!)).toBe(
        '<onix:DescriptiveDetail><onix:EditionNumber>3</onix:EditionNumber><onix:EditionStatement>3rd</onix:EditionStatement><onix:Language/></onix:DescriptiveDetail>',
      );
      expect(elementAtPath(document, `${DETAIL}/EditionNumber[1]`)!.namespaceURI).toBe(NS);
    });

    it.each([
      ['no statement', '<Language/>', 'TARGET_NOT_APPLICABLE'],
      [
        'an EditionType',
        '<EditionType>REV</EditionType><EditionStatement>Revised</EditionStatement>',
        'TARGET_NOT_APPLICABLE',
      ],
      [
        'an EditionNumber',
        '<EditionNumber>2</EditionNumber><EditionStatement>2nd</EditionStatement>',
        'TARGET_NOT_APPLICABLE',
      ],
    ])('refuses a DescriptiveDetail with %s and leaves the tree as it was', (_label, detail, reason) => {
      const document = tree(detail);
      const before = serializeXdm(document);

      expect(apply(document, edition(3))).toBe(reason);
      expect(serializeXdm(document)).toBe(before);
    });

    it('refuses a value or a binding the allowlist does not cover, changing nothing', () => {
      const document = tree('<EditionStatement>Third</EditionStatement>', textContent('02', 'x'.repeat(400)));
      const before = serializeXdm(document);

      expect(apply(document, edition(0))).toBe('EDITION_NOT_POSITIVE');
      expect(apply(document, edition('2.5'))).toBe('EDITION_NOT_AN_INTEGER');
      expect(apply(document, { ...edition(3), path: `${COLLATERAL}/TextContent[1]` })).toBe('TARGET_NOT_APPLICABLE');
      expect(apply(document, { ...edition(3), path: `${DETAIL}/Missing[1]` })).toBe('TARGET_NOT_FOUND');
      expect(apply(document, { ...edition(3), rule: '_20171126_b_42' } as unknown as PublisherFix)).toBe(
        'RULE_NOT_ALLOWLISTED',
      );
      expect(
        apply(document, {
          ...edition(3),
          rule: SHORT_DESCRIPTION_LENGTH_RULE,
        } as unknown as PublisherFix),
      ).toBe('RULE_MISMATCH');
      const replace = (text: string): PublisherFix => ({
        kind: 'REPLACE_SHORT_DESCRIPTION',
        rule: SHORT_DESCRIPTION_LENGTH_RULE,
        path: `${COLLATERAL}/TextContent[1]`,
        text,
      });
      expect(apply(document, replace('y'.repeat(351)))).toBe('TEXT_OVER_LIMIT');
      expect(apply(document, replace('   '))).toBe('TEXT_EMPTY');
      expect(
        apply(document, {
          kind: 'OMIT_SHORT_DESCRIPTION',
          rule: SHORT_DESCRIPTION_LENGTH_RULE,
          path: `${COLLATERAL}/TextContent[1]`,
        }),
      ).toBe('ONLY_DESCRIPTION');
      expect(serializeXdm(document)).toBe(before);
    });

    it('replaces only the one over-limit Text, and refuses two of them as ambiguous', () => {
      const two = (first: string, second: string) =>
        `<TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience><Text language="eng">${first}</Text><Text language="fre">${second}</Text></TextContent>`;
      const fix: PublisherFix = {
        kind: 'REPLACE_SHORT_DESCRIPTION',
        rule: SHORT_DESCRIPTION_LENGTH_RULE,
        path: `${COLLATERAL}/TextContent[1]`,
        text: 'Court.',
      };
      const document = tree('', two('Short.', 'z'.repeat(351)));
      expect(apply(document, fix)).toEqual(
        expect.objectContaining({
          marker: expect.objectContaining({
            valuePath: `${COLLATERAL}/TextContent[1]/Text[2]`,
            original: 'z'.repeat(351),
          }),
        }),
      );
      expect(editableTextOf(elementAtPath(document, `${COLLATERAL}/TextContent[1]/Text[1]`)!)).toBe('Short.');
      expect(editableTextOf(elementAtPath(document, `${COLLATERAL}/TextContent[1]/Text[2]`)!)).toBe('Court.');

      expect(apply(tree('', two('y'.repeat(351), 'z'.repeat(351))), fix)).toBe('AMBIGUOUS_TARGET');
      expect(apply(tree('', two('Short.', 'Court.')), fix)).toBe('TARGET_NOT_APPLICABLE');
    });

    it('reports the escaped XHTML it stored, and writes its element form for the schema probe in the source prefix', () => {
      const xhtml = `<TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience><Text textformat="05"><p>${'x'.repeat(400)}</p></Text></TextContent>`;
      const TEXT = `${COLLATERAL}/TextContent[1]/Text[1]`;
      const markup = '<p>A <em>short</em> one.</p>';
      const applied = apply(tree('', xhtml, 'onix'), {
        kind: 'REPLACE_SHORT_DESCRIPTION',
        rule: SHORT_DESCRIPTION_LENGTH_RULE,
        path: `${COLLATERAL}/TextContent[1]`,
        text: markup,
      });
      expect(applied).toEqual(expect.objectContaining({ escapedXhtml: { textPath: TEXT, markup } }));

      const probe = tree('', xhtml, 'onix');
      expect(writeXhtmlForm(probe, TEXT, markup)).toBe(true);
      expect(serializeXdm(elementAtPath(probe, TEXT)!)).toBe(
        '<onix:Text textformat="05"><onix:p>A <onix:em>short</onix:em> one.</onix:p></onix:Text>',
      );
      expect(writeXhtmlForm(probe, TEXT, '<p>Unclosed')).toBe(false);
      expect(writeXhtmlForm(probe, `${COLLATERAL}/TextContent[9]/Text[1]`, markup)).toBe(false);
    });

    it('writes a corrected XHTML Text back as escaped HTML, and puts back a value the importer would not take', () => {
      const xhtml = `<TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience><Text language="eng" textformat="05"><p>${'x'.repeat(400)}</p></Text></TextContent>`;
      const fix = (text: string): PublisherFix => ({
        kind: 'REPLACE_SHORT_DESCRIPTION',
        rule: SHORT_DESCRIPTION_LENGTH_RULE,
        path: `${COLLATERAL}/TextContent[1]`,
        text,
      });
      const TEXT = `${COLLATERAL}/TextContent[1]/Text[1]`;

      const document = tree('', xhtml);
      expect(apply(document, fix('<p>A <em>short</em> one &amp; more.</p>'))).toEqual(
        expect.objectContaining({
          marker: expect.objectContaining({
            original: `<p>${'x'.repeat(400)}</p>`,
            originalTextFormat: '05',
            value: '<p>A <em>short</em> one &amp; more.</p>',
            valueTextFormat: '02',
          }),
        }),
      );
      const text = elementAtPath(document, TEXT)!;
      // One text node holding the markup as character data: what string-length measures is the live count.
      expect(Array.from(text.childNodes).map((child) => child.nodeType)).toEqual([3]);
      expect(text.textContent).toBe('<p>A <em>short</em> one &amp; more.</p>');
      expect(text.getAttribute('textformat')).toBe('02');
      expect(text.getAttribute('language')).toBe('eng');
      expect(serializeXdm(text)).toBe(
        '<Text language="eng" textformat="02">&lt;p&gt;A &lt;em&gt;short&lt;/em&gt; one &amp;amp; more.&lt;/p&gt;</Text>',
      );

      // A value that renders nothing is not importable: the Text is put back exactly as it was.
      const untouched = tree('', xhtml);
      const before = serializeXdm(untouched);
      expect(apply(untouched, fix('<p></p>'))).toBe('TEXT_NOT_IMPORTABLE');
      expect(serializeXdm(untouched)).toBe(before);
      const plain = tree('', textContent('02', 'y'.repeat(400)));
      const plainBefore = serializeXdm(plain);
      expect(apply(plain, fix('Line one\nline two'))).toBe('TEXT_NOT_IMPORTABLE');
      expect(serializeXdm(plain)).toBe(plainBefore);
    });

    it('derives the ONIX XHTML subset from the pinned schema', () => {
      const { elements } = CONTEXT.xhtmlSubset;
      for (const name of ['p', 'em', 'strong', 'ul', 'ol', 'li', 'br', 'a'])
        expect(elements.has(name), name).toBe(true);
      for (const name of ['script', 'style', 'iframe', 'blink', 'inline', 'block']) {
        expect(elements.has(name), name).toBe(false);
      }
      expect([...elements.get('p')!].sort()).toEqual(['class', 'dir', 'id', 'lang', 'style', 'title']);
      expect(elements.get('a')!.has('href')).toBe(true);
      expect(elements.get('p')!.has('onclick')).toBe(false);
      expect(elements.get('br')!.has('class')).toBe(true);
    });

    describe('a corrected XHTML short description stays inside the ONIX XHTML subset', () => {
      const XHTML = `<TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience><Text textformat="05"><p>${'x'.repeat(400)}</p></Text></TextContent>`;
      const fix = (text: string): PublisherFix => ({
        kind: 'REPLACE_SHORT_DESCRIPTION',
        rule: SHORT_DESCRIPTION_LENGTH_RULE,
        path: `${COLLATERAL}/TextContent[1]`,
        text,
      });

      it.each([
        ['a script element', '<p>Short.</p><script>alert(1)</script>'],
        ['an event attribute', '<p onclick="alert(1)">Short.</p>'],
        ['an element outside the subset', '<p>Short.</p><blink>no</blink>'],
        ['an attribute outside the subset', '<p align="left">Short.</p>'],
        ['a comment', '<p>Short.<!-- note --></p>'],
        ['a CDATA section', '<p><![CDATA[Short.]]></p>'],
        ['a processing instruction', '<p>Short.<?php echo 1 ?></p>'],
        ['a namespace declaration', '<p xmlns="http://ns.editeur.org/onix/3.0/reference">Short.</p>'],
        ['an element in another namespace', '<p xmlns="urn:example">Short.</p>'],
        ['a namespaced attribute', '<p xml:lang="en">Short.</p>'],
      ])('refuses %s, changing nothing', (_label, value) => {
        const document = tree('', XHTML);
        const before = serializeXdm(document);

        expect(apply(document, fix(value))).toBe('TEXT_NOT_IMPORTABLE');
        expect(serializeXdm(document)).toBe(before);
      });

      it('refuses a prefixed element in a prefixed source, and accepts the bare form it offered', () => {
        const prefixed = tree('', XHTML, 'onix');
        const before = serializeXdm(prefixed);
        expect(apply(prefixed, fix('<onix:p>Short.</onix:p>'))).toBe('TEXT_NOT_IMPORTABLE');
        expect(serializeXdm(prefixed)).toBe(before);

        expect(apply(prefixed, fix('<p>Short.</p>'))).toEqual(
          expect.objectContaining({
            marker: expect.objectContaining({ value: '<p>Short.</p>', valueTextFormat: '02' }),
          }),
        );
        const text = elementAtPath(prefixed, `${COLLATERAL}/TextContent[1]/Text[1]`)!;
        expect(text.textContent).toBe('<p>Short.</p>');
      });

      it('accepts the subset: paragraphs, emphasis, lists and line breaks, with subset attributes', () => {
        const value =
          '<p class="lead">A <em>short</em> and <strong>strong</strong> one.</p><ul><li>One</li><li>Two</li></ul><p>Line<br/>break</p>';
        const document = tree('', XHTML);
        expect(apply(document, fix(value))).toEqual(
          expect.objectContaining({ marker: expect.objectContaining({ value, valueTextFormat: '02' }) }),
        );
      });
    });

    it('leaves a short description out, reporting the sibling run it shifted', () => {
      const document = tree(
        '',
        textContent('03', 'long') + textContent('02', 'x'.repeat(400)) + textContent('02', 'y'),
      );
      const applied = apply(document, {
        kind: 'OMIT_SHORT_DESCRIPTION',
        rule: SHORT_DESCRIPTION_LENGTH_RULE,
        path: `${COLLATERAL}/TextContent[2]`,
      });

      expect(applied).toEqual({
        marker: expect.objectContaining({ action: 'OMIT_SHORT_DESCRIPTION', original: 'x'.repeat(400), value: null }),
        removed: { parentPath: COLLATERAL, localName: 'TextContent', position: 2 },
        escapedXhtml: null,
      });
      expect(editableTextOf(elementAtPath(document, `${COLLATERAL}/TextContent[2]/Text[1]`)!)).toBe('y');
    });
  });

  describe('judging a re-validation', () => {
    const TC = `${COLLATERAL}/TextContent`;
    const fix: PublisherFix = {
      kind: 'REPLACE_SHORT_DESCRIPTION',
      rule: SHORT_DESCRIPTION_LENGTH_RULE,
      path: `${TC}[1]`,
      text: 'x',
    };
    const finding = (id: string, path: string, overrides: Partial<SourceFinding> = {}) =>
      makeFinding({
        id,
        tier: 'STRICT',
        stage: 6,
        scope: 'VALIDITY',
        class: 'NORMATIVE_INVALID',
        blocking: true,
        path,
        ...overrides,
      });
    const own = finding(SHORT_DESCRIPTION_LENGTH_RULE, `${TC}[1]`);
    const advisory = finding('_advisory', `${TC}[1]`, { class: 'ADVISORY', blocking: false });

    it('accepts a fix whose finding is gone and which adds no blocking finding', () => {
      const other = finding('_other', '/ONIXMessage[1]/Product[2]');
      expect(judgeRevalidation(fix, [own, other, advisory], [other], null)).toEqual({ accepted: true });
    });

    it('refuses a finding the baseline does not reproduce, or one still reported after', () => {
      expect(judgeRevalidation(fix, [], [], null)).toEqual({
        accepted: false,
        reason: 'FINDING_NOT_REPRODUCED',
        findings: [],
      });
      const recovered = makeFinding({ ...own, recoverability: 'OMIT_INVALID_COMPOSITE' });
      expect(judgeRevalidation(fix, [own], [recovered], null)).toEqual({
        accepted: false,
        reason: 'FINDING_REMAINS',
        findings: [recovered],
      });
    });

    it('refuses any new blocking finding, counted or recovered, and compares repeated findings as a multiset', () => {
      const added = finding('ORDINARY_XSD_INVALID', `${TC}[1]/Text[1]`, {
        tier: 'CANONICAL_ORDINARY',
        stage: 5,
        class: 'SOURCE_INVALID',
        recoverability: 'OMIT_INVALID_COMPOSITE',
      });
      expect(judgeRevalidation(fix, [own], [added], null)).toEqual({
        accepted: false,
        reason: 'NEW_BLOCKING_FINDING',
        findings: [added],
      });
      const repeated = finding('_other', '/ONIXMessage[1]/Product[2]');
      expect(judgeRevalidation(fix, [own, repeated], [repeated, repeated], null)).toEqual({
        accepted: false,
        reason: 'NEW_BLOCKING_FINDING',
        findings: [repeated],
      });
      // A new advisory is not a blocking finding.
      expect(judgeRevalidation(fix, [own], [advisory], null)).toEqual({ accepted: true });
    });

    it('maps paths back across a left-out composite before comparing', () => {
      const removed = { parentPath: COLLATERAL, localName: 'TextContent', position: 1 };
      expect(pathBeforeFix(`${TC}[1]/Text[1]`, removed)).toBe(`${TC}[2]/Text[1]`);
      expect(pathBeforeFix(`${TC}[3]`, removed)).toBe(`${TC}[4]`);
      expect(pathBeforeFix(`${COLLATERAL}/Other[1]`, removed)).toBe(`${COLLATERAL}/Other[1]`);
      expect(pathBeforeFix(`${TC}[1]`, null)).toBe(`${TC}[1]`);

      const sibling = finding(SHORT_DESCRIPTION_LENGTH_RULE, `${TC}[2]`);
      const omit: PublisherFix = {
        kind: 'OMIT_SHORT_DESCRIPTION',
        rule: SHORT_DESCRIPTION_LENGTH_RULE,
        path: `${TC}[1]`,
      };
      // The sibling's finding now stands at TextContent[1], where the left-out one was: it is the sibling's, not the fix's.
      const moved = finding(SHORT_DESCRIPTION_LENGTH_RULE, `${TC}[1]`);
      expect(judgeRevalidation(omit, [own, sibling], [moved], removed)).toEqual({ accepted: true });
    });
  });

  describe('recording a fix in the ledger', () => {
    const edition = makeFinding({
      id: EDITION_STATEMENT_RULE,
      tier: 'INVENTORY',
      stage: 8,
      scope: 'VALIDITY',
      class: 'NORMATIVE_INVALID',
      blocking: true,
      path: DETAIL,
    });
    const advisory = makeFinding({
      id: '_advisory',
      tier: 'SCHEMATRON',
      stage: 7,
      scope: 'VALIDITY',
      class: 'ADVISORY',
      blocking: false,
      path: DETAIL,
    });

    it('recovers exactly the one finding, keeping its class, and returns every other finding as the same object', () => {
      const ledger = [advisory, edition];
      const recorded = recordPublisherFix(ledger, { rule: EDITION_STATEMENT_RULE, path: DETAIL })!;

      expect(recorded[0]).toBe(advisory);
      expect(recorded[1]).toEqual({ ...edition, recoverability: 'PUBLISHER_SUPPLIED_VALUE', counts: false });
      expect(recorded[1].class).toBe('NORMATIVE_INVALID');
      expect(ledger[1].counts).toBe(true);
    });

    it('binds nothing unless exactly one fixable finding of that rule is at that location', () => {
      expect(recordPublisherFix([advisory], { rule: EDITION_STATEMENT_RULE, path: DETAIL })).toBeNull();
      expect(recordPublisherFix([edition, edition], { rule: EDITION_STATEMENT_RULE, path: DETAIL })).toBeNull();
      const secondary = makeFinding({ ...edition, projection: 'SECONDARY' });
      expect(recordPublisherFix([secondary], { rule: EDITION_STATEMENT_RULE, path: DETAIL })).toBeNull();
      expect(isPublisherFixable(edition)).toBe(true);
      expect(isPublisherFixable(makeFinding({ ...edition, tier: 'STRICT', stage: 6 }))).toBe(false);
      expect(isPublisherFixable(makeFinding({ ...edition, id: '_20171126_b_42' }))).toBe(false);
      expect(isPublisherFixable(makeFinding({ ...edition, recoverability: 'PUBLISHER_SUPPLIED_VALUE' }))).toBe(false);
    });
  });
});
