import { appConfig } from '@/src/shared/config';
import type { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

import { UserDto, UserEntity } from './user.types';

const { publisherDefaultValues } = appConfig;

export class UserDtoMapper implements BaseMapper<UserEntity, UserDto> {
  toEntity(dto: UserDto): UserEntity {
    const { userId, email, firstName, lastName, isSuperuser, publisherContexts } = dto;

    return {
      id: userId,
      email: email ?? '',
      firstName: firstName ?? '',
      lastName: lastName ?? '',
      isSuperuser,
      linkedPublishers: publisherContexts.map(({ publisher, permissions }) => ({
        publisherId: publisher.publisherId,
        publisherName: publisher.publisherName,
        publisherAdmin: permissions.publisherAdmin,
        workLifecycle: permissions.workLifecycle,
        cdnWrite: permissions.cdnWrite,
        imprints: publisher.imprints.map(
          ({
            imprintId,
            imprintName,
            imprintUrl,
            updatedAt,
            crossmarkDoi,
            defaultCurrency,
            defaultLocale,
            defaultPlace,
            s3Bucket,
            cdnDomain,
            cloudfrontDistId,
          }) => ({
            id: imprintId,
            name: imprintName,
            url: imprintUrl ?? '',
            updatedAt,
            publisherName: publisher.publisherName,
            crossmarkDoi: crossmarkDoi ?? '',
            defaultCurrency: defaultCurrency ?? publisherDefaultValues.defaultCurrency,
            defaultLocale: defaultLocale ?? publisherDefaultValues.defaultLocale,
            defaultPlace: defaultPlace ?? '',
            s3Bucket: s3Bucket ?? '',
            cdnDomain: cdnDomain ?? '',
            cloudfrontDistId: cloudfrontDistId ?? '',
          }),
        ),
      })),
    };
  }

  toDto(entity: UserEntity): Omit<UserDto, 'publisherContexts'> {
    const { id, email, firstName, lastName, isSuperuser } = entity;

    return {
      userId: id,
      email: emptyToNull(email),
      firstName: emptyToNull(firstName),
      lastName: emptyToNull(lastName),
      isSuperuser,
    };
  }
}
