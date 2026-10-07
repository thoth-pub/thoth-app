import { parse } from '@5stones/onix';
import { ThemeProvider } from '@mui/material';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { currencyOptions, languageOptions, licenseOptions, PublicationType, WorkTypes } from '@/src/shared/constants';
import type { ExtendedONIXMessageRoot } from '@/src/shared/parsers/XMLParser/interfaces';
import { reduceOnixAccessibility } from '@/src/shared/parsers/XMLParser/onixAccessibility';
import { reduceOnixCollateral } from '@/src/shared/parsers/XMLParser/onixCollateral';
import { reduceOnixCommercial } from '@/src/shared/parsers/XMLParser/onixCommercial';
import { reduceOnixComponents } from '@/src/shared/parsers/XMLParser/onixComponents';
import { reduceOnixDescriptive } from '@/src/shared/parsers/XMLParser/onixDescriptive';
import { planOnixSource } from '@/src/shared/parsers/XMLParser/onixPlanning';
import {
  type OnixRelatedMaterialLookup,
  reduceOnixRelatedMaterial,
  resolveOnixRelatedMaterialTargets,
} from '@/src/shared/parsers/XMLParser/onixRelations';
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
import {
  type ImportIdentifier,
  ONIX_ACCESSIBILITY_ACKNOWLEDGED,
  ONIX_COLLATERAL_ACKNOWLEDGED,
  ONIX_COMPONENT_ACKNOWLEDGED,
  ONIX_RELATED_MATERIAL_ACKNOWLEDGED,
  ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
  ONIX_RIGHTS_ACKNOWLEDGED,
  type OnixAdaptedPublications,
  type OnixDescriptiveFinding,
  type OnixImportPlanSidecar,
  type OnixPlanInputs,
} from '@/src/shared/types';
import { importIdentifierKey } from '@/src/shared/utils/importPreflight/identifiers';
import { getDefaultPublication } from '@/src/shared/utils/publications';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

// Interpolation values stay visible in the rendered text, so each control's label names what it decides.
vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
  })),
}));

import { OnixPlanResolution } from './OnixPlanResolution';
import { localeLabel } from './onixReview/LocaleAutocomplete';
import type { OnixReviewPresentationContext } from './onixReview/reviewModel';

const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';
const IMPRINTS = [{ label: 'Example Imprint', value: 'imprint-1' }];
const ISBN_A = '9781800000018';
const ISBN_B = '9781800000025';
const GENERIC_HEADER =
  '<Header><Sender><SenderName>Example Press</SenderName></Sender><SentDateTime>20260913T1200</SentDateTime></Header>';

const { BookChapter, EditedBook, Monograph, Textbook } = WorkTypes.enum;

type RecordSpec = {
  ref: string;
  notification?: string;
  envelope?: string;
  identifiers?: string;
  descriptive?: string;
  related?: string;
};

const isbn = (value: string) =>
  `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${value}</IDValue></ProductIdentifier>`;

/** The least a Work is described by, stated unless a record states its own (thoth-app#183). */
const MINIMAL_TITLE =
  '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText language="eng">A Work</TitleText></TitleElement></TitleDetail>';

const onixRecord = ({
  ref,
  notification = '03',
  envelope = '',
  identifiers = '',
  descriptive = '<ProductForm>BC</ProductForm>',
  related = '',
  publishing = '<PublishingStatus>02</PublishingStatus>',
}: RecordSpec & { publishing?: string }) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>${notification}</NotificationType>${envelope}${identifiers}` +
  `<DescriptiveDetail>${descriptive}${descriptive.includes('<TitleDetail>') ? '' : MINIMAL_TITLE}</DescriptiveDetail>` +
  `<PublishingDetail><Imprint><ImprintName>Example Imprint</ImprintName></Imprint>${publishing}</PublishingDetail>` +
  `${related ? `<RelatedMaterial>${related}</RelatedMaterial>` : ''}</Product>`;

const noMatches: OnixTargetLookup = {
  findWorks: async () => new Map(),
  getWork: async (workId) => {
    throw new Error(`unexpected getWork(${workId})`);
  },
};

/** Thoth's exact answers: the Works each identifier key names, and those Works as read back. */
const exactLookup = (matches: Record<string, string[]>, works: WorkEntity[]): OnixTargetLookup => ({
  findWorks: async (identifiers: readonly ImportIdentifier[]) =>
    new Map(
      identifiers.map((identifier) => [
        importIdentifierKey(identifier),
        (matches[importIdentifierKey(identifier)] ?? []).map((workId) => ({
          workId,
          title: '',
          imprintId: 'imprint-1',
          doi: '',
          isbns: [],
        })),
      ]),
    ),
  getWork: async (workId) => works.find(({ id }) => id === workId) as WorkEntity,
});

type FileSpec = {
  records: string[];
  header?: string;
  lookup?: OnixTargetLookup;
  /** The active publisher's existing Accessibility contact emails, as XMLParse reads them back (thoth-app#217). */
  accessibilityContactEmails?: string[];
  /**
   * Thoth's read-only RelatedMaterial answers (thoth-app#224): when given, the RelatedMaterial reduction is resolved with
   * them, exactly as XMLParse does.
   */
  relatedLookup?: OnixRelatedMaterialLookup;
  /** The Publication candidates the parse materialised for Products an existing Work would gain (thoth-app#187). */
  attachments?: OnixAdaptedPublications;
};

/** The resolver XMLParse holds for a file: every reduction run once, and the plan resolved again for each decision. */
const planFor = async ({
  records,
  header = GENERIC_HEADER,
  lookup = noMatches,
  accessibilityContactEmails,
  relatedLookup,
  attachments,
}: FileSpec) => {
  const message = parse(
    `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${header}${records.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(message);
  const targets = await resolveOnixTargets(sourcePlan, lookup, 'publisher-1');
  const commercial = reduceOnixCommercial(message, sourcePlan);
  const rights = reduceOnixRights(message, sourcePlan);
  const relatedMaterial = reduceOnixRelatedMaterial(message, sourcePlan);
  const descriptive = reduceOnixDescriptive(message, sourcePlan);
  const collateral = reduceOnixCollateral(message, sourcePlan, { descriptive });
  const relatedMaterialTargets =
    relatedLookup === undefined
      ? undefined
      : await resolveOnixRelatedMaterialTargets(relatedMaterial, sourcePlan, targets, relatedLookup);
  const resolve = (inputs: Partial<OnixPlanInputs> = {}) =>
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
      salesRights: reduceOnixSalesRights(message, sourcePlan, {
        commercial,
        ...(accessibilityContactEmails === undefined
          ? {}
          : { publisherAccessibilityContactEmails: accessibilityContactEmails }),
      }),
      ...(relatedMaterialTargets === undefined ? {} : { relatedMaterial, relatedMaterialTargets }),
      // The collateral is always reduced, as XMLParse always reduces it (thoth-app#225), and so are the reviews,
      // endorsements and prizes read from it (thoth-app#226).
      collateral,
      reviewsPrizes: reduceOnixReviewsPrizes(message, sourcePlan, collateral),
      serieses: [],
      ...(attachments === undefined ? {} : { attachmentPublications: attachments }),
    });

  return { resolve, context: { descriptive, targets } satisfies OnixReviewPresentationContext };
};

const sidecarFor = async (file: FileSpec, inputs: Partial<OnixPlanInputs> = {}) =>
  (await planFor(file)).resolve(inputs).sidecar;

/** Renders the review for a file, and re-renders it for new decisions the way XMLParse resolves them again. */
const renderPanel = async (file: FileSpec, inputs: Partial<OnixPlanInputs> = {}) => {
  const onChange = vi.fn<(inputs: OnixPlanInputs) => void>();
  const { resolve, context } = await planFor(file);
  const sidecar = resolve(inputs).sidecar;
  const panel = (next: OnixImportPlanSidecar) => (
    <ThemeProvider theme={theme}>
      <OnixPlanResolution sidecar={next} context={context} onChange={onChange} />
    </ThemeProvider>
  );
  const view = render(panel(sidecar));
  const decideAgain = (next: Partial<OnixPlanInputs>) => view.rerender(panel(resolve(next).sidecar));

  return { onChange, sidecar, decideAgain, resolve, context };
};

const lastDecision = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.lastCall?.[0] as OnixPlanInputs;

/** The text a publisher reads without opening any technical details: what the review says of its own accord. */
const primaryText = (element: HTMLElement | null): string => {
  if (element === null) return '';

  const copy = element.cloneNode(true) as HTMLElement;

  copy.querySelectorAll('[data-testid="onix-review-technical"]').forEach((details) => details.remove());

  return copy.textContent ?? '';
};

/**
 * The values a select offers, in order. No option the review renders is hidden, so the query skips the visibility walk
 * that, over the several hundred Thoth locales, alone outlasts a slow CI runner's test timeout.
 */
const optionValues = (select: HTMLElement) =>
  within(select)
    .getAllByRole('option', { hidden: true })
    .map((option) => (option as HTMLOptionElement).value);

/** A hex colour as jsdom's style declarations serialise it. */
const rgbOf = (hex: string) =>
  `rgb(${[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`;

/** The text colours the emitted Emotion rules declare for an element and its ancestors up to `boundary`. */
const declaredTextColours = (element: Element, boundary: Element): string[] => {
  const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]);
  const colours: string[] = [];

  for (let current: Element | null = element; current !== null; current = current.parentElement) {
    const classes = [...current.classList].map((name) => `.${name}`);

    rules.forEach((rule) => {
      if (!(rule instanceof CSSStyleRule) || !rule.style.color) return;
      if (rule.selectorText.split(/[\s,>+~]+/).some((selector) => classes.includes(selector))) {
        colours.push(rule.style.color.toLowerCase());
      }
    });

    if (current === boundary) break;
  }

  return colours;
};

/* The review's parts, by what they are rather than how they are laid out. */
const status = () => screen.getByTestId('onix-plan-status');
const cards = () => screen.getAllByTestId('onix-review-work');
const card = (index = 0) => cards()[index];
const summary = (index = 0) => within(card(index)).getByTestId('onix-review-summary');
const confirmation = (index = 0) => within(card(index)).getByTestId('onix-review-confirmation');
const noConfirmation = (index = 0) => within(card(index)).queryByTestId('onix-review-confirmation');
const problems = (index = 0) => within(card(index)).queryByTestId('onix-review-problems');
const fileSection = () => screen.queryByTestId('onix-review-file');
const pendingTasks = (index = 0) =>
  within(confirmation(index))
    .getAllByTestId('onix-review-task')
    .filter((task) => task.closest('details') === null);
const taskNamed = (title: RegExp | string, index = 0) =>
  pendingTasks(index).find(
    (task) => within(task).queryByRole('heading', { level: 5, name: title }) !== null,
  ) as HTMLElement;
const decided = (index = 0) => within(summary(index)).queryAllByTestId('onix-review-decision');
const workTypeRadios = (container: HTMLElement = card()) =>
  within(container).queryAllByRole('radio', { name: /^onixPlan\.workType\./ });
const expectAttention = (count: number) =>
  expect(status()).toHaveTextContent(`onixPlan.review.confirmations {"count":${count}}`);
const expectReady = () => expect(status()).toHaveTextContent('onixPlan.review.status.ready');

describe('OnixPlanResolution', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(cleanup);

  const paperback = { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) })] };

  it('asks a one-Work file for its WorkType once, inside its Work, with nothing preselected, and records the choice for that Work', async () => {
    const { onChange, sidecar, decideAgain } = await renderPanel(paperback);
    const [{ groupKey }] = sidecar.workGroups;

    // One Work, one decision: no file-level choice beside a duplicate per-Work one (#179 5699313101, 6036599101 A).
    expect(cards()).toHaveLength(1);
    expect(fileSection()).not.toBeInTheDocument();
    const radios = workTypeRadios(confirmation());
    // Exactly the four ordinary top-level types: no book set, and no book chapter, which stays structural (#261 A).
    expect(radios.map((radio) => (radio as HTMLInputElement).value)).toEqual([
      Monograph,
      EditedBook,
      Textbook,
      WorkTypes.enum.JournalIssue,
    ]);
    radios.forEach((radio) => expect(radio).not.toBeChecked());
    expectAttention(1);
    expect(within(summary()).queryByTestId('onix-review-work-type')).not.toBeInTheDocument();

    await userEvent.click(within(confirmation()).getByRole('radio', { name: 'onixPlan.workType.TEXTBOOK' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      ...EMPTY_ONIX_PLAN_INPUTS,
      workTypeOverrides: { [groupKey]: Textbook },
    });

    // Resolved: the type is a fact of the summary, said plainly, and the Work is ready.
    decideAgain(lastDecision(onChange));
    expect(within(summary()).getByTestId('onix-review-work-type')).toHaveTextContent('onixPlan.workType.TEXTBOOK');
    expect(primaryText(summary())).not.toContain('workTypeProvenance');
    expect(noConfirmation()).not.toBeInTheDocument();
    expectReady();

    // Change: the decision reopens with the publisher's own answer, and another choice writes the override again.
    await userEvent.click(
      within(summary()).getByRole('button', {
        name: 'onixPlan.review.summary.edit {"fact":"onixPlan.review.summary.workType","work":"A Work"}',
      }),
    );
    expect(within(confirmation()).getByRole('radio', { name: 'onixPlan.workType.TEXTBOOK' })).toBeChecked();
    await userEvent.click(within(confirmation()).getByRole('radio', { name: 'onixPlan.workType.MONOGRAPH' }));
    expect(lastDecision(onChange).workTypeOverrides).toEqual({ [groupKey]: Monograph });
  });

  it("says the plan is ready in plain words, with the Work's facts and its Publication as Thoth will create it", async () => {
    const [{ groupKey }] = (await sidecarFor(paperback)).workGroups;
    await renderPanel(paperback, { workTypeOverrides: { [groupKey]: Monograph } });

    expectReady();
    expect(status()).toHaveTextContent('onixPlan.review.ready');
    expect(card()).toHaveTextContent('onixPlan.review.work.target.NEW_WORK');
    expect(within(summary()).getByTestId('onix-review-work-type')).toHaveTextContent('onixPlan.workType.MONOGRAPH');
    expect(within(summary()).getByTestId('onix-review-edition')).toHaveTextContent('1');
    const publication = within(summary()).getByTestId('onix-review-publication');
    expect(publication).toHaveTextContent('onixPlan.publicationType.PAPERBACK');
    expect(publication).toHaveTextContent(ISBN_A);
    expect(publication).toHaveTextContent('onixPlan.review.publication.action.CREATE_PUBLICATION');
    // The normal view reads as what Thoth will do, never as planner evidence or provenance.
    expect(primaryText(card())).not.toContain('workEvidence');
    expect(primaryText(card())).not.toContain('productEvidence');
    expect(primaryText(card())).not.toContain('workTypeProvenance');
    expect(noConfirmation()).not.toBeInTheDocument();
    expect(problems()).not.toBeInTheDocument();
  });

  it('asks every new Work of a file for its own WorkType, and still honours a file-wide type given through the canonical input', async () => {
    const twoWorks = {
      records: [
        onixRecord({ ref: 'pb1', identifiers: isbn(ISBN_A) }),
        onixRecord({ ref: 'pb2', identifiers: isbn(ISBN_B) }),
      ],
    };
    const { onChange, sidecar, decideAgain } = await renderPanel(twoWorks);
    const [first, second] = sidecar.workGroups;

    // Two Works, each with its own decision inside its own card; no bulk control stands above them.
    expect(cards()).toHaveLength(2);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(workTypeRadios(confirmation(0))).toHaveLength(4);
    expect(workTypeRadios(confirmation(1))).toHaveLength(4);
    expectAttention(2);
    expect(status()).toHaveTextContent('onixPlan.review.acrossWorks {"count":2}');

    await userEvent.click(within(confirmation(0)).getByRole('radio', { name: 'onixPlan.workType.TEXTBOOK' }));
    expect(lastDecision(onChange)).toEqual({
      ...EMPTY_ONIX_PLAN_INPUTS,
      workTypeOverrides: { [first.groupKey]: Textbook },
    });

    // The canonical file-wide input stays valid state: both Works show the type it gives, each changeable on its own.
    // Nothing needs attention any more, so the view opened on says so; All shows both Works.
    decideAgain({ fileWorkType: Textbook });
    expect(screen.getByRole('tabpanel')).toHaveTextContent('onixPlan.review.filter.empty.ATTENTION');
    await userEvent.click(screen.getByRole('tab', { name: 'onixPlan.review.filter.ALL {"count":2}' }));
    expect(screen.getAllByTestId('onix-review-work-type').map((fact) => fact.textContent)).toEqual([
      expect.stringContaining('onixPlan.workType.TEXTBOOK'),
      expect.stringContaining('onixPlan.workType.TEXTBOOK'),
    ]);
    expectReady();
    await userEvent.click(
      within(summary(1)).getByRole('button', {
        name: 'onixPlan.review.summary.edit {"fact":"onixPlan.review.summary.workType","work":"A Work"}',
      }),
    );
    await userEvent.click(within(confirmation(1)).getByRole('radio', { name: 'onixPlan.workType.MONOGRAPH' }));
    expect(lastDecision(onChange)).toEqual({
      ...EMPTY_ONIX_PLAN_INPUTS,
      fileWorkType: Textbook,
      workTypeOverrides: { [second.groupKey]: Monograph },
    });

    decideAgain(lastDecision(onChange));
    expect(screen.getAllByTestId('onix-review-work-type').map((fact) => fact.textContent)).toEqual([
      expect.stringContaining('onixPlan.workType.TEXTBOOK'),
      expect.stringContaining('onixPlan.workType.MONOGRAPH'),
    ]);
  });

  it('proposes the WorkType the sidecar suggests to confirm or replace: nothing is selected, recorded or unblocked by it', async () => {
    const edited = {
      records: [
        onixRecord({
          ref: 'pb',
          identifiers: isbn(ISBN_A),
          descriptive:
            '<ProductForm>BC</ProductForm><Contributor><ContributorRole>B01</ContributorRole><PersonName>Jane Doe</PersonName><NamesBeforeKey>Jane</NamesBeforeKey><KeyNames>Doe</KeyNames></Contributor>',
        }),
      ],
    };
    const { onChange, sidecar } = await renderPanel(edited);

    expect(sidecar.workGroups[0]).toMatchObject({ workType: { status: 'UNRESOLVED' }, workTypeSuggestion: EditedBook });
    expect(confirmation()).toHaveTextContent(
      'onixPlan.review.decision.workType.suggested {"type":"onixPlan.workType.EDITED_BOOK"}',
    );
    expect(
      within(confirmation()).getByRole('button', {
        name: 'onixPlan.review.decision.workType.confirm {"type":"onixPlan.workType.EDITED_BOOK"}',
      }),
    ).toBeInTheDocument();
    expect(workTypeRadios()).toEqual([]);
    expect(within(summary()).queryByTestId('onix-review-work-type')).not.toBeInTheDocument();
    expect(primaryText(card())).not.toContain('onixPlan.workType.suggestion');
    expectAttention(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reads a blocked plan in ordinary text, its severity said by a label and an icon rather than pale yellow', async () => {
    await renderPanel(paperback);

    const colours = declaredTextColours(within(status()).getByText(/^onixPlan\.review\.confirmations/), status());

    [theme.palette.warning.main.toLowerCase(), rgbOf(theme.palette.warning.main)].forEach((pale) =>
      expect(colours).not.toContain(pale),
    );
    expect(status()).toHaveTextContent('onixPlan.review.status.attention');
    expect(status().querySelector('svg[data-testid="WarningAmberIcon"]')).not.toBeNull();
    expect(card()).toHaveAttribute('data-state', 'NEEDS_CONFIRMATION');
    expect(card()).toHaveTextContent('onixPlan.review.work.state.NEEDS_CONFIRMATION');
  });

  it('never offers to leave out a Publication the file resolves: the four University of London Press manifestations', async () => {
    const related =
      '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.14296/uolp</IDValue></WorkIdentifier></RelatedWork>';
    const uolp = {
      records: [
        onixRecord({ ref: 'hb', identifiers: isbn(ISBN_A), descriptive: '<ProductForm>BB</ProductForm>', related }),
        onixRecord({ ref: 'pb', identifiers: isbn(ISBN_B), descriptive: '<ProductForm>BC</ProductForm>', related }),
        onixRecord({
          ref: 'epub',
          identifiers: isbn('9781800000032'),
          descriptive: '<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>',
          related,
        }),
        onixRecord({
          ref: 'pdf',
          identifiers: isbn('9781800000049'),
          descriptive: '<ProductForm>EA</ProductForm><ProductFormDetail>E107</ProductFormDetail>',
          related,
        }),
      ],
    };
    const { sidecar } = await renderPanel(uolp);

    expect(cards()).toHaveLength(1);
    expect(sidecar.products.map(({ omittable }) => omittable)).toEqual([false, false, false, false]);
    expect(within(card()).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(card()).queryByTestId('onix-review-optional')).not.toBeInTheDocument();
    expect(primaryText(card())).not.toContain('onixPlan.review.decision.manifestation');
    const publications = within(summary()).getAllByTestId('onix-review-publication');
    expect(publications).toHaveLength(4);
    publications.forEach((row) =>
      expect(row).toHaveTextContent('onixPlan.review.publication.action.CREATE_PUBLICATION'),
    );
  });

  it('offers only the formats the file allows, or no Publication at all, for a Product whose format it leaves open', async () => {
    const kindle = {
      records: [
        onixRecord({
          ref: 'kindle',
          identifiers: isbn(ISBN_A),
          descriptive: '<ProductForm>EB</ProductForm><ProductFormDetail>E116</ProductFormDetail>',
        }),
      ],
    };
    const { onChange, sidecar } = await renderPanel(kindle, { fileWorkType: Monograph });
    const [{ productKey }] = sidecar.products;
    const task = taskNamed('onixPlan.review.decision.manifestation.title');

    expect(task).toHaveTextContent('onixPlan.manifestation.reason.KINDLE_FAMILY');
    const format = within(task).getByRole('combobox', { name: /^onixPlan\.review\.decision\.manifestation\.label/ });
    expect(optionValues(format)).toEqual(['', PublicationType.enum.Mobi, PublicationType.enum.Azw3, 'OMIT']);
    expect(within(summary()).getByTestId('onix-review-publication')).toHaveTextContent(
      'onixPlan.review.publication.untyped',
    );
    expectAttention(1);

    await userEvent.selectOptions(format, PublicationType.enum.Azw3);
    expect(lastDecision(onChange).manifestationChoices).toEqual({ [productKey]: PublicationType.enum.Azw3 });

    await userEvent.selectOptions(format, 'OMIT');
    expect(lastDecision(onChange).manifestationChoices).toEqual({ [productKey]: 'OMIT' });
  });

  it('creates no Publication for a package Thoth cannot hold until that is explicitly acknowledged, and lets it be taken back', async () => {
    const box = {
      records: [
        onixRecord({
          ref: 'box',
          identifiers: isbn(ISBN_A),
          descriptive: '<ProductComposition>10</ProductComposition><ProductForm>SA</ProductForm>',
        }),
      ],
    };
    const { onChange, sidecar, decideAgain } = await renderPanel(box, { fileWorkType: Monograph });
    const [{ productKey }] = sidecar.products;
    const task = taskNamed('onixPlan.review.decision.manifestation.title');

    expect(task).toHaveTextContent('onixPlan.manifestation.loss.PACKAGE');
    const acknowledgement = within(task).getByRole('checkbox', {
      name: /^onixPlan\.review\.decision\.manifestation\.omitLabel/,
    });
    expect(acknowledgement).not.toBeChecked();
    expectAttention(1);

    await userEvent.click(acknowledgement);
    expect(lastDecision(onChange).manifestationChoices).toEqual({ [productKey]: 'OMIT' });

    // Acknowledged: the Publication reads as not imported, with the affordance to take the acknowledgement back.
    decideAgain(lastDecision(onChange));
    expectReady();
    expect(noConfirmation()).not.toBeInTheDocument();
    const publication = within(summary()).getByTestId('onix-review-publication');
    expect(publication).toHaveTextContent('onixPlan.review.publication.action.OMIT/EXCLUDED');
    await userEvent.click(within(publication).getByRole('button', { name: /^onixPlan\.review\.publication\.edit/ }));
    const reopened = within(confirmation()).getByRole('checkbox', {
      name: /^onixPlan\.review\.decision\.manifestation\.omitLabel/,
    });
    expect(reopened).toBeChecked();
    await userEvent.click(reopened);
    expect(lastDecision(onChange).manifestationChoices).toEqual({});
  });

  it('asks for an edition only when the file describes an unnumbered new edition, and takes only a whole number of 1 or more', async () => {
    const revised = {
      records: [
        onixRecord({
          ref: 'rev',
          identifiers: isbn(ISBN_A),
          descriptive: '<ProductForm>BC</ProductForm><EditionType>REV</EditionType>',
        }),
      ],
    };
    await renderPanel(paperback, { fileWorkType: Monograph });
    expect(
      screen.queryByRole('textbox', { name: /^onixPlan\.review\.decision\.edition\.label/ }),
    ).not.toBeInTheDocument();
    cleanup();

    const { onChange, sidecar } = await renderPanel(revised, { fileWorkType: Monograph });
    const [{ groupKey }] = sidecar.workGroups;
    const edition = within(confirmation()).getByRole('textbox', {
      name: /^onixPlan\.review\.decision\.edition\.label/,
    });
    const confirmEdition = () =>
      within(confirmation()).getByRole('button', {
        name: 'onixPlan.review.confirmation.confirmLabel {"task":"onixPlan.review.decision.edition.title"}',
      });
    expectAttention(1);
    expect(within(summary()).queryByTestId('onix-review-edition')).not.toBeInTheDocument();

    await userEvent.type(edition, '0');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('onixPlan.review.decision.edition.invalid')).toBeInTheDocument();
    expect(confirmEdition()).toBeDisabled();

    // Typing is a draft: no keystroke reaches the canonical input, so "12" cannot be taken as 1 (#264 CR-1).
    await userEvent.clear(edition);
    await userEvent.type(edition, '12');
    expect(onChange).not.toHaveBeenCalled();
    expect(edition).toHaveValue('12');
    expect(screen.queryByText('onixPlan.review.decision.edition.invalid')).not.toBeInTheDocument();

    await userEvent.click(confirmEdition());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastDecision(onChange).editionInputs).toEqual({ [groupKey]: 12 });
  });

  it('lets the publisher leave out a record Thoth cannot apply, as a decision of the file, and never offers that for a test record', async () => {
    const file = {
      records: [
        onixRecord({ ref: 'a', identifiers: isbn(ISBN_A) }),
        onixRecord({
          ref: 'b',
          notification: '05',
          envelope: '<DeletionText>Sent in error</DeletionText>',
          identifiers: isbn(ISBN_B),
        }),
        onixRecord({ ref: 't', notification: '88', identifiers: isbn('9781800000032') }),
      ],
    };
    const { onChange, sidecar } = await renderPanel(file, { fileWorkType: Monograph });
    const deletion = sidecar.records.find(({ recordReference }) => recordReference === 'b');
    const section = fileSection() as HTMLElement;

    expect(section).toBeInTheDocument();
    expect(within(section).getByRole('heading', { level: 5 })).toHaveTextContent(
      'onixPlan.review.decision.record.title {"record":"b"}',
    );
    expect(section).toHaveTextContent('onixPlan.disposition.DELETE');
    expect(section).toHaveTextContent('05');
    expect(section).toHaveTextContent('onixPlan.review.decision.record.deletionText {"text":"Sent in error"}');
    expect(within(section).getAllByRole('checkbox')).toHaveLength(1);
    expect(primaryText(section)).not.toContain('"record":"t"');
    expectAttention(1);

    await userEvent.click(
      within(section).getByRole('checkbox', { name: 'onixPlan.review.decision.record.exclude {"record":"b"}' }),
    );
    expect(lastDecision(onChange).excludedRecordKeys).toEqual([deletion?.recordKey]);
  });

  it("asks for Thoth compatibility only when a Thoth profile file's native ids could not be verified", async () => {
    const WORK_UUID = '11111111-2222-4333-8444-555555555555';
    const PUBLICATION_UUID = 'aaaaaaaa-0000-4000-8000-000000000001';
    const thothFile = {
      header:
        '<Header><Sender><SenderName>Thoth</SenderName><EmailAddress>distribution@thoth.pub</EmailAddress></Sender><SentDateTime>20260913T1200</SentDateTime></Header>',
      records: [
        onixRecord({
          ref: `urn:uuid:${PUBLICATION_UUID}`,
          envelope: '<RecordSourceType>01</RecordSourceType>',
          identifiers:
            `<ProductIdentifier><ProductIDType>01</ProductIDType><IDTypeName>thoth-work-id</IDTypeName><IDValue>urn:uuid:${WORK_UUID}</IDValue></ProductIdentifier>` +
            `<ProductIdentifier><ProductIDType>01</ProductIDType><IDTypeName>thoth-publication-id</IDTypeName><IDValue>urn:uuid:${PUBLICATION_UUID}</IDValue></ProductIdentifier>` +
            isbn(ISBN_A),
          descriptive: '<ProductForm>EB</ProductForm><ProductFormDetail>E107</ProductFormDetail>',
        }),
      ],
    };

    const { onChange } = await renderPanel(thothFile, { fileWorkType: EditedBook });
    const section = fileSection() as HTMLElement;

    expect(section).toHaveTextContent('onixPlan.review.decision.compatibility.body');
    const confirm = within(section).getByRole('checkbox', { name: 'onixPlan.review.decision.compatibility.confirm' });
    expect(confirm).not.toBeChecked();
    expectAttention(1);

    await userEvent.click(confirm);
    expect(lastDecision(onChange)).toEqual({
      ...EMPTY_ONIX_PLAN_INPUTS,
      fileWorkType: EditedBook,
      thothCompatibilityConfirmed: true,
    });

    cleanup();
    await renderPanel(paperback, { fileWorkType: Monograph });
    expect(
      screen.queryByRole('checkbox', { name: 'onixPlan.review.decision.compatibility.confirm' }),
    ).not.toBeInTheDocument();
  });

  it('shows an attachment to an existing Work as planned, creates no Work for it, and still lets that Product create no Publication', async () => {
    const WORK_DOI = 'https://doi.org/10.1234/work';
    // The existing Work agrees with everything the record says about it, so only the attachment itself is planned.
    const existing = getDefaultWork({
      id: 'w-1',
      doi: WORK_DOI,
      type: EditedBook,
      imprintId: 'imprint-1',
      titles: [getDefaultTitle({ canonical: true, title: 'A Work', fullTitle: 'A Work' })],
      publications: [getDefaultPublication({ id: 'p-1', type: PublicationType.enum.Paperback, isbn: ISBN_B })],
    });
    const records = [
      onixRecord({
        ref: 'pdf',
        identifiers: isbn(ISBN_A),
        descriptive: '<ProductForm>EB</ProductForm><ProductFormDetail>E107</ProductFormDetail>',
        related:
          '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/work</IDValue></WorkIdentifier></RelatedWork>',
      }),
    ];
    const lookup = exactLookup({ 'doi:https://doi.org/10.1234/work': ['w-1'] }, [existing]);
    const unadapted = await sidecarFor({ records, lookup });
    const [{ productKey: pdfKey }] = unadapted.products;

    // Without the exact Publication the parse materialises for it, the attachment cannot be confirmed.
    expect(unadapted.blockers.map(({ code, classification }) => [code, classification])).toEqual([
      ['EXISTING_WORK_PUBLICATION_NOT_ADAPTED', 'PREFLIGHT_GAP'],
    ]);

    const file = {
      records,
      lookup,
      attachments: {
        [pdfKey]: {
          [PublicationType.enum.Pdf]: {
            publication: getDefaultPublication({ type: PublicationType.enum.Pdf, isbn: ISBN_A }),
            issues: [],
          },
        },
      },
    };
    const { onChange, sidecar } = await renderPanel(file);
    const [{ productKey }] = sidecar.products;

    expect(card()).toHaveTextContent('onixPlan.review.work.target.EXISTING_WORK');
    expect(within(summary()).getByTestId('onix-review-work-type')).toHaveTextContent('onixPlan.workType.EDITED_BOOK');
    // An existing Work's type is its own: nothing is chosen or suggested for it.
    expect(
      within(within(summary()).getByTestId('onix-review-work-type')).queryByRole('button'),
    ).not.toBeInTheDocument();
    expect(workTypeRadios()).toEqual([]);
    expect(within(summary()).getByTestId('onix-review-publication')).toHaveTextContent(
      'onixPlan.review.publication.action.CREATE_PUBLICATION_ON_EXISTING_WORK',
    );
    // No new Work, and still something to do: the plan is ready, never "nothing to create".
    expectReady();
    expect(status()).toHaveTextContent('onixPlan.review.ready');

    // Leaving the Publication out is the publisher's option, offered apart from what the plan waits on.
    const optional = within(card()).getByTestId('onix-review-optional');
    expect(optional).toHaveTextContent('onixPlan.review.confirmation.optional {"count":1}');
    await userEvent.click(
      within(optional).getByRole('checkbox', {
        name: /^onixPlan\.review\.decision\.manifestation\.omitLabel/,
        hidden: true,
      }),
    );
    expect(lastDecision(onChange).manifestationChoices).toEqual({ [productKey]: 'OMIT' });
  });

  it('shows an attachment whose Work-level compatibility is unverified as a problem of the file, never as a question', async () => {
    const WORK_DOI = 'https://doi.org/10.1234/work';
    const existing = getDefaultWork({
      id: 'w-1',
      doi: WORK_DOI,
      type: EditedBook,
      imprintId: 'imprint-1',
      titles: [getDefaultTitle({ canonical: true, title: 'Existing' })],
      publications: [getDefaultPublication({ id: 'p-1', type: PublicationType.enum.Paperback, isbn: ISBN_B })],
    });

    await renderPanel({
      records: [
        onixRecord({
          ref: 'pdf',
          identifiers: isbn(ISBN_A),
          descriptive:
            '<ProductForm>EB</ProductForm><ProductFormDetail>E107</ProductFormDetail>' +
            '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleText>A Work</TitleText></TitleElement></TitleDetail>',
          related:
            '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/work</IDValue></WorkIdentifier></RelatedWork>',
        }),
      ],
      lookup: exactLookup({ 'doi:https://doi.org/10.1234/work': ['w-1'] }, [existing]),
    });

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Existing');
    expect(card()).toHaveTextContent('onixPlan.review.work.target.EXISTING_WORK');
    // The review renders the state the resolver decided; it never decides compatibility itself. The record's title
    // states neither its level nor its language, and the comparison waits on exactly those: the title and its language
    // are the decisions asked, and until they are taken the Publication is not added.
    expect(within(summary()).getByTestId('onix-review-publication')).toHaveTextContent(
      'onixPlan.review.publication.action.BLOCKED',
    );
    expect(card()).toHaveAttribute('data-state', 'NEEDS_CONFIRMATION');
    expect(pendingTasks().map((task) => within(task).getByRole('heading', { level: 5 }).textContent)).toEqual([
      'onixPlan.review.decision.topic.TITLE_CANONICAL_MISSING',
      'onixPlan.review.decision.topic.TITLE_LOCALE_UNRESOLVED',
    ]);
    expect(problems()).not.toBeInTheDocument();
    expectAttention(2);
  });

  describe('descriptive decisions (thoth-app#183)', () => {
    // A corporate contributor, which Thoth never holds as a person: an omission only the publisher's consent allows.
    const corporate =
      '<ProductForm>BC</ProductForm>' +
      '<Contributor><ContributorRole>A01</ContributorRole><CorporateName>Example Institute</CorporateName></Contributor>';
    const unspecified = {
      records: [
        onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), publishing: '<PublishingStatus>00</PublishingStatus>' }),
      ],
    };

    it('asks a question the file leaves open with the answers the source itself offers, and records the answer by finding', async () => {
      const { onChange, sidecar, decideAgain } = await renderPanel(unspecified, { fileWorkType: Monograph });
      const [finding] = sidecar.descriptive.findings.filter(({ code }) => code === 'LIFECYCLE_STATUS_REQUIRED');
      const task = taskNamed('onixPlan.review.decision.topic.LIFECYCLE_STATUS_REQUIRED');

      expectAttention(1);
      // The planner's explanation is not the question: the question is named for what it decides.
      expect(primaryText(task)).not.toContain(finding.message);
      const control = within(task).getByRole('combobox');
      expect(control).toHaveValue('');
      expect(optionValues(control)).toEqual([
        '',
        ...(finding.resolution.kind === 'CHOICE' ? finding.resolution.options.map(({ key }) => key) : []),
      ]);

      await userEvent.selectOptions(control, 'FORTHCOMING');
      expect(lastDecision(onChange)).toEqual({
        ...EMPTY_ONIX_PLAN_INPUTS,
        fileWorkType: Monograph,
        descriptiveChoices: { [finding.key]: 'FORTHCOMING' },
      });

      // Answered, the question leaves the confirmations for the summary, with the affordance to change it.
      decideAgain(lastDecision(onChange));
      expectReady();
      expect(noConfirmation()).not.toBeInTheDocument();
      expect(decided()).toHaveLength(1);
      expect(decided()[0]).toHaveTextContent('onixPlan.review.decision.topic.LIFECYCLE_STATUS_REQUIRED: FORTHCOMING');
      await userEvent.click(within(decided()[0]).getByRole('button'));
      const reopened = within(confirmation()).getByRole('combobox');
      expect(reopened).toHaveValue('FORTHCOMING');
      await userEvent.selectOptions(reopened, '');
      expect(lastDecision(onChange).descriptiveChoices).toEqual({});
    });

    it('records the consent an omission needs, and lets it be taken back', async () => {
      const file = { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), descriptive: corporate })] };
      const { onChange, sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const [finding] = sidecar.descriptive.findings.filter(({ code }) => code === 'CONTRIBUTOR_AGENT_UNREPRESENTABLE');

      const consent = within(confirmation()).getByRole('checkbox', {
        name: /topic\.CONTRIBUTOR_AGENT_UNREPRESENTABLE/,
      });
      expect(consent).not.toBeChecked();

      await userEvent.click(consent);
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: 'ACKNOWLEDGED' });

      decideAgain(lastDecision(onChange));
      expect(noConfirmation()).not.toBeInTheDocument();
      expect(decided()[0]).toHaveTextContent('onixPlan.review.summary.confirmed');
      await userEvent.click(within(decided()[0]).getByRole('button'));
      const reopened = within(confirmation()).getByRole('checkbox', {
        name: /topic\.CONTRIBUTOR_AGENT_UNREPRESENTABLE/,
      });
      expect(reopened).toBeChecked();
      await userEvent.click(reopened);
      expect(lastDecision(onChange).descriptiveChoices).toEqual({});
    });

    it('takes a date the file does not give only as a complete calendar day, and lets it be cleared', async () => {
      const active = {
        records: [
          onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), publishing: '<PublishingStatus>04</PublishingStatus>' }),
        ],
      };
      const { onChange, sidecar, decideAgain } = await renderPanel(active, { fileWorkType: Monograph });
      const [finding] = sidecar.descriptive.findings.filter(({ code }) => code === 'LIFECYCLE_DATE_REQUIRED');
      const date = () =>
        screen.getByLabelText(
          /^onixPlan\.review\.decision\.date\.label \{"title":"onixPlan\.review\.decision\.topic\.LIFECYCLE_DATE_REQUIRED"/,
        );

      expect(finding.resolution).toEqual({ kind: 'INPUT', input: 'DATE' });
      expect(date()).toHaveAttribute('type', 'date');
      expect(date()).toHaveValue('');

      fireEvent.change(date(), { target: { value: '2024-03-15' } });
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: '2024-03-15' });

      decideAgain(lastDecision(onChange));
      expectReady();
      expect(decided()[0]).toHaveTextContent('2024-03-15');

      // A stored day that does not exist answers nothing: the task says so, and the plan still waits.
      decideAgain({ ...lastDecision(onChange), descriptiveChoices: { [finding.key]: '2024-02-30' } });
      expectAttention(1);
      const rejected = taskNamed('onixPlan.review.decision.topic.LIFECYCLE_DATE_REQUIRED');
      expect(rejected).toHaveAttribute('data-task-state', 'REJECTED');
      expect(rejected).toHaveTextContent('onixPlan.review.confirmation.invalid');
      expect(date()).toHaveAccessibleDescription(
        expect.stringContaining('onixPlan.review.decision.topic.LIFECYCLE_DATE_REQUIRED'),
      );

      fireEvent.change(date(), { target: { value: '' } });
      expect(lastDecision(onChange).descriptiveChoices).toEqual({});
    });

    it('takes a title locale the file does not state from Thoth locales, found by typing, preselecting none', async () => {
      const untagged =
        '<ProductForm>BC</ProductForm><TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Cities</TitleText></TitleElement></TitleDetail>';
      const file = { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), descriptive: untagged })] };
      const { onChange, sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const [finding] = sidecar.descriptive.findings.filter(({ code }) => code === 'TITLE_LOCALE_UNRESOLVED');

      expectAttention(1);
      const locale = within(confirmation()).getByRole('combobox', {
        name: 'onixPlan.review.decision.locale.label {"title":"onixPlan.review.decision.topic.TITLE_LOCALE_UNRESOLVED","work":"Cities"}',
      });
      // A searchable control, never the whole vocabulary as a native select.
      expect(locale.tagName).toBe('INPUT');
      expect(confirmation().querySelector('select')).toBeNull();
      expect(locale).toHaveValue('');

      await userEvent.type(locale, 'French');
      await userEvent.click(screen.getByRole('option', { name: localeLabel('FR'), hidden: true }));
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: 'FR' });

      decideAgain(lastDecision(onChange));
      expectReady();
      expect(decided()[0]).toHaveTextContent(localeLabel('FR'));
    });

    it('takes text the file does not give, and treats an entry of nothing but spaces as no answer', async () => {
      const unnamed =
        '<ProductForm>BC</ProductForm><Contributor><ContributorRole>A01</ContributorRole><PersonName>A N Other</PersonName></Contributor>';
      const file = { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), descriptive: unnamed })] };
      const { onChange, sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const [finding] = sidecar.descriptive.findings.filter(({ code }) => code === 'CONTRIBUTOR_NAME_REQUIRED');
      const surname = () =>
        within(confirmation()).getByRole('textbox', {
          name: /^onixPlan\.review\.decision\.text\.label \{"title":"onixPlan\.review\.decision\.topic\.CONTRIBUTOR_NAME_REQUIRED - A N Other"/,
        });

      const confirmSurname = () =>
        within(confirmation()).getByRole('button', {
          name: 'onixPlan.review.confirmation.confirmLabel {"task":"onixPlan.review.decision.topic.CONTRIBUTOR_NAME_REQUIRED - A N Other"}',
        });

      // Typing is a draft: "Other" is never committed as "O", or at all, until the publisher confirms it (#264 CR-1).
      await userEvent.type(surname(), 'Other');
      expect(onChange).not.toHaveBeenCalled();
      expect(surname()).toHaveValue('Other');
      await userEvent.click(confirmSurname());
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: 'Other' });

      decideAgain(lastDecision(onChange));
      expectReady();
      expect(decided()[0]).toHaveTextContent('Other');

      // Reopened to change: the draft starts from the answer, and an emptied draft cannot be confirmed - the answer stands.
      await userEvent.click(within(decided()[0]).getByRole('button'));
      expect(surname()).toHaveValue('Other');
      await userEvent.clear(surname());
      expect(confirmSurname()).toBeDisabled();
      expect(onChange).toHaveBeenCalledTimes(1);

      // Nothing but spaces is the resolver's to refuse: committed once, it is a rejected answer that waits again.
      await userEvent.type(surname(), '   ');
      await userEvent.click(confirmSurname());
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: '   ' });
      decideAgain(lastDecision(onChange));
      expectAttention(1);
      expect(taskNamed(/CONTRIBUTOR_NAME_REQUIRED/)).toHaveAttribute('data-task-state', 'REJECTED');
    });

    it('asks nothing about a credited external front cover: the one cover is a fact, the plan is ready, and the credit stays out of view (#261 C)', async () => {
      const COVER = 'https://images.example.org/covers/a-work.jpg';
      const CREDIT = 'Photo: A. Photographer';
      const collateral =
        '<CollateralDetail><SupportingResource><ResourceContentType>01</ResourceContentType><ContentAudience>00</ContentAudience>' +
        `<ResourceMode>03</ResourceMode><ResourceFeature><ResourceFeatureType>01</ResourceFeatureType><FeatureNote>${CREDIT}</FeatureNote></ResourceFeature>` +
        `<ResourceVersion><ResourceForm>02</ResourceForm><ResourceLink>${COVER}</ResourceLink></ResourceVersion>` +
        '</SupportingResource></CollateralDetail>';
      const file = {
        records: [
          onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) }).replace(
            '</DescriptiveDetail>',
            `</DescriptiveDetail>${collateral}`,
          ),
        ],
      };
      const { onChange, sidecar } = await renderPanel(file, { fileWorkType: Monograph });
      const coverFindings = sidecar.descriptive.findings.filter(({ family }) => family === 'COVER');

      expect(within(summary()).getByTestId('onix-review-cover')).toHaveTextContent(
        'onixPlan.review.summary.coverFound',
      );
      expect(noConfirmation()).not.toBeInTheDocument();
      expect(problems()).not.toBeInTheDocument();
      expectReady();
      expect(sidecar.executable).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
      expect(primaryText(card())).not.toContain(CREDIT);
      expect(primaryText(card())).not.toContain('download');
      // The credit and the hosting it expects stay evidence in the plan, blocking nothing.
      expect(coverFindings.map(({ code, blocking }) => [code, blocking])).toEqual([
        ['COVER_DETAIL_NOT_IMPORTED', false],
      ]);
    });

    it('offers no control for a finding nothing in the app can answer, and names it as a problem of the file', async () => {
      // A declared ORCID Thoth cannot read is the file's to correct (5562159621 rule 79): no fallback is offered.
      const invalidOrcid =
        '<ProductForm>BC</ProductForm><Contributor><ContributorRole>A01</ContributorRole><NameIdentifier><NameIDType>21</NameIDType><IDValue>not-an-orcid</IDValue></NameIdentifier>' +
        '<PersonName>Ada Lovelace</PersonName><NamesBeforeKey>Ada</NamesBeforeKey><KeyNames>Lovelace</KeyNames></Contributor>';
      await renderPanel(
        { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), descriptive: invalidOrcid })] },
        { fileWorkType: Monograph },
      );

      expect(noConfirmation()).not.toBeInTheDocument();
      expect(problems()).toHaveTextContent('onixPlan.blocker.DESCRIPTIVE_INPUT_REQUIRED');
      expect(card()).toHaveAttribute('data-state', 'BLOCKED');
      expect(status()).toHaveTextContent('onixPlan.review.problems {"count":1}');
    });

    describe('Work-level decisions of grouped manifestations (#209 F, G)', () => {
      const SAS = 'School of Advanced Study, University of London (United Kingdom)';
      const locations = [1, 2, 3, 4].map((product) => {
        const path = `/ONIXMessage[1]/Product[${product}]/DescriptiveDetail[1]/Contributor[1]/ProfessionalAffiliation[1]`;

        return { path, sourcePath: path };
      });

      /** The plan a resolved UoLP-shaped file hands the review: one Work-level institution decision for four Products. */
      const withInstitutionDecision = async (options: readonly { key: string; label: string }[], answer?: string) => {
        const { resolve, context } = await planFor(paperback);
        const base = resolve({ workTypeOverrides: {} }).sidecar;
        const [{ groupKey }] = base.workGroups;
        const finding: OnixDescriptiveFinding = {
          key: `CONTRIBUTORS|CONTRIBUTOR_AFFILIATION_UNIDENTIFIED|${groupKey}|affiliation-1`,
          family: 'CONTRIBUTORS',
          code: 'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED',
          classification: 'TARGET_INPUT_REQUIRED',
          blocking: true,
          productKey: null,
          groupKey,
          locations,
          detail: { affiliation: SAS },
          resolution: { kind: 'CHOICE', options },
          message: `Affiliation "${SAS}" of contributor "Charles Burdett" names no ROR`,
        };
        const sidecar: OnixImportPlanSidecar = {
          ...base,
          inputs: { ...base.inputs, descriptiveChoices: answer === undefined ? {} : { [finding.key]: answer } },
          blockers: [
            ...base.blockers,
            ...(answer === undefined
              ? [
                  {
                    code: 'DESCRIPTIVE_CHOICE_REQUIRED' as const,
                    classification: 'TARGET_INPUT_REQUIRED' as const,
                    recordKey: null,
                    productKey: null,
                    groupKey,
                    paths: locations.map(({ path }) => path),
                    detail: { findingKey: finding.key, family: 'CONTRIBUTORS', finding: finding.code },
                  },
                ]
              : []),
          ],
          descriptive: { ...base.descriptive, findings: [...base.descriptive.findings, finding] },
          findings: [
            ...(base.findings ?? []),
            {
              family: 'DESCRIPTIVE',
              key: finding.key,
              code: finding.code,
              classification: finding.classification,
              blocking: true,
              productKey: null,
              groupKey,
              locations,
              detail: finding.detail,
              resolution: { kind: 'CHOICE', options },
              answer: answer === undefined ? { state: 'UNANSWERED' } : { state: 'ANSWERED', value: answer },
              message: finding.message,
            },
          ],
        };
        const onChange = vi.fn<(inputs: OnixPlanInputs) => void>();

        render(
          <ThemeProvider theme={theme}>
            <OnixPlanResolution sidecar={sidecar} context={context} onChange={onChange} />
          </ThemeProvider>,
        );

        return { finding, onChange };
      };

      it('offers name-search suggestions to choose from, or no affiliation, choosing none itself', async () => {
        const { finding, onChange } = await withInstitutionDecision([
          { key: 'institution-sas', label: 'School of Advanced Study · https://ror.org/04kjz2v51' },
          { key: 'institution-uol', label: 'University of London · https://ror.org/04cw6st05' },
          { key: 'OMIT', label: SAS },
        ]);
        const task = taskNamed(`onixPlan.review.decision.topic.CONTRIBUTOR_AFFILIATION_UNIDENTIFIED - ${SAS}`);

        expect(task).toBeDefined();
        const institution = within(task).getByRole('combobox', {
          name: `onixPlan.review.decision.institution.label {"title":"onixPlan.review.decision.topic.CONTRIBUTOR_AFFILIATION_UNIDENTIFIED - ${SAS}","work":"A Work"}`,
        });
        expect(institution).toHaveValue('');
        // The control is described by its own question's heading, for every reader; the planner's prose is not shown.
        expect(institution).toHaveAccessibleDescription(
          expect.stringContaining('CONTRIBUTOR_AFFILIATION_UNIDENTIFIED'),
        );
        expect(primaryText(task)).not.toContain(finding.message);
        expect(optionValues(institution)).toEqual(['', 'institution-sas', 'institution-uol', 'OMIT']);
        expect(
          within(institution).getByRole('group', {
            name: 'onixPlan.review.decision.institution.suggestions',
            hidden: true,
          }),
        ).toBeInTheDocument();
        expect(
          within(institution).getByRole('option', { name: 'onixPlan.descriptive.option.NO_AFFILIATION', hidden: true }),
        ).toHaveValue('OMIT');
        expect(task).toHaveTextContent('onixPlan.review.decision.institution.matches {"count":2}');
        // The decision is asked once for the Work, as a decision, never repeated as a problem to read about.
        expect(
          pendingTasks().filter((item) => item.textContent?.includes('CONTRIBUTOR_AFFILIATION_UNIDENTIFIED')),
        ).toHaveLength(1);
        expect(problems()).not.toBeInTheDocument();
        expect(onChange).not.toHaveBeenCalled();

        await userEvent.selectOptions(institution, 'institution-uol');
        expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: 'institution-uol' });

        await userEvent.selectOptions(institution, 'OMIT');
        expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: 'OMIT' });
      });

      it('says so when no Thoth institution name matches, leaving no affiliation as the one answer', async () => {
        await withInstitutionDecision([{ key: 'OMIT', label: SAS }]);
        const task = taskNamed(`onixPlan.review.decision.topic.CONTRIBUTOR_AFFILIATION_UNIDENTIFIED - ${SAS}`);

        expect(task).toHaveTextContent('onixPlan.review.decision.institution.noMatches');
        expect(optionValues(within(task).getByRole('combobox'))).toEqual(['', 'OMIT']);
      });
    });
  });

  describe('Product rights (thoth-app#211)', () => {
    const related =
      '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.14296/uolp</IDValue></WorkIdentifier></RelatedWork>';
    const licence = (...expressions: [string, string][]) =>
      '<EpubLicense><EpubLicenseName>A licence</EpubLicenseName>' +
      expressions
        .map(
          ([type, link]) =>
            `<EpubLicenseExpression><EpubLicenseExpressionType>${type}</EpubLicenseExpressionType><EpubLicenseExpressionLink>${link}</EpubLicenseExpressionLink></EpubLicenseExpression>`,
        )
        .join('') +
      '</EpubLicense>';
    const paperbackRecord = onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), related });
    const epub = (rights: string) =>
      onixRecord({
        ref: 'epub',
        identifiers: isbn(ISBN_B),
        descriptive: `<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>${rights}`,
        related,
      });

    it('says which licence a new Work is created with, and asks nothing about it', async () => {
      await renderPanel(
        {
          records: [
            paperbackRecord,
            epub(
              '<EpubTechnicalProtection>00</EpubTechnicalProtection>' +
                licence(['01', 'https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode']),
            ),
          ],
        },
        { fileWorkType: Monograph },
      );

      expect(within(summary()).getByTestId('onix-review-licence')).toHaveTextContent('CC BY-NC-ND 4.0');
      expect(noConfirmation()).not.toBeInTheDocument();
      expect(problems()).not.toBeInTheDocument();
      expectReady();
    });

    it('says a new Work gets no licence where none is stated, and shows none while the rights leave it open', async () => {
      await renderPanel({ records: [paperbackRecord] }, { fileWorkType: Monograph });
      expect(within(summary()).getByTestId('onix-review-licence')).toHaveTextContent(
        'onixPlan.review.summary.licenceNone',
      );
      cleanup();

      await renderPanel(
        { records: [paperbackRecord, epub(licence(['01', 'https://publisher.example/eula']))] },
        { fileWorkType: Monograph },
      );
      expect(within(summary()).queryByTestId('onix-review-licence')).not.toBeInTheDocument();
      expect(taskNamed('onixPlan.review.decision.topic.RIGHTS_LICENCE_UNSUPPORTED')).toBeDefined();
    });

    it('offers a control only for the rights fact whose omission may be acknowledged, and nothing for a disclosed one (#217)', async () => {
      const { sidecar } = await renderPanel(
        {
          records: [
            epub(
              '<EpubTechnicalProtection>03</EpubTechnicalProtection>' +
                licence(
                  ['01', 'https://creativecommons.org/licenses/by/4.0/'],
                  ['10', 'https://publisher.example/onix-pl.xml'],
                ),
            ),
          ],
        },
        { fileWorkType: Monograph },
      );
      const findings = sidecar.rights?.findings ?? [];

      expect(findings.map(({ code, blocking }) => [code, blocking])).toEqual([
        ['RIGHTS_POLICY_NOT_REPRESENTED', false],
        ['RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE', true],
      ]);
      // The technical protection may be acknowledged as omitted; the policy link is deterministic loss, shown nowhere.
      expect(pendingTasks()).toHaveLength(1);
      const box = within(confirmation()).getByRole('checkbox', {
        name: /topic\.RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE/,
      });
      expect(box).not.toBeChecked();
      expect(primaryText(card())).not.toContain('RIGHTS_POLICY');
      expect(primaryText(card())).not.toContain(findings[0].message);
      expect(problems()).not.toBeInTheDocument();
      // Technical protection alone keeps no licence from being the Work's: the licence is a fact already.
      expect(within(summary()).getByTestId('onix-review-licence')).toHaveTextContent('CC BY 4.0');
      expect(box).not.toHaveAccessibleName(/OmitLicence/);
    });

    it('names the rights that hold back an existing Work as a problem, and shows it no licence', async () => {
      const existing = getDefaultWork({
        id: 'w-1',
        doi: 'https://doi.org/10.1234/work',
        type: EditedBook,
        imprintId: 'imprint-1',
        titles: [getDefaultTitle({ canonical: true, title: 'A Work', fullTitle: 'A Work' })],
        publications: [getDefaultPublication({ id: 'p-1', type: PublicationType.enum.Pdf, isbn: ISBN_A })],
      });
      const priced = onixRecord({
        ref: 'pdf',
        identifiers: isbn(ISBN_A),
        descriptive: '<ProductForm>EB</ProductForm><ProductFormDetail>E107</ProductFormDetail>',
        related:
          '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/work</IDValue></WorkIdentifier></RelatedWork>',
      }).replace(
        '</Product>',
        '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier><ProductAvailability>20</ProductAvailability>' +
          `<Price><PriceType>02</PriceType>${licence(['02', 'https://creativecommons.org/licenses/by/4.0/'])}<PriceAmount>10.00</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price></SupplyDetail></ProductSupply></Product>`,
      );
      const { sidecar } = await renderPanel({
        records: [priced],
        lookup: exactLookup({ 'doi:https://doi.org/10.1234/work': ['w-1'], [`isbn:${ISBN_A}`]: ['w-1'] }, [existing]),
      });
      const [finding] = sidecar.rights?.findings ?? [];

      expect(sidecar.workGroups[0].target).toBe('EXISTING_WORK');
      expect(sidecar.products[0].action).toBe('ALREADY_PRESENT');
      expect(finding.code).toBe('RIGHTS_SCOPE_DEFERRED');
      expect(problems()).toHaveTextContent('onixPlan.blocker.RIGHTS_PREFLIGHT_GAP');
      expect(status()).toHaveTextContent('onixPlan.review.problems {"count":1}');
      // An existing Work's licence is never this import's to set, so no licence is shown for it.
      expect(within(summary()).queryByTestId('onix-review-licence')).not.toBeInTheDocument();
    });
  });

  describe('prices, supply and Locations (thoth-app#215)', () => {
    const supplied = (prices: string, form = '<ProductForm>BC</ProductForm>') =>
      onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), descriptive: form }).replace(
        '</Product>',
        '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier>' +
          `<ProductAvailability>20</ProductAvailability>${prices}</SupplyDetail></ProductSupply></Product>`,
      );
    const gbp = (amount: string) =>
      `<Price><PriceType>02</PriceType><PriceAmount>${amount}</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>`;
    const qualifiedGbp = (amount: string) =>
      `<Price><PriceType>02</PriceType><PriceQualifier>10</PriceQualifier><PriceAmount>${amount}</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>`;
    const priceGroup = () =>
      within(confirmation()).getByRole('radiogroup', { name: /^onixPlan\.review\.decision\.price\.label/ });
    const priceUse = (amount: string) =>
      `onixPlan.review.decision.price.use {"price":"onixPlan.review.publication.price {\\"currency\\":\\"GBP\\",\\"amount\\":\\"${amount}\\"}"}`;

    it('asks for the price the file leaves to the publisher - one of the distinct amounts, or none - chooses nothing, and binds the answer', async () => {
      const { sidecar, onChange, decideAgain } = await renderPanel(
        { records: [supplied(gbp('20.00') + gbp('22.00'))] },
        { fileWorkType: Monograph },
      );
      const findings = sidecar.commercial?.findings ?? [];
      const [conflict] = findings;
      const candidates = conflict.resolution.kind === 'PRICE_CHOICE' ? conflict.resolution.candidates : [];

      expect(findings.map(({ code, blocking: blocks }) => [code, blocks])).toEqual([
        ['PRICE_AMOUNT_CONFLICT', true],
        ['SUPPLY_NOT_REPRESENTED', false],
      ]);
      // The decision is its results: each distinct amount, or no price; nothing starts chosen, and the plan waits.
      const radios = within(priceGroup()).getAllByRole('radio');
      expect(radios.map((radio) => (radio as HTMLInputElement).value)).toEqual([
        ...candidates.map(({ key }) => key),
        'OMIT',
      ]);
      radios.forEach((radio) => expect(radio).not.toBeChecked());
      expect(within(priceGroup()).getByRole('radio', { name: priceUse('20.00') })).toBeInTheDocument();
      expect(within(priceGroup()).getByRole('radio', { name: priceUse('22.00') })).toBeInTheDocument();
      expect(
        within(priceGroup()).getByRole('radio', { name: 'onixPlan.review.decision.price.none' }),
      ).toBeInTheDocument();
      expect(primaryText(confirmation())).not.toContain(conflict.message);
      expectAttention(1);
      // A question the review asks is no problem to read about; what Thoth does not record is said nowhere.
      expect(problems()).not.toBeInTheDocument();
      expect(primaryText(card())).not.toContain('SUPPLY_NOT_REPRESENTED');
      expect(primaryText(card())).not.toContain('notRecorded');

      await userEvent.click(within(priceGroup()).getByRole('radio', { name: priceUse('22.00') }));
      expect(lastDecision(onChange)).toEqual({
        ...sidecar.inputs,
        commercialChoices: { [conflict.key]: candidates[1].key },
      });

      // Answered, the price is a fact of the Publication, with the affordance to change it - to no price, or back.
      decideAgain({ fileWorkType: Monograph, commercialChoices: { [conflict.key]: candidates[1].key } });
      expectReady();
      expect(within(summary()).getByTestId('onix-review-prices')).toHaveTextContent(
        'onixPlan.review.publication.price {"currency":"GBP","amount":"22.00"}',
      );
      await userEvent.click(within(summary()).getByRole('button', { name: /^onixPlan\.review\.publication\.edit/ }));
      expect(within(priceGroup()).getByRole('radio', { name: priceUse('22.00') })).toBeChecked();
      await userEvent.click(within(priceGroup()).getByRole('radio', { name: 'onixPlan.review.decision.price.none' }));
      expect(lastDecision(onChange).commercialChoices).toEqual({ [conflict.key]: 'OMIT' });
    });

    it('asks nothing for one amount a currency states more than once, a qualified price among them: the plan is ready with that amount (#261 D)', async () => {
      const { sidecar, onChange } = await renderPanel(
        { records: [supplied(gbp('20.00') + qualifiedGbp('20'))] },
        { fileWorkType: Monograph },
      );
      const reduced = (sidecar.commercial?.findings ?? []).find(({ code }) => code === 'PRICE_REDUCED');

      expect(sidecar.executable).toBe(true);
      expectReady();
      expect(noConfirmation()).not.toBeInTheDocument();
      expect(within(summary()).getByTestId('onix-review-prices')).toHaveTextContent(
        'onixPlan.review.publication.price {"currency":"GBP","amount":"20.00"}',
      );
      expect(primaryText(card())).not.toContain('PriceQualifier');
      expect(reduced).toMatchObject({ blocking: false, resolution: { kind: 'NONE' } });
      expect(sidecar.priceResolutions).toEqual([
        expect.objectContaining({ basis: 'AUTOMATIC', currencyCode: 'GBP', unitPrice: 20 }),
      ]);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('marks an answer the file no longer offers as refused, defaults nothing in its place, and the plan waits until it is corrected or cleared', async () => {
      const { sidecar } = await renderPanel(
        { records: [supplied(gbp('20.00') + qualifiedGbp('60.00'))] },
        { fileWorkType: Monograph },
      );
      const conflict = (sidecar.commercial?.findings ?? []).find(({ code }) => code === 'PRICE_AMOUNT_CONFLICT');
      const candidates = conflict?.resolution.kind === 'PRICE_CHOICE' ? conflict.resolution.candidates : [];
      const staleAnswer = '/ONIXMessage[1]/Product[9]/Price[1]';

      cleanup();
      const { onChange } = await renderPanel(
        { records: [supplied(gbp('20.00') + qualifiedGbp('60.00'))] },
        { fileWorkType: Monograph, commercialChoices: { [conflict?.key ?? '']: staleAnswer } },
      );
      const task = taskNamed('onixPlan.review.decision.price.title {"currency":"GBP"}');

      expect(candidates.map(({ unitPrice }) => unitPrice)).toEqual([20, 60]);
      expectAttention(1);
      expect(task).toHaveAttribute('data-task-state', 'REJECTED');
      expect(task).toHaveTextContent('onixPlan.review.confirmation.stale');
      within(priceGroup())
        .getAllByRole('radio')
        .forEach((radio) => expect(radio).not.toBeChecked());
      expect(within(summary()).queryByTestId('onix-review-prices')).not.toBeInTheDocument();

      // Cleared in one step, the answer is gone and the choice waits again.
      await userEvent.click(within(task).getByRole('button', { name: /^onixPlan\.review\.confirmation\.clearLabel/ }));
      expect(lastDecision(onChange).commercialChoices).toEqual({});
    });

    it('names a commercial fact that holds a Publication back but nothing in the app answers as a problem, with no control', async () => {
      const { sidecar } = await renderPanel({ records: [supplied(gbp('abc'))] }, { fileWorkType: Monograph });
      const findings = sidecar.commercial?.findings ?? [];

      expect(findings.map(({ code, blocking: blocks }) => [code, blocks])).toEqual([
        ['PRICE_AMOUNT_UNUSABLE', true],
        ['SUPPLY_NOT_REPRESENTED', false],
      ]);
      expect(noConfirmation()).not.toBeInTheDocument();
      expect(problems()).toHaveTextContent('onixPlan.blocker.COMMERCIAL_PREFLIGHT_GAP');
      expect(card()).toHaveAttribute('data-state', 'BLOCKED');
    });

    it('asks nothing about the prices of a Publication left out, and says nothing for a file that states no ProductSupply', async () => {
      const { onChange } = await renderPanel(
        { records: [supplied(gbp('20.00') + gbp('22.00'), '<ProductForm>BA</ProductForm>')] },
        { fileWorkType: Monograph, manifestationChoices: { [`product:gtin13:${ISBN_A}`]: 'OMIT' } },
      );

      expect(onChange).not.toHaveBeenCalled();
      expect(within(card()).queryByRole('radiogroup')).not.toBeInTheDocument();
      expect(problems()).not.toBeInTheDocument();
      cleanup();

      await renderPanel(
        { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) })] },
        { fileWorkType: Monograph },
      );
      expect(within(summary()).queryByTestId('onix-review-prices')).not.toBeInTheDocument();
      expect(primaryText(card())).not.toContain('price');
    });
  });

  /**
   * #209 H / #262 O: what the publisher sees for the University of London Press shape - one Work in four manifestations
   * that restate two editors with locale-less biographies and name-only affiliations, a funder named without an identifier
   * and an unnumbered Series - planned by the real planner, reductions, adapter and resolver, synthetic and minimal.
   */
  describe('the University of London Press shape (#209 H)', () => {
    const INSTITUTE = 'Institute of Example Studies, University of Example (United Kingdom)';
    const FUNDER = 'Example Council of Learned Societies (ECLS)';
    const ISBNS = ['9781800000018', '9781800000025', '9781800000032', '9781800000049'];
    const FORMS = [
      '<ProductForm>BB</ProductForm>',
      '<ProductForm>BC</ProductForm>',
      '<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>',
      '<ProductForm>EA</ProductForm><ProductFormDetail>E107</ProductFormDetail>',
    ];
    const editor = (sequence: string, first: string, last: string, biography: string) =>
      `<Contributor><SequenceNumber>${sequence}</SequenceNumber><ContributorRole>B01</ContributorRole>` +
      `<PersonName>${first} ${last}</PersonName><NamesBeforeKey>${first}</NamesBeforeKey><KeyNames>${last}</KeyNames>` +
      `<ProfessionalAffiliation><ProfessionalPosition>Professor</ProfessionalPosition><Affiliation>${INSTITUTE}</Affiliation></ProfessionalAffiliation>` +
      `<BiographicalNote textformat="06">${biography}</BiographicalNote></Contributor>`;
    const uolp = {
      records: ISBNS.map((value, index) =>
        onixRecord({
          ref: value,
          identifiers: isbn(value),
          descriptive:
            FORMS[index] +
            '<Collection><CollectionType>10</CollectionType><TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>02</TitleElementLevel><TitleText>Studies in Example Cultures</TitleText></TitleElement></TitleDetail></Collection>' +
            MINIMAL_TITLE +
            editor('1', 'Alex', 'Example', 'Alex Example writes on literature.') +
            editor('2', 'Sam', 'Sample', 'Sam Sample writes on translation.') +
            '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>',
          publishing:
            `<Publisher><PublishingRole>14</PublishingRole><PublisherName>${FUNDER}</PublisherName></Publisher>` +
            '<PublishingStatus>02</PublishingStatus>',
          related: ISBNS.filter((other) => other !== value)
            .map(
              (other) =>
                `<RelatedProduct><ProductRelationCode>06</ProductRelationCode><ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${other}</IDValue></ProductIdentifier></RelatedProduct>`,
            )
            .join(''),
        }),
      ),
    };
    const INSTITUTIONS: Record<string, { id: string; name: string; ror: string }[]> = {
      'Institute of Example Studies': [{ id: 'institution-institute', name: 'Institute of Example Studies', ror: '' }],
      'University of Example': [{ id: 'institution-university', name: 'University of Example', ror: '' }],
      'Example Council of Learned Societies': [
        { id: 'institution-council', name: 'Example Council of Learned Societies', ror: '' },
      ],
    };

    /** The plan XMLParse holds for the file, adapted by the real adapter against Thoth's institution search. */
    const planningFor = async () => {
      const message = parse(
        `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${GENERIC_HEADER}${uolp.records.join('')}</ONIXMessage>`,
      ) as ExtendedONIXMessageRoot;
      const sourcePlan = planOnixSource(message);
      const descriptive = reduceOnixDescriptive(message, sourcePlan);
      const targets = await resolveOnixTargets(sourcePlan, noMatches, 'publisher-1');
      const parsed = await new XMLParser(
        message,
        IMPRINTS,
        licenseOptions,
        [],
        { getContributors: async () => [], getContributorsByOrcids: async () => [] } as never,
        {
          getInstitutions: async (_offset: number, _limit: number, filter: string) =>
            (INSTITUTIONS[filter] ?? []).map((institution) => ({
              ...institution,
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
          serieses: [],
          candidatePlan: parsed.data.plan,
          adaptation: parsed.data.onix?.groups,
        });
      const [group] = sourcePlan.groups;
      const context: OnixReviewPresentationContext = { descriptive, targets, candidatePlan: parsed.data.plan };

      return { resolve, groupKey: group.groupKey, context };
    };

    it('reads as one Work decided once: every decision inside it, asked once for all four manifestations', async () => {
      const { resolve, context } = await planningFor();
      const { sidecar } = resolve({});
      const onChange = vi.fn<(inputs: OnixPlanInputs) => void>();

      render(
        <ThemeProvider theme={theme}>
          <OnixPlanResolution sidecar={sidecar} context={context} onChange={onChange} />
        </ThemeProvider>,
      );

      expect(cards()).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('A Work');
      // Four Publications Thoth will create, said plainly, with nothing to leave out.
      const publications = within(summary()).getAllByTestId('onix-review-publication');
      expect(publications).toHaveLength(4);
      publications.forEach((row) =>
        expect(row).toHaveTextContent('onixPlan.review.publication.action.CREATE_PUBLICATION'),
      );
      expect(within(summary()).queryByRole('checkbox')).not.toBeInTheDocument();
      expect(within(card()).queryByTestId('onix-review-optional')).not.toBeInTheDocument();
      // The Edited book proposal, two biography languages, two affiliations, the funder, the Series: seven, once each.
      const headings = within(confirmation())
        .getAllByRole('heading', { level: 5 })
        .map((heading) => heading.textContent);
      expect(headings).toEqual([
        'onixPlan.review.decision.workType.title',
        'onixPlan.review.decision.topic.CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED - Alex Example',
        'onixPlan.review.decision.topic.CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED - Sam Sample',
        'onixPlan.review.decision.topic.SERIES_ORDINAL_REQUIRED - Studies in Example Cultures',
        `onixPlan.review.decision.topic.CONTRIBUTOR_AFFILIATION_UNIDENTIFIED - ${INSTITUTE}`,
        `onixPlan.review.decision.topic.CONTRIBUTOR_AFFILIATION_UNIDENTIFIED - ${INSTITUTE}`,
        `onixPlan.review.decision.topic.FUNDING_FUNDER_UNIDENTIFIED - ${FUNDER}`,
      ]);
      expect(within(confirmation()).getByRole('heading', { level: 4 })).toHaveTextContent(
        'onixPlan.review.confirmation.count {"count":7}',
      );
      expectAttention(7);
      expect(confirmation()).toHaveTextContent(
        'onixPlan.review.decision.workType.suggested {"type":"onixPlan.workType.EDITED_BOOK"}',
      );
      expect(
        within(confirmation()).getAllByRole('button', {
          name: `onixPlan.review.decision.locale.confirm {"locale":"${localeLabel('EN')}"}`,
        }),
      ).toHaveLength(2);
      const institutions = within(confirmation()).getAllByRole('combobox', {
        name: /^onixPlan\.review\.decision\.institution\.label/,
      });
      expect(institutions.map((control) => optionValues(control))).toEqual([
        ['', 'institution-institute', 'institution-university', 'OMIT'],
        ['', 'institution-institute', 'institution-university', 'OMIT'],
        ['', 'institution-council', 'OMIT'],
      ]);
      institutions.forEach((control) => expect(control).toHaveValue(''));
      // No ISBN or Product context is repeated inside the Work's own questions.
      expect(primaryText(confirmation())).not.toContain(ISBNS[0]);
      // Everything that waits is a decision above; nothing is left to read about as a problem, and no TOC, no
      // RelatedProduct and no "not imported" list reaches the publisher.
      expect(problems()).not.toBeInTheDocument();
      expect(fileSection()).not.toBeInTheDocument();
      ['tableOfContents', 'RelatedProduct', 'notRecorded', 'disclosures', 'not imported'].forEach((noise) =>
        expect(primaryText(card())).not.toContain(noise),
      );
    });

    it('is ready to preview once each decision is answered in the review, with no change to the file', async () => {
      const { resolve, groupKey, context } = await planningFor();
      const blocked = resolve({}).sidecar;
      const keysOf = (finding: string) =>
        blocked.blockers
          .filter(({ detail }) => detail.finding === finding)
          .map(({ detail }) => detail.findingKey as string);
      const answers = {
        ...Object.fromEntries(keysOf('CONTRIBUTOR_BIOGRAPHY_LOCALE_UNRESOLVED').map((key) => [key, 'EN'])),
        ...Object.fromEntries(
          keysOf('CONTRIBUTOR_AFFILIATION_UNIDENTIFIED').map((key) => [key, 'institution-institute']),
        ),
        [keysOf('FUNDING_FUNDER_UNIDENTIFIED')[0]]: 'institution-council',
        [keysOf('SERIES_ORDINAL_REQUIRED')[0]]: 'ACKNOWLEDGED',
      };
      const { sidecar, plan } = resolve({ workTypeOverrides: { [groupKey]: EditedBook }, descriptiveChoices: answers });

      render(
        <ThemeProvider theme={theme}>
          <OnixPlanResolution sidecar={sidecar} context={context} onChange={vi.fn()} />
        </ThemeProvider>,
      );

      expectReady();
      expect(noConfirmation()).not.toBeInTheDocument();
      expect(problems()).not.toBeInTheDocument();
      expect(within(summary()).getByTestId('onix-review-work-type')).toHaveTextContent('onixPlan.workType.EDITED_BOOK');
      // Every decision taken is in the summary, named with its answer, and changeable.
      expect(decided()).toHaveLength(6);
      expect(decided()[0]).toHaveTextContent(localeLabel('EN'));
      expect(decided()[2]).toHaveTextContent('onixPlan.review.summary.confirmed');
      expect(decided()[3]).toHaveTextContent('Institute of Example Studies');
      expect(plan?.works).toHaveLength(1);
      expect(plan?.works[0].publications).toHaveLength(4);
    });
  });

  describe('rights acknowledgements, sales rights and product contacts (thoth-app#217)', () => {
    const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';
    const CC_BY_NC = 'https://creativecommons.org/licenses/by-nc/4.0/';
    const licence = (link: string, type = '01', dates = '') =>
      `<EpubLicense><EpubLicenseName>A licence</EpubLicenseName><EpubLicenseExpression><EpubLicenseExpressionType>${type}</EpubLicenseExpressionType><EpubLicenseExpressionLink>${link}</EpubLicenseExpressionLink></EpubLicenseExpression>${dates}</EpubLicense>`;
    const epub = (rights = '', publishing = '<PublishingStatus>02</PublishingStatus>') =>
      onixRecord({
        ref: 'epub',
        identifiers: isbn(ISBN_B),
        descriptive: `<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>${rights}`,
        publishing,
      });
    const salesRightsXml = (type: string, territory: string) =>
      `<SalesRights><SalesRightsType>${type}</SalesRightsType><Territory>${territory}</Territory></SalesRights>`;
    const contactXml = (role: string, email = 'permissions@example.org', name = 'Example Press') =>
      `<ProductContact><ProductContactRole>${role}</ProductContactRole><ProductContactName>${name}</ProductContactName><EmailAddress>${email}</EmailAddress></ProductContact>`;
    const publishingStatus = '<PublishingStatus>02</PublishingStatus>';
    const acknowledgement = (name: RegExp) => within(confirmation()).getByRole('checkbox', { name });
    const findingKey = (sidecar: OnixImportPlanSidecar, code: string) =>
      [...(sidecar.rights?.findings ?? []), ...(sidecar.salesRights?.findings ?? [])].find(
        (finding) => finding.code === code,
      )?.key as string;

    it('asks for a source-bound acknowledgement of technical protection, and the plan is ready once it is given and blocked again once it is cleared', async () => {
      const file = { records: [epub('<EpubTechnicalProtection>03</EpubTechnicalProtection>' + licence(CC_BY))] };
      const { onChange, sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const key = findingKey(sidecar, 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE');

      expectAttention(1);
      expect(primaryText(card())).not.toContain(sidecar.rights?.findings[0].message ?? 'missing');
      // The acknowledgement is the control; the blocker it answers is not listed as a problem to read about.
      expect(problems()).not.toBeInTheDocument();
      const box = acknowledgement(/topic\.RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE/);

      expect(box).not.toBeChecked();
      expect(box).not.toHaveAccessibleName(/OmitLicence/);
      await userEvent.click(box);
      expect(lastDecision(onChange).rightsChoices).toEqual({ [key]: ONIX_RIGHTS_ACKNOWLEDGED });

      decideAgain({ fileWorkType: Monograph, rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } });
      expectReady();
      expect(noConfirmation()).not.toBeInTheDocument();
      expect(decided()[0]).toHaveTextContent(
        'onixPlan.review.decision.topic.RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE',
      );
      expect(decided()[0]).toHaveTextContent('onixPlan.review.summary.confirmed');
      expect(within(summary()).getByTestId('onix-review-licence')).toHaveTextContent('CC BY 4.0');

      await userEvent.click(within(decided()[0]).getByRole('button'));
      await userEvent.click(acknowledgement(/topic\.RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE/));
      expect(lastDecision(onChange).rightsChoices).toEqual({});
      decideAgain({ fileWorkType: Monograph, rightsChoices: {} });
      expectAttention(1);
    });

    it('offers the omission of an unsupported licence as a decision that also leaves the Work without a licence, and says so once taken', async () => {
      const file = { records: [epub(licence('https://publisher.example/eula'))] };
      const { sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const key = findingKey(sidecar, 'RIGHTS_LICENCE_UNSUPPORTED');

      expect(within(summary()).queryByTestId('onix-review-licence')).not.toBeInTheDocument();
      const box = acknowledgement(/topic\.RIGHTS_LICENCE_UNSUPPORTED/);
      expect(box).not.toBeChecked();
      expect(box).toHaveAccessibleName(/onixPlan\.rights\.acknowledgeOmitLicence/);

      decideAgain({ fileWorkType: Monograph, rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } });
      expectReady();
      expect(within(summary()).getByTestId('onix-review-licence')).toHaveTextContent(
        'onixPlan.review.summary.licenceOmitted',
      );
    });

    it('offers no control for a rights conflict, and names it as a problem beside the acknowledgement it does offer', async () => {
      const file = {
        records: [
          epub(
            '<EpubTechnicalProtection>00</EpubTechnicalProtection><EpubTechnicalProtection>03</EpubTechnicalProtection>' +
              '<EpubUsageConstraint><EpubUsageType>02</EpubUsageType><EpubUsageStatus>03</EpubUsageStatus></EpubUsageConstraint>' +
              licence(CC_BY),
          ),
        ],
      };
      const { sidecar } = await renderPanel(file, { fileWorkType: Monograph });
      const contradiction = sidecar.rights?.findings.find(
        ({ code }) => code === 'RIGHTS_TECHNICAL_PROTECTION_CONTRADICTION',
      );

      expect(primaryText(card())).not.toContain(contradiction?.message ?? 'missing');
      expect(within(confirmation()).queryByRole('checkbox', { name: /CONTRADICTION/ })).not.toBeInTheDocument();
      // The constraint is acknowledged as omitting the licence with it: the licence cannot be kept without it.
      expect(acknowledgement(/topic\.RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE/)).toHaveAccessibleName(
        /onixPlan\.rights\.acknowledgeOmitLicence/,
      );
      expect(problems()).toHaveTextContent('onixPlan.blocker.RIGHTS_SOURCE_CONFLICT');
      expect(card()).toHaveAttribute('data-state', 'BLOCKED');
    });

    it('marks a stale rights answer as refused on its task, and offers to clear one that names no finding at all', async () => {
      const file = { records: [epub('<EpubTechnicalProtection>03</EpubTechnicalProtection>' + licence(CC_BY))] };
      const { sidecar } = await renderPanel(file, { fileWorkType: Monograph });
      const key = findingKey(sidecar, 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE');

      cleanup();
      const { onChange } = await renderPanel(file, {
        fileWorkType: Monograph,
        rightsChoices: { [key]: 'yes', 'RIGHTS|GONE': ONIX_RIGHTS_ACKNOWLEDGED },
      });
      const task = taskNamed('onixPlan.review.decision.topic.RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE');

      expect(status()).toHaveTextContent('onixPlan.review.status.attention');
      expect(task).toHaveAttribute('data-task-state', 'REJECTED');
      expect(task).toHaveTextContent('onixPlan.review.confirmation.stale');
      // The refused answer is never read as the acknowledgement: the box is unticked, and clearing removes it.
      const box = within(task).getByRole('checkbox');
      expect(box).not.toBeChecked();
      await userEvent.click(within(task).getByRole('button', { name: /^onixPlan\.review\.confirmation\.clearLabel/ }));
      expect(lastDecision(onChange).rightsChoices).toEqual({ 'RIGHTS|GONE': ONIX_RIGHTS_ACKNOWLEDGED });
      // An answer to no finding is the file's to clear, by its own control and never by a blanket one.
      const clear = within(fileSection() as HTMLElement).getByRole('button', {
        name: 'onixPlan.review.decision.stale.clear {"answer":"ACKNOWLEDGED"}',
      });
      await userEvent.click(clear);
      expect(lastDecision(onChange).rightsChoices).toEqual({ [key]: 'yes' });
      expect(screen.queryByRole('checkbox', { name: /accept|all/i })).not.toBeInTheDocument();
    });

    it('says nothing about simple worldwide sales rights, and asks an acknowledgement of each complex rights fact', async () => {
      const simple = {
        records: [epub('', publishingStatus + salesRightsXml('01', '<RegionsIncluded>WORLD</RegionsIncluded>'))],
      };
      await renderPanel(simple, { fileWorkType: Monograph });

      expectReady();
      expect(noConfirmation()).not.toBeInTheDocument();
      expect(primaryText(card())).not.toContain('SALES_RIGHTS');
      cleanup();

      const complex = {
        records: [
          epub(
            '',
            publishingStatus +
              salesRightsXml(
                '01',
                '<RegionsIncluded>WORLD</RegionsIncluded><CountriesExcluded>US</CountriesExcluded>',
              ) +
              salesRightsXml('03', '<CountriesIncluded>US</CountriesIncluded>') +
              '<ROWSalesRightsType>00</ROWSalesRightsType>',
          ),
        ],
      };
      const {
        sidecar: complexSidecar,
        onChange,
        decideAgain,
      } = await renderPanel(complex, { fileWorkType: Monograph });
      const boxes = within(confirmation()).getAllByRole('checkbox');
      const keys = complexSidecar.salesRights?.findings.map(({ key }) => key) ?? [];

      expect(boxes).toHaveLength(3);
      expectAttention(3);
      expect(problems()).not.toBeInTheDocument();
      await userEvent.click(boxes[0]);
      expect(lastDecision(onChange).rightsChoices).toEqual({ [keys[0]]: ONIX_RIGHTS_ACKNOWLEDGED });
      decideAgain({
        fileWorkType: Monograph,
        rightsChoices: Object.fromEntries(keys.map((key) => [key, ONIX_RIGHTS_ACKNOWLEDGED])),
      });
      expectReady();
      expect(decided()).toHaveLength(3);
    });

    it('lists a Market that contradicts the sales rights as a problem, with no acknowledgement to give', async () => {
      const file = {
        records: [
          epub(
            '',
            publishingStatus +
              salesRightsXml('01', '<CountriesIncluded>GB</CountriesIncluded>') +
              '<ROWSalesRightsType>03</ROWSalesRightsType>',
          ).replace(
            '</Product>',
            '<ProductSupply><Market><Territory><CountriesIncluded>US</CountriesIncluded></Territory></Market><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>S</SupplierName></Supplier><ProductAvailability>20</ProductAvailability><Price><PriceType>02</PriceType><PriceAmount>10.00</PriceAmount><CurrencyCode>USD</CurrencyCode></Price></SupplyDetail></ProductSupply></Product>',
          ),
        ],
      };
      await renderPanel(file, { fileWorkType: Monograph });

      expect(problems()).toHaveTextContent('onixPlan.blocker.SALES_RIGHTS_SOURCE_CONFLICT');
      expect(within(card()).queryByRole('checkbox', { name: /CONTRADICTION/ })).not.toBeInTheDocument();
      expect(card()).toHaveAttribute('data-state', 'BLOCKED');
    });

    it('asks an acknowledgement only for a high-salience product contact, naming its role, and labels a compliance contact as such', async () => {
      const file = {
        records: [
          epub(
            '',
            publishingStatus +
              contactXml('06') +
              contactXml('02', 'press@example.org', 'Press Office') +
              contactXml('10', 'safety@example.org'),
          ),
        ],
      };
      const { sidecar, onChange } = await renderPanel(file, { fileWorkType: Monograph });
      const tasks = pendingTasks();

      // Two contacts need acknowledging; the promotional contact is deterministic loss, said nowhere.
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toHaveTextContent('onixPlan.productContact.role.06');
      expect(within(tasks[0]).getByRole('checkbox')).not.toBeChecked();
      expect(tasks[1]).toHaveTextContent('onixPlan.productContact.role.10');
      expect(tasks[1]).toHaveTextContent('onixPlan.productContact.compliance');
      expect(primaryText(card())).not.toContain('onixPlan.productContact.role.02');
      // No contact value - email, telephone, address - is shown in the review (5543566392 rules 65-66).
      expect(primaryText(card())).not.toContain('permissions@example.org');
      expectAttention(2);

      await userEvent.click(within(tasks[0]).getByRole('checkbox'));
      expect(lastDecision(onChange).rightsChoices).toEqual({
        [findingKey(sidecar, 'PRODUCT_CONTACT_NOT_REPRESENTED')]: ONIX_RIGHTS_ACKNOWLEDGED,
      });
    });

    it('shows a matching existing Accessibility contact as evidence beside an accessibility request contact, which still needs acknowledging', async () => {
      const file = {
        records: [epub('', publishingStatus + contactXml('01', 'access@example.org'))],
        accessibilityContactEmails: ['access@example.org'],
      };

      await renderPanel(file, { fileWorkType: Monograph });
      const [task] = pendingTasks();

      expect(task).toHaveTextContent('onixPlan.productContact.accessibilityMatch');
      expect(within(task).getByRole('checkbox')).not.toBeChecked();
      expectAttention(1);
    });

    it("says what becomes of an existing Work's licence: already present, kept where the file is silent, or a problem where it differs", async () => {
      const existing = (license: string) =>
        getDefaultWork({
          id: 'w-1',
          doi: 'https://doi.org/10.1234/work',
          type: EditedBook,
          imprintId: 'imprint-1',
          license,
          titles: [getDefaultTitle({ canonical: true, title: 'A Work', fullTitle: 'A Work' })],
          publications: [getDefaultPublication({ id: 'p-1', type: PublicationType.enum.Epub, isbn: ISBN_B })],
        });
      const lookup = (license: string) =>
        exactLookup({ 'doi:https://doi.org/10.1234/work': ['w-1'], [`isbn:${ISBN_B}`]: ['w-1'] }, [existing(license)]);
      const related =
        '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/work</IDValue></WorkIdentifier></RelatedWork>';
      const present = (rights: string) =>
        onixRecord({
          ref: 'epub',
          identifiers: isbn(ISBN_B),
          descriptive: `<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>${rights}`,
          related,
        });

      await renderPanel({ records: [present(licence(CC_BY))], lookup: lookup(CC_BY) });
      expect(within(summary()).getByTestId('onix-review-licence')).toHaveTextContent(
        'onixPlan.review.summary.licenceAlreadyPresent',
      );
      expectReady();
      cleanup();

      await renderPanel({ records: [present('')], lookup: lookup(CC_BY) });
      expect(within(summary()).getByTestId('onix-review-licence')).toHaveTextContent(
        'onixPlan.review.summary.licenceKept',
      );
      cleanup();

      await renderPanel({ records: [present(licence(CC_BY))], lookup: lookup(CC_BY_NC) });
      expect(within(summary()).queryByTestId('onix-review-licence')).not.toBeInTheDocument();
      expect(within(card()).queryByRole('checkbox')).not.toBeInTheDocument();
      expect(problems()).toHaveTextContent('onixPlan.blocker.RIGHTS_EXISTING_LICENCE_DIFFERS');
    });

    it('asks the publisher to decide, explicitly, that a licence the file states is not written to an existing Work holding none (#218 Correction 1)', async () => {
      const existing = getDefaultWork({
        id: 'w-1',
        doi: 'https://doi.org/10.1234/work',
        type: EditedBook,
        imprintId: 'imprint-1',
        license: '',
        titles: [getDefaultTitle({ canonical: true, title: 'A Work', fullTitle: 'A Work' })],
        publications: [getDefaultPublication({ id: 'p-1', type: PublicationType.enum.Epub, isbn: ISBN_B })],
      });
      const lookup = exactLookup({ 'doi:https://doi.org/10.1234/work': ['w-1'], [`isbn:${ISBN_B}`]: ['w-1'] }, [
        existing,
      ]);
      const present = onixRecord({
        ref: 'epub',
        identifiers: isbn(ISBN_B),
        descriptive: `<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>${licence(CC_BY)}`,
        related:
          '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/work</IDValue></WorkIdentifier></RelatedWork>',
      });
      const { sidecar, onChange, decideAgain } = await renderPanel({ records: [present], lookup });
      const key = `RIGHTS|RIGHTS_EXISTING_LICENCE_NOT_SET|${sidecar.workGroups[0].groupKey}`;

      expectAttention(1);
      expect(problems()).not.toBeInTheDocument();
      const box = acknowledgement(/topic\.RIGHTS_EXISTING_LICENCE_NOT_SET/);

      expect(box).not.toBeChecked();
      await userEvent.click(box);
      expect(lastDecision(onChange).rightsChoices).toEqual({ [key]: ONIX_RIGHTS_ACKNOWLEDGED });

      decideAgain({ rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } });
      expectReady();
      expect(within(summary()).getByTestId('onix-review-licence')).toHaveTextContent(
        'onixPlan.review.summary.licenceOmitted',
      );
    });
  });

  describe('accessibility and product form features (thoth-app#221)', () => {
    const featureXml = (type: string, value?: string, descriptions: string[] = []) =>
      `<ProductFormFeature><ProductFormFeatureType>${type}</ProductFormFeatureType>${
        value === undefined ? '' : `<ProductFormFeatureValue>${value}</ProductFormFeatureValue>`
      }${descriptions.map((text) => `<ProductFormFeatureDescription>${text}</ProductFormFeatureDescription>`).join('')}</ProductFormFeature>`;
    const a11y = (...codes: string[]) => codes.map((code) => featureXml('09', code)).join('');
    const epub = (features: string, rest: Partial<RecordSpec> = {}) => ({
      records: [
        onixRecord({
          ref: 'epub',
          identifiers: isbn(ISBN_A),
          descriptive: `<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>${features}`,
          ...rest,
        }),
      ],
    });
    const monograph = async (file: FileSpec) => {
      const [{ groupKey }] = (await sidecarFor(file)).workGroups;

      return { workTypeOverrides: { [groupKey]: Monograph } };
    };
    const choiceControl = () =>
      within(confirmation()).getByRole('combobox', { name: /topic\.ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED/ });

    it('asks which of several WCAG values a Publication keeps, choosing none, and records exactly the one chosen', async () => {
      const file = epub(a11y('81', '82', '85'));
      const inputs = await monograph(file);
      const { onChange, sidecar, decideAgain } = await renderPanel(file, inputs);
      const key = sidecar.blockers.find(({ code }) => code === 'ACCESSIBILITY_CHOICE_REQUIRED')?.detail
        .findingKey as string;
      const select = choiceControl();

      expectAttention(1);
      expect(select).toHaveValue('');
      expect(optionValues(select)).toEqual(['', 'WCAG21AA', 'WCAG22AA', 'OMIT']);
      // The question is its own: never repeated among the problems to read about.
      expect(problems()).not.toBeInTheDocument();

      await userEvent.selectOptions(select, 'WCAG21AA');
      expect(lastDecision(onChange)).toEqual({
        ...EMPTY_ONIX_PLAN_INPUTS,
        ...inputs,
        accessibilityChoices: { [key]: 'WCAG21AA' },
      });

      decideAgain(lastDecision(onChange));
      expectReady();
      expect(decided()[0]).toHaveTextContent('onixPlan.review.decision.topic.ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED');
      expect(decided()[0]).toHaveTextContent('WCAG 2.1 AA');
      await userEvent.click(within(decided()[0]).getByRole('button'));
      await userEvent.selectOptions(choiceControl(), '');
      expect(lastDecision(onChange).accessibilityChoices).toEqual({});
    });

    it('shows a stale answer as refused, never as a value it could stand for, and clears one naming no finding', async () => {
      const file = epub(a11y('81', '82', '85'));
      const key = (await sidecarFor(file)).blockers.find(({ code }) => code === 'ACCESSIBILITY_CHOICE_REQUIRED')?.detail
        .findingKey as string;
      const { onChange } = await renderPanel(file, {
        ...(await monograph(file)),
        accessibilityChoices: { [key]: 'WCAG22AAA', 'ACCESSIBILITY|gone': ONIX_ACCESSIBILITY_ACKNOWLEDGED },
      });
      const select = choiceControl();

      expect(select).toHaveValue('WCAG22AAA');
      expect(
        within(select).getByRole('option', { name: /onixPlan\.review\.confirmation\.staleAnswer/, hidden: true }),
      ).toBeDisabled();
      expect(taskNamed(/ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED/)).toHaveTextContent(
        'onixPlan.review.confirmation.stale',
      );

      await userEvent.click(
        within(fileSection() as HTMLElement).getByRole('button', { name: /^onixPlan\.review\.decision\.stale\.clear/ }),
      );
      expect(lastDecision(onChange).accessibilityChoices).toEqual({ [key]: 'WCAG22AAA' });
    });

    it('asks for a material product fact to be acknowledged, showing what it says, with nothing ticked', async () => {
      const file = epub(featureXml('21', '02', ['UN3481 lithium ion batteries']));
      const inputs = await monograph(file);
      const { onChange, sidecar } = await renderPanel(file, inputs);
      const task = taskNamed('onixPlan.review.decision.topic.PRODUCT_FORM_FEATURE_NOT_REPRESENTED');
      const box = within(task).getByRole('checkbox');
      const key = sidecar.findings?.find(({ family }) => family === 'PRODUCT_FORM_FEATURE')?.key as string;

      expect(within(task).getByTestId('onix-review-task-values')).toHaveTextContent('UN3481 lithium ion batteries');
      expect(box).not.toBeChecked();
      await userEvent.click(box);
      expect(lastDecision(onChange).accessibilityChoices).toEqual({ [key]: ONIX_ACCESSIBILITY_ACKNOWLEDGED });
    });

    it('says nothing about accessibility facts Thoth does not record: the plan is ready, and no list of them appears', async () => {
      const file = epub(featureXml('09', '00', ['Screen-reader friendly throughout']) + a11y('11', '94'));
      const { sidecar } = await renderPanel(file, await monograph(file));

      expect((sidecar.findings ?? []).filter(({ family }) => family === 'ACCESSIBILITY')).toHaveLength(3);
      expectReady();
      expect(noConfirmation()).not.toBeInTheDocument();
      expect(primaryText(card())).not.toContain('Screen-reader friendly throughout');
      expect(primaryText(card())).not.toContain('disclosures');
    });

    it("names an existing Publication's deferred enrichment as a problem, and never offers to write it", async () => {
      const existing = getDefaultWork({
        id: 'w-1',
        doi: 'https://doi.org/10.1234/work',
        type: EditedBook,
        imprintId: 'imprint-1',
        titles: [getDefaultTitle({ canonical: true, title: 'A Work', fullTitle: 'A Work' })],
        publications: [getDefaultPublication({ id: 'p-1', type: PublicationType.enum.Epub, isbn: ISBN_A })],
      });

      await renderPanel({
        ...epub(a11y('81', '85'), {
          related:
            '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/work</IDValue></WorkIdentifier></RelatedWork>',
        }),
        lookup: exactLookup({ 'doi:https://doi.org/10.1234/work': ['w-1'], [`isbn:${ISBN_A}`]: ['w-1'] }, [existing]),
      });

      expect(within(card()).queryByRole('combobox')).not.toBeInTheDocument();
      expect(within(card()).queryByRole('checkbox')).not.toBeInTheDocument();
      expect(problems()).toHaveTextContent('onixPlan.blocker.ACCESSIBILITY_EXISTING_ENRICHMENT_DEFERRED');
    });
  });

  describe('content items and contained Works (thoth-app#223)', () => {
    const contentItem = ({
      lsn,
      type = '03',
      av,
      inner = '',
      after = '',
    }: {
      lsn?: string;
      type?: string;
      av?: string;
      inner?: string;
      after?: string;
    }) =>
      `<ContentItem>${lsn === undefined ? '' : `<LevelSequenceNumber>${lsn}</LevelSequenceNumber>`}` +
      (av === undefined
        ? `<TextItem><TextItemType>${type}</TextItemType>${inner}</TextItem>`
        : `<AVItem><AVItemType>${av}</AVItemType></AVItem>`) +
      `<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">A Component</TitleText></TitleElement></TitleDetail>${after}</ContentItem>`;
    /** One new Work stating these ContentItems, with its WorkType already decided. */
    const withItems = (...items: string[]): FileSpec => ({
      records: [
        onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) }).replace(
          '<PublishingDetail>',
          `<ContentDetail>${items.join('')}</ContentDetail><PublishingDetail>`,
        ),
      ],
    });
    const componentKeyOf = (sidecar: OnixImportPlanSidecar, code: string) =>
      (sidecar.findings ?? []).find((finding) => finding.family === 'COMPONENT' && finding.code === code)?.key ?? '';

    it('asks a contained Work its own WorkType and status, offers only what the contract allows, and chooses nothing', async () => {
      const { onChange, sidecar } = await renderPanel(withItems(contentItem({ lsn: '1', type: '01' })), {
        fileWorkType: Monograph,
      });
      const typeKey = componentKeyOf(sidecar, 'CONTAINED_WORK_TYPE_REQUIRED');
      const workType = within(confirmation()).getByRole('combobox', { name: /topic\.CONTAINED_WORK_TYPE_REQUIRED/ });
      const workStatus = within(confirmation()).getByRole('combobox', {
        name: /topic\.CONTAINED_WORK_STATUS_REQUIRED/,
      });

      expect(workType).toHaveValue('');
      expect(optionValues(workType)).toEqual(['', Monograph, EditedBook, Textbook, 'JOURNAL_ISSUE', 'BOOK_SET']);
      expect(optionValues(workType)).not.toContain(BookChapter);
      expect(workStatus).toHaveValue('');
      expect(optionValues(workStatus)).toEqual([
        '',
        'FORTHCOMING',
        'ACTIVE',
        'WITHDRAWN',
        'SUPERSEDED',
        'POSTPONED_INDEFINITELY',
        'CANCELLED',
      ]);
      expectAttention(2);

      await userEvent.selectOptions(workType, Textbook);

      expect(lastDecision(onChange).componentChoices).toEqual({ [typeKey]: Textbook });
      // Its creation is no longer deferred (thoth-app#187): nothing but its own questions is left to read about.
      expect(problems()).not.toBeInTheDocument();
    });

    it('asks for exactly the dates a chosen status needs, empty, and takes the one entered', async () => {
      const file = withItems(contentItem({ lsn: '1', type: '01' }));
      const first = await sidecarFor(file, { fileWorkType: Monograph });
      const statusKey = componentKeyOf(first, 'CONTAINED_WORK_STATUS_REQUIRED');
      const { onChange } = await renderPanel(file, {
        fileWorkType: Monograph,
        componentChoices: { [statusKey]: 'ACTIVE' },
      });
      const dates = within(confirmation()).getAllByLabelText(/^onixPlan\.review\.decision\.date\.label/);

      expect(dates).toHaveLength(1);
      expect(dates[0]).toHaveValue('');
      expect(taskNamed('onixPlan.review.decision.topic.CONTAINED_WORK_DATE_REQUIRED')).toBeDefined();

      fireEvent.change(dates[0], { target: { value: '2024-05-01' } });

      expect(lastDecision(onChange).componentChoices).toEqual(expect.objectContaining({ [statusKey]: 'ACTIVE' }));
      expect(Object.values(lastDecision(onChange).componentChoices ?? {})).toContain('2024-05-01');
    });

    it('asks the position the file does not give, proposes none, and takes only a whole number of 1 or more', async () => {
      const { onChange, sidecar } = await renderPanel(withItems(contentItem({})), { fileWorkType: Monograph });
      const key = componentKeyOf(sidecar, 'COMPONENT_ORDINAL_REQUIRED');
      const position = within(confirmation()).getByRole('textbox', {
        name: /^onixPlan\.review\.decision\.ordinal\.label \{"title":"onixPlan\.review\.decision\.topic\.COMPONENT_ORDINAL_REQUIRED"/,
      });

      const confirmPosition = () =>
        within(confirmation()).getByRole('button', {
          name: 'onixPlan.review.confirmation.confirmLabel {"task":"onixPlan.review.decision.topic.COMPONENT_ORDINAL_REQUIRED"}',
        });

      expect(position).toHaveValue('');

      fireEvent.change(position, { target: { value: '0' } });

      expect(screen.getByText('onixPlan.review.decision.ordinal.invalid')).toBeInTheDocument();
      expect(confirmPosition()).toBeDisabled();
      expect(onChange).not.toHaveBeenCalled();

      // A draft until confirmed: "12" reaches the canonical input whole, never as 1 (#264 CR-1).
      fireEvent.change(position, { target: { value: '12' } });

      expect(onChange).not.toHaveBeenCalled();
      expect(position).toHaveValue('12');
      await userEvent.click(confirmPosition());
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(lastDecision(onChange).componentChoices).toEqual({ [key]: '12' });
    });

    it('names the facet an acknowledgement gives up - the hierarchy of a content item, not the item - and records it as confirmed (#264 CR-2)', async () => {
      const { onChange, sidecar, decideAgain } = await renderPanel(withItems(contentItem({ lsn: '1.2' })), {
        fileWorkType: Monograph,
      });
      const key = componentKeyOf(sidecar, 'COMPONENT_HIERARCHY_UNREPRESENTABLE');
      const task = taskNamed('onixPlan.review.decision.topic.COMPONENT_HIERARCHY_UNREPRESENTABLE');
      const box = within(task).getByRole('checkbox', { name: /topic\.COMPONENT_HIERARCHY_UNREPRESENTABLE/ });

      // The established component copy: the hierarchy is what is lost, and the item is placed under its Work.
      expect(box).toHaveAccessibleName(
        /onixPlan\.components\.acknowledge\.COMPONENT_HIERARCHY_UNREPRESENTABLE \{"scope":"onixPlan\.review\.decision\.componentPosition/,
      );
      expect(primaryText(task)).not.toContain('review.decision.acknowledge.label');

      await userEvent.click(box);
      expect(lastDecision(onChange).componentChoices).toEqual({ [key]: ONIX_COMPONENT_ACKNOWLEDGED });

      decideAgain(lastDecision(onChange));
      const confirmed = decided().find((entry) => entry.textContent?.includes('COMPONENT_HIERARCHY_UNREPRESENTABLE'));
      expect(confirmed).toHaveTextContent('onixPlan.review.summary.confirmed');
      expect(primaryText(summary())).not.toContain('onixPlan.review.summary.acknowledged');
    });

    it('asks one acknowledgement per loss, unticked, with no control that accepts every loss at once', async () => {
      const file = withItems(
        contentItem({ lsn: '1' }),
        contentItem({ lsn: '2', av: '01' }),
        contentItem({ lsn: '3', av: '02' }),
      );
      const { onChange, sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const checkboxes = within(confirmation()).getAllByRole('checkbox');
      const lossKeys = (sidecar.findings ?? [])
        .filter(({ code }) => code === 'COMPONENT_AV_ITEM_UNREPRESENTABLE')
        .map(({ key }) => key);

      expect(checkboxes).toHaveLength(2);
      checkboxes.forEach((checkbox) => expect(checkbox).not.toBeChecked());
      // Each asks about its own content item, named by position.
      expect(confirmation()).toHaveTextContent('onixPlan.review.decision.componentPosition {"position":"2"}');
      expect(confirmation()).toHaveTextContent('onixPlan.review.decision.componentPosition {"position":"3"}');

      await userEvent.click(checkboxes[0]);

      expect(lastDecision(onChange).componentChoices).toEqual({ [lossKeys[0]]: ONIX_COMPONENT_ACKNOWLEDGED });

      decideAgain({
        fileWorkType: Monograph,
        componentChoices: Object.fromEntries(lossKeys.map((key) => [key, ONIX_COMPONENT_ACKNOWLEDGED])),
      });

      expectReady();
      expect(decided()).toHaveLength(2);
    });

    it('offers each page range the file states and none, and never the first by default', async () => {
      await renderPanel(
        withItems(
          contentItem({
            lsn: '1',
            inner:
              '<PageRun><FirstPageNumber>1</FirstPageNumber><LastPageNumber>9</LastPageNumber></PageRun><PageRun><FirstPageNumber>12</FirstPageNumber><LastPageNumber>20</LastPageNumber></PageRun>',
          }),
        ),
        { fileWorkType: Monograph },
      );
      const pages = within(confirmation()).getByRole('combobox', {
        name: /topic\.COMPONENT_PAGE_RUNS_CHOICE_REQUIRED/,
      });

      expect(pages).toHaveValue('');
      expect(
        within(pages)
          .getAllByRole('option', { hidden: true })
          .map(({ textContent }) => textContent),
      ).toEqual(['onixPlan.review.decision.choose', '1–9', '12–20', 'onixPlan.components.option.OMIT']);
    });

    it('marks an answer the file does not offer as refused, and clears one to a finding this file does not have', async () => {
      const file = withItems(contentItem({ lsn: '1', type: '01' }));
      const typeKey = componentKeyOf(
        await sidecarFor(file, { fileWorkType: Monograph }),
        'CONTAINED_WORK_TYPE_REQUIRED',
      );
      const { onChange } = await renderPanel(file, {
        fileWorkType: Monograph,
        componentChoices: { [typeKey]: BookChapter, 'COMPONENT|elsewhere': '1' },
      });
      const workType = within(confirmation()).getByRole('combobox', { name: /topic\.CONTAINED_WORK_TYPE_REQUIRED/ });

      expect(workType).toHaveValue(BookChapter);
      expect(
        within(workType).getByRole('option', { name: /onixPlan\.review\.confirmation\.staleAnswer/, hidden: true }),
      ).toBeDisabled();
      expect(taskNamed(/CONTAINED_WORK_TYPE_REQUIRED/)).toHaveTextContent('onixPlan.review.confirmation.stale');

      await userEvent.click(
        within(fileSection() as HTMLElement).getByRole('button', { name: /^onixPlan\.review\.decision\.stale\.clear/ }),
      );

      expect(lastDecision(onChange).componentChoices).toEqual({ [typeKey]: BookChapter });
    });

    it('says nothing in the normal view about what a chapter loses or what a later stage keeps: the plan is ready', async () => {
      await renderPanel(
        withItems(
          contentItem({
            lsn: '1',
            type: '02',
            inner:
              '<TextItemIdentifier><TextItemIDType>06</TextItemIDType><IDValue>10.1234/front</IDValue></TextItemIdentifier><PageRun><FirstPageNumber>i</FirstPageNumber><LastPageNumber>xii</LastPageNumber></PageRun><NumberOfPages>12</NumberOfPages>',
            after:
              '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text language="eng">An abstract.</Text></TextContent>',
          }),
        ),
        { fileWorkType: Monograph },
      );

      expectReady();
      expect(noConfirmation()).not.toBeInTheDocument();
      expect(problems()).not.toBeInTheDocument();
      expect(primaryText(card())).not.toContain('matter');
      expect(primaryText(card())).not.toContain('retained');
      expect(primaryText(card())).not.toContain('disclosures');
    });
  });
});

describe('OnixPlanResolution related works and references (thoth-app#224)', () => {
  afterEach(cleanup);

  const ISBN_C = '9781800000032';
  const ISBN_D = '9781800000049';
  const ISBN_E = '9781800000056';
  const WORK_DOI = '10.1234/work';
  const wid = (value: string) =>
    `<WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>${value}</IDValue></WorkIdentifier>`;
  const rw = (code: string, doi: string) =>
    `<RelatedWork><WorkRelationCode>${code}</WorkRelationCode>${wid(doi)}</RelatedWork>`;
  const rp = (code: string, identifier: string) =>
    `<RelatedProduct><ProductRelationCode>${code}</ProductRelationCode>${identifier}</RelatedProduct>`;
  const doi = (value: string) =>
    `<ProductIdentifier><ProductIDType>06</ProductIDType><IDValue>${value}</IDValue></ProductIdentifier>`;
  const relatedLookup: OnixRelatedMaterialLookup = {
    findWorksGlobally: async (identifiers) =>
      new Map(
        identifiers.map((identifier) => [
          importIdentifierKey(identifier),
          identifier.value === 'https://doi.org/10.1234/elsewhere'
            ? [{ workId: 'w-elsewhere', imprintId: 'imprint-of-another-publisher', languageCodes: [] }]
            : identifier.value === 'https://doi.org/10.1234/translation'
              ? [{ workId: 'w-t', imprintId: 'imprint-1', languageCodes: [] }]
              : [],
        ]),
      ),
    getWorkRelations: async () => [{ relatedWorkId: 'w-t', relationType: 'HAS_TRANSLATION', relationOrdinal: 2 }],
    getWorkReferences: async () => [],
  };
  /** Every outcome a relation can have before confirmation, each from its own record. */
  const file: FileSpec = {
    records: [
      onixRecord({
        ref: 'a',
        identifiers: isbn(ISBN_A),
        related:
          rw('01', '10.1234/a') +
          rw('49', '10.1234/b') +
          rw('29', '10.1234/nowhere') +
          rw('29', '10.1234/elsewhere') +
          rp('01', isbn(ISBN_C)) +
          rp('34', doi('10.1234/cited')) +
          rp('35', doi('10.1234/citing')),
      }),
      onixRecord({ ref: 'b', identifiers: isbn(ISBN_B), related: rw('01', '10.1234/b') }),
      onixRecord({ ref: 'c', identifiers: isbn(ISBN_C), related: rw('01', '10.1234/c') + rw('49', '10.1234/d') }),
      onixRecord({ ref: 'd', identifiers: isbn(ISBN_D), related: rw('01', '10.1234/d') + rw('49', '10.1234/c') }),
      onixRecord({
        ref: 'e',
        identifiers: isbn(ISBN_E),
        related: rw('01', WORK_DOI) + rw('49', '10.1234/translation'),
      }),
    ],
    lookup: exactLookup({ [`doi:https://doi.org/${WORK_DOI}`]: ['w-1'], [`isbn:${ISBN_E}`]: ['w-1'] }, [
      getDefaultWork({
        id: 'w-1',
        type: Monograph,
        doi: `https://doi.org/${WORK_DOI}`,
        imprintId: 'imprint-1',
        titles: [getDefaultTitle({ canonical: true, title: 'A Work', fullTitle: 'A Work' })],
        publications: [getDefaultPublication({ id: 'p-1', type: PublicationType.enum.Paperback, isbn: ISBN_E })],
      }),
    ]),
    relatedLookup,
  };
  /** The card of the Work record `a` manifests: the first Work of the file. */
  const first = () => card(0);

  it('asks only what the file leaves to the publisher about its relations, and names what only the source can resolve as a problem', async () => {
    const { sidecar, onChange } = await renderPanel(file, { fileWorkType: Monograph });
    const unresolved = sidecar.relatedMaterial?.findings.find(({ code }) => code === 'RELATION_TARGET_UNRESOLVED');
    const unauthorized = sidecar.relatedMaterial?.findings.find(({ code }) => code === 'RELATION_TARGET_UNAUTHORIZED');

    // The generic RelatedProduct 01 between two exact, distinct Works is planned by itself (#224 Amendment 2 B): no
    // projection choice is asked, and the planned edge is nobody's question.
    expect(sidecar.relatedMaterial?.edges).toContainEqual(
      expect.objectContaining({ relationType: 'HAS_PART', basis: 'GENERIC_PRODUCT_RELATION', state: 'PLANNED' }),
    );
    const section = within(first()).getByTestId('onix-review-confirmation');
    expect(within(section).queryByRole('combobox')).not.toBeInTheDocument();
    // Two acknowledgements, nothing ticked, each naming the relation it is about.
    const acknowledgements = within(section).getAllByRole('checkbox');
    expect(acknowledgements).toHaveLength(2);
    acknowledgements.forEach((checkbox) => expect(checkbox).not.toBeChecked());
    expect(within(section).getByRole('checkbox', { name: /topic\.RELATION_TARGET_UNRESOLVED/ })).toBeInTheDocument();
    expect(within(section).getByRole('checkbox', { name: /topic\.RELATION_TARGET_UNAUTHORIZED/ })).toBeInTheDocument();
    // The citation Thoth cannot store, and the unsupported "cited by", are deterministic loss: shown to nobody.
    expect(primaryText(first())).not.toContain('RELATION_CITED_BY');
    expect(primaryText(first())).not.toContain('UNREPRESENTABLE');

    // What only the source can resolve is a problem, never a control; a planned relation is created by this import
    // (thoth-app#187), and never one.
    const conflicting = cards().find(
      (item) => within(item).queryByTestId('onix-review-problems') !== null,
    ) as HTMLElement;
    expect(within(conflicting).getByTestId('onix-review-problems')).toHaveTextContent(
      'onixPlan.blocker.RELATION_SOURCE_CONFLICT',
    );
    expect(screen.queryByText(/EXECUTION_DEFERRED/)).not.toBeInTheDocument();

    fireEvent.click(acknowledgements[0]);
    expect(lastDecision(onChange).relatedMaterialChoices).toEqual({
      [unresolved?.key as string]: ONIX_RELATED_MATERIAL_ACKNOWLEDGED,
    });
    fireEvent.click(acknowledgements[1]);
    expect(lastDecision(onChange).relatedMaterialChoices).toEqual({
      [unauthorized?.key as string]: ONIX_RELATED_MATERIAL_ACKNOWLEDGED,
    });
  });

  it('shows a Product relation within one Work as a problem to correct, never a question, and clears an answer forged for it', async () => {
    const pdf = '<ProductForm>EB</ProductForm><ProductFormDetail>E107</ProductFormDetail>';
    const sameWork: FileSpec = {
      records: [
        onixRecord({ ref: 'f', identifiers: isbn(ISBN_A), related: rw('01', '10.1234/f') + rp('05', isbn(ISBN_C)) }),
        onixRecord({ ref: 'f-pdf', identifiers: isbn(ISBN_C), descriptive: pdf, related: rw('01', '10.1234/f') }),
      ],
      relatedLookup,
    };
    const firstSidecar = await sidecarFor(sameWork, { fileWorkType: Monograph });
    const self = firstSidecar.relatedMaterial?.findings.find(({ code }) => code === 'RELATION_SELF_AFTER_GROUPING');

    expect(self).toMatchObject({ classification: 'SOURCE_CONFLICT', resolution: { kind: 'NONE' } });

    const { onChange } = await renderPanel(sameWork, {
      fileWorkType: Monograph,
      relatedMaterialChoices: { [self?.key as string]: ONIX_RELATED_MATERIAL_ACKNOWLEDGED },
    });

    // Held as a problem with the source - no acknowledgement, choice or tick is offered for it.
    expect(within(first()).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(first()).queryByRole('combobox')).not.toBeInTheDocument();
    expect(problems()).toHaveTextContent('onixPlan.blocker.RELATION_SOURCE_CONFLICT');
    expect(primaryText(first())).not.toContain(self?.message as string);

    // The forged acknowledgement is an answer to nothing the plan offers, cleared by its own control.
    const clear = within(first()).getByRole('button', { name: /^onixPlan\.review\.decision\.stale\.clear/ });
    fireEvent.click(clear);
    expect(lastDecision(onChange).relatedMaterialChoices).toEqual({});
  });

  it('still asks whether a Product relation becomes a Work relation where the grouping leaves a Work unsettled', async () => {
    const { sidecar } = await renderPanel(
      {
        records: [
          onixRecord({
            ref: 'g',
            identifiers: isbn(ISBN_A),
            related: rw('01', '10.1234/g') + rw('01', '10.1234/g-other') + rp('01', isbn(ISBN_C)),
          }),
          onixRecord({ ref: 'c', identifiers: isbn(ISBN_C), related: rw('01', '10.1234/c') }),
        ],
        relatedLookup,
      },
      { fileWorkType: Monograph },
    );
    const projection = within(first()).getByRole('combobox', { name: /topic\.RELATION_PROJECTION_CHOICE_REQUIRED/ });

    expect(sidecar.relatedMaterial?.edges).toEqual([]);
    expect(projection).toHaveValue('');
    expect(optionValues(projection)).toEqual(['', 'PROJECT', 'OMIT']);
  });

  it('shows an acknowledged omission as a decision taken, and a stale answer to a finding the file lacks with a way to clear it', async () => {
    const firstSidecar = await sidecarFor(file, { fileWorkType: Monograph });
    const unresolved = firstSidecar.relatedMaterial?.findings.find(({ code }) => code === 'RELATION_TARGET_UNRESOLVED');
    const { onChange } = await renderPanel(file, {
      fileWorkType: Monograph,
      relatedMaterialChoices: {
        [unresolved?.key as string]: ONIX_RELATED_MATERIAL_ACKNOWLEDGED,
        'a-finding-this-file-does-not-have': 'OMIT',
      },
    });

    expect(within(first()).getAllByTestId('onix-review-decision')[0]).toHaveTextContent(
      'onixPlan.review.decision.topic.RELATION_TARGET_UNRESOLVED',
    );
    const clear = within(fileSection() as HTMLElement).getByRole('button', {
      name: 'onixPlan.review.decision.stale.clear {"answer":"OMIT"}',
    });
    fireEvent.click(clear);
    expect(lastDecision(onChange).relatedMaterialChoices).toEqual({
      [unresolved?.key as string]: ONIX_RELATED_MATERIAL_ACKNOWLEDGED,
    });
  });

  it('says nothing about related material for a file that states none', async () => {
    await renderPanel({ records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) })], relatedLookup });

    expect(primaryText(card())).not.toContain('RELATION');
    expect(primaryText(card())).not.toContain('relatedMaterial');
  });
});

describe('OnixPlanResolution collateral (thoth-app#225)', () => {
  afterEach(cleanup);

  const text = (type: string, body: string, attributes = '') =>
    `<TextContent><TextType>${type}</TextType><ContentAudience>00</ContentAudience><Text${attributes}>${body}</Text></TextContent>`;
  const TRAILER = 'https://video.example.org/trailer';
  const trailer =
    '<SupportingResource><ResourceContentType>26</ResourceContentType><ContentAudience>00</ContentAudience><ResourceMode>05</ResourceMode>' +
    `<ResourceVersion><ResourceForm>01</ResourceForm><ResourceLink>${TRAILER}</ResourceLink></ResourceVersion></SupportingResource>`;
  /** A new paperback Work stating the collateral given, in a file that states no language for it. */
  const collateralFile = (collateral: string): FileSpec => ({
    records: [
      onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) }).replace(
        '</DescriptiveDetail>',
        `</DescriptiveDetail><CollateralDetail>${collateral}</CollateralDetail>`,
      ),
    ],
  });
  const findingOf = (sidecar: OnixImportPlanSidecar, code: string) =>
    sidecar.collateral?.findings.find((finding) => finding.code === code);

  it('asks each collateral question in its own terms with nothing chosen, typed or ticked, and records exactly the answers', async () => {
    const file = collateralFile(
      text('13', 'Notice one.') +
        text('13', 'Notice two.') +
        text('02', 'Untagged.') +
        text('30', 'A &lt;blink&gt;bad&lt;/blink&gt; one', ' textformat="06" language="eng"'),
    );
    const { sidecar, onChange } = await renderPanel(file, { fileWorkType: Monograph });
    const note = findingOf(sidecar, 'COLLATERAL_GENERAL_NOTE_CHOICE_REQUIRED');
    const locale = findingOf(sidecar, 'COLLATERAL_TEXT_LOCALE_UNRESOLVED');
    const unrepresentable = findingOf(sidecar, 'COLLATERAL_TEXT_UNREPRESENTABLE');

    expect(pendingTasks()).toHaveLength(3);
    expectAttention(3);

    const noteControl = within(confirmation()).getByRole('combobox', {
      name: /topic\.COLLATERAL_GENERAL_NOTE_CHOICE_REQUIRED/,
    });
    const localeControl = within(confirmation()).getByRole('combobox', {
      name: /topic\.COLLATERAL_TEXT_LOCALE_UNRESOLVED/,
    });
    const acknowledgementBox = within(confirmation()).getByRole('checkbox', {
      name: /topic\.COLLATERAL_TEXT_UNREPRESENTABLE/,
    });
    const noteOptions = note?.resolution.kind === 'CHOICE' ? note.resolution.options : [];

    expect(noteControl).toHaveValue('');
    expect(optionValues(noteControl)).toEqual(['', ...noteOptions.map(({ key }) => key)]);
    expect(noteOptions.map(({ label }) => label)).toEqual([
      'TextType 13: Notice one.',
      'TextType 13: Notice two.',
      'OMIT',
    ]);
    expect(
      within(noteControl).getByRole('option', { name: 'onixPlan.collateral.option.OMIT', hidden: true }),
    ).toHaveValue('OMIT');
    // No locale is assumed, English least of all: the searchable control starts empty.
    expect(localeControl.tagName).toBe('INPUT');
    expect(localeControl).toHaveValue('');
    expect(acknowledgementBox).not.toBeChecked();
    // The questions are controls, never problems to read about.
    expect(problems()).not.toBeInTheDocument();

    fireEvent.change(noteControl, { target: { value: noteOptions[1].key } });
    expect(lastDecision(onChange).collateralChoices).toEqual({ [note?.key as string]: noteOptions[1].key });
    await userEvent.type(localeControl, 'German');
    await userEvent.click(screen.getByRole('option', { name: localeLabel('DE'), hidden: true }));
    expect(lastDecision(onChange).collateralChoices).toEqual({ [locale?.key as string]: 'DE' });
    fireEvent.click(acknowledgementBox);
    expect(lastDecision(onChange).collateralChoices).toEqual({
      [unrepresentable?.key as string]: ONIX_COLLATERAL_ACKNOWLEDGED,
    });
  });

  it('shows an answered collateral question as a decision taken, changeable, and the Work ready', async () => {
    const file = collateralFile(
      text('13', 'Notice one.') + text('13', 'Notice two.') + text('03', 'The long one.', ' language="eng"'),
    );
    const firstSidecar = await sidecarFor(file, { fileWorkType: Monograph });
    const note = findingOf(firstSidecar, 'COLLATERAL_GENERAL_NOTE_CHOICE_REQUIRED');
    const second = note?.resolution.kind === 'CHOICE' ? note.resolution.options[1].key : '';

    await renderPanel(file, { fileWorkType: Monograph, collateralChoices: { [note?.key as string]: second } });

    expectReady();
    expect(noConfirmation()).not.toBeInTheDocument();
    expect(decided()[0]).toHaveTextContent(
      'onixPlan.review.decision.topic.COLLATERAL_GENERAL_NOTE_CHOICE_REQUIRED: TextType 13: Notice two.',
    );
    await userEvent.click(within(decided()[0]).getByRole('button'));
    expect(
      within(confirmation()).getByRole('combobox', { name: /topic\.COLLATERAL_GENERAL_NOTE_CHOICE_REQUIRED/ }),
    ).toHaveValue(second);
    // What Thoth does not record is said nowhere in the normal view.
    expect(primaryText(card())).not.toContain('disclosures');
    expect(primaryText(card())).not.toContain('tableOfContents');
  });

  it('asks nothing about a trailer the plan holds as an AdditionalResource, and names no problem (#187)', async () => {
    const { sidecar } = await renderPanel(collateralFile(text('03', 'The long one.', ' language="eng"') + trailer), {
      fileWorkType: Monograph,
    });

    expect(sidecar.collateral?.actions[0].resources).toHaveLength(1);
    expectReady();
    expect(noConfirmation()).not.toBeInTheDocument();
    expect(problems()).not.toBeInTheDocument();
  });

  it('shows a stale answer as refused on its question, and one to a finding the file lacks with a way to clear it', async () => {
    const file = collateralFile(text('13', 'Notice one.') + text('13', 'Notice two.'));
    const firstSidecar = await sidecarFor(file, { fileWorkType: Monograph });
    const note = findingOf(firstSidecar, 'COLLATERAL_GENERAL_NOTE_CHOICE_REQUIRED');
    const { onChange } = await renderPanel(file, {
      fileWorkType: Monograph,
      collateralChoices: { [note?.key as string]: 'Notice three.', 'a-finding-this-file-does-not-have': 'OMIT' },
    });
    const control = within(confirmation()).getByRole('combobox', {
      name: /topic\.COLLATERAL_GENERAL_NOTE_CHOICE_REQUIRED/,
    });

    expect(control).toHaveValue('Notice three.');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(taskNamed(/COLLATERAL_GENERAL_NOTE_CHOICE_REQUIRED/)).toHaveTextContent(
      'onixPlan.review.confirmation.stale',
    );
    expect(
      within(control).getByRole('option', {
        name: 'onixPlan.review.confirmation.staleAnswer {"answer":"Notice three."}',
        hidden: true,
      }),
    ).toBeDisabled();

    const clear = within(fileSection() as HTMLElement).getByRole('button', {
      name: 'onixPlan.review.decision.stale.clear {"answer":"OMIT"}',
    });
    fireEvent.click(clear);
    expect(lastDecision(onChange).collateralChoices).toEqual({ [note?.key as string]: 'Notice three.' });
  });

  it('says nothing about collateral for a file that states none', async () => {
    const { sidecar } = await renderPanel(
      { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) })] },
      { fileWorkType: Monograph },
    );

    // The Work is still planned with no collateral, and nothing about it is said.
    expect(sidecar.collateral?.actions).toEqual([expect.objectContaining({ target: 'WORK', action: 'PLANNED' })]);
    expect(primaryText(card())).not.toContain('collateral');
  });
});

describe('OnixPlanResolution reviews, endorsements and awards (thoth-app#226)', () => {
  afterEach(cleanup);

  const text = (type: string, body: string, extra = '') =>
    `<TextContent><TextType>${type}</TextType><ContentAudience>00</ContentAudience><Text>${body}</Text>${extra}</TextContent>`;
  const cited = (link: string) =>
    `<CitedContent><CitedContentType>01</CitedContentType><ContentAudience>00</ContentAudience><ResourceLink>${link}</ResourceLink></CitedContent>`;
  const prize = (name: string, code = '01') =>
    `<Prize><PrizeName>${name}</PrizeName><PrizeCode>${code}</PrizeCode></Prize>`;
  /** A new paperback Work stating the review, endorsement and prize facts given, and the ContentDetail given. */
  const reviewsFile = (collateral: string, content = ''): FileSpec => ({
    records: [
      onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) }).replace(
        '</DescriptiveDetail>',
        `</DescriptiveDetail><CollateralDetail>${collateral}</CollateralDetail>${content === '' ? '' : `<ContentDetail>${content}</ContentDetail>`}`,
      ),
    ],
  });
  const findingOf = (sidecar: OnixImportPlanSidecar, code: string) =>
    sidecar.findings?.find((finding) => finding.family === 'REVIEWS_PRIZES' && finding.code === code);
  const choiceKey = (sidecar: OnixImportPlanSidecar, code: string) => findingOf(sidecar, code)?.key as string;

  it('offers the order of unevenly numbered reviews as consent to file order, imports them all, and never calls them left out (#264 CR-2)', async () => {
    const file = reviewsFile(
      text('06', 'A fine book.', '<TextAuthor>A Reviewer</TextAuthor><SequenceNumber>1</SequenceNumber>') +
        text('06', 'Another fine book.', '<TextAuthor>Another Reviewer</TextAuthor>'),
    );
    const { onChange, sidecar, decideAgain, resolve } = await renderPanel(file, { fileWorkType: Monograph });
    const finding = findingOf(sidecar, 'REVIEWS_PRIZES_ORDER_UNRESOLVED');

    expect(finding?.resolution.kind).toBe('ACKNOWLEDGE');
    const task = taskNamed('onixPlan.review.decision.topic.REVIEWS_PRIZES_ORDER_UNRESOLVED');
    const box = within(task).getByRole('checkbox', { name: /topic\.REVIEWS_PRIZES_ORDER_UNRESOLVED/ });

    // Confirming means ordering them as the file lists them - the established copy - not leaving them out.
    expect(box).toHaveAccessibleName(/onixPlan\.reviewsPrizes\.acknowledge\.REVIEWS_PRIZES_ORDER_UNRESOLVED/);
    expect(primaryText(task)).toContain('onixPlan.reviewsPrizes.acknowledge.REVIEWS_PRIZES_ORDER_UNRESOLVED');
    ['review.decision.acknowledge.label', 'without importing', 'not imported', 'left out'].forEach((omission) =>
      expect(primaryText(task)).not.toContain(omission),
    );

    await userEvent.click(box);
    expect(lastDecision(onChange).reviewsPrizesChoices).toEqual({
      [finding?.key as string]: ONIX_REVIEWS_PRIZES_ACKNOWLEDGED,
    });
    // The canonical reduction orders both reviews by file order and plans them: nothing is omitted.
    const next = resolve(lastDecision(onChange)).sidecar;
    expect(next.reviewsPrizes?.actions[0]).toMatchObject({ action: 'PLANNED' });
    expect(next.reviewsPrizes?.actions[0].bookReviews).toHaveLength(2);

    decideAgain(lastDecision(onChange));
    expectReady();
    expect(decided()[0]).toHaveTextContent(
      'onixPlan.review.decision.topic.REVIEWS_PRIZES_ORDER_UNRESOLVED: onixPlan.review.summary.confirmed',
    );
    expect(primaryText(summary())).not.toContain('onixPlan.review.summary.acknowledged');
  });

  it('is ready with review quotes, cited reviews, endorsements and a Work award once the prize is classified, asking nothing more (#187)', async () => {
    const file = reviewsFile(
      text('06', 'A fine book.', '<TextAuthor>A Reviewer</TextAuthor>') +
        text('09', 'Essential.', '<TextAuthor>An Endorser</TextAuthor>') +
        cited('https://paper.example.org/review') +
        prize('The Prize'),
    );
    const firstSidecar = await sidecarFor(file, { fileWorkType: Monograph });

    const { sidecar } = await renderPanel(file, {
      fileWorkType: Monograph,
      reviewsPrizesChoices: { [choiceKey(firstSidecar, 'PRIZE_SCOPE_REQUIRED')]: 'WORK_AWARD' },
    });

    expect(sidecar.reviewsPrizes?.actions[0]).toMatchObject({ action: 'PLANNED' });
    expect(sidecar.reviewsPrizes?.actions[0].awards).toHaveLength(1);
    expectReady();
    expect(problems()).not.toBeInTheDocument();
    // The one decision taken, with its answer; the optional pairing of the cited review stays available apart.
    expect(decided()[0]).toHaveTextContent(
      'onixPlan.review.decision.topic.PRIZE_SCOPE_REQUIRED: onixPlan.reviewsPrizes.option.WORK_AWARD',
    );
    expect(within(card()).getByTestId('onix-review-optional')).toHaveTextContent(
      'onixPlan.review.confirmation.optional {"count":1}',
    );
  });

  it('asks who an endorsement is attributed to, and takes the omission as an answer that previews a Work without it', async () => {
    const file = reviewsFile(
      text(
        '09',
        'We both loved it.',
        '<TextAuthor>One Endorser</TextAuthor><TextAuthor>Two Endorser</TextAuthor><SourceTitle>The Review Journal</SourceTitle>',
      ),
    );
    const { sidecar, onChange, decideAgain, resolve } = await renderPanel(file, { fileWorkType: Monograph });
    const control = within(confirmation()).getByRole('combobox', {
      name: /topic\.ENDORSEMENT_ATTRIBUTION_CHOICE_REQUIRED/,
    });

    expect(choiceKey(sidecar, 'ENDORSEMENT_ATTRIBUTION_CHOICE_REQUIRED')).toBeTruthy();
    fireEvent.change(control, { target: { value: 'OMIT' } });
    const omittedInputs = lastDecision(onChange);
    const omittedSidecar = resolve(omittedInputs).sidecar;

    expect(omittedSidecar.blockers.map(({ detail }) => detail.finding)).not.toContain(
      'ENDORSEMENT_ATTRIBUTION_CHOICE_REQUIRED',
    );
    expect(omittedSidecar.reviewsPrizes?.actions[0].endorsements).toEqual([]);

    decideAgain(omittedInputs);
    expectReady();
    expect(decided()[0]).toHaveTextContent('onixPlan.reviewsPrizes.option.OMIT');
  });

  it('asks every P.17 Prize what it was won by with nothing chosen, and takes a Product award as a decision that imports none', async () => {
    const file = reviewsFile(
      '<Prize><PrizeName>The Design Prize</PrizeName><PrizeCode>01</PrizeCode><PrizeRegion>GB-SCT</PrizeRegion></Prize>',
    );
    const { sidecar, onChange, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
    const scope = findingOf(sidecar, 'PRIZE_SCOPE_REQUIRED');
    const control = within(confirmation()).getByRole('combobox', { name: /topic\.PRIZE_SCOPE_REQUIRED/ });

    expect(pendingTasks()).toHaveLength(1);
    expect(control).toHaveValue('');
    expect(optionValues(control)).toEqual(['', 'WORK_AWARD', 'PRODUCT_AWARD']);
    expect(
      within(control).getByRole('option', { name: 'onixPlan.reviewsPrizes.option.PRODUCT_AWARD', hidden: true }),
    ).toHaveValue('PRODUCT_AWARD');
    expect(problems()).not.toBeInTheDocument();

    fireEvent.change(control, { target: { value: 'PRODUCT_AWARD' } });
    expect(lastDecision(onChange).reviewsPrizesChoices).toEqual({ [scope?.key as string]: 'PRODUCT_AWARD' });

    decideAgain(lastDecision(onChange));
    expectReady();
    // The answered question is a decision taken, changeable; the Product award it declares is deterministic loss now.
    expect(decided()[0]).toHaveTextContent('onixPlan.reviewsPrizes.option.PRODUCT_AWARD');
    expect(primaryText(card())).not.toContain('PRODUCT_AWARD_UNREPRESENTABLE');
    expect(primaryText(card())).not.toContain('GB-SCT');
  });

  it('offers a cited review’s pairing with a review quote as an optional adjustment, never requiring it or pairing by itself', async () => {
    const file = reviewsFile(text('06', 'A marvel.') + cited('https://paper.example.org/marvel'));
    const { sidecar, onChange } = await renderPanel(file, { fileWorkType: Monograph });
    const pairing = findingOf(sidecar, 'REVIEW_PAIRING_AVAILABLE');
    const [quote] = pairing?.resolution.kind === 'CHOICE' ? pairing.resolution.options : [];

    // Nothing waits on the pairing: the Work is ready, and the pairing is offered apart from what is required.
    expectReady();
    expect(sidecar.blockers.map(({ detail }) => detail.finding)).not.toContain('REVIEW_PAIRING_AVAILABLE');
    const optional = within(card()).getByTestId('onix-review-optional');
    const control = within(optional).getByRole('combobox', { name: /topic\.REVIEW_PAIRING_AVAILABLE/, hidden: true });
    expect(control).toHaveValue('');

    fireEvent.change(control, { target: { value: quote.key } });
    expect(lastDecision(onChange).reviewsPrizesChoices).toEqual({ [pairing?.key as string]: quote.key });
  });

  it('asks the acknowledgement of an unattributed endorsement unticked', async () => {
    const { sidecar, onChange } = await renderPanel(reviewsFile(text('09', 'Nobody said this.')), {
      fileWorkType: Monograph,
    });
    const acknowledgementBox = within(confirmation()).getByRole('checkbox', {
      name: /topic\.ENDORSEMENT_ATTRIBUTION_MISSING/,
    });

    expect(acknowledgementBox).not.toBeChecked();
    fireEvent.click(acknowledgementBox);
    expect(lastDecision(onChange).reviewsPrizesChoices).toEqual({
      [choiceKey(sidecar, 'ENDORSEMENT_ATTRIBUTION_MISSING')]: 'ACKNOWLEDGED',
    });
  });

  it('shows a stale answer as refused on its question, and one to a finding the file lacks with a way to clear it', async () => {
    const file = reviewsFile(prize('The Prize'));
    const firstSidecar = await sidecarFor(file, { fileWorkType: Monograph });
    const scope = choiceKey(firstSidecar, 'PRIZE_SCOPE_REQUIRED');
    const { onChange } = await renderPanel(file, {
      fileWorkType: Monograph,
      reviewsPrizesChoices: { [scope]: 'EVERY_AWARD', 'a-finding-this-file-does-not-have': 'OMIT' },
    });
    const control = within(confirmation()).getByRole('combobox', { name: /topic\.PRIZE_SCOPE_REQUIRED/ });

    expect(control).toHaveValue('EVERY_AWARD');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(taskNamed(/PRIZE_SCOPE_REQUIRED/)).toHaveTextContent('onixPlan.review.confirmation.stale');
    expect(
      within(control).getByRole('option', {
        name: 'onixPlan.review.confirmation.staleAnswer {"answer":"EVERY_AWARD"}',
        hidden: true,
      }),
    ).toBeDisabled();

    const clear = within(fileSection() as HTMLElement).getByRole('button', {
      name: 'onixPlan.review.decision.stale.clear {"answer":"OMIT"}',
    });
    fireEvent.click(clear);
    expect(lastDecision(onChange).reviewsPrizesChoices).toEqual({ [scope]: 'EVERY_AWARD' });
  });

  it('plans a chapter’s and a contained Work’s reviews where the canonical plan puts them, asking nothing of a chapter (rules 152-155)', async () => {
    const chapter =
      '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>03</TextItemType></TextItem>' +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">A Chapter</TitleText></TitleElement></TitleDetail>' +
      `${text('06', 'The chapter review.')}</ContentItem>`;
    const { sidecar } = await renderPanel(reviewsFile(text('06', 'The book review.'), chapter), {
      fileWorkType: Monograph,
    });

    expect(sidecar.reviewsPrizes?.actions.map(({ target, action }) => [target, action])).toEqual([
      ['WORK', 'PLANNED'],
      ['CHAPTER', 'TARGET_UNREPRESENTABLE'],
    ]);
    expectReady();
    expect(noConfirmation()).not.toBeInTheDocument();
    expect(primaryText(card())).not.toContain('The chapter review.');

    const containedPath = '/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[1]';
    const contained =
      '<ContentItem><LevelSequenceNumber>1</LevelSequenceNumber><TextItem><TextItemType>01</TextItemType></TextItem>' +
      '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>04</TitleElementLevel><TitleText language="eng">A Contained Work</TitleText></TitleElement></TitleDetail>' +
      `${text('06', 'The contained review.')}</ContentItem>`;
    const containedSidecar = await sidecarFor(reviewsFile('', contained), { fileWorkType: Monograph });
    const [work, containedAction] = containedSidecar.reviewsPrizes?.actions ?? [];

    expect(work).toMatchObject({ target: 'WORK', bookReviews: [] });
    expect(containedAction).toMatchObject({
      target: 'CONTAINED_WORK',
      componentPath: containedPath,
      bookReviews: [expect.objectContaining({ target: expect.objectContaining({ text: 'The contained review.' }) })],
    });
  });

  it('asks nothing of what an existing Work’s Products state, and never plans one of its children (fixture 214)', async () => {
    const existing = getDefaultWork({
      id: 'w-1',
      doi: 'https://doi.org/10.1234/work',
      type: Monograph,
      imprintId: 'imprint-1',
      titles: [getDefaultTitle({ canonical: true, title: 'A Work' })],
    });
    const record = onixRecord({
      ref: 'pb',
      identifiers: isbn(ISBN_A),
      related:
        '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/work</IDValue></WorkIdentifier></RelatedWork>',
    }).replace(
      '</DescriptiveDetail>',
      `</DescriptiveDetail><CollateralDetail>${text('06', 'A review of the existing Work.')}<Prize><PrizeName>The Prize</PrizeName><PrizeCode>01</PrizeCode><PrizeRegion>GB-SCT</PrizeRegion></Prize></CollateralDetail>`,
    );
    const { sidecar } = await renderPanel({
      records: [record],
      lookup: exactLookup({ 'doi:https://doi.org/10.1234/work': ['w-1'] }, [existing]),
    });

    expect(sidecar.workGroups[0].target).toBe('EXISTING_WORK');
    expect(sidecar.reviewsPrizes?.actions[0].action).toBe('EXISTING_WORK_NOT_UPDATED');
    expect(
      within(card()).queryByRole('heading', { level: 4, name: /onixPlan\.review\.confirmation\.heading/ }),
    ).not.toBeInTheDocument();
    expect(within(card()).queryByRole('combobox')).not.toBeInTheDocument();
    expect(sidecar.blockers.map(({ code }) => code).filter((code) => code.startsWith('REVIEWS_PRIZES_'))).toEqual([]);
  });

  it('says nothing about reviews, endorsements or prizes for a file that states none', async () => {
    const { sidecar } = await renderPanel(
      { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) })] },
      { fileWorkType: Monograph },
    );

    expect(sidecar.reviewsPrizes?.actions).toEqual([expect.objectContaining({ target: 'WORK', action: 'PLANNED' })]);
    expect(primaryText(card())).not.toContain('reviewsPrizes');
  });
});

describe('OnixPlanResolution copy', () => {
  it.each(['en', 'de', 'es', 'pt'])('mirrors every review key of the English dictionary in %s', async (locale) => {
    type Labels = Record<string, unknown>;
    const load = async (language: string) =>
      ((await import(`@/src/shared/i18n/locales/${language}/common.json`)) as { onixPlan: { review: Labels } }).onixPlan
        .review;
    const keysOf = (labels: Labels, prefix = ''): string[] =>
      Object.entries(labels)
        .flatMap(([key, value]) =>
          typeof value === 'string' ? [`${prefix}${key}`] : keysOf(value as Labels, `${prefix}${key}.`),
        )
        .sort();
    const review = await load(locale);
    const english = await load('en');

    expect(keysOf(review)).toEqual(keysOf(english));
    // The copy contract (#262 K): result-oriented labels, no state narration, no internal vocabulary.
    const valuesOf = (labels: Labels): string[] =>
      Object.values(labels).flatMap((value) =>
        typeof value === 'string' ? [value.toLowerCase()] : valuesOf(value as Labels),
      );
    const flat = valuesOf(english).join('\n');
    [
      'nothing is selected',
      'chosen for this work',
      'cardinality',
      'representab',
      'immutable plan',
      'evidence only',
    ].forEach((phrase) => expect(flat).not.toContain(phrase));
    const decision = english.decision as Record<string, Record<string, string>>;
    expect(decision.workType.confirm).toContain('{{type}}');
    expect(decision.locale.confirm).toContain('{{locale}}');
    expect(decision.price.use).toContain('{{price}}');
  });
});
