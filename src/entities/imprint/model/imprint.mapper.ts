import { appConfig } from '@/src/shared/config';
import type { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

import type { ImprintBaseDto, ImprintDto, ImprintEntity } from '../model/imprint.types';

const { publisherDefaultValues } = appConfig;

export class ImprintDtoMapper implements BaseMapper<ImprintEntity, ImprintDto> {
  toEntity(dto: ImprintBaseDto | ImprintDto): ImprintEntity {
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

    const s3Bucket = 's3Bucket' in dto ? dto.s3Bucket : null;
    const cdnDomain = 'cdnDomain' in dto ? dto.cdnDomain : null;
    const cloudfrontDistId = 'cloudfrontDistId' in dto ? dto.cloudfrontDistId : null;

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
      s3Bucket: s3Bucket ?? '',
      cdnDomain: cdnDomain ?? '',
      cloudfrontDistId: cloudfrontDistId ?? '',
    };
  }

  toDto(
    entity: ImprintEntity,
    isSuperuser = false,
  ): ImprintBaseDto & { s3Bucket?: string | null; cdnDomain?: string | null; cloudfrontDistId?: string | null } {
    const { id, name, url, updatedAt, publisherName, crossmarkDoi, defaultCurrency, defaultLocale, defaultPlace, s3Bucket, cdnDomain, cloudfrontDistId } =
      entity;

    return {
      imprintId: id,
      imprintName: name,
      imprintUrl: emptyToNull(url),
      updatedAt,
      crossmarkDoi: emptyToNull(crossmarkDoi),
      defaultCurrency: emptyToNull(defaultCurrency) as ImprintBaseDto['defaultCurrency'],
      defaultLocale: emptyToNull(defaultLocale) as ImprintBaseDto['defaultLocale'],
      defaultPlace: emptyToNull(defaultPlace),
      ...(isSuperuser ? { s3Bucket: emptyToNull(s3Bucket), cdnDomain: emptyToNull(cdnDomain), cloudfrontDistId: emptyToNull(cloudfrontDistId) } : {}),
      publisher: {
        publisherName,
      },
    };
  }
}
