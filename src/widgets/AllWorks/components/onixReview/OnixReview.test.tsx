import { parse } from '@5stones/onix';
import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkTypes } from '@/src/shared/constants';
import type { ExtendedONIXMessageRoot } from '@/src/shared/parsers/XMLParser/interfaces';
import { reduceOnixAccessibility } from '@/src/shared/parsers/XMLParser/onixAccessibility';
import { reduceOnixCollateral } from '@/src/shared/parsers/XMLParser/onixCollateral';
import { reduceOnixCommercial } from '@/src/shared/parsers/XMLParser/onixCommercial';
import { reduceOnixComponents } from '@/src/shared/parsers/XMLParser/onixComponents';
import { reduceOnixDescriptive } from '@/src/shared/parsers/XMLParser/onixDescriptive';
import { planOnixSource } from '@/src/shared/parsers/XMLParser/onixPlanning';
import { reduceOnixRelatedMaterial } from '@/src/shared/parsers/XMLParser/onixRelations';
import { reduceOnixReviewsPrizes } from '@/src/shared/parsers/XMLParser/onixReviewsPrizes';
import { reduceOnixRights } from '@/src/shared/parsers/XMLParser/onixRights';
import { reduceOnixSalesRights } from '@/src/shared/parsers/XMLParser/onixSalesRights';
import {
  EMPTY_ONIX_PLAN_INPUTS,
  type OnixTargetLookup,
  resolveOnixImportPlan,
  resolveOnixTargets,
} from '@/src/shared/parsers/XMLParser/onixTargetResolution';
import { theme } from '@/src/shared/theme';
import type { OnixImportPlanSidecar, OnixPlanInputs } from '@/src/shared/types';

// Interpolation values stay visible in the rendered text, so each control's label names what it decides.
vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
  })),
}));

import { OnixImportReview } from '../OnixPlanResolution';
import type { OnixReviewPresentationContext } from './reviewModel';

const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';
const IMPRINTS = [{ label: 'Example Imprint', value: 'imprint-1' }];
const ISBN_A = '9781800000018';
const GENERIC_HEADER =
  '<Header><Sender><SenderName>Example Press</SenderName></Sender><SentDateTime>20260913T1200</SentDateTime></Header>';
const { Monograph } = WorkTypes.enum;

const MINIMAL_TITLE =
  '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText language="eng">A Work</TitleText></TitleElement></TitleDetail>';

const isbn = (value: string) =>
  `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${value}</IDValue></ProductIdentifier>`;

const onixRecord = ({
  ref,
  identifiers = '',
  descriptive = '<ProductForm>BC</ProductForm>',
  publishing = '<PublishingStatus>02</PublishingStatus>',
  collateral = '',
  related = '',
  tail = '',
}: {
  ref: string;
  identifiers?: string;
  descriptive?: string;
  publishing?: string;
  collateral?: string;
  related?: string;
  tail?: string;
}) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>03</NotificationType>${identifiers}` +
  `<DescriptiveDetail>${descriptive}${descriptive.includes('<TitleDetail>') ? '' : MINIMAL_TITLE}</DescriptiveDetail>${collateral}` +
  `<PublishingDetail><Imprint><ImprintName>Example Imprint</ImprintName></Imprint>${publishing}</PublishingDetail>` +
  `${related ? `<RelatedMaterial>${related}</RelatedMaterial>` : ''}${tail}</Product>`;

const noMatches: OnixTargetLookup = {
  findWorks: async () => new Map(),
  getWork: async (workId) => {
    throw new Error(`unexpected getWork(${workId})`);
  },
};

/** Everything the real planner, reductions and resolver produce for a file, exactly as XMLParse holds it. */
const planFile = async (records: string[]) => {
  const message = parse(
    `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${GENERIC_HEADER}${records.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(message);
  const targets = await resolveOnixTargets(sourcePlan, noMatches, 'publisher-1');
  const descriptive = reduceOnixDescriptive(message, sourcePlan);
  const rights = reduceOnixRights(message, sourcePlan);
  const commercial = reduceOnixCommercial(message, sourcePlan);
  const collateral = reduceOnixCollateral(message, sourcePlan, { descriptive });
  const resolve = (inputs: Partial<OnixPlanInputs>) =>
    resolveOnixImportPlan({
      sourcePlan,
      targets,
      inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...inputs },
      imprints: IMPRINTS,
      descriptive,
      rights,
      commercial,
      accessibility: reduceOnixAccessibility(message, sourcePlan, { rights }),
      components: reduceOnixComponents(message, sourcePlan),
      salesRights: reduceOnixSalesRights(message, sourcePlan, { commercial }),
      relatedMaterial: reduceOnixRelatedMaterial(message, sourcePlan),
      collateral,
      reviewsPrizes: reduceOnixReviewsPrizes(message, sourcePlan, collateral),
      serieses: [],
    });

  return { resolve, context: { descriptive, targets } satisfies OnixReviewPresentationContext };
};

const paperback = [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) })];

/** Renders the review for a sidecar, and re-renders it for new decisions the way XMLParse resolves them again. */
const renderReview = (sidecar: OnixImportPlanSidecar, context?: OnixReviewPresentationContext) => {
  const onChange = vi.fn<(inputs: OnixPlanInputs) => void>();
  const element = (next: OnixImportPlanSidecar) => (
    <ThemeProvider theme={theme}>
      <OnixImportReview sidecar={next} context={context} onChange={onChange} />
    </ThemeProvider>
  );
  const view = render(element(sidecar));

  return { onChange, rerender: (next: OnixImportPlanSidecar) => view.rerender(element(next)) };
};

const lastDecision = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.lastCall?.[0] as OnixPlanInputs;

void lastDecision;

const workCards = () => screen.queryAllByTestId('onix-review-work');

/**
 * A synthetic file of many Works, cloned from one real resolved Work: the first `attention` Works still wait for their
 * WorkType, every other Work has it. The projection and the review are the real ones.
 */
const manyWorks = (ready: OnixImportPlanSidecar, total: number, attention: number): OnixImportPlanSidecar => {
  const [group] = ready.workGroups;
  const [product] = ready.products;
  const [record] = ready.records;
  const clones = Array.from({ length: total }, (_, index) => {
    const position = index + 1;
    const resolved = index >= attention;
    const groupKey = `group-${position}`;
    const productKey = `product-${position}`;
    const recordKey = `record-${position}`;

    return {
      group: {
        ...group,
        groupKey,
        productKeys: [productKey],
        workType: resolved
          ? { status: 'RESOLVED' as const, type: Monograph, provenance: 'USER_WORK_OVERRIDE' as const }
          : group.workType,
        executable: resolved,
      },
      product: {
        ...product,
        productKey,
        groupKey,
        recordKeys: [recordKey],
        isbn: `97818000${String(position).padStart(5, '0')}`,
      },
      record: { ...record, recordKey, index: position, recordReference: `rec-${position}`, productKey },
      override: resolved ? [[groupKey, Monograph] as const] : [],
      blocker: resolved
        ? []
        : [
            {
              code: 'WORK_TYPE_INPUT_REQUIRED' as const,
              classification: 'TARGET_INPUT_REQUIRED' as const,
              recordKey: null,
              productKey: null,
              groupKey,
              paths: [],
              detail: {},
            },
          ],
    };
  });

  return {
    ...ready,
    executable: attention === 0,
    records: clones.map(({ record: cloned }) => cloned),
    products: clones.map(({ product: cloned }) => cloned),
    workGroups: clones.map(({ group: cloned }) => cloned),
    inputs: { ...ready.inputs, workTypeOverrides: Object.fromEntries(clones.flatMap(({ override }) => override)) },
    blockers: clones.flatMap(({ blocker }) => blocker),
    findings: [],
    descriptive: { ...ready.descriptive, findings: [] },
  };
};

describe('OnixImportReview', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(cleanup);

  describe('file summary and navigation (thoth-app#262 Task 2)', () => {
    it('states the Work and Publication totals, the confirmations still needed, and shows one Work directly without tabs', async () => {
      const { resolve, context } = await planFile(paperback);
      renderReview(resolve({}).sidecar, context);

      const region = screen.getByRole('region', { name: 'onixPlan.review.heading' });
      expect(within(region).getByRole('heading', { level: 2 })).toHaveTextContent('onixPlan.review.heading');
      expect(screen.getByTestId('onix-review-counts')).toHaveTextContent(
        'onixPlan.review.works {"count":1} · onixPlan.review.publications {"count":1}',
      );
      const status = screen.getByTestId('onix-plan-status');
      expect(status).toHaveTextContent('onixPlan.review.status.attention');
      expect(status).toHaveTextContent(
        'onixPlan.review.confirmations {"count":1} onixPlan.review.acrossWorks {"count":1}',
      );
      // Attention is said in words beside an icon, never by colour alone.
      expect(status.querySelector('svg[data-testid="WarningAmberIcon"]')).not.toBeNull();
      // One Work: shown directly, with no file-level navigation to pass through.
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
      expect(workCards()).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('A Work');
      expect(workCards()[0]).toHaveTextContent('onixPlan.review.work.state.NEEDS_CONFIRMATION');
    });

    it('says a decided plan is ready, in words and with its icon', async () => {
      const { resolve, context } = await planFile(paperback);
      const [{ groupKey }] = resolve({}).sidecar.workGroups;
      renderReview(resolve({ workTypeOverrides: { [groupKey]: Monograph } }).sidecar, context);

      const status = screen.getByTestId('onix-plan-status');
      expect(status).toHaveTextContent('onixPlan.review.status.ready');
      expect(status).toHaveTextContent('onixPlan.review.ready');
      expect(status.querySelector('svg[data-testid="CheckCircleOutlineIcon"]')).not.toBeNull();
      expect(workCards()[0]).toHaveTextContent('onixPlan.review.work.state.READY');
    });

    it('opens a file of 300 ready Works and 3 needing attention on the 3, rendering only them, with Ready and All a key press away', async () => {
      const { resolve } = await planFile(paperback);
      const sidecar = manyWorks(resolve({}).sidecar, 303, 3);
      const started = performance.now();
      renderReview(sidecar);
      const elapsed = performance.now() - started;

      expect(screen.getByTestId('onix-review-counts')).toHaveTextContent(
        'onixPlan.review.works {"count":303} · onixPlan.review.publications {"count":303}',
      );
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent(
        'onixPlan.review.confirmations {"count":3} onixPlan.review.acrossWorks {"count":3}',
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs.map((tab) => tab.textContent)).toEqual([
        'onixPlan.review.filter.ATTENTION {"count":3}',
        'onixPlan.review.filter.READY {"count":300}',
        'onixPlan.review.filter.ALL {"count":303}',
      ]);
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      // Only the three Works needing attention are rendered: the three hundred ready ones are not traversed.
      expect(workCards()).toHaveLength(3);
      workCards().forEach((card) => expect(card).toHaveAttribute('data-state', 'NEEDS_CONFIRMATION'));
      expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tabs[0].id);

      // The arrow keys move between the views and select them.
      tabs[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: 'onixPlan.review.filter.READY {"count":300}' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(workCards()).toHaveLength(300);
      workCards().forEach((card) => expect(card).toHaveAttribute('data-state', 'READY'));

      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: 'onixPlan.review.filter.ALL {"count":303}' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(workCards()).toHaveLength(303);

      await userEvent.click(screen.getByRole('tab', { name: 'onixPlan.review.filter.ATTENTION {"count":3}' }));
      expect(workCards()).toHaveLength(3);
      // Rendering the attention view of a 303-Work file is quick enough to need no virtualisation.
      expect(elapsed).toBeLessThan(5_000);
    });

    it('opens on All when nothing needs attention, and says so on an emptied Needs attention view', async () => {
      const { resolve } = await planFile(paperback);
      const { rerender } = renderReview(manyWorks(resolve({}).sidecar, 4, 1));

      expect(screen.getByRole('tab', { name: 'onixPlan.review.filter.ATTENTION {"count":1}' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(workCards()).toHaveLength(1);

      // The last decision taken: the chosen view stays, says it is empty, and the plan is ready.
      rerender(manyWorks(resolve({}).sidecar, 4, 0));
      expect(screen.getByRole('tab', { name: 'onixPlan.review.filter.ATTENTION {"count":0}' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(workCards()).toHaveLength(0);
      expect(screen.getByRole('tabpanel')).toHaveTextContent('onixPlan.review.filter.empty.ATTENTION');
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.review.status.ready');
      cleanup();

      renderReview(manyWorks(resolve({}).sidecar, 4, 0));
      expect(screen.getByRole('tab', { name: 'onixPlan.review.filter.ALL {"count":4}' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(workCards()).toHaveLength(4);
    });

    it('folds what Thoth handled automatically into a compact summary of high-level outcomes', async () => {
      const { resolve, context } = await planFile(paperback);
      const [{ groupKey }] = resolve({}).sidecar.workGroups;
      renderReview(resolve({ workTypeOverrides: { [groupKey]: Monograph } }).sidecar, context);

      const automatic = screen.getByTestId('onix-review-automatic');
      expect(automatic.tagName).toBe('DETAILS');
      expect(automatic).not.toHaveAttribute('open');
      expect(automatic).toHaveTextContent('onixPlan.review.automatic.heading {"count":1}');
      expect(automatic).toHaveTextContent('onixPlan.review.automatic.FORMATS {"count":1}');
    });
  });

  describe('Work and Publication summaries (thoth-app#262 Task 3)', () => {
    const supplied = (prices: string) =>
      onixRecord({
        ref: 'pb',
        identifiers: isbn(ISBN_A),
        tail:
          '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier>' +
          `<ProductAvailability>20</ProductAvailability>${prices}</SupplyDetail></ProductSupply>`,
      });
    const gbp = (amount: string, qualifier = '') =>
      `<Price><PriceType>02</PriceType>${qualifier}<PriceAmount>${amount}</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>`;
    const card = () => screen.getByTestId('onix-review-work');

    it('shows a decided WorkType as its type alone, the edition, and the licence, each resolved fact with its edit affordance', async () => {
      const { resolve, context } = await planFile(paperback);
      const [{ groupKey }] = resolve({}).sidecar.workGroups;
      renderReview(resolve({ workTypeOverrides: { [groupKey]: Monograph } }).sidecar, context);

      const summary = within(card()).getByTestId('onix-review-summary');
      expect(within(summary).getByTestId('onix-review-work-type')).toHaveTextContent('onixPlan.workType.MONOGRAPH');
      // No provenance narration beside the type: not "chosen for this Work", not where it came from.
      expect(summary).not.toHaveTextContent('workTypeProvenance');
      expect(within(summary).getByTestId('onix-review-edition')).toHaveTextContent('1');
      expect(within(summary).getByTestId('onix-review-licence')).toHaveTextContent(
        'onixPlan.review.summary.licenceNone',
      );
      expect(
        within(summary).getByRole('button', {
          name: 'onixPlan.review.summary.edit {"fact":"onixPlan.review.summary.workType","work":"A Work"}',
        }),
      ).toBeInTheDocument();
      // A first edition the file left unstated is a fact, not a decision: nothing to change about it here.
      expect(within(within(summary).getByTestId('onix-review-edition')).queryByRole('button')).not.toBeInTheDocument();
      // No unresolved control lives in the summary.
      expect(within(summary).queryByRole('combobox')).not.toBeInTheDocument();
      expect(within(summary).queryByRole('checkbox')).not.toBeInTheDocument();
      expect(within(summary).queryByRole('textbox')).not.toBeInTheDocument();
      // The Publication, as Thoth will create it.
      const publication = within(summary).getByTestId('onix-review-publication');
      expect(publication).toHaveTextContent('onixPlan.publicationType.PAPERBACK');
      expect(publication).toHaveTextContent(ISBN_A);
      expect(publication).toHaveTextContent('onixPlan.review.publication.action.CREATE_PUBLICATION');
      expect(within(summary).getByRole('heading', { level: 4 })).toHaveTextContent(
        'onixPlan.review.summary.publications {"count":1} · onixPlan.publicationType.PAPERBACK',
      );
    });

    it('shows one credited external front cover as "front cover found", with nothing of its credit or hosting', async () => {
      const collateral =
        '<CollateralDetail><SupportingResource><ResourceContentType>01</ResourceContentType><ContentAudience>00</ContentAudience>' +
        '<ResourceMode>03</ResourceMode><ResourceFeature><ResourceFeatureType>01</ResourceFeatureType><FeatureNote>Photo: A. Photographer</FeatureNote></ResourceFeature>' +
        '<ResourceVersion><ResourceForm>02</ResourceForm><ResourceLink>https://images.example.org/covers/a-work.jpg</ResourceLink></ResourceVersion>' +
        '</SupportingResource></CollateralDetail>';
      const { resolve, context } = await planFile([onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), collateral })]);
      const [{ groupKey }] = resolve({}).sidecar.workGroups;
      renderReview(resolve({ workTypeOverrides: { [groupKey]: Monograph } }).sidecar, context);

      expect(within(card()).getByTestId('onix-review-cover')).toHaveTextContent('onixPlan.review.summary.coverFound');
      expect(card()).not.toHaveTextContent('Photographer');
      expect(card()).not.toHaveTextContent('download');
      expect(card()).not.toHaveTextContent('COVER_DETAIL');
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.review.status.ready');
    });

    it('shows an automatic price and a chosen price in the Publication summary, and no price as such, never a zero', async () => {
      const { resolve: resolveAutomatic, context } = await planFile([
        supplied(gbp('20.00') + gbp('20', '<PriceQualifier>10</PriceQualifier>')),
      ]);
      const [{ groupKey }] = resolveAutomatic({}).sidecar.workGroups;
      renderReview(resolveAutomatic({ workTypeOverrides: { [groupKey]: Monograph } }).sidecar, context);

      const prices = within(card()).getByTestId('onix-review-prices');
      expect(prices).toHaveTextContent('onixPlan.review.publication.price {"currency":"GBP","amount":"20.00"}');
      // An automatic price is a fact with nothing to change: the file states one amount.
      expect(within(prices).queryByRole('button')).not.toBeInTheDocument();
      expect(card()).not.toHaveTextContent('PriceQualifier');
      cleanup();

      const { resolve, context: priced } = await planFile([supplied(gbp('20.00') + gbp('22.00'))]);
      const open = resolve({ workTypeOverrides: { [groupKey]: Monograph } }).sidecar;
      const [conflict] = (open.commercial?.findings ?? []).filter(({ code }) => code === 'PRICE_AMOUNT_CONFLICT');
      const candidates = conflict.resolution.kind === 'PRICE_CHOICE' ? conflict.resolution.candidates : [];
      const { rerender } = renderReview(open, priced);

      // Undecided: the Publication is still created, no price is shown for it, and none is fabricated.
      expect(within(card()).queryByTestId('onix-review-prices')).not.toBeInTheDocument();
      expect(within(card()).getByTestId('onix-review-publication')).toHaveTextContent(
        'onixPlan.review.publication.action.CREATE_PUBLICATION',
      );

      rerender(
        resolve({
          workTypeOverrides: { [groupKey]: Monograph },
          commercialChoices: { [conflict.key]: candidates[1].key },
        }).sidecar,
      );
      expect(within(card()).getByTestId('onix-review-prices')).toHaveTextContent(
        'onixPlan.review.publication.price {"currency":"GBP","amount":"22.00"}',
      );
      // Chosen by the publisher: changeable, with the Publication and Work named for every reader.
      expect(
        within(card()).getByRole('button', {
          name: `onixPlan.review.publication.edit {"fact":"onixPlan.review.publication.fact.price","publication":"pb ${ISBN_A}","work":"A Work"}`,
        }),
      ).toBeInTheDocument();

      rerender(
        resolve({ workTypeOverrides: { [groupKey]: Monograph }, commercialChoices: { [conflict.key]: 'OMIT' } })
          .sidecar,
      );
      expect(within(card()).getByTestId('onix-review-prices')).toHaveTextContent(
        'onixPlan.review.publication.noPrice {"currency":"GBP"}',
      );
      expect(card()).not.toHaveTextContent('0.00');
    });

    it('says nothing in the summary about a table of contents, an unsupported relation or any other deterministic loss', async () => {
      const toc =
        '<CollateralDetail><TextContent><TextType>04</TextType><ContentAudience>00</ContentAudience><Text textformat="06">1. One; 2. Two</Text></TextContent></CollateralDetail>';
      const unsupportedRelation = `<RelatedProduct><ProductRelationCode>13</ProductRelationCode>${isbn('9781800000032')}</RelatedProduct>`;
      const { resolve, context } = await planFile([
        onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), collateral: toc, related: unsupportedRelation }),
      ]);
      const [{ groupKey }] = resolve({}).sidecar.workGroups;
      const sidecar = resolve({ workTypeOverrides: { [groupKey]: Monograph } }).sidecar;
      renderReview(sidecar, context);

      // The planner kept the evidence; the publisher is told nothing about either.
      expect((sidecar.findings ?? []).some(({ code }) => code === 'RELATION_UNREPRESENTABLE')).toBe(true);
      expect((sidecar.findings ?? []).some(({ code }) => code === 'COLLATERAL_TEXT_ROLE_UNREPRESENTED')).toBe(true);
      [
        'tableOfContents',
        'RelatedProduct',
        'notRecorded',
        'disclosures',
        'not imported',
        'collateral',
        'relatedMaterial',
      ].forEach((noise) => expect(card()).not.toHaveTextContent(noise));
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.review.status.ready');
      expect(screen.getByTestId('onix-review-works').querySelectorAll('details')).toHaveLength(0);
    });

    it('names an existing Work by its exact Thoth title, and a new Work without one by its position', async () => {
      const { resolve } = await planFile(paperback);
      const { sidecar } = resolve({});
      const [group] = sidecar.workGroups;
      const existing: OnixImportPlanSidecar = {
        ...sidecar,
        executable: true,
        blockers: [],
        workGroups: [
          {
            ...group,
            target: 'EXISTING_WORK',
            existingWorkId: 'work-9',
            workType: { status: 'RESOLVED', type: Monograph, provenance: 'EXISTING_TARGET' },
          },
        ],
      };
      renderReview(existing, {
        targets: {
          publisherId: 'publisher-1',
          identifiers: [],
          works: [
            {
              workId: 'work-9',
              type: Monograph,
              imprintId: 'imprint-1',
              edition: 1,
              doi: '',
              title: 'An Existing Work',
              license: '',
              publications: [],
              descriptive: {
                titles: [],
                languages: [],
                subjects: [],
                contributions: [],
                issues: [],
                status: 'ACTIVE',
                publicationDate: null,
                withdrawnDate: null,
                place: '',
                landingPage: '',
                copyrightHolder: '',
                pageCount: 0,
                imageCount: 0,
                tableCount: 0,
                audioCount: 0,
                videoCount: 0,
                bibliographyNote: '',
                fundings: [],
              },
            },
          ],
        },
      });

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('An Existing Work');
      expect(card()).toHaveTextContent('onixPlan.review.work.target.EXISTING_WORK');
      // An existing Work's type is its own: shown, with nothing to change.
      expect(within(card()).getByTestId('onix-review-work-type')).toHaveTextContent('onixPlan.workType.MONOGRAPH');
      expect(within(within(card()).getByTestId('onix-review-work-type')).queryByRole('button')).not.toBeInTheDocument();
      cleanup();

      renderReview(manyWorks(sidecar, 2, 0));
      expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
        'onixPlan.review.work.fallbackTitle {"position":1}',
        'onixPlan.review.work.fallbackTitle {"position":2}',
      ]);
    });
  });
});
