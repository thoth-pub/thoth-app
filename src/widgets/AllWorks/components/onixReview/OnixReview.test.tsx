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
});
