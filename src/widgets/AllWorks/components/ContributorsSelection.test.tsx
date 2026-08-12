import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDefaultContribution } from '@/src/shared/constants';
import type { ContributorsForSelection, ImportPlan } from '@/src/shared/types';
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
