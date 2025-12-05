import { BaseService } from '@/src/shared/interfaces/services';

import { ContributorDto, ContributorEntity, ContributorId } from '../model/contributor.types';
import {
  CREATE_CONTRIBUTOR,
  GET_CONTRIBUTOR,
  GET_CONTRIBUTORS,
  GET_LINKED_PUBLISHERS,
  UPDATE_CONTRIBUTOR,
} from '../model/contributor.schema';
import { ContributorDtoMapper } from '../model/contributor.mapper';
import { appConfig } from '@/src/shared';
import { PublisherId } from '../../publisher';

export class ContributorService extends BaseService<ContributorEntity, ContributorDto> {
  constructor() {
    super(new ContributorDtoMapper());
  }

  async getContributors(filter: string): Promise<ContributorEntity[]> {
    const { contributors = [] } = await this.graphqlService.query(GET_CONTRIBUTORS, { filter });

    const result = contributors.map(this.dtoMapper.toEntity);

    return result;
  }

  async getContributor(contributorId: ContributorId): Promise<ContributorEntity> {
    const { contributor } = await this.graphqlService.query(GET_CONTRIBUTOR, { contributorId });

    const result = this.dtoMapper.toEntity(contributor as ContributorDto);

    return result;
  }

  async createContributor(token: string, data: ContributorEntity): Promise<ContributorEntity> {
    const { contributorId, fullName, lastName, orcid, website, firstName } = this.dtoMapper.toDto(data);

    const { createContributor } = await this.graphqlService.mutation(token, CREATE_CONTRIBUTOR, {
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

  async updateContributor(token: string, data: ContributorEntity): Promise<ContributorEntity> {
    const { contributorId, fullName, lastName, orcid, ...dto } = this.dtoMapper.toDto(data);

    const { updateContributor } = await this.graphqlService.mutation(token, UPDATE_CONTRIBUTOR, {
      data: {
        contributorId: contributorId ?? '',
        fullName: fullName ?? '',
        lastName: lastName ?? '',
        orcid: appConfig.validations.orcidPrefix + orcid,
        ...dto,
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
