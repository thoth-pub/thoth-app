import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { appConfig } from '@/src/shared/config';
import type { LocaleCodeType } from '@/src/shared/types';

import { AffiliationService } from '../../affiliation/api/affiliation.service';
import { ContributorService } from '../../contributor/api/contributor.service';
import { BiographyDtoMapper } from '../model/contribution.mapper';
import type { BiographyDto, BiographyEntity, WorkContribution } from '../model/contribution.types';
import { ContributionService } from './contribution.service';

describe('ContributionService', () => {
  let service: ContributionService;
  let mockGraphqlService: GraphqlService;
  let mockContributorService: ContributorService;
  let mockAffiliationService: AffiliationService;
  let mockBiographyMapper: BiographyDtoMapper;

  const createContribution = (overrides?: Partial<WorkContribution>): WorkContribution => ({
    fullName: 'John Doe',
    lastName: 'Doe',
    firstName: 'John',
    id: faker.string.uuid(),
    contributorId: faker.string.uuid(),
    type: 'AUTHOR',
    isMain: true,
    orderNumber: 1,
    biographies: [],
    orcidId: 'https://orcid.org/0000-0001-2345-6789',
    website: 'https://johndoe.com',
    affiliations: [],
    ...overrides,
  });

  const createBiography = (overrides?: Partial<BiographyEntity>): BiographyEntity => ({
    id: faker.string.uuid(),
    canonical: true,
    content: 'Biography text',
    localeCode: 'EN' as LocaleCodeType,
    contributionId: faker.string.uuid(),
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockContributorService = {
      query: vi.fn(),
      mutation: vi.fn(),
      createContributor: vi.fn(),
      getContributors: vi.fn(),
      getContributor: vi.fn(),
    } as unknown as ContributorService;

    mockAffiliationService = {
      query: vi.fn(),
      mutation: vi.fn(),
      createAffiliation: vi.fn(),
      updateAffiliation: vi.fn(),
      deleteAffiliation: vi.fn(),
    } as unknown as AffiliationService;

    mockBiographyMapper = new BiographyDtoMapper();
    vi.spyOn(mockBiographyMapper, 'toDto').mockImplementation((entity: BiographyEntity) => ({
      biographyId: entity.id,
      canonical: entity.canonical,
      content: entity.content,
      localeCode: entity.localeCode,
      contributionId: entity.contributionId,
    }));

    vi.spyOn(mockBiographyMapper, 'toEntity').mockImplementation((dto: BiographyDto) => ({
      id: dto.biographyId,
      canonical: dto.canonical,
      content: dto.content,
      localeCode: dto.localeCode,
      contributionId: dto.contributionId,
    }));

    service = new ContributionService({
      graphqlService: mockGraphqlService,
      contributorService: mockContributorService,
      affiliationService: mockAffiliationService,
      biographyDtoMapper: mockBiographyMapper,
    });
  });

  describe('createContribution', () => {
    it('should create a new contributor when contributorId is the default id', async () => {
      const contribution = createContribution({ contributorId: appConfig.defaultId });
      const newContributorId = faker.string.uuid();
      const contributionId = faker.string.uuid();

      (mockContributorService.createContributor as ReturnType<typeof vi.fn>).mockResolvedValue({ id: newContributorId });
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createContribution: { contributionId },
      });

      const result = await service.createContribution(contribution, 'work-1');

      expect(mockContributorService.createContributor).toHaveBeenCalled();
      expect(result.contributorId).toBe(newContributorId);
    });

    it('should use the existing contributorId when not the default', async () => {
      const contributorId = faker.string.uuid();
      const contribution = createContribution({ contributorId });
      const contributionId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createContribution: { contributionId },
      });

      const result = await service.createContribution(contribution, 'work-1');

      expect(mockContributorService.createContributor).not.toHaveBeenCalled();
      expect(result.contributorId).toBe(contributorId);
    });

    it('should create biographies when provided', async () => {
      const biography = createBiography();
      const contribution = createContribution({ biographies: [biography] });
      const contributionId = faker.string.uuid();
      const createdBiographyId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createContribution: { contributionId },
        createBiography: { biographyId: createdBiographyId },
      });

      const result = await service.createContribution(contribution, 'work-1');

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: expect.objectContaining({ workId: 'work-1' }) }));
      expect(result.biographies).toHaveLength(1);
    });

    it('should create affiliations when provided', async () => {
      const affiliation = { id: faker.string.uuid(), contributionId: '', locationPlatform: 'PUBLISHER_WEBSITE', canonical: true, fullTextUrl: '', landingPage: 'https://example.com' };
      const contribution = createContribution({ affiliations: [affiliation] });
      const contributionId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createContribution: { contributionId },
      });
      (mockAffiliationService.createAffiliation as ReturnType<typeof vi.fn>).mockResolvedValue({ ...affiliation, id: faker.string.uuid() });

      const result = await service.createContribution(contribution, 'work-1');

      expect(mockAffiliationService.createAffiliation).toHaveBeenCalled();
      expect(result.affiliations).toHaveLength(1);
    });

    it('should skip affiliations when none provided', async () => {
      const contribution = createContribution({ affiliations: [] });
      const contributionId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createContribution: { contributionId },
      });

      const result = await service.createContribution(contribution, 'work-1');

      expect(mockAffiliationService.createAffiliation).not.toHaveBeenCalled();
      expect(result.affiliations).toEqual([]);
    });
  });

  describe('updateContribution', () => {
    it('should call mutation with contribution data', async () => {
      const contribution = createContribution();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateContribution: { contributionId: contribution.id },
      });

      const result = await service.updateContribution(contribution, 'work-1');

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            contributionId: contribution.id,
            contributionType: contribution.type,
            workId: 'work-1',
          }),
        }),
      );
      expect(result.id).toBe(contribution.id);
    });
  });

  describe('deleteContribution', () => {
    it('should call mutation with contributionId', async () => {
      const contributionId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ deleteContribution: { contributionId } });

      await service.deleteContribution(contributionId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(expect.anything(), { contributionId });
    });
  });

  describe('moveContribution', () => {
    it('should call mutation with contributionId and newOrdinal', async () => {
      const contributionId = faker.string.uuid();
      const newOrdinal = 2;

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ moveContribution: { contributionId } });

      await service.moveContribution(contributionId, newOrdinal);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(expect.anything(), { contributionId, newOrdinal });
    });
  });

  describe('getContribution', () => {
    it('should call query with contributionId', async () => {
      const contributionId = faker.string.uuid();
      const contributionData = { contributionId, fullName: 'John Doe' };

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({ contribution: contributionData });

      const result = await service.getContribution(contributionId);

      expect(mockGraphqlService.query).toHaveBeenCalledWith(expect.anything(), { contributionId });
      expect(result).toEqual(contributionData);
    });
  });

  describe('createBiography', () => {
    it('should call mutation with biography data and PLAIN_TEXT for plain content', async () => {
      const biography = createBiography({ content: 'Plain text biography' });
      const contributionId = faker.string.uuid();
      const createdBiographyId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createBiography: { biographyId: createdBiographyId },
      });

      await service.createBiography(biography, contributionId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ contributionId }),
          markupFormat: MarkdownFormats.enum.PLAIN_TEXT,
        }),
      );
    });

    it('should detect JATS markup in biography content', async () => {
      const biography = createBiography({ content: '<italic>Italic</italic> biography' });
      const contributionId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createBiography: { biographyId: faker.string.uuid() },
      });

      await service.createBiography(biography, contributionId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ markupFormat: MarkdownFormats.enum.JATS_XML }),
      );
    });
  });

  describe('updateBiography', () => {
    it('should call mutation with all fields', async () => {
      const biography = createBiography();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateBiography: { biographyId: biography.id },
      });

      const result = await service.updateBiography(biography);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            biographyId: biography.id,
            content: biography.content,
          }),
        }),
      );
      expect(result.id).toBe(biography.id);
    });
  });

  describe('deleteBiography', () => {
    it('should call mutation with biographyId', async () => {
      const biographyId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ deleteBiography: { biographyId } });

      await service.deleteBiography(biographyId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(expect.anything(), { biographyId });
    });
  });
});
