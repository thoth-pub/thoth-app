import { LanguageCode, LanguageRelation, LocaleCode } from '@/gql/graphql';
import type { PublicationType as PublicationTypeValue } from '@/src/entities/publication/model/publication.types';
import { PublicationType } from '@/src/shared/constants/publications';
import { WorkStatuses, WorkTypes } from '@/src/shared/constants/work';
import { getDefaultPublication } from '@/src/shared/utils/publications';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import { ONIX_REGRESSION_PUBLISHER_ID } from '../../pipeline';
import type {
  OnixBlockerEntry,
  OnixExistingTargetState,
  OnixPlanningExpectation,
  OnixReconciliationLedger,
  OnixTargetLedger,
} from '../../types';

const { Epub, Pdf, Paperback } = PublicationType.enum;
const { Monograph, Textbook } = WorkTypes.enum;

/**
 * Identity holds, the facts do not (thoth-app#250). The file's Work DOI names exactly one existing Work, and its PDF's
 * ISBN is a Publication of that Work - but Thoth holds that Publication as a paperback, the Work as edition 2 under
 * another title, while the file says edition 1, its own title, and an EPUB Thoth does not hold.
 *
 * Contract authority: the existing-target contradictions (#182 `resolveGroupTarget` and the Product actions: a Product
 * whose ISBN is on the target with another PublicationType is EXISTING_PUBLICATION_TYPE_CONTRADICTION; a would-be
 * attachment blocks on any edition, DOI or imprint difference as EXISTING_WORK_CONTRADICTION, and only discloses it when
 * nothing would attach); the family-by-family comparison of an attachment (#183 amendments `5665475597`, `5667182357`:
 * a contradicted family blocks as EXISTING_WORK_DESCRIPTIVE_CONTRADICTION); an existing Work's WorkType is its own, so an
 * override against it is WORK_TYPE_OVERRIDE_CONFLICT (#179 6036599101 A; #261). Every one is a SOURCE_CONFLICT no answer
 * clears: each scenario's plan is blocked before execution, and nothing is written.
 */

const PDF = 'product:gtin13:9781800060050';
const EPUB = 'product:gtin13:9781800060067';
const GROUP = `work:${PDF}`;
const IMPRINT = '11111111-1111-4111-8111-111111111111';
const DOI = 'https://doi.org/10.5555/regression.e04';
const WORK_ID = '00000000-0000-4000-8000-000000250501';
const PUBLICATION_ID = '00000000-0000-4000-8000-000000250502';
const EXISTING_TITLE = 'A Different Existing Title';
const P = (product: number) => `/ONIXMessage[1]/Product[${product}]`;

/** The existing Work, exactly as `WorkService.getWork` returns it: edition 2, another title, the ISBN as a paperback. */
const EXISTING_WORK = getDefaultWork({
  id: WORK_ID,
  type: Monograph,
  status: WorkStatuses.enum.Active,
  imprintId: IMPRINT,
  imprintName: 'Regression Press',
  doi: DOI,
  edition: 2,
  publicationDate: '2025-03-01',
  titles: [
    getDefaultTitle({
      id: '00000000-0000-4000-8000-000000250503',
      canonical: true,
      title: EXISTING_TITLE,
      fullTitle: EXISTING_TITLE,
      localeCode: LocaleCode.En,
    }),
  ],
  languages: [
    { id: '00000000-0000-4000-8000-000000250504', code: LanguageCode.Eng, relation: LanguageRelation.Original },
  ],
  publications: [getDefaultPublication({ id: PUBLICATION_ID, type: Paperback, isbn: '978-1-80006-005-0' })],
});

const MATCH = { workId: WORK_ID, title: EXISTING_TITLE, imprintId: IMPRINT, doi: DOI, isbns: ['978-1-80006-005-0'] };

/** What Thoth holds: exact identity finds the Work by its DOI and by the PDF's ISBN, never the EPUB; it is read once. */
const THOTH: OnixExistingTargetState = {
  kind: 'EXISTING_TARGET',
  reads: [
    {
      method: 'findWorks',
      publisherId: ONIX_REGRESSION_PUBLISHER_ID,
      identifiers: [
        { basis: 'doi', value: DOI },
        { basis: 'isbn', value: '9781800060050' },
        { basis: 'isbn', value: '9781800060067' },
      ],
      matches: { [`doi:${DOI}`]: [MATCH], 'isbn:9781800060050': [MATCH], 'isbn:9781800060067': [] },
    },
    { method: 'getWork', workId: WORK_ID, work: EXISTING_WORK },
  ],
};

type Answers = 'AS_UPLOADED' | 'OVERRIDE' | 'OMIT_EPUB';

/** The type contradiction: the PDF's ISBN is on the target, as a paperback. No answer changes either fact. */
const TYPE_CONTRADICTION: OnixBlockerEntry = {
  code: 'EXISTING_PUBLICATION_TYPE_CONTRADICTION',
  classification: 'SOURCE_CONFLICT',
  recordKey: null,
  productKey: PDF,
  groupKey: null,
};

const blockers = (answers: Answers): OnixBlockerEntry[] =>
  answers === 'OMIT_EPUB'
    ? // Nothing would attach any more: the title and the edition stop blocking and are disclosed instead.
      [TYPE_CONTRADICTION]
    : [
        TYPE_CONTRADICTION,
        // The EPUB would attach, so its title is compared with the existing Work's - and contradicts it.
        {
          code: 'EXISTING_WORK_DESCRIPTIVE_CONTRADICTION',
          classification: 'SOURCE_CONFLICT',
          recordKey: 'record:2',
          productKey: EPUB,
          groupKey: GROUP,
        },
        // A would-be attachment blocks on the edition the file states against the one Thoth holds.
        {
          code: 'EXISTING_WORK_CONTRADICTION',
          classification: 'SOURCE_CONFLICT',
          recordKey: null,
          productKey: null,
          groupKey: GROUP,
        },
        // The existing Work keeps its WorkType: an override against it is a contradiction, never an answer.
        ...(answers === 'OVERRIDE'
          ? [
              {
                code: 'WORK_TYPE_OVERRIDE_CONFLICT',
                classification: 'SOURCE_CONFLICT' as const,
                recordKey: null,
                productKey: null,
                groupKey: GROUP,
              },
            ]
          : []),
      ];

const TARGET = (answers: Answers): OnixTargetLedger => ({
  findings: [],
  identity: {
    compatibility: { headerMatches: false, ignoredNativeRecordKeys: [], activation: 'NOT_APPLICABLE' },
    // Identity itself is exact: one Work DOI, one existing Work.
    groups: [
      {
        groupKey: GROUP,
        compatibility: 'GENERIC',
        thothVerification: 'NOT_APPLICABLE',
        edges: [{ kind: 'WORK_IDENTITY', key: `workdoi:${DOI}`, productKeys: [PDF, EPUB] }],
        evidence: [{ kind: 'WORK_DOI', doi: DOI, workId: WORK_ID }],
      },
    ],
    products: [
      {
        productKey: PDF,
        recordKeys: ['record:1'],
        evidence: [{ kind: 'ISBN_MATCH', isbn: '9781800060050', workId: WORK_ID, publicationId: PUBLICATION_ID }],
        omittable: false,
      },
      {
        productKey: EPUB,
        recordKeys: ['record:2'],
        // A contradicted would-be attachment has no action and no evidence of one; omitted, it says so.
        evidence: answers === 'OMIT_EPUB' ? [{ kind: 'MANIFESTATION_OMITTED', reason: 'PUBLISHER_CHOICE' }] : [],
        omittable: true,
      },
    ],
  },
  descriptive: [
    {
      groupKey: GROUP,
      subjects: [],
      primaryChoices: [],
      series: [],
      noCollection: false,
      lifecycle: { status: { kind: 'VALUE', status: 'ACTIVE' }, publicationDate: '2025-03-01', withdrawnDate: null },
      cover: { kind: 'ABSENT' },
      profileCover: { kind: 'ABSENT' },
    },
  ],
  commercial: [PDF, EPUB].map((productKey) => ({
    productKey,
    supplies: [],
    prices: [],
    carriers: { DIGITAL: { kind: 'NONE' as const } },
    plannedLocations: [],
  })),
  priceResolutions: [],
  rights: {
    products: [PDF, EPUB].map((productKey) => ({
      productKey,
      carrier: 'DIGITAL' as const,
      expressions: [],
      licence: { kind: 'SILENT' as const },
      dated: false,
      technicalProtection: [],
      technicalProtectionState: 'UNKNOWN' as const,
      usageConstraints: [],
      deferredRights: [],
    })),
    groups: [{ groupKey: GROUP, licence: { kind: 'UNSET' } }],
    licenceActions: [{ groupKey: GROUP, action: { kind: 'UNSET' } }],
    acknowledgedFindingKeys: [],
  },
  accessibility: {
    products: [
      [PDF, Pdf],
      [EPUB, Epub],
    ].map(([productKey, publicationType]) => ({
      productKey,
      features: [],
      primaryStandards: [],
      additionalStandards: [],
      exceptions: [],
      reportUrls: [],
      publications: [
        {
          publicationType: publicationType as typeof Pdf,
          scope: 'DIGITAL' as const,
          additionalStandards: [],
          incompatibleAdditionalStandards: [],
        },
      ],
    })),
    contacts: [],
    // Neither Product creates a Publication, and the file states no accessibility to compare with the paperback.
    actions: [],
  },
  components: [],
  relatedMaterial: {
    outcomes: [1, 2].map((product) => {
      const productKey = [PDF, EPUB][product - 1];
      const path = `${P(product)}/RelatedMaterial[1]/RelatedWork[1]`;

      return {
        declarationKey: `${productKey}|${path}/WorkRelationCode[1]`,
        path,
        productKey,
        construct: 'RELATED_WORK' as const,
        code: '01',
        outcome: 'WORK_IDENTITY' as const,
        endpoint: null,
        relationType: null,
        edgeKey: null,
      };
    }),
    edges: [],
    productReferences: [PDF, EPUB].map((productKey) => ({ productKey, asserted: false, references: [] })),
    referenceActions: [{ groupKey: GROUP, action: { kind: 'EXISTING_WORK_NOT_UPDATED' } }],
  },
  collateral: {
    textContents: [],
    resources: [],
    candidates: [],
    actions: [
      {
        groupKey: GROUP,
        productKey: null,
        componentPath: null,
        target: 'WORK',
        action: 'EXISTING_WORK_NOT_UPDATED',
        abstracts: [],
        tableOfContents: null,
        generalNote: null,
        resources: [],
      },
    ],
  },
  reviewsPrizes: {
    citedContents: [],
    prizes: [],
    candidates: [
      {
        scope: 'WORK',
        key: GROUP,
        reviews: [],
        endorsements: [],
        prizes: [],
        ordering: { BOOK_REVIEW: { status: 'EMPTY' }, ENDORSEMENT: { status: 'EMPTY' }, AWARD: { status: 'EMPTY' } },
      },
    ],
    actions: [
      {
        groupKey: GROUP,
        productKey: null,
        componentPath: null,
        target: 'WORK',
        action: 'EXISTING_WORK_NOT_UPDATED',
        bookReviews: [],
        endorsements: [],
        awards: [],
      },
    ],
  },
  // Blocked: nothing is planned, so nothing can be written.
  plan: { works: [], containedWorks: [], series: [], relations: [] },
});

/** The EPUB would attach: each family is compared with the existing Work; only its title contradicts it. */
const COMPARED: OnixReconciliationLedger = {
  descriptive: [
    { family: 'TITLE' as const, outcome: 'CONTRADICTED' as const, reasons: ['CANONICAL_TITLE_DIFFERS'] },
    { family: 'CONTRIBUTORS' as const, outcome: 'COMPATIBLE' as const, reasons: [] },
    { family: 'LANGUAGES' as const, outcome: 'COMPATIBLE' as const, reasons: [] },
    { family: 'LIFECYCLE' as const, outcome: 'COMPATIBLE' as const, reasons: [] },
  ].map((comparison) => ({ productKey: EPUB, groupKey: GROUP, workId: WORK_ID, ...comparison })),
  references: [],
};

const manifestation = (type: PublicationTypeValue) => ({
  kind: 'RESOLVED' as const,
  type,
  classification: 'SUPPORTED_NORMALIZED' as const,
  notes: [{ code: 'DELIVERY_MODE_NOT_REPRESENTED' as const, detail: 'EB' }],
});

const planning = (answers: Answers): OnixPlanningExpectation => ({
  executable: false,
  records: [PDF, EPUB].map((productKey, index) => ({
    index: index + 1,
    recordReference: `regression-press.${productKey.slice('product:gtin13:'.length)}`,
    disposition: 'COMPLETE',
    productKey,
    action: 'PLANNED',
  })),
  products: [
    {
      productKey: PDF,
      groupKey: GROUP,
      isbn: '9781800060050',
      manifestation: manifestation(Pdf),
      publicationType: null,
      action: 'ALREADY_PRESENT',
      executable: false,
    },
    {
      productKey: EPUB,
      groupKey: GROUP,
      isbn: '9781800060067',
      manifestation: manifestation(Epub),
      publicationType: null,
      action: answers === 'OMIT_EPUB' ? 'OMIT/EXCLUDED' : null,
      // Omitted, the EPUB's own action is complete; the PDF's contradiction still holds the group.
      executable: answers === 'OMIT_EPUB',
    },
  ],
  workGroups: [
    {
      groupKey: GROUP,
      productKeys: [PDF, EPUB],
      target: 'EXISTING_WORK',
      // The existing Work's own WorkType and edition stand, whatever the file and the override say.
      workType: { status: 'RESOLVED', type: Monograph, provenance: 'EXISTING_TARGET' },
      edition: { status: 'RESOLVED', edition: 2, basis: 'EXISTING_TARGET' },
      workDoi: { kind: 'DOI', doi: DOI, basis: 'WORK_IDENTIFIER' },
      executable: false,
    },
  ],
  blockers: blockers(answers),
  findings: [],
  works: [],
  chapters: [],
  target: TARGET(answers),
  // Never executable: there is no execution unit, and so nothing to run.
  execution: { units: [] },
  reconciliation: answers === 'OMIT_EPUB' ? { descriptive: [], references: [] } : COMPARED,
});

export default defineOnixRegressionFixture({
  id: 'existing-target-conflict',
  status: 'CONTRACT',
  purpose:
    'Proves that exact identifier-based identity never makes incompatible facts compatible: a type, title and edition ' +
    'the file contradicts the existing Work and Publication with are deterministic SOURCE_CONFLICT blockers before any ' +
    'execution; a WorkType override against the existing Work is one more, never an answer; and omitting the attaching ' +
    'Product releases only its own contradictions, leaving the plan blocked with no execution unit at all.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#250. Every name and identifier is invented; the ISBNs carry valid check characters. The ' +
      'canonical source gate admits it with no finding.',
    sha256: '86d55cb84cc0058999b93155ea2c7c0f29293e1b15e5802a4d7586ad3cfabdff',
  },
  defects: [],
  asOf: '2026-10-07T12:00:00.000Z',
  imprints: [{ label: 'Regression Press', value: IMPRINT }],
  gate: {
    verdict: 'PERMITTED',
    release: '3.1',
    flavour: 'reference',
    findings: [],
    recoveries: [],
    provenance: { kind: 'IDENTITY', flavour: 'reference' },
  },
  normalized: {
    '/onix:ONIXMessage/onix:Product/onix:ProductIdentifier/onix:IDValue': ['9781800060050', '9781800060067'],
    '/onix:ONIXMessage/onix:Product/onix:DescriptiveDetail/onix:EditionNumber': ['1', '1'],
  },
  scenarios: [
    {
      name: 'as uploaded: identity holds, but the file contradicts the existing Work and its Publication',
      target: THOTH,
      planning: planning('AS_UPLOADED'),
      outcomes: { SUPPORTED_NORMALIZED: 2, SOURCE_CONFLICT: 3 },
    },
    {
      name: 'a WorkType override against the existing Work is one more contradiction, never an answer',
      target: THOTH,
      inputs: { fileWorkType: Textbook, workTypeOverrides: { [GROUP]: Textbook } },
      planning: planning('OVERRIDE'),
      outcomes: { SUPPORTED_NORMALIZED: 2, SOURCE_CONFLICT: 4 },
    },
    {
      name: 'omitting the attaching EPUB releases its contradictions; the PDF type contradiction still holds the plan',
      target: THOTH,
      inputs: { manifestationChoices: { [EPUB]: 'OMIT' } },
      planning: planning('OMIT_EPUB'),
      outcomes: { SUPPORTED_NORMALIZED: 2, SOURCE_CONFLICT: 1 },
    },
  ],
});
