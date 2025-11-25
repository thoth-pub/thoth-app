import type { GetLinkedPublishersQuery } from '@/gql/graphql';
import type { BaseMapper } from '@/src/shared/interfaces';
import { convertOrchidIdToText, isDefaultId } from '@/src/shared/utils';

import type { PublisherId } from '../../publisher';
import type { ContributorDto, ContributorEntity } from './contributor.types';

export class ContributorDtoMapper implements BaseMapper<ContributorEntity, ContributorDto> {
  toEntity(dto: ContributorDto): ContributorEntity {
    const { contributorId, fullName, orcid, updatedAt, lastName, firstName, website, contributions = [] } = dto;

    const isLastContributionExists = contributions.length > 0;

    return {
      id: contributorId,
      name: fullName,
      orcid: orcid ? convertOrchidIdToText(orcid) : '',
      updatedAt,
      lastName,
      fullName,
      firstName: firstName ?? '',
      website: website ?? '',
      lastContributionTitle: isLastContributionExists ? contributions[0].work.title : '',
    };
  }

  toLinkedPublishers(dto: GetLinkedPublishersQuery): PublisherId[] {
    const ids = dto.contributor.contributions.map((contribution) => contribution.work.imprint.publisherId);

    return ids;
  }

  toDto(
    entity: Pick<ContributorEntity, 'firstName' | 'lastName' | 'orcid' | 'website' | 'fullName'> & {
      id?: string;
    },
  ): Omit<ContributorDto, 'updatedAt' | 'contributions'> {
    const { id, orcid, lastName, fullName, firstName, website } = entity;

    const data = {
      contributorId: id && !isDefaultId(id) ? id : undefined,
      firstName: firstName && firstName !== '' ? firstName : null,
      lastName,
      fullName,
      orcid: orcid && orcid.length > 0 ? orcid : null,
      website: website && website.length > 0 ? website : null,
    };

    return data;
  }
}
