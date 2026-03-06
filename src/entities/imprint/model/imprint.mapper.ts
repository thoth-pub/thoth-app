import { appConfig } from '@/src/shared/config';
import type { BaseMapper } from '@/src/shared/interfaces';

import type { ImprintDto, ImprintEntity } from '../model/imprint.types';

const { publisherDefaultValues } = appConfig;

export class ImprintDtoMapper implements BaseMapper<ImprintEntity, ImprintDto> {
  toEntity(dto: ImprintDto): ImprintEntity {
    const {
      imprintId,
      imprintName,
      imprintUrl,
      updatedAt,
      crossmarkDoi,
      defaultCurrency,
      defaultLocale,
      defaultPlace,
      publisher: { publisherName },
    } = dto;

    return {
      id: imprintId,
      name: imprintName,
      url: imprintUrl ?? '',
      updatedAt,
      publisherName,
      crossmarkDoi,
      defaultCurrency: defaultCurrency ?? publisherDefaultValues.defaultCurrency,
      defaultLocale: defaultLocale ?? publisherDefaultValues.defaultLocale,
      defaultPlace: defaultPlace ?? '',
    };
  }

  toDto(entity: ImprintEntity): ImprintDto {
    const { id, name, url, updatedAt, publisherName } = entity;

    return {
      imprintId: id,
      imprintName: name,
      imprintUrl: url,
      updatedAt,
      publisher: {
        publisherName,
      },
    };
  }
}
