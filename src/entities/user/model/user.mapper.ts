import type { BaseMapper } from '@/src/shared/interfaces';

import { UserDto, UserEntity } from './user.types';

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
        imprints: publisher.imprints.map(({ imprintId, imprintName }) => ({
          imprintId,
          imprintName,
        })),
      })),
    };
  }

  toDto(entity: UserEntity): UserDto {
    const { id, email, firstName, lastName, isSuperuser, linkedPublishers } = entity;

    return {
      userId: id,
      email: email && email.length > 0 ? email : null,
      firstName: firstName && firstName.length > 0 ? firstName : null,
      lastName: lastName && lastName.length > 0 ? lastName : null,
      isSuperuser,
      publisherContexts: linkedPublishers.map((publisher) => ({
        publisher: {
          publisherId: publisher.publisherId,
          publisherName: publisher.publisherName,
          imprints: publisher.imprints.map(({ imprintId, imprintName }) => ({
            imprintId,
            imprintName,
          })),
        },
        permissions: {
          publisherAdmin: publisher.publisherAdmin,
          workLifecycle: publisher.workLifecycle,
          cdnWrite: publisher.cdnWrite,
        },
      })),
    };
  }
}
