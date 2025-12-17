import { GraphqlService, isDefaultId, QueryToken } from '@/src/shared';
import { appConfig } from '@/src/shared/config';

import { AffiliationService } from '../../affiliation/api/affiliation.service';
import { ContributorService } from '../../contributor';
import { ContributionId } from '../../contributor/model/contributor.types';
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
import { BiographyDto, BiographyEntity, WorkContribution } from '../model/contribution.types';

// TODO: create a mapper for the contribution
export class ContributionService {
  private readonly graphqlService: GraphqlService;
  private readonly contributorService: ContributorService;
  private readonly affiliationService: AffiliationService;
  private readonly biographyDtoMapper: BiographyDtoMapper;

  constructor(
    graphqlService: GraphqlService = new GraphqlService(),
    contributorService: ContributorService = new ContributorService(),
    affiliationService: AffiliationService = new AffiliationService(),
    biographyDtoMapper: BiographyDtoMapper = new BiographyDtoMapper(),
  ) {
    this.graphqlService = graphqlService;
    this.contributorService = contributorService;
    this.affiliationService = affiliationService;
    this.biographyDtoMapper = biographyDtoMapper;
  }

  async createContribution(
    token: QueryToken,
    data: WorkContribution,
    relatedWorkId: string,
  ): Promise<WorkContribution> {
    const isNewContributor = isDefaultId(data.contributorId);
    let contributorId = data.contributorId;

    if (isNewContributor) {
      const contributor = await this.contributorService.createContributor(token, {
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
      contributorId = contributor.id;
    }

    const response = await this.graphqlService.mutation(token, CREATE_CONTRIBUTION, {
      data: {
        workId: relatedWorkId,
        contributorId,
        contributionType: data.type,
        mainContribution: data.isMain,
        biography: data.biography && data.biography.length > 0 ? data.biography : null,
        firstName: data.firstName && data.firstName.length > 0 ? data.firstName : null,
        lastName: data.lastName,
        fullName: data.fullName,
        contributionOrdinal: data.orderNumber,
      },
    });
    // TODO: create biographies
    const shouldCreateAffiliations = data.affiliations.length > 0;

    const contribution = response.createContribution;

    const workContribution = {
      fullName: data.fullName,
      lastName: data.lastName,
      firstName: data.firstName,
      id: contribution.contributionId,
      contributorId,
      type: data.type,
      isMain: data.isMain,
      orderNumber: data.orderNumber,
      biography: data.biography,
      orcidId: appConfig.validations.orcidPrefix + data.orcidId,
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
      this.affiliationService.createAffiliation({ token, data: affiliation }),
    );

    const affiliations = await Promise.all(affiliationsPromises);

    return { ...workContribution, affiliations };
  }

  async updateContribution(
    token: QueryToken,
    data: WorkContribution,
    relatedWorkId: string,
  ): Promise<WorkContribution> {
    await this.graphqlService.mutation(token, UPDATE_CONTRIBUTION, {
      data: {
        contributionId: data.id,
        contributionOrdinal: data.orderNumber,
        contributionType: data.type,
        mainContribution: data.isMain,
        workId: relatedWorkId,
        contributorId: data.contributorId,
        fullName: data.fullName,
        lastName: data.lastName,
        firstName: data.firstName && data.firstName.length > 0 ? data.firstName : null,
        biography: data.biography && data.biography.length > 0 ? data.biography : null,
      },
    });

    return {
      ...data,
    };
  }

  async deleteContribution(token: QueryToken, contributionId: string): Promise<void> {
    await this.graphqlService.mutation(token, DELETE_CONTRIBUTION, { contributionId });
  }

  async moveContribution(token: QueryToken, contributionId: string, newOrdinal: number): Promise<void> {
    await this.graphqlService.mutation(token, MOVE_CONTRIBUTION, { contributionId, newOrdinal });
  }

  async createBiography(
    token: QueryToken,
    data: BiographyEntity,
    contributionId: ContributionId,
  ): Promise<BiographyEntity> {
    const {
      dto: { biographyId: _, ...dto },
      markupFormat,
    } = this.biographyDtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(token, CREATE_BIOGRAPHY, {
      data: { contributionId, ...dto },
      markupFormat,
    });

    const biography = this.biographyDtoMapper.toEntity(response.createBiography as BiographyDto);

    return biography;
  }

  async updateBiography(
    token: QueryToken,
    data: BiographyEntity,
    contributionId: ContributionId,
  ): Promise<BiographyEntity> {
    const { dto, markupFormat } = this.biographyDtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(token, UPDATE_BIOGRAPHY, {
      data: {
        contributionId,
        ...dto,
      },
      markupFormat,
    });

    const biography = this.biographyDtoMapper.toEntity(response.updateBiography as BiographyDto);

    return biography;
  }

  async deleteBiography(token: QueryToken, biographyId: string): Promise<void> {
    await this.graphqlService.mutation(token, DELETE_BIOGRAPHY, { biographyId });
  }
}
