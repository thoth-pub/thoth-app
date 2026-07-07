import { AbstractTypes } from '@/src/shared/constants/abstracts';
import type { AbstractEntity } from '@/src/shared/types';
import { isDefaultId } from '@/src/shared/utils';

type AbstractsDiff = {
  abstractsToDelete: AbstractEntity[];
  updatedAbstracts: AbstractEntity[];
  newAbstracts: AbstractEntity[];
};

/**
 * Diffs the abstracts submitted from the form against the persisted ones so that only
 * the necessary create/update/delete mutations are sent, instead of recreating
 * everything from scratch.
 *
 * One canonical abstract is allowed per type. The existing canonical one keeps its flag
 * if it survives the save; otherwise the first submitted abstract of that type is
 * designated, which also repairs works left without a canonical abstract.
 */
export const computeAbstractsDiff = (
  desiredAbstracts: AbstractEntity[],
  workAbstracts: AbstractEntity[],
): AbstractsDiff => {
  const desiredIds = desiredAbstracts.map(({ id }) => id);
  const abstractsToDelete = workAbstracts.filter(({ id }) => !desiredIds.includes(id));

  const canonicalDesignates = new Set(
    [AbstractTypes.enum.Long, AbstractTypes.enum.Short]
      .filter(
        (type) =>
          !workAbstracts.some(
            (workAbstract) =>
              workAbstract.type === type && workAbstract.canonical && desiredIds.includes(workAbstract.id),
          ),
      )
      .map((type) => desiredAbstracts.find((abstract) => abstract.type === type))
      .filter((abstract) => abstract !== undefined),
  );

  const submittedAbstracts = desiredAbstracts.map((abstract) => {
    const existingAbstract = workAbstracts.find(({ id }) => id === abstract.id);

    return {
      ...abstract,
      canonical: canonicalDesignates.has(abstract) || (existingAbstract?.canonical ?? false),
    };
  });

  const newAbstracts = submittedAbstracts.filter(({ id }) => isDefaultId(id));
  const updatedAbstracts = submittedAbstracts.filter((abstract) => {
    if (isDefaultId(abstract.id)) return false;

    const existingAbstract = workAbstracts.find(({ id }) => id === abstract.id);

    if (!existingAbstract) return true;

    return (
      existingAbstract.content !== abstract.content ||
      existingAbstract.localeCode !== abstract.localeCode ||
      existingAbstract.canonical !== abstract.canonical
    );
  });

  return { abstractsToDelete, updatedAbstracts, newAbstracts };
};
