import type { BaseMapper } from '@/src/shared/interfaces';

import { AdditionalResourceDto, AdditionalResourceEntity } from './additional-resource.types';

export class AdditionalResourceDtoMapper implements BaseMapper<AdditionalResourceEntity, AdditionalResourceDto> {
  toEntity(dto: AdditionalResourceDto): AdditionalResourceEntity {
    const { workResourceId, workId, title, description, attribution, resourceType, doi, handle, url, resourceOrdinal } =
      dto;

    return {
      id: workResourceId,
      workId,
      title,
      description: description ?? '',
      attribution: attribution ?? '',
      resourceType,
      doi: doi ?? '',
      handle: handle ?? '',
      url: url ?? '',
      orderNumber: resourceOrdinal,
    };
  }

  toDto(entity: AdditionalResourceEntity): AdditionalResourceDto {
    const { id, workId, title, description, attribution, resourceType, doi, handle, url, orderNumber } = entity;

    return {
      workResourceId: id,
      workId,
      title,
      description: description && description.length > 0 ? description : null,
      attribution: attribution && attribution.length > 0 ? attribution : null,
      resourceType,
      doi: doi && doi.length > 0 ? doi : null,
      handle: handle && handle.length > 0 ? handle : null,
      url: url && url.length > 0 ? url : null,
      resourceOrdinal: orderNumber,
    };
  }
}
