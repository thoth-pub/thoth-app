import { parse } from '@5stones/onix';
import { describe, expect, it } from 'vitest';

import { WorkStatuses, WorkTypes } from '../../constants/work';
import {
  ONIX_COMPONENT_ACKNOWLEDGED,
  ONIX_COMPONENT_OMIT,
  type OnixChapterIntent,
  type OnixComponentFinding,
  type OnixComponentIntent,
  type OnixContainedWorkIntent,
} from '../../types/onixPlanning';
import type { ExtendedONIXMessageRoot } from './interfaces';
import {
  isOfferedOnixComponentAnswer,
  ONIX_CONTAINED_WORK_STATUSES,
  ONIX_CONTAINED_WORK_TYPES,
  reduceOnixComponents,
  resolveOnixComponents,
  type ResolveOnixComponentsOptions,
} from './onixComponents';
import { reduceOnixDescriptive } from './onixDescriptive';
import { planOnixSource } from './onixPlanning';
import type { ProvenanceResolver } from './validation/worker/provenance';

/**
 * The canonical component and contained-Work reduction of thoth-app#223 (REL-01A of #185), driven as the uploader drives
 * it: a real ONIX document parsed by `@5stones/onix`, planned by #182, then reduced and resolved with the publisher's
 * answers. Every fixture is minimal and synthetic, and every path is the canonical Reference path a finding names.
 */

const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';
const REFERENCE_NS_31 = 'http://ns.editeur.org/onix/3.1/reference';
const HEADER =
  '<Header><Sender><SenderName>Example Press</SenderName></Sender><SentDateTime>20260923</SentDateTime></Header>';
const itemPath = (position: number, product = 1) =>
  `/ONIXMessage[1]/Product[${product}]/ContentDetail[1]/ContentItem[${position}]`;

const { BookChapter, BookSet, EditedBook, JournalIssue, Monograph, Textbook } = WorkTypes.enum;
const { Active, Cancelled, Forthcoming, PostponedIndefinitely, Superseded, Withdrawn } = WorkStatuses.enum;

type ItemSpec = {
  /** The LevelSequenceNumber, or none where omitted. */
  readonly lsn?: string;
  /** The TextItemType; ignored for an AVItem. */
  readonly type?: string;
  /** An AVItem of this type instead of a TextItem. */
  readonly av?: string;
  readonly identifiers?: readonly (readonly [type: string, value: string, name?: string])[];
  readonly pageRuns?: readonly (readonly [first: string, last?: string])[];
  readonly pages?: string;
  readonly typeName?: string;
  readonly number?: string;
  readonly title?: string;
  /** Anything else the ContentItem states after its title, as ONIX orders it. */
  readonly extra?: string;
  readonly attributes?: string;
};

const title = (text: string, level = '04') =>
  `<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>${level}</TitleElementLevel><TitleText language="eng">${text}</TitleText></TitleElement></TitleDetail>`;

const item = ({
  lsn,
  type = '03',
  av,
  identifiers = [],
  pageRuns = [],
  pages,
  typeName,
  number,
  title: text = 'A Component',
  extra = '',
  attributes = '',
}: ItemSpec = {}) =>
  `<ContentItem${attributes}>` +
  (lsn === undefined ? '' : `<LevelSequenceNumber>${lsn}</LevelSequenceNumber>`) +
  (av === undefined
    ? `<TextItem><TextItemType>${type}</TextItemType>${identifiers
        .map(
          ([idType, value, name]) =>
            `<TextItemIdentifier><TextItemIDType>${idType}</TextItemIDType>${name ? `<IDTypeName>${name}</IDTypeName>` : ''}<IDValue>${value}</IDValue></TextItemIdentifier>`,
        )
        .join('')}${pageRuns
        .map(
          ([first, last]) =>
            `<PageRun><FirstPageNumber>${first}</FirstPageNumber>${last === undefined ? '' : `<LastPageNumber>${last}</LastPageNumber>`}</PageRun>`,
        )
        .join('')}${pages === undefined ? '' : `<NumberOfPages>${pages}</NumberOfPages>`}</TextItem>`
    : `<AVItem><AVItemType>${av}</AVItemType>${identifiers
        .map(
          ([idType, value]) =>
            `<AVItemIdentifier><AVItemIDType>${idType}</AVItemIDType><IDValue>${value}</IDValue></AVItemIdentifier>`,
        )
        .join('')}</AVItem>`) +
  (typeName === undefined ? '' : `<ComponentTypeName>${typeName}</ComponentTypeName>`) +
  (number === undefined ? '' : `<ComponentNumber>${number}</ComponentNumber>`) +
  title(text) +
  extra +
  '</ContentItem>';

type ProductSpec = {
  readonly ref?: string;
  readonly isbn?: string;
  readonly descriptive?: string;
  readonly publishing?: string;
};

const product = (
  items: readonly string[],
  {
    ref = 'p1',
    isbn = '9781800000018',
    descriptive = '',
    publishing = '<PublishingStatus>04</PublishingStatus><PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20240101</Date></PublishingDate>',
  }: ProductSpec = {},
) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>03</NotificationType>` +
  `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
  `<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>BC</ProductForm>${title('A Work', '01')}${descriptive}</DescriptiveDetail>` +
  (items.length > 0 ? `<ContentDetail>${items.join('')}</ContentDetail>` : '') +
  `<PublishingDetail><Imprint><ImprintName>Example Imprint</ImprintName></Imprint>${publishing}</PublishingDetail></Product>`;

const reduce = (products: readonly string[], release: '3.0' | '3.1' = '3.0', provenance?: ProvenanceResolver) => {
  const root = parse(
    `<ONIXMessage release="${release}" xmlns="${release === '3.0' ? REFERENCE_NS : REFERENCE_NS_31}">${HEADER}${products.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(root, { provenance });

  return {
    root,
    sourcePlan,
    plan: reduceOnixComponents(root, sourcePlan, { provenance }),
    descriptive: reduceOnixDescriptive(root, sourcePlan, { provenance }),
  };
};

type Reduced = ReturnType<typeof reduce>;

/** The planned Work's components with the publisher's answers, as the resolver asks for its first group. */
const resolve = (
  reduced: Reduced,
  choices: Record<string, string> = {},
  overrides: Partial<ResolveOnixComponentsOptions> = {},
) => {
  const [{ groupKey, productKeys }] = reduced.sourcePlan.groups;
  const productKey = productKeys[0];
  const chapters = reduced.plan.products[productKey]?.components.filter(({ kind }) => kind === 'CHAPTER') ?? [];

  return resolveOnixComponents(reduced.plan, {
    groupKey,
    productKey,
    choices,
    parent: { plannedWorkId: 'work-1', imprintId: 'imprint-1' },
    chapterWorkIds: Object.fromEntries(chapters.map(({ path }, index) => [path, `chapter-${index + 1}`])),
    descriptive: reduced.descriptive,
    ...overrides,
  });
};

const componentsOf = (reduced: Reduced, index = 0) =>
  reduced.plan.products[reduced.sourcePlan.products[index].productKey].components;

/** Every finding that applies to the resolution, the source's and the answers', by key. */
const findingsOf = (reduced: Reduced, resolved: ReturnType<typeof resolve>) => {
  const byKey = new Map([...reduced.plan.findings, ...resolved.raised].map((finding) => [finding.key, finding]));

  return resolved.findingKeys.map((key) => byKey.get(key) as OnixComponentFinding);
};

const findingCodes = (reduced: Reduced, resolved: ReturnType<typeof resolve>, pendingOnly = false) =>
  (pendingOnly
    ? resolved.pendingFindingKeys.map(
        (key) =>
          [...reduced.plan.findings, ...resolved.raised].find((finding) => finding.key === key) as OnixComponentFinding,
      )
    : findingsOf(reduced, resolved)
  ).map(({ code }) => code);

const findingOf = (reduced: Reduced, resolved: ReturnType<typeof resolve>, code: OnixComponentFinding['code']) =>
  findingsOf(reduced, resolved).find((finding) => finding.code === code) as OnixComponentFinding;

const intentAt = <K extends OnixComponentIntent['kind']>(
  resolved: ReturnType<typeof resolve>,
  kind: K,
  position = 1,
): Extract<OnixComponentIntent, { kind: K }> =>
  resolved.intents.find((intent) => intent.kind === kind && intent.position === position) as Extract<
    OnixComponentIntent,
    { kind: K }
  >;

const chapterAt = (resolved: ReturnType<typeof resolve>, position = 1) =>
  intentAt(resolved, 'BOOK_CHAPTER', position) as OnixChapterIntent;
const containedAt = (resolved: ReturnType<typeof resolve>, position = 1) =>
  intentAt(resolved, 'CONTAINED_WORK', position) as OnixContainedWorkIntent;

describe('reduceOnixComponents: classification (5541336717 rules 1-4)', () => {
  it.each([
    ['02', 'FRONT', 'front'],
    ['03', 'BODY', 'body'],
    ['04', 'BACK', 'back'],
  ])(
    'plans TextItemType %s as a structural BookChapter and discloses the %s matter Thoth does not record',
    (type, matter, words) => {
      const reduced = reduce([product([item({ lsn: '1', type })])]);
      const resolved = resolve(reduced);
      const chapter = chapterAt(resolved);

      expect(resolved.intents.map(({ kind }) => kind)).toEqual(['BOOK_CHAPTER']);
      expect(chapter).toMatchObject({
        workType: { type: BookChapter, provenance: 'STRUCTURAL_RULE' },
        relation: 'IS_CHILD_OF',
        matter,
        chapterWorkId: 'chapter-1',
        action: 'CREATE_CHAPTER',
      });
      expect(findingOf(reduced, resolved, 'COMPONENT_MATTER_NOT_REPRESENTED')).toMatchObject({
        classification: 'SUPPORTED_NORMALIZED',
        blocking: false,
        resolution: { kind: 'NONE' },
        detail: { textItemType: type, matter },
        locations: [{ path: `${itemPath(1)}/TextItem[1]/TextItemType[1]` }],
      });
      expect(findingOf(reduced, resolved, 'COMPONENT_MATTER_NOT_REPRESENTED').message).toContain(`${words} matter`);
      expect(resolved.pendingFindingKeys).toEqual([]);
    },
  );

  it('plans TextItemType 01 as a contained Work related IsPartOf its parent, never as a chapter', () => {
    const reduced = reduce([product([item({ lsn: '1', type: '01' })])]);
    const resolved = resolve(reduced);

    expect(resolved.intents.map(({ kind }) => kind)).toEqual(['CONTAINED_WORK']);
    expect(resolved.intents.some(({ kind }) => kind === 'BOOK_CHAPTER')).toBe(false);
    expect(containedAt(resolved)).toMatchObject({
      relation: 'IS_PART_OF',
      parent: { groupKey: reduced.sourcePlan.groups[0].groupKey, plannedWorkId: 'work-1' },
      action: 'EXECUTION_DEFERRED',
    });
    // It has its own stable identity: its Product and its canonical path.
    expect(containedAt(resolved).componentKey).toBe(`${reduced.sourcePlan.products[0].productKey}|${itemPath(1)}`);
  });

  it('never makes an AVItem a chapter: it is an acknowledged loss, and the rest of the Work plans as usual', () => {
    const reduced = reduce([
      product([item({ lsn: '1' }), item({ lsn: '2', av: '01', identifiers: [['06', '10.1234/film']] })]),
    ]);
    const unanswered = resolve(reduced);
    const loss = findingOf(reduced, unanswered, 'COMPONENT_AV_ITEM_UNREPRESENTABLE');

    expect(unanswered.intents.map(({ kind }) => kind)).toEqual(['BOOK_CHAPTER', 'AV_ITEM']);
    expect(loss).toMatchObject({
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: true,
      resolution: { kind: 'ACKNOWLEDGE' },
      detail: { avItemType: '01', identifiers: ['06: 10.1234/film'] },
    });
    expect(intentAt(unanswered, 'AV_ITEM', 2).action).toBe('BLOCKED');
    // Its only hold is its own loss: the chapter beside it is planned whatever the AVItem does.
    expect(unanswered.pendingFindingKeys).toEqual([loss.key]);
    expect(chapterAt(unanswered).action).toBe('CREATE_CHAPTER');

    const acknowledged = resolve(reduced, { [loss.key]: ONIX_COMPONENT_ACKNOWLEDGED });

    expect(intentAt(acknowledged, 'AV_ITEM', 2)).toMatchObject({
      action: 'OMIT_WITH_ACKNOWLEDGED_LOSS',
      avItemType: '01',
    });
    expect(acknowledged.pendingFindingKeys).toEqual([]);
    // An AVItem is never given a DOI or pages to plan: it is not planned at all.
    expect(componentsOf(reduced)[1]).toMatchObject({ kind: 'AV_ITEM', doi: { kind: 'NONE' }, descriptivePath: null });
  });

  it.each([
    ['an unrecognised TextItemType', item({ lsn: '1', type: '07' }), '07'],
    ['an empty ContentItem', '<ContentItem/>', ''],
  ])('reinterprets %s as nothing: it is a gap that holds the Work', (_label, content, textItemType) => {
    const reduced = reduce([product([content])]);
    const resolved = resolve(reduced);

    expect(resolved.intents.map(({ kind, action }) => [kind, action])).toEqual([['UNSUPPORTED', 'BLOCKED']]);
    expect(findingCodes(reduced, resolved, true)).toEqual(['COMPONENT_FORM_UNSUPPORTED']);
    expect(findingOf(reduced, resolved, 'COMPONENT_FORM_UNSUPPORTED')).toMatchObject({
      classification: 'PREFLIGHT_GAP',
      resolution: { kind: 'NONE' },
      detail: { textItemType },
    });
  });
});

describe('contained Works (#223 Specification Amendment 1)', () => {
  const embedded = (extra: Partial<ItemSpec> = {}) => reduce([product([item({ lsn: '1', type: '01', ...extra })])]);

  it('starts with no WorkType, offers exactly the five non-chapter types, and never takes the parent or file WorkType', () => {
    const reduced = embedded();
    const resolved = resolve(reduced);
    const question = findingOf(reduced, resolved, 'CONTAINED_WORK_TYPE_REQUIRED');

    expect(containedAt(resolved).workType).toEqual({ status: 'UNRESOLVED', findingKey: question.key });
    expect(question).toMatchObject({ classification: 'TARGET_INPUT_REQUIRED', blocking: true });
    expect(question.resolution).toEqual({
      kind: 'CHOICE',
      options: [Monograph, EditedBook, Textbook, JournalIssue, BookSet].map((type) => ({ key: type, label: type })),
    });
    expect(ONIX_CONTAINED_WORK_TYPES).not.toContain(BookChapter);
    expect(isOfferedOnixComponentAnswer(question, BookChapter)).toBe(false);
    expect(containedAt(resolve(reduced, { [question.key]: BookChapter })).workType.status).toBe('UNRESOLVED');
  });

  it.each([Monograph, EditedBook, Textbook, JournalIssue, BookSet])(
    'takes %s once the publisher chooses it',
    (type) => {
      const reduced = embedded();
      const question = findingOf(reduced, resolve(reduced), 'CONTAINED_WORK_TYPE_REQUIRED');

      expect(containedAt(resolve(reduced, { [question.key]: type })).workType).toEqual({
        status: 'RESOLVED',
        type,
        provenance: 'USER_COMPONENT_CHOICE',
        findingKey: question.key,
      });
    },
  );

  it("plans its parent Work's resolved imprint as an explicit normalisation, and looks up none of its own", () => {
    const reduced = embedded();
    const resolved = resolve(reduced);
    const inherited = findingOf(reduced, resolved, 'CONTAINED_WORK_IMPRINT_INHERITED');

    expect(containedAt(resolved).imprint).toEqual({
      status: 'RESOLVED',
      imprintId: 'imprint-1',
      basis: 'INHERITED_FROM_PARENT',
      classification: 'SUPPORTED_NORMALIZED',
      findingKey: inherited.key,
    });
    expect(inherited).toMatchObject({ classification: 'SUPPORTED_NORMALIZED', blocking: false });
    // Stable: the same imprint and the same provenance however often the plan is resolved.
    expect(containedAt(resolve(reduced)).imprint).toEqual(containedAt(resolved).imprint);
    expect(containedAt(resolve(reduced, {}, { parent: { plannedWorkId: 'work-1', imprintId: null } })).imprint).toEqual(
      { status: 'UNRESOLVED', findingKey: inherited.key },
    );
  });

  it('plans a first edition explicitly, with its normalisation provenance, rather than leaving it to a mapper default', () => {
    const reduced = embedded();
    const resolved = resolve(reduced);
    const normalised = findingOf(reduced, resolved, 'CONTAINED_WORK_EDITION_NORMALISED');

    expect(containedAt(resolved).edition).toEqual({
      edition: 1,
      basis: 'FIRST_EDITION_NORMALISED',
      classification: 'SUPPORTED_NORMALIZED',
      findingKey: normalised.key,
    });
    expect(normalised).toMatchObject({ blocking: false, detail: { edition: 1 } });
  });

  it("starts with no lifecycle, and never takes its parent's status or dates", () => {
    // The parent Product states status 04 (active) and a publication date; the contained Work takes neither.
    const reduced = embedded();
    const resolved = resolve(reduced);
    const question = findingOf(reduced, resolved, 'CONTAINED_WORK_STATUS_REQUIRED');

    expect(containedAt(resolved).lifecycle).toEqual({
      status: null,
      statusFindingKey: question.key,
      publicationDate: null,
      withdrawnDate: null,
      dateFindingKeys: [],
      replacement: 'NOT_REQUIRED',
    });
    expect(question.resolution).toEqual({
      kind: 'CHOICE',
      options: [Forthcoming, Active, Withdrawn, Superseded, PostponedIndefinitely, Cancelled].map((status) => ({
        key: status,
        label: status,
      })),
    });
    expect(ONIX_CONTAINED_WORK_STATUSES).toHaveLength(6);
  });

  describe('lifecycle date invariants', () => {
    const statusKey = (reduced: Reduced) => findingOf(reduced, resolve(reduced), 'CONTAINED_WORK_STATUS_REQUIRED').key;
    const dateKeys = (reduced: Reduced, status: string) => {
      const resolved = resolve(reduced, { [statusKey(reduced)]: status });

      return Object.fromEntries(
        resolved.raised
          .filter(({ code }) => code === 'CONTAINED_WORK_DATE_REQUIRED')
          .map(({ key, detail }) => [detail.role as string, key]),
      );
    };

    it.each([
      [Forthcoming, []],
      [PostponedIndefinitely, []],
      [Cancelled, []],
      [Active, ['PUBLICATION']],
      [Withdrawn, ['PUBLICATION', 'WITHDRAWAL']],
      [Superseded, ['PUBLICATION', 'WITHDRAWAL']],
    ])('asks for exactly the complete dates %s needs, and synthesises none', (status, roles) => {
      const reduced = embedded();
      const resolved = resolve(reduced, { [statusKey(reduced)]: status });
      const questions = resolved.raised.filter(({ code }) => code === 'CONTAINED_WORK_DATE_REQUIRED');

      expect(questions.map(({ detail }) => detail.role)).toEqual(roles);
      questions.forEach((question) =>
        expect(question).toMatchObject({ blocking: true, resolution: { kind: 'INPUT', input: 'DATE' } }),
      );
      expect(containedAt(resolved).lifecycle).toMatchObject({ status, publicationDate: null, withdrawnDate: null });
      expect(resolved.pendingFindingKeys).toEqual(expect.arrayContaining(questions.map(({ key }) => key)));
    });

    it('takes a complete date the publisher gives, and nothing else', () => {
      const reduced = embedded();
      const keys = dateKeys(reduced, Active);
      const given = (date: string) =>
        containedAt(resolve(reduced, { [statusKey(reduced)]: Active, [keys.PUBLICATION]: date })).lifecycle
          .publicationDate;

      expect(given('2024-03-01')).toBe('2024-03-01');
      expect(given('2024-02-30')).toBeNull();
      expect(given('2024-3-1')).toBeNull();
      expect(given('20240301')).toBeNull();
    });

    it('blocks a withdrawal that is not after publication, and plans one that is', () => {
      const reduced = embedded();
      const keys = dateKeys(reduced, Withdrawn);
      const withDates = (publication: string, withdrawal: string) =>
        resolve(reduced, {
          [statusKey(reduced)]: Withdrawn,
          [keys.PUBLICATION]: publication,
          [keys.WITHDRAWAL]: withdrawal,
        });

      [
        ['2024-03-01', '2024-01-01'],
        ['2024-03-01', '2024-03-01'],
      ].forEach(([publication, withdrawal]) => {
        const resolved = withDates(publication, withdrawal);
        const invalid = resolved.raised.find(({ code }) => code === 'CONTAINED_WORK_DATE_ORDER_INVALID');

        expect(invalid).toMatchObject({ blocking: true, resolution: { kind: 'NONE' } });
        expect(resolved.pendingFindingKeys).toContain(invalid?.key);
      });

      const valid = withDates('2024-01-01', '2024-03-01');

      expect(valid.raised.map(({ code }) => code)).not.toContain('CONTAINED_WORK_DATE_ORDER_INVALID');
      expect(containedAt(valid).lifecycle).toMatchObject({
        status: Withdrawn,
        publicationDate: '2024-01-01',
        withdrawnDate: '2024-03-01',
      });
    });

    it('keeps a date answer bound to its date, whichever status needs it', () => {
      const reduced = embedded();

      expect(dateKeys(reduced, Active).PUBLICATION).toBe(dateKeys(reduced, Withdrawn).PUBLICATION);
    });

    it('never lets Superseded run without exact replacement evidence, however completely it is answered', () => {
      const reduced = embedded();
      const keys = dateKeys(reduced, Superseded);
      const resolved = resolve(reduced, {
        [statusKey(reduced)]: Superseded,
        [keys.PUBLICATION]: '2024-01-01',
        [keys.WITHDRAWAL]: '2024-03-01',
      });
      const replacement = resolved.raised.find(({ code }) => code === 'CONTAINED_WORK_REPLACEMENT_UNRESOLVED');

      expect(replacement).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        resolution: { kind: 'NONE' },
        detail: { owner: 'APP-IMPORT-ONIX-REL-01B', ownerIssue: '#224' },
      });
      expect(containedAt(resolved).lifecycle).toMatchObject({ status: Superseded, replacement: 'UNRESOLVED' });
      expect(resolved.pendingFindingKeys).toContain(replacement?.key);
    });
  });

  it('stays execution-deferred however completely it is answered: no contained Work or IsPartOf is ever executed here', () => {
    const reduced = embedded();
    const first = resolve(reduced);
    const typeKey = findingOf(reduced, first, 'CONTAINED_WORK_TYPE_REQUIRED').key;
    const statusKey = findingOf(reduced, first, 'CONTAINED_WORK_STATUS_REQUIRED').key;
    const deferred = findingOf(reduced, first, 'CONTAINED_WORK_EXECUTION_DEFERRED');
    const answered = resolve(reduced, { [typeKey]: Monograph, [statusKey]: Forthcoming });

    expect(deferred).toMatchObject({
      classification: 'EXECUTION_DEFERRED',
      blocking: true,
      resolution: { kind: 'NONE' },
    });
    expect(answered.pendingFindingKeys).toEqual([deferred.key]);
    expect(containedAt(answered)).toMatchObject({
      workType: { status: 'RESOLVED', type: Monograph },
      lifecycle: { status: Forthcoming },
      ordinal: { status: 'RESOLVED', ordinal: 1 },
      action: 'EXECUTION_DEFERRED',
    });
  });

  it("plans the contained Work's own titles, languages and subjects, and never its parent's contributors or languages", () => {
    const reduced = reduce([
      product(
        [
          item({ lsn: '1', type: '01', title: 'The Embedded Novel' }),
          item({
            lsn: '2',
            type: '01',
            title: 'Another',
            extra:
              '<Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>A01</ContributorRole><PersonName>Mary Somerville</PersonName><KeyNames>Somerville</KeyNames></Contributor><Language><LanguageRole>01</LanguageRole><LanguageCode>fre</LanguageCode></Language>',
          }),
        ],
        {
          descriptive:
            '<Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>A01</ContributorRole><PersonName>Ada Lovelace</PersonName><KeyNames>Lovelace</KeyNames></Contributor><Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>',
        },
      ),
    ]);
    const resolved = resolve(reduced);

    expect(containedAt(resolved, 1).descriptive).toMatchObject({
      componentPath: itemPath(1),
      titles: [expect.objectContaining({ title: 'The Embedded Novel', canonical: true })],
      languages: [],
      subjects: [],
      contributorIntentKeys: [],
    });
    expect(containedAt(resolved, 2).descriptive?.languages.map(({ code }) => code)).toEqual(['FRE']);
    expect(containedAt(resolved, 2).descriptive?.contributorIntentKeys).toHaveLength(1);
    expect(
      reduced.descriptive.products[reduced.sourcePlan.products[0].productKey].contentItems[
        itemPath(2)
      ].contributors.intents.map(({ fullName }) => fullName),
    ).toEqual(['Mary Somerville']);
  });

  it('cannot hold a page range, and says so; its NumberOfPages is its page count', () => {
    const reduced = embedded({ pageRuns: [['1', '40']], pages: '40' });
    const resolved = resolve(reduced);
    const loss = findingOf(reduced, resolved, 'COMPONENT_PAGE_RANGE_UNREPRESENTABLE');

    expect(loss).toMatchObject({ blocking: true, resolution: { kind: 'ACKNOWLEDGE' }, detail: { pageRuns: ['1–40'] } });
    expect(containedAt(resolved).pageCount).toBe(40);
    expect(containedAt(resolve(reduced, { [loss.key]: ONIX_COMPONENT_ACKNOWLEDGED })).pendingFindingKeys).not.toContain(
      loss.key,
    );
  });
});

describe('structural ordinals (rules 5-8; Amendment 1 section 5)', () => {
  it('takes a flat positive LevelSequenceNumber as the relation ordinal, never the source order', () => {
    const reduced = reduce([
      product([
        item({ lsn: '3', title: 'Third' }),
        item({ lsn: '1', title: 'First' }),
        item({ lsn: '2', title: 'Second' }),
      ]),
    ]);
    const resolved = resolve(reduced);

    expect(resolved.intents.map((intent) => [intent.position, (intent as OnixChapterIntent).ordinal])).toEqual([
      [
        1,
        {
          status: 'RESOLVED',
          ordinal: 3,
          basis: 'LEVEL_SEQUENCE_NUMBER',
          findingKey: null,
          locations: [expect.objectContaining({ path: `${itemPath(1)}/LevelSequenceNumber[1]` })],
        },
      ],
      [2, expect.objectContaining({ ordinal: 1 })],
      [3, expect.objectContaining({ ordinal: 2 })],
    ]);
    expect(resolved.pendingFindingKeys).toEqual([]);
  });

  it('never falls back to the file order where no LevelSequenceNumber is given, and asks for the position instead', () => {
    const reduced = reduce([product([item({ title: 'One' }), item({ title: 'Two' })])]);
    const resolved = resolve(reduced);
    const questions = findingsOf(reduced, resolved).filter(({ code }) => code === 'COMPONENT_ORDINAL_REQUIRED');

    expect(resolved.intents.map((intent) => (intent as OnixChapterIntent).ordinal)).toEqual([
      { status: 'UNRESOLVED' },
      { status: 'UNRESOLVED' },
    ]);
    expect(questions).toHaveLength(2);
    questions.forEach((question) =>
      expect(question).toMatchObject({
        classification: 'TARGET_INPUT_REQUIRED',
        blocking: true,
        resolution: { kind: 'INPUT', input: 'ORDINAL' },
        detail: { reason: 'ABSENT', relation: 'IS_CHILD_OF' },
      }),
    );

    const answered = resolve(reduced, { [questions[0].key]: '2', [questions[1].key]: '1' });

    expect(answered.intents.map((intent) => (intent as OnixChapterIntent).ordinal)).toEqual([
      { status: 'RESOLVED', ordinal: 2, basis: 'PUBLISHER_INPUT', findingKey: questions[0].key, locations: [] },
      { status: 'RESOLVED', ordinal: 1, basis: 'PUBLISHER_INPUT', findingKey: questions[1].key, locations: [] },
    ]);
    expect(answered.pendingFindingKeys).toEqual([]);
  });

  it('never takes a ComponentNumber as the ordinal, and keeps it with the ComponentTypeName as metadata Thoth does not record', () => {
    const numbered = reduce([product([item({ typeName: 'Chapter', number: '5' })])]);
    const unnumbered = resolve(numbered);

    expect(chapterAt(unnumbered).ordinal).toEqual({ status: 'UNRESOLVED' });
    expect(findingOf(numbered, unnumbered, 'COMPONENT_LABEL_NOT_REPRESENTED')).toMatchObject({
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: false,
      detail: { componentTypeName: 'Chapter', componentNumber: '5' },
    });

    const positioned = reduce([product([item({ lsn: '2', number: '1' })])]);

    expect(chapterAt(resolve(positioned)).ordinal).toMatchObject({ ordinal: 2, basis: 'LEVEL_SEQUENCE_NUMBER' });
  });

  it.each([
    ['0', 'ZERO'],
    ['00', 'ZERO'],
    ['2147483648', 'OUT_OF_RANGE'],
    ['1a', 'NOT_A_NUMBER'],
  ])('reads LevelSequenceNumber %s as no ordinal at all (%s), and asks for one', (lsn, reason) => {
    const reduced = reduce([product([item({ lsn })])]);
    const resolved = resolve(reduced);

    expect(componentsOf(reduced)[0].levelSequence).toMatchObject({ kind: 'UNUSABLE', raw: lsn, reason });
    expect(findingOf(reduced, resolved, 'COMPONENT_ORDINAL_REQUIRED').detail).toMatchObject({ reason });
  });

  it('reads a flat LevelSequenceNumber as the whole number it spells', () => {
    expect(componentsOf(reduce([product([item({ lsn: '01' })])]))[0].levelSequence).toMatchObject({
      kind: 'FLAT',
      raw: '01',
      ordinal: 1,
    });
  });

  it('accepts only a positive whole ordinal Thoth can hold as the publisher input', () => {
    const reduced = reduce([product([item()])]);
    const question = findingOf(reduced, resolve(reduced), 'COMPONENT_ORDINAL_REQUIRED');

    ['1', '42', '2147483647'].forEach((answer) => expect(isOfferedOnixComponentAnswer(question, answer)).toBe(true));
    ['0', '-1', '1.5', '01', ' 2', '2147483648', 'two', ''].forEach((answer) =>
      expect(isOfferedOnixComponentAnswer(question, answer)).toBe(false),
    );
    expect(chapterAt(resolve(reduced, { [question.key]: '01' })).ordinal).toEqual({ status: 'UNRESOLVED' });
  });

  it('blocks two components of one relation set stating one ordinal, and orders neither by the file', () => {
    const reduced = reduce([product([item({ lsn: '1', title: 'A' }), item({ lsn: '1', title: 'B' })])]);
    const resolved = resolve(reduced);
    const duplicate = findingOf(reduced, resolved, 'COMPONENT_ORDINAL_DUPLICATE');

    expect(duplicate).toMatchObject({
      classification: 'SOURCE_CONFLICT',
      blocking: true,
      componentKey: null,
      resolution: { kind: 'NONE' },
      detail: { relation: 'IS_CHILD_OF', ordinal: 1, components: [itemPath(1), itemPath(2)] },
    });
    expect(resolved.intents.map(({ pendingFindingKeys }) => pendingFindingKeys)).toEqual([
      [duplicate.key],
      [duplicate.key],
    ]);
    expect(resolved.intents.map(({ action }) => action)).toEqual(['BLOCKED', 'BLOCKED']);
  });

  it('keeps chapters and contained Works in separate relation sets', () => {
    const reduced = reduce([product([item({ lsn: '1' }), item({ lsn: '1', type: '01' })])]);

    expect(reduced.plan.findings.map(({ code }) => code)).not.toContain('COMPONENT_ORDINAL_DUPLICATE');
  });

  it('blocks a position the publisher entered that another component of the set already takes', () => {
    const reduced = reduce([product([item({ lsn: '1' }), item()])]);
    const question = findingOf(reduced, resolve(reduced), 'COMPONENT_ORDINAL_REQUIRED');
    const colliding = resolve(reduced, { [question.key]: '1' });
    const collision = colliding.raised.find(({ code }) => code === 'COMPONENT_ORDINAL_COLLISION');

    expect(collision).toMatchObject({
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      resolution: { kind: 'NONE' },
      detail: { relation: 'IS_CHILD_OF', ordinal: 1 },
    });
    expect(colliding.intents.map(({ action }) => action)).toEqual(['BLOCKED', 'BLOCKED']);
    expect(resolve(reduced, { [question.key]: '2' }).pendingFindingKeys).toEqual([]);
  });

  it('plans chapter ordinals exactly, and defers any set the current executor cannot create as stated (#187)', () => {
    const gapped = reduce([product([item({ lsn: '1' }), item({ lsn: '2' }), item({ lsn: '4' })])]);
    const deferred = resolve(gapped);
    const finding = deferred.raised.find(({ code }) => code === 'CHAPTER_ORDINAL_EXECUTION_DEFERRED');

    expect(finding).toMatchObject({
      classification: 'EXECUTION_DEFERRED',
      blocking: true,
      detail: { ordinals: ['1', '2', '4'] },
    });
    expect(deferred.intents.map((intent) => (intent as OnixChapterIntent).ordinal)).toEqual([
      expect.objectContaining({ ordinal: 1 }),
      expect.objectContaining({ ordinal: 2 }),
      expect.objectContaining({ ordinal: 4 }),
    ]);
    expect(deferred.intents.map(({ action }) => action)).toEqual(['BLOCKED', 'BLOCKED', 'BLOCKED']);

    // Contiguous positions in any file order are what the executor creates, in the order of their ordinals.
    const shuffled = reduce([product([item({ lsn: '2' }), item({ lsn: '3' }), item({ lsn: '1' })])]);

    expect(resolve(shuffled).raised).toEqual([]);
  });
});

describe('hierarchy (rule 7; Amendment 1 section 6)', () => {
  it('never flattens a multi-level position by itself: it is an acknowledged loss plus an explicit position', () => {
    const reduced = reduce([product([item({ lsn: '2' }), item({ lsn: '2.1' })])]);
    const unanswered = resolve(reduced);
    const loss = findingOf(reduced, unanswered, 'COMPONENT_HIERARCHY_UNREPRESENTABLE');
    const position = findingsOf(reduced, unanswered).find(
      ({ code, componentKey }) => code === 'COMPONENT_ORDINAL_REQUIRED' && componentKey?.endsWith(itemPath(2)),
    ) as OnixComponentFinding;

    expect(componentsOf(reduced)[1].levelSequence).toMatchObject({
      kind: 'HIERARCHICAL',
      raw: '2.1',
      levels: ['2', '1'],
    });
    expect(loss).toMatchObject({
      classification: 'TARGET_UNREPRESENTABLE',
      blocking: true,
      resolution: { kind: 'ACKNOWLEDGE' },
      detail: { levelSequenceNumber: '2.1', levels: ['2', '1'] },
    });
    expect(chapterAt(unanswered, 2)).toMatchObject({
      ordinal: { status: 'UNRESOLVED' },
      hierarchy: { raw: '2.1', levels: ['2', '1'], acknowledged: false, findingKey: loss.key },
      action: 'BLOCKED',
    });
    // Its parent is never inferred from its number or its place: no component is named as its parent.
    expect(JSON.stringify(chapterAt(unanswered, 2))).not.toContain(itemPath(1));

    // The position alone does not flatten it, nor the acknowledgement alone.
    expect(chapterAt(resolve(reduced, { [position.key]: '1' }), 2).action).toBe('BLOCKED');
    expect(chapterAt(resolve(reduced, { [loss.key]: ONIX_COMPONENT_ACKNOWLEDGED }), 2).action).toBe('BLOCKED');

    const answered = resolve(reduced, { [loss.key]: ONIX_COMPONENT_ACKNOWLEDGED, [position.key]: '1' });

    expect(chapterAt(answered, 2)).toMatchObject({
      ordinal: { status: 'RESOLVED', ordinal: 1, basis: 'PUBLISHER_INPUT' },
      hierarchy: { raw: '2.1', acknowledged: true },
      action: 'CREATE_CHAPTER',
    });
  });
});

describe('pages (rules 12-13)', () => {
  it('maps one PageRun exactly, with no last page where it states none', () => {
    const single = chapterAt(resolve(reduce([product([item({ lsn: '1', pageRuns: [['xi', 'xx']] })])])));
    const open = chapterAt(resolve(reduce([product([item({ lsn: '1', pageRuns: [['45']] })])])));

    expect(single.pages).toMatchObject({ status: 'RESOLVED', firstPage: 'xi', lastPage: 'xx', basis: 'PAGE_RUN' });
    expect(open.pages).toMatchObject({ status: 'RESOLVED', firstPage: '45', lastPage: '' });
  });

  it('reads every PageRun inside the TextItem, where ONIX states it', () => {
    const reduced = reduce([
      product([
        item({
          lsn: '1',
          pageRuns: [
            ['1', '9'],
            ['12', '20'],
          ],
        }),
      ]),
    ]);

    expect(componentsOf(reduced)[0].pageRuns).toEqual([
      {
        path: `${itemPath(1)}/TextItem[1]/PageRun[1]`,
        sourcePath: `${itemPath(1)}/TextItem[1]/PageRun[1]`,
        firstPage: '1',
        lastPage: '9',
      },
      {
        path: `${itemPath(1)}/TextItem[1]/PageRun[2]`,
        sourcePath: `${itemPath(1)}/TextItem[1]/PageRun[2]`,
        firstPage: '12',
        lastPage: '20',
      },
    ]);
  });

  it('never first-wins several disjoint PageRuns, and never joins them: the publisher chooses one, or none', () => {
    const reduced = reduce([
      product([
        item({
          lsn: '1',
          pageRuns: [
            ['1', '9'],
            ['12', '20'],
          ],
        }),
      ]),
    ]);
    const unanswered = resolve(reduced);
    const choice = findingOf(reduced, unanswered, 'COMPONENT_PAGE_RUNS_CHOICE_REQUIRED');

    expect(choice).toMatchObject({
      classification: 'TARGET_INPUT_REQUIRED',
      blocking: true,
      detail: { pageRuns: ['1–9', '12–20'] },
      resolution: {
        kind: 'CHOICE',
        options: [
          { key: `${itemPath(1)}/TextItem[1]/PageRun[1]`, label: '1–9' },
          { key: `${itemPath(1)}/TextItem[1]/PageRun[2]`, label: '12–20' },
          { key: ONIX_COMPONENT_OMIT, label: '1–9, 12–20' },
        ],
      },
    });
    expect(chapterAt(unanswered).pages).toEqual({ status: 'UNRESOLVED', findingKey: choice.key });
    expect(chapterAt(unanswered).action).toBe('BLOCKED');
    expect(chapterAt(resolve(reduced, { [choice.key]: `${itemPath(1)}/TextItem[1]/PageRun[2]` })).pages).toMatchObject({
      status: 'RESOLVED',
      firstPage: '12',
      lastPage: '20',
      basis: 'PUBLISHER_CHOICE',
    });
    expect(chapterAt(resolve(reduced, { [choice.key]: ONIX_COMPONENT_OMIT })).pages).toEqual({
      status: 'OMITTED',
      findingKey: choice.key,
    });
    expect(chapterAt(resolve(reduced, { [choice.key]: '1–20' })).pages.status).toBe('UNRESOLVED');
  });

  it('reads two PageRuns naming the same pages as one range', () => {
    const reduced = reduce([
      product([
        item({
          lsn: '1',
          pageRuns: [
            ['3', '8'],
            ['3', '8'],
          ],
        }),
      ]),
    ]);
    const resolved = resolve(reduced);

    expect(findingCodes(reduced, resolved)).not.toContain('COMPONENT_PAGE_RUNS_CHOICE_REQUIRED');
    expect(chapterAt(resolved).pages).toMatchObject({ status: 'RESOLVED', firstPage: '3', lastPage: '8' });
  });

  it('maps NumberOfPages directly to the page count, and never counts pages from labels', () => {
    const counted = chapterAt(resolve(reduce([product([item({ lsn: '1', pageRuns: [['1', '100']], pages: '12' })])])));
    const signed = chapterAt(resolve(reduce([product([item({ lsn: '1', pages: '+08' })])])));
    const uncounted = chapterAt(resolve(reduce([product([item({ lsn: '1', pageRuns: [['1', '10']] })])])));

    expect(counted.pageCount).toBe(12);
    expect(signed.pageCount).toBe(8);
    expect(uncounted.pageCount).toBeNull();
  });

  it('asks the publisher to acknowledge a page count Thoth cannot hold, and reports one no count is read from', () => {
    const huge = reduce([product([item({ lsn: '1', pages: '99999999999' })])]);
    const hugeFinding = findingOf(huge, resolve(huge), 'COMPONENT_PAGE_COUNT_UNREPRESENTABLE');
    const unreadable = reduce([product([item({ lsn: '1', pages: 'twelve' })])]);

    expect(hugeFinding).toMatchObject({ blocking: true, resolution: { kind: 'ACKNOWLEDGE' } });
    expect(componentsOf(huge)[0].pageCount).toBeNull();
    expect(findingOf(unreadable, resolve(unreadable), 'COMPONENT_SHAPE_UNEXPECTED')).toMatchObject({
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      resolution: { kind: 'NONE' },
    });
  });
});

describe('identifiers (rule 11)', () => {
  it('takes the DOI only from TextItemIDType 06, canonicalised, and never from an identifier that merely looks like one', () => {
    const reduced = reduce([
      product([
        item({
          lsn: '1',
          identifiers: [
            ['01', '10.9999/proprietary-looking', 'Internal'],
            ['06', '10.1234/chapter'],
          ],
        }),
        item({ lsn: '2', identifiers: [['01', '10.9999/only-proprietary', 'Internal']] }),
      ]),
    ]);
    const resolved = resolve(reduced);

    expect(chapterAt(resolved, 1).doi).toBe('https://doi.org/10.1234/chapter');
    expect(chapterAt(resolved, 2).doi).toBeNull();
    expect(
      findingsOf(reduced, resolved)
        .filter(({ code }) => code === 'COMPONENT_IDENTIFIER_NOT_REPRESENTED')
        .map(({ detail }) => detail.identifiers),
    ).toEqual([['01 (Internal): 10.9999/proprietary-looking'], ['01 (Internal): 10.9999/only-proprietary']]);
  });

  it('reads two spellings of one DOI as one, chooses between different ones never, and reports what it cannot use', () => {
    const same = reduce([
      product([
        item({
          lsn: '1',
          identifiers: [
            ['06', '10.1234/a'],
            ['06', 'https://doi.org/10.1234/a'],
          ],
        }),
      ]),
    ]);
    const conflicting = reduce([
      product([
        item({
          lsn: '1',
          identifiers: [
            ['06', '10.1234/a'],
            ['06', '10.1234/b'],
          ],
        }),
      ]),
    ]);
    const unusable = reduce([
      product([
        item({
          lsn: '1',
          identifiers: [
            ['06', 'not-a-doi'],
            ['06', '10.1234/a'],
          ],
        }),
      ]),
    ]);

    expect(chapterAt(resolve(same)).doi).toBe('https://doi.org/10.1234/a');
    expect(chapterAt(resolve(conflicting)).doi).toBeNull();
    expect(findingOf(conflicting, resolve(conflicting), 'COMPONENT_DOI_CONFLICT')).toMatchObject({
      blocking: false,
      detail: { dois: ['https://doi.org/10.1234/a', 'https://doi.org/10.1234/b'] },
    });
    expect(chapterAt(resolve(unusable)).doi).toBe('https://doi.org/10.1234/a');
    expect(findingOf(unusable, resolve(unusable), 'COMPONENT_DOI_UNUSABLE')).toMatchObject({
      blocking: false,
      detail: { values: ['not-a-doi'] },
    });
  });
});

describe('downstream-owned and unreduced component facts', () => {
  it('keeps every component fact a later stage owns, at its own path, and maps none of them', () => {
    const extra =
      '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text>An abstract.</Text></TextContent>' +
      '<CitedContent><CitedContentType>01</CitedContentType><ListName>A list</ListName></CitedContent>' +
      '<SupportingResource><ResourceContentType>01</ResourceContentType><ContentAudience>00</ContentAudience><ResourceMode>03</ResourceMode><ResourceVersion><ResourceForm>02</ResourceForm><ResourceLink>https://example.org/c.jpg</ResourceLink></ResourceVersion></SupportingResource>' +
      '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/w</IDValue></WorkIdentifier></RelatedWork>' +
      '<RelatedProduct><ProductRelationCode>34</ProductRelationCode><ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>10.1234/cited</IDValue></ProductIdentifier></RelatedProduct>';
    const reduced = reduce([product([item({ lsn: '1', extra })])]);
    const [component] = componentsOf(reduced);

    expect(
      component.retained.map(({ element, owner, ownerIssue, path }) => [element, owner, ownerIssue, path]),
    ).toEqual([
      ['RelatedWork', 'APP-IMPORT-ONIX-REL-01B', '#224', `${itemPath(1)}/RelatedWork[1]`],
      ['RelatedProduct', 'APP-IMPORT-ONIX-REL-01B', '#224', `${itemPath(1)}/RelatedProduct[1]`],
      ['TextContent', 'APP-IMPORT-ONIX-REL-01C', '#225', `${itemPath(1)}/TextContent[1]`],
      ['SupportingResource', 'APP-IMPORT-ONIX-REL-01C', '#225', `${itemPath(1)}/SupportingResource[1]`],
      ['CitedContent', 'APP-IMPORT-ONIX-REL-01D', '#226', `${itemPath(1)}/CitedContent[1]`],
    ]);
    // None of them is a finding of this stage, and none holds the chapter: their meaning is their owners' to decide.
    expect(resolve(reduced).pendingFindingKeys).toEqual([]);
  });

  it('holds a component stating its own ONIX 3.1 publisher or copyright, which no approved decision reduces for it', () => {
    const extra =
      '<Publisher><PublishingRole>01</PublishingRole><PublisherName>Another Press</PublisherName></Publisher>' +
      '<CopyrightStatement><CopyrightYear>2020</CopyrightYear><CopyrightOwner><PersonName>A Person</PersonName></CopyrightOwner></CopyrightStatement>';
    const reduced = reduce([product([item({ lsn: '1', extra })])], '3.1');
    const resolved = resolve(reduced);

    expect(findingOf(reduced, resolved, 'COMPONENT_FACT_UNREDUCED')).toMatchObject({
      classification: 'PREFLIGHT_GAP',
      blocking: true,
      resolution: { kind: 'NONE' },
      detail: { elements: ['Publisher', 'CopyrightStatement'] },
    });
    expect(chapterAt(resolved).action).toBe('BLOCKED');
  });
});

describe('source-bound, stale-safe answers', () => {
  it('binds every answer to everything the ContentItem states: a changed fact at the same place is asked afresh', () => {
    const before = reduce([product([item({ type: '01', title: 'Before' })])]);
    const after = reduce([product([item({ type: '01', title: 'After' })])]);
    const keysOf = (reduced: Reduced) => findingsOf(reduced, resolve(reduced)).map(({ key }) => key);
    const answers = Object.fromEntries(
      findingsOf(before, resolve(before))
        .filter(({ resolution }) => resolution.kind !== 'NONE')
        .map(({ key, resolution }) => [
          key,
          resolution.kind === 'CHOICE'
            ? resolution.options[0].key
            : resolution.kind === 'INPUT'
              ? '1'
              : ONIX_COMPONENT_ACKNOWLEDGED,
        ]),
    );

    // The same place, the same codes, and no key in common.
    expect(componentsOf(after)[0].path).toBe(componentsOf(before)[0].path);
    expect(keysOf(after).filter((key) => keysOf(before).includes(key))).toEqual([]);
    expect(containedAt(resolve(before, answers))).toMatchObject({
      workType: { status: 'RESOLVED' },
      lifecycle: { status: Forthcoming },
      ordinal: { status: 'RESOLVED' },
    });
    // The answers given for the earlier fact answer nothing about the changed one.
    expect(containedAt(resolve(after, answers))).toMatchObject({
      workType: { status: 'UNRESOLVED' },
      lifecycle: { status: null },
      ordinal: { status: 'UNRESOLVED' },
    });
  });

  it('keeps every key, identity and fact stable however often the plan is reduced and resolved', () => {
    const file = [product([item({ lsn: '1' }), item({ lsn: '2', type: '01' }), item({ lsn: '3', av: '01' })])];
    const first = reduce(file);
    const second = reduce(file);

    expect(second.plan).toEqual(first.plan);
    expect(resolve(second)).toEqual(resolve(first));
  });

  it('keeps each fact at its canonical path and the path the submitted file states it at', () => {
    const provenance: ProvenanceResolver = {
      sourcePathOf: (path) => path.replace(/ContentItem/g, 'contentitem').replace(/LevelSequenceNumber/g, 'b284'),
      sourceTagOf: () => 'contentitem',
    };
    const reduced = reduce([product([item({ lsn: '1' })])], '3.0', provenance);
    const [component] = componentsOf(reduced);

    expect(component).toMatchObject({
      path: itemPath(1),
      sourcePath: itemPath(1).replace('ContentItem', 'contentitem'),
    });
    expect(component.levelSequence).toMatchObject({
      path: `${itemPath(1)}/LevelSequenceNumber[1]`,
      sourcePath: `${itemPath(1).replace('ContentItem', 'contentitem')}/b284[1]`,
    });
    expect(reduced.plan.findings[0].locations[0].sourcePath).toContain('contentitem');
  });
});

describe('resolveOnixComponents: what a Work is planned with', () => {
  it('plans only the chapters for a caller that gave no component reduction', () => {
    const reduced = reduce([
      product([item({ lsn: '1' }), item({ lsn: '2', type: '01' }), item({ lsn: '3', av: '01' })]),
    ]);

    expect(resolve(reduced, {}, { kinds: 'CHAPTERS' }).intents.map(({ kind }) => kind)).toEqual(['BOOK_CHAPTER']);
  });

  it('never leaves a planned chapter out silently where the adapter built no candidate chapter Work for it', () => {
    const reduced = reduce([product([item({ lsn: '1' })])]);
    const resolved = resolve(reduced, {}, { chapterWorkIds: {} });
    const missing = resolved.raised.find(({ code }) => code === 'CHAPTER_CANDIDATE_MISSING');

    expect(missing).toMatchObject({ classification: 'PREFLIGHT_GAP', blocking: true });
    expect(chapterAt(resolved)).toMatchObject({ chapterWorkId: null, action: 'BLOCKED' });
    // Before any adaptation, a chapter is only planned, never waiting on a candidate.
    expect(
      resolve(reduced, {}, { chapterWorkIds: {}, parent: { plannedWorkId: null, imprintId: null } }).raised,
    ).toEqual([]);
  });

  it("records the parent Work's lifecycle, imprint and copyright as the chapter's explicit normalisation (rule 14)", () => {
    expect(chapterAt(resolve(reduce([product([item({ lsn: '1' })])]))).inherited).toEqual({
      basis: 'PARENT_WORK',
      classification: 'SUPPORTED_NORMALIZED',
      fields: ['imprint', 'status', 'publicationDate', 'withdrawnDate', 'copyrightHolder'],
    });
  });

  it('plans nothing for a Product the reduction holds no components for', () => {
    const reduced = reduce([product([])]);

    expect(reduced.plan.products).toEqual({});
    expect(resolve(reduced)).toEqual({ intents: [], raised: [], findingKeys: [], pendingFindingKeys: [] });
  });
});
