import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it } from 'vitest';

import { WorkEntity } from '@/src/entities/work/model/work.types';

import { getDefaultContribution } from '../../constants/contributions';
import { getDefaultContributor } from '../../constants/contributors';
import { getDefaultWork } from '../work';
import { isContributorsEqual } from './isContributorsEqual';

describe('isContributorsEqual', () => {
  let chapter1: WorkEntity;
  let chapter2: WorkEntity;

  beforeEach(() => {
    chapter1 = getDefaultWork({ id: faker.string.uuid() });
    chapter2 = getDefaultWork({ id: faker.string.uuid() });
  });

  it('should return true if the contributors are empty in all chapters', () => {
    const areSame = isContributorsEqual([chapter1, chapter2]);

    expect(areSame).toBe(true);
  });

  it('should return true if the contributors are the same in all chapters', () => {
    const contributor = getDefaultContributor({ id: faker.string.uuid() });
    const contributions = [getDefaultContribution({ id: faker.string.uuid(), contributorId: contributor.id })];
    const chapter1 = getDefaultWork({
      id: faker.string.uuid(),
      contributions,
    });
    const chapter2 = getDefaultWork({ id: faker.string.uuid(), contributions });

    const areSame = isContributorsEqual([chapter1, chapter2]);

    expect(areSame).toBe(true);
  });

  it('should return false if the contributors are different in chapters', () => {
    const contributor1 = getDefaultContributor({ id: faker.string.uuid() });
    const contributor2 = getDefaultContributor({ id: faker.string.uuid() });
    const contributions1 = [getDefaultContribution({ id: faker.string.uuid(), contributorId: contributor1.id })];
    const contributions2 = [getDefaultContribution({ id: faker.string.uuid(), contributorId: contributor2.id })];
    const chapter1 = getDefaultWork({
      id: faker.string.uuid(),
      contributions: contributions1,
    });
    const chapter2 = getDefaultWork({ id: faker.string.uuid(), contributions: contributions2 });

    const areSame = isContributorsEqual([chapter1, chapter2]);

    expect(areSame).toBe(false);
  });

  it('should return false if the some contributors are different in some chapters', () => {
    const contributor1 = getDefaultContributor({ id: faker.string.uuid() });
    const contributor2 = getDefaultContributor({ id: faker.string.uuid() });
    const contributions1 = [getDefaultContribution({ id: faker.string.uuid(), contributorId: contributor1.id })];
    const contributions2 = [getDefaultContribution({ id: faker.string.uuid(), contributorId: contributor2.id })];
    const chapter1 = getDefaultWork({
      id: faker.string.uuid(),
      contributions: contributions1,
    });
    const chapter2 = getDefaultWork({ id: faker.string.uuid(), contributions: [...contributions2, ...contributions1] });

    const areSame = isContributorsEqual([chapter1, chapter2]);

    expect(areSame).toBe(false);
  });
});
