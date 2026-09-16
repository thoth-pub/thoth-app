import { parse } from '@5stones/onix';
import { ThemeProvider } from '@mui/material';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkEntity, WorkType } from '@/src/entities/work/model/work.types';
import { currencyOptions, languageOptions, licenseOptions, PublicationType, WorkTypes } from '@/src/shared/constants';
import type { ExtendedONIXMessageRoot } from '@/src/shared/parsers/XMLParser/interfaces';
import { reduceOnixDescriptive, suggestOnixWorkType } from '@/src/shared/parsers/XMLParser/onixDescriptive';
import { planOnixSource } from '@/src/shared/parsers/XMLParser/onixPlanning';
import { reduceOnixRights } from '@/src/shared/parsers/XMLParser/onixRights';
import {
  adaptableGroupKeys,
  EMPTY_ONIX_PLAN_INPUTS,
  type OnixTargetLookup,
  resolveOnixImportPlan,
  resolveOnixTargets,
} from '@/src/shared/parsers/XMLParser/onixTargetResolution';
import XMLParser from '@/src/shared/parsers/XMLParser/XMLParser';
import { theme } from '@/src/shared/theme';
import type {
  ImportIdentifier,
  OnixDescriptiveFinding,
  OnixImportPlanSidecar,
  OnixPlanInputs,
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

type FileSpec = { records: string[]; header?: string; lookup?: OnixTargetLookup };

/** The sidecar the resolver produces for a file and the publisher's decisions so far, exactly as XMLParse holds it. */
const sidecarFor = async (
  { records, header = GENERIC_HEADER, lookup = noMatches }: FileSpec,
  inputs: Partial<OnixPlanInputs> = {},
) => {
  const message = parse(
    `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${header}${records.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(message);
  const targets = await resolveOnixTargets(sourcePlan, lookup, 'publisher-1');

  return resolveOnixImportPlan({
    sourcePlan,
    targets,
    inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...inputs },
    imprints: IMPRINTS,
    descriptive: reduceOnixDescriptive(message, sourcePlan),
    rights: reduceOnixRights(message, sourcePlan),
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

    it('explains each rights fact that blocks the import or goes unrecorded, and offers no control for any of them', async () => {
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
      // Stage A answers no rights question: nothing here is a control.
      expect(within(section).queryByRole('checkbox')).not.toBeInTheDocument();
      expect(within(section).queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getByTestId('onix-plan-problems')).toHaveTextContent('onixPlan.blocker.RIGHTS_UNREPRESENTABLE');
      // Technical protection alone keeps no licence from being the Work's: it blocks the plan by its own finding.
      expect(screen.getByTestId('onix-plan-licence')).toHaveTextContent('CC BY 4.0');
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
});
