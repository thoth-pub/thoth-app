import { LocaleCode } from '@/gql/graphql';
import { PublicationType } from '@/src/shared/constants/publications';
import { WorkStatuses, WorkTypes } from '@/src/shared/constants/work';
import { getDefaultPublication } from '@/src/shared/utils/publications';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

import { defineOnixRegressionFixture } from '../../fixtureSources';
import { ONIX_REGRESSION_PUBLISHER_ID } from '../../pipeline';
import type { OnixExistingTargetState, OnixPlanningExpectation, OnixTargetLedger } from '../../types';

const { Pdf } = PublicationType.enum;
const { Monograph, Textbook } = WorkTypes.enum;

/**
 * An exact existing Work and Publication (thoth-app#250): the file's one Product is a PDF Thoth already holds, as a
 * Publication of the Work the file's Work DOI names, inside the active publisher's imprint.
 *
 * Contract authority: exact identity and the existing-target actions (#182, `resolveGroupTarget`: a Work DOI resolving to
 * exactly one existing Work, read back, makes the group EXISTING_WORK; a Product whose accepted ISBN is on that Work is
 * ALREADY_PRESENT); the execution units (#187: one unit per resolved Work group, a unit with nothing to do is a NOOP unit
 * with no action); an existing Work's WorkType and edition are its own (#179 6036599101 A; #261), so a file WorkType
 * never re-types it; nothing of an existing Work is ever written (#183 accessibility rules 91-98, #224 References, #225
 * collateral, #226 reviews).
 */

const PRODUCT = 'product:gtin13:9781800060012';
const GROUP = `work:${PRODUCT}`;
const IMPRINT = '11111111-1111-4111-8111-111111111111';
const DOI = 'https://doi.org/10.5555/regression.e01';
const WORK_ID = '00000000-0000-4000-8000-000000250101';
const PUBLICATION_ID = '00000000-0000-4000-8000-000000250102';
const TITLE = 'An Exact Existing Work';

/** The existing Work, exactly as `WorkService.getWork` returns it: a PDF of the file's ISBN, written as Thoth writes it. */
const EXISTING_WORK = getDefaultWork({
  id: WORK_ID,
  type: Monograph,
  status: WorkStatuses.enum.Active,
  imprintId: IMPRINT,
  imprintName: 'Regression Press',
  doi: DOI,
  edition: 1,
  publicationDate: '2025-03-01',
  titles: [
    getDefaultTitle({
      id: '00000000-0000-4000-8000-000000250103',
      canonical: true,
      title: TITLE,
      fullTitle: TITLE,
      localeCode: LocaleCode.En,
    }),
  ],
  publications: [getDefaultPublication({ id: PUBLICATION_ID, type: Pdf, isbn: '978-1-80006-001-2' })],
});

const MATCH = { workId: WORK_ID, title: TITLE, imprintId: IMPRINT, doi: DOI, isbns: ['978-1-80006-001-2'] };

/**
 * What Thoth holds: the publisher-scoped exact lookup finds the Work by its DOI and by the PDF's ISBN, and the Work is
 * read back once. No contributor, institution or related-Work question is asked: nothing is adapted for a Work that
 * exists, and the Work DOI declaration is identity, not a relation.
 */
const THOTH: OnixExistingTargetState = {
  kind: 'EXISTING_TARGET',
  reads: [
    {
      method: 'findWorks',
      publisherId: ONIX_REGRESSION_PUBLISHER_ID,
      identifiers: [
        { basis: 'doi', value: DOI },
        { basis: 'isbn', value: '9781800060012' },
      ],
      matches: { [`doi:${DOI}`]: [MATCH], 'isbn:9781800060012': [MATCH] },
    },
    { method: 'getWork', workId: WORK_ID, work: EXISTING_WORK },
  ],
};

const TARGET: OnixTargetLedger = {
  findings: [],
  identity: {
    compatibility: { headerMatches: false, ignoredNativeRecordKeys: [], activation: 'NOT_APPLICABLE' },
    // The Work DOI names exactly one existing Work of the publisher: the group targets it.
    groups: [
      {
        groupKey: GROUP,
        compatibility: 'GENERIC',
        thothVerification: 'NOT_APPLICABLE',
        edges: [],
        evidence: [{ kind: 'WORK_DOI', doi: DOI, workId: WORK_ID }],
      },
    ],
    // The PDF's accepted ISBN is already on that Work: the exact existing Publication.
    products: [
      {
        productKey: PRODUCT,
        recordKeys: ['record:1'],
        evidence: [{ kind: 'ISBN_MATCH', isbn: '9781800060012', workId: WORK_ID, publicationId: PUBLICATION_ID }],
        omittable: false,
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
  commercial: [
    { productKey: PRODUCT, supplies: [], prices: [], carriers: { DIGITAL: { kind: 'NONE' } }, plannedLocations: [] },
  ],
  priceResolutions: [],
  rights: {
    products: [
      {
        productKey: PRODUCT,
        carrier: 'DIGITAL',
        expressions: [],
        licence: { kind: 'SILENT' },
        dated: false,
        technicalProtection: [],
        technicalProtectionState: 'UNKNOWN',
        usageConstraints: [],
        deferredRights: [],
      },
    ],
    groups: [{ groupKey: GROUP, licence: { kind: 'UNSET' } }],
    licenceActions: [{ groupKey: GROUP, action: { kind: 'UNSET' } }],
    acknowledgedFindingKeys: [],
  },
  accessibility: {
    products: [
      {
        productKey: PRODUCT,
        features: [],
        primaryStandards: [],
        additionalStandards: [],
        exceptions: [],
        reportUrls: [],
        publications: [
          { publicationType: Pdf, scope: 'DIGITAL', additionalStandards: [], incompatibleAdditionalStandards: [] },
        ],
      },
    ],
    contacts: [],
    // The file states no accessibility: what the existing PDF holds is kept as it is, and nothing is written (rule 91).
    actions: [
      {
        productKey: PRODUCT,
        publicationType: Pdf,
        resolved: {
          accessibilityStandard: null,
          accessibilityAdditionalStandard: null,
          accessibilityException: null,
          accessibilityReportUrl: null,
        },
        sources: [],
        omitted: [],
        action: 'EXISTING_PRESERVED',
      },
    ],
  },
  components: [],
  relatedMaterial: {
    // The Work DOI declaration is the Work's identity (#224), never a relation to plan.
    outcomes: [
      {
        declarationKey: `${PRODUCT}|/ONIXMessage[1]/Product[1]/RelatedMaterial[1]/RelatedWork[1]/WorkRelationCode[1]`,
        path: '/ONIXMessage[1]/Product[1]/RelatedMaterial[1]/RelatedWork[1]',
        productKey: PRODUCT,
        construct: 'RELATED_WORK',
        code: '01',
        outcome: 'WORK_IDENTITY',
        endpoint: null,
        relationType: null,
        edgeKey: null,
      },
    ],
    edges: [],
    productReferences: [{ productKey: PRODUCT, asserted: false, references: [] }],
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
  // An existing Work is never a Work to create: the executable plan writes nothing beyond its units.
  plan: { works: [], containedWorks: [], series: [], relations: [] },
};

const PLANNING: OnixPlanningExpectation = {
  // Executable, with nothing to execute: the one unit has no action.
  executable: true,
  records: [
    {
      index: 1,
      recordReference: 'regression-press.9781800060012',
      disposition: 'COMPLETE',
      productKey: PRODUCT,
      action: 'PLANNED',
    },
  ],
  products: [
    {
      productKey: PRODUCT,
      groupKey: GROUP,
      isbn: '9781800060012',
      manifestation: {
        kind: 'RESOLVED',
        type: Pdf,
        classification: 'SUPPORTED_NORMALIZED',
        notes: [{ code: 'DELIVERY_MODE_NOT_REPRESENTED', detail: 'EB' }],
      },
      // Already in Thoth: no Publication is planned for it.
      publicationType: null,
      action: 'ALREADY_PRESENT',
      executable: true,
    },
  ],
  workGroups: [
    {
      groupKey: GROUP,
      productKeys: [PRODUCT],
      target: 'EXISTING_WORK',
      // The existing Work's own WorkType and edition, whatever the file or the publisher's file-level default says.
      workType: { status: 'RESOLVED', type: Monograph, provenance: 'EXISTING_TARGET' },
      edition: { status: 'RESOLVED', edition: 1, basis: 'EXISTING_TARGET' },
      workDoi: { kind: 'DOI', doi: DOI, basis: 'WORK_IDENTIFIER' },
      executable: true,
    },
  ],
  blockers: [],
  findings: [],
  works: [],
  chapters: [],
  target: TARGET,
  // One NOOP unit: it targets the existing Work and owns no action, so execution sends nothing for it (#187).
  execution: {
    units: [
      {
        unitKey: `UNIT|${GROUP}`,
        sourceOrder: 1,
        groupKey: GROUP,
        target: { kind: 'EXISTING_WORK', workId: WORK_ID },
        display: { title: TITLE, reference: DOI },
        actions: [],
      },
    ],
  },
  // No Product attaches to the existing Work, so nothing about it is compared.
  reconciliation: { descriptive: [], references: [] },
};

export default defineOnixRegressionFixture({
  id: 'existing-target-noop',
  status: 'CONTRACT',
  purpose:
    'Proves exact existing-target identity resolving to a truthful NOOP: a Work DOI and an ISBN Thoth already holds, in ' +
    'the active publisher, make the group EXISTING_WORK and the Product ALREADY_PRESENT; the plan is executable and its ' +
    'one execution unit owns no action, so nothing is written; and a file-level WorkType never re-types the existing Work.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Written for thoth-app#250. Every name and identifier is invented; the ISBN carries a valid check character. The ' +
      'canonical source gate admits it with no finding.',
    sha256: 'bcade08b4777d5963e4199283ea0d2423a5e6f65dab6ec877a86ddaff71c628d',
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
    '/onix:ONIXMessage/onix:Product/onix:ProductIdentifier/onix:IDValue': ['9781800060012'],
    '/onix:ONIXMessage/onix:Product/onix:RelatedMaterial/onix:RelatedWork/onix:WorkIdentifier/onix:IDValue': [
      '10.5555/regression.e01',
    ],
  },
  scenarios: [
    {
      name: 'as uploaded: the exact Work and Publication are already in Thoth, so the one unit has nothing to do',
      target: THOTH,
      planning: PLANNING,
      outcomes: { SUPPORTED_NORMALIZED: 1 },
    },
    {
      name: 'a file WorkType the publisher states never re-types the existing Work',
      target: THOTH,
      inputs: { fileWorkType: Textbook },
      planning: PLANNING,
      outcomes: { SUPPORTED_NORMALIZED: 1 },
    },
  ],
});
