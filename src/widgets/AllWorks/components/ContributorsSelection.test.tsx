import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDefaultContribution, PublicationType, WorkTypes } from '@/src/shared/constants';
import type {
  ContributorsForSelection,
  ImportPlan,
  OnixImportPlanSidecar,
  OnixPlannedProduct,
  OnixPlannedWorkGroup,
} from '@/src/shared/types';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

import { ContributorsSelection } from './ContributorsSelection';

/**
 * Contributor resolution is the one stage that rewrites the plan, so it is also the one that
 * could quietly damage it. What it may change is a work's contributions; what it may not change
 * is which works the import holds, what they are called, or where they sit in it.
 */
describe('ContributorsSelection', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(cleanup);

  const workWithTitle = (id: string, title: string) => ({
    ...getDefaultWork({ id }),
    titles: [getDefaultTitle({ id: `${id}-title`, title, fullTitle: title, canonical: true })],
  });

  const contribution = (contributorId: string, fullName: string) =>
    getDefaultContribution({ contributorId, fullName, firstName: fullName, lastName: fullName });

  /** Two candidates for one contributor: the one the file names, and one Thoth already has. */
  const choicesFor = (workId: string, existingId: string): ContributorsForSelection => ({
    [workId]: {
      'item-1': [
        { ...contribution('00000000-0000-0000-0000-000000000000', 'Jane Doe'), selected: true, lastContribution: '' },
        { ...contribution(existingId, 'Jane Doe'), selected: false, lastContribution: 'Some Book' },
      ],
    },
  });

  const planOf = (works: ImportPlan['works'], chapters: ImportPlan['chapters'] = []): ImportPlan => ({
    works,
    chapters,
    series: [
      {
        name: 'Arc Companions',
        target: { kind: 'existing', seriesId: 'series-1' },
        members: works.map((work, index) => ({ workId: work.id, orderNumber: index + 1 })),
      },
    ],
  });

  /**
   * An ONIX planning sidecar for two new Works and one Product already in Thoth, in the shape the resolver
   * writes it. Only its identity matters here, so everything else about it is as small as the type allows.
   */
  const planningSidecarFor = (works: ImportPlan['works']): OnixImportPlanSidecar => {
    const [first, second] = works;
    const isbns = ['9781800000018', '9781800000025', '9781800000032'];
    const product = (isbn: string, action: OnixPlannedProduct['action']): OnixPlannedProduct => ({
      productKey: `product:gtin13:${isbn}`,
      recordKeys: [`record:this-file:${isbn}`],
      groupKey: `work:product:gtin13:${isbn}`,
      isbn,
      manifestation: {
        kind: 'RESOLVED',
        type: PublicationType.enum.Paperback,
        classification: 'SUPPORTED_LOSSLESS',
        notes: [],
      },
      publicationType: action === 'CREATE_PUBLICATION' ? PublicationType.enum.Paperback : null,
      action,
      evidence: [],
      executable: true,
    });
    const group = (isbn: string, plannedWorkId: string): OnixPlannedWorkGroup => ({
      groupKey: `work:product:gtin13:${isbn}`,
      productKeys: [`product:gtin13:${isbn}`],
      compatibility: 'GENERIC',
      thothVerification: 'NOT_APPLICABLE',
      target: 'NEW_WORK',
      existingWorkId: null,
      evidence: [{ kind: 'NO_TARGET_MATCH' }],
      plannedWorkId,
      workType: { status: 'RESOLVED', type: WorkTypes.enum.Monograph, provenance: 'USER_FILE_DEFAULT' },
      edition: { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' },
      workDoi: { kind: 'NONE' },
      executable: true,
    });

    return {
      kind: 'onix',
      version: 1,
      header: { senderName: null, senderEmail: null, senderIdentifiers: [], authority: 'this-file' },
      compatibility: {
        version: 'thoth-onix-3-canonical-v1',
        headerMatches: false,
        ignoredNativeRecordKeys: [],
        activation: 'NOT_APPLICABLE',
      },
      records: [],
      products: [
        product(isbns[0], 'CREATE_PUBLICATION'),
        product(isbns[1], 'ALREADY_PRESENT'),
        product(isbns[2], 'CREATE_PUBLICATION'),
      ],
      workGroups: [group(isbns[0], first.id), group(isbns[2], second.id)],
      inputs: {
        fileWorkType: WorkTypes.enum.Monograph,
        workTypeOverrides: {},
        manifestationChoices: {},
        editionInputs: {},
        excludedRecordKeys: [],
        thothCompatibilityConfirmed: false,
        descriptiveChoices: {},
      },
      blockers: [],
      executable: true,
      descriptive: {
        findings: [],
        compatibility: [],
        contributorIntents: works.flatMap(({ id, contributions }) =>
          contributions.length === 0 ? [] : [{ workId: id, key: 'item-1', ordinals: contributions.map(({ orderNumber }) => orderNumber) }],
        ),
        statedCounts: [],
      },
    };
  };

  const chooseExisting = async () => {
    const [, existing] = screen.getAllByRole('radio');

    await userEvent.click(existing);
    await userEvent.click(screen.getByRole('button', { name: 'preview' }));
  };

  it('hands back one plan with the choice applied to the work it belongs to', async () => {
    const works = [workWithTitle('work-1', 'First'), workWithTitle('work-2', 'Second')];
    const plan = planOf(works);
    const onPreview = vi.fn();

    render(
      <ContributorsSelection contributors={choicesFor('work-2', 'contributor-9')} plan={plan} onPreview={onPreview} />,
    );

    await chooseExisting();

    expect(onPreview).toHaveBeenCalledTimes(1);

    const [updated] = onPreview.mock.calls[0] as [ImportPlan];

    expect(updated.works[1].contributions.map(({ contributorId }) => contributorId)).toEqual(['contributor-9']);
    // The work that had nothing to resolve is untouched, object identity and all.
    expect(updated.works[0]).toBe(works[0]);
  });

  it('offers a hintless existing contributor as a full candidate, with no latest-contribution line', async () => {
    // Issue #107: the latest-contribution hint is optional presentation metadata. A candidate
    // that arrives without one keeps its identity, its radio, and its effect on the plan.
    const works = [workWithTitle('work-1', 'First')];
    const onPreview = vi.fn();
    const contributors: ContributorsForSelection = {
      'work-1': {
        'item-1': [
          {
            ...contribution('00000000-0000-0000-0000-000000000000', 'Jane Doe'),
            selected: true,
            lastContribution: '',
          },
          { ...contribution('hinted-id', 'Jane Doe'), selected: false, lastContribution: 'Some Book' },
          { ...contribution('hintless-id', 'Jane Doe'), selected: false, lastContribution: '' },
        ],
      },
    };

    render(<ContributorsSelection contributors={contributors} plan={planOf(works)} onPreview={onPreview} />);

    // Exactly one candidate shows the hint; the hintless one renders no latest-contribution line.
    expect(screen.getAllByText(/latest contribution to/)).toHaveLength(1);
    expect(screen.getByText(/Some Book/)).toBeInTheDocument();
    // Identity information is still present for every candidate: one create-new label and two
    // existing-record names.
    expect(screen.getAllByText('Jane Doe', { exact: false }).length).toBeGreaterThanOrEqual(2);

    const radios = screen.getAllByRole('radio');

    expect(radios).toHaveLength(3);

    await userEvent.click(radios[2]);
    await userEvent.click(screen.getByRole('button', { name: 'preview' }));

    const [updated] = onPreview.mock.calls[0] as [ImportPlan];

    // Choosing the hintless candidate resolves the contribution exactly like any other choice.
    expect(updated.works[0].contributions.map(({ contributorId }) => contributorId)).toEqual(['hintless-id']);
  });

  it('keeps works in their source order when only a middle work has choices', async () => {
    const works = [
      workWithTitle('work-1', 'First'),
      workWithTitle('work-2', 'Second'),
      workWithTitle('work-3', 'Third'),
    ];
    const onPreview = vi.fn();

    render(
      <ContributorsSelection
        contributors={choicesFor('work-2', 'contributor-9')}
        plan={planOf(works)}
        onPreview={onPreview}
      />,
    );

    await chooseExisting();

    const [updated] = onPreview.mock.calls[0] as [ImportPlan];

    // Resolving a contributor used to move that work to the end of the import.
    expect(updated.works.map((work) => work.id)).toEqual(['work-1', 'work-2', 'work-3']);
    expect(updated.works.map((work) => work.titles[0].title)).toEqual(['First', 'Second', 'Third']);
  });

  it("applies a chapter's choice to that chapter, and leaves the works alone", async () => {
    const works = [workWithTitle('work-1', 'First')];
    const chapters = [
      { ...workWithTitle('chapter-1', 'Chapter one'), relationId: 'work-1' },
      { ...workWithTitle('chapter-2', 'Chapter two'), relationId: 'work-1' },
    ];
    const onPreview = vi.fn();

    render(
      <ContributorsSelection
        contributors={choicesFor('chapter-2', 'contributor-9')}
        plan={planOf(works, chapters)}
        onPreview={onPreview}
      />,
    );

    await chooseExisting();

    const [updated] = onPreview.mock.calls[0] as [ImportPlan];

    expect(updated.chapters.map((chapter) => chapter.id)).toEqual(['chapter-1', 'chapter-2']);
    expect(updated.chapters[1].contributions.map(({ contributorId }) => contributorId)).toEqual(['contributor-9']);
    expect(updated.chapters[0]).toBe(chapters[0]);
    expect(updated.works).toEqual(works);
  });

  it('leaves ids and the series plan exactly as it found them', async () => {
    const works = [workWithTitle('work-1', 'First'), workWithTitle('work-2', 'Second')];
    const plan = planOf(works);
    const onPreview = vi.fn();

    render(
      <ContributorsSelection contributors={choicesFor('work-2', 'contributor-9')} plan={plan} onPreview={onPreview} />,
    );

    await chooseExisting();

    const [updated] = onPreview.mock.calls[0] as [ImportPlan];

    expect(updated.works.map((work) => work.id)).toEqual(plan.works.map((work) => work.id));
    // Membership is by work id, so nothing here can disturb it — same object, same ordinals.
    expect(updated.series).toBe(plan.series);
    expect(updated.series[0].members).toEqual([
      { workId: 'work-1', orderNumber: 1 },
      { workId: 'work-2', orderNumber: 2 },
    ]);
  });

  it('passes the plan straight through when there is nothing to resolve', async () => {
    const works = [workWithTitle('work-1', 'First')];
    const plan = planOf(works);
    const onPreview = vi.fn();

    render(<ContributorsSelection contributors={{}} plan={plan} onPreview={onPreview} />);

    await userEvent.click(screen.getByRole('button', { name: 'preview' }));

    const [updated] = onPreview.mock.calls[0] as [ImportPlan];

    expect(updated.works).toEqual(plan.works);
    expect(updated.chapters).toEqual(plan.chapters);
    expect(updated.series).toBe(plan.series);
  });

  /**
   * thoth-app#182: an ONIX plan reaches this step carrying its planning sidecar - every record, Product and
   * Work group, the action each resolved to and the decisions behind it. Resolving a contributor changes a
   * Work's contributions, never that record of what the import is.
   */
  it('hands on the ONIX planning sidecar untouched, still naming every Work id, Product key and action', async () => {
    const works = [
      workWithTitle('work-1', 'First'),
      { ...workWithTitle('work-2', 'Second'), contributions: [contribution('00000000-0000-0000-0000-000000000000', 'Jane Doe')] },
    ];
    const sidecar = planningSidecarFor(works);
    const plan: ImportPlan = { ...planOf(works), onix: sidecar };
    const onPreview = vi.fn();

    render(
      <ContributorsSelection contributors={choicesFor('work-2', 'contributor-9')} plan={plan} onPreview={onPreview} />,
    );

    await chooseExisting();

    const [updated] = onPreview.mock.calls[0] as [ImportPlan];

    expect(updated.works[1].contributions.map(({ contributorId }) => contributorId)).toEqual(['contributor-9']);
    expect(updated.onix).toBe(sidecar);
    expect(updated.onix?.workGroups.map(({ plannedWorkId }) => plannedWorkId)).toEqual(
      updated.works.map(({ id }) => id),
    );
    expect(updated.onix?.products.map(({ productKey, groupKey, action }) => [productKey, groupKey, action])).toEqual([
      ['product:gtin13:9781800000018', 'work:product:gtin13:9781800000018', 'CREATE_PUBLICATION'],
      ['product:gtin13:9781800000025', 'work:product:gtin13:9781800000025', 'ALREADY_PRESENT'],
      ['product:gtin13:9781800000032', 'work:product:gtin13:9781800000032', 'CREATE_PUBLICATION'],
    ]);
  });

  describe('an ONIX plan', () => {
    const NEW_CONTRIBUTOR = '00000000-0000-0000-0000-000000000000';

    /** Ada edits and translates the Work (one source contributor, two contributions); Charles writes it. */
    const planned = () => {
      const ada = (orderNumber: number, type: 'EDITOR' | 'TRANSLATOR') =>
        getDefaultContribution({
          contributorId: NEW_CONTRIBUTOR,
          fullName: 'Ada Lovelace',
          firstName: 'Ada',
          lastName: 'Lovelace',
          type: type as never,
          orderNumber,
          website: 'https://ada.example',
          biographies: [{ id: 'b', canonical: true, content: 'A mathematician.', localeCode: 'EN' as never, contributionId: 'c' }],
        });
      const work = {
        ...workWithTitle('work-1', 'First'),
        contributions: [
          ada(1, 'EDITOR'),
          ada(2, 'TRANSLATOR'),
          getDefaultContribution({ contributorId: NEW_CONTRIBUTOR, fullName: 'Charles Babbage', orderNumber: 3 }),
        ],
      };
      const sidecar = planningSidecarFor([work, workWithTitle('work-2', 'Second')]);

      return {
        work,
        plan: {
          ...planOf([work]),
          onix: {
            ...sidecar,
            descriptive: {
              ...sidecar.descriptive,
              contributorIntents: [
                { workId: 'work-1', key: 'intent-ada', ordinals: [1, 2] },
                { workId: 'work-1', key: 'intent-charles', ordinals: [3] },
              ],
            },
          },
        } satisfies ImportPlan,
      };
    };

    const adaChoices: ContributorsForSelection = {
      'work-1': {
        'intent-ada': [
          { ...getDefaultContribution({ contributorId: NEW_CONTRIBUTOR, fullName: 'Ada Lovelace', orderNumber: 1 }), selected: true, lastContribution: '' },
          {
            ...getDefaultContribution({ contributorId: 'existing-ada', fullName: 'Augusta Ada King', orderNumber: 1, orcidId: 'https://orcid.org/0000-0001-6365-5189' }),
            selected: false,
            lastContribution: 'Notes',
          },
        ],
      },
    };

    it('points every contribution of the chosen source contributor at the chosen identity, and changes nothing else', async () => {
      const { work, plan } = planned();
      const onPreview = vi.fn();

      render(<ContributorsSelection contributors={adaChoices} plan={plan} onPreview={onPreview} />);
      await chooseExisting();

      const [updated] = onPreview.mock.calls[0] as [ImportPlan];

      expect(updated.works[0].contributions).toEqual([
        { ...work.contributions[0], contributorId: 'existing-ada', orcidId: 'https://orcid.org/0000-0001-6365-5189', website: '' },
        { ...work.contributions[1], contributorId: 'existing-ada', orcidId: 'https://orcid.org/0000-0001-6365-5189', website: '' },
        work.contributions[2],
      ]);
      expect(updated.onix).toBe(plan.onix);
    });

    it('keeps the planned contributions exactly when the planned identity stays chosen', async () => {
      const { work, plan } = planned();
      const onPreview = vi.fn();

      render(<ContributorsSelection contributors={adaChoices} plan={plan} onPreview={onPreview} />);
      await userEvent.click(screen.getByRole('button', { name: 'preview' }));

      const [updated] = onPreview.mock.calls[0] as [ImportPlan];

      expect(updated.works[0].contributions).toEqual(work.contributions);
    });
  });

  /**
   * A contributor's ordinal is a property of the source contributor, not of the identity the user
   * picks for it. These cases prove selection preserves the ordinals the parser resolved, whatever
   * choice is made and in whatever order the choices are enumerated.
   */
  describe('preserves resolved contribution ordinals', () => {
    /** One selection item: a create-new default and one existing match, both at the same ordinal. */
    const itemFor = (name: string, existingId: string, orderNumber: number) => [
      {
        ...getDefaultContribution({ contributorId: '00000000-0000-0000-0000-000000000000', fullName: name, orderNumber }),
        selected: true,
        lastContribution: '',
      },
      {
        ...getDefaultContribution({ contributorId: existingId, fullName: name, orderNumber }),
        selected: false,
        lastContribution: 'Some Book',
      },
    ];

    /** Lisa at ordinal 1 and Tom at ordinal 2, each with a create-new and an existing option. */
    const twoContributorChoices = (workId: string): ContributorsForSelection => ({
      [workId]: {
        'item-lisa': itemFor('Lisa Hopkins', 'existing-lisa', 1),
        'item-tom': itemFor('Tom Rutter', 'existing-tom', 2),
      },
    });

    /** The applied plan's contributions as `[fullName, orderNumber]`, and their invariant. */
    const appliedOrdinals = (plan: ImportPlan) => {
      const ordinals = plan.works[0].contributions.map(({ orderNumber }) => orderNumber);

      expect(new Set(ordinals).size).toBe(ordinals.length);
      expect(ordinals.every((ordinal) => ordinal >= 1)).toBe(true);

      return plan.works[0].contributions.map(({ fullName, orderNumber }) => [fullName, orderNumber] as const);
    };

    it('keeps ordinals 1 and 2 when an existing record is chosen for the second contributor', async () => {
      const works = [workWithTitle('work-1', 'First')];
      const onPreview = vi.fn();

      render(
        <ContributorsSelection contributors={twoContributorChoices('work-1')} plan={planOf(works)} onPreview={onPreview} />,
      );

      // Two radio groups; pick the existing record (second radio) of Tom's group only.
      const radios = screen.getAllByRole('radio');
      // Groups render in insertion order: [Lisa create, Lisa existing, Tom create, Tom existing].
      await userEvent.click(radios[3]);
      await userEvent.click(screen.getByRole('button', { name: 'preview' }));

      const [updated] = onPreview.mock.calls[0] as [ImportPlan];

      expect(appliedOrdinals(updated)).toEqual([
        ['Lisa Hopkins', 1],
        ['Tom Rutter', 2],
      ]);
      // Lisa stayed the new contributor; Tom became the chosen existing record — ordinals intact.
      expect(updated.works[0].contributions.map(({ contributorId }) => contributorId)).toEqual([
        '00000000-0000-0000-0000-000000000000',
        'existing-tom',
      ]);
    });

    it('keeps ordinals 1 and 2 when both contributors keep their create-new default', async () => {
      const works = [workWithTitle('work-1', 'First')];
      const onPreview = vi.fn();

      render(
        <ContributorsSelection contributors={twoContributorChoices('work-1')} plan={planOf(works)} onPreview={onPreview} />,
      );

      await userEvent.click(screen.getByRole('button', { name: 'preview' }));

      const [updated] = onPreview.mock.calls[0] as [ImportPlan];

      expect(appliedOrdinals(updated)).toEqual([
        ['Lisa Hopkins', 1],
        ['Tom Rutter', 2],
      ]);
    });
  });
});
