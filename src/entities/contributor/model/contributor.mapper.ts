import type { GetLinkedPublishersQuery } from '@/gql/graphql';
import type { BaseMapper } from '@/src/shared/interfaces';
import { convertOrchidIdToText, isDefaultId } from '@/src/shared/utils';
import { normalizedOrcidId } from '@/src/shared/utils/helpers/normalizedOrcidId';
import { emptyToNull } from '@/src/shared/utils/strings';

import type { PublisherId } from '../../publisher';
import type { ContributorDto, ContributorEntity } from './contributor.types';

export class ContributorDtoMapper implements BaseMapper<ContributorEntity, ContributorDto> {
  toEntity(dto: ContributorDto): ContributorEntity {
    const { contributorId, fullName, orcid, updatedAt, lastName, firstName, website, contributions = [] } = dto;

    // The hint is only a disambiguation aid: a historical work may hold zero titles or none
    // marked canonical, and neither condition may cost the contributor their identity result.
    const latestWorkTitles = contributions.length > 0 ? (contributions[0].work.titles ?? []) : [];
    const canonicalTitle = latestWorkTitles.find((title) => title.canonical);

    return {
      id: contributorId,
      name: fullName,
      orcid: orcid ? convertOrchidIdToText(orcid) : '',
      updatedAt,
      lastName,
      fullName,
      firstName: firstName ?? '',
      website: website ?? '',
      lastContributionTitle: canonicalTitle?.title ?? '',
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
      orcid: normalizedOrcidId(orcid),
      website: emptyToNull(website),
    };

    return data;
  }
}
