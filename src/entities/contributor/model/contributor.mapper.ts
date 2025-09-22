import type { GetLinkedPublishersQuery } from '@/gql/graphql';
import type { BaseMapper } from '@/src/shared/interfaces';
import { convertOrchidIdToText } from '@/src/shared/utils';

import type { PublisherId } from '../../publisher';
import type { ContributorDto, ContributorEntity } from './contributor.types';

export class ContributorDtoMapper implements BaseMapper<ContributorEntity, ContributorDto> {
  toEntity(dto: ContributorDto): ContributorEntity {
    const { contributorId, fullName, orcid, updatedAt, lastName, firstName, website } = dto;

    return {
      id: contributorId,
      name: fullName,
      orcid: orcid ? convertOrchidIdToText(orcid) : '',
      updatedAt,
      lastName,
      fullName,
      firstName: firstName ?? '',
      website: website ?? '',
    };
  }

  toLinkedPublishers(dto: GetLinkedPublishersQuery): PublisherId[] {
    const ids = dto.contributor.contributions.map((contribution) => contribution.work.imprint.publisherId);

    return ids;
  }
}
