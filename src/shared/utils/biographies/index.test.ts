import { describe, expect, it } from 'vitest';

import type { BiographyEntity } from '@/src/entities/contribution/model/contribution.types';

import { computeBiographiesDiff } from '.';

const canonicalBiography = {
  id: 'bio-1',
  canonical: true,
  content: 'An author biography.',
  localeCode: 'EN',
  contributionId: 'contribution-1',
} as BiographyEntity;

const otherBiography = {
  id: 'bio-2',
  canonical: false,
  content: 'Eine Autorenbiografie.',
  localeCode: 'DE',
  contributionId: 'contribution-1',
} as BiographyEntity;

const existingBiographies = [canonicalBiography, otherBiography];

describe('computeBiographiesDiff', () => {
  it('returns no mutations when nothing changed', () => {
    const diff = computeBiographiesDiff(
      existingBiographies.map((biography) => ({ ...biography, canonical: false })),
      existingBiographies,
    );

    expect(diff.biographiesToDelete).toEqual([]);
    expect(diff.updatedBiographies).toEqual([]);
    expect(diff.newBiographies).toEqual([]);
    expect(diff.unchangedBiographies).toHaveLength(2);
  });

  it('updates only the edited biography, preserving its canonical flag', () => {
    const diff = computeBiographiesDiff(
      [
        { ...canonicalBiography, canonical: false, content: 'A rewritten biography.' },
        { ...otherBiography, canonical: false },
      ],
      existingBiographies,
    );

    expect(diff.biographiesToDelete).toEqual([]);
    expect(diff.newBiographies).toEqual([]);
    expect(diff.updatedBiographies).toEqual([
      expect.objectContaining({ id: 'bio-1', content: 'A rewritten biography.', canonical: true }),
    ]);
  });

  it('deletes a removed biography and promotes the first kept one when the canonical one goes', () => {
    const diff = computeBiographiesDiff([{ ...otherBiography, canonical: false }], existingBiographies);

    expect(diff.biographiesToDelete).toEqual([canonicalBiography]);
    expect(diff.updatedBiographies).toEqual([expect.objectContaining({ id: 'bio-2', canonical: true })]);
    expect(diff.newBiographies).toEqual([]);
  });

  it('creates a new biography as non-canonical when the canonical one survives', () => {
    const newBiography = {
      id: '0000-0000-0000-0000-1',
      canonical: false,
      content: 'Una biografía.',
      localeCode: 'ES',
      contributionId: 'contribution-1',
    } as BiographyEntity;

    const diff = computeBiographiesDiff(
      [{ ...canonicalBiography, canonical: false }, { ...otherBiography, canonical: false }, newBiography],
      existingBiographies,
    );

    expect(diff.updatedBiographies).toEqual([]);
    expect(diff.newBiographies).toEqual([expect.objectContaining({ localeCode: 'ES', canonical: false })]);
  });

  it('designates the first new biography as canonical when none exists', () => {
    const newBiography = {
      id: '0000-0000-0000-0000-1',
      canonical: false,
      content: 'A first biography.',
      localeCode: 'EN',
      contributionId: 'contribution-1',
    } as BiographyEntity;

    const diff = computeBiographiesDiff([newBiography], []);

    expect(diff.newBiographies).toEqual([expect.objectContaining({ canonical: true })]);
  });
});
