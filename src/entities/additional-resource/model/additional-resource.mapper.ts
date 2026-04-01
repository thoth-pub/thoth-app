import type { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

import { AdditionalResourceDto, AdditionalResourceEntity } from './additional-resource.types';

export class AdditionalResourceDtoMapper implements BaseMapper<AdditionalResourceEntity, AdditionalResourceDto> {
  toEntity(dto: AdditionalResourceDto): AdditionalResourceEntity {
    const {
      workResourceId,
      workId,
      title,
      description,
      attribution,
      resourceType,
      doi,
      handle,
      url,
      resourceOrdinal,
      file,
    } = dto;

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
      fileUrl: file?.cdnUrl ?? '',
      orderNumber: resourceOrdinal,
    };
  }

  toDto(entity: AdditionalResourceEntity): AdditionalResourceDto {
    const { id, workId, title, description, attribution, resourceType, doi, handle, url, fileUrl, orderNumber } =
      entity;

    return {
      workResourceId: id,
      workId,
      title,
      description: emptyToNull(description),
      attribution: emptyToNull(attribution),
      resourceType,
      doi: emptyToNull(doi),
      handle: emptyToNull(handle),
      url: emptyToNull(url),
      file: emptyToNull(fileUrl) ? { cdnUrl: fileUrl } : null,
      resourceOrdinal: orderNumber,
    };
  }
}
