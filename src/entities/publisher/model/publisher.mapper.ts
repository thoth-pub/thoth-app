import type { BaseMapper } from '@/src/shared/interfaces';

import type { ContactDto, ContactEntity, PublisherDto, PublisherEntity } from './publisher.types';

export class PublisherDtoMapper implements BaseMapper<PublisherEntity, PublisherDto> {
  toEntity(dto: PublisherDto): PublisherEntity {
    const { publisherId, publisherName, publisherShortname, publisherUrl, updatedAt, contacts } = dto;

    return {
      id: publisherId,
      name: publisherName,
      shortName: publisherShortname ?? '',
      url: publisherUrl ?? '',
      updatedAt,
      contacts: contacts.map((contact) => this.toEntityContact(contact)),
    };
  }

  toDto(entity: PublisherEntity): Partial<PublisherDto> {
    const { id, name, shortName, url, updatedAt } = entity;

    return {
      publisherId: id,
      publisherName: name,
      publisherShortname: shortName,
      publisherUrl: url,
      updatedAt,
    };
  }

  toEntityContact(dto: ContactDto): ContactEntity {
    const { contactId, contactType, email } = dto;

    return {
      id: contactId,
      type: contactType,
      email,
    };
  }

  toDtoContact(entity: ContactEntity): ContactDto {
    const { id, type, email } = entity;

    return {
      contactId: id,
      contactType: type,
      email,
    };
  }
}
