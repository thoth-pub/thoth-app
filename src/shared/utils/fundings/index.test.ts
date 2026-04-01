import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it } from 'vitest';

import { WorkEntity } from '@/src/entities/work/model/work.types';

import { getDefaultWork } from '../work';
import { areFundingsEqual, getDefaultFunding } from '.';

describe('areFundingsEqual', () => {
  let chapter1: WorkEntity;
  let chapter2: WorkEntity;

  beforeEach(() => {
    chapter1 = getDefaultWork({ id: faker.string.uuid() });
    chapter2 = getDefaultWork({ id: faker.string.uuid() });
  });

  it('should return true if the fundings are empty', () => {
    const areEqual = areFundingsEqual([chapter1, chapter2]);

    expect(areEqual).toBe(true);
  });

  it('should return true if the fundings are the same', () => {
    const institutionId = faker.string.uuid();
    const fundings1 = [getDefaultFunding({ id: faker.string.uuid(), institutionId })];
    const fundings2 = [getDefaultFunding({ id: faker.string.uuid(), institutionId })];
    const chapterWithFundings1 = { ...chapter1, fundings: fundings1 };
    const chapterWithFundings2 = { ...chapter2, fundings: fundings2 };

    const areEqual = areFundingsEqual([chapterWithFundings1, chapterWithFundings2]);

    expect(areEqual).toBe(true);
  });

  it('should return false if the fundings are different', () => {
    const fundings1 = [getDefaultFunding({ id: faker.string.uuid(), institutionId: faker.string.uuid() })];
    const chapterWithFundings1 = { ...chapter1, fundings: fundings1 };

    const areEqual = areFundingsEqual([chapterWithFundings1, chapter2]);

    expect(areEqual).toBe(false);
  });

  it('should return false if the fundings grant numbers are different', () => {
    const institutionId = faker.string.uuid();
    const fundings1 = [
      getDefaultFunding({ id: faker.string.uuid(), institutionId, grantNumber: faker.string.sample() }),
    ];
    const fundings2 = [getDefaultFunding({ id: faker.string.uuid(), institutionId })];
    const chapterWithFundings1 = { ...chapter1, fundings: fundings1 };
    const chapterWithFundings2 = { ...chapter2, fundings: fundings2 };

    const areEqual = areFundingsEqual([chapterWithFundings1, chapterWithFundings2]);

    expect(areEqual).toBe(false);
  });

  it('should return false if the fundings programs are different', () => {
    const institutionId = faker.string.uuid();
    const fundings1 = [getDefaultFunding({ id: faker.string.uuid(), institutionId, program: faker.string.sample() })];
    const fundings2 = [getDefaultFunding({ id: faker.string.uuid(), institutionId, program: faker.string.sample() })];
    const chapterWithFundings1 = { ...chapter1, fundings: fundings1 };
    const chapterWithFundings2 = { ...chapter2, fundings: fundings2 };

    const areEqual = areFundingsEqual([chapterWithFundings1, chapterWithFundings2]);

    expect(areEqual).toBe(false);
  });

  it('should return false if the fundings project names are different', () => {
    const institutionId = faker.string.uuid();
    const fundings1 = [
      getDefaultFunding({ id: faker.string.uuid(), institutionId, projectName: faker.string.sample() }),
    ];
    const fundings2 = [getDefaultFunding({ id: faker.string.uuid(), institutionId })];
    const chapterWithFundings1 = { ...chapter1, fundings: fundings1 };
    const chapterWithFundings2 = { ...chapter2, fundings: fundings2 };

    const areEqual = areFundingsEqual([chapterWithFundings1, chapterWithFundings2]);

    expect(areEqual).toBe(false);
  });

  it('should return false if the fundings project shortnames are different', () => {
    const institutionId = faker.string.uuid();
    const fundings1 = [
      getDefaultFunding({ id: faker.string.uuid(), institutionId, projectShortname: faker.string.sample() }),
    ];
    const fundings2 = [getDefaultFunding({ id: faker.string.uuid(), institutionId })];
    const chapterWithFundings1 = { ...chapter1, fundings: fundings1 };
    const chapterWithFundings2 = { ...chapter2, fundings: fundings2 };

    const areEqual = areFundingsEqual([chapterWithFundings1, chapterWithFundings2]);

    expect(areEqual).toBe(false);
  });

  it('should return false if some fundings institutions are different', () => {
    const institutionId1 = faker.string.uuid();
    const institutionId2 = faker.string.uuid();
    const institutionId3 = faker.string.uuid();
    const fundings1 = [
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId1 }),
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId2 }),
    ];
    const fundings2 = [
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId1 }),
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId3 }),
    ];
    const chapterWithFundings1 = { ...chapter1, fundings: fundings1 };
    const chapterWithFundings2 = { ...chapter2, fundings: fundings2 };

    const areEqual = areFundingsEqual([chapterWithFundings1, chapterWithFundings2]);

    expect(areEqual).toBe(false);
  });

  it('should return false if some fundings grant numbers are different', () => {
    const institutionId1 = faker.string.uuid();
    const institutionId2 = faker.string.uuid();
    const fundings1 = [
      getDefaultFunding({
        id: faker.string.uuid(),
        institutionId: institutionId1,
        grantNumber: faker.string.sample(),
      }),
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId2 }),
    ];
    const fundings2 = [
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId1 }),
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId2 }),
    ];
    const chapterWithFundings1 = { ...chapter1, fundings: fundings1 };
    const chapterWithFundings2 = { ...chapter2, fundings: fundings2 };

    const areEqual = areFundingsEqual([chapterWithFundings1, chapterWithFundings2]);

    expect(areEqual).toBe(false);
  });

  it('should return false if some fundings programs are different', () => {
    const institutionId1 = faker.string.uuid();
    const institutionId2 = faker.string.uuid();
    const fundings1 = [
      getDefaultFunding({
        id: faker.string.uuid(),
        institutionId: institutionId1,
        program: faker.string.sample(),
      }),
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId2 }),
    ];
    const fundings2 = [
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId1 }),
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId2 }),
    ];
    const chapterWithFundings1 = { ...chapter1, fundings: fundings1 };
    const chapterWithFundings2 = { ...chapter2, fundings: fundings2 };

    const areEqual = areFundingsEqual([chapterWithFundings1, chapterWithFundings2]);

    expect(areEqual).toBe(false);
  });

  it('should return false if some fundings project names are different', () => {
    const institutionId1 = faker.string.uuid();
    const institutionId2 = faker.string.uuid();
    const fundings1 = [
      getDefaultFunding({
        id: faker.string.uuid(),
        institutionId: institutionId1,
        projectName: faker.string.sample(),
      }),
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId2 }),
    ];
    const fundings2 = [
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId1 }),
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId2 }),
    ];
    const chapterWithFundings1 = { ...chapter1, fundings: fundings1 };
    const chapterWithFundings2 = { ...chapter2, fundings: fundings2 };

    const areEqual = areFundingsEqual([chapterWithFundings1, chapterWithFundings2]);

    expect(areEqual).toBe(false);
  });

  it('should return false if some fundings project shortnames are different', () => {
    const institutionId1 = faker.string.uuid();
    const institutionId2 = faker.string.uuid();
    const fundings1 = [
      getDefaultFunding({
        id: faker.string.uuid(),
        institutionId: institutionId1,
        projectShortname: faker.string.sample(),
      }),
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId2 }),
    ];
    const fundings2 = [
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId1 }),
      getDefaultFunding({ id: faker.string.uuid(), institutionId: institutionId2 }),
    ];
    const chapterWithFundings1 = { ...chapter1, fundings: fundings1 };
    const chapterWithFundings2 = { ...chapter2, fundings: fundings2 };

    const areEqual = areFundingsEqual([chapterWithFundings1, chapterWithFundings2]);

    expect(areEqual).toBe(false);
  });
});
