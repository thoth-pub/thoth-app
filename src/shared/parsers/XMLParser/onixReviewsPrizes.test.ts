import { parse } from '@5stones/onix';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AwardRole, CountryCode, MarkupFormat } from '@/gql/graphql';

import {
  ONIX_PRIZE_PRODUCT_AWARD,
  ONIX_PRIZE_WORK_AWARD,
  ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
  ONIX_REVIEWS_PRIZES_NONE,
  ONIX_REVIEWS_PRIZES_OMIT,
  ONIX_REVIEWS_PRIZES_PROJECT,
  type OnixCollateralPlan,
  type OnixReviewsPrizesFinding,
  type OnixReviewsPrizesFindingCode,
} from '../../types/onixPlanning';
import type { ExtendedONIXMessageRoot } from './interfaces';
import { reduceOnixCollateral } from './onixCollateral';
import { reduceOnixDescriptive } from './onixDescriptive';
import { planOnixSource } from './onixPlanning';
import {
  isOfferedOnixReviewsPrizesAnswer,
  ONIX_PRIZE_AWARD_ROLES,
  ONIX_PRIZE_COUNTRIES,
  ONIX_PRIZE_COUNTRIES_UNSUPPORTED,
  reduceOnixReviewsPrizes,
  resolveOnixReviewsPrizesComponent,
  resolveOnixReviewsPrizesWork,
} from './onixReviewsPrizes';
import { ONIX_PINNED_COUNTRIES } from './onixTerritory';

/**
 * The canonical review, endorsement, prize and CitedContent reduction of thoth-app#226 (REL-01D of #185), driven as the
 * uploader drives it: a real ONIX document parsed by `@5stones/onix`, planned by #182, described by #183, its collateral reduced
 * by #225, then reduced here and resolved with the publisher's answers. Every fixture is minimal and synthetic, and every path
 * is the canonical Reference path a finding names. Rule numbers are those of #179 proposal 5569333445.
 */

const REFERENCE_NS_30 = 'http://ns.editeur.org/onix/3.0/reference';
const REFERENCE_NS_31 = 'http://ns.editeur.org/onix/3.1/reference';
const HEADER =
  '<Header><Sender><SenderName>Example Press</SenderName></Sender><SentDateTime>20260927</SentDateTime></Header>';
const PRODUCT = (index = 1) => `/ONIXMessage[1]/Product[${index}]`;
const COLLATERAL = (index = 1) => `${PRODUCT(index)}/CollateralDetail[1]`;

type TextSpec = {
  readonly seq?: string;
  readonly audiences?: readonly string[];
  readonly authors?: readonly string[];
  readonly corporates?: readonly string[];
  readonly descriptions?: readonly string[];
  readonly sourceTitles?: readonly string[];
  readonly links?: readonly string[];
  readonly rating?: string;
  readonly dates?: string;
  /** Several Text elements instead of one, as [attributes, body]. */
  readonly texts?: readonly (readonly [string, string])[];
  readonly attributes?: string;
};

const each = (name: string, values: readonly string[] = []) =>
  values.map((value) => `<${name}>${value}</${name}>`).join('');

const textContent = (
  type: string,
  body: string,
  {
    seq,
    audiences = ['00'],
    authors = [],
    corporates = [],
    descriptions = [],
    sourceTitles = [],
    links = [],
    rating,
    dates = '',
    texts,
    attributes = '',
  }: TextSpec = {},
) =>
  `<TextContent>${seq === undefined ? '' : `<SequenceNumber>${seq}</SequenceNumber>`}<TextType>${type}</TextType>${each('ContentAudience', audiences)}` +
  (texts ?? [[attributes, body]])
    .map(([textAttributes, textBody]) => `<Text${textAttributes}>${textBody}</Text>`)
    .join('') +
  (rating === undefined ? '' : `<ReviewRating><Rating>${rating}</Rating><RatingLimit>5</RatingLimit></ReviewRating>`) +
  `${each('TextSourceDescription', descriptions)}${each('TextAuthor', authors)}${each('TextSourceCorporate', corporates)}` +
  `${each('SourceTitle', sourceTitles)}${each('TextSourceLink', links)}${dates}</TextContent>`;

type CitedSpec = {
  readonly seq?: string;
  readonly audiences?: readonly string[];
  readonly sourceType?: string;
  readonly sourceTitles?: readonly string[];
  readonly rating?: string;
  readonly notes?: readonly string[];
  readonly links?: readonly string[];
  readonly dates?: string;
};

const citedContent = (
  type: string,
  {
    seq,
    audiences = ['00'],
    sourceType,
    sourceTitles = [],
    rating,
    notes = [],
    links = [],
    dates = '',
  }: CitedSpec = {},
) =>
  `<CitedContent>${seq === undefined ? '' : `<SequenceNumber>${seq}</SequenceNumber>`}<CitedContentType>${type}</CitedContentType>${each('ContentAudience', audiences)}` +
  `${sourceType === undefined ? '' : `<SourceType>${sourceType}</SourceType>`}${each('SourceTitle', sourceTitles)}` +
  (rating === undefined ? '' : `<ReviewRating><Rating>${rating}</Rating></ReviewRating>`) +
  `${each('CitationNote', notes)}${each('ResourceLink', links)}${dates}</CitedContent>`;

const contentDate = (role: string, date: string, format?: string) =>
  `<ContentDate><ContentDateRole>${role}</ContentDateRole>${format === undefined ? '' : `<DateFormat>${format}</DateFormat>`}<Date>${date}</Date></ContentDate>`;

type PrizeSpec = {
  readonly seq?: string;
  readonly identifiers?: readonly string[];
  readonly names?: readonly (readonly [string, string])[];
  readonly year?: string;
  readonly awardingBody?: string;
  readonly country?: string;
  readonly region?: string;
  readonly code?: string;
  readonly statements?: readonly (readonly [string, string])[];
  readonly juries?: readonly (readonly [string, string])[];
};

const prize = (
  name: string,
  {
    seq,
    identifiers = [],
    names,
    year,
    awardingBody,
    country,
    region,
    code,
    statements = [],
    juries = [],
  }: PrizeSpec = {},
) =>
  `<Prize>${seq === undefined ? '' : `<SequenceNumber>${seq}</SequenceNumber>`}` +
  identifiers
    .map(
      (value) =>
        `<PrizeIdentifier><PrizeIDType>01</PrizeIDType><IDTypeName>Prize register</IDTypeName><IDValue>${value}</IDValue></PrizeIdentifier>`,
    )
    .join('') +
  (names ?? [['', name]]).map(([attributes, text]) => `<PrizeName${attributes}>${text}</PrizeName>`).join('') +
  `${year === undefined ? '' : `<PrizeYear>${year}</PrizeYear>`}${awardingBody === undefined ? '' : `<AwardingBody>${awardingBody}</AwardingBody>`}` +
  `${country === undefined ? '' : `<PrizeCountry>${country}</PrizeCountry>`}${region === undefined ? '' : `<PrizeRegion>${region}</PrizeRegion>`}` +
  `${code === undefined ? '' : `<PrizeCode>${code}</PrizeCode>`}` +
  statements.map(([attributes, text]) => `<PrizeStatement${attributes}>${text}</PrizeStatement>`).join('') +
  juries.map(([attributes, text]) => `<PrizeJury${attributes}>${text}</PrizeJury>`).join('') +
  '</Prize>';

const resource = (contentType: string, link: string) =>
  `<SupportingResource><ResourceContentType>${contentType}</ResourceContentType><ContentAudience>00</ContentAudience><ResourceMode>04</ResourceMode>` +
  `<ResourceVersion><ResourceForm>01</ResourceForm><ResourceLink>${link}</ResourceLink></ResourceVersion></SupportingResource>`;

const title = (text: string, level = '01') =>
  `<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>${level}</TitleElementLevel><TitleText>${text}</TitleText></TitleElement></TitleDetail>`;

type ProductSpec = {
  readonly ref?: string;
  readonly isbn?: string;
  readonly form?: string;
  readonly collateral?: string;
  readonly contributors?: string;
  readonly items?: readonly string[];
  readonly related?: string;
  readonly workDoi?: string;
  readonly titleText?: string;
};

const product = ({
  ref = 'p1',
  isbn = '9781800000018',
  form = 'BC',
  collateral = '',
  contributors = '',
  items = [],
  related = '',
  workDoi,
  titleText = 'A Work',
}: ProductSpec = {}) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>03</NotificationType>` +
  `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${isbn}</IDValue></ProductIdentifier>` +
  `<DescriptiveDetail><ProductComposition>00</ProductComposition><ProductForm>${form}</ProductForm>${title(titleText)}${contributors}` +
  '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language></DescriptiveDetail>' +
  (collateral.length > 0 ? `<CollateralDetail>${collateral}</CollateralDetail>` : '') +
  (items.length > 0 ? `<ContentDetail>${items.join('')}</ContentDetail>` : '') +
  '<PublishingDetail><Imprint><ImprintName>Example Imprint</ImprintName></Imprint><PublishingStatus>04</PublishingStatus>' +
  '<PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20240101</Date></PublishingDate></PublishingDetail>' +
  (related.length > 0 || workDoi !== undefined
    ? `<RelatedMaterial>${
        workDoi === undefined
          ? ''
          : `<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>${workDoi}</IDValue></WorkIdentifier></RelatedWork>`
      }${related}</RelatedMaterial>`
    : '') +
  '</Product>';

const contributor = (name: string, prizes = '') =>
  `<Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>A01</ContributorRole><PersonName>${name}</PersonName>${prizes}</Contributor>`;

const contentItem = (textItemType: string, collateral: string, lsn = '1') =>
  `<ContentItem><LevelSequenceNumber>${lsn}</LevelSequenceNumber><TextItem><TextItemType>${textItemType}</TextItemType></TextItem>` +
  `${title('A Component', '04')}${collateral}</ContentItem>`;

const reduce = (
  products: readonly string[],
  {
    release = '3.1',
    collateral,
  }: { release?: '3.0' | '3.1'; collateral?: (plan: OnixCollateralPlan) => OnixCollateralPlan } = {},
) => {
  const root = parse(
    `<ONIXMessage release="${release}" xmlns="${release === '3.0' ? REFERENCE_NS_30 : REFERENCE_NS_31}">${HEADER}${products.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(root);
  const descriptive = reduceOnixDescriptive(root, sourcePlan);
  const reducedCollateral = reduceOnixCollateral(root, sourcePlan, { descriptive });
  const given = collateral === undefined ? reducedCollateral : collateral(reducedCollateral);

  return { root, sourcePlan, collateral: given, plan: reduceOnixReviewsPrizes(root, sourcePlan, given) };
};

type Reduced = ReturnType<typeof reduce>;

/** The first Work group's reviews, endorsements and awards with the publisher's answers, as the resolver asks for a new Work. */
const resolveWork = (reduced: Reduced, choices: Record<string, string> = {}, groupIndex = 0) => {
  const { groupKey } = reduced.sourcePlan.groups[groupIndex];
  const productKeys = reduced.sourcePlan.products
    .filter((node) => node.groupKey === groupKey)
    .map(({ productKey }) => productKey);

  return resolveOnixReviewsPrizesWork(reduced.plan, groupKey, productKeys, { choices, describe: 'the Work' });
};

type Resolved = ReturnType<typeof resolveWork>;

const findingsOf = (reduced: Reduced, resolved: Resolved): OnixReviewsPrizesFinding[] => {
  const byKey = new Map([...reduced.plan.findings, ...resolved.raised].map((finding) => [finding.key, finding]));

  return resolved.findingKeys.map((key) => byKey.get(key) as OnixReviewsPrizesFinding);
};

const findingOf = (reduced: Reduced, resolved: Resolved, code: OnixReviewsPrizesFindingCode) => {
  const found = findingsOf(reduced, resolved).filter((finding) => finding.code === code);

  expect(found).toHaveLength(1);

  return found[0];
};

const pendingCodes = (reduced: Reduced, resolved: Resolved) => {
  const byKey = new Map([...reduced.plan.findings, ...resolved.raised].map((finding) => [finding.key, finding]));

  return resolved.pendingFindingKeys.map((key) => byKey.get(key)?.code);
};

const optionsOf = (finding: OnixReviewsPrizesFinding) =>
  finding.resolution.kind === 'CHOICE' ? finding.resolution.options : [];

const workCandidates = (reduced: Reduced, groupIndex = 0) =>
  reduced.plan.workCandidates[reduced.sourcePlan.groups[groupIndex].groupKey];

/** A Prize's scope question, answered. */
const classify = (reduced: Reduced, answer: string, extra: Record<string, string> = {}) =>
  Object.fromEntries([
    ...workCandidates(reduced).prizes.map(({ scopeFindingKey }) => [scopeFindingKey, answer]),
    ...Object.entries(extra),
  ]);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('review quotes: TextContent 06 -> BookReview (rules 19, 37-55)', () => {
  it('maps one author, one link and an exact publication day, and keeps the quote role and source title as losses (fixture 189)', () => {
    const reduced = reduce([
      product({
        collateral: textContent('06', 'A remarkable book.', {
          authors: ['A Reviewer'],
          sourceTitles: ['The Daily Paper'],
          links: ['https://paper.example.org/review'],
          dates: contentDate('01', '20240115'),
        }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.bookReviews).toEqual([
      expect.objectContaining({
        source: 'REVIEW_QUOTE',
        target: {
          authorName: 'A Reviewer',
          url: 'https://paper.example.org/review',
          reviewDate: '2024-01-15',
          text: 'A remarkable book.',
          textMarkupFormat: MarkupFormat.PlainText,
        },
        orderNumber: 1,
        orderBasis: 'SOURCE_ORDER_TARGET_NORMALIZATION',
        action: 'CREATE',
        locations: [expect.objectContaining({ path: `${COLLATERAL()}/TextContent[1]` })],
      }),
    ]);
    // Nothing else is set: the SourceTitle is no review title and no journal name (rules 45-46, 55).
    expect(Object.keys(resolved.bookReviews[0].target).sort()).toEqual([
      'authorName',
      'reviewDate',
      'text',
      'textMarkupFormat',
      'url',
    ]);
    const targetLoss = findingOf(reduced, resolved, 'REVIEW_DETAIL_NOT_IMPORTED');

    expect(targetLoss.detail.losses).toEqual([
      'its role as a review quote, which a BookReview does not keep (rule 38)',
      'its source (SourceTitle)',
    ]);
    expect(targetLoss.message).not.toMatch(/\bImported as\b/);
    expect(targetLoss.message).toContain('if this item is imported');
    // The BookReview waits on nothing: it is held whole for execution to create (thoth-app#187).
    expect(pendingCodes(reduced, resolved)).toEqual([]);
  });

  it('never joins several TextAuthors into one name: the review keeps none, and says so (fixture 190)', () => {
    const reduced = reduce([
      product({ collateral: textContent('06', 'Jointly written.', { authors: ['One Reviewer', 'Another Reviewer'] }) }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.bookReviews.map(({ target }) => target.authorName)).toEqual([null]);
    expect(findingOf(reduced, resolved, 'REVIEW_AUTHOR_NOT_IMPORTED')).toMatchObject({
      blocking: false,
      classification: 'TARGET_UNREPRESENTABLE',
    });
    expect(JSON.stringify(resolved.bookReviews)).not.toContain('One Reviewer, Another Reviewer');
    expect(JSON.stringify(resolved.bookReviews)).not.toContain('One Reviewer and Another Reviewer');
  });

  it('keeps a review rating as an explicit loss only, never in the text (fixture 191)', () => {
    const reduced = reduce([product({ collateral: textContent('06', 'Five stars.', { rating: '5' }) })]);
    const resolved = resolveWork(reduced);

    expect(resolved.bookReviews.map(({ target }) => target.text)).toEqual(['Five stars.']);
    expect(findingOf(reduced, resolved, 'REVIEW_DETAIL_NOT_IMPORTED').detail.losses).toContain('its review rating');
  });

  it('keeps a doi.org link a URL, never a DOI, and never completes a partial date (rules 50-52)', () => {
    const reduced = reduce([
      product({
        collateral: textContent('06', 'Cited widely.', {
          links: ['https://doi.org/10.1234/review'],
          dates: contentDate('01', '202401', '01'),
        }),
      }),
    ]);
    const [review] = resolveWork(reduced).bookReviews;

    expect(review.target).toMatchObject({ url: 'https://doi.org/10.1234/review', reviewDate: null });
    expect(review.target).not.toHaveProperty('doi');
    expect(review.losses).toContain('its dates (List 155 01)');
  });

  it('never takes the first of several links: the publisher chooses one, or keeps none (rule 49)', () => {
    const reduced = reduce([
      product({
        collateral: textContent('06', 'Two homes.', {
          links: ['https://one.example.org/review', 'https://two.example.org/review'],
        }),
      }),
    ]);
    const unanswered = resolveWork(reduced);
    const choice = findingOf(reduced, unanswered, 'REVIEW_LINK_CHOICE_REQUIRED');

    expect(unanswered.bookReviews).toEqual([]);
    expect(pendingCodes(reduced, unanswered)).toEqual(['REVIEW_LINK_CHOICE_REQUIRED']);
    expect(optionsOf(choice).map(({ label }) => label)).toEqual([
      'https://one.example.org/review',
      'https://two.example.org/review',
      ONIX_REVIEWS_PRIZES_NONE,
    ]);

    const second = resolveWork(reduced, { [choice.key]: optionsOf(choice)[1].key });
    const none = resolveWork(reduced, { [choice.key]: ONIX_REVIEWS_PRIZES_NONE });

    expect(second.bookReviews.map(({ target }) => target.url)).toEqual(['https://two.example.org/review']);
    expect(none.bookReviews.map(({ target }) => target.url)).toEqual([null]);
  });

  it('asks which of several texts a review keeps, never by language or order', () => {
    const reduced = reduce([
      product({
        collateral: textContent('06', '', {
          texts: [
            [' language="eng"', 'In English.'],
            [' language="fre"', 'En français.'],
          ],
        }),
      }),
    ]);
    const unanswered = resolveWork(reduced);
    const choice = findingOf(reduced, unanswered, 'REVIEW_TEXT_CHOICE_REQUIRED');

    expect(unanswered.bookReviews).toEqual([]);
    expect(optionsOf(choice).map(({ label }) => label)).toEqual(['eng: In English.', 'fre: En français.', 'OMIT']);
    expect(resolveWork(reduced, { [choice.key]: optionsOf(choice)[1].key }).bookReviews[0].target.text).toBe(
      'En français.',
    );
    expect(resolveWork(reduced, { [choice.key]: ONIX_REVIEWS_PRIZES_OMIT }).bookReviews).toEqual([]);
  });

  it('keeps HTML markup through the approved text policy, and omits a text Thoth cannot hold only by acknowledgement', () => {
    const html = reduce([
      product({
        collateral: textContent('06', '&lt;p&gt;A &lt;em&gt;fine&lt;/em&gt; book.&lt;/p&gt;', {
          attributes: ' textformat="02"',
        }),
      }),
    ]);

    expect(resolveWork(html).bookReviews[0].target).toMatchObject({
      text: '<p>A <em>fine</em> book.</p>',
      textMarkupFormat: MarkupFormat.Html,
    });

    const unholdable = reduce([
      product({ collateral: textContent('06', '&lt;blink&gt;No.&lt;/blink&gt;', { attributes: ' textformat="03"' }) }),
    ]);
    const unanswered = resolveWork(unholdable);
    const acknowledgement = findingOf(unholdable, unanswered, 'REVIEW_TEXT_UNREPRESENTABLE');

    expect(unanswered.bookReviews).toEqual([]);
    expect(acknowledgement.resolution).toEqual({ kind: 'ACKNOWLEDGE' });

    const acknowledged = resolveWork(unholdable, { [acknowledgement.key]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED });

    expect(acknowledged.bookReviews).toEqual([]);
    expect(acknowledged.pendingFindingKeys).toEqual([]);
  });

  it('applies the collateral audience, territory and temporal rules unchanged (rule 36)', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('06', 'Confidential praise.', { audiences: ['01'] }) +
          textContent('06', 'For librarians.', { audiences: ['04'] }) +
          textContent('06', 'Embargoed praise.', { dates: contentDate('14', '20990101') }) +
          citedContent('01', { audiences: ['01'], links: ['https://secret.example.org/review'], notes: ['Private.'] }),
      }),
    ]);
    const unanswered = resolveWork(reduced);
    const decision = findingOf(reduced, unanswered, 'REVIEW_AUDIENCE_DECISION_REQUIRED');

    expect(
      findingsOf(reduced, unanswered)
        .filter(({ code }) => code === 'REVIEW_RESTRICTED')
        .map(({ detail }) => detail.redacted),
    ).toEqual([['texts'], ['texts']]);
    expect(JSON.stringify(reduced.plan)).not.toContain('Confidential praise.');
    // A restricted CitedContent is withheld by this reduction itself: never a link or a note repeated (rule 15).
    expect(
      findingsOf(reduced, unanswered)
        .filter(({ code }) => code === 'REVIEW_RESTRICTED')
        .map(({ detail }) => detail.sourceCode),
    ).toEqual(['06', '01']);
    expect(JSON.stringify(reduced.plan)).not.toMatch(/secret\.example\.org|Private\./);
    expect(findingOf(reduced, unanswered, 'REVIEW_TEMPORAL_CONTROL').detail.roles).toEqual(['14']);
    expect(unanswered.bookReviews).toEqual([]);
    expect(optionsOf(decision).map(({ key }) => key)).toEqual([ONIX_REVIEWS_PRIZES_PROJECT, ONIX_REVIEWS_PRIZES_OMIT]);
    expect(
      resolveWork(reduced, { [decision.key]: ONIX_REVIEWS_PRIZES_PROJECT }).bookReviews.map(
        ({ target }) => target.text,
      ),
    ).toEqual(['For librarians.']);
    expect(resolveWork(reduced, { [decision.key]: ONIX_REVIEWS_PRIZES_OMIT }).bookReviews).toEqual([]);
  });
});

describe('previous-edition (07) and previous-Work (08) review quotes (rules 20-21, 92-101)', () => {
  const previous = product({ ref: 'old', isbn: '9781800000025', titleText: 'A Work' });

  it('never attaches 07 to the current Work, and treats no Replaces relation or similar title as its edition (fixture 192)', () => {
    const replaces =
      '<RelatedProduct><ProductRelationCode>03</ProductRelationCode><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9781800000025</IDValue></ProductIdentifier></RelatedProduct>';
    const reduced = reduce([
      product({ collateral: textContent('07', 'The first edition was superb.'), related: replaces }),
      previous,
    ]);

    expect(reduced.sourcePlan.groups).toHaveLength(2);

    const current = resolveWork(reduced, {}, 0);
    const other = resolveWork(reduced, {}, 1);

    expect(current.bookReviews).toEqual([]);
    expect(other.bookReviews).toEqual([]);
    expect(findingOf(reduced, current, 'REVIEW_PREVIOUS_EDITION_UNRESOLVED')).toMatchObject({
      blocking: false,
      classification: 'TARGET_UNREPRESENTABLE',
      locations: [expect.objectContaining({ path: `${COLLATERAL()}/TextContent[1]` })],
    });
    expect(workCandidates(reduced, 1).reviews).toEqual([]);
  });

  it('never looks up the previous Work an 08 quote reviewed, however alike another Work in the file is (fixture 193)', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const reduced = reduce([
      product({
        collateral: textContent('08', 'Her last book was a triumph.', { authors: ['A Reviewer'] }),
        contributors: contributor('The Author'),
      }),
      product({ ref: 'last', isbn: '9781800000025', contributors: contributor('The Author') }),
    ]);

    expect(
      [resolveWork(reduced, {}, 0), resolveWork(reduced, {}, 1)].flatMap(({ bookReviews }) => bookReviews),
    ).toEqual([]);
    expect(reduced.plan.findings.map(({ code }) => code)).toContain('REVIEW_PREVIOUS_WORK_UNREPRESENTABLE');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('endorsements: TextContent 09 -> Endorsement (rules 22, 76-91)', () => {
  it('takes one TextAuthor, or a lone corporate source as display attribution, and invents nothing where neither is stated (fixture 194)', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('09', 'Essential reading.', {
            authors: ['An Endorser'],
            descriptions: ['Professor of Letters'],
          }) +
          textContent('09', 'A landmark.', { corporates: ['The Book Society'] }) +
          textContent('09', 'Unmissable.', { authors: ['Another Endorser'], corporates: ['A Foundation'] }) +
          textContent('09', 'Nobody said this.'),
      }),
    ]);
    const unanswered = resolveWork(reduced);
    const missing = findingOf(reduced, unanswered, 'ENDORSEMENT_ATTRIBUTION_MISSING');
    const attributed = [
      ['An Endorser', 'TEXT_AUTHOR', 1],
      ['The Book Society', 'CORPORATE_SOURCE_DISPLAY', 2],
      ['Another Endorser', 'TEXT_AUTHOR', 3],
    ];
    const attributionsOf = (resolved: Resolved) =>
      resolved.endorsements.map(({ target, orderNumber }) => [target.authorName, target.attributionBasis, orderNumber]);

    // Each endorsement settles on its own: the three attributable ones are planned while the fourth waits.
    expect(attributionsOf(unanswered)).toEqual(attributed);
    expect(missing).toMatchObject({ blocking: true, resolution: { kind: 'ACKNOWLEDGE' } });
    expect(pendingCodes(reduced, unanswered)).toContain('ENDORSEMENT_ATTRIBUTION_MISSING');

    const resolved = resolveWork(reduced, { [missing.key]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED });

    expect(attributionsOf(resolved)).toEqual(attributed);
    expect(pendingCodes(reduced, resolved)).not.toContain('ENDORSEMENT_ATTRIBUTION_MISSING');
    // Never an author role from free text, and never Anonymous, the publisher or the Work's author (rules 81-82).
    expect(JSON.stringify(resolved.endorsements)).not.toContain('Professor of Letters');
    expect(JSON.stringify(resolved.endorsements)).not.toMatch(/Anonymous|Example Press|Nobody said this/);
    expect(
      findingsOf(reduced, resolved)
        .filter(({ code }) => code === 'REVIEW_DETAIL_NOT_IMPORTED')
        .map(({ detail }) => detail.losses),
    ).toEqual([['its source (TextSourceDescription)'], ['its source (TextSourceCorporate)']]);
  });

  it('never joins several endorsement authors: the publisher chooses one, or imports none (fixture 195)', () => {
    const reduced = reduce([
      product({ collateral: textContent('09', 'We both loved it.', { authors: ['One Endorser', 'Two Endorser'] }) }),
    ]);
    const unanswered = resolveWork(reduced);
    const choice = findingOf(reduced, unanswered, 'ENDORSEMENT_ATTRIBUTION_CHOICE_REQUIRED');

    expect(unanswered.endorsements).toEqual([]);
    expect(optionsOf(choice).map(({ label }) => label)).toEqual(['One Endorser', 'Two Endorser', 'OMIT']);
    expect(
      resolveWork(reduced, { [choice.key]: optionsOf(choice)[1].key }).endorsements.map(
        ({ target }) => target.authorName,
      ),
    ).toEqual(['Two Endorser']);
    expect(resolveWork(reduced, { [choice.key]: ONIX_REVIEWS_PRIZES_OMIT }).endorsements).toEqual([]);
  });
});

describe('CitedContent (rules 23-24, 28-31, 56-75)', () => {
  it('maps only a cited review’s link and exact publication day; its note, source, type and rating are never misfiled (fixture 196)', () => {
    const reduced = reduce([
      product({
        collateral: citedContent('01', {
          sourceType: '01',
          sourceTitles: ['The Review Weekly'],
          notes: ['A long and generous notice.'],
          links: ['https://weekly.example.org/notice'],
          rating: '4',
          dates: contentDate('01', '20240301'),
        }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.bookReviews).toEqual([
      expect.objectContaining({
        source: 'CITED_REVIEW',
        target: {
          authorName: null,
          url: 'https://weekly.example.org/notice',
          reviewDate: '2024-03-01',
          text: null,
          textMarkupFormat: null,
        },
      }),
    ]);
    expect(JSON.stringify(resolved.bookReviews)).not.toMatch(/A long and generous notice|The Review Weekly/);
    expect(resolved.bookReviews[0].losses).toEqual(
      expect.arrayContaining([
        'its source and citation (SourceTitle, SourceType 01, CitationNote)',
        'its review rating',
      ]),
    );
  });

  it('describes an audience-less cited review truthfully while keeping the explicit audience decision', () => {
    const reduced = reduce([
      product({
        collateral: citedContent('01', {
          audiences: [],
          links: ['https://paper.example.org/review'],
          sourceTitles: ['The Review Weekly'],
        }),
      }),
    ]);
    const unresolved = resolveWork(reduced);
    const audience = findingOf(reduced, unresolved, 'REVIEW_AUDIENCE_DECISION_REQUIRED');

    expect(audience.detail.audiences).toEqual([]);
    expect(audience.message).toContain('states no ContentAudience');
    expect(audience.message).not.toContain('targeted audiences');
    expect(optionsOf(audience).map(({ key }) => key)).toEqual([
      ONIX_REVIEWS_PRIZES_PROJECT,
      ONIX_REVIEWS_PRIZES_OMIT,
    ]);
    expect(pendingCodes(reduced, unresolved)).toContain('REVIEW_AUDIENCE_DECISION_REQUIRED');
  });

  it('keeps a doi.org ResourceLink a URL, and creates no BookReview from a cited review with no link (fixture 197, rule 69)', () => {
    const reduced = reduce([
      product({
        collateral:
          citedContent('01', { links: ['https://doi.org/10.1234/cited'] }) +
          citedContent('01', { notes: ['Only a note.'], dates: contentDate('01', '20240301') }),
      }),
    ]);
    const resolved = resolveWork(reduced);

    expect(resolved.bookReviews.map(({ target }) => target.url)).toEqual(['https://doi.org/10.1234/cited']);
    expect(resolved.bookReviews[0].target).not.toHaveProperty('doi');
    expect(findingOf(reduced, resolved, 'CITED_REVIEW_NOTHING_REPRESENTABLE').blocking).toBe(false);
  });

  it.each(['02', '03', '04', '05', '06', '07', '08'])(
    'never fabricates an Award, Reference, Endorsement or resource from CitedContent %s (fixture 198)',
    (type) => {
      const reduced = reduce([product({ collateral: citedContent(type, { links: ['https://list.example.org/'] }) })]);
      const resolved = resolveWork(reduced, classify(reduce([product()]), ONIX_PRIZE_WORK_AWARD));

      expect([...resolved.bookReviews, ...resolved.endorsements, ...resolved.awards]).toEqual([]);
      expect(workCandidates(reduced)).toMatchObject({ reviews: [], endorsements: [], prizes: [] });
      expect(findingOf(reduced, resolved, 'CITED_CONTENT_UNREPRESENTABLE').detail.sourceCode).toBe(type);
      expect(reduced.plan.products[reduced.sourcePlan.products[0].productKey].citedContents).toEqual([
        expect.objectContaining({
          citedContentType: type,
          links: [expect.objectContaining({ text: 'https://list.example.org/' })],
        }),
      ]);
    },
  );

  it('never pairs a review quote with a cited review by itself; the publisher’s explicit pairing makes one BookReview (fixture 199)', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('06', 'A marvel of a book.', { authors: ['A Reviewer'] }) +
          citedContent('01', { links: ['https://paper.example.org/marvel'], dates: contentDate('01', '20240301') }),
      }),
    ]);
    const unanswered = resolveWork(reduced);
    const pairing = findingOf(reduced, unanswered, 'REVIEW_PAIRING_AVAILABLE');

    expect(unanswered.bookReviews.map(({ source, orderNumber }) => [source, orderNumber])).toEqual([
      ['REVIEW_QUOTE', 1],
      ['CITED_REVIEW', 2],
    ]);
    expect(pairing).toMatchObject({ blocking: false, resolution: { kind: 'CHOICE' } });

    const [quote] = optionsOf(pairing);
    const paired = resolveWork(reduced, { [pairing.key]: quote.key });

    expect(paired.bookReviews).toEqual([
      expect.objectContaining({
        source: 'PAIRED',
        target: {
          authorName: 'A Reviewer',
          url: 'https://paper.example.org/marvel',
          reviewDate: '2024-03-01',
          text: 'A marvel of a book.',
          textMarkupFormat: MarkupFormat.PlainText,
        },
        orderNumber: 1,
      }),
    ]);
    expect(isOfferedOnixReviewsPrizesAnswer(pairing, 'not-a-quote')).toBe(false);
  });

  it('offers no pairing where the quote and the cited review state conflicting links', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('06', 'Conflicting.', { links: ['https://one.example.org/'] }) +
          citedContent('01', { links: ['https://two.example.org/'] }),
      }),
    ]);

    expect(reduced.plan.findings.map(({ code }) => code)).not.toContain('REVIEW_PAIRING_AVAILABLE');
    expect(resolveWork(reduced).bookReviews).toHaveLength(2);
  });

  it('refuses a quote paired with two cited reviews rather than applying either pairing', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('06', 'One quote.') +
          citedContent('01', { links: ['https://one.example.org/'] }) +
          citedContent('01', { links: ['https://two.example.org/'] }),
      }),
    ]);
    const pairings = reduced.plan.findings.filter(({ code }) => code === 'REVIEW_PAIRING_AVAILABLE');
    const quoteKey = optionsOf(pairings[0])[0].key;
    const resolved = resolveWork(reduced, Object.fromEntries(pairings.map(({ key }) => [key, quoteKey])));

    expect(pendingCodes(reduced, resolved)).toContain('REVIEW_PAIRING_CONFLICT');
    expect(resolved.bookReviews.map(({ source }) => source)).not.toContain('PAIRED');
  });

  it('never makes a review SupportingResource (17) a second BookReview: it stays collateral (fixture 200)', () => {
    const reduced = reduce([
      product({
        collateral: textContent('06', 'Quoted praise.') + resource('17', 'https://example.org/full-review.pdf'),
      }),
    ]);

    expect(resolveWork(reduced).bookReviews.map(({ source, target }) => [source, target.text])).toEqual([
      ['REVIEW_QUOTE', 'Quoted praise.'],
    ]);
    expect(JSON.stringify(reduced.plan)).not.toContain('full-review.pdf');
    expect(reduced.collateral.products[reduced.sourcePlan.products[0].productKey].resources).toEqual([
      expect.objectContaining({ contentType: '17' }),
    ]);
  });
});

describe('decision-neutral target-loss disclosures (CORR-01)', () => {
  const targetLossAfterOmit = (reduced: Reduced, choiceCode: OnixReviewsPrizesFindingCode) => {
    const unanswered = resolveWork(reduced);
    const choice = findingOf(reduced, unanswered, choiceCode);
    const omitted = resolveWork(reduced, { [choice.key]: ONIX_REVIEWS_PRIZES_OMIT });
    const targetLoss = findingOf(reduced, omitted, 'REVIEW_DETAIL_NOT_IMPORTED');

    expect([...omitted.bookReviews, ...omitted.endorsements]).toEqual([]);
    expect(pendingCodes(reduced, omitted)).not.toContain(choiceCode);
    expect(targetLoss.message).not.toMatch(/\bImported as\b/);
    expect(targetLoss.message).toContain('if this item is imported');

    return targetLoss;
  };

  it('stays truthful when targeted review, text, endorsement or cited-link decisions omit the candidate', () => {
    const targeted = reduce([
      product({ collateral: textContent('06', 'For librarians.', { audiences: ['04'] }) }),
    ]);
    const multiText = reduce([
      product({
        collateral: textContent('06', '', {
          texts: [
            [' language="eng"', 'In English.'],
            [' language="fre"', 'En français.'],
          ],
        }),
      }),
    ]);
    const multiAuthorEndorsement = reduce([
      product({
        collateral: textContent('09', 'We both loved it.', {
          authors: ['One Endorser', 'Two Endorser'],
          sourceTitles: ['The Review Journal'],
        }),
      }),
    ]);
    const multiLinkCited = reduce([
      product({
        collateral: citedContent('01', {
          links: ['https://one.example.org/review', 'https://two.example.org/review'],
          sourceTitles: ['The Review Journal'],
        }),
      }),
    ]);

    expect(
      targetLossAfterOmit(targeted, 'REVIEW_AUDIENCE_DECISION_REQUIRED').detail.losses,
    ).toContain('its role as a review quote, which a BookReview does not keep (rule 38)');
    expect(targetLossAfterOmit(multiText, 'REVIEW_TEXT_CHOICE_REQUIRED').detail.losses).toContain(
      'its role as a review quote, which a BookReview does not keep (rule 38)',
    );
    expect(
      targetLossAfterOmit(multiAuthorEndorsement, 'ENDORSEMENT_ATTRIBUTION_CHOICE_REQUIRED').detail.losses,
    ).toContain('its source (SourceTitle)');
    expect(targetLossAfterOmit(multiLinkCited, 'REVIEW_LINK_CHOICE_REQUIRED').detail.losses).toContain(
      'its role as a cited third-party review, which a BookReview does not keep (rule 56)',
    );
  });
});

describe('P.17 Prize -> Work Award (rules 25-26, 102-135)', () => {
  it.each(
    Object.entries({
      '01': 'WINNER',
      '02': 'RUNNER_UP',
      '03': 'COMMENDED',
      '04': 'SHORT_LISTED',
      '05': 'LONG_LISTED',
      '06': 'JOINT_WINNER',
      '07': 'NOMINATED',
    }),
  )('maps PrizeCode %s exactly to AwardRole %s (fixture 201)', (code, role) => {
    const reduced = reduce([product({ collateral: prize('A Prize', { code, year: '2024' }) })]);
    const [award] = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD)).awards;

    expect(award.target.role).toBe(role);
    expect(ONIX_PRIZE_AWARD_ROLES[code]).toBe(role);
  });

  it('leaves the role unset where no PrizeCode is stated, and sets no default (rule 113)', () => {
    const reduced = reduce([product({ collateral: prize('A Prize') })]);

    expect(resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD)).awards[0].target).toMatchObject({
      title: 'A Prize',
      role: null,
      year: null,
      country: null,
      jury: null,
      prizeStatement: null,
      category: null,
      url: null,
    });
    expect(Object.keys(ONIX_PRIZE_AWARD_ROLES).sort()).toEqual(['01', '02', '03', '04', '05', '06', '07']);
    expect(Object.values(ONIX_PRIZE_AWARD_ROLES).sort()).toEqual(Object.values(AwardRole).sort());
  });

  it('starts every P.17 Prize with no scope: a Product award is no Award, a Work award is one (fixtures 202, 14)', () => {
    const reduced = reduce([product({ collateral: prize('The Design Prize', { code: '01' }) })]);
    const unanswered = resolveWork(reduced);
    const scope = findingOf(reduced, unanswered, 'PRIZE_SCOPE_REQUIRED');

    expect(unanswered.awards).toEqual([]);
    expect(pendingCodes(reduced, unanswered)).toEqual(['PRIZE_SCOPE_REQUIRED']);
    expect(optionsOf(scope).map(({ key }) => key)).toEqual([ONIX_PRIZE_WORK_AWARD, ONIX_PRIZE_PRODUCT_AWARD]);

    const asProduct = resolveWork(reduced, { [scope.key]: ONIX_PRIZE_PRODUCT_AWARD });

    expect(asProduct.awards).toEqual([]);
    expect(asProduct.pendingFindingKeys).toEqual([]);
    expect(findingOf(reduced, asProduct, 'PRIZE_PRODUCT_AWARD_UNREPRESENTABLE')).toMatchObject({
      blocking: false,
      classification: 'TARGET_UNREPRESENTABLE',
    });

    const asWork = resolveWork(reduced, { [scope.key]: ONIX_PRIZE_WORK_AWARD });

    expect(asWork.awards.map(({ target }) => [target.title, target.role])).toEqual([
      ['The Design Prize', AwardRole.Winner],
    ]);
  });

  it('keeps Prize target-loss wording truthful before scope, after Product scope, after omission, and for a Work Award', () => {
    const regional = reduce([product({ collateral: prize('The Regional Prize', { region: 'GB-SCT' }) })]);
    const unresolved = resolveWork(regional);
    const scope = findingOf(regional, unresolved, 'PRIZE_SCOPE_REQUIRED');
    const beforeScope = findingOf(regional, unresolved, 'PRIZE_DETAIL_NOT_IMPORTED');

    expect(beforeScope.message).not.toContain('Imported as a Work Award');
    expect(beforeScope.message).toContain('if it is imported as a Work Award');
    expect(beforeScope.detail.losses).toEqual([
      "its region (List 49 GB-SCT), which never sets the Award's country",
    ]);

    const asProduct = resolveWork(regional, { [scope.key]: ONIX_PRIZE_PRODUCT_AWARD });
    const productLoss = findingOf(regional, asProduct, 'PRIZE_DETAIL_NOT_IMPORTED');

    expect(asProduct.awards).toEqual([]);
    expect(productLoss.message).not.toContain('Imported as a Work Award');
    expect(productLoss.message).toContain('if it is imported as a Work Award');

    const asWork = resolveWork(regional, { [scope.key]: ONIX_PRIZE_WORK_AWARD });
    const workLoss = findingOf(regional, asWork, 'PRIZE_DETAIL_NOT_IMPORTED');

    expect(asWork.awards).toHaveLength(1);
    expect(workLoss.detail.losses).toEqual(asWork.awards[0].losses);
    expect(workLoss.message).toContain('if it is imported as a Work Award');

    const named = reduce([
      product({
        collateral: prize('', {
          names: [
            [' language="eng"', 'The Regional Prize'],
            [' language="fre"', 'Le Prix régional'],
          ],
          region: 'GB-SCT',
        }),
      }),
    ]);
    const namedUnresolved = resolveWork(named, classify(named, ONIX_PRIZE_WORK_AWARD));
    const nameChoice = findingOf(named, namedUnresolved, 'PRIZE_NAME_CHOICE_REQUIRED');
    const omitted = resolveWork(
      named,
      classify(named, ONIX_PRIZE_WORK_AWARD, { [nameChoice.key]: ONIX_REVIEWS_PRIZES_OMIT }),
    );
    const omittedLoss = findingOf(named, omitted, 'PRIZE_DETAIL_NOT_IMPORTED');

    expect(omitted.awards).toEqual([]);
    expect(pendingCodes(named, omitted)).not.toContain('PRIZE_NAME_CHOICE_REQUIRED');
    expect(omittedLoss.message).not.toContain('Imported as a Work Award');
    expect(omittedLoss.message).toContain('if it is imported as a Work Award');
  });

  it('never offers a Contributor’s Prize a scope, and never makes it a Work Award, however famous its name (fixture 203)', () => {
    const reduced = reduce([
      product({
        contributors: contributor('The Author', prize('The Nobel Prize in Literature', { code: '01', year: '2020' })),
      }),
    ]);
    const resolved = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));
    const [facts] = Object.values(reduced.plan.products);

    expect(workCandidates(reduced).prizes).toEqual([]);
    expect(resolved.awards).toEqual([]);
    expect(reduced.plan.findings.map(({ code }) => code)).not.toContain('PRIZE_SCOPE_REQUIRED');
    expect(findingOf(reduced, resolved, 'CONTRIBUTOR_PRIZE_UNREPRESENTABLE')).toMatchObject({
      blocking: false,
      locations: [expect.objectContaining({ path: `${PRODUCT()}/DescriptiveDetail[1]/Contributor[1]/Prize[1]` })],
    });
    expect(facts.contributorPrizes).toEqual([
      expect.objectContaining({
        scope: {
          kind: 'CONTRIBUTOR',
          contributorPath: `${PRODUCT()}/DescriptiveDetail[1]/Contributor[1]`,
          componentPath: null,
        },
      }),
    ]);
  });

  it('orders by SequenceNumber and keeps PrizeIdentifier as source identity only (fixture 204)', () => {
    const reduced = reduce([
      product({
        collateral:
          prize('The Second Prize', { seq: '2', identifiers: ['P-2'] }) +
          prize('The First Prize', { seq: '1', identifiers: ['P-1'] }),
      }),
    ]);
    const { awards } = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));

    expect(awards.map(({ target, orderNumber, orderBasis }) => [target.title, orderNumber, orderBasis])).toEqual([
      ['The First Prize', 1, 'SEQUENCE_NUMBER'],
      ['The Second Prize', 2, 'SEQUENCE_NUMBER'],
    ]);
    expect(awards[0].identifiers).toEqual([
      expect.objectContaining({ type: '01', typeName: 'Prize register', value: 'P-1' }),
    ]);
    expect(awards[0].target).not.toHaveProperty('identifier');
    expect(awards[0].losses).toContain('its identifiers, kept as source identity only');
  });

  it('blocks statements that share a PrizeIdentifier but state different facts, whatever their scope (rule 128)', () => {
    const reduced = reduce([
      product({
        collateral:
          prize('The Prize', { identifiers: ['P-1'], year: '2023' }) +
          prize('The Prize', { identifiers: ['P-1'], year: '2024' }),
      }),
    ]);
    const resolved = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));

    expect(resolved.awards).toEqual([]);
    expect(findingOf(reduced, resolved, 'PRIZE_IDENTIFIER_CONFLICT')).toMatchObject({
      blocking: true,
      classification: 'SOURCE_CONFLICT',
      resolution: { kind: 'NONE' },
    });
    expect(pendingCodes(reduced, resolved)).toEqual(['PRIZE_IDENTIFIER_CONFLICT']);
  });

  it('never takes a name, statement or jury by language: each is the publisher’s choice (fixture 205)', () => {
    const reduced = reduce([
      product({
        collateral: prize('', {
          names: [
            [' language="eng"', 'The Translation Prize'],
            [' language="fre"', 'Le Prix de la traduction'],
          ],
          statements: [
            [' language="eng"', 'Awarded for excellence.'],
            [' language="fre"', 'Décerné pour son excellence.'],
          ],
          juries: [
            [' language="eng"', 'A, B and C'],
            [' language="fre"', 'A, B et C'],
          ],
        }),
      }),
    ]);
    const unanswered = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));
    const name = findingOf(reduced, unanswered, 'PRIZE_NAME_CHOICE_REQUIRED');
    const statement = findingOf(reduced, unanswered, 'PRIZE_STATEMENT_CHOICE_REQUIRED');
    const jury = findingOf(reduced, unanswered, 'PRIZE_JURY_CHOICE_REQUIRED');

    expect(unanswered.awards).toEqual([]);
    expect(pendingCodes(reduced, unanswered).sort()).toEqual(
      ['PRIZE_JURY_CHOICE_REQUIRED', 'PRIZE_NAME_CHOICE_REQUIRED', 'PRIZE_STATEMENT_CHOICE_REQUIRED'].sort(),
    );

    const answered = resolveWork(
      reduced,
      classify(reduced, ONIX_PRIZE_WORK_AWARD, {
        [name.key]: optionsOf(name)[1].key,
        [statement.key]: optionsOf(statement)[0].key,
        [jury.key]: ONIX_REVIEWS_PRIZES_NONE,
      }),
    );

    expect(answered.awards[0].target).toMatchObject({
      title: 'Le Prix de la traduction',
      prizeStatement: 'Awarded for excellence.',
      prizeStatementMarkupFormat: MarkupFormat.PlainText,
      jury: null,
    });
  });

  it('maps a crosswalked country, keeps a region as a loss, and never makes a country from a region (fixture 206)', () => {
    const both = reduce([product({ collateral: prize('A Prize', { country: 'GB', region: 'GB-SCT' }) })]);
    const regionOnly = reduce([product({ collateral: prize('A Prize', { region: 'GB-SCT' }) })]);
    const gone = reduce([product({ collateral: prize('A Prize', { country: 'YU' }) })]);
    const [withCountry] = resolveWork(both, classify(both, ONIX_PRIZE_WORK_AWARD)).awards;
    const [withRegion] = resolveWork(regionOnly, classify(regionOnly, ONIX_PRIZE_WORK_AWARD)).awards;
    const [unsupported] = resolveWork(gone, classify(gone, ONIX_PRIZE_WORK_AWARD)).awards;

    expect(withCountry.target.country).toBe(CountryCode.Gbr);
    expect(withCountry.losses).toContain("its region (List 49 GB-SCT), which never sets the Award's country");
    expect(withRegion.target.country).toBeNull();
    expect(withRegion.losses).toContain("its region (List 49 GB-SCT), which never sets the Award's country");
    expect(unsupported.target.country).toBeNull();
    expect(unsupported.losses).toContain('its country (List 91 YU), which Thoth has no country for');
  });

  it('crosswalks every pinned List 91 country to a Thoth country, or names it unsupported', () => {
    const thoth = new Set<string>(Object.values(CountryCode));

    [...ONIX_PINNED_COUNTRIES].forEach((code) =>
      expect(ONIX_PRIZE_COUNTRIES.has(code) !== ONIX_PRIZE_COUNTRIES_UNSUPPORTED.has(code)).toBe(true),
    );
    [...ONIX_PRIZE_COUNTRIES.values()].forEach((country) => expect(thoth.has(country)).toBe(true));
    expect(new Set(ONIX_PRIZE_COUNTRIES.values()).size).toBe(ONIX_PRIZE_COUNTRIES.size);
    expect(ONIX_PRIZE_COUNTRIES.get('KP')).toBe(CountryCode.Prk);
    expect(ONIX_PRIZE_COUNTRIES.get('KR')).toBe(CountryCode.Kor);
    expect([...ONIX_PRIZE_COUNTRIES_UNSUPPORTED].sort()).toEqual(['AN', 'CS', 'YU']);
  });

  it('keeps the awarding body a loss, and never parses a role, year or category out of free text (rules 16, 125, 129-130)', () => {
    const reduced = reduce([
      product({
        collateral: prize('A Prize', {
          awardingBody: 'The Prize Foundation',
          statements: [['', 'Shortlisted in 2019 in the Fiction category.']],
        }),
      }),
    ]);
    const [award] = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD)).awards;

    expect(award.target).toMatchObject({ role: null, year: null, category: null, url: null, jury: null });
    expect(award.losses).toContain('its awarding body, which an Award never takes as its title, category or jury');
    expect(JSON.stringify(award.target)).not.toContain('The Prize Foundation');
  });
});

describe('ordering (rules 132-135, 147-150)', () => {
  it('orders an entirely unsequenced set by source order, as an explicit target display normalisation (fixture 207)', () => {
    const reduced = reduce([product({ collateral: prize('First') + prize('Second') + prize('Third') })]);
    const { awards } = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));

    expect(awards.map(({ target, orderNumber, orderBasis }) => [target.title, orderNumber, orderBasis])).toEqual([
      ['First', 1, 'SOURCE_ORDER_TARGET_NORMALIZATION'],
      ['Second', 2, 'SOURCE_ORDER_TARGET_NORMALIZATION'],
      ['Third', 3, 'SOURCE_ORDER_TARGET_NORMALIZATION'],
    ]);
  });

  it('holds a partly sequenced set until the publisher takes the file order (fixture 207)', () => {
    const reduced = reduce([product({ collateral: prize('Numbered', { seq: '1' }) + prize('Unnumbered') })]);
    const unanswered = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));
    const order = findingOf(reduced, unanswered, 'REVIEWS_PRIZES_ORDER_UNRESOLVED');

    expect(unanswered.awards).toEqual([]);
    expect(order).toMatchObject({
      blocking: true,
      classification: 'TARGET_INPUT_REQUIRED',
      detail: { child: 'AWARD', reason: 'MIXED_NUMBERING' },
      resolution: { kind: 'ACKNOWLEDGE' },
    });
    expect(pendingCodes(reduced, unanswered)).toEqual(['REVIEWS_PRIZES_ORDER_UNRESOLVED']);

    const answered = resolveWork(
      reduced,
      classify(reduced, ONIX_PRIZE_WORK_AWARD, { [order.key]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED }),
    );

    expect(
      answered.awards.map(({ target, orderNumber, orderBasis }) => [target.title, orderNumber, orderBasis]),
    ).toEqual([
      ['Numbered', 1, 'PUBLISHER_FILE_ORDER'],
      ['Unnumbered', 2, 'PUBLISHER_FILE_ORDER'],
    ]);
  });

  it('does not let mixed numbering hide duplicate Prize ordinals', () => {
    const reduced = reduce([
      product({
        collateral:
          prize('First duplicate', { seq: '1' }) +
          prize('Second duplicate', { seq: '1' }) +
          prize('Unnumbered'),
      }),
    ]);
    const unanswered = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));
    const order = findingOf(reduced, unanswered, 'REVIEWS_PRIZES_ORDER_UNRESOLVED');

    expect(order).toMatchObject({
      classification: 'SOURCE_CONFLICT',
      detail: { child: 'AWARD', reason: 'DUPLICATE_NUMBERS' },
      resolution: { kind: 'NONE' },
    });

    const staleAcknowledgement = resolveWork(
      reduced,
      classify(reduced, ONIX_PRIZE_WORK_AWARD, {
        [order.key]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
      }),
    );

    expect(staleAcknowledgement.awards).toEqual([]);
    expect(pendingCodes(reduced, staleAcknowledgement)).toContain('REVIEWS_PRIZES_ORDER_UNRESOLVED');
    expect(JSON.stringify(staleAcknowledgement)).not.toContain('PUBLISHER_FILE_ORDER');
  });

  it('does not let mixed numbering hide a grouped Prize ordinal conflict', () => {
    const reduced = reduce([
      product({
        ref: 'pb',
        isbn: '9781800000018',
        collateral: prize('Same Prize', { seq: '1' }) + prize('Unnumbered'),
        workDoi: '10.1234/work',
      }),
      product({
        ref: 'eb',
        isbn: '9781800000025',
        form: 'EB',
        collateral: prize('Same Prize', { seq: '2' }),
        workDoi: '10.1234/work',
      }),
    ]);
    const unanswered = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));
    const order = findingOf(reduced, unanswered, 'REVIEWS_PRIZES_ORDER_UNRESOLVED');

    expect(workCandidates(reduced).prizes.find(({ names }) => names[0]?.name === 'Same Prize')?.sequenceNumbers).toEqual([
      '1',
      '2',
    ]);
    expect(order).toMatchObject({
      classification: 'SOURCE_CONFLICT',
      detail: { child: 'AWARD', reason: 'CONFLICTING_NUMBERS' },
      resolution: { kind: 'NONE' },
    });

    const staleAcknowledgement = resolveWork(
      reduced,
      classify(reduced, ONIX_PRIZE_WORK_AWARD, {
        [order.key]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
      }),
    );

    expect(staleAcknowledgement.awards).toEqual([]);
    expect(pendingCodes(reduced, staleAcknowledgement)).toContain('REVIEWS_PRIZES_ORDER_UNRESOLVED');
    expect(JSON.stringify(staleAcknowledgement)).not.toContain('PUBLISHER_FILE_ORDER');
  });

  it('does not let mixed numbering hide an out-of-target-range ordinal', () => {
    const reduced = reduce(
      [
        product({
          collateral: prize('Too large', { seq: '2147483648' }) + prize('Unnumbered'),
        }),
      ],
      { release: '3.1' },
    );
    const unanswered = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));
    const order = findingOf(reduced, unanswered, 'REVIEWS_PRIZES_ORDER_UNRESOLVED');

    expect(order).toMatchObject({
      classification: 'TARGET_UNREPRESENTABLE',
      detail: { child: 'AWARD', reason: 'INVALID_NUMBERS', sequenceNumbers: ['2147483648'] },
      resolution: { kind: 'NONE' },
    });

    const staleAcknowledgement = resolveWork(
      reduced,
      classify(reduced, ONIX_PRIZE_WORK_AWARD, {
        [order.key]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
      }),
    );

    expect(staleAcknowledgement.awards).toEqual([]);
    expect(pendingCodes(reduced, staleAcknowledgement)).toContain('REVIEWS_PRIZES_ORDER_UNRESOLVED');
    expect(JSON.stringify(staleAcknowledgement)).not.toContain('PUBLISHER_FILE_ORDER');
  });

  it('does not let mixed numbering hide duplicate Endorsement ordinals', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('09', 'First endorsement.', { authors: ['First Endorser'], seq: '1' }) +
          textContent('09', 'Second endorsement.', { authors: ['Second Endorser'], seq: '1' }) +
          textContent('09', 'Unnumbered endorsement.', { authors: ['Third Endorser'] }),
      }),
    ]);
    const unanswered = resolveWork(reduced);
    const order = findingOf(reduced, unanswered, 'REVIEWS_PRIZES_ORDER_UNRESOLVED');

    expect(order).toMatchObject({
      classification: 'SOURCE_CONFLICT',
      detail: { child: 'ENDORSEMENT', reason: 'DUPLICATE_NUMBERS' },
      resolution: { kind: 'NONE' },
    });

    const staleAcknowledgement = resolveWork(reduced, {
      [order.key]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
    });

    expect(staleAcknowledgement.endorsements).toEqual([]);
    expect(pendingCodes(reduced, staleAcknowledgement)).toContain('REVIEWS_PRIZES_ORDER_UNRESOLVED');
    expect(JSON.stringify(staleAcknowledgement)).not.toContain('PUBLISHER_FILE_ORDER');
  });

  it('does not let mixed constructs hide duplicate TextContent review ordinals', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('06', 'First quote.', { seq: '1' }) +
          textContent('06', 'Second quote.', { seq: '1' }) +
          citedContent('01', { seq: '2', links: ['https://example.org/cited-review'] }),
      }),
    ]);
    const unanswered = resolveWork(reduced);
    const order = findingOf(reduced, unanswered, 'REVIEWS_PRIZES_ORDER_UNRESOLVED');

    expect(order).toMatchObject({
      classification: 'SOURCE_CONFLICT',
      detail: { child: 'BOOK_REVIEW', reason: 'DUPLICATE_NUMBERS' },
      resolution: { kind: 'NONE' },
    });

    const staleAcknowledgement = resolveWork(reduced, {
      [order.key]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
    });

    expect(staleAcknowledgement.bookReviews).toEqual([]);
    expect(pendingCodes(reduced, staleAcknowledgement)).toContain('REVIEWS_PRIZES_ORDER_UNRESOLVED');
    expect(JSON.stringify(staleAcknowledgement)).not.toContain('PUBLISHER_FILE_ORDER');
  });

  it('keeps duplicate and conflicting ordinals as non-resolvable source conflicts', () => {
    const grouped = (first: string, second: string) =>
      reduce([
        product({ ref: 'pb', isbn: '9781800000018', collateral: first, workDoi: '10.1234/work' }),
        product({ ref: 'eb', isbn: '9781800000025', form: 'EB', collateral: second, workDoi: '10.1234/work' }),
      ]);
    const duplicate = grouped(prize('One', { seq: '1' }), prize('Another', { seq: '1' }));
    const conflicting = grouped(prize('Same', { seq: '1' }), prize('Same', { seq: '2' }));
    const orderOf = (reduced: Reduced) =>
      findingOf(
        reduced,
        resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD)),
        'REVIEWS_PRIZES_ORDER_UNRESOLVED',
      );

    expect(duplicate.sourcePlan.groups).toHaveLength(1);
    const duplicateOrder = orderOf(duplicate);
    expect(duplicateOrder).toMatchObject({
      classification: 'SOURCE_CONFLICT',
      detail: { reason: 'DUPLICATE_NUMBERS' },
      resolution: { kind: 'NONE' },
    });
    const duplicateWithAcknowledgement = resolveWork(
      duplicate,
      classify(duplicate, ONIX_PRIZE_WORK_AWARD, {
        [duplicateOrder.key]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
      }),
    );
    expect(duplicateWithAcknowledgement.awards).toEqual([]);
    expect(pendingCodes(duplicate, duplicateWithAcknowledgement)).toContain('REVIEWS_PRIZES_ORDER_UNRESOLVED');

    // The same prize, stated with a different SequenceNumber by each manifestation, is one prize whose order contradicts itself.
    expect(conflicting.sourcePlan.groups).toHaveLength(1);
    expect(workCandidates(conflicting).prizes.map(({ sequenceNumbers }) => sequenceNumbers)).toEqual([['1', '2']]);
    const conflictingOrder = orderOf(conflicting);
    expect(conflictingOrder).toMatchObject({
      classification: 'SOURCE_CONFLICT',
      detail: { reason: 'CONFLICTING_NUMBERS' },
      resolution: { kind: 'NONE' },
    });
    const conflictingWithAcknowledgement = resolveWork(
      conflicting,
      classify(conflicting, ONIX_PRIZE_WORK_AWARD, {
        [conflictingOrder.key]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
      }),
    );
    expect(conflictingWithAcknowledgement.awards).toEqual([]);
    expect(pendingCodes(conflicting, conflictingWithAcknowledgement)).toContain(
      'REVIEWS_PRIZES_ORDER_UNRESOLVED',
    );
  });

  it('keeps a source-valid SequenceNumber outside the target ordinal domain non-resolvable', () => {
    const reduced = reduce(
      [product({ collateral: prize('Too large for a Thoth ordinal', { seq: '2147483648' }) })],
      { release: '3.1' },
    );
    const unresolved = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));
    const order = findingOf(reduced, unresolved, 'REVIEWS_PRIZES_ORDER_UNRESOLVED');

    expect(order).toMatchObject({
      classification: 'TARGET_UNREPRESENTABLE',
      detail: { reason: 'INVALID_NUMBERS', sequenceNumbers: ['2147483648'] },
      resolution: { kind: 'NONE' },
    });
    expect(unresolved.awards).toEqual([]);
    expect(pendingCodes(reduced, unresolved)).toContain('REVIEWS_PRIZES_ORDER_UNRESOLVED');

    const staleAcknowledgement = resolveWork(
      reduced,
      classify(reduced, ONIX_PRIZE_WORK_AWARD, {
        [order.key]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
      }),
    );

    expect(staleAcknowledgement.awards).toEqual([]);
    expect(pendingCodes(reduced, staleAcknowledgement)).toContain('REVIEWS_PRIZES_ORDER_UNRESOLVED');
  });

  it('keeps equal SequenceNumbers across different constructs eligible for explicit mixed-construct file order', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('06', 'Quoted.', { seq: '1' }) +
          citedContent('01', { seq: '1', links: ['https://example.org/r'] }),
      }),
    ]);
    const unanswered = resolveWork(reduced);
    const order = findingOf(reduced, unanswered, 'REVIEWS_PRIZES_ORDER_UNRESOLVED');

    expect(unanswered.bookReviews).toEqual([]);
    expect(order).toMatchObject({
      classification: 'TARGET_INPUT_REQUIRED',
      detail: { child: 'BOOK_REVIEW', reason: 'MIXED_CONSTRUCTS' },
      resolution: { kind: 'ACKNOWLEDGE' },
    });

    const acknowledged = resolveWork(reduced, {
      [order.key]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
    });

    expect(acknowledged.bookReviews.map(({ orderNumber, orderBasis }) => [orderNumber, orderBasis])).toEqual([
      [1, 'PUBLISHER_FILE_ORDER'],
      [2, 'PUBLISHER_FILE_ORDER'],
    ]);
    expect(pendingCodes(reduced, acknowledged)).not.toContain('REVIEWS_PRIZES_ORDER_UNRESOLVED');
  });

  it('gives two of each child explicit, positive and unique order numbers - never a service default (fixture 211)', () => {
    const reduced = reduce([
      product({
        collateral:
          textContent('06', 'Review one.', { seq: '1' }) +
          textContent('06', 'Review two.', { seq: '3' }) +
          textContent('09', 'Endorsement one.', { authors: ['E One'], seq: '2' }) +
          textContent('09', 'Endorsement two.', { authors: ['E Two'], seq: '4' }) +
          prize('Prize one') +
          prize('Prize two'),
      }),
    ]);
    const resolved = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));
    const numbers = (intents: readonly { readonly orderNumber: number }[]) =>
      intents.map(({ orderNumber }) => orderNumber);

    expect(numbers(resolved.bookReviews)).toEqual([1, 3]);
    expect(numbers(resolved.endorsements)).toEqual([2, 4]);
    expect(numbers(resolved.awards)).toEqual([1, 2]);
    [resolved.bookReviews, resolved.endorsements, resolved.awards].forEach((intents) => {
      expect(new Set(numbers(intents)).size).toBe(intents.length);
      numbers(intents).forEach((orderNumber) => expect(orderNumber).toBeGreaterThan(0));
    });
    // Every child waits on nothing: each is held whole for execution to create (thoth-app#187).
    expect(pendingCodes(reduced, resolved)).toEqual([]);
    expect([...resolved.bookReviews, ...resolved.endorsements, ...resolved.awards].map(({ action }) => action)).toEqual(
      Array(6).fill('CREATE'),
    );
  });
});

describe('grouped manifestations (rules 136-146; fixture 208)', () => {
  const grouped = (first: string, second: string) =>
    reduce([
      product({ ref: 'pb', isbn: '9781800000018', collateral: first, workDoi: '10.1234/work' }),
      product({ ref: 'eb', isbn: '9781800000025', form: 'EB', collateral: second, workDoi: '10.1234/work' }),
    ]);

  it('collapses exactly equal statements across manifestations, keeping every source location', () => {
    const same =
      textContent('06', 'The same review.', { authors: ['A Reviewer'] }) + prize('The Same Prize', { code: '04' });
    const reduced = grouped(same, same);
    const resolved = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));

    expect(resolved.bookReviews).toHaveLength(1);
    expect(resolved.bookReviews[0].locations.map(({ path }) => path)).toEqual([
      `${COLLATERAL(1)}/TextContent[1]`,
      `${COLLATERAL(2)}/TextContent[1]`,
    ]);
    expect(resolved.awards).toHaveLength(1);
    expect(resolved.awards[0].locations).toHaveLength(2);
    expect(findingsOf(reduced, resolved).map(({ code }) => code)).toEqual(
      expect.arrayContaining(['REVIEW_COLLAPSED', 'PRIZE_COLLAPSED']),
    );
  });

  it('keeps distinct statements apart, and never merges near-identical ones (fuzzy)', () => {
    const reduced = grouped(
      textContent('06', 'A splendid book.', { authors: ['A Reviewer'] }) + prize('The Prize', { year: '2023' }),
      textContent('06', 'A splendid book!', { authors: ['A Reviewer'] }) + prize('The Prize', { year: '2024' }),
    );
    const resolved = resolveWork(reduced, classify(reduced, ONIX_PRIZE_WORK_AWARD));

    expect(resolved.bookReviews.map(({ target }) => target.text)).toEqual(['A splendid book.', 'A splendid book!']);
    expect(resolved.awards.map(({ target }) => target.year)).toEqual(['2023', '2024']);
    expect(findingsOf(reduced, resolved).map(({ code }) => code)).not.toContain('REVIEW_COLLAPSED');
  });

  it('never merges endorsements by author, nor reviews by author and link, when anything they state differs', () => {
    const reduced = grouped(
      textContent('09', 'Brilliant.', { authors: ['An Endorser'] }) +
        textContent('06', 'Good.', { authors: ['A Reviewer'], links: ['https://example.org/r'] }),
      textContent('09', 'Brilliant indeed.', { authors: ['An Endorser'] }) +
        textContent('06', 'Very good.', { authors: ['A Reviewer'], links: ['https://example.org/r'] }),
    );
    const resolved = resolveWork(reduced);

    expect(resolved.endorsements).toHaveLength(2);
    expect(resolved.bookReviews).toHaveLength(2);
  });
});

describe('scope (rules 151-158)', () => {
  it('keeps a chapter’s reviews, endorsements and cited reviews at the chapter as losses, never the Work’s (fixture 209)', () => {
    const chapter = `${PRODUCT()}/ContentDetail[1]/ContentItem[1]`;
    const reduced = reduce([
      product({
        collateral: textContent('06', 'The book review.'),
        items: [
          contentItem(
            '03',
            textContent('06', 'The chapter review.') +
              textContent('09', 'The chapter endorsement.', { authors: ['An Endorser'] }) +
              citedContent('01', { links: ['https://example.org/chapter-review'] }),
          ),
        ],
      }),
    ]);
    const work = resolveWork(reduced);
    const component = resolveOnixReviewsPrizesComponent(
      reduced.plan,
      reduced.sourcePlan.products[0].productKey,
      chapter,
      'CHAPTER',
      { describe: 'the chapter' },
    );
    const byKey = new Map(reduced.plan.findings.map((finding) => [finding.key, finding]));

    expect(work.bookReviews.map(({ target }) => target.text)).toEqual(['The book review.']);
    expect(work.endorsements).toEqual([]);
    expect([...component.bookReviews, ...component.endorsements, ...component.awards]).toEqual([]);
    expect(
      component.findingKeys.map((key) => [
        byKey.get(key)?.code,
        byKey.get(key)?.componentPath,
        byKey.get(key)?.locations[0].path,
      ]),
    ).toEqual([
      ['REVIEW_CHAPTER_UNREPRESENTABLE', chapter, `${chapter}/TextContent[1]`],
      ['REVIEW_CHAPTER_UNREPRESENTABLE', chapter, `${chapter}/TextContent[2]`],
      ['REVIEW_CHAPTER_UNREPRESENTABLE', chapter, `${chapter}/CitedContent[1]`],
    ]);
    expect(work.findingKeys.some((key) => byKey.get(key)?.componentPath === chapter)).toBe(false);
  });

  it('discloses the reviews of an AVItem with its Work, and never moves them to the Work (rule 161)', () => {
    const avItem =
      '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><AVItem><AVItemType>01</AVItemType></AVItem>' +
      `${title('A Clip', '04')}${textContent('06', 'A clip review.')}</ContentItem>`;
    const reduced = reduce([product({ items: [avItem] })]);
    const resolved = resolveWork(reduced);

    expect(resolved.bookReviews).toEqual([]);
    expect(findingOf(reduced, resolved, 'REVIEW_COMPONENT_NOT_PLANNED')).toMatchObject({
      blocking: false,
      componentPath: `${PRODUCT()}/ContentDetail[1]/ContentItem[1]`,
      detail: { componentKind: 'AV_ITEM' },
    });
  });

  it('plans a contained non-chapter Work’s own reviews at its own scope, never its parent’s (fixture 210)', () => {
    const embedded = `${PRODUCT()}/ContentDetail[1]/ContentItem[1]`;
    const reduced = reduce([
      product({
        items: [contentItem('01', textContent('06', 'The contained work review.', { authors: ['A Reviewer'] }))],
      }),
    ]);
    const contained = resolveOnixReviewsPrizesComponent(
      reduced.plan,
      reduced.sourcePlan.products[0].productKey,
      embedded,
      'CONTAINED_WORK',
      { describe: 'the contained Work' },
    );

    expect(resolveWork(reduced).bookReviews).toEqual([]);
    expect(contained.bookReviews).toEqual([
      expect.objectContaining({
        componentPath: embedded,
        target: expect.objectContaining({ text: 'The contained work review.', authorName: 'A Reviewer' }),
        orderNumber: 1,
      }),
    ]);
  });
});

describe('the collateral foundation (thoth-app#225) and answer binding', () => {
  it('consumes REL-01C’s own TextContent facts rather than reading TextContent again', () => {
    const faithful = reduce([product({ collateral: textContent('06', 'As stated.') })]);
    const altered = reduce([product({ collateral: textContent('06', 'As stated.') })], {
      collateral: (plan) => ({
        ...plan,
        products: Object.fromEntries(
          Object.entries(plan.products).map(([key, facts]) => [
            key,
            {
              ...facts,
              textContents: facts.textContents.map((fact) => ({
                ...fact,
                texts: fact.texts.map((text) => ({ ...text, text: 'As the collateral reduction states it.' })),
              })),
            },
          ]),
        ),
      }),
    });
    const withoutFacts = reduce([product({ collateral: textContent('06', 'As stated.') })], {
      collateral: (plan) => ({
        ...plan,
        products: Object.fromEntries(
          Object.entries(plan.products).map(([key, facts]) => [key, { ...facts, textContents: [] }]),
        ),
      }),
    });

    expect(resolveWork(faithful).bookReviews.map(({ target }) => target.text)).toEqual(['As stated.']);
    expect(resolveWork(altered).bookReviews.map(({ target }) => target.text)).toEqual([
      'As the collateral reduction states it.',
    ]);
    expect(resolveWork(withoutFacts).bookReviews).toEqual([]);
    expect(faithful.plan.products[faithful.sourcePlan.products[0].productKey].textContentFactKeys).toEqual(
      faithful.collateral.products[faithful.sourcePlan.products[0].productKey].textContents.map(
        ({ factKey }) => factKey,
      ),
    );
  });

  it('reads nothing from the network, and reduces the same file to the same plan every time', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const file = [
      product({
        collateral:
          textContent('06', 'A review.', { links: ['https://example.org/r'] }) +
          citedContent('01', { links: ['https://example.org/c'] }) +
          prize('A Prize'),
      }),
    ];
    const once = reduce(file);
    const twice = reduce(file);

    expect(JSON.stringify(twice.plan)).toBe(JSON.stringify(once.plan));
    expect(JSON.parse(JSON.stringify(once.plan))).toEqual(once.plan);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('binds every answer to the exact facts it answers: a changed fact is asked afresh, and a stale answer applies nothing', () => {
    const reduced = reduce([product({ collateral: prize('The Prize', { code: '01' }) })]);
    const changed = reduce([product({ collateral: prize('The Prize', { code: '02' }) })]);
    const scope = workCandidates(reduced).prizes[0].scopeFindingKey;
    const changedScope = workCandidates(changed).prizes[0].scopeFindingKey;
    const stale = resolveWork(changed, { [scope]: ONIX_PRIZE_WORK_AWARD });

    expect(changedScope).not.toBe(scope);
    expect(stale.awards).toEqual([]);
    expect(stale.pendingFindingKeys).toEqual([changedScope]);
    expect(isOfferedOnixReviewsPrizesAnswer({ resolution: { kind: 'NONE' } }, ONIX_REVIEWS_PRIZES_ACKNOWLEDGED)).toBe(
      false,
    );
    expect(resolveWork(reduced, { [scope]: 'SOMETHING_ELSE' }).pendingFindingKeys).toEqual([scope]);
  });
});
