import { parse } from '@5stones/onix';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkEntity } from '@/src/entities/work/model/work.types';
import { PublicationType, WorkTypes } from '@/src/shared/constants';
import type { ExtendedONIXMessageRoot } from '@/src/shared/parsers/XMLParser/interfaces';
import { planOnixSource } from '@/src/shared/parsers/XMLParser/onixPlanning';
import {
  EMPTY_ONIX_PLAN_INPUTS,
  type OnixTargetLookup,
  resolveOnixImportPlan,
  resolveOnixTargets,
} from '@/src/shared/parsers/XMLParser/onixTargetResolution';
import type { ImportIdentifier, OnixPlanInputs } from '@/src/shared/types';
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

const onixRecord = ({
  ref,
  notification = '03',
  envelope = '',
  identifiers = '',
  descriptive = '<ProductForm>BC</ProductForm>',
  related = '',
}: RecordSpec) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>${notification}</NotificationType>${envelope}${identifiers}` +
  `<DescriptiveDetail>${descriptive}</DescriptiveDetail><PublishingDetail><Imprint><ImprintName>Example Imprint</ImprintName></Imprint></PublishingDetail>` +
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
  );
  const sourcePlan = planOnixSource(message as ExtendedONIXMessageRoot);
  const targets = await resolveOnixTargets(sourcePlan, lookup, 'publisher-1');

  return resolveOnixImportPlan({
    sourcePlan,
    targets,
    inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...inputs },
    imprints: IMPRINTS,
  }).sidecar;
};

/** Renders the panel for a file, and re-renders it for new decisions the way XMLParse resolves them again. */
const renderPanel = async (file: FileSpec, inputs: Partial<OnixPlanInputs> = {}) => {
  const onChange = vi.fn<(inputs: OnixPlanInputs) => void>();
  const sidecar = await sidecarFor(file, inputs);
  const view = render(<OnixPlanResolution sidecar={sidecar} onChange={onChange} />);
  const decideAgain = async (next: Partial<OnixPlanInputs>) =>
    view.rerender(<OnixPlanResolution sidecar={await sidecarFor(file, next)} onChange={onChange} />);

  return { onChange, sidecar, decideAgain };
};

const lastDecision = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.lastCall?.[0] as OnixPlanInputs;
const optionValues = (select: HTMLElement) =>
  within(select)
    .getAllByRole('option')
    .map((option) => (option as HTMLOptionElement).value);

describe('OnixPlanResolution', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(cleanup);

  const paperback = { records: [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) })] };

  it('starts with no WorkType, names the one decision the plan waits on, and records the file-level choice', async () => {
    const { onChange } = await renderPanel(paperback);

    const workType = screen.getByRole('combobox', { name: 'onixPlan.workType.fileLabel' });
    expect(workType).toHaveValue('');
    // A whole file is never a book chapter: that is chosen per Work, if at all.
    expect(optionValues(workType)).toEqual([
      '',
      Monograph,
      EditedBook,
      Textbook,
      WorkTypes.enum.JournalIssue,
      WorkTypes.enum.BookSet,
    ]);
    expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.blocked {"count":1}');
    expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent(
      'onixPlan.blocker.WORK_TYPE_INPUT_REQUIRED (onixPlan.classification.TARGET_INPUT_REQUIRED)',
    );

    await userEvent.selectOptions(workType, Textbook);

    expect(onChange).toHaveBeenCalledExactlyOnceWith({ ...EMPTY_ONIX_PLAN_INPUTS, fileWorkType: Textbook });
  });

  it("says the plan is ready once nothing blocks it, and shows each Work's target, WorkType and edition with their grounds", async () => {
    await renderPanel(paperback, { fileWorkType: Monograph });

    expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.ready');
    expect(screen.queryByTestId('onix-plan-blockers')).not.toBeInTheDocument();

    const group = screen.getByTestId('onix-plan-group');
    expect(group).toHaveTextContent('onixPlan.workTarget.NEW_WORK (onixPlan.workEvidence.NO_TARGET_MATCH');
    expect(group).toHaveTextContent('onixPlan.workType.MONOGRAPH (onixPlan.workTypeProvenance.USER_FILE_DEFAULT)');
    expect(group).toHaveTextContent('1 (onixPlan.edition.DEFAULT_FIRST_EDITION)');
    expect(group).toHaveTextContent(
      'onixPlan.productAction.CREATE_PUBLICATION (onixPlan.productEvidence.NO_TARGET_MATCH',
    );
    expect(
      within(group).getByRole('row', { name: new RegExp(`pb ${ISBN_A} onixPlan.publicationType.PAPERBACK`) }),
    ).toBeInTheDocument();
  });

  it("offers one Work its own WorkType, a book chapter included, and takes it back to the file's choice", async () => {
    const { onChange, sidecar, decideAgain } = await renderPanel(paperback, { fileWorkType: Monograph });
    const [{ groupKey }] = sidecar.workGroups;

    const override = screen.getByRole('combobox', { name: /^onixPlan\.workType\.overrideLabel/ });
    expect(override).toHaveValue('');
    expect(optionValues(override)).toContain(BookChapter);

    await userEvent.selectOptions(override, BookChapter);
    expect(lastDecision(onChange)).toEqual({
      ...EMPTY_ONIX_PLAN_INPUTS,
      fileWorkType: Monograph,
      workTypeOverrides: { [groupKey]: BookChapter },
    });

    await decideAgain(lastDecision(onChange));
    // A standalone chapter still needs the Work it belongs to, which nothing here can plan.
    expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent(
      'onixPlan.blocker.WORK_TYPE_PARENT_RELATION_REQUIRED',
    );

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /^onixPlan\.workType\.overrideLabel/ }), '');
    expect(lastDecision(onChange)).toEqual({
      ...EMPTY_ONIX_PLAN_INPUTS,
      fileWorkType: Monograph,
      workTypeOverrides: {},
    });
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
    expect(screen.getByTestId('onix-plan-group')).toHaveTextContent('onixPlan.productAction.OMIT/EXCLUDED');

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
    const existing = getDefaultWork({
      id: 'w-1',
      doi: WORK_DOI,
      type: EditedBook,
      imprintId: 'imprint-1',
      titles: [getDefaultTitle({ canonical: true, title: 'Existing' })],
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
    const { onChange, sidecar } = await renderPanel(file);
    const [{ productKey }] = sidecar.products;

    const group = screen.getByTestId('onix-plan-group');
    expect(group).toHaveTextContent('onixPlan.workTarget.EXISTING_WORK (onixPlan.workEvidence.WORK_DOI');
    expect(group).toHaveTextContent('onixPlan.workType.EDITED_BOOK (onixPlan.workTypeProvenance.EXISTING_TARGET)');
    expect(group).toHaveTextContent('onixPlan.productAction.CREATE_PUBLICATION_ON_EXISTING_WORK');
    // Nothing about an existing Work is chosen here: neither its WorkType nor the file's.
    expect(screen.queryByRole('combobox', { name: /^onixPlan\.workType\./ })).not.toBeInTheDocument();
    expect(screen.getByTestId('onix-plan-blockers')).toHaveTextContent(
      'onixPlan.blocker.ATTACH_TO_EXISTING_WORK_DEFERRED (onixPlan.classification.EXECUTION_DEFERRED)',
    );
    expect(screen.getByTestId('onix-plan-status')).toHaveTextContent('onixPlan.status.blocked {"count":1}');

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'onixPlan.manifestation.acknowledge {"record":"pdf"}' }),
    );
    expect(lastDecision(onChange).manifestationChoices).toEqual({ [productKey]: 'OMIT' });
  });
});
