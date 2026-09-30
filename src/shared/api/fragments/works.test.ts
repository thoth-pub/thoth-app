import { describe, expect, it } from 'vitest';

import { WORK_FRAGMENT } from './works';

describe('WORK_FRAGMENT', () => {
  it('loads additional-resource dates so unrelated edits cannot clear stored dates', () => {
    const workFragment = WORK_FRAGMENT.definitions.find(
      (definition) => definition.kind === 'FragmentDefinition' && definition.name.value === 'WorkFragment',
    );

    expect(workFragment?.kind).toBe('FragmentDefinition');
    if (workFragment?.kind !== 'FragmentDefinition') {
      throw new Error('WorkFragment definition is missing');
    }

    const additionalResources = workFragment.selectionSet.selections.find(
      (selection) => selection.kind === 'Field' && selection.name.value === 'additionalResources',
    );

    expect(additionalResources?.kind).toBe('Field');
    if (additionalResources?.kind !== 'Field') {
      throw new Error('WorkFragment.additionalResources selection is missing');
    }

    expect(
      additionalResources.selectionSet?.selections.some(
        (selection) => selection.kind === 'Field' && selection.name.value === 'date',
      ),
    ).toBe(true);
  });
});
