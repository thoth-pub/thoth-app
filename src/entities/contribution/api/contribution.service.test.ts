import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarkupFormat } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { appConfig } from '@/src/shared/config';
import type { LocaleCodeType } from '@/src/shared/types';

import { AffiliationService } from '../../affiliation/api/affiliation.service';
import { ContributorService } from '../../contributor/api/contributor.service';
import type { ImportContributorRegistry } from '../../work/api/importContributorRegistry';
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

    it('creates the contributor before the contribution, and cannot yet unwind it if that fails', async () => {
      // Audit evidence for the newly-created-contributor orphan (see PR "Side-effect audit"):
      // when contributorId is the default, a Contributor is created first, so a failing
      // CREATE_CONTRIBUTION leaves that Contributor behind. There is deliberately no
      // deleteContributor capability in the app, so cleanup is a documented follow-up rather than
      // part of this ordering hotfix. This test pins the sequencing and the surfaced failure the
      // WorkService rollback relies on — never a silent success.
      const contribution = createContribution({ contributorId: appConfig.defaultId });
      const newContributorId = faker.string.uuid();

      (mockContributorService.createContributor as ReturnType<typeof vi.fn>).mockResolvedValue({ id: newContributorId });
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('A contribution with this ordinal number already exists.'),
      );

      await expect(service.createContribution(contribution, 'work-1')).rejects.toThrow(
        'A contribution with this ordinal number already exists.',
      );
      // The contributor was created before the failing mutation…
      expect(mockContributorService.createContributor).toHaveBeenCalledTimes(1);
      // …and nothing deletes it: the service exposes no contributor-cleanup path to call.
      expect(mockContributorService).not.toHaveProperty('deleteContributor');
    });

    /**
     * Issue #135. A bulk import hands in a registry so that repeated occurrences of one ORCID
     * resolve to a single created contributor. It reaches this method and no further, and it is
     * the only thing about contributor creation that an import changes.
     */
    describe('with an import contributor registry', () => {
      const ORCID = 'https://orcid.org/0000-0001-6365-5189';

      it('resolves the contributor through the registry instead of creating one directly', async () => {
        const contribution = createContribution({ contributorId: appConfig.defaultId, orcidId: ORCID });
        const registry = { resolve: vi.fn().mockResolvedValue('shared-contributor') };

        (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
          createContribution: { contributionId: faker.string.uuid() },
        });

        const result = await service.createContribution(
          contribution,
          'work-1',
          registry as unknown as ImportContributorRegistry,
        );

        expect(registry.resolve).toHaveBeenCalledWith(ORCID, expect.any(Function));
        // The registry decided identity, so this call created no contributor of its own.
        expect(mockContributorService.createContributor).not.toHaveBeenCalled();
        expect(result.contributorId).toBe('shared-contributor');
      });

      it('still writes this occurrence own role, ordinal and names to the contribution', async () => {
        const contribution = createContribution({
          contributorId: appConfig.defaultId,
          orcidId: ORCID,
          type: 'EDITOR' as WorkContribution['type'],
          orderNumber: 4,
        });
        const registry = { resolve: vi.fn().mockResolvedValue('shared-contributor') };

        (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
          createContribution: { contributionId: faker.string.uuid() },
        });

        await service.createContribution(contribution, 'work-1', registry as unknown as ImportContributorRegistry);

        expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            data: expect.objectContaining({
              workId: 'work-1',
              contributorId: 'shared-contributor',
              contributionType: 'EDITOR',
              contributionOrdinal: 4,
              fullName: contribution.fullName,
            }),
          }),
        );
      });

      it('hands the registry a creation that produces the contributor it always would have', async () => {
        const contribution = createContribution({ contributorId: appConfig.defaultId, orcidId: ORCID });
        // A registry with no entry for this key runs the creation it was given.
        const registry = {
          resolve: vi.fn((_orcid: string, create: () => Promise<string>) => create()),
        };
        const newContributorId = faker.string.uuid();

        (mockContributorService.createContributor as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: newContributorId,
        });
        (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
          createContribution: { contributionId: faker.string.uuid() },
        });

        const result = await service.createContribution(
          contribution,
          'work-1',
          registry as unknown as ImportContributorRegistry,
        );

        expect(mockContributorService.createContributor).toHaveBeenCalledWith(
          expect.objectContaining({
            fullName: contribution.fullName,
            lastName: contribution.lastName,
            firstName: contribution.firstName,
            orcid: ORCID,
            website: contribution.website,
          }),
        );
        expect(result.contributorId).toBe(newContributorId);
      });

      it('never consults the registry for a contribution that already has a contributor', async () => {
        const contributorId = faker.string.uuid();
        const contribution = createContribution({ contributorId, orcidId: ORCID });
        const registry = { resolve: vi.fn() };

        (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
          createContribution: { contributionId: faker.string.uuid() },
        });

        const result = await service.createContribution(
          contribution,
          'work-1',
          registry as unknown as ImportContributorRegistry,
        );

        expect(registry.resolve).not.toHaveBeenCalled();
        expect(result.contributorId).toBe(contributorId);
      });

      it('propagates a registry rejection rather than falling back to a direct create', async () => {
        const failure = new Error('A contributor with this ORCID ID already exists.');
        const contribution = createContribution({ contributorId: appConfig.defaultId, orcidId: ORCID });
        const registry = { resolve: vi.fn().mockRejectedValue(failure) };

        await expect(
          service.createContribution(contribution, 'work-1', registry as unknown as ImportContributorRegistry),
        ).rejects.toBe(failure);
        expect(mockContributorService.createContributor).not.toHaveBeenCalled();
        expect(mockGraphqlService.mutation).not.toHaveBeenCalled();
      });
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

    it('uses the imported source format instead of sniffing the content', async () => {
      // Arc's real shape: HTML tags inside a biography. Content sniffing would call this JATS
      // and fail the API's validator; the import resolved it to HTML and that must win.
      const biography = createBiography({
        content: 'Lisa Hopkins is co-editor of <I>Shakespeare</I>.',
        sourceMarkupFormat: MarkupFormat.Html,
      });

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createBiography: { biographyId: faker.string.uuid() },
      });

      await service.createBiography(biography, faker.string.uuid());

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ markupFormat: MarkdownFormats.enum.HTML }),
      );
    });

    it('never sends the source format as a field of the biography data', async () => {
      // Through the real mapper: the source format is creation intent for the markupFormat
      // argument, not a property of the biography being created.
      const realMapperService = new ContributionService({
        graphqlService: mockGraphqlService,
        contributorService: mockContributorService,
        affiliationService: mockAffiliationService,
      });
      const biography = createBiography({ content: 'Plain', sourceMarkupFormat: MarkupFormat.PlainText });

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createBiography: { biographyId: faker.string.uuid() },
      });

      await realMapperService.createBiography(biography, faker.string.uuid());

      const [, variables] = (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mock.calls[0];

      expect(variables.data).not.toHaveProperty('sourceMarkupFormat');
      expect(variables.markupFormat).toBe(MarkdownFormats.enum.PLAIN_TEXT);
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
