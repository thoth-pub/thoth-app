import { describe, expect, it } from 'vitest';

import { ContributorDtoMapper } from './contributor.mapper';
import type { ContributorDto } from './contributor.types';

/**
 * The latest-contribution hint is optional presentation metadata: a matched contributor whose
 * historical work carries zero titles, or none marked canonical, must still map to a complete
 * identity result. The deprecated Work.title projection used to turn exactly that data state
 * into a whole-lookup EntityNotFound rejection (issue #107).
 */
describe('ContributorDtoMapper', () => {
  const mapper = new ContributorDtoMapper();

  const dto = (contributions: ContributorDto['contributions'], overrides?: Partial<ContributorDto>): ContributorDto => ({
    contributorId: 'contributor-1',
    fullName: 'Jane Doe',
    lastName: 'Doe',
    firstName: 'Jane',
    orcid: 'https://orcid.org/0000-0001-2345-6789',
    website: 'https://example.com',
    updatedAt: '2024-01-01T00:00:00Z',
    contributions,
    ...overrides,
  });

  it('maps identity fields for a contributor with a canonical latest title', () => {
    const entity = mapper.toEntity(
      dto([{ work: { titles: [{ canonical: true, title: 'An Earlier Book' }] } }]),
    );

    expect(entity).toEqual({
      id: 'contributor-1',
      name: 'Jane Doe',
      fullName: 'Jane Doe',
      firstName: 'Jane',
      lastName: 'Doe',
      orcid: '0000-0001-2345-6789',
      website: 'https://example.com',
      updatedAt: '2024-01-01T00:00:00Z',
      lastContributionTitle: 'An Earlier Book',
    });
  });

  it('keeps the identity and omits the hint for a contributor with zero contributions', () => {
    const entity = mapper.toEntity(dto([]));

    expect(entity.id).toBe('contributor-1');
    expect(entity.fullName).toBe('Jane Doe');
    expect(entity.lastContributionTitle).toBe('');
  });

  it('does not fail when the latest work holds zero titles', () => {
    const entity = mapper.toEntity(dto([{ work: { titles: [] } }]));

    expect(entity.id).toBe('contributor-1');
    expect(entity.lastContributionTitle).toBe('');
  });

  it('does not fail when the latest work has titles but none is canonical', () => {
    const entity = mapper.toEntity(
      dto([{ work: { titles: [{ canonical: false, title: 'A Translated Title' }] } }]),
    );

    expect(entity.id).toBe('contributor-1');
    expect(entity.lastContributionTitle).toBe('');
  });

  it('selects the canonical title even when it is not first in the list', () => {
    const entity = mapper.toEntity(
      dto([
        {
          work: {
            titles: [
              { canonical: false, title: 'Uma Tradução' },
              { canonical: true, title: 'The Canonical Title' },
            ],
          },
        },
      ]),
    );

    expect(entity.lastContributionTitle).toBe('The Canonical Title');
  });

  it('tolerates a missing titles list in an unexpected nested response', () => {
    const entity = mapper.toEntity(dto([{ work: {} as { titles: [] } }]));

    expect(entity.id).toBe('contributor-1');
    expect(entity.lastContributionTitle).toBe('');
  });

  it('maps an absent ORCID to an empty string', () => {
    const entity = mapper.toEntity(dto([], { orcid: undefined }));

    expect(entity.orcid).toBe('');
  });
});
