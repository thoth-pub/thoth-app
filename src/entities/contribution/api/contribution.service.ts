import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { isDefaultId, isTextContainsAnyMarkdownTag } from '@/src/shared/utils';
import { normalizedOrcidId } from '@/src/shared/utils/helpers/normalizedOrcidId';
import { emptyToNull } from '@/src/shared/utils/strings';

import { AffiliationService } from '../../affiliation/api/affiliation.service';
import { ContributorService } from '../../contributor';
import { ContributionId } from '../../contributor/model/contributor.types';
import type { ImportContributorRegistry } from '../../work/api/importContributorRegistry';
import { BiographyDtoMapper } from '../model/contribution.mapper';
import {
  CREATE_BIOGRAPHY,
  CREATE_CONTRIBUTION,
  DELETE_BIOGRAPHY,
  DELETE_CONTRIBUTION,
  MOVE_CONTRIBUTION,
  UPDATE_BIOGRAPHY,
  UPDATE_CONTRIBUTION,
} from '../model/contribution.mutations';
import { GET_CONTRIBUTION_BIOGRAPHIES } from '../model/contribution.schema';
import { BiographyDto, BiographyEntity, WorkContribution } from '../model/contribution.types';

type ContributionServiceDependencies = {
  graphqlService: GraphqlService;
  contributorService: ContributorService;
  affiliationService: AffiliationService;
  biographyDtoMapper?: BiographyDtoMapper;
};
export class ContributionService {
  private readonly graphqlService: GraphqlService;
  private readonly contributorService: ContributorService;
  private readonly affiliationService: AffiliationService;
  private readonly biographyDtoMapper: BiographyDtoMapper;

  constructor({
    graphqlService,
    contributorService,
    affiliationService,
    biographyDtoMapper = new BiographyDtoMapper(),
  }: Readonly<ContributionServiceDependencies>) {
    this.graphqlService = graphqlService;
    this.contributorService = contributorService;
    this.affiliationService = affiliationService;
    this.biographyDtoMapper = biographyDtoMapper;
  }

  /**
   * Creates one contribution, and the contributor behind it when the plan still carries the
   * new-contributor sentinel.
   *
   * `contributorRegistry` is supplied only by a bulk import, and only so that repeated
   * occurrences of one ORCID inside that import resolve to a single created contributor rather
   * than colliding on the backend's ORCID uniqueness constraint (issue #135). Without it — every
   * ordinary, non-import call — this behaves exactly as it always has, creating a contributor per
   * new-contributor contribution.
   *
   * Everything the source said about *this* occurrence is unaffected either way: role, ordinal,
   * main flag, names, biographies and affiliations are still written from `data`. Only which
   * contributor the contribution points at can be shared.
   */
  async createContribution(
    data: WorkContribution,
    relatedWorkId: string,
    contributorRegistry?: ImportContributorRegistry,
  ): Promise<WorkContribution> {
    const isNewContributor = isDefaultId(data.contributorId);
    let contributorId = data.contributorId;

    if (isNewContributor) {
      const createContributor = async () => {
        const contributor = await this.contributorService.createContributor({
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: data.fullName,
          orcid: data.orcidId,
          website: data.website,
          lastContributionTitle: '',
          id: data.contributorId,
          name: data.fullName,
          updatedAt: '',
        });

        return contributor.id;
      };

      contributorId = await (contributorRegistry
        ? contributorRegistry.resolve(data.orcidId, createContributor)
        : createContributor());
    }

    const response = await this.graphqlService.mutation(CREATE_CONTRIBUTION, {
      data: {
        workId: relatedWorkId,
        contributorId,
        contributionType: data.type,
        mainContribution: data.isMain,
        firstName: emptyToNull(data.firstName),
        lastName: data.lastName,
        fullName: data.fullName,
        contributionOrdinal: data.orderNumber,
      },
    });

    const shouldCreateAffiliations = data.affiliations.length > 0;

    const contribution = response.createContribution;

    const biographiesPromises = data.biographies.map((biography) =>
      this.createBiography(biography, contribution.contributionId),
    );

    const biographies = await Promise.all(biographiesPromises);

    const workContribution = {
      fullName: data.fullName,
      lastName: data.lastName,
      firstName: data.firstName,
      id: contribution.contributionId,
      contributorId,
      type: data.type,
      isMain: data.isMain,
      orderNumber: data.orderNumber,
      biographies,
      orcidId: normalizedOrcidId(data.orcidId) ?? '',
      website: data.website,
      affiliations: [],
    };

    if (!shouldCreateAffiliations) return workContribution;

    const updatedAffiliations = data.affiliations.map((affiliation, index) => ({
      ...affiliation,
      contributionId: contribution.contributionId,
      orderNumber: index + 1,
    }));

    const affiliationsPromises = updatedAffiliations.map((affiliation) =>
      this.affiliationService.createAffiliation(affiliation),
    );

    const affiliations = await Promise.all(affiliationsPromises);

    return { ...workContribution, affiliations };
  }

  async updateContribution(data: WorkContribution, relatedWorkId: string): Promise<WorkContribution> {
    await this.graphqlService.mutation(UPDATE_CONTRIBUTION, {
      data: {
        contributionId: data.id,
        contributionOrdinal: data.orderNumber,
        contributionType: data.type,
        mainContribution: data.isMain,
        workId: relatedWorkId,
        contributorId: data.contributorId,
        fullName: data.fullName,
        lastName: data.lastName,
        firstName: emptyToNull(data.firstName),
      },
    });

    return {
      ...data,
    };
  }

  async deleteContribution(contributionId: string): Promise<void> {
    await this.graphqlService.mutation(DELETE_CONTRIBUTION, { contributionId });
  }

  async moveContribution(contributionId: string, newOrdinal: number): Promise<void> {
    await this.graphqlService.mutation(MOVE_CONTRIBUTION, { contributionId, newOrdinal });
  }

  async getContribution(contributionId: string) {
    const response = await this.graphqlService.query(GET_CONTRIBUTION_BIOGRAPHIES, { contributionId });

    return response.contribution;
  }

  async createBiography(data: BiographyEntity, contributionId: ContributionId): Promise<BiographyEntity> {
    const { biographyId: _, contributionId: _contributionId, ...dto } = this.biographyDtoMapper.toDto(data);
    // An imported biography knows what format its source declared; content sniffing is only for
    // entities that carry no such provenance, i.e. everything created in the editor.
    const markupFormat =
      data.sourceMarkupFormat ??
      (isTextContainsAnyMarkdownTag(data.content) ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT);

    const response = await this.graphqlService.mutation(CREATE_BIOGRAPHY, {
      data: { contributionId, ...dto },
      markupFormat,
    });

    const biography = this.biographyDtoMapper.toEntity(response.createBiography as BiographyDto);

    return biography;
  }

  async updateBiography(data: BiographyEntity): Promise<BiographyEntity> {
    const dto = this.biographyDtoMapper.toDto(data);
    const markupFormat = isTextContainsAnyMarkdownTag(data.content)
      ? MarkdownFormats.enum.JATS_XML
      : MarkdownFormats.enum.PLAIN_TEXT;

    const response = await this.graphqlService.mutation(UPDATE_BIOGRAPHY, {
      data: {
        ...dto,
      },
      markupFormat,
    });

    const biography = this.biographyDtoMapper.toEntity(response.updateBiography as BiographyDto);

    return biography;
  }

  async deleteBiography(biographyId: string): Promise<void> {
    await this.graphqlService.mutation(DELETE_BIOGRAPHY, { biographyId });
  }
}
