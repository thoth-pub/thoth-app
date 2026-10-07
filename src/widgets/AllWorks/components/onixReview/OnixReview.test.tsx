import { parse } from '@5stones/onix';
import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { currencyOptions, languageOptions, licenseOptions, WorkTypes } from '@/src/shared/constants';
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
  adaptableGroupKeys,
  EMPTY_ONIX_PLAN_INPUTS,
  type OnixTargetLookup,
  resolveOnixImportPlan,
  resolveOnixTargets,
} from '@/src/shared/parsers/XMLParser/onixTargetResolution';
import XMLParser from '@/src/shared/parsers/XMLParser/XMLParser';
import { theme } from '@/src/shared/theme';
import type { OnixImportPlanSidecar, OnixPlanInputs } from '@/src/shared/types';

// Interpolation values stay visible in the rendered text, so each control's label names what it decides.
vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
  })),
}));

import { OnixPlanResolution } from '../OnixPlanResolution';
import { localeLabel } from './LocaleAutocomplete';
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

/**
 * The same, adapted by the real adapter against a Thoth institution search that answers by name, so that affiliations
 * and funders the file does not identify get their name-search suggestions (thoth-app#183).
 */
const planAdapted = async (records: string[], institutions: Record<string, { id: string; name: string }[]>) => {
  const message = parse(
    `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${GENERIC_HEADER}${records.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(message);
  const targets = await resolveOnixTargets(sourcePlan, noMatches, 'publisher-1');
  const descriptive = reduceOnixDescriptive(message, sourcePlan);
  const rights = reduceOnixRights(message, sourcePlan);
  const commercial = reduceOnixCommercial(message, sourcePlan);
  const collateral = reduceOnixCollateral(message, sourcePlan, { descriptive });
  const parsed = await new XMLParser(
    message,
    IMPRINTS,
    licenseOptions,
    [],
    { getContributors: async () => [], getContributorsByOrcids: async () => [] } as never,
    {
      getInstitutions: async (_offset: number, _limit: number, filter: string) =>
        (institutions[filter] ?? []).map((institution) => ({
          ...institution,
          ror: '',
          doi: '',
          countryCode: '',
          updatedAt: '',
        })),
    } as never,
    languageOptions,
    currencyOptions,
    { sourcePlan, descriptive, adaptGroupKeys: adaptableGroupKeys(sourcePlan, targets, IMPRINTS) },
  ).parse();
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
      candidatePlan: parsed.data.plan,
      adaptation: parsed.data.onix?.groups,
    });

  return {
    resolve,
    context: { descriptive, targets, candidatePlan: parsed.data.plan } satisfies OnixReviewPresentationContext,
  };
};

const paperback = [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) })];

/** Renders the review for a sidecar, and re-renders it for new decisions the way XMLParse resolves them again. */
const renderReview = (sidecar: OnixImportPlanSidecar, context?: OnixReviewPresentationContext) => {
  const onChange = vi.fn<(inputs: OnixPlanInputs) => void>();
  const element = (next: OnixImportPlanSidecar) => (
    <ThemeProvider theme={theme}>
      <OnixPlanResolution sidecar={next} context={context} onChange={onChange} />
    </ThemeProvider>
  );
  const view = render(element(sidecar));

  return { onChange, rerender: (next: OnixImportPlanSidecar) => view.rerender(element(next)) };
};

const lastDecision = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.lastCall?.[0] as OnixPlanInputs;

const workCards = () => screen.queryAllByTestId('onix-review-work');

/** The text a publisher reads without opening any technical details: what the review says of its own accord. */
const primaryText = (element: HTMLElement | null): string => {
  if (element === null) return '';

  const copy = element.cloneNode(true) as HTMLElement;

  copy.querySelectorAll('[data-testid="onix-review-technical"]').forEach((details) => details.remove());

  return copy.textContent ?? '';
};

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

describe('OnixPlanResolution (Work-first review)', () => {
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

    it('says a file confirmation is needed without spreading it across Works, and tells file and Work confirmations apart when both wait (#264 CR-4)', async () => {
      // A complete paperback, and a non-complete record of another Product that Thoth cannot apply: the file's decision.
      const update =
        `<Product><RecordReference>upd</RecordReference><NotificationType>04</NotificationType>${isbn('9781800000025')}` +
        `<DescriptiveDetail><ProductForm>BC</ProductForm>${MINIMAL_TITLE}</DescriptiveDetail></Product>`;
      const revised = onixRecord({
        ref: 'pb',
        identifiers: isbn(ISBN_A),
        descriptive: '<ProductForm>BC</ProductForm><EditionType>REV</EditionType>',
      });
      const { resolve, context } = await planFile([revised, update]);
      const [{ groupKey }] = resolve({}).sidecar.workGroups;

      // File only: one confirmation, and it is the file's, not spread "across 0 Works".
      const { rerender } = renderReview(
        resolve({ workTypeOverrides: { [groupKey]: Monograph }, editionInputs: { [groupKey]: 2 } }).sidecar,
        context,
      );
      const status = () => screen.getByTestId('onix-plan-status');
      expect(status()).toHaveTextContent('onixPlan.review.status.attention');
      expect(status()).toHaveTextContent('onixPlan.review.fileConfirmations {"count":1}');
      expect(status()).not.toHaveTextContent('onixPlan.review.confirmations {');
      expect(status()).not.toHaveTextContent('acrossWorks');
      expect(screen.getByTestId('onix-review-file')).toHaveTextContent('onixPlan.review.decision.record.title');

      // Both: the Work's two confirmations across its one Work, and the file's one, said apart.
      rerender(resolve({}).sidecar);
      expect(status()).toHaveTextContent(
        'onixPlan.review.confirmations {"count":2} onixPlan.review.acrossWorks {"count":1} · onixPlan.review.fileConfirmations {"count":1}',
      );
    });

    it('counts a blocked Work with nothing to confirm as needing attention, never as a Work confirmations are spread across (#264 CR-4)', async () => {
      const unusablePrice = onixRecord({
        ref: 'pb',
        identifiers: isbn(ISBN_A),
        tail:
          '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier>' +
          '<ProductAvailability>20</ProductAvailability><Price><PriceType>02</PriceType><PriceAmount>abc</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price></SupplyDetail></ProductSupply>',
      });
      const { resolve, context } = await planFile([unusablePrice]);
      const [{ groupKey }] = resolve({}).sidecar.workGroups;
      renderReview(resolve({ workTypeOverrides: { [groupKey]: Monograph } }).sidecar, context);

      const status = screen.getByTestId('onix-plan-status');
      expect(workCards()[0]).toHaveAttribute('data-state', 'BLOCKED');
      expect(status).toHaveTextContent('onixPlan.review.problems {"count":1}');
      expect(status).not.toHaveTextContent('confirmations');
      expect(status).not.toHaveTextContent('acrossWorks');
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
      expect(primaryText(summary)).not.toContain('workTypeProvenance');
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
      expect(primaryText(card())).not.toContain('Photographer');
      expect(primaryText(card())).not.toContain('download');
      expect(primaryText(card())).not.toContain('COVER_DETAIL');
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
      expect(primaryText(card())).not.toContain('PriceQualifier');
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
      expect(primaryText(card())).not.toContain('0.00');
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
      ].forEach((noise) => expect(primaryText(card())).not.toContain(noise));
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

  describe('core confirmations (thoth-app#262 Task 4)', () => {
    const ENGLISH = localeLabel('EN');
    const editor = (first: string, last: string, biography: string, affiliation = '') =>
      `<Contributor><ContributorRole>B01</ContributorRole><PersonName>${first} ${last}</PersonName>` +
      `<NamesBeforeKey>${first}</NamesBeforeKey><KeyNames>${last}</KeyNames>${affiliation}` +
      `<BiographicalNote textformat="06">${biography}</BiographicalNote></Contributor>`;
    const edited = [
      onixRecord({
        ref: 'pb',
        identifiers: isbn(ISBN_A),
        descriptive:
          '<ProductForm>BC</ProductForm>' +
          MINIMAL_TITLE +
          editor('Valeria', 'Vitale', 'Valeria Vitale writes on heritage.') +
          '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>',
      }),
    ];
    const card = () => screen.getByTestId('onix-review-work');
    const confirmation = () => within(card()).getByTestId('onix-review-confirmation');
    const summary = () => within(card()).getByTestId('onix-review-summary');
    const taskNamed = (heading: string) =>
      within(confirmation())
        .getAllByTestId('onix-review-task')
        .find((task) => within(task).queryByRole('heading', { level: 5, name: heading }) !== null) as HTMLElement;

    it('proposes the WorkType the contributor roles suggest as Confirm or Choose another, inside Needs your confirmation, and writes only the publisher’s answer', async () => {
      const { resolve, context } = await planFile(edited);
      const { sidecar } = resolve({});
      const [{ groupKey }] = sidecar.workGroups;
      const { onChange, rerender } = renderReview(sidecar, context);

      expect(sidecar.workGroups[0].workTypeSuggestion).toBe(WorkTypes.enum.EditedBook);
      const section = confirmation();
      expect(within(section).getByRole('heading', { level: 4 })).toHaveTextContent(
        'onixPlan.review.confirmation.heading (onixPlan.review.confirmation.count {"count":2})',
      );
      // The proposal is a question in the confirmation section, not a fact in the summary.
      expect(within(summary()).queryByTestId('onix-review-work-type')).not.toBeInTheDocument();
      const task = taskNamed('onixPlan.review.decision.workType.title');
      expect(task).toHaveTextContent(
        'onixPlan.review.decision.workType.suggested {"type":"onixPlan.workType.EDITED_BOOK"}',
      );
      // No internal narration: nothing about evidence, nothing about what is or is not selected.
      expect(primaryText(section)).not.toContain('nothing is selected');
      expect(primaryText(section)).not.toContain('onixPlan.workType.suggestion');
      const confirm = within(task).getByRole('button', {
        name: 'onixPlan.review.decision.workType.confirm {"type":"onixPlan.workType.EDITED_BOOK"}',
      });
      expect(confirm).toHaveAccessibleDescription('onixPlan.review.decision.workType.title');
      // Choose another offers exactly the four ordinary types: no book set, no book chapter.
      expect(within(task).queryByRole('radio')).not.toBeInTheDocument();
      await userEvent.click(within(task).getByRole('button', { name: 'onixPlan.review.decision.chooseAnother' }));
      const group = within(task).getByRole('radiogroup', {
        name: 'onixPlan.review.decision.workType.label {"work":"A Work"}',
      });
      expect(
        within(group)
          .getAllByRole('radio')
          .map((radio) => (radio as HTMLInputElement).value),
      ).toEqual([Monograph, WorkTypes.enum.EditedBook, WorkTypes.enum.Textbook, WorkTypes.enum.JournalIssue]);
      within(group)
        .getAllByRole('radio')
        .forEach((radio) => expect(radio).not.toBeChecked());
      expect(onChange).not.toHaveBeenCalled();

      // Confirming writes exactly the proposal to the Work's own override; nothing else changes.
      await userEvent.click(confirm);
      expect(lastDecision(onChange)).toEqual({
        ...EMPTY_ONIX_PLAN_INPUTS,
        workTypeOverrides: { [groupKey]: WorkTypes.enum.EditedBook },
      });

      // Resolved: the type moves to the summary, plainly, and leaves the confirmation section; the count falls.
      rerender(resolve(lastDecision(onChange)).sidecar);
      expect(within(summary()).getByTestId('onix-review-work-type')).toHaveTextContent('onixPlan.workType.EDITED_BOOK');
      expect(primaryText(summary())).not.toContain('workTypeProvenance');
      expect(
        within(confirmation()).queryByRole('heading', { level: 5, name: 'onixPlan.review.decision.workType.title' }),
      ).not.toBeInTheDocument();
      expect(within(confirmation()).getByRole('heading', { level: 4 })).toHaveTextContent(
        'onixPlan.review.confirmation.count {"count":1}',
      );
      expect(card()).toHaveTextContent('onixPlan.review.work.confirmations {"count":1}');

      // Change: the decision reopens among the confirmations with the publisher's own answer, and a new choice writes
      // the canonical override again.
      await userEvent.click(
        within(summary()).getByRole('button', {
          name: 'onixPlan.review.summary.edit {"fact":"onixPlan.review.summary.workType","work":"A Work"}',
        }),
      );
      const reopened = within(confirmation()).getByRole('radiogroup', {
        name: 'onixPlan.review.decision.workType.label {"work":"A Work"}',
      });
      expect(within(reopened).getByRole('radio', { name: 'onixPlan.workType.EDITED_BOOK' })).toBeChecked();
      await userEvent.click(within(reopened).getByRole('radio', { name: 'onixPlan.workType.TEXTBOOK' }));
      expect(lastDecision(onChange).workTypeOverrides).toEqual({ [groupKey]: WorkTypes.enum.Textbook });
      await userEvent.click(
        within(confirmation()).getByRole('button', {
          name: 'onixPlan.review.confirmation.doneLabel {"task":"onixPlan.review.decision.workType.title"}',
        }),
      );
      expect(within(confirmation()).queryByRole('radiogroup')).not.toBeInTheDocument();
    });

    it('offers the four types directly where the roles suggest nothing', async () => {
      const { resolve, context } = await planFile(paperback);
      renderReview(resolve({}).sidecar, context);

      const section = confirmation();
      expect(within(section).queryByRole('button', { name: /confirm/ })).not.toBeInTheDocument();
      expect(within(section).getAllByRole('radio')).toHaveLength(4);
      expect(within(section).queryByRole('radio', { name: 'onixPlan.workType.BOOK_CHAPTER' })).not.toBeInTheDocument();
      expect(within(section).queryByRole('radio', { name: 'onixPlan.workType.BOOK_SET' })).not.toBeInTheDocument();
    });

    it('proposes the book’s language for a locale-less biography, names the contributor, and lets another locale be found by typing', async () => {
      const { resolve, context } = await planFile(edited);
      const { sidecar } = resolve({});
      const [{ groupKey }] = sidecar.workGroups;
      const [finding] = sidecar.descriptive.findings.filter(
        ({ code }) => code === 'CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED',
      );
      const { onChange, rerender } = renderReview(sidecar, context);
      const title = 'onixPlan.review.decision.topic.CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED - Valeria Vitale';
      const task = taskNamed(title);

      // Context once, in the heading: what is decided, and for whom. With one Publication, no ISBN is repeated.
      expect(task).toBeDefined();
      expect(primaryText(task)).not.toContain(ISBN_A);
      expect(task).toHaveTextContent(`onixPlan.review.decision.locale.suggested {"locale":"${ENGLISH}"}`);
      // The planner's own prose is nowhere in the primary copy.
      expect(primaryText(task)).not.toContain(finding.message);
      expect(primaryText(task)).not.toContain('never assumes');
      expect(primaryText(task)).not.toContain('evidence only');
      // Nothing is selected by the proposal: no locale control exists until asked for, and nothing was written.
      expect(within(task).queryByRole('combobox')).not.toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();

      // Choose another: a searchable control, named with the contributor and the Work, with no giant native select.
      await userEvent.click(within(task).getByRole('button', { name: 'onixPlan.review.decision.chooseAnother' }));
      const locale = within(task).getByRole('combobox', {
        name: `onixPlan.review.decision.locale.label {"title":"${title}","work":"A Work"}`,
      });
      expect(locale.tagName).toBe('INPUT');
      expect(task.querySelector('select')).toBeNull();
      expect(locale).toHaveAccessibleDescription(expect.stringContaining(title));
      await userEvent.type(locale, 'Portug');
      // No option the control offers is hidden; the query skips the visibility walk over the matches.
      const options = screen.getAllByRole('option', { hidden: true });
      expect(options.length).toBeGreaterThan(1);
      expect(options.length).toBeLessThan(40);
      expect(options.map((option) => option.textContent)).toContain(localeLabel('PT_PT'));
      // The keyboard moves to a match and takes it; the exact Thoth locale is written to the finding's key.
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      const chosen = lastDecision(onChange).descriptiveChoices[finding.key];
      expect(chosen).toMatch(/^PT/);
      expect(lastDecision(onChange)).toEqual({
        ...EMPTY_ONIX_PLAN_INPUTS,
        descriptiveChoices: { [finding.key]: chosen },
      });

      // Or the proposal is confirmed as it stands: the exact suggested locale, through the same canonical input.
      await userEvent.click(
        within(task).getByRole('button', { name: `onixPlan.review.decision.locale.confirm {"locale":"${ENGLISH}"}` }),
      );
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: 'EN' });

      // Answered, with the WorkType: nothing is left to confirm and the plan is ready.
      rerender(
        resolve({
          workTypeOverrides: { [groupKey]: WorkTypes.enum.EditedBook },
          descriptiveChoices: { [finding.key]: 'EN' },
        }).sidecar,
      );
      expect(within(card()).queryByTestId('onix-review-confirmation')).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.review.status.ready');
    });

    it('offers a searchable locale control directly where the file proposes none', async () => {
      const untagged =
        '<ProductForm>BC</ProductForm><TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Cities</TitleText></TitleElement></TitleDetail>';
      const { resolve, context } = await planFile([
        onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), descriptive: untagged }),
      ]);
      const { sidecar } = resolve({});
      const [{ groupKey }] = sidecar.workGroups;
      const [finding] = sidecar.descriptive.findings.filter(({ code }) => code === 'TITLE_LOCALE_UNRESOLVED');
      const { onChange } = renderReview(resolve({ workTypeOverrides: { [groupKey]: Monograph } }).sidecar, context);
      const section = confirmation();

      expect(within(section).queryByRole('button', { name: /chooseAnother/ })).not.toBeInTheDocument();
      const locale = within(section).getByRole('combobox', {
        name: 'onixPlan.review.decision.locale.label {"title":"onixPlan.review.decision.topic.TITLE_LOCALE_UNRESOLVED","work":"Cities"}',
      });
      expect(locale).toHaveValue('');
      await userEvent.type(locale, 'French');
      await userEvent.click(screen.getByRole('option', { name: localeLabel('FR'), hidden: true }));
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: 'FR' });
    });

    it('asks each affiliation once for the Work with the matching institutions or none, and the price as one compact choice, all in the same section', async () => {
      const INSTITUTE = 'Institute of Example Studies';
      const ISBN_B = '9781800000025';
      const records = [ISBN_A, ISBN_B].map((value, index) =>
        onixRecord({
          ref: value,
          identifiers: isbn(value),
          descriptive:
            ['<ProductForm>BB</ProductForm>', '<ProductForm>BC</ProductForm>'][index] +
            MINIMAL_TITLE +
            editor(
              'Alex',
              'Example',
              'Alex Example writes.',
              `<ProfessionalAffiliation><Affiliation>${INSTITUTE}</Affiliation></ProfessionalAffiliation>`,
            ) +
            '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>',
          related: [ISBN_A, ISBN_B]
            .filter((other) => other !== value)
            .map(
              (other) => `<RelatedProduct><ProductRelationCode>06</ProductRelationCode>${isbn(other)}</RelatedProduct>`,
            )
            .join(''),
          tail:
            index === 1
              ? '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier><ProductAvailability>20</ProductAvailability>' +
                '<Price><PriceType>02</PriceType><PriceAmount>20.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>' +
                '<Price><PriceType>02</PriceType><PriceQualifier>10</PriceQualifier><PriceAmount>60.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price></SupplyDetail></ProductSupply>'
              : '',
        }),
      );
      const { resolve, context } = await planAdapted(records, {
        [INSTITUTE]: [
          { id: 'institution-institute', name: INSTITUTE },
          { id: 'institution-university', name: 'University of Example' },
        ],
      });
      const open = resolve({}).sidecar;
      const affiliation = open.descriptive.findings.find(({ code }) => code === 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED');
      const price = (open.commercial?.findings ?? []).find(({ code }) => code === 'PRICE_AMOUNT_CONFLICT');
      const candidates = price?.resolution.kind === 'PRICE_CHOICE' ? price.resolution.candidates : [];
      const { onChange } = renderReview(open, context);
      const section = confirmation();
      const tasks = within(section).getAllByTestId('onix-review-task');

      // One section, every decision: WorkType, biography locale, affiliation, price - each once for the grouped Work.
      expect(tasks).toHaveLength(4);
      expect(
        within(section)
          .getAllByRole('heading', { level: 5 })
          .map((heading) => heading.textContent),
      ).toEqual([
        'onixPlan.review.decision.workType.title',
        'onixPlan.review.decision.topic.CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED - Alex Example',
        `onixPlan.review.decision.topic.CONTRIBUTOR_AFFILIATION_UNIDENTIFIED - ${INSTITUTE}`,
        'onixPlan.review.decision.price.title {"currency":"GBP"}',
      ]);
      // A Product-owned decision of a two-Publication Work names its Publication once, beside its heading.
      const priceTask = taskNamed('onixPlan.review.decision.price.title {"currency":"GBP"}');
      expect(priceTask).toHaveTextContent(`onixPlan.publicationType.PAPERBACK ${ISBN_B}`);
      // Nothing of the Work's decisions is repeated per manifestation, and nothing is repeated as a problem.
      expect(within(card()).queryByTestId('onix-review-problems')).not.toBeInTheDocument();

      // The affiliation: the matches by name, grouped, with no affiliation as the other answer; none chosen.
      const institution = within(section).getByRole('combobox', {
        name: `onixPlan.review.decision.institution.label {"title":"onixPlan.review.decision.topic.CONTRIBUTOR_AFFILIATION_UNIDENTIFIED - ${INSTITUTE}","work":"A Work"}`,
      });
      expect(institution).toHaveValue('');
      expect(section).toHaveTextContent('onixPlan.review.decision.institution.matches {"count":2}');
      expect(
        within(institution).getByRole('group', {
          name: 'onixPlan.review.decision.institution.suggestions',
          hidden: true,
        }),
      ).toBeInTheDocument();
      expect(
        within(institution).getByRole('option', { name: 'onixPlan.descriptive.option.NO_AFFILIATION', hidden: true }),
      ).toHaveValue('OMIT');
      await userEvent.selectOptions(institution, 'institution-university');
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [affiliation?.key ?? '']: 'institution-university' });

      // The price: one compact decision between the distinct amounts, or none, said as results.
      const priceGroup = within(priceTask).getByRole('radiogroup', {
        name: `onixPlan.review.decision.price.label {"publication":"onixPlan.publicationType.PAPERBACK ${ISBN_B}","work":"A Work"}`,
      });
      expect(
        within(priceGroup)
          .getAllByRole('radio')
          .map((radio) => (radio as HTMLInputElement).value),
      ).toEqual([candidates[0].key, candidates[1].key, 'OMIT']);
      const sixty = within(priceGroup).getByRole('radio', {
        name: 'onixPlan.review.decision.price.use {"price":"onixPlan.review.publication.price {\\"currency\\":\\"GBP\\",\\"amount\\":\\"60.00\\"}"}',
      });
      expect(sixty).not.toBeChecked();
      expect(
        within(priceGroup).getByRole('radio', { name: 'onixPlan.review.decision.price.none' }),
      ).toBeInTheDocument();
      expect(primaryText(section)).not.toContain('PriceQualifier');
      expect(primaryText(section)).not.toContain(price?.message ?? 'missing');
      await userEvent.click(sixty);
      expect(lastDecision(onChange).commercialChoices).toEqual({ [price?.key ?? '']: candidates[1].key });
    });

    it('keeps a stale price answer as an attention task that says so, never defaulting it, until it is cleared or replaced', async () => {
      const supplied = onixRecord({
        ref: 'pb',
        identifiers: isbn(ISBN_A),
        tail:
          '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier><ProductAvailability>20</ProductAvailability>' +
          '<Price><PriceType>02</PriceType><PriceAmount>20.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>' +
          '<Price><PriceType>02</PriceType><PriceAmount>22.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price></SupplyDetail></ProductSupply>',
      });
      const { resolve, context } = await planFile([supplied]);
      const open = resolve({}).sidecar;
      const [{ groupKey }] = open.workGroups;
      const price = (open.commercial?.findings ?? []).find(({ code }) => code === 'PRICE_AMOUNT_CONFLICT');
      const stale = '/ONIXMessage[1]/Product[9]/Price[1]';
      const { onChange } = renderReview(
        resolve({ workTypeOverrides: { [groupKey]: Monograph }, commercialChoices: { [price?.key ?? '']: stale } })
          .sidecar,
        context,
      );
      const section = confirmation();
      const task = within(section).getByTestId('onix-review-task');

      expect(task).toHaveAttribute('data-task-state', 'REJECTED');
      expect(task).toHaveTextContent('onixPlan.review.confirmation.stale');
      within(task)
        .getAllByRole('radio')
        .forEach((radio) => expect(radio).not.toBeChecked());
      expect(card()).toHaveAttribute('data-state', 'NEEDS_CONFIRMATION');
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.review.status.attention');

      await userEvent.click(
        within(task).getByRole('button', {
          name: 'onixPlan.review.confirmation.clearLabel {"task":"onixPlan.review.decision.price.title {\\"currency\\":\\"GBP\\"}"}',
        }),
      );
      expect(lastDecision(onChange).commercialChoices).toEqual({});
    });
  });

  describe('problems, automatic handling and technical details (thoth-app#262 Task 6)', () => {
    const card = () => screen.getByTestId('onix-review-work');
    const supplied = (prices: string, extra = '') =>
      onixRecord({
        ref: 'pb',
        identifiers: isbn(ISBN_A),
        descriptive: `<ProductForm>BC</ProductForm>${extra}`,
        tail:
          '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier>' +
          `<ProductAvailability>20</ProductAvailability>${prices}</SupplyDetail></ProductSupply>`,
      });
    const gbp = (amount: string) =>
      `<Price><PriceType>02</PriceType><PriceAmount>${amount}</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>`;

    it('keeps a problem of the file apart from the publisher’s confirmations, counting each separately and placing the Work in attention', async () => {
      // An unusable price amount is the file's to correct; the WorkType is still the publisher's to decide.
      const { resolve, context } = await planFile([supplied(gbp('abc'))]);
      const { sidecar } = resolve({});
      renderReview(sidecar, context);

      expect(card()).toHaveAttribute('data-state', 'BLOCKED');
      expect(card()).toHaveTextContent('onixPlan.review.work.state.BLOCKED');
      // Said in words beside its icon: not by colour alone.
      expect(card().querySelector('svg[data-testid="ErrorOutlineIcon"]')).not.toBeNull();
      const problems = within(card()).getByTestId('onix-review-problems');
      expect(within(problems).getByRole('heading', { level: 4 })).toHaveTextContent(
        'onixPlan.review.problems.heading (onixPlan.review.problems.count {"count":1})',
      );
      expect(within(problems).getAllByTestId('onix-review-problem')).toHaveLength(1);
      expect(within(problems).getByTestId('onix-review-problem')).toHaveTextContent(
        'onixPlan.blocker.COMMERCIAL_PREFLIGHT_GAP',
      );
      // A problem offers no control, and is not a confirmation; the confirmation is the WorkType alone.
      expect(within(problems).queryByRole('checkbox')).not.toBeInTheDocument();
      expect(within(problems).queryByRole('combobox')).not.toBeInTheDocument();
      expect(within(problems).queryByRole('radio')).not.toBeInTheDocument();
      expect(within(card()).getByTestId('onix-review-confirmation')).toHaveTextContent(
        'onixPlan.review.confirmation.count {"count":1}',
      );
      const status = screen.getByTestId('onix-plan-status');
      expect(status).toHaveTextContent('onixPlan.review.confirmations {"count":1}');
      expect(status).toHaveTextContent('onixPlan.review.problems {"count":1}');
      // The planner's own words are not the problem's copy.
      const unusable = (sidecar.commercial?.findings ?? []).find(({ code }) => code === 'PRICE_AMOUNT_UNUSABLE');
      expect(primaryText(within(problems).getByTestId('onix-review-problem'))).not.toContain(
        unusable?.message ?? 'missing',
      );
    });

    it('exposes the exact code, source path and planner note of one task or problem behind a closed, keyboard-operable disclosure', async () => {
      const { resolve, context } = await planFile([supplied(gbp('20.00') + gbp('22.00'))]);
      const { sidecar } = resolve({});
      const [{ groupKey }] = sidecar.workGroups;
      renderReview(resolve({ workTypeOverrides: { [groupKey]: Monograph } }).sidecar, context);
      const conflict = (sidecar.commercial?.findings ?? []).find(({ code }) => code === 'PRICE_AMOUNT_CONFLICT');
      const task = within(card()).getByTestId('onix-review-task');
      const details = within(task).getByTestId('onix-review-technical');
      const toggle = within(details).getByText('onixPlan.review.technical.heading').closest('summary') as HTMLElement;

      // Native disclosure semantics: a <details> element, closed by default, with its state on the element. Its summary
      // is a focusable control the keyboard toggles (jsdom does not implement that toggle, so it is activated here).
      expect(details.tagName).toBe('DETAILS');
      expect(details).not.toHaveAttribute('open');
      toggle.focus();
      expect(toggle).toHaveFocus();
      await userEvent.click(toggle);
      expect(details).toHaveAttribute('open');
      // Exactly this task's evidence: its code, where the file states it, and the planner's note as a note.
      expect(details).toHaveTextContent('PRICE_AMOUNT_CONFLICT');
      expect(details).toHaveTextContent('/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]/Price[1]');
      expect(details).toHaveTextContent(conflict?.message ?? 'missing');
      // The planner note lives only here: the task's own copy above does not repeat it.
      expect(primaryText(task)).not.toContain(conflict?.message ?? 'missing');
      // Nothing of the other findings - the supply detail Thoth does not record - is in it.
      expect(primaryText(details)).not.toContain('SUPPLY_NOT_REPRESENTED');
      // One disclosure per task, not a ledger of every finding: the summary and the card have no other.
      expect(within(card()).getAllByTestId('onix-review-technical')).toHaveLength(1);
    });

    it('folds a problem’s evidence behind its own disclosure, with the blocker’s classification', async () => {
      const { resolve, context } = await planFile([supplied(gbp('abc'))]);
      const { sidecar } = resolve({});
      const [{ groupKey }] = sidecar.workGroups;
      renderReview(resolve({ workTypeOverrides: { [groupKey]: Monograph } }).sidecar, context);
      const problem = within(card()).getByTestId('onix-review-problem');
      const details = within(problem).getByTestId('onix-review-technical');

      expect(details).not.toHaveAttribute('open');
      expect(details).toHaveTextContent('PRICE_AMOUNT_UNUSABLE');
      expect(details).toHaveTextContent('onixPlan.classification.PREFLIGHT_GAP');
      expect(details).toHaveTextContent('/ONIXMessage[1]/Product[1]/ProductSupply[1]/SupplyDetail[1]/Price[1]');
    });

    it('lists only high-level outcomes under automatically handled, never the deterministic losses', async () => {
      const toc =
        '<CollateralDetail><TextContent><TextType>04</TextType><ContentAudience>00</ContentAudience><Text textformat="06">1. One</Text></TextContent></CollateralDetail>';
      const { resolve, context } = await planFile([
        onixRecord({
          ref: 'pb',
          identifiers: isbn(ISBN_A),
          collateral: toc,
          related: `<RelatedProduct><ProductRelationCode>13</ProductRelationCode>${isbn('9781800000032')}</RelatedProduct>`,
          tail:
            '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier>' +
            `<ProductAvailability>20</ProductAvailability>${gbp('20.00')}</SupplyDetail></ProductSupply>`,
        }),
      ]);
      const [{ groupKey }] = resolve({}).sidecar.workGroups;
      renderReview(resolve({ workTypeOverrides: { [groupKey]: Monograph } }).sidecar, context);
      const automatic = screen.getByTestId('onix-review-automatic');

      expect(automatic).toHaveTextContent('onixPlan.review.automatic.heading {"count":2}');
      expect(
        within(automatic)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['onixPlan.review.automatic.FORMATS {"count":1}', 'onixPlan.review.automatic.PRICES {"count":1}']);
      ['RelatedProduct', 'tableOfContents', 'SUPPLY_NOT_REPRESENTED', 'not imported'].forEach((noise) =>
        expect(primaryText(automatic)).not.toContain(noise),
      );
    });
  });
});
