import { parse } from '@5stones/onix';
import { ThemeProvider } from '@mui/material';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkEntity, WorkType } from '@/src/entities/work/model/work.types';
import { currencyOptions, languageOptions, licenseOptions, PublicationType, WorkTypes } from '@/src/shared/constants';
import type { ExtendedONIXMessageRoot } from '@/src/shared/parsers/XMLParser/interfaces';
import { reduceOnixAccessibility } from '@/src/shared/parsers/XMLParser/onixAccessibility';
import { reduceOnixCommercial } from '@/src/shared/parsers/XMLParser/onixCommercial';
import { reduceOnixComponents } from '@/src/shared/parsers/XMLParser/onixComponents';
import { reduceOnixDescriptive, suggestOnixWorkType } from '@/src/shared/parsers/XMLParser/onixDescriptive';
import { planOnixSource } from '@/src/shared/parsers/XMLParser/onixPlanning';
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
  ONIX_ACCESSIBILITY_OMIT,
  ONIX_COMPONENT_ACKNOWLEDGED,
  ONIX_RIGHTS_ACKNOWLEDGED,
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
};

/** The sidecar the resolver produces for a file and the publisher's decisions so far, exactly as XMLParse holds it. */
const sidecarFor = async (
  { records, header = GENERIC_HEADER, lookup = noMatches, accessibilityContactEmails }: FileSpec,
  inputs: Partial<OnixPlanInputs> = {},
) => {
  const message = parse(
    `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${header}${records.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(message);
  const targets = await resolveOnixTargets(sourcePlan, lookup, 'publisher-1');
  const commercial = reduceOnixCommercial(message, sourcePlan);
  const rights = reduceOnixRights(message, sourcePlan);

  return resolveOnixImportPlan({
    sourcePlan,
    targets,
    inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...inputs },
    imprints: IMPRINTS,
    descriptive: reduceOnixDescriptive(message, sourcePlan),
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
    serieses: [],
  }).sidecar;
};

type PanelOptions = {
  /** The non-binding WorkType suggestions XMLParse derives, by Work group key. */
  readonly suggestions?: Readonly<Record<string, WorkType>>;
};

/** Renders the panel for a file, and re-renders it for new decisions the way XMLParse resolves them again. */
const renderPanel = async (
  file: FileSpec,
  inputs: Partial<OnixPlanInputs> = {},
  { suggestions }: PanelOptions = {},
) => {
  const onChange = vi.fn<(inputs: OnixPlanInputs) => void>();
  const sidecar = await sidecarFor(file, inputs);
  const panel = (next: OnixImportPlanSidecar) => (
    <ThemeProvider theme={theme}>
      <OnixPlanResolution sidecar={next} workTypeSuggestions={suggestions} onChange={onChange} />
    </ThemeProvider>
  );
  const view = render(panel(sidecar));
  const decideAgain = async (next: Partial<OnixPlanInputs>) => view.rerender(panel(await sidecarFor(file, next)));

  return { onChange, sidecar, decideAgain };
};

const lastDecision = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.lastCall?.[0] as OnixPlanInputs;
/**
 * The values a select offers, in order. No option the panel renders is hidden, so the query skips the visibility walk
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

const workTypeControls = () => screen.queryAllByRole('combobox', { name: /^onixPlan\.workType\./ });

describe('OnixPlanResolution', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(cleanup);

  const paperback = { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) })] };

  it('asks a one-Work file for its WorkType once, with nothing preselected, and records the choice for that Work', async () => {
    const { onChange, sidecar, decideAgain } = await renderPanel(paperback);
    const [{ groupKey }] = sidecar.workGroups;

    // One Work, one decision: no file-level choice beside a duplicate per-Work one (#179 5699313101).
    expect(workTypeControls()).toHaveLength(1);
    const workType = screen.getByRole('combobox', { name: /^onixPlan\.workType\.workLabel/ });
    expect(workType).toHaveValue('');
    // A single Work may still be chosen as a book chapter, which then needs its parent.
    expect(optionValues(workType)).toEqual([
      '',
      Monograph,
      EditedBook,
      Textbook,
      WorkTypes.enum.JournalIssue,
      WorkTypes.enum.BookSet,
      BookChapter,
    ]);
    expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.blocked {"count":1}');
    expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent(
      'onixPlan.blocker.WORK_TYPE_INPUT_REQUIRED (onixPlan.classification.TARGET_INPUT_REQUIRED)',
    );

    await userEvent.selectOptions(workType, Textbook);
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      ...EMPTY_ONIX_PLAN_INPUTS,
      workTypeOverrides: { [groupKey]: Textbook },
    });

    await decideAgain(lastDecision(onChange));
    expect(workTypeControls()).toHaveLength(1);
    expect(screen.getByRole('combobox', { name: /^onixPlan\.workType\.workLabel/ })).toHaveValue(Textbook);
    expect(screen.getByTestId('onix-plan-group')).toHaveTextContent(
      'onixPlan.workType.TEXTBOOK (onixPlan.workTypeProvenance.USER_WORK_OVERRIDE)',
    );
    expect(screen.queryByTestId('onix-plan-blockers')).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /^onixPlan\.workType\.workLabel/ }), '');
    expect(lastDecision(onChange)).toEqual(EMPTY_ONIX_PLAN_INPUTS);
  });

  it("says the plan is ready in plain words, keeping each Work's identity evidence in its details", async () => {
    const [{ groupKey }] = (await sidecarFor(paperback)).workGroups;
    await renderPanel(paperback, { workTypeOverrides: { [groupKey]: Monograph } });

    expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.ready');
    expect(screen.queryByTestId('onix-plan-blockers')).not.toBeInTheDocument();

    const group = screen.getByTestId('onix-plan-group');
    expect(group).toHaveTextContent('onixPlan.workTarget.NEW_WORK');
    expect(group).toHaveTextContent('onixPlan.workType.MONOGRAPH (onixPlan.workTypeProvenance.USER_WORK_OVERRIDE)');
    expect(group).toHaveTextContent('1 (onixPlan.edition.DEFAULT_FIRST_EDITION)');
    const row = within(group).getByRole('row', { name: new RegExp(`pb ${ISBN_A} onixPlan.publicationType.PAPERBACK`) });
    // The normal action reads as what Thoth will do, never as planner evidence.
    expect(row).toHaveTextContent('onixPlan.productStatus.CREATE_PUBLICATION');
    expect(row).not.toHaveTextContent('onixPlan.productEvidence');
    expect(group).not.toHaveTextContent('onixPlan.workTarget.NEW_WORK (');
    // The exact identity evidence stays inspectable, in the Work's details.
    const evidence = within(group).getByTestId('onix-plan-evidence');
    expect(evidence.tagName).toBe('DETAILS');
    expect(evidence).toHaveTextContent('onixPlan.workEvidence.NO_TARGET_MATCH');
    expect(evidence).toHaveTextContent('onixPlan.productEvidence.NO_TARGET_MATCH');
  });

  it('offers several new Works one explicit choice for all, and a per-Work exception only where one is wanted', async () => {
    const twoWorks = {
      records: [
        onixRecord({ ref: 'pb1', identifiers: isbn(ISBN_A) }),
        onixRecord({ ref: 'pb2', identifiers: isbn(ISBN_B) }),
      ],
    };
    const { onChange, sidecar, decideAgain } = await renderPanel(twoWorks);
    const [, second] = sidecar.workGroups;

    // One explicit bulk control, naming how many Works it applies to; nothing preselected, no book chapter.
    expect(workTypeControls()).toHaveLength(1);
    const bulk = screen.getByRole('combobox', { name: 'onixPlan.workType.fileLabel {"count":2}' });
    expect(bulk).toHaveValue('');
    expect(optionValues(bulk)).not.toContain(BookChapter);

    await userEvent.selectOptions(bulk, Textbook);
    expect(lastDecision(onChange)).toEqual({ ...EMPTY_ONIX_PLAN_INPUTS, fileWorkType: Textbook });

    await decideAgain(lastDecision(onChange));
    // Works inheriting the bulk choice get no redundant control, only the offer of an exception.
    expect(workTypeControls()).toHaveLength(1);
    const groups = screen.getAllByTestId('onix-plan-group');
    groups.forEach((group) =>
      expect(group).toHaveTextContent('onixPlan.workType.TEXTBOOK (onixPlan.workTypeProvenance.USER_FILE_DEFAULT)'),
    );

    await userEvent.click(within(groups[1]).getByRole('button', { name: /^onixPlan\.workType\.exception/ }));
    expect(workTypeControls()).toHaveLength(2);
    const exception = within(groups[1]).getByRole('combobox', { name: /^onixPlan\.workType\.overrideLabel/ });
    expect(exception).toHaveValue('');
    expect(optionValues(exception)).toContain(BookChapter);

    await userEvent.selectOptions(exception, Monograph);
    expect(lastDecision(onChange)).toEqual({
      ...EMPTY_ONIX_PLAN_INPUTS,
      fileWorkType: Textbook,
      workTypeOverrides: { [second.groupKey]: Monograph },
    });

    await decideAgain(lastDecision(onChange));
    const [first, overridden] = screen.getAllByTestId('onix-plan-group');
    expect(first).toHaveTextContent('onixPlan.workType.TEXTBOOK (onixPlan.workTypeProvenance.USER_FILE_DEFAULT)');
    expect(overridden).toHaveTextContent(
      'onixPlan.workType.MONOGRAPH (onixPlan.workTypeProvenance.USER_WORK_OVERRIDE)',
    );
    expect(within(first).queryByRole('combobox')).not.toBeInTheDocument();

    // Taking the exception back returns the Work to the choice for all.
    await userEvent.selectOptions(
      within(overridden).getByRole('combobox', { name: /^onixPlan\.workType\.overrideLabel/ }),
      '',
    );
    expect(lastDecision(onChange)).toEqual({
      ...EMPTY_ONIX_PLAN_INPUTS,
      fileWorkType: Textbook,
      workTypeOverrides: {},
    });
  });

  it('shows a WorkType suggestion as evidence only: nothing is selected, recorded or unblocked by it', async () => {
    const [{ groupKey }] = (await sidecarFor(paperback)).workGroups;
    const { onChange, sidecar } = await renderPanel(paperback, {}, { suggestions: { [groupKey]: EditedBook } });

    const group = screen.getByTestId('onix-plan-group');
    expect(group).toHaveTextContent('onixPlan.workType.suggestion {"type":"onixPlan.workType.EDITED_BOOK"}');
    expect(screen.getByRole('combobox', { name: /^onixPlan\.workType\.workLabel/ })).toHaveValue('');
    expect(group).toHaveTextContent('onixPlan.group.undecided');
    expect(sidecar.workGroups[0].workType).toEqual({ status: 'UNRESOLVED' });
    expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent('onixPlan.blocker.WORK_TYPE_INPUT_REQUIRED');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reads a blocked plan in ordinary text, its severity said by a label and an icon rather than pale yellow', async () => {
    await renderPanel(paperback);

    const status = screen.getByTestId('onix-plan-status');
    const colours = declaredTextColours(within(status).getByText(/^onixPlan\.status\.blocked/), status);

    [theme.palette.warning.main.toLowerCase(), rgbOf(theme.palette.warning.main)].forEach((pale) =>
      expect(colours).not.toContain(pale),
    );
    expect(status).toHaveTextContent('onixPlan.severity.blocked');
    expect(status.querySelector('svg[data-testid="WarningAmberIcon"]')).not.toBeNull();
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

    const group = screen.getByTestId('onix-plan-group');
    expect(sidecar.products.map(({ omittable }) => omittable)).toEqual([false, false, false, false]);
    expect(within(group).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(group).queryByRole('option', { name: /omit/i })).not.toBeInTheDocument();
    expect(group).not.toHaveTextContent('onixPlan.manifestation.acknowledge');
    expect(within(group).getAllByRole('row').slice(1)).toHaveLength(4);
    within(group)
      .getAllByRole('row')
      .slice(1)
      .forEach((row) => expect(row).toHaveTextContent('onixPlan.productStatus.CREATE_PUBLICATION'));
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

    expect(screen.getByTestId('onix-plan-group')).toHaveTextContent('onixPlan.manifestation.reason.KINDLE_FAMILY');
    const format = screen.getByRole('combobox', { name: 'onixPlan.manifestation.chooseLabel {"record":"kindle"}' });
    expect(optionValues(format)).toEqual(['', PublicationType.enum.Mobi, PublicationType.enum.Azw3, 'OMIT']);
    expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent('onixPlan.blocker.MANIFESTATION_INPUT_REQUIRED');

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
    const { onChange, sidecar, decideAgain } = await renderPanel(box, { fileWorkType: WorkTypes.enum.BookSet });
    const [{ productKey }] = sidecar.products;

    expect(screen.getByTestId('onix-plan-group')).toHaveTextContent('onixPlan.manifestation.loss.PACKAGE');
    const acknowledgement = screen.getByRole('checkbox', {
      name: 'onixPlan.manifestation.acknowledge {"record":"box"}',
    });
    expect(acknowledgement).not.toBeChecked();
    expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent(
      'onixPlan.blocker.MANIFESTATION_ACKNOWLEDGEMENT_REQUIRED',
    );

    await userEvent.click(acknowledgement);
    expect(lastDecision(onChange).manifestationChoices).toEqual({ [productKey]: 'OMIT' });

    await decideAgain(lastDecision(onChange));
    expect(screen.getByRole('checkbox', { name: 'onixPlan.manifestation.acknowledge {"record":"box"}' })).toBeChecked();
    expect(screen.queryByTestId('onix-plan-blockers')).not.toBeInTheDocument();
    expect(screen.getByTestId('onix-plan-group')).toHaveTextContent('onixPlan.productStatus.OMIT/EXCLUDED');

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'onixPlan.manifestation.acknowledge {"record":"box"}' }),
    );
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
    expect(screen.queryByRole('textbox', { name: /^onixPlan\.edition\.inputLabel/ })).not.toBeInTheDocument();
    cleanup();

    const { onChange, sidecar } = await renderPanel(revised, { fileWorkType: Monograph });
    const [{ groupKey }] = sidecar.workGroups;
    const edition = screen.getByRole('textbox', { name: /^onixPlan\.edition\.inputLabel/ });
    expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent('onixPlan.blocker.EDITION_INPUT_REQUIRED');

    await userEvent.type(edition, '0');
    expect(lastDecision(onChange).editionInputs).toEqual({});
    expect(screen.getByText('onixPlan.edition.invalid')).toBeInTheDocument();

    await userEvent.clear(edition);
    await userEvent.type(edition, '2');
    expect(lastDecision(onChange).editionInputs).toEqual({ [groupKey]: 2 });
    expect(screen.queryByText('onixPlan.edition.invalid')).not.toBeInTheDocument();
  });

  it('lets the publisher leave out a record Thoth cannot apply, showing why the file sent it, and never offers that for a test record', async () => {
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

    const records = screen.getByTestId('onix-plan-records');
    expect(records).toHaveTextContent('b: onixPlan.disposition.DELETE {"code":"05"}');
    expect(records).toHaveTextContent('onixPlan.records.deletionText: Sent in error');
    expect(records).toHaveTextContent('t: onixPlan.disposition.TEST {"code":"88"}');
    expect(within(records).getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent('onixPlan.blocker.RECORD_NOT_COMPLETE');

    await userEvent.click(within(records).getByRole('checkbox', { name: 'onixPlan.records.exclude {"record":"b"}' }));

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

    expect(screen.getByText('onixPlan.compatibility.unverified')).toBeInTheDocument();
    const confirmation = screen.getByRole('checkbox', { name: 'onixPlan.compatibility.confirm' });
    expect(confirmation).not.toBeChecked();
    expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent(
      'onixPlan.blocker.THOTH_COMPATIBILITY_CONFIRMATION_REQUIRED',
    );

    await userEvent.click(confirmation);
    expect(lastDecision(onChange)).toEqual({
      ...EMPTY_ONIX_PLAN_INPUTS,
      fileWorkType: EditedBook,
      thothCompatibilityConfirmed: true,
    });

    cleanup();
    await renderPanel(paperback, { fileWorkType: Monograph });
    expect(screen.queryByRole('checkbox', { name: 'onixPlan.compatibility.confirm' })).not.toBeInTheDocument();
  });

  it('shows an attachment to an existing Work as planned but not available yet, and lets that Product create no Publication', async () => {
    const WORK_DOI = 'https://doi.org/10.1234/work';
    // The existing Work agrees with everything the record says about it, so only the attachment itself waits.
    const existing = getDefaultWork({
      id: 'w-1',
      doi: WORK_DOI,
      type: EditedBook,
      imprintId: 'imprint-1',
      titles: [getDefaultTitle({ canonical: true, title: 'A Work', fullTitle: 'A Work' })],
      publications: [getDefaultPublication({ id: 'p-1', type: PublicationType.enum.Paperback, isbn: ISBN_B })],
    });
    const file = {
      records: [
        onixRecord({
          ref: 'pdf',
          identifiers: isbn(ISBN_A),
          descriptive: '<ProductForm>EB</ProductForm><ProductFormDetail>E107</ProductFormDetail>',
          related:
            '<RelatedWork><WorkRelationCode>01</WorkRelationCode><WorkIdentifier><WorkIDType>06</WorkIDType><IDValue>10.1234/work</IDValue></WorkIdentifier></RelatedWork>',
        }),
      ],
      lookup: exactLookup({ 'doi:https://doi.org/10.1234/work': ['w-1'] }, [existing]),
    };
    const [{ groupKey }] = (await sidecarFor(file)).workGroups;
    const { onChange, sidecar } = await renderPanel(file, {}, { suggestions: { [groupKey]: Monograph } });
    const [{ productKey }] = sidecar.products;

    const group = screen.getByTestId('onix-plan-group');
    expect(group).toHaveTextContent('onixPlan.workTarget.EXISTING_WORK');
    expect(within(group).getByTestId('onix-plan-evidence')).toHaveTextContent('onixPlan.workEvidence.WORK_DOI');
    expect(group).toHaveTextContent('onixPlan.workType.EDITED_BOOK (onixPlan.workTypeProvenance.EXISTING_TARGET)');
    expect(group).toHaveTextContent('onixPlan.productStatus.CREATE_PUBLICATION_ON_EXISTING_WORK');
    // Nothing about an existing Work is chosen or suggested here: neither its WorkType nor the file's.
    expect(screen.queryByRole('combobox', { name: /^onixPlan\.workType\./ })).not.toBeInTheDocument();
    expect(group).not.toHaveTextContent('onixPlan.workType.suggestion');
    expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent(
      'onixPlan.blocker.ATTACH_TO_EXISTING_WORK_DEFERRED (onixPlan.classification.EXECUTION_DEFERRED)',
    );
    expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.blocked {"count":1}');

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'onixPlan.manifestation.acknowledge {"record":"pdf"}' }),
    );
    expect(lastDecision(onChange).manifestationChoices).toEqual({ [productKey]: 'OMIT' });
  });

  it('shows an attachment whose Work-level compatibility is unverified as undecided, and says which task owns it', async () => {
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

    const group = screen.getByTestId('onix-plan-group');
    expect(group).toHaveTextContent('onixPlan.workTarget.EXISTING_WORK');
    expect(within(group).getByTestId('onix-plan-evidence')).toHaveTextContent('onixPlan.workEvidence.WORK_DOI');
    // The panel renders the state the resolver decided; it never decides compatibility itself.
    expect(group).toHaveTextContent('onixPlan.productStatus.BLOCKED');
    const blockers = screen.getByTestId('onix-plan-blockers');
    expect(blockers).toHaveTextContent(
      'onixPlan.blocker.EXISTING_WORK_COMPATIBILITY_UNVERIFIED (onixPlan.classification.PREFLIGHT_GAP)',
    );
    expect(blockers).toHaveTextContent('family: TITLE');
    expect(blockers).toHaveTextContent('owner: APP-IMPORT-ONIX-DESC-01');
    expect(blockers).toHaveTextContent('ownerIssue: #183');
    expect(blockers).toHaveTextContent('/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]/TitleDetail[1]');
    expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.blocked {"count":1}');
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

      expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent(
        'onixPlan.blocker.DESCRIPTIVE_CHOICE_REQUIRED (onixPlan.classification.TARGET_INPUT_REQUIRED)',
      );
      const question = screen.getByTestId('onix-plan-descriptive-question');
      expect(question).toHaveTextContent(finding.message);
      const status = within(question).getByRole('combobox', { name: /^onixPlan\.descriptive\.chooseLabel/ });
      expect(status).toHaveValue('');
      expect(optionValues(status)).toEqual([
        '',
        ...(finding.resolution.kind === 'CHOICE' ? finding.resolution.options.map(({ key }) => key) : []),
      ]);

      await userEvent.selectOptions(status, 'FORTHCOMING');
      expect(lastDecision(onChange)).toEqual({
        ...EMPTY_ONIX_PLAN_INPUTS,
        fileWorkType: Monograph,
        descriptiveChoices: { [finding.key]: 'FORTHCOMING' },
      });

      // Answered, the question no longer blocks, and stays on screen so the answer can be changed.
      await decideAgain(lastDecision(onChange));
      expect(screen.queryByTestId('onix-plan-blockers')).not.toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /^onixPlan\.descriptive\.chooseLabel/ })).toHaveValue('FORTHCOMING');

      await userEvent.selectOptions(screen.getByRole('combobox', { name: /^onixPlan\.descriptive\.chooseLabel/ }), '');
      expect(lastDecision(onChange).descriptiveChoices).toEqual({});
    });

    it('records the consent an omission needs, and lets it be taken back', async () => {
      const file = { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), descriptive: corporate })] };
      const { onChange, sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const [finding] = sidecar.descriptive.findings.filter(({ code }) => code === 'CONTRIBUTOR_AGENT_UNREPRESENTABLE');

      const consent = screen.getByRole('checkbox', { name: /^onixPlan\.descriptive\.acknowledge/ });
      expect(consent).not.toBeChecked();

      await userEvent.click(consent);
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: 'ACKNOWLEDGED' });

      await decideAgain(lastDecision(onChange));
      expect(screen.getByRole('checkbox', { name: /^onixPlan\.descriptive\.acknowledge/ })).toBeChecked();

      await userEvent.click(screen.getByRole('checkbox', { name: /^onixPlan\.descriptive\.acknowledge/ }));
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

      expect(finding.resolution).toEqual({ kind: 'INPUT', input: 'DATE' });
      const question = screen.getByTestId('onix-plan-descriptive-question');
      const date = within(question).getByLabelText(/^onixPlan\.descriptive\.dateLabel/);
      expect(date).toHaveAttribute('type', 'date');
      expect(date).toHaveValue('');

      fireEvent.change(date, { target: { value: '2024-03-15' } });
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: '2024-03-15' });

      await decideAgain(lastDecision(onChange));
      expect(screen.queryByTestId('onix-plan-blockers')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/^onixPlan\.descriptive\.dateLabel/)).toHaveValue('2024-03-15');

      // A stored day that does not exist answers nothing: the question says so, and the plan still waits.
      await decideAgain({ ...lastDecision(onChange), descriptiveChoices: { [finding.key]: '2024-02-30' } });
      expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent('finding: LIFECYCLE_DATE_REQUIRED');
      expect(screen.getByTestId('onix-plan-descriptive-question')).toHaveTextContent('onixPlan.descriptive.invalid');
      expect(screen.getByLabelText(/^onixPlan\.descriptive\.dateLabel/)).toHaveAccessibleDescription(
        `${finding.message} onixPlan.descriptive.invalid`,
      );

      fireEvent.change(screen.getByLabelText(/^onixPlan\.descriptive\.dateLabel/), { target: { value: '' } });
      expect(lastDecision(onChange).descriptiveChoices).toEqual({});
    });

    it('takes a title locale the file does not state from Thoth locales, preselecting none', async () => {
      const untagged =
        '<ProductForm>BC</ProductForm><TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Cities</TitleText></TitleElement></TitleDetail>';
      const file = { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), descriptive: untagged })] };
      const { onChange, sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const [finding] = sidecar.descriptive.findings.filter(({ code }) => code === 'TITLE_LOCALE_UNRESOLVED');

      expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent(
        'onixPlan.blocker.DESCRIPTIVE_INPUT_REQUIRED (onixPlan.classification.TARGET_INPUT_REQUIRED)',
      );
      const locale = within(screen.getByTestId('onix-plan-descriptive-question')).getByRole('combobox', {
        name: /^onixPlan\.descriptive\.localeLabel/,
      });
      const values = optionValues(locale);
      expect(locale).toHaveValue('');
      expect(values[0]).toBe('');
      expect(values).toEqual(expect.arrayContaining(['EN', 'EN_GB', 'FR', 'ZH_HANS']));

      await userEvent.selectOptions(locale, 'FR');
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: 'FR' });

      await decideAgain(lastDecision(onChange));
      expect(screen.queryByTestId('onix-plan-blockers')).not.toBeInTheDocument();
    });

    it('takes text the file does not give, and treats an entry of nothing but spaces as no answer', async () => {
      const unnamed =
        '<ProductForm>BC</ProductForm><Contributor><ContributorRole>A01</ContributorRole><PersonName>A N Other</PersonName></Contributor>';
      const file = { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), descriptive: unnamed })] };
      const { onChange, sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const [finding] = sidecar.descriptive.findings.filter(({ code }) => code === 'CONTRIBUTOR_NAME_REQUIRED');
      const surname = () =>
        within(screen.getByTestId('onix-plan-descriptive-question')).getByRole('textbox', {
          name: /^onixPlan\.descriptive\.textLabel/,
        });

      await userEvent.type(surname(), 'Other');
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: 'Other' });

      await decideAgain(lastDecision(onChange));
      expect(screen.queryByTestId('onix-plan-blockers')).not.toBeInTheDocument();

      await userEvent.clear(surname());
      expect(lastDecision(onChange).descriptiveChoices).toEqual({});

      await userEvent.type(surname(), '   ');
      await decideAgain(lastDecision(onChange));
      expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent('finding: CONTRIBUTOR_NAME_REQUIRED');
    });

    it('asks about a credited external front cover as one informed decision - its exact URL or none - showing the credit and the hosting it cannot keep (PR #220 review CR-1, CR-2)', async () => {
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
      const { onChange, sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const [decision] = sidecar.descriptive.findings.filter(({ code }) => code === 'COVER_CHOICE_REQUIRED');
      const question = screen.getByTestId('onix-plan-descriptive-question');
      const cover = within(question).getByRole('combobox', { name: /^onixPlan\.descriptive\.chooseLabel/ });

      // The one question, in the panel's own words: the exact credit and the download-and-host semantic are shown.
      expect(screen.getAllByTestId('onix-plan-descriptive-question')).toHaveLength(1);
      expect(question).toHaveTextContent('onixPlan.descriptive.family.COVER');
      expect(question).toHaveTextContent(`"${CREDIT}"`);
      expect(question).toHaveTextContent(/download and host/);
      expect(cover).toHaveAccessibleDescription(decision.message);
      // Nothing starts chosen: the exact URL, or none.
      expect(cover).toHaveValue('');
      expect(optionValues(cover)).toEqual(['', COVER, 'OMIT']);
      expect(
        within(cover).getByRole('option', { name: 'onixPlan.descriptive.option.OMIT {"label":"OMIT"}' }),
      ).toBeTruthy();

      await userEvent.selectOptions(cover, COVER);
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [decision.key]: COVER });

      await decideAgain(lastDecision(onChange));
      expect(screen.queryByTestId('onix-plan-blockers')).not.toBeInTheDocument();

      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: /^onixPlan\.descriptive\.chooseLabel/ }),
        'OMIT',
      );
      expect(lastDecision(onChange).descriptiveChoices).toEqual({ [decision.key]: 'OMIT' });

      // An answer the decision does not offer decides nothing: the plan waits on the same question.
      await decideAgain({ ...lastDecision(onChange), descriptiveChoices: { [decision.key]: `${COVER}?v=2` } });
      expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent('finding: COVER_CHOICE_REQUIRED');
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.blocked {"count":1}');
    });

    it('offers no control for a finding nothing in the app can answer, and names what blocks', async () => {
      // A declared ORCID Thoth cannot read is the file's to correct (5562159621 rule 79): no fallback is offered.
      const invalidOrcid =
        '<ProductForm>BC</ProductForm><Contributor><ContributorRole>A01</ContributorRole><NameIdentifier><NameIDType>21</NameIDType><IDValue>not-an-orcid</IDValue></NameIdentifier>' +
        '<PersonName>Ada Lovelace</PersonName><NamesBeforeKey>Ada</NamesBeforeKey><KeyNames>Lovelace</KeyNames></Contributor>';
      await renderPanel(
        { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), descriptive: invalidOrcid })] },
        { fileWorkType: Monograph },
      );

      expect(screen.queryByTestId('onix-plan-descriptive')).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent('onixPlan.blocker.DESCRIPTIVE_INPUT_REQUIRED');
      expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent('finding: CONTRIBUTOR_ORCID_INVALID');
      // Nothing here answers it, so it is a problem to read about in plain words, not only a technical detail.
      expect(screen.getByTestId('onix-plan-problems')).toHaveTextContent('onixPlan.blocker.DESCRIPTIVE_INPUT_REQUIRED');
    });

    describe('Work-level decisions of grouped manifestations (#209 F, G)', () => {
      const SAS = 'School of Advanced Study, University of London (United Kingdom)';
      const locations = [1, 2, 3, 4].map((product) => {
        const path = `/ONIXMessage[1]/Product[${product}]/DescriptiveDetail[1]/Contributor[1]/ProfessionalAffiliation[1]`;

        return { path, sourcePath: path };
      });

      /** The plan a resolved UoLP-shaped file hands the panel: one Work-level institution decision for four Products. */
      const withInstitutionDecision = async (options: readonly { key: string; label: string }[], answer?: string) => {
        const base = await sidecarFor(paperback, { workTypeOverrides: {} });
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
        };
        const onChange = vi.fn<(inputs: OnixPlanInputs) => void>();

        render(
          <ThemeProvider theme={theme}>
            <OnixPlanResolution sidecar={sidecar} onChange={onChange} />
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

        const questions = screen.getAllByTestId('onix-plan-descriptive-question');
        expect(questions).toHaveLength(1);
        const [question] = questions;
        const institution = within(question).getByRole('combobox', {
          name: /^onixPlan\.descriptive\.institutionLabel/,
        });
        expect(institution).toHaveValue('');
        // Several decisions can share a label; each control is described by its own question, for every reader.
        expect(institution).toHaveAccessibleDescription(finding.message);
        expect(optionValues(institution)).toEqual(['', 'institution-sas', 'institution-uol', 'OMIT']);
        expect(
          within(question).getByRole('group', { name: 'onixPlan.descriptive.institutionSuggestionGroup' }),
        ).toBeInTheDocument();
        expect(
          within(institution).getByRole('option', { name: 'onixPlan.descriptive.option.NO_AFFILIATION' }),
        ).toHaveValue('OMIT');
        expect(question).toHaveTextContent('onixPlan.descriptive.institutionSuggestions {"count":2}');
        // The decision is asked once for the Work, and still names every Product's source location.
        const where = within(question).getByTestId('onix-plan-descriptive-locations');
        expect(where.tagName).toBe('DETAILS');
        locations.forEach(({ sourcePath }) => expect(where).toHaveTextContent(sourcePath));
        // It is a decision above, never repeated as a problem to read about.
        expect(screen.queryByTestId('onix-plan-problems')).not.toBeInTheDocument();
        expect(onChange).not.toHaveBeenCalled();

        await userEvent.selectOptions(institution, 'institution-uol');
        expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: 'institution-uol' });

        await userEvent.selectOptions(institution, 'OMIT');
        expect(lastDecision(onChange).descriptiveChoices).toEqual({ [finding.key]: 'OMIT' });
      });

      it('says so when no Thoth institution name matches, leaving no affiliation as the one answer', async () => {
        await withInstitutionDecision([{ key: 'OMIT', label: SAS }]);

        const question = screen.getByTestId('onix-plan-descriptive-question');
        expect(question).toHaveTextContent('onixPlan.descriptive.institutionNoSuggestions');
        expect(
          optionValues(within(question).getByRole('combobox', { name: /^onixPlan\.descriptive\.institutionLabel/ })),
        ).toEqual(['', 'OMIT']);
      });
    });
  });

  /**
   * #209 H: what the publisher sees for the University of London Press shape - one Work in four manifestations that
   * restate two editors with locale-less biographies and name-only affiliations, a funder named without an identifier
   * and an unnumbered Series - planned by the real planner, reductions, adapter and resolver, synthetic and minimal.
   */
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
    const paperback = onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), related });
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
            paperback,
            epub(
              '<EpubTechnicalProtection>00</EpubTechnicalProtection>' +
                licence(['01', 'https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode']),
            ),
          ],
        },
        { fileWorkType: Monograph },
      );

      expect(within(screen.getByTestId('onix-plan-group')).getByTestId('onix-plan-licence')).toHaveTextContent(
        'CC BY-NC-ND 4.0',
      );
      expect(screen.queryByTestId('onix-plan-rights')).not.toBeInTheDocument();
      expect(screen.queryByTestId('onix-plan-blockers')).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.ready');
    });

    it('says a new Work gets no licence where none is stated, and none decided where the rights leave it open', async () => {
      await renderPanel({ records: [paperback] }, { fileWorkType: Monograph });
      expect(screen.getByTestId('onix-plan-licence')).toHaveTextContent('onixPlan.licence.none');
      cleanup();

      await renderPanel(
        { records: [paperback, epub(licence(['01', 'https://publisher.example/eula']))] },
        { fileWorkType: Monograph },
      );
      expect(screen.getByTestId('onix-plan-licence')).toHaveTextContent('onixPlan.licence.blocked');
    });

    it('explains each rights fact that blocks the import or goes unrecorded, and offers a control only for the one whose omission may be acknowledged (#217)', async () => {
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
      const section = screen.getByTestId('onix-plan-rights');
      const entries = within(section).getAllByTestId('onix-plan-rights-finding');

      expect(findings.map(({ code, blocking }) => [code, blocking])).toEqual([
        ['RIGHTS_POLICY_NOT_REPRESENTED', false],
        ['RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE', true],
      ]);
      expect(entries).toHaveLength(2);
      entries.forEach((entry, index) => {
        expect(entry).toHaveTextContent(findings[index].message);
        expect(entry).toHaveTextContent(
          findings[index].blocking ? 'onixPlan.rights.blocking' : 'onixPlan.rights.notRecorded',
        );
      });
      // The technical protection may be acknowledged as omitted (thoth-app#217); the policy link offers nothing to
      // answer, and neither is a problem to read about while its control is the question.
      expect(within(section).getAllByRole('checkbox')).toHaveLength(1);
      expect(within(screen.getByTestId('onix-plan-rights-LICENCE')).queryByRole('checkbox')).not.toBeInTheDocument();
      expect(
        within(screen.getByTestId('onix-plan-rights-TECHNICAL_PROTECTION')).getByRole('checkbox'),
      ).not.toBeChecked();
      expect(within(section).queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByTestId('onix-plan-problems')).not.toBeInTheDocument();
      // Technical protection alone keeps no licence from being the Work's: it blocks the plan by its own finding.
      expect(screen.getByTestId('onix-plan-licence')).toHaveTextContent('CC BY 4.0');
    });

    it('explains the rights that hold back an existing Work as well, and shows it no licence', async () => {
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
      const entries = within(screen.getByTestId('onix-plan-rights')).getAllByTestId('onix-plan-rights-finding');

      expect(sidecar.workGroups[0].target).toBe('EXISTING_WORK');
      expect(sidecar.products[0].action).toBe('ALREADY_PRESENT');
      expect(finding.code).toBe('RIGHTS_SCOPE_DEFERRED');
      expect(entries).toHaveLength(1);
      expect(entries[0]).toHaveTextContent(finding.message);
      expect(entries[0]).toHaveTextContent('onixPlan.rights.blocking');
      expect(screen.getByTestId('onix-plan-problems')).toHaveTextContent('onixPlan.blocker.RIGHTS_PREFLIGHT_GAP');
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.blocked {"count":1}');
      // An existing Work's licence is never this import's to set, so no licence is shown for it.
      expect(screen.queryByTestId('onix-plan-licence')).not.toBeInTheDocument();
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

    it('asks for the price the file leaves to the publisher - one of the prices it states, or none - chooses nothing, and binds the answer', async () => {
      const { sidecar, onChange, decideAgain } = await renderPanel(
        { records: [supplied(gbp('20.00') + gbp('22.00'))] },
        { fileWorkType: Monograph },
      );
      const findings = sidecar.commercial?.findings ?? [];
      const [conflict] = findings;
      const candidates = conflict.resolution.kind === 'PRICE_CHOICE' ? conflict.resolution.candidates : [];
      const section = screen.getByTestId('onix-plan-commercial');
      const [question] = within(section).getAllByTestId('onix-plan-commercial-question');
      const priceSelect = () => screen.getByRole('combobox', { name: /^onixPlan\.commercial\.priceLabel/ });

      expect(findings.map(({ code, blocking: blocks }) => [code, blocks])).toEqual([
        ['PRICE_AMOUNT_CONFLICT', true],
        ['SUPPLY_NOT_REPRESENTED', false],
      ]);
      // The decision explains itself in the planner's words, offers exactly the file's prices and no price, and starts
      // unanswered - and, with no automatic price to keep, holds the plan until it is answered.
      expect(question).toHaveTextContent(conflict.message);
      expect(priceSelect()).toHaveValue('');
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.blocked');
      expect(
        within(priceSelect()).getByRole('option', { name: 'onixPlan.commercial.choosePrice', hidden: true }),
      ).toHaveValue('');
      expect(optionValues(priceSelect())).toEqual(['', ...candidates.map(({ key }) => key), 'OMIT']);
      expect(
        within(priceSelect()).getByRole('option', { name: candidates[1].label, hidden: true }),
      ).toBeInTheDocument();
      expect(
        within(priceSelect()).getByRole('option', { name: 'onixPlan.commercial.omitPrice', hidden: true }),
      ).toBeInTheDocument();
      // A question the panel asks is no problem to read about; what Thoth does not record stays counted in the details.
      expect(screen.queryByTestId('onix-plan-problems')).not.toBeInTheDocument();
      expect(within(section).getByTestId('onix-plan-commercial-disclosures')).toHaveTextContent(
        'onixPlan.commercial.disclosures {"count":1}',
      );

      await userEvent.selectOptions(priceSelect(), candidates[1].key);
      expect(lastDecision(onChange)).toEqual({
        ...sidecar.inputs,
        commercialChoices: { [conflict.key]: candidates[1].key },
      });

      // Answered, the question stays with its answer so it can change - to no price, or back to unanswered.
      await decideAgain({ fileWorkType: Monograph, commercialChoices: { [conflict.key]: candidates[1].key } });
      expect(priceSelect()).toHaveValue(candidates[1].key);
      expect(screen.queryByTestId('onix-plan-problems')).not.toBeInTheDocument();
      await userEvent.selectOptions(priceSelect(), 'OMIT');
      expect(lastDecision(onChange).commercialChoices).toEqual({ [conflict.key]: 'OMIT' });
      await userEvent.selectOptions(priceSelect(), '');
      expect(lastDecision(onChange).commercialChoices).toEqual({});
    });

    it('offers the price the file lets the publisher change - the automatic price, an alternative, or none - without holding the import back (Specification Amendment 2B)', async () => {
      const { sidecar, onChange, decideAgain } = await renderPanel(
        { records: [supplied(gbp('20.00') + qualifiedGbp('60.00'))] },
        { fileWorkType: Monograph },
      );
      const automatic = (sidecar.commercial?.findings ?? []).find(({ code }) => code === 'PRICE_REDUCED');
      const candidates = automatic?.resolution.kind === 'PRICE_OVERRIDE' ? automatic.resolution.candidates : [];
      const override = () => screen.getByRole('combobox', { name: /^onixPlan\.commercial\.overrideLabel/ });

      // Unanswered, the automatic price stands: the plan is ready, and the choice is visible all the same.
      expect(sidecar.executable).toBe(true);
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.ready');
      expect(
        within(screen.getByTestId('onix-plan-commercial')).getByTestId('onix-plan-commercial-question'),
      ).toHaveTextContent(automatic?.message ?? '');
      expect(override()).toHaveValue('');
      expect(optionValues(override())).toEqual(['', candidates[0].key, 'OMIT']);
      expect(
        within(override()).getByRole('option', {
          name: 'onixPlan.commercial.keepDefault {"currency":"GBP","amount":"20"}',
          hidden: true,
        }),
      ).toHaveValue('');
      expect(within(override()).getByRole('option', { name: candidates[0].label, hidden: true })).toBeInTheDocument();
      expect(screen.queryByTestId('onix-plan-problems')).not.toBeInTheDocument();

      // Each answer is handed on as an input, for the plan to be resolved again from it.
      await userEvent.selectOptions(override(), candidates[0].key);
      expect(lastDecision(onChange)).toEqual({
        ...sidecar.inputs,
        commercialChoices: { [automatic?.key ?? '']: candidates[0].key },
      });
      await decideAgain({ fileWorkType: Monograph, commercialChoices: { [automatic?.key ?? '']: candidates[0].key } });
      expect(override()).toHaveValue(candidates[0].key);
      await userEvent.selectOptions(override(), 'OMIT');
      expect(lastDecision(onChange).commercialChoices).toEqual({ [automatic?.key ?? '']: 'OMIT' });
      await userEvent.selectOptions(override(), '');
      expect(lastDecision(onChange).commercialChoices).toEqual({});
    });

    it('marks an answer the file no longer offers, shows it as the answer given, and the plan waits until it is corrected or cleared', async () => {
      const { sidecar } = await renderPanel(
        { records: [supplied(gbp('20.00') + qualifiedGbp('60.00'))] },
        {
          fileWorkType: Monograph,
        },
      );
      const automatic = (sidecar.commercial?.findings ?? []).find(({ code }) => code === 'PRICE_REDUCED');
      const candidates = automatic?.resolution.kind === 'PRICE_OVERRIDE' ? automatic.resolution.candidates : [];
      const staleAnswer = '/ONIXMessage[1]/Product[9]/Price[1]';

      cleanup();
      const { onChange } = await renderPanel(
        { records: [supplied(gbp('20.00') + qualifiedGbp('60.00'))] },
        {
          fileWorkType: Monograph,
          commercialChoices: { [automatic?.key ?? '']: staleAnswer },
        },
      );
      const override = () => screen.getByRole('combobox', { name: /^onixPlan\.commercial\.overrideLabel/ });

      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.blocked');
      expect(screen.getByTestId('onix-plan-commercial-question')).toHaveTextContent('onixPlan.commercial.staleChoice');
      // The control shows the answer given - never the automatic price, which does not stand in for it - and offers it
      // for nothing but clearing or replacing.
      expect(override()).toHaveValue(staleAnswer);
      expect(
        within(override()).getByRole('option', {
          name: `onixPlan.commercial.staleAnswer {"answer":"${staleAnswer}"}`,
          hidden: true,
        }),
      ).toBeDisabled();
      expect(optionValues(override())).toEqual([staleAnswer, '', candidates[0].key, 'OMIT']);

      // Cleared in one step, the answer is gone and the automatic price stands again.
      await userEvent.selectOptions(override(), '');
      expect(lastDecision(onChange).commercialChoices).toEqual({});
    });

    it('explains a commercial fact that holds a Publication back but nothing in the app answers, and offers no control for it', async () => {
      const { sidecar } = await renderPanel({ records: [supplied(gbp('abc'))] }, { fileWorkType: Monograph });
      const findings = sidecar.commercial?.findings ?? [];
      const section = screen.getByTestId('onix-plan-commercial');
      const entries = within(section).getAllByTestId('onix-plan-commercial-finding');
      const disclosures = within(section).getByTestId('onix-plan-commercial-disclosures');

      expect(findings.map(({ code, blocking: blocks }) => [code, blocks])).toEqual([
        ['PRICE_AMOUNT_UNUSABLE', true],
        ['SUPPLY_NOT_REPRESENTED', false],
      ]);
      // What holds the Publication back is shown open; what Thoth does not record is kept, and counted, in its details.
      expect(entries.filter((entry) => !disclosures.contains(entry))).toHaveLength(1);
      expect(entries[0]).toHaveTextContent('onixPlan.commercial.blocking');
      expect(entries[0]).toHaveTextContent(findings[0].message);
      expect(within(disclosures).getAllByTestId('onix-plan-commercial-finding')[0]).toHaveTextContent(
        'onixPlan.commercial.notRecorded',
      );
      expect(within(section).queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-problems')).toHaveTextContent('onixPlan.blocker.COMMERCIAL_PREFLIGHT_GAP');
    });

    it('shows a Publication left out as held back by nothing, and no section for a file that states no ProductSupply', async () => {
      const { onChange } = await renderPanel(
        { records: [supplied(gbp('20.00') + gbp('22.00'), '<ProductForm>BA</ProductForm>')] },
        { fileWorkType: Monograph, manifestationChoices: { [`product:gtin13:${ISBN_A}`]: 'OMIT' } },
      );
      const section = screen.getByTestId('onix-plan-commercial');

      expect(onChange).not.toHaveBeenCalled();
      expect(within(section).queryByText(/onixPlan\.commercial\.blocking/)).not.toBeInTheDocument();
      // Nothing about its prices is asked either.
      expect(within(section).queryByRole('combobox')).not.toBeInTheDocument();
      expect(within(section).getByTestId('onix-plan-commercial-disclosures')).toHaveTextContent(
        'onixPlan.commercial.disclosures {"count":2}',
      );
      expect(screen.queryByTestId('onix-plan-problems')).not.toBeInTheDocument();
      cleanup();

      await renderPanel(
        { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) })] },
        { fileWorkType: Monograph },
      );
      expect(screen.queryByTestId('onix-plan-commercial')).not.toBeInTheDocument();
    });

    it.each(['en', 'de', 'es', 'pt'])('says every commercial label and blocker in %s', async (locale) => {
      const { onixPlan } = (await import(`@/src/shared/i18n/locales/${locale}/common.json`)) as {
        onixPlan: { commercial?: Record<string, string>; blocker: Record<string, string> };
      };

      expect(Object.keys(onixPlan.commercial ?? {}).sort()).toEqual(
        [
          'blocking',
          'choosePrice',
          'disclosures_one',
          'disclosures_other',
          'heading',
          'keepDefault',
          'notRecorded',
          'omitPrice',
          'overrideLabel',
          'priceLabel',
          'staleAnswer',
          'staleChoice',
        ].sort(),
      );
      expect(onixPlan.commercial?.disclosures_other).toContain('{{count}}');
      expect(onixPlan.commercial?.staleAnswer).toContain('{{answer}}');
      expect(onixPlan.commercial?.priceLabel).toContain('{{scope}}');
      expect(onixPlan.commercial?.overrideLabel).toContain('{{scope}}');
      expect(onixPlan.commercial?.keepDefault).toContain('{{currency}}');
      expect(onixPlan.commercial?.keepDefault).toContain('{{amount}}');
      [
        'COMMERCIAL_INPUT_REQUIRED',
        'COMMERCIAL_UNREPRESENTABLE',
        'COMMERCIAL_PREFLIGHT_GAP',
        'COMMERCIAL_CHOICE_REQUIRED',
        'COMMERCIAL_CHOICE_STALE',
      ].forEach((code) => expect(onixPlan.blocker[code]?.length ?? 0).toBeGreaterThan(0));
    });
  });

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

      return {
        resolve,
        groupKey: group.groupKey,
        suggestions: { [group.groupKey]: suggestOnixWorkType(descriptive, group.groupKey) as WorkType },
      };
    };

    it('reads as one Work decided once: one WorkType control, no omissions, and each repeated decision asked once', async () => {
      const { resolve, suggestions } = await planningFor();
      const { sidecar } = resolve({});
      const onChange = vi.fn<(inputs: OnixPlanInputs) => void>();

      render(
        <ThemeProvider theme={theme}>
          <OnixPlanResolution sidecar={sidecar} workTypeSuggestions={suggestions} onChange={onChange} />
        </ThemeProvider>,
      );

      const group = screen.getByTestId('onix-plan-group');
      // One WorkType decision, suggested as an edited book and chosen by nobody.
      expect(workTypeControls()).toHaveLength(1);
      expect(screen.getByRole('combobox', { name: /^onixPlan\.workType\.workLabel/ })).toHaveValue('');
      expect(group).toHaveTextContent('onixPlan.workType.suggestion {"type":"onixPlan.workType.EDITED_BOOK"}');
      // Four Publications Thoth will create, said plainly, with nothing to leave out.
      expect(within(group).queryByRole('checkbox')).not.toBeInTheDocument();
      within(group)
        .getAllByRole('row')
        .slice(1)
        .forEach((row) => expect(row).toHaveTextContent('onixPlan.productStatus.CREATE_PUBLICATION'));
      // A small decision set - the Series, two biography locales, two affiliations, the funder - never four times over.
      const questions = screen.getAllByTestId('onix-plan-descriptive-question');
      expect(questions).toHaveLength(6);
      questions.forEach((question) =>
        expect(within(question).getByTestId('onix-plan-descriptive-locations')).toHaveTextContent(
          'onixPlan.descriptive.locations {"count":4}',
        ),
      );
      expect(screen.getAllByRole('combobox', { name: /^onixPlan\.descriptive\.localeLabel/ })).toHaveLength(2);
      const institutions = screen.getAllByRole('combobox', { name: /^onixPlan\.descriptive\.institutionLabel/ });
      expect(institutions.map((control) => optionValues(control))).toEqual([
        ['', 'institution-institute', 'institution-university', 'OMIT'],
        ['', 'institution-institute', 'institution-university', 'OMIT'],
        ['', 'institution-council', 'OMIT'],
      ]);
      institutions.forEach((control) => expect(control).toHaveValue(''));
      // Everything that waits is a decision above; nothing is left to read about as a problem.
      expect(screen.queryByTestId('onix-plan-problems')).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.blocked {"count":7}');
    });

    it('is ready to preview once each decision is answered in the panel, with no change to the file', async () => {
      const { resolve, groupKey } = await planningFor();
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
          <OnixPlanResolution sidecar={sidecar} onChange={vi.fn()} />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.ready');
      expect(screen.queryByTestId('onix-plan-blockers')).not.toBeInTheDocument();
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
    const status = '<PublishingStatus>02</PublishingStatus>';
    const acknowledgement = (name: RegExp) => screen.getByRole('checkbox', { name });
    const findingKey = (sidecar: OnixImportPlanSidecar, code: string) =>
      [...(sidecar.rights?.findings ?? []), ...(sidecar.salesRights?.findings ?? [])].find(
        (finding) => finding.code === code,
      )?.key as string;

    it('asks for a source-bound acknowledgement of technical protection, in its own section, and the plan is ready once it is given and blocked again once it is cleared', async () => {
      const file = { records: [epub('<EpubTechnicalProtection>03</EpubTechnicalProtection>' + licence(CC_BY))] };
      const { onChange, sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const key = findingKey(sidecar, 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE');
      const section = screen.getByTestId('onix-plan-rights');

      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.blocked');
      expect(within(section).getByTestId('onix-plan-rights-TECHNICAL_PROTECTION')).toHaveTextContent(
        sidecar.rights?.findings[0].message ?? '',
      );
      expect(within(section).queryByTestId('onix-plan-rights-LICENCE')).not.toBeInTheDocument();
      // The acknowledgement is the control; the blocker it answers is not listed as a problem to read about.
      expect(screen.queryByTestId('onix-plan-problems')).not.toBeInTheDocument();
      const box = acknowledgement(/^onixPlan\.rights\.acknowledge /);

      expect(box).not.toBeChecked();
      expect(screen.queryByRole('checkbox', { name: /acknowledgeOmitLicence/ })).not.toBeInTheDocument();
      await userEvent.click(box);
      expect(lastDecision(onChange).rightsChoices).toEqual({ [key]: ONIX_RIGHTS_ACKNOWLEDGED });

      await decideAgain({ fileWorkType: Monograph, rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } });
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.ready');
      expect(acknowledgement(/^onixPlan\.rights\.acknowledge /)).toBeChecked();
      expect(screen.getByTestId('onix-plan-licence')).toHaveTextContent('CC BY 4.0');

      await userEvent.click(acknowledgement(/^onixPlan\.rights\.acknowledge /));
      expect(lastDecision(onChange).rightsChoices).toEqual({});
      await decideAgain({ fileWorkType: Monograph, rightsChoices: {} });
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.blocked');
    });

    it('offers the omission of an unsupported licence as a licence choice, and says the Work is then created without one', async () => {
      const file = { records: [epub(licence('https://publisher.example/eula'))] };
      const { sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const key = findingKey(sidecar, 'RIGHTS_LICENCE_UNSUPPORTED');

      expect(screen.getByTestId('onix-plan-rights-LICENCE')).toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-licence')).toHaveTextContent('onixPlan.licence.blocked');
      expect(acknowledgement(/^onixPlan\.rights\.acknowledgeOmitLicence /)).not.toBeChecked();

      await decideAgain({ fileWorkType: Monograph, rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } });
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.ready');
      expect(screen.getByTestId('onix-plan-licence')).toHaveTextContent('onixPlan.licence.omitted');
    });

    it('keeps licence, technical protection and usage constraints apart, and offers no control for a conflict', async () => {
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

      expect(screen.getByTestId('onix-plan-rights-TECHNICAL_PROTECTION')).toHaveTextContent(
        sidecar.rights?.findings.find(({ code }) => code === 'RIGHTS_TECHNICAL_PROTECTION_CONTRADICTION')?.message ??
          '',
      );
      expect(
        within(screen.getByTestId('onix-plan-rights-TECHNICAL_PROTECTION')).queryByRole('checkbox'),
      ).not.toBeInTheDocument();
      // The constraint is acknowledged as omitting the licence with it: the licence cannot be kept without it.
      expect(
        within(screen.getByTestId('onix-plan-rights-USAGE_CONSTRAINTS')).getByRole('checkbox', {
          name: /acknowledgeOmitLicence/,
        }),
      ).toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-problems')).toHaveTextContent('onixPlan.blocker.RIGHTS_SOURCE_CONFLICT');
    });

    it('marks a stale rights answer on its finding, and offers to clear one that names no finding at all', async () => {
      const file = { records: [epub('<EpubTechnicalProtection>03</EpubTechnicalProtection>' + licence(CC_BY))] };
      const { sidecar } = await renderPanel(file, { fileWorkType: Monograph });
      const key = findingKey(sidecar, 'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE');

      cleanup();
      const { onChange } = await renderPanel(file, {
        fileWorkType: Monograph,
        rightsChoices: { [key]: 'yes', 'RIGHTS|GONE': ONIX_RIGHTS_ACKNOWLEDGED },
      });

      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.blocked');
      expect(screen.getByTestId('onix-plan-rights-TECHNICAL_PROTECTION')).toHaveTextContent(
        'onixPlan.rights.staleChoice',
      );
      // The stale answer is shown as given, and unticking it clears it; nothing reads it as the acknowledgement.
      const box = acknowledgement(/^onixPlan\.rights\.acknowledge /);

      expect(box).toBeChecked();
      await userEvent.click(box);
      expect(lastDecision(onChange).rightsChoices).toEqual({ 'RIGHTS|GONE': ONIX_RIGHTS_ACKNOWLEDGED });
      // An answer to no finding is a problem, cleared by its own control and never by a blanket one.
      expect(screen.getByTestId('onix-plan-problems')).toHaveTextContent('onixPlan.blocker.RIGHTS_CHOICE_STALE');
      await userEvent.click(screen.getByRole('button', { name: /^onixPlan\.rights\.clearStale/ }));
      expect(lastDecision(onChange).rightsChoices).toEqual({ [key]: 'yes' });
      expect(screen.queryByRole('checkbox', { name: /accept|all/i })).not.toBeInTheDocument();
    });

    it('discloses simple worldwide sales rights without a control, and asks an acknowledgement of each complex rights fact in the sales-rights section', async () => {
      const simple = { records: [epub('', status + salesRightsXml('01', '<RegionsIncluded>WORLD</RegionsIncluded>'))] };
      const { sidecar } = await renderPanel(simple, { fileWorkType: Monograph });
      const section = screen.getByTestId('onix-plan-sales-rights');

      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.ready');
      expect(within(section).queryByRole('checkbox')).not.toBeInTheDocument();
      expect(within(section).getByTestId('onix-plan-sales-rights-disclosures')).toHaveTextContent(
        sidecar.salesRights?.findings[0].message ?? '',
      );
      expect(screen.queryByTestId('onix-plan-product-contacts')).not.toBeInTheDocument();
      cleanup();

      const complex = {
        records: [
          epub(
            '',
            status +
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
      const boxes = within(screen.getByTestId('onix-plan-sales-rights')).getAllByRole('checkbox', {
        name: /^onixPlan\.salesRights\.acknowledge /,
      });
      const keys = complexSidecar.salesRights?.findings.map(({ key }) => key) ?? [];

      expect(boxes).toHaveLength(3);
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.blocked {"count":3}');
      expect(screen.queryByTestId('onix-plan-problems')).not.toBeInTheDocument();
      await userEvent.click(boxes[0]);
      expect(lastDecision(onChange).rightsChoices).toEqual({ [keys[0]]: ONIX_RIGHTS_ACKNOWLEDGED });
      await decideAgain({
        fileWorkType: Monograph,
        rightsChoices: Object.fromEntries(keys.map((key) => [key, ONIX_RIGHTS_ACKNOWLEDGED])),
      });
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.ready');
    });

    it('lists a Market that contradicts the sales rights as a problem, with no acknowledgement to give', async () => {
      const file = {
        records: [
          epub(
            '',
            status +
              salesRightsXml('01', '<CountriesIncluded>GB</CountriesIncluded>') +
              '<ROWSalesRightsType>03</ROWSalesRightsType>',
          ).replace(
            '</Product>',
            '<ProductSupply><Market><Territory><CountriesIncluded>US</CountriesIncluded></Territory></Market><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>S</SupplierName></Supplier><ProductAvailability>20</ProductAvailability><Price><PriceType>02</PriceType><PriceAmount>10.00</PriceAmount><CurrencyCode>USD</CurrencyCode></Price></SupplyDetail></ProductSupply></Product>',
          ),
        ],
      };
      const { sidecar } = await renderPanel(file, { fileWorkType: Monograph });
      const contradiction = sidecar.salesRights?.findings.find(
        ({ code }) => code === 'SALES_RIGHTS_MARKET_CONTRADICTION',
      );

      expect(screen.getByTestId('onix-plan-sales-rights')).toHaveTextContent(contradiction?.message ?? 'missing');
      expect(screen.getByTestId('onix-plan-problems')).toHaveTextContent(
        'onixPlan.blocker.SALES_RIGHTS_SOURCE_CONFLICT',
      );
    });

    it('shows each product contact with its role, scope and the details the file gives, asks an acknowledgement only for a high-salience role, and labels compliance contacts as such', async () => {
      const file = {
        records: [
          epub(
            '',
            status +
              contactXml('06') +
              contactXml('02', 'press@example.org', 'Press Office') +
              contactXml('10', 'safety@example.org'),
          ),
        ],
      };
      const { sidecar, onChange } = await renderPanel(file, { fileWorkType: Monograph });
      const section = screen.getByTestId('onix-plan-product-contacts');
      const entries = within(section).getAllByTestId('onix-plan-product-contact');

      expect(entries).toHaveLength(3);
      // The interactive preview shows the uploaded contact details, so the acknowledgement is informed.
      expect(entries[0]).toHaveTextContent('onixPlan.productContact.role.06');
      expect(entries[0]).toHaveTextContent('onixPlan.productContact.scope.PUBLISHING_DETAIL');
      expect(entries[0]).toHaveTextContent('permissions@example.org');
      expect(entries[0]).toHaveTextContent('Example Press');
      expect(
        within(entries[0]).getByRole('checkbox', { name: /^onixPlan\.productContact\.acknowledge / }),
      ).not.toBeChecked();
      expect(entries[1]).toHaveTextContent('onixPlan.productContact.role.02');
      expect(entries[1]).toHaveTextContent('onixPlan.productContact.notRecorded');
      expect(within(entries[1]).queryByRole('checkbox')).not.toBeInTheDocument();
      expect(entries[2]).toHaveTextContent('onixPlan.productContact.compliance');
      expect(within(entries[2]).getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.blocked {"count":2}');

      await userEvent.click(within(entries[0]).getByRole('checkbox'));
      expect(lastDecision(onChange).rightsChoices).toEqual({
        [findingKey(sidecar, 'PRODUCT_CONTACT_NOT_REPRESENTED')]: ONIX_RIGHTS_ACKNOWLEDGED,
      });
    });

    it('shows a matching existing Accessibility contact as evidence beside an accessibility request contact, which still needs acknowledging', async () => {
      const file = {
        records: [epub('', status + contactXml('01', 'access@example.org'))],
        accessibilityContactEmails: ['access@example.org'],
      };

      await renderPanel(file, { fileWorkType: Monograph });
      const [entry] = screen.getAllByTestId('onix-plan-product-contact');

      expect(entry).toHaveTextContent('onixPlan.productContact.accessibilityMatch');
      expect(within(entry).getByRole('checkbox')).not.toBeChecked();
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.blocked');
    });

    it("says what becomes of an existing Work's licence: already present, or kept where the file is silent", async () => {
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
      expect(screen.getByTestId('onix-plan-licence')).toHaveTextContent('onixPlan.licence.alreadyPresent');
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.ready');
      cleanup();

      await renderPanel({ records: [present('')], lookup: lookup(CC_BY) });
      expect(screen.getByTestId('onix-plan-licence')).toHaveTextContent('onixPlan.licence.preserved');
      cleanup();

      const { sidecar: differing } = await renderPanel({
        records: [present(licence(CC_BY))],
        lookup: lookup(CC_BY_NC),
      });
      expect(screen.queryByTestId('onix-plan-licence')).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-rights-LICENCE')).toHaveTextContent(
        differing.findings?.find(({ code }) => code === 'RIGHTS_EXISTING_LICENCE_DIFFERS')?.message ?? 'missing',
      );
      expect(within(screen.getByTestId('onix-plan-rights-LICENCE')).queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-problems')).toHaveTextContent(
        'onixPlan.blocker.RIGHTS_EXISTING_LICENCE_DIFFERS',
      );
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
      const section = screen.getByTestId('onix-plan-rights-LICENCE');

      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.blocked');
      expect(section).toHaveTextContent(sidecar.findings?.find((finding) => finding.key === key)?.message ?? 'missing');
      expect(screen.queryByTestId('onix-plan-problems')).not.toBeInTheDocument();
      const box = within(section).getByRole('checkbox', { name: /^onixPlan\.rights\.acknowledgeExistingLicence / });

      expect(box).not.toBeChecked();
      await userEvent.click(box);
      expect(lastDecision(onChange).rightsChoices).toEqual({ [key]: ONIX_RIGHTS_ACKNOWLEDGED });

      await decideAgain({ rightsChoices: { [key]: ONIX_RIGHTS_ACKNOWLEDGED } });
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.ready');
      expect(screen.getByTestId('onix-plan-licence')).toHaveTextContent('onixPlan.licence.omitted');
    });

    it.each(['en', 'de', 'es', 'pt'])(
      'says every rights, sales-rights and contact label and blocker in %s',
      async (locale) => {
        const { onixPlan } = (await import(`@/src/shared/i18n/locales/${locale}/common.json`)) as {
          onixPlan: {
            rights: Record<string, unknown>;
            licence: Record<string, string>;
            salesRights: Record<string, string>;
            productContact: Record<string, unknown>;
            blocker: Record<string, string>;
          };
        };

        expect(Object.keys(onixPlan.rights).sort()).toEqual(
          [
            'acknowledge',
            'acknowledgeExistingLicence',
            'acknowledgeOmitLicence',
            'blocking',
            'clearStale',
            'heading',
            'notRecorded',
            'section',
            'staleChoice',
          ].sort(),
        );
        expect(Object.keys(onixPlan.rights.section as object).sort()).toEqual([
          'LICENCE',
          'OTHER',
          'TECHNICAL_PROTECTION',
          'USAGE_CONSTRAINTS',
        ]);
        expect(Object.keys(onixPlan.licence).sort()).toEqual([
          'alreadyPresent',
          'blocked',
          'none',
          'omitted',
          'preserved',
        ]);
        expect(onixPlan.licence.alreadyPresent).toContain('{{licence}}');
        expect(Object.keys(onixPlan.salesRights).sort()).toEqual(
          ['acknowledge', 'blocking', 'disclosures_one', 'disclosures_other', 'heading', 'notRecorded'].sort(),
        );
        expect(Object.keys(onixPlan.productContact).sort()).toEqual(
          [
            'accessibilityMatch',
            'acknowledge',
            'address',
            'blocking',
            'compliance',
            'contactName',
            'disclosures_one',
            'disclosures_other',
            'emails',
            'faxes',
            'heading',
            'identifiers',
            'notRecorded',
            'organisation',
            'role',
            'scope',
            'telephones',
          ].sort(),
        );
        expect(Object.keys(onixPlan.productContact.role as object).sort()).toEqual([
          '00',
          '01',
          '02',
          '03',
          '04',
          '05',
          '06',
          '07',
          '08',
          '09',
          '10',
          '11',
          '99',
        ]);
        expect(Object.keys(onixPlan.productContact.scope as object).sort()).toEqual(['MARKET', 'PUBLISHING_DETAIL']);
        [
          'rights.acknowledge',
          'rights.acknowledgeOmitLicence',
          'rights.acknowledgeExistingLicence',
          'salesRights.acknowledge',
          'productContact.acknowledge',
        ].forEach((path) => {
          const [group, key] = path.split('.');

          expect((onixPlan as unknown as Record<string, Record<string, string>>)[group][key]).toContain('{{scope}}');
        });
        expect(onixPlan.rights.clearStale).toContain('{{answer}}');
        [
          'RIGHTS_ACKNOWLEDGEMENT_REQUIRED',
          'RIGHTS_CHOICE_STALE',
          'RIGHTS_EXISTING_LICENCE_DIFFERS',
          'RIGHTS_EXISTING_LICENCE_UNVERIFIED',
          'SALES_RIGHTS_ACKNOWLEDGEMENT_REQUIRED',
          'SALES_RIGHTS_SOURCE_CONFLICT',
          'SALES_RIGHTS_PREFLIGHT_GAP',
          'PRODUCT_CONTACT_ACKNOWLEDGEMENT_REQUIRED',
          'PRODUCT_CONTACT_PREFLIGHT_GAP',
        ].forEach((code) => expect(onixPlan.blocker[code]?.length ?? 0).toBeGreaterThan(0));
      },
    );
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
      screen.getByRole('combobox', {
        name: /^onixPlan\.accessibility\.choice\.ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED /,
      });

    it('asks which of several WCAG values a Publication keeps, choosing none, and records exactly the one chosen', async () => {
      const file = epub(a11y('81', '82', '85'));
      const inputs = await monograph(file);
      const { onChange, sidecar, decideAgain } = await renderPanel(file, inputs);
      const key = sidecar.blockers.find(({ code }) => code === 'ACCESSIBILITY_CHOICE_REQUIRED')?.detail
        .findingKey as string;
      const select = choiceControl();

      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.blocked {"count":1}');
      expect(select).toHaveValue('');
      expect(optionValues(select)).toEqual(['', 'WCAG21AA', 'WCAG22AA', ONIX_ACCESSIBILITY_OMIT]);
      // The question is its own: never repeated among the problems to read about.
      expect(screen.queryByTestId('onix-plan-problems')).not.toBeInTheDocument();
      expect(
        within(screen.getByTestId('onix-plan-accessibility')).getByTestId('onix-plan-accessibility-publication'),
      ).toHaveTextContent('onixPlan.accessibility.action.BLOCKED');

      await userEvent.selectOptions(select, 'WCAG21AA');
      expect(lastDecision(onChange)).toEqual({
        ...EMPTY_ONIX_PLAN_INPUTS,
        ...inputs,
        accessibilityChoices: { [key]: 'WCAG21AA' },
      });

      await decideAgain(lastDecision(onChange));
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.ready');
      const publication = screen.getByTestId('onix-plan-accessibility-publication');

      expect(publication).toHaveTextContent('onixPlan.accessibility.action.CREATE');
      expect(publication).toHaveTextContent('WCAG 2.1 AA');
      // What is not imported, and why, stays in view.
      expect(within(publication).getByTestId('onix-plan-accessibility-omitted')).toHaveTextContent(
        'WCAG 2.2 AA (List 196 82 + 85) - onixPlan.accessibility.omission.NOT_CHOSEN',
      );

      await userEvent.selectOptions(choiceControl(), '');
      expect(lastDecision(onChange).accessibilityChoices).toEqual({});
    });

    it('shows a stale answer as the answer given, never as a value it could stand for, and clears one naming no finding', async () => {
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
        within(select).getByRole('option', { name: /onixPlan\.accessibility\.staleAnswer/, hidden: true }),
      ).toBeDisabled();
      expect(screen.getByTestId('onix-plan-accessibility')).toHaveTextContent('onixPlan.accessibility.staleChoice');

      await userEvent.click(
        within(screen.getByTestId('onix-plan-accessibility-stale')).getByRole('button', {
          name: /onixPlan\.accessibility\.clearStale/,
        }),
      );
      expect(lastDecision(onChange).accessibilityChoices).toEqual({ [key]: 'WCAG22AAA' });
    });

    it('asks for a material product fact to be acknowledged, showing what it says, with nothing ticked', async () => {
      const file = epub(featureXml('21', '02', ['UN3481 lithium ion batteries']));
      const inputs = await monograph(file);
      const { onChange, sidecar } = await renderPanel(file, inputs);
      const section = screen.getByTestId('onix-plan-product-form-features');
      const box = within(section).getByRole('checkbox', { name: /^onixPlan\.productFormFeature\.acknowledge / });
      const key = sidecar.findings?.find(({ family }) => family === 'PRODUCT_FORM_FEATURE')?.key as string;

      expect(section).toHaveTextContent('UN3481 lithium ion batteries');
      expect(box).not.toBeChecked();
      await userEvent.click(box);
      expect(lastDecision(onChange).accessibilityChoices).toEqual({ [key]: ONIX_ACCESSIBILITY_ACKNOWLEDGED });
    });

    it('keeps every accessibility fact Thoth does not record listed, with its own words, holding nothing back', async () => {
      const file = epub(featureXml('09', '00', ['Screen-reader friendly throughout']) + a11y('11', '94'));
      await renderPanel(file, await monograph(file));
      const disclosures = screen.getByTestId('onix-plan-accessibility-disclosures');

      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.ready');
      expect(disclosures).toHaveTextContent('onixPlan.accessibility.disclosures {"count":3}');
      expect(within(disclosures).getAllByTestId('onix-plan-accessibility-finding')).toHaveLength(3);
      expect(disclosures).toHaveTextContent('Screen-reader friendly throughout');
    });

    it("says an existing Publication's enrichment waits, and never offers to write it", async () => {
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
      const section = screen.getByTestId('onix-plan-accessibility');

      expect(within(section).getByTestId('onix-plan-accessibility-publication')).toHaveTextContent(
        'onixPlan.accessibility.action.ENRICHMENT_DEFERRED',
      );
      expect(within(section).queryByRole('combobox')).not.toBeInTheDocument();
      expect(within(section).queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-problems')).toHaveTextContent(
        'onixPlan.blocker.ACCESSIBILITY_EXISTING_ENRICHMENT_DEFERRED',
      );
    });

    it.each(['en', 'de', 'es', 'pt'])('says every accessibility label and blocker in %s', async (locale) => {
      const { onixPlan } = (await import(`@/src/shared/i18n/locales/${locale}/common.json`)) as {
        onixPlan: {
          accessibility: Record<string, unknown>;
          productFormFeature: Record<string, string>;
          blocker: Record<string, string>;
        };
      };
      const { accessibility } = onixPlan;

      expect(Object.keys(accessibility).sort()).toEqual(
        [
          'acknowledge',
          'action',
          'blocking',
          'choice',
          'choose',
          'clearStale',
          'disclosures_one',
          'disclosures_other',
          'field',
          'heading',
          'none',
          'notRecorded',
          'omission',
          'omitted_one',
          'omitted_other',
          'option',
          'publication',
          'staleAnswer',
          'staleChoice',
        ].sort(),
      );
      expect(Object.keys(accessibility.action as object).sort()).toEqual(
        ['BLOCKED', 'CONFLICT', 'CREATE', 'ENRICHMENT_DEFERRED', 'EXISTING_PRESERVED', 'NOOP'].sort(),
      );
      expect(Object.keys(accessibility.field as object).sort()).toEqual(
        [
          'accessibilityAdditionalStandard',
          'accessibilityException',
          'accessibilityReportUrl',
          'accessibilityStandard',
        ].sort(),
      );
      expect(Object.keys(accessibility.omission as object).sort()).toEqual(
        [
          'AUDIO_PUBLICATION',
          'EXCEPTION_CHOSEN',
          'INCOMPATIBLE_ADDITIONAL',
          'NOT_CHOSEN',
          'NO_PRIMARY_STANDARD',
          'PHYSICAL_PUBLICATION',
          'PUBLISHER_OMISSION',
          'STANDARDS_CHOSEN',
        ].sort(),
      );
      Object.values(accessibility.choice as Record<string, string>).forEach((label) =>
        expect(label).toContain('{{scope}}'),
      );
      expect(Object.keys(accessibility.choice as object).sort()).toEqual(
        [
          'ACCESSIBILITY_ADDITIONAL_CHOICE_REQUIRED',
          'ACCESSIBILITY_EXCEPTION_CHOICE_REQUIRED',
          'ACCESSIBILITY_PRIMARY_CHOICE_REQUIRED',
          'ACCESSIBILITY_REPORT_URL_CHOICE_REQUIRED',
          'ACCESSIBILITY_STANDARD_EXCEPTION_CHOICE_REQUIRED',
        ].sort(),
      );
      expect((accessibility.option as Record<string, string>).STANDARDS).toContain('{{label}}');
      expect((accessibility.option as Record<string, string>).EXCEPTION).toContain('{{label}}');
      expect(accessibility.publication).toContain('{{product}}');
      expect(accessibility.publication).toContain('{{type}}');
      expect(accessibility.acknowledge).toContain('{{scope}}');
      expect(accessibility.clearStale).toContain('{{answer}}');
      expect(accessibility.staleAnswer).toContain('{{answer}}');
      expect(accessibility.disclosures_other).toContain('{{count}}');
      expect(accessibility.omitted_other).toContain('{{count}}');
      expect(Object.keys(onixPlan.productFormFeature).sort()).toEqual(
        ['acknowledge', 'disclosures_one', 'disclosures_other', 'heading'].sort(),
      );
      expect(onixPlan.productFormFeature.acknowledge).toContain('{{scope}}');
      [
        'ACCESSIBILITY_CHOICE_REQUIRED',
        'ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED',
        'ACCESSIBILITY_PREFLIGHT_GAP',
        'ACCESSIBILITY_CHOICE_STALE',
        'ACCESSIBILITY_EXISTING_ENRICHMENT_DEFERRED',
        'ACCESSIBILITY_EXISTING_CONFLICT',
        'PRODUCT_FORM_FEATURE_ACKNOWLEDGEMENT_REQUIRED',
      ].forEach((code) => expect(onixPlan.blocker[code]?.length ?? 0).toBeGreaterThan(0));
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
    const section = () => screen.getByTestId('onix-plan-components');
    const componentKeyOf = (sidecar: OnixImportPlanSidecar, code: string) =>
      (sidecar.findings ?? []).find((finding) => finding.family === 'COMPONENT' && finding.code === code)?.key ?? '';

    it('asks a contained Work its own WorkType and status, offers only what the contract allows, and chooses nothing', async () => {
      const { onChange, sidecar } = await renderPanel(withItems(contentItem({ lsn: '1', type: '01' })), {
        fileWorkType: Monograph,
      });
      const typeKey = componentKeyOf(sidecar, 'CONTAINED_WORK_TYPE_REQUIRED');
      const workType = within(section()).getByRole('combobox', {
        name: /^onixPlan\.components\.choice\.CONTAINED_WORK_TYPE_REQUIRED/,
      });
      const status = within(section()).getByRole('combobox', {
        name: /^onixPlan\.components\.choice\.CONTAINED_WORK_STATUS_REQUIRED/,
      });

      expect(within(section()).getByTestId('onix-plan-component')).toHaveTextContent(
        'onixPlan.components.kind.CONTAINED_WORK - onixPlan.components.action.EXECUTION_DEFERRED',
      );
      expect(workType).toHaveValue('');
      expect(optionValues(workType)).toEqual(['', Monograph, EditedBook, Textbook, 'JOURNAL_ISSUE', 'BOOK_SET']);
      expect(optionValues(workType)).not.toContain(BookChapter);
      expect(status).toHaveValue('');
      expect(optionValues(status)).toEqual([
        '',
        'FORTHCOMING',
        'ACTIVE',
        'WITHDRAWN',
        'SUPERSEDED',
        'POSTPONED_INDEFINITELY',
        'CANCELLED',
      ]);

      await userEvent.selectOptions(workType, Textbook);

      expect(lastDecision(onChange).componentChoices).toEqual({ [typeKey]: Textbook });
      // Its creation is not available yet, so the import stays blocked however it is answered, and says why.
      expect(screen.getByTestId('onix-plan-problems')).toHaveTextContent(
        'onixPlan.blocker.COMPONENT_EXECUTION_DEFERRED',
      );
      expect(screen.getByTestId('onix-plan-problems')).not.toHaveTextContent(
        'onixPlan.blocker.COMPONENT_CHOICE_REQUIRED',
      );
    });

    it('asks for exactly the dates a chosen status needs, empty, and takes the one entered', async () => {
      const file = withItems(contentItem({ lsn: '1', type: '01' }));
      const first = await sidecarFor(file, { fileWorkType: Monograph });
      const statusKey = componentKeyOf(first, 'CONTAINED_WORK_STATUS_REQUIRED');
      const { onChange } = await renderPanel(file, {
        fileWorkType: Monograph,
        componentChoices: { [statusKey]: 'ACTIVE' },
      });
      const date = within(section()).getByLabelText(/^onixPlan\.components\.dateLabel\.PUBLICATION/);

      expect(date).toHaveValue('');
      expect(
        within(section()).queryByLabelText(/^onixPlan\.components\.dateLabel\.WITHDRAWAL/),
      ).not.toBeInTheDocument();

      fireEvent.change(date, { target: { value: '2024-05-01' } });

      expect(lastDecision(onChange).componentChoices).toEqual(expect.objectContaining({ [statusKey]: 'ACTIVE' }));
      expect(Object.values(lastDecision(onChange).componentChoices ?? {})).toContain('2024-05-01');
    });

    it('asks the position the file does not give, proposes none, and takes only a whole number of 1 or more', async () => {
      const { onChange, sidecar } = await renderPanel(withItems(contentItem({})), { fileWorkType: Monograph });
      const key = componentKeyOf(sidecar, 'COMPONENT_ORDINAL_REQUIRED');
      const position = within(section()).getByRole('textbox', { name: /^onixPlan\.components\.ordinalLabel/ });

      expect(position).toHaveValue('');

      fireEvent.change(position, { target: { value: '0' } });

      expect(within(section()).getByText('onixPlan.components.ordinalInvalid')).toBeInTheDocument();
      expect(lastDecision(onChange).componentChoices).toEqual({});

      fireEvent.change(position, { target: { value: '3' } });

      expect(lastDecision(onChange).componentChoices).toEqual({ [key]: '3' });
    });

    it('asks one acknowledgement per loss, unticked, with no control that accepts every loss at once', async () => {
      const file = withItems(
        contentItem({ lsn: '1' }),
        contentItem({ lsn: '2', av: '01' }),
        contentItem({ lsn: '3', av: '02' }),
      );
      const { onChange, sidecar, decideAgain } = await renderPanel(file, { fileWorkType: Monograph });
      const checkboxes = within(section()).getAllByRole('checkbox');
      const lossKeys = (sidecar.findings ?? [])
        .filter(({ code }) => code === 'COMPONENT_AV_ITEM_UNREPRESENTABLE')
        .map(({ key }) => key);

      expect(checkboxes).toHaveLength(2);
      checkboxes.forEach((checkbox) => expect(checkbox).not.toBeChecked());

      await userEvent.click(checkboxes[0]);

      expect(lastDecision(onChange).componentChoices).toEqual({ [lossKeys[0]]: ONIX_COMPONENT_ACKNOWLEDGED });

      await decideAgain({
        fileWorkType: Monograph,
        componentChoices: Object.fromEntries(lossKeys.map((key) => [key, ONIX_COMPONENT_ACKNOWLEDGED])),
      });

      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.ready');
      expect(
        within(section())
          .getAllByTestId('onix-plan-component')
          .map((summary) => summary.textContent),
      ).toEqual([
        expect.stringContaining('onixPlan.components.action.CREATE_CHAPTER'),
        expect.stringContaining('onixPlan.components.action.OMIT_WITH_ACKNOWLEDGED_LOSS'),
        expect.stringContaining('onixPlan.components.action.OMIT_WITH_ACKNOWLEDGED_LOSS'),
      ]);
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
      const pages = within(section()).getByRole('combobox', {
        name: /^onixPlan\.components\.choice\.COMPONENT_PAGE_RUNS_CHOICE_REQUIRED/,
      });

      expect(pages).toHaveValue('');
      expect(
        within(pages)
          .getAllByRole('option', { hidden: true })
          .map(({ textContent }) => textContent),
      ).toEqual(['onixPlan.components.choose', '1–9', '12–20', 'onixPlan.components.option.OMIT']);
    });

    it('marks an answer the file does not offer as stale, and clears one to a finding this file does not have', async () => {
      const file = withItems(contentItem({ lsn: '1', type: '01' }));
      const typeKey = componentKeyOf(
        await sidecarFor(file, { fileWorkType: Monograph }),
        'CONTAINED_WORK_TYPE_REQUIRED',
      );
      const { onChange } = await renderPanel(file, {
        fileWorkType: Monograph,
        componentChoices: { [typeKey]: BookChapter, 'COMPONENT|elsewhere': '1' },
      });
      const workType = within(section()).getByRole('combobox', {
        name: /^onixPlan\.components\.choice\.CONTAINED_WORK_TYPE_REQUIRED/,
      });

      expect(workType).toHaveValue(BookChapter);
      expect(
        within(workType).getByRole('option', { name: /onixPlan\.components\.staleAnswer/, hidden: true }),
      ).toBeDisabled();
      expect(within(section()).getAllByText('onixPlan.components.staleChoice').length).toBeGreaterThan(0);
      // The question names exactly where the file states the fact it is about.
      expect(within(section()).getAllByTestId('onix-plan-component-locations')[0]).toHaveTextContent(
        '/ONIXMessage[1]/Product[1]/ContentDetail[1]/ContentItem[1]',
      );

      await userEvent.click(
        within(screen.getByTestId('onix-plan-components-stale')).getByRole('button', {
          name: /onixPlan\.components\.clearStale/,
        }),
      );

      expect(lastDecision(onChange).componentChoices).toEqual({ [typeKey]: BookChapter });
    });

    it('shows what each chapter becomes, discloses the matter it loses, and lists what a later stage keeps', async () => {
      await renderPanel(
        withItems(
          contentItem({
            lsn: '1',
            type: '02',
            inner:
              '<TextItemIdentifier><TextItemIDType>06</TextItemIDType><IDValue>10.1234/front</IDValue></TextItemIdentifier><PageRun><FirstPageNumber>i</FirstPageNumber><LastPageNumber>xii</LastPageNumber></PageRun><NumberOfPages>12</NumberOfPages>',
            after:
              '<TextContent><TextType>03</TextType><ContentAudience>00</ContentAudience><Text>An abstract.</Text></TextContent>',
          }),
        ),
        { fileWorkType: Monograph },
      );
      const summary = within(section()).getByTestId('onix-plan-component');

      expect(summary).toHaveTextContent(
        'onixPlan.components.kind.BOOK_CHAPTER - onixPlan.components.action.CREATE_CHAPTER',
      );
      expect(summary).toHaveTextContent('onixPlan.components.matter.FRONT');
      expect(summary).toHaveTextContent('i–xii');
      expect(summary).toHaveTextContent('https://doi.org/10.1234/front');
      expect(within(summary).getByTestId('onix-plan-component-retained')).toHaveTextContent(
        'onixPlan.components.retainedFact {"element":"TextContent","owner":"APP-IMPORT-ONIX-REL-01C","ownerIssue":"#225"}',
      );
      expect(within(section()).getByTestId('onix-plan-component-disclosures')).toHaveTextContent(
        'onixPlan.components.disclosures {"count":1}',
      );
      expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.severity.ready');
    });

    it.each(['en', 'de', 'es', 'pt'])('says every content-item label and blocker in %s', async (locale) => {
      const { onixPlan } = (await import(`@/src/shared/i18n/locales/${locale}/common.json`)) as {
        onixPlan: { components: Record<string, unknown>; blocker: Record<string, string> };
      };
      const { components } = onixPlan;
      const keysOf = (value: unknown) => Object.keys(value as object).sort();

      expect(keysOf(components)).toEqual(
        [
          'acknowledge',
          'action',
          'blocking',
          'choice',
          'choose',
          'clearStale',
          'dateLabel',
          'disclosures_one',
          'disclosures_other',
          'editionPlanned',
          'field',
          'heading',
          'imprintInherited',
          'inherited',
          'kind',
          'locations_one',
          'locations_other',
          'matter',
          'none',
          'notRecorded',
          'option',
          'ordinalBasis',
          'ordinalInvalid',
          'ordinalLabel',
          'pagesOmitted',
          'retained_one',
          'retained_other',
          'retainedFact',
          'scope',
          'staleAnswer',
          'staleChoice',
          'status',
          'undecided',
        ].sort(),
      );
      expect(keysOf(components.kind)).toEqual(['AV_ITEM', 'BOOK_CHAPTER', 'CONTAINED_WORK', 'UNSUPPORTED']);
      expect(keysOf(components.action)).toEqual([
        'BLOCKED',
        'CREATE_CHAPTER',
        'EXECUTION_DEFERRED',
        'OMIT_WITH_ACKNOWLEDGED_LOSS',
      ]);
      expect(keysOf(components.status)).toEqual(
        ['ACTIVE', 'CANCELLED', 'FORTHCOMING', 'POSTPONED_INDEFINITELY', 'SUPERSEDED', 'WITHDRAWN'].sort(),
      );
      expect(keysOf(components.matter)).toEqual(['BACK', 'BODY', 'FRONT']);
      expect(keysOf(components.ordinalBasis)).toEqual(['LEVEL_SEQUENCE_NUMBER', 'PUBLISHER_INPUT']);
      expect(keysOf(components.dateLabel)).toEqual(['PUBLICATION', 'WITHDRAWAL']);
      expect(keysOf(components.field)).toEqual(
        [
          'doi',
          'edition',
          'hierarchy',
          'imprint',
          'inherited',
          'matter',
          'ordinal',
          'pageCount',
          'pages',
          'publicationDate',
          'status',
          'withdrawnDate',
          'workType',
        ].sort(),
      );
      expect(keysOf(components.choice)).toEqual(
        [
          'COMPONENT_PAGE_RUNS_CHOICE_REQUIRED',
          'CONTAINED_WORK_STATUS_REQUIRED',
          'CONTAINED_WORK_TYPE_REQUIRED',
        ].sort(),
      );
      expect(keysOf(components.acknowledge)).toEqual(
        [
          'COMPONENT_AV_ITEM_UNREPRESENTABLE',
          'COMPONENT_HIERARCHY_UNREPRESENTABLE',
          'COMPONENT_PAGE_COUNT_UNREPRESENTABLE',
          'COMPONENT_PAGE_RANGE_UNREPRESENTABLE',
        ].sort(),
      );
      [
        ...Object.values(components.choice as Record<string, string>),
        ...Object.values(components.acknowledge as Record<string, string>),
        ...Object.values(components.dateLabel as Record<string, string>),
        components.ordinalLabel as string,
      ].forEach((label) => expect(label).toContain('{{scope}}'));
      expect(components.scope).toContain('{{position}}');
      expect(components.scope).toContain('{{product}}');
      expect(components.clearStale).toContain('{{answer}}');
      expect(components.staleAnswer).toContain('{{answer}}');
      expect(components.disclosures_other).toContain('{{count}}');
      expect(components.retained_other).toContain('{{count}}');
      expect(components.locations_other).toContain('{{count}}');
      ['{{element}}', '{{owner}}', '{{ownerIssue}}'].forEach((token) =>
        expect(components.retainedFact).toContain(token),
      );
      [
        'COMPONENT_UNSUPPORTED',
        'COMPONENT_CHOICE_REQUIRED',
        'COMPONENT_INPUT_REQUIRED',
        'COMPONENT_ACKNOWLEDGEMENT_REQUIRED',
        'COMPONENT_SOURCE_CONFLICT',
        'COMPONENT_UNREPRESENTABLE',
        'COMPONENT_PREFLIGHT_GAP',
        'COMPONENT_EXECUTION_DEFERRED',
        'COMPONENT_CHOICE_STALE',
      ].forEach((code) => expect(onixPlan.blocker[code]?.length ?? 0).toBeGreaterThan(0));
    });
  });
});
