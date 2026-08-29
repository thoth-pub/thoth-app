import { GraphqlService } from '@/src/shared/api/graphqlService';
import { BaseService } from '@/src/shared/interfaces/services';

import { PublisherId } from '../../publisher';
import { ContributorDtoMapper } from '../model/contributor.mapper';
import {
  CREATE_CONTRIBUTOR,
  GET_CONTRIBUTOR,
  GET_CONTRIBUTORS,
  GET_CONTRIBUTORS_BY_ORCIDS,
  GET_LINKED_PUBLISHERS,
  UPDATE_CONTRIBUTOR,
} from '../model/contributor.schema';
import { ContributorDto, ContributorEntity, ContributorId } from '../model/contributor.types';

export class ContributorService extends BaseService<ContributorEntity, ContributorDto> {
  constructor(graphqlService: GraphqlService, mapper = new ContributorDtoMapper()) {
    super(graphqlService, mapper);
  }

  async getContributors(filter: string): Promise<ContributorEntity[]> {
    const { contributors = [] } = await this.graphqlService.query(GET_CONTRIBUTORS, { filter });

    const result = contributors.map(this.dtoMapper.toEntity);

    return result;
  }

  async getContributorsByOrcids(orcids: string[]): Promise<ContributorEntity[]> {
    const { contributorsByOrcids = [] } = await this.graphqlService.query(GET_CONTRIBUTORS_BY_ORCIDS, { orcids });

    return contributorsByOrcids.map(this.dtoMapper.toEntity);
  }

  async getContributor(contributorId: ContributorId): Promise<ContributorEntity> {
    const { contributor } = await this.graphqlService.query(GET_CONTRIBUTOR, { contributorId });

    const result = this.dtoMapper.toEntity(contributor as ContributorDto);

    return result;
  }

  async createContributor(data: ContributorEntity): Promise<ContributorEntity> {
    const { contributorId, fullName, lastName, orcid, website, firstName } = this.dtoMapper.toDto(data);

    const { createContributor } = await this.graphqlService.mutation(CREATE_CONTRIBUTOR, {
      data: {
        contributorId,
        firstName: firstName ? firstName : null,
        fullName: fullName ? fullName : '',
        lastName: lastName ? lastName : '',
        orcid: orcid,
        website: website ? website : null,
      },
    });

    const result = this.dtoMapper.toEntity(createContributor as ContributorDto);

    return result;
  }

  async updateContributor(data: ContributorEntity): Promise<ContributorEntity> {
    const { contributorId, fullName, lastName, orcid, ...dto } = this.dtoMapper.toDto(data);

    const { updateContributor } = await this.graphqlService.mutation(UPDATE_CONTRIBUTOR, {
      data: {
        ...dto,
        contributorId: contributorId ?? '',
        fullName: fullName ?? '',
        lastName: lastName ?? '',
        orcid,
      },
    });

    const result = this.dtoMapper.toEntity(updateContributor as ContributorDto);

    return result;
  }

  async getLinkedPublishers(contributorId: ContributorId): Promise<PublisherId[]> {
    let shouldContinue = true;
    let offset = 0;
    const limit = this.limit;
    const ids: PublisherId[] = [];

    do {
      const { contributor } = await this.graphqlService.query(GET_LINKED_PUBLISHERS, { contributorId, offset, limit });

      const newIds = contributor.contributions.map((contribution) => contribution.work.imprint.publisherId);

      ids.push(...newIds);

      offset += this.limit;
      shouldContinue = newIds.length > 0;
    } while (shouldContinue);

    return ids;
  }
}
