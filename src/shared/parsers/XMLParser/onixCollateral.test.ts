import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from '@5stones/onix';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AbstractType, LocaleCode, MarkupFormat, ResourceType } from '@/gql/graphql';
import { AdditionalResourceDtoMapper } from '@/src/entities/additional-resource/model/additional-resource.mapper';
import { WorkDtoMapper } from '@/src/entities/work/model/work.mapper';
import type { WorkDto } from '@/src/entities/work/model/work.types';

import {
  ONIX_COLLATERAL_ACKNOWLEDGED,
  ONIX_COLLATERAL_OMIT,
  ONIX_COLLATERAL_PROJECT,
  type OnixCollateralFinding,
  type OnixCollateralFindingCode,
} from '../../types/onixPlanning';
import { getDefaultWork } from '../../utils/work';
import type { ExtendedONIXMessageRoot } from './interfaces';
import {
  componentCollateralOf,
  isOfferedOnixCollateralAnswer,
  ONIX_LIST_158_LABELS,
  reduceOnixCollateral,
  resolveOnixCollateralComponent,
  resolveOnixCollateralWork,
} from './onixCollateral';
import { reduceOnixDescriptive } from './onixDescriptive';
import { planOnixSource } from './onixPlanning';
import { bridgeOnixSource, permitsTargetPlanning, projectOnixSourceIssues } from './onixSourceBridge';
import { createOnixSourceValidator, type RecoveryMarker } from './validation';
import { toWorkerResult } from './validation/worker/result';

/**
 * The canonical collateral reduction of thoth-app#225 (REL-01C of #185), driven as the uploader drives it: a real ONIX
 * document parsed by `@5stones/onix`, planned by #182, described by #183, then reduced and resolved with the publisher's
 * answers. Every fixture is minimal and synthetic, and every path is the canonical Reference path a finding names.
 */

const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';
const REFERENCE_NS_31 = 'http://ns.editeur.org/onix/3.1/reference';
const HEADER =
  '<Header><Sender><SenderName>Example Press</SenderName></Sender><SentDateTime>20260925</SentDateTime></Header>';
const PRODUCT = (index = 1) => `/ONIXMessage[1]/Product[${index}]`;
const COLLATERAL = (index = 1) => `${PRODUCT(index)}/CollateralDetail[1]`;

type TextSpec = {
  readonly audiences?: readonly string[];
  /** Attributes of the Text element, such as ` language="fre"` or ` textformat="02"`. */
  readonly attributes?: string;
  /** Anything the TextContent states after its Text, as ONIX orders it. */
  readonly after?: string;
  /** Several Text elements instead of one. */
  readonly texts?: readonly (readonly [attributes: string, body: string])[];
};

const textContent = (
  type: string,
  body: string,
  { audiences = ['00'], attributes = '', after = '', texts }: TextSpec = {},
) =>
  `<TextContent><TextType>${type}</TextType>${audiences.map((audience) => `<ContentAudience>${audience}</ContentAudience>`).join('')}` +
  (texts ?? [[attributes, body]])
    .map(([textAttributes, textBody]) => `<Text${textAttributes}>${textBody}</Text>`)
    .join('') +
  `${after}</TextContent>`;

const contentDate = (role: string, date: string, format?: string) =>
  `<ContentDate><ContentDateRole>${role}</ContentDateRole>${format === undefined ? '' : `<DateFormat>${format}</DateFormat>`}<Date>${date}</Date></ContentDate>`;

type VersionSpec = {
  readonly form?: string;
  readonly links?: readonly string[];
  readonly features?: string;
  readonly dates?: string;
};

const version = ({
  form = '01',
  links = ['https://example.org/resource'],
  features = '',
  dates = '',
}: VersionSpec = {}) =>
  `<ResourceVersion><ResourceForm>${form}</ResourceForm>${features}${links.map((link) => `<ResourceLink>${link}</ResourceLink>`).join('')}${dates}</ResourceVersion>`;

type ResourceSpec = {
  readonly audiences?: readonly string[];
  readonly modes?: readonly string[];
  readonly features?: string;
  readonly versions?: readonly string[];
  readonly territory?: string;
};

const resource = (
  contentType: string,
  { audiences = ['00'], modes = ['03'], features = '', versions = [version()], territory = '' }: ResourceSpec = {},
) =>
  `<SupportingResource><ResourceContentType>${contentType}</ResourceContentType>${audiences.map((audience) => `<ContentAudience>${audience}</ContentAudience>`).join('')}` +
  `${territory}${modes.map((mode) => `<ResourceMode>${mode}</ResourceMode>`).join('')}${features}${versions.join('')}</SupportingResource>`;

const feature = (type: string, notes: readonly string[] = [], value?: string) =>
  `<ResourceFeature><ResourceFeatureType>${type}</ResourceFeatureType>${value === undefined ? '' : `<FeatureValue>${value}</FeatureValue>`}${notes.map((note) => `<FeatureNote>${note}</FeatureNote>`).join('')}</ResourceFeature>`;

const versionFeature = (type: string, value: string) =>
  `<ResourceVersionFeature><ResourceVersionFeatureType>${type}</ResourceVersionFeatureType><FeatureValue>${value}</FeatureValue></ResourceVersionFeature>`;

const title = (text: string, level = '01') =>
  `<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>${level}</TitleElementLevel><TitleText>${text}</TitleText></TitleElement></TitleDetail>`;

type ProductSpec = {
  readonly ref?: string;
  readonly isbn?: string;
  readonly form?: string;
  /** The Product's languages of text, as List 74 codes; none where it states none. */
  readonly languages?: readonly string[];
  readonly collateral?: string;
  readonly promotion?: string;
  readonly items?: readonly string[];
  /** The Work DOI a RelatedWork 01 names: Products naming the same one are one Work. */
  readonly workDoi?: string;
};

const product = ({
  ref = 'p1',
  isbn = '9781800000018',
  form = 'BC',
  languages = ['eng'],
  collateral = '',
  promotion = '',
  items = [],
  workDoi,
}: ProductSpec = {}) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>03</NotificationType>` +
  `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
  `<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>${form}</ProductForm>${title('A Work')}` +
  `${languages.map((code) => `<Language><LanguageRole>01</LanguageRole><LanguageCode>${code}</LanguageCode></Language>`).join('')}</DescriptiveDetail>` +
  (collateral.length > 0 ? `<CollateralDetail>${collateral}</CollateralDetail>` : '') +
  (promotion.length > 0 ? `<PromotionDetail>${promotion}</PromotionDetail>` : '') +
  (items.length > 0 ? `<ContentDetail>${items.join('')}</ContentDetail>` : '') +
  '<PublishingDetail><Imprint><ImprintName>Example Imprint</ImprintName></Imprint><PublishingStatus>04</PublishingStatus>' +
  '<PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20240101</Date></PublishingDate></PublishingDetail>' +
  (workDoi === undefined
    ? ''
    : `<RelatedMaterial><RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>${workDoi}</IDValue></WorkIdentifier></RelatedWork></RelatedMaterial>`) +
  '</Product>';

const contentItem = (type: string, collateral: string, lsn = '1') =>
  `<ContentItem><LevelSequenceNumber>${lsn}</LevelSequenceNumber><TextItem><TextItemType>${type}</TextItemType></TextItem>` +
  `${title('A Component', '04')}${collateral}</ContentItem>`;

const avItem = (collateral: string) =>
  `<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><AVItem><AVItemType>01</AVItemType></AVItem>${title('A Clip', '04')}${collateral}</ContentItem>`;

const reduce = (
  products: readonly string[],
  { release = '3.0', recoveries }: { readonly release?: '3.0' | '3.1'; readonly recoveries?: RecoveryMarker[] } = {},
) => {
  const root = parse(
    `<ONIXMessage release="${release}" xmlns="${release === '3.0' ? REFERENCE_NS : REFERENCE_NS_31}">${HEADER}${products.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(root);
  const descriptive = reduceOnixDescriptive(root, sourcePlan);

  return { root, sourcePlan, descriptive, plan: reduceOnixCollateral(root, sourcePlan, { descriptive, recoveries }) };
};

type Reduced = ReturnType<typeof reduce>;

/** The first Work group's collateral with the publisher's answers, as the resolver asks for a new Work. */
const resolveWork = (
  reduced: Reduced,
  choices: Record<string, string> = {},
  canonicalTitleLocale: string | null = null,
  groupIndex = 0,
) => {
  const { groupKey } = reduced.sourcePlan.groups[groupIndex];
  const productKeys = reduced.sourcePlan.products
    .filter((node) => node.groupKey === groupKey)
    .map(({ productKey }) => productKey);

  return resolveOnixCollateralWork(reduced.plan, groupKey, productKeys, {
    choices,
    canonicalTitleLocale,
    describe: 'the Work',
  });
};

type Resolved = ReturnType<typeof resolveWork>;

const findingsOf = (reduced: Reduced, resolved: Resolved): OnixCollateralFinding[] => {
  const byKey = new Map([...reduced.plan.findings, ...resolved.raised].map((finding) => [finding.key, finding]));

  return resolved.findingKeys.map((key) => byKey.get(key) as OnixCollateralFinding);
};

const codesOf = (reduced: Reduced, resolved: Resolved) => findingsOf(reduced, resolved).map(({ code }) => code);

const findingOf = (reduced: Reduced, resolved: Resolved, code: OnixCollateralFindingCode) => {
  const found = findingsOf(reduced, resolved).filter((finding) => finding.code === code);

  expect(found).toHaveLength(1);

  return found[0];
};

const pendingCodes = (reduced: Reduced, resolved: Resolved) => {
  const byKey = new Map([...reduced.plan.findings, ...resolved.raised].map((finding) => [finding.key, finding]));

  return resolved.pendingFindingKeys.map((key) => byKey.get(key)?.code);
};

const productOf = (reduced: Reduced, index = 0) => reduced.plan.products[reduced.sourcePlan.products[index].productKey];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('reduceOnixCollateral: normalised source facts (5562227566 rules 1-12, 70-80)', () => {
  it('keeps every TextContent and SupportingResource of the Product and its ContentItems, in source order, at its own path', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('03', 'First description.') +
          textContent('03', 'Second description.') +
          resource('26', { modes: ['05'], versions: [version({ links: ['https://example.org/a'] }), version()] }),
        items: [contentItem('03', textContent('30', 'A chapter abstract.'))],
      }),
    ]);
    const { textContents, resources } = productOf(reduced);

    expect(textContents.map(({ path, textType, position, scope }) => [path, textType, position, scope.kind])).toEqual([
      [`${COLLATERAL()}/TextContent[1]`, '03', 1, 'PRODUCT'],
      [`${COLLATERAL()}/TextContent[2]`, '03', 2, 'PRODUCT'],
      [`${PRODUCT()}/ContentDetail[1]/ContentItem[1]/TextContent[1]`, '30', 1, 'COMPONENT'],
    ]);
    expect(textContents.map(({ texts }) => texts.map(({ text }) => text))).toEqual([
      ['First description.'],
      ['Second description.'],
      ['A chapter abstract.'],
    ]);
    expect(resources).toHaveLength(1);
    expect(resources[0]).toMatchObject({
      contentType: '26',
      role: 'WORK_RESOURCE',
      modes: ['05'],
      audiences: ['00'],
    });
    // Every version, never only the first (rule 73).
    expect(resources[0].versions.map(({ links }) => links.map(({ text }) => text))).toEqual([
      ['https://example.org/a'],
      ['https://example.org/resource'],
    ]);
  });

  it('reads nothing from the network, and never fetches, downloads or hosts a resource (rules 77-79)', () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;

    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    try {
      const reduced = reduce([
        product({
          collateral:
            resource('15', {
              modes: ['04'],
              versions: [version({ form: '02', links: ['https://example.org/sample.pdf'] })],
            }) + resource('26', { modes: ['05'], versions: [version({ links: ['https://example.org/trailer.mp4'] })] }),
        }),
      ]);
      const resolved = resolveWork(reduced, {
        [reduced.plan.workResourceCandidates[reduced.sourcePlan.groups[0].groupKey][0].decisionFindingKey as string]:
          ONIX_COLLATERAL_PROJECT,
      });

      expect(resolved.resources).toHaveLength(2);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('records a TextContent canonical validation omitted by its marker alone, and synthesises no text for it', () => {
    const removed = `${COLLATERAL()}/TextContent[1]`;
    const reduced = reduce([product({ collateral: textContent('03', 'The only surviving description.') })], {
      recoveries: [{ recovery: 'OMIT_INVALID_COMPOSITE', removed, taintSite: COLLATERAL() }],
    });

    expect(productOf(reduced).omissions).toEqual([
      {
        path: removed,
        sourcePath: removed,
        productKey: reduced.sourcePlan.products[0].productKey,
        groupKey: reduced.sourcePlan.products[0].groupKey,
        recovery: 'OMIT_INVALID_COMPOSITE',
        taintSite: COLLATERAL(),
      },
    ]);
    // No finding reclassifies the omission: source validity is the validator's alone.
    expect(reduced.plan.findings.map(({ code }) => code)).not.toContain('COLLATERAL_SHAPE_UNEXPECTED');
    // The surviving sibling is itself, never the omitted composite's text.
    expect(resolveWork(reduced).abstracts.map(({ content }) => content)).toEqual(['The only surviving description.']);
  });

  it('keeps review quotes and endorsements whole for REL-01D (#226), and projects none of them here', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('06', 'A splendid book.', {
            after: '<TextAuthor>A Reviewer</TextAuthor><SourceTitle>A Journal</SourceTitle>',
          }) +
          textContent('07', 'Of the previous edition.') +
          textContent('08', 'Of a previous work.') +
          textContent('09', 'Endorsed.', { after: '<TextAuthor>An Endorser</TextAuthor>' }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(productOf(reduced).textContents.map(({ role, textType }) => [textType, role])).toEqual([
      ['06', 'REVIEW'],
      ['07', 'REVIEW'],
      ['08', 'REVIEW'],
      ['09', 'REVIEW'],
    ]);
    expect(productOf(reduced).textContents[0]).toMatchObject({
      authors: [expect.objectContaining({ text: 'A Reviewer' })],
      sourceTitles: [expect.objectContaining({ text: 'A Journal' })],
    });
    expect(productOf(reduced).textCandidates).toEqual([]);
    expect(resolved.findingKeys).toEqual([]);
    expect(resolved.abstracts).toEqual([]);
  });
});

describe('TextContent -> Abstract (rules 13-20, 32-47)', () => {
  it('imports TextType 02 as the short abstract and 30 as the long abstract, each canonical where it is the only one', () => {
    const reduced = reduce([
      product({ collateral: textContent('02', 'A short one.') + textContent('30', 'A formal abstract.') }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.pendingFindingKeys).toEqual([]);
    expect(resolved.abstracts).toEqual([
      expect.objectContaining({
        type: AbstractType.Short,
        localeCode: LocaleCode.En,
        content: 'A short one.',
        canonical: true,
        canonicalBasis: 'SINGLE',
        textTypes: ['02'],
      }),
      expect.objectContaining({
        type: AbstractType.Long,
        localeCode: LocaleCode.En,
        content: 'A formal abstract.',
        canonical: true,
        textTypes: ['30'],
      }),
    ]);
  });

  it('imports a Description (03) as the long abstract only where no Abstract (30) competes, saying so (rule 34)', () => {
    const reduced = reduce([product({ collateral: textContent('03', 'Only a description.') })]);
    const resolved = resolveWork(reduced);

    expect(resolved.abstracts).toEqual([
      expect.objectContaining({ type: AbstractType.Long, content: 'Only a description.', textTypes: ['03'] }),
    ]);
    expect(findingOf(reduced, resolved, 'COLLATERAL_TEXT_DESCRIPTION_NORMALISED').classification).toBe(
      'SUPPORTED_NORMALIZED',
    );
  });

  it('collapses Thoth’s own identical 03 and 30 into one long abstract, keeping both sources (rules 35, 46)', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('03', 'Lorem &lt;italic&gt;ipsum&lt;/italic&gt;.', { attributes: ' textformat="03"' }) +
          textContent('30', 'Lorem &lt;italic&gt;ipsum&lt;/italic&gt;.', { attributes: ' textformat="03"' }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.pendingFindingKeys).toEqual([]);
    expect(resolved.abstracts).toEqual([
      expect.objectContaining({
        type: AbstractType.Long,
        content: 'Lorem <italic>ipsum</italic>.',
        markupFormat: MarkupFormat.JatsXml,
        textTypes: ['03', '30'],
        locations: [
          { path: `${COLLATERAL()}/TextContent[1]/Text[1]`, sourcePath: `${COLLATERAL()}/TextContent[1]/Text[1]` },
          { path: `${COLLATERAL()}/TextContent[2]/Text[1]`, sourcePath: `${COLLATERAL()}/TextContent[2]/Text[1]` },
        ],
      }),
    ]);
    expect(codesOf(reduced, resolved)).toContain('COLLATERAL_TEXT_COLLAPSED');
    expect(codesOf(reduced, resolved)).not.toContain('COLLATERAL_TEXT_DESCRIPTION_NORMALISED');
  });

  it('never takes the first of distinct 03 and 30 for one locale: the publisher chooses, or imports none (rule 36)', () => {
    const reduced = reduce([
      product({ collateral: textContent('03', 'A description.') + textContent('30', 'A different abstract.') }),
    ]);
    const unanswered = resolveWork(reduced);
    const choice = findingOf(reduced, unanswered, 'COLLATERAL_ABSTRACT_CHOICE_REQUIRED');

    expect(unanswered.abstracts).toEqual([]);
    expect(unanswered.pendingFindingKeys).toEqual([choice.key]);
    expect(choice).toMatchObject({ blocking: true, classification: 'TARGET_INPUT_REQUIRED' });
    expect(choice.resolution.kind === 'CHOICE' && choice.resolution.options.map(({ label }) => label)).toEqual([
      'TextType 03: A description.',
      'TextType 30: A different abstract.',
      ONIX_COLLATERAL_OMIT,
    ]);

    const options = choice.resolution.kind === 'CHOICE' ? choice.resolution.options : [];
    const second = resolveWork(reduced, { [choice.key]: options[1].key });

    expect(second.pendingFindingKeys).toEqual([]);
    expect(second.abstracts.map(({ content, textTypes }) => [content, textTypes])).toEqual([
      ['A different abstract.', ['30']],
    ]);
    expect(resolveWork(reduced, { [choice.key]: ONIX_COLLATERAL_OMIT }).abstracts).toEqual([]);
  });

  it('never takes the first of repeated same-type texts either (rule 37)', () => {
    const reduced = reduce([
      product({ collateral: textContent('02', 'One summary.') + textContent('02', 'Another.') }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.abstracts).toEqual([]);
    expect(pendingCodes(reduced, resolved)).toEqual(['COLLATERAL_ABSTRACT_CHOICE_REQUIRED']);
  });

  it('keeps abstracts in different locales apart, and makes canonical only the one the canonical title’s locale matches (rules 38, 43)', () => {
    const reduced = reduce([
      product({
        languages: ['eng', 'fre'],
        collateral:
          textContent('30', 'In English.', { attributes: ' language="eng"' }) +
          textContent('30', 'En français.', { attributes: ' language="fre"' }),
      }),
    ]);
    const byTitle = resolveWork(reduced, {}, LocaleCode.Fr);

    expect(byTitle.pendingFindingKeys).toEqual([]);
    expect(
      byTitle.abstracts.map(({ localeCode, canonical, canonicalBasis }) => [localeCode, canonical, canonicalBasis]),
    ).toEqual([
      [LocaleCode.En, false, null],
      [LocaleCode.Fr, true, 'TITLE_LOCALE'],
    ]);

    // No canonical title locale among them: the publisher chooses; nothing is taken by document order.
    const undecided = resolveWork(reduced, {}, LocaleCode.De);
    const canonical = findingOf(reduced, undecided, 'COLLATERAL_ABSTRACT_CANONICAL_REQUIRED');

    expect(undecided.abstracts.map(({ canonical: flag }) => flag)).toEqual([false, false]);
    expect(undecided.pendingFindingKeys).toEqual([canonical.key]);

    const chosen = resolveWork(reduced, { [canonical.key]: LocaleCode.En }, LocaleCode.De);

    expect(
      chosen.abstracts.map(({ localeCode, canonical: flag, canonicalBasis }) => [localeCode, flag, canonicalBasis]),
    ).toEqual([
      [LocaleCode.En, true, 'PUBLISHER_CHOICE'],
      [LocaleCode.Fr, false, null],
    ]);
  });

  it('takes an untagged text’s locale from the Product’s one text language, and never defaults to English (rule 39)', () => {
    const french = reduce([product({ languages: ['fre'], collateral: textContent('02', 'Un résumé.') })]);

    expect(resolveWork(french).abstracts.map(({ localeCode }) => localeCode)).toEqual([LocaleCode.Fr]);

    const unknown = reduce([product({ languages: [], collateral: textContent('02', 'No language anywhere.') })]);
    const unanswered = resolveWork(unknown);
    const locale = findingOf(unknown, unanswered, 'COLLATERAL_TEXT_LOCALE_UNRESOLVED');

    expect(unanswered.abstracts).toEqual([]);
    expect(locale.resolution).toEqual({ kind: 'INPUT', input: 'LOCALE' });
    expect(locale.message).toContain('never assumed to be English');
    expect(isOfferedOnixCollateralAnswer(locale, 'not-a-locale')).toBe(false);
    expect(resolveWork(unknown, { [locale.key]: 'not-a-locale' }).pendingFindingKeys).toEqual([locale.key]);
    expect(resolveWork(unknown, { [locale.key]: LocaleCode.De }).abstracts.map(({ localeCode }) => localeCode)).toEqual(
      [LocaleCode.De],
    );

    // Two text languages: a choice between them, never the first.
    const bilingual = reduce([product({ languages: ['eng', 'fre'], collateral: textContent('02', 'Untagged.') })]);
    const choice = findingOf(bilingual, resolveWork(bilingual), 'COLLATERAL_TEXT_LOCALE_UNRESOLVED');

    expect(choice.resolution).toEqual({
      kind: 'CHOICE',
      options: [
        { key: LocaleCode.En, label: LocaleCode.En },
        { key: LocaleCode.Fr, label: LocaleCode.Fr },
      ],
    });
  });

  it('asks for the locale of a text whose own language has no Thoth locale', () => {
    const reduced = reduce([product({ collateral: textContent('02', 'Latin.', { attributes: ' language="lat"' }) })]);
    const locale = findingOf(reduced, resolveWork(reduced), 'COLLATERAL_TEXT_LOCALE_UNRESOLVED');

    expect(locale).toMatchObject({ detail: { language: 'lat' }, resolution: { kind: 'INPUT', input: 'LOCALE' } });
  });

  it('prefers the text stated for everyone, and discloses targeted variants rather than dropping them silently (rules 18, 20)', () => {
    const reduced = reduce([
      product({
        collateral: textContent('30', 'For everyone.') + textContent('30', 'For librarians.', { audiences: ['04'] }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.pendingFindingKeys).toEqual([]);
    expect(resolved.abstracts.map(({ content }) => content)).toEqual(['For everyone.']);
    expect(findingOf(reduced, resolved, 'COLLATERAL_TEXT_TARGETED_NOT_IMPORTED')).toMatchObject({
      blocking: false,
      locations: [expect.objectContaining({ path: `${COLLATERAL()}/TextContent[2]/Text[1]` })],
    });
  });

  it('never broadens targeted-only or search-index text into a public abstract by itself (rules 16-19)', () => {
    const reduced = reduce([
      product({ collateral: textContent('30', 'Keywords for an index.', { audiences: ['09'] }) }),
    ]);
    const unanswered = resolveWork(reduced);
    const choice = findingOf(reduced, unanswered, 'COLLATERAL_ABSTRACT_CHOICE_REQUIRED');

    expect(unanswered.abstracts).toEqual([]);
    expect(choice.detail.audience).toBe('TARGETED_ONLY');
    expect(choice.message).toContain('09 is a search engine index, not text for display');

    const options = choice.resolution.kind === 'CHOICE' ? choice.resolution.options : [];

    expect(resolveWork(reduced, { [choice.key]: options[0].key }).abstracts.map(({ content }) => content)).toEqual([
      'Keywords for an index.',
    ]);
  });

  it('never imports restricted text into a public field, and never repeats it in the plan (rules 13-15)', () => {
    const reduced = reduce([
      product({ collateral: textContent('30', 'Confidential terms of trade.', { audiences: ['00', '01'] }) }),
    ]);
    const resolved = resolveWork(reduced);
    const restricted = findingOf(reduced, resolved, 'COLLATERAL_TEXT_RESTRICTED');

    expect(resolved.abstracts).toEqual([]);
    expect(restricted).toMatchObject({ blocking: false, classification: 'TARGET_UNREPRESENTABLE' });
    expect(JSON.stringify(reduced.plan)).not.toContain('Confidential terms of trade.');
    expect(productOf(reduced).textContents[0]).toMatchObject({
      redacted: true,
      texts: [expect.objectContaining({ text: null })],
    });
  });

  it.each(['14', '15', '24', '27', '28'])(
    'never imports text whose date of role %s controls its use, whatever the day it is planned (rules 22-25)',
    (role) => {
      const reduced = reduce([
        product({ collateral: textContent('30', 'Embargoed.', { after: contentDate(role, '20990101') }) }),
      ]);
      const resolved = resolveWork(reduced);

      expect(resolved.abstracts).toEqual([]);
      expect(findingOf(reduced, resolved, 'COLLATERAL_TEXT_TEMPORAL_CONTROL').detail.roles).toEqual([role]);
    },
  );

  it('discloses what an imported abstract cannot keep: its source, its dates and its further audiences (rules 44, 151)', () => {
    const reduced = reduce([
      product({
        collateral: textContent('30', 'Attributed.', {
          audiences: ['00', '04'],
          after: `<TextAuthor>An Author</TextAuthor><SourceTitle>A Source</SourceTitle>${contentDate('01', '20240101')}`,
        }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.abstracts.map(({ content }) => content)).toEqual(['Attributed.']);
    expect(findingOf(reduced, resolved, 'COLLATERAL_TEXT_DETAIL_NOT_IMPORTED').detail.losses).toEqual([
      'its further audiences (List 154 04)',
      'its source (TextAuthor, SourceTitle)',
      'its dates (List 155 01)',
    ]);
    // The source is never appended to the text (rule 152).
    expect(resolved.abstracts[0].content).toBe('Attributed.');
  });
});

describe('TextContent markup, as the approved text policy reads it (rule 40)', () => {
  const abstractOf = (body: string, attributes = '') => {
    const reduced = reduce([product({ collateral: textContent('30', body, { attributes }) })]);

    return { reduced, resolved: resolveWork(reduced) };
  };

  it.each([
    ['plain text stays plain', 'Plain prose.', '', 'Plain prose.', MarkupFormat.PlainText],
    [
      'declared HTML is HTML',
      '&lt;p&gt;An &lt;em&gt;HTML&lt;/em&gt; abstract.&lt;/p&gt;',
      ' textformat="02"',
      '<p>An <em>HTML</em> abstract.</p>',
      MarkupFormat.Html,
    ],
    [
      'Thoth JATS under 03 is JATS',
      '&lt;p&gt;A &lt;italic&gt;JATS&lt;/italic&gt; one.&lt;/p&gt;',
      ' textformat="03"',
      '<p>A <italic>JATS</italic> one.</p>',
      MarkupFormat.JatsXml,
    ],
    [
      'a tagless declared-HTML abstract collapses its source wrapping',
      'Wrapped\n   across lines.',
      ' textformat="02"',
      'Wrapped across lines.',
      MarkupFormat.PlainText,
    ],
    ['blank-line paragraphs of plain text stay', 'One.\n\nTwo.', '', 'One.\n\nTwo.', MarkupFormat.PlainText],
  ])('%s', (_name, body, attributes, content, markupFormat) => {
    const { resolved } = abstractOf(body, attributes);

    expect(resolved.abstracts.map((row) => [row.content, row.markupFormat])).toEqual([[content, markupFormat]]);
  });

  it.each([
    ['a single plain-text line break', 'One line\nand another.', '', 'LINE_BREAK'],
    [
      'markup the XML declaration says is JATS but is not',
      '&lt;p&gt;&lt;foo&gt;x&lt;/foo&gt;&lt;/p&gt;',
      ' textformat="03"',
      'FORMAT',
    ],
    ['markup nothing classifies', '&lt;blink&gt;x&lt;/blink&gt;', '', 'FORMAT'],
    ['XHTML elements whose order the adapter loses', '<p>Held as elements.</p>', ' textformat="05"', 'STRUCTURE'],
  ])('never imports %s, which only the publisher’s acknowledgement omits', (_name, body, attributes, reason) => {
    const { reduced, resolved } = abstractOf(body, attributes);
    const unrepresentable = findingOf(reduced, resolved, 'COLLATERAL_TEXT_UNREPRESENTABLE');

    expect(resolved.abstracts).toEqual([]);
    expect(unrepresentable).toMatchObject({
      blocking: true,
      detail: expect.objectContaining({ reason }),
      resolution: { kind: 'ACKNOWLEDGE' },
    });
    expect(resolved.pendingFindingKeys).toEqual([unrepresentable.key]);

    const acknowledged = resolveWork(reduced, { [unrepresentable.key]: ONIX_COLLATERAL_ACKNOWLEDGED });

    expect(acknowledged.pendingFindingKeys).toEqual([]);
    expect(acknowledged.abstracts).toEqual([]);
  });

  // The text-policy cases the adapter's former first-wins abstract reader was held to, exactly as it was (thoth-app#85, #99,
  // #100, #101), now held by the canonical collateral reduction for every text and every target.
  it.each([
    [
      'keeps a declared-HTML abstract as HTML rather than reading its tags as JATS (the Arc failure)',
      '&lt;p&gt;The &lt;em&gt;A Companion to the Cavendishes&lt;/em&gt; volume.&lt;/p&gt;',
      ' textformat="02"',
      '<p>The <em>A Companion to the Cavendishes</em> volume.</p>',
      MarkupFormat.Html,
    ],
    [
      'sends a declared-HTML abstract with no tags as plain text',
      'A plain description',
      ' textformat="02"',
      'A plain description',
      MarkupFormat.PlainText,
    ],
    [
      'keeps a declared-XML abstract in the Thoth JATS subset as JATS',
      '&lt;p&gt;The &lt;italic&gt;book&lt;/italic&gt;.&lt;/p&gt;',
      ' textformat="03"',
      '<p>The <italic>book</italic>.</p>',
      MarkupFormat.JatsXml,
    ],
    [
      'keeps a plain declared-plain abstract plain',
      'Plain description',
      ' textformat="06"',
      'Plain description',
      MarkupFormat.PlainText,
    ],
    [
      'routes a plain-text declaration that really contains HTML through HTML, not JATS',
      '&lt;p&gt;The &lt;em&gt;book&lt;/em&gt;.&lt;/p&gt;',
      ' textformat="06"',
      '<p>The <em>book</em>.</p>',
      MarkupFormat.Html,
    ],
    [
      'removes an Arc empty spacer paragraph and keeps the abstract as HTML',
      '&lt;p&gt;This book examines the Baltic crusades.&lt;/p&gt;&lt;p style="text-align:justify;"&gt;&lt;br&gt;&lt;/p&gt;',
      ' textformat="02"',
      '<p>This book examines the Baltic crusades.</p>',
      MarkupFormat.Html,
    ],
    [
      'normalises meaningful HTML line breaks into paragraphs',
      '&lt;p&gt;Hello&lt;br&gt;world&lt;/p&gt;',
      ' textformat="02"',
      '<p>Hello</p><p>world</p>',
      MarkupFormat.Html,
    ],
    [
      'keeps a contradictory textformat="06" abstract on the HTML path after removing its spacer',
      '&lt;p&gt;&lt;I&gt;Something&lt;/I&gt;&lt;/p&gt;&lt;p&gt;&lt;br&gt;&lt;/p&gt;',
      ' textformat="06"',
      '<p><I>Something</I></p>',
      MarkupFormat.Html,
    ],
    [
      'collapses the source-line wrapping of a tagless declared-HTML abstract (Arc 9781942401353)',
      'In this unique collection the authors present a\nwide range of interdisciplinary methods.',
      ' textformat="02"',
      'In this unique collection the authors present a wide range of interdisciplinary methods.',
      MarkupFormat.PlainText,
    ],
    [
      'collapses a tagless declared-XHTML (05) abstract the same way',
      'Hello\nworld',
      ' textformat="05"',
      'Hello world',
      MarkupFormat.PlainText,
    ],
    [
      'keeps blank-line paragraph separation in a plain-text abstract',
      'Paragraph one.\n\nParagraph two.',
      ' textformat="06"',
      'Paragraph one.\n\nParagraph two.',
      MarkupFormat.PlainText,
    ],
  ])('%s', (_name, body, attributes, content, markupFormat) => {
    const { resolved } = abstractOf(body, attributes);

    expect(resolved.pendingFindingKeys).toEqual([]);
    expect(resolved.abstracts.map((row) => [row.content, row.markupFormat])).toEqual([[content, markupFormat]]);
  });

  it.each([
    ['malformed HTML', '&lt;p&gt;&lt;em&gt;one&lt;br&gt;two&lt;/strong&gt;&lt;/p&gt;', ' textformat="02"', 'STRUCTURE'],
    ['a declared plain-text single line break', 'Hello\nworld', ' textformat="06"', 'LINE_BREAK'],
    ['an undeclared single line break, conservatively', 'Hello\nworld', '', 'LINE_BREAK'],
    ['non-JATS markup declared XML', '&lt;p&gt;The &lt;em&gt;book&lt;/em&gt;.&lt;/p&gt;', ' textformat="03"', 'FORMAT'],
    [
      'markup that cannot be classified at all',
      'A &lt;blink&gt;bad&lt;/blink&gt; description',
      ' textformat="06"',
      'FORMAT',
    ],
  ])(
    'holds %s for the publisher’s acknowledgement, never sending it to fail mid-import',
    (_name, body, attributes, reason) => {
      const { reduced, resolved } = abstractOf(body, attributes);
      const unrepresentable = findingOf(reduced, resolved, 'COLLATERAL_TEXT_UNREPRESENTABLE');

      expect(unrepresentable.detail.reason).toBe(reason);
      expect(resolved.pendingFindingKeys).toEqual([unrepresentable.key]);
      // The backend's own wording is never what the publisher reads.
      expect(unrepresentable.message).not.toContain('nested block elements');
    },
  );

  it('omits an abstract that is nothing but spacer markup, and creates nothing in its place', () => {
    const { reduced, resolved } = abstractOf('&lt;p&gt;&lt;br&gt;&lt;/p&gt;', ' textformat="02"');

    expect(resolved.abstracts).toEqual([]);
    expect(resolved.pendingFindingKeys).toEqual([]);
    expect(findingOf(reduced, resolved, 'COLLATERAL_TEXT_EMPTY').blocking).toBe(false);
  });

  it('resolves the short and long abstract formats, and locales, independently, each from its own Text', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('02', 'A plain short description', { attributes: ' textformat="06" language="eng"' }) +
          textContent('03', '&lt;p&gt;Une &lt;em&gt;description&lt;/em&gt; longue&lt;/p&gt;', {
            attributes: ' textformat="02" language="fre"',
          }),
      }),
    ]);

    expect(
      resolveWork(reduced).abstracts.map(({ type, content, markupFormat, localeCode }) => [
        type,
        content,
        markupFormat,
        localeCode,
      ]),
    ).toEqual([
      [AbstractType.Short, 'A plain short description', MarkupFormat.PlainText, LocaleCode.En],
      [AbstractType.Long, '<p>Une <em>description</em> longue</p>', MarkupFormat.Html, LocaleCode.Fr],
    ]);
  });

  it('takes Thoth’s own untagged abstracts’ locale from the Product’s language of text, and never English by default', () => {
    const spanish = reduce([
      product({
        languages: ['spa'],
        collateral:
          textContent('02', 'Una descripción breve.', { attributes: ' textformat="03"' }) +
          textContent('03', 'Una descripción larga.', { attributes: ' textformat="03"' }),
      }),
    ]);
    const unmappable = reduce([product({ languages: ['nor'], collateral: textContent('02', 'Short.') })]);

    expect(resolveWork(spanish).abstracts.map(({ localeCode }) => localeCode)).toEqual([LocaleCode.Es, LocaleCode.Es]);
    expect(resolveWork(unmappable).abstracts).toEqual([]);
    expect(pendingCodes(unmappable, resolveWork(unmappable))).toEqual(['COLLATERAL_TEXT_LOCALE_UNRESOLVED']);
  });

  it('never creates an empty abstract, and synthesises no text for an empty one', () => {
    const { reduced, resolved } = abstractOf('');

    expect(resolved.abstracts).toEqual([]);
    expect(findingOf(reduced, resolved, 'COLLATERAL_TEXT_EMPTY').blocking).toBe(false);
  });
});

describe('TextContent -> table of contents and general note (rules 48-69)', () => {
  it('imports an inline table of contents (04) as the Work’s, as the plain text Thoth keeps it (rule 48)', () => {
    const reduced = reduce([product({ collateral: textContent('04', '1. Chapter one\n2. Chapter two') })]);
    const resolved = resolveWork(reduced);

    expect(resolved.pendingFindingKeys).toEqual([]);
    expect(resolved.tableOfContents).toMatchObject({ content: '1. Chapter one\n2. Chapter two', textTypes: ['04'] });
  });

  it('never flattens a table of contents supplied as a file (158/25) into Work.toc: it stays a resource candidate (rule 129)', () => {
    const reduced = reduce([
      product({
        collateral: resource('25', { modes: ['04'], versions: [version({ links: ['https://example.org/toc.pdf'] })] }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.tableOfContents).toBeNull();
    expect(resolved.resources.map(({ target }) => [target.title, target.resourceType, target.url])).toEqual([
      ['Table of contents', ResourceType.Document, 'https://example.org/toc.pdf'],
    ]);
  });

  it.each([
    ['HTML', ' textformat="02"'],
    ['XHTML', ' textformat="05"'],
  ])(
    'reads a tag-free table of contents declared %s by HTML whitespace rules, and one declared nothing as given',
    (_, attributes) => {
      const declared = reduce([product({ collateral: textContent('04', '1. One\n   2. Two', { attributes }) })]);
      const undeclared = reduce([product({ collateral: textContent('04', '1. One\n   2. Two') })]);

      expect(resolveWork(declared).tableOfContents?.content).toBe('1. One 2. Two');
      expect(resolveWork(undeclared).tableOfContents?.content).toBe('1. One\n   2. Two');
    },
  );

  it('asks which of distinct tables of contents the one Work.toc takes, never joining them (rule 50)', () => {
    const reduced = reduce([
      product({ collateral: textContent('04', 'Contents A') + textContent('04', 'Contents B') }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.tableOfContents).toBeNull();
    expect(pendingCodes(reduced, resolved)).toEqual(['COLLATERAL_TOC_CHOICE_REQUIRED']);
  });

  it('never holds markup in a plain field: an HTML table of contents is omitted only by acknowledgement', () => {
    const reduced = reduce([
      product({
        collateral: textContent('04', '&lt;ol&gt;&lt;li&gt;One&lt;/li&gt;&lt;/ol&gt;', {
          attributes: ' textformat="02"',
        }),
      }),
    ]);
    const unrepresentable = findingOf(reduced, resolveWork(reduced), 'COLLATERAL_TEXT_UNREPRESENTABLE');

    expect(unrepresentable.detail.reason).toBe('MARKUP_IN_PLAIN_FIELD');
  });

  it('imports one publisher’s notice (13) as the general note, and discloses the role it loses (rules 53, 55)', () => {
    const reduced = reduce([product({ collateral: textContent('13', 'A publisher’s notice.') })]);
    const resolved = resolveWork(reduced);

    expect(resolved.generalNote).toMatchObject({ content: 'A publisher’s notice.', textTypes: ['13'] });
    expect(findingOf(reduced, resolved, 'COLLATERAL_TEXT_DETAIL_NOT_IMPORTED').detail.losses).toEqual([
      "its role as a publisher's notice (List 153 13), which a general note does not keep",
    ]);
  });

  it('never concatenates several notices: the publisher chooses one or none (rule 54)', () => {
    const reduced = reduce([
      product({ collateral: textContent('13', 'Notice one.') + textContent('13', 'Notice two.') }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.generalNote).toBeNull();
    expect(pendingCodes(reduced, resolved)).toEqual(['COLLATERAL_GENERAL_NOTE_CHOICE_REQUIRED']);
  });

  it.each([
    ['20', 'OPEN_ACCESS_STATEMENT'],
    ['12', 'ALL_CONTRIBUTORS_BIOGRAPHY'],
    ['29', 'BIBLIOGRAPHY'],
    ['34', 'IMPRINT_OR_PUBLISHER_DESCRIPTION'],
    ['17', 'COLLECTION_DESCRIPTION'],
    ['24', 'SCHEMA_ORG_SNIPPET'],
    ['05', 'NO_TARGET'],
  ])('discloses TextType %s as %s, and never moves it into another Work field (rules 56-69)', (type, reason) => {
    const reduced = reduce([product({ collateral: textContent(type, 'Some text.') })]);
    const resolved = resolveWork(reduced);
    const unrepresented = findingOf(reduced, resolved, 'COLLATERAL_TEXT_ROLE_UNREPRESENTED');

    expect(unrepresented).toMatchObject({ blocking: false, detail: expect.objectContaining({ reason }) });
    expect(resolved.abstracts).toEqual([]);
    expect(resolved.tableOfContents).toBeNull();
    expect(resolved.generalNote).toBeNull();
    expect(resolved.pendingFindingKeys).toEqual([]);
  });

  it('never repeats sender-defined text (01), which is not for general distribution', () => {
    const reduced = reduce([product({ collateral: textContent('01', 'Internal only.') })]);

    expect(JSON.stringify(reduced.plan)).not.toContain('Internal only.');
  });
});

describe('SupportingResource -> AdditionalResource (rules 81-140)', () => {
  const candidatesOf = (reduced: Reduced) => reduced.plan.workResourceCandidates[reduced.sourcePlan.groups[0].groupKey];

  it('plans a linkable, unrestricted, eligible resource by itself, deferred to #187, titled from its List 158 role', () => {
    const reduced = reduce([
      product({
        collateral: resource('15', { modes: ['04'], versions: [version({ links: ['https://example.org/sample'] })] }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.resources).toEqual([
      expect.objectContaining({
        target: {
          title: 'Sample content',
          description: null,
          attribution: null,
          resourceType: ResourceType.Document,
          url: 'https://example.org/sample',
          date: null,
        },
        resourceOrdinal: 1,
        basis: 'AUTOMATIC',
        action: 'EXECUTION_DEFERRED',
      }),
    ]);
    // Every planned AdditionalResource waits on #187: the plan is never made executable by leaving it out.
    expect(pendingCodes(reduced, resolved)).toEqual(['COLLATERAL_RESOURCE_EXECUTION_DEFERRED']);
    expect(findingOf(reduced, resolved, 'COLLATERAL_RESOURCE_EXECUTION_DEFERRED').classification).toBe(
      'EXECUTION_DEFERRED',
    );
  });

  it.each([
    ['02', 'DOWNLOADABLE_FILE'],
    ['03', 'EMBEDDABLE_APPLICATION'],
  ])('keeps form %s distinct: an AdditionalResource only by the publisher’s decision (rules 81-88)', (form, reason) => {
    const reduced = reduce([product({ collateral: resource('15', { modes: ['04'], versions: [version({ form })] }) })]);
    const [candidate] = candidatesOf(reduced);
    const unanswered = resolveWork(reduced);

    expect(candidate.reasons).toEqual([reason]);
    expect(unanswered.resources).toEqual([]);
    expect(pendingCodes(reduced, unanswered)).toEqual(['COLLATERAL_RESOURCE_DECISION_REQUIRED']);

    const projected = resolveWork(reduced, { [candidate.decisionFindingKey as string]: ONIX_COLLATERAL_PROJECT });

    expect(projected.resources.map(({ basis, target }) => [basis, target.url])).toEqual([
      ['PUBLISHER_DECISION', 'https://example.org/resource'],
    ]);
    expect(resolveWork(reduced, { [candidate.decisionFindingKey as string]: ONIX_COLLATERAL_OMIT }).resources).toEqual(
      [],
    );
  });

  it('never projects a resource whose form no link stands for, or whose link Thoth cannot store (rule 89)', () => {
    const reduced = reduce([
      product({
        collateral:
          resource('15', { versions: [version({ form: '09' })] }) +
          resource('19', { versions: [version({ links: ['sample.pdf'] })] }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.resources).toEqual([]);
    expect(
      findingsOf(reduced, resolved)
        .filter(({ code }) => code === 'COLLATERAL_RESOURCE_EXCLUDED')
        .map(({ detail }) => detail.reasons),
    ).toEqual([['FORM_UNSUPPORTED'], ['URL_UNSTORABLE']]);
  });

  it('never reads a resource type from a link’s extension: only its mode, role and form (rules 8-9, 113-120)', () => {
    const reduced = reduce([
      product({
        collateral:
          resource('49', { modes: ['03'], versions: [version({ links: ['https://example.org/looks-like.mp4'] })] }) +
          resource('26', { modes: ['05'], versions: [version({ links: ['https://example.org/looks-like.jpg'] })] }) +
          resource('21', { modes: ['04'], versions: [version({ links: ['https://example.org/feature.mp3'] })] }) +
          resource('14', { modes: ['06'], versions: [version({ links: ['https://example.org/schedule.ics'] })] }),
      }),
    ]);

    expect(resolveWork(reduced).resources.map(({ target }) => [target.url, target.resourceType])).toEqual([
      ['https://example.org/looks-like.mp4', ResourceType.Image],
      ['https://example.org/looks-like.jpg', ResourceType.Video],
      ['https://example.org/feature.mp3', ResourceType.Article],
      ['https://example.org/schedule.ics', ResourceType.Website],
    ]);
  });

  it('types an application or a non-linkable multi-mode resource Other only by the publisher’s decision (rule 119)', () => {
    const reduced = reduce([
      product({
        collateral:
          resource('39', { modes: ['01'], versions: [version({ links: ['https://example.org/app.pdf'] })] }) +
          resource('39', {
            modes: ['06'],
            versions: [version({ form: '02', links: ['https://example.org/pack.zip'] })],
          }),
      }),
    ]);
    const candidates = candidatesOf(reduced);

    expect(candidates.map(({ reasons, target }) => [target.resourceType, reasons])).toEqual([
      [null, ['TYPE_UNRESOLVED']],
      [null, ['DOWNLOADABLE_FILE', 'TYPE_UNRESOLVED']],
    ]);
    expect(resolveWork(reduced).resources).toEqual([]);

    const projected = resolveWork(
      reduced,
      Object.fromEntries(
        candidates.map(({ decisionFindingKey }) => [decisionFindingKey as string, ONIX_COLLATERAL_PROJECT]),
      ),
    );

    expect(projected.resources.map(({ target }) => target.resourceType)).toEqual([
      ResourceType.Other,
      ResourceType.Other,
    ]);
  });

  describe('trailers (List 158 26; 5568781349 amendment of 5541009506 rule 7)', () => {
    it.each([
      [['05'], ResourceType.Video],
      [['02'], ResourceType.Audio],
    ])('projects a trailer of mode %j as %s', (modes, type) => {
      const reduced = reduce([product({ collateral: resource('26', { modes }) })]);

      expect(resolveWork(reduced).resources.map(({ target }) => [target.title, target.resourceType])).toEqual([
        ['Trailer', type],
      ]);
    });

    it.each([
      [['06'], '02', null],
      [['05', '02'], '01', null],
      [['04'], '01', ResourceType.Document],
      [['03'], '01', ResourceType.Image],
    ])('never labels a trailer of modes %j (form %s) Video by default', (modes, form, type) => {
      const reduced = reduce([product({ collateral: resource('26', { modes, versions: [version({ form })] }) })]);
      const [candidate] = candidatesOf(reduced);

      expect(candidate.target.resourceType).toBe(type);
      expect(candidate.target.resourceType).not.toBe(ResourceType.Video);
    });

    it('never makes a FeaturedVideo from a trailer: however many there are, each is an ordinary resource (rules 9-13)', () => {
      const reduced = reduce([
        product({
          collateral:
            resource('26', { modes: ['05'], versions: [version({ links: ['https://example.org/first'] })] }) +
            resource('26', { modes: ['05'], versions: [version({ links: ['https://example.org/second'] })] }),
        }),
      ]);
      const resolved = resolveWork(reduced);

      expect(resolved.resources.map(({ resourceOrdinal, target }) => [resourceOrdinal, target.url])).toEqual([
        [1, 'https://example.org/first'],
        [2, 'https://example.org/second'],
      ]);
      expect(JSON.stringify(resolved)).not.toMatch(/featured/i);
    });
  });

  it('maps only an exact publication or broadcast day to AdditionalResource.date (rules 27-31)', () => {
    const reduced = reduce([
      product({
        collateral:
          resource('26', {
            modes: ['05'],
            versions: [version({ links: ['https://example.org/a'], dates: contentDate('01', '20240315') })],
          }) +
          resource('26', {
            modes: ['05'],
            versions: [version({ links: ['https://example.org/b'], dates: contentDate('04', '20240316') })],
          }) +
          resource('26', {
            modes: ['05'],
            versions: [
              version({
                links: ['https://example.org/c'],
                dates: contentDate('01', '20240315') + contentDate('04', '20240316'),
              }),
            ],
          }) +
          resource('26', {
            modes: ['05'],
            versions: [version({ links: ['https://example.org/d'], dates: contentDate('01', '202403', '01') })],
          }) +
          resource('26', {
            modes: ['05'],
            versions: [version({ links: ['https://example.org/e'], dates: contentDate('17', '20240317') })],
          }) +
          // Publication and broadcast on the same day are still two roles competing for one date.
          resource('26', {
            modes: ['05'],
            versions: [
              version({
                links: ['https://example.org/f'],
                dates: contentDate('01', '20240315') + contentDate('04', '20240315'),
              }),
            ],
          }),
      }),
    ]);
    const candidates = candidatesOf(reduced);

    expect(candidates.map(({ target }) => [target.url, target.date])).toEqual([
      ['https://example.org/a', '2024-03-15'],
      ['https://example.org/b', '2024-03-16'],
      ['https://example.org/c', null],
      ['https://example.org/d', null],
      ['https://example.org/e', null],
      ['https://example.org/f', null],
    ]);
    expect(candidates[2].losses).toContain(
      'its dates (List 155 01, 04), none of which is exactly one publication or broadcast day the AdditionalResource date can take',
    );
    expect(candidates[4].losses).toContain('its dates (List 155 17)');
  });

  it('never collapses availability, embargo or use windows into the date: such a version is not projected (rules 22-26)', () => {
    const reduced = reduce([
      product({
        collateral: resource('26', { modes: ['05'], versions: [version({ dates: contentDate('27', '20240101') })] }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.resources).toEqual([]);
    expect(findingOf(reduced, resolved, 'COLLATERAL_RESOURCE_EXCLUDED').detail.reasons).toEqual(['TEMPORAL_CONTROL']);
  });

  it('keeps a required credit as the attribution, and never projects a resource whose credit it cannot keep (rule 121)', () => {
    const reduced = reduce([
      product({
        collateral:
          resource('04', {
            features: feature('01', ['Photo: A. Photographer']),
            versions: [version({ links: ['https://example.org/one'] })],
          }) +
          resource('04', {
            features: feature('01', ['Credit one', 'Credit two']),
            versions: [version({ links: ['https://example.org/two'] })],
          }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.resources.map(({ target }) => [target.url, target.attribution])).toEqual([
      ['https://example.org/one', 'Photo: A. Photographer'],
    ]);
    expect(findingOf(reduced, resolved, 'COLLATERAL_RESOURCE_EXCLUDED').detail.reasons).toEqual([
      'CREDIT_UNREPRESENTABLE',
    ]);
  });

  it('keeps unsupported features, version details and contributor links as explicit losses, never as Thoth relations (rules 104, 123-126)', () => {
    const reduced = reduce([
      product({
        collateral: resource('04', {
          features:
            feature('03', ['© A Holder']) + feature('07', ['Alt text']) + feature('11', [], '0000-0002-1825-0097'),
          versions: [version({ features: versionFeature('01', 'D502') + versionFeature('06', 'abc') })],
        }),
      }),
    ]);
    const [candidate] = candidatesOf(reduced);

    expect(candidate.losses).toEqual([
      'its role (List 158 04, Contributor picture), which the AdditionalResource keeps only as its title',
      'its form (a linkable resource)',
      'its copyright holder, which is never the Work copyright holder',
      'its alternative text',
      'its ORCID of a contributor, which creates no Thoth contributor relation',
      'its file details (List 162 01, 06)',
    ]);
    expect(candidate.target.attribution).toBeNull();
    expect(JSON.stringify(reduced.plan.workResourceCandidates)).not.toContain('copyrightHolder');
  });

  it('never describes a resource by a caption holding elements, nor by the text around them', () => {
    const reduced = reduce([
      product({
        collateral: resource('49', { modes: ['03'], features: feature('02', ['The author <b>at work</b>']) }),
      }),
    ]);
    const [image] = candidatesOf(reduced);

    expect(image.target.description).toBeNull();
    expect(image.losses).toContain('its caption');
  });

  it('discloses a territory narrower than the world as a loss, and none for the world (5543566392 rule 41)', () => {
    const reduced = reduce([
      product({
        collateral:
          resource('26', {
            modes: ['05'],
            territory: '<Territory><CountriesIncluded>GB IE</CountriesIncluded></Territory>',
            versions: [version({ links: ['https://example.org/gb'] })],
          }) +
          resource('26', {
            modes: ['05'],
            territory: '<Territory><RegionsIncluded>WORLD</RegionsIncluded></Territory>',
            versions: [version({ links: ['https://example.org/world'] })],
          }),
      }),
    ]);
    const [narrow, world] = candidatesOf(reduced);

    expect(narrow.losses.filter((loss) => loss.startsWith('its territory'))).toEqual([
      'its territory (CountriesIncluded GB IE)',
    ]);
    expect(world.losses.filter((loss) => loss.startsWith('its territory'))).toEqual([]);
  });

  it('describes a visual resource by its one plain caption, as a disclosed normalisation (rule 122)', () => {
    const reduced = reduce([
      product({
        collateral:
          resource('49', { modes: ['03'], features: feature('02', ['The author at work']) }) +
          resource('15', {
            modes: ['04'],
            features: feature('02', ['A caption of a document']),
            versions: [version({ links: ['https://example.org/doc'] })],
          }),
      }),
    ]);
    const [image, document] = candidatesOf(reduced);

    expect(image.target.description).toBe('The author at work');
    expect(document.target.description).toBeNull();
    expect(document.losses).toContain('its caption');
  });

  it.each([
    ['05', 'NOT_WORK_SCOPED'],
    ['09', 'NOT_WORK_SCOPED'],
    ['42', 'NOT_WORK_SCOPED'],
    ['99', 'LICENCE'],
    ['17', 'NO_APPROVED_PROJECTION'],
    ['24', 'NO_APPROVED_PROJECTION'],
    ['27', 'NO_APPROVED_PROJECTION'],
  ])(
    'never re-scopes or projects role %s (%s) as a Work AdditionalResource (rules 134, 140)',
    (contentType, reason) => {
      const reduced = reduce([product({ collateral: resource(contentType) })]);
      const resolved = resolveWork(reduced);

      expect(candidatesOf(reduced)).toEqual([]);
      expect(findingOf(reduced, resolved, 'COLLATERAL_RESOURCE_ROLE_UNREPRESENTED')).toMatchObject({
        blocking: false,
        detail: expect.objectContaining({ reason }),
      });
    },
  );

  it('never publishes a digital review copy or product safety contacts, and never repeats their links (rules 138-139)', () => {
    const reduced = reduce([
      product({
        collateral:
          resource('38', { versions: [version({ links: ['https://reviewers.example.org/secret'] })] }) +
          resource('53', { versions: [version({ links: ['https://example.org/safety-contacts'] })] }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(candidatesOf(reduced)).toEqual([]);
    expect(
      findingsOf(reduced, resolved)
        .filter(({ code }) => code === 'COLLATERAL_RESOURCE_ROLE_UNREPRESENTED')
        .map(({ detail }) => detail.reason),
    ).toEqual(['REVIEW_COPY', 'PRODUCT_SAFETY']);
    expect(JSON.stringify(reduced.plan)).not.toContain('reviewers.example.org');
    expect(JSON.stringify(reduced.plan)).not.toContain('safety-contacts');
  });

  it('never makes full content (28) an AdditionalResource: only its acknowledged loss (rules 135-137)', () => {
    const reduced = reduce([
      product({
        collateral: resource('28', {
          modes: ['04'],
          versions: [version({ form: '02', links: ['https://example.org/book.epub'] })],
        }),
      }),
    ]);
    const unanswered = resolveWork(reduced);
    const fullContent = findingOf(reduced, unanswered, 'COLLATERAL_RESOURCE_FULL_CONTENT');

    expect(candidatesOf(reduced)).toEqual([]);
    expect(fullContent).toMatchObject({
      blocking: true,
      classification: 'TARGET_INPUT_REQUIRED',
      resolution: { kind: 'ACKNOWLEDGE' },
    });

    const acknowledged = resolveWork(reduced, { [fullContent.key]: ONIX_COLLATERAL_ACKNOWLEDGED });

    expect(acknowledged.pendingFindingKeys).toEqual([]);
    expect(acknowledged.resources).toEqual([]);
  });

  it('never publishes a restricted resource, and never repeats its links or features (rules 14-15)', () => {
    const reduced = reduce([
      product({
        collateral: resource('15', {
          audiences: ['01'],
          features: feature('01', ['Secret credit']),
          versions: [version({ links: ['https://partners.example.org/only'] })],
        }),
      }),
    ]);

    expect(candidatesOf(reduced)).toEqual([]);
    expect(findingOf(reduced, resolveWork(reduced), 'COLLATERAL_RESOURCE_RESTRICTED').blocking).toBe(false);
    expect(JSON.stringify(reduced.plan)).not.toContain('partners.example.org');
    expect(JSON.stringify(reduced.plan)).not.toContain('Secret credit');
  });

  it('projects targeted-only resources only by the publisher’s decision (rule 19)', () => {
    const reduced = reduce([product({ collateral: resource('15', { audiences: ['02'], modes: ['04'] }) })]);

    expect(candidatesOf(reduced)[0].reasons).toEqual(['AUDIENCE_TARGETED']);
  });

  it('never takes the front cover: the descriptive cover reducer alone decides it (thoth-app#219)', () => {
    const reduced = reduce([
      product({ collateral: resource('01', { versions: [version({ links: ['https://example.org/cover.jpg'] })] }) }),
    ]);
    const resolved = resolveWork(reduced);

    expect(productOf(reduced).resources[0].role).toBe('FRONT_COVER');
    expect(candidatesOf(reduced)).toEqual([]);
    expect(resolved.findingKeys).toEqual([]);
  });
});

describe('scope (rules 153-162; 5541336717 rule 18)', () => {
  it('gives a chapter its own abstract and note, never its Work’s, and never a table of contents or resource', () => {
    const chapter = `${PRODUCT()}/ContentDetail[1]/ContentItem[1]`;
    const reduced = reduce([
      product({
        collateral: textContent('30', 'The Work abstract.'),
        items: [
          contentItem(
            '03',
            textContent('30', 'The chapter abstract.') +
              textContent('13', 'A chapter note.') +
              textContent('04', 'Chapter contents') +
              resource('15', { modes: ['04'] }),
          ),
        ],
      }),
    ]);
    const work = resolveWork(reduced);
    const component = resolveOnixCollateralComponent(
      reduced.plan,
      reduced.sourcePlan.products[0].productKey,
      chapter,
      'CHAPTER',
      {
        canonicalTitleLocale: null,
        describe: 'the chapter',
      },
    );

    expect(work.abstracts.map(({ content }) => content)).toEqual(['The Work abstract.']);
    expect(work.tableOfContents).toBeNull();
    expect(work.resources).toEqual([]);
    expect(component.abstracts.map(({ content }) => content)).toEqual(['The chapter abstract.']);
    expect(component.generalNote?.content).toBe('A chapter note.');
    expect(component.tableOfContents).toBeNull();
    expect(component.resources).toEqual([]);

    const findings = new Map(reduced.plan.findings.map((finding) => [finding.key, finding]));

    expect(component.findingKeys.map((key) => [findings.get(key)?.code, findings.get(key)?.detail.reason])).toEqual([
      ['COLLATERAL_TEXT_DETAIL_NOT_IMPORTED', undefined],
      ['COLLATERAL_TEXT_ROLE_UNREPRESENTED', 'CHAPTER_TABLE_OF_CONTENTS'],
      ['COLLATERAL_RESOURCE_ROLE_UNREPRESENTED', 'CHAPTER'],
    ]);
  });

  it('plans a contained Work’s own resources, and never its parent’s (rule 161)', () => {
    const embedded = `${PRODUCT()}/ContentDetail[1]/ContentItem[1]`;
    const reduced = reduce([
      product({
        items: [
          contentItem(
            '01',
            resource('26', { modes: ['05'], versions: [version({ links: ['https://example.org/embedded'] })] }),
          ),
        ],
      }),
    ]);
    const contained = resolveOnixCollateralComponent(
      reduced.plan,
      reduced.sourcePlan.products[0].productKey,
      embedded,
      'CONTAINED_WORK',
      { canonicalTitleLocale: null, describe: 'the contained Work' },
    );

    expect(resolveWork(reduced).resources).toEqual([]);
    expect(contained.resources.map(({ componentPath, target }) => [componentPath, target.url])).toEqual([
      [embedded, 'https://example.org/embedded'],
    ]);
  });

  it('discloses the collateral of an AVItem with its Work, and never moves it to the Work', () => {
    const reduced = reduce([product({ items: [avItem(textContent('30', 'A clip abstract.'))] })]);
    const resolved = resolveWork(reduced);

    expect(resolved.abstracts).toEqual([]);
    expect(findingOf(reduced, resolved, 'COLLATERAL_COMPONENT_NOT_PLANNED').detail.componentKind).toBe('AV_ITEM');
  });

  it('states what a ContentItem’s collateral is, whatever order it is written in, for grouped comparison', () => {
    const path = `${PRODUCT()}/ContentDetail[1]/ContentItem[1]`;
    const one = reduce([product({ items: [contentItem('03', textContent('30', 'A') + textContent('13', 'B'))] })]);
    const other = reduce([product({ items: [contentItem('03', textContent('13', 'B') + textContent('30', 'A'))] })]);
    const different = reduce([
      product({ items: [contentItem('03', textContent('30', 'C') + textContent('13', 'B'))] }),
    ]);
    const keyOf = (reduced: Reduced) =>
      JSON.stringify(componentCollateralOf(reduced.plan, reduced.sourcePlan.products[0].productKey, path));

    expect(keyOf(one)).toBe(keyOf(other));
    expect(keyOf(one)).not.toBe(keyOf(different));
    expect(componentCollateralOf(undefined, 'none', path)).toBeNull();
  });
});

describe('grouped manifestations (rules 153-158)', () => {
  const grouped = (first: string, second: string) =>
    reduce([
      product({ ref: 'pb', isbn: '9781800000018', form: 'BC', collateral: first, workDoi: '10.1234/work' }),
      product({ ref: 'eb', isbn: '9781800000025', form: 'EB', collateral: second, workDoi: '10.1234/work' }),
    ]);

  it('collapses facts the manifestations state exactly alike, keeping every statement', () => {
    const reduced = grouped(
      textContent('04', 'Contents') + resource('26', { modes: ['05'] }),
      textContent('04', 'Contents') + resource('26', { modes: ['05'] }),
    );

    expect(reduced.sourcePlan.groups).toHaveLength(1);

    const resolved = resolveWork(reduced);

    expect(resolved.tableOfContents?.locations.map(({ path }) => path)).toEqual([
      `${COLLATERAL(1)}/TextContent[1]/Text[1]`,
      `${COLLATERAL(2)}/TextContent[1]/Text[1]`,
    ]);
    expect(resolved.resources).toHaveLength(1);
    expect(resolved.resources[0].locations).toHaveLength(2);
    expect(codesOf(reduced, resolved)).toEqual(
      expect.arrayContaining(['COLLATERAL_TEXT_COLLAPSED', 'COLLATERAL_RESOURCE_COLLAPSED']),
    );
  });

  it('takes the one fact only one manifestation states', () => {
    const reduced = grouped(textContent('13', 'Only in paperback.'), '');

    expect(resolveWork(reduced).generalNote?.content).toBe('Only in paperback.');
  });

  it('asks where manifestations state different values for one target, never by Product order (rule 157)', () => {
    const reduced = grouped(textContent('04', 'Paperback contents'), textContent('04', 'Ebook contents'));
    const resolved = resolveWork(reduced);

    expect(resolved.tableOfContents).toBeNull();
    expect(pendingCodes(reduced, resolved)).toEqual(['COLLATERAL_TOC_CHOICE_REQUIRED']);
  });

  it('keeps different resources of the manifestations apart: an AdditionalResource is repeatable (rule 158)', () => {
    const reduced = grouped(
      resource('26', { modes: ['05'], versions: [version({ links: ['https://example.org/pb'] })] }),
      resource('26', { modes: ['05'], versions: [version({ links: ['https://example.org/eb'] })] }),
    );

    expect(resolveWork(reduced).resources.map(({ target }) => target.url)).toEqual([
      'https://example.org/pb',
      'https://example.org/eb',
    ]);
  });
});

describe('PromotionDetail (5541009506 rules 1-15)', () => {
  const event =
    '<PromotionalEvent><EventType>01</EventType><ContentAudience>00</ContentAudience><EventName>A Launch</EventName>' +
    '<Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>A01</ContributorRole><PersonName>An Event Speaker</PersonName></Contributor>' +
    '<EventOccurrence><OccurrenceDate><OccurrenceDateRole>01</OccurrenceDateRole><Date>20240101</Date></OccurrenceDate><EventStatus>A</EventStatus>' +
    `<CountryCode>GB</CountryCode><LocationName>London</LocationName><VenueName>A Bookshop</VenueName>${resource('26', { modes: ['05'], versions: [version({ links: ['https://example.org/event-trailer'] })] })}</EventOccurrence>` +
    `${resource('37', { versions: [version({ links: ['https://example.org/poster'] })] })}` +
    '<Website><WebsiteLink>https://example.org/launch</WebsiteLink></Website></PromotionalEvent>';

  it('keeps every event whole, never flattened, and never makes its participants or resources the Work’s', () => {
    const reduced = reduce([product({ promotion: event })], { release: '3.1' });
    const resolved = resolveWork(reduced);
    const [fact] = productOf(reduced).events;

    expect(fact).toMatchObject({
      path: `${PRODUCT()}/PromotionDetail[1]/PromotionalEvent[1]`,
      eventTypes: ['01'],
      participants: [
        expect.objectContaining({ path: `${PRODUCT()}/PromotionDetail[1]/PromotionalEvent[1]/Contributor[1]` }),
      ],
    });
    expect(fact.occurrences).toHaveLength(1);
    expect(fact.occurrences[0].resourceFactKeys).toHaveLength(1);
    expect(fact.resourceFactKeys).toHaveLength(1);
    expect(productOf(reduced).resources.map(({ scope }) => scope.kind)).toEqual([
      'PROMOTIONAL_EVENT',
      'PROMOTIONAL_EVENT',
    ]);
    expect(resolved.resources).toEqual([]);
    expect(resolved.abstracts).toEqual([]);
    expect(findingOf(reduced, resolved, 'COLLATERAL_PROMOTIONAL_EVENT_UNREPRESENTABLE')).toMatchObject({
      blocking: false,
      classification: 'TARGET_UNREPRESENTABLE',
      detail: { events: 1, occurrences: 1, participants: 1, resources: 2 },
    });
    expect(JSON.stringify(reduced.plan)).not.toContain('An Event Speaker');
  });
});

describe('answers', () => {
  it('offers exactly the answers a finding names, and binds them to the facts they answer', () => {
    const reduced = reduce([product({ collateral: textContent('02', 'One.') + textContent('02', 'Two.') })]);
    const choice = findingOf(reduced, resolveWork(reduced), 'COLLATERAL_ABSTRACT_CHOICE_REQUIRED');
    const changed = reduce([product({ collateral: textContent('02', 'One.') + textContent('02', 'Three.') })]);

    expect(isOfferedOnixCollateralAnswer(choice, ONIX_COLLATERAL_OMIT)).toBe(true);
    expect(isOfferedOnixCollateralAnswer(choice, 'anything else')).toBe(false);
    expect(isOfferedOnixCollateralAnswer({ resolution: { kind: 'NONE' } }, ONIX_COLLATERAL_ACKNOWLEDGED)).toBe(false);
    expect(isOfferedOnixCollateralAnswer({ resolution: { kind: 'ACKNOWLEDGE' } }, ONIX_COLLATERAL_OMIT)).toBe(false);
    // A changed source asks afresh: the answer to the old question is no answer to the new one.
    expect(findingOf(changed, resolveWork(changed), 'COLLATERAL_ABSTRACT_CHOICE_REQUIRED').key).not.toBe(choice.key);
  });
});

describe('pinned List 158 labels (Issue 74)', () => {
  it('names every role exactly as the pinned codelist does', async () => {
    const { readFileSync } = await import('node:fs');
    const xsd = readFileSync(`${process.cwd()}/public/onix-validation/ONIX_BookProduct_CodeLists.xsd`, 'utf8');
    const list158 = xsd.slice(
      xsd.indexOf('<xs:simpleType name="List158">'),
      xsd.indexOf('<xs:simpleType name="List159">'),
    );
    const documented = Object.fromEntries(
      [
        ...list158.matchAll(
          /<xs:enumeration value="(\d+)">\s*<xs:annotation>\s*<xs:documentation>([^<]*)<\/xs:documentation>/g,
        ),
      ].map(([, code, documentation]) => [code, documentation.trim()]),
    );

    expect(Object.keys(ONIX_LIST_158_LABELS).sort()).toEqual(Object.keys(documented).sort());
    Object.entries(ONIX_LIST_158_LABELS).forEach(([code, label]) =>
      expect(documented[code].startsWith(label)).toBe(true),
    );
  });
});

describe('target adapter parity (5562227566 rules 49, 100, 175)', () => {
  it('carries a Work’s table of contents and cover caption to and from the backend Work', () => {
    const mapper = new WorkDtoMapper();
    const dto = mapper.toDto(getDefaultWork({ id: 'w1', toc: '1. One', coverCaption: 'A caption' }));

    expect(dto).toMatchObject({ toc: '1. One', coverCaption: 'A caption' });
    expect(mapper.toDto(getDefaultWork({ id: 'w1' }))).toMatchObject({ toc: null, coverCaption: null });

    const entity = mapper.toEntity({ ...dto, titles: [], abstracts: [] } as unknown as WorkDto);

    expect(entity).toMatchObject({ toc: '1. One', coverCaption: 'A caption' });
    expect(mapper.toEntity({ ...dto, toc: null, coverCaption: null } as unknown as WorkDto)).toMatchObject({
      toc: '',
      coverCaption: '',
    });
  });

  it('carries an AdditionalResource’s date to and from the backend resource', () => {
    const mapper = new AdditionalResourceDtoMapper();
    const entity = {
      id: 'r1',
      workId: 'w1',
      title: 'Trailer',
      description: '',
      attribution: '',
      resourceType: ResourceType.Video,
      doi: '',
      handle: '',
      url: 'https://example.org/trailer',
      date: '2024-03-15',
      fileUrl: '',
      orderNumber: 1,
    };
    const dto = mapper.toDto(entity);

    expect(dto.date).toBe('2024-03-15');
    expect(mapper.toEntity(dto)).toEqual(entity);
    expect(mapper.toDto({ ...entity, date: undefined }).date).toBeNull();
    expect(mapper.toEntity({ ...dto, date: null }).date).toBeNull();
  });
});

/*
 * The recoverable-empty evidence of 5562227566 rules 9-10, through the real pinned validator and bridge rather than a
 * hand-written marker: a TextContent without its required Text is omitted by canonical validation (OMIT_INVALID_COMPOSITE,
 * #196), the omission stays visible as a warning and in the plan, and the reduction neither synthesises text for it nor
 * lends it a sibling's.
 */
describe('a TextContent canonical validation omits, through the real validator and bridge (OMIT_INVALID_COMPOSITE)', () => {
  const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');
  const validator = createOnixSourceValidator({
    loadResource: async (fileName) => new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName))),
  });
  const translate = (key: string) => key;
  const uploaded = (release: '3.0' | '3.1') => `<?xml version="1.0" encoding="UTF-8"?>
<ONIXMessage release="${release}" xmlns="http://ns.editeur.org/onix/${release}/reference">${HEADER}
<Product><RecordReference>ref-1</RecordReference><NotificationType>03</NotificationType><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781800000018</IDValue></ProductIdentifier>
<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm><TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>A Work</TitleText></TitleElement></TitleDetail><NoContributor/><Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language></DescriptiveDetail>
<CollateralDetail><TextContent><TextType>02</TextType><ContentAudience>00</ContentAudience></TextContent><TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text>The long description, its own.</Text></TextContent></CollateralDetail>
<PublishingDetail><Publisher><PublishingRole>01</PublishingRole><PublisherName>Example Press</PublisherName></Publisher><PublishingStatus>04</PublishingStatus><PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20260901</Date></PublishingDate></PublishingDetail></Product></ONIXMessage>`;

  it.each(['3.0', '3.1'] as const)(
    'records the omission of an empty %s short description, warns of it, and plans only the sibling long description’s own text',
    async (release) => {
      const result = toWorkerResult(await validator.validate(new TextEncoder().encode(uploaded(release))));
      const marker = {
        recovery: 'OMIT_INVALID_COMPOSITE',
        removed: `${COLLATERAL()}/TextContent[1]`,
        taintSite: COLLATERAL(),
      };

      // Canonical validation recovers the source, and only by omitting the empty composite.
      expect(result.normalized?.recoveries).toEqual([marker]);
      expect(permitsTargetPlanning(result)).toBe(true);
      expect(projectOnixSourceIssues(result, translate)).toContainEqual(
        expect.objectContaining({
          severity: 'warning',
          code: 'onix.source.recovered',
          sourceValidation: { kind: 'recovery', recovery: marker },
        }),
      );

      const { adapter, provenance, canonical } = bridgeOnixSource(result);
      const sourcePlan = planOnixSource(adapter, { provenance });
      const descriptive = reduceOnixDescriptive(adapter, sourcePlan, {
        provenance,
        recoveries: canonical.normalized.recoveries,
      });
      const reduced = {
        root: adapter,
        sourcePlan,
        descriptive,
        plan: reduceOnixCollateral(adapter, sourcePlan, {
          provenance,
          recoveries: canonical.normalized.recoveries,
          descriptive,
        }),
      };
      const [node] = sourcePlan.products;
      const resolved = resolveWork(reduced);

      // The plan records the omission by its marker, at the path the file stated it.
      expect(productOf(reduced).omissions).toEqual([
        expect.objectContaining({
          path: marker.removed,
          productKey: node.productKey,
          recovery: 'OMIT_INVALID_COMPOSITE',
          taintSite: COLLATERAL(),
        }),
      ]);
      // Only the surviving TextContent is a fact: nothing stands in for the omitted short description.
      expect(
        productOf(reduced).textContents.map(({ textType, texts }) => [textType, texts.map(({ text }) => text)]),
      ).toEqual([['03', ['The long description, its own.']]]);
      expect(resolved.abstracts.map(({ type, content }) => [type, content])).toEqual([
        [AbstractType.Long, 'The long description, its own.'],
      ]);
      expect(codesOf(reduced, resolved)).not.toContain('COLLATERAL_TEXT_EMPTY');
      expect(resolved.pendingFindingKeys).toEqual([]);
    },
    180_000,
  );
});
