import type { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

import type { ContactDto, ContactEntity, PublisherDto, PublisherEntity } from './publisher.types';

export class PublisherDtoMapper implements BaseMapper<PublisherEntity, PublisherDto> {
  toEntity(dto: PublisherDto): PublisherEntity {
    const {
      publisherId,
      publisherName,
      publisherShortname,
      publisherUrl,
      zitadelId,
      updatedAt,
      contacts,
      accessibilityReportUrl,
      accessibilityStatement,
    } = dto;

    return {
      id: publisherId,
      name: publisherName,
      shortName: publisherShortname ?? '',
      url: publisherUrl ?? '',
      zitadelId: zitadelId ?? '',
      updatedAt,
      accessibilityReportUrl: accessibilityReportUrl ?? '',
      accessibilityStatement: accessibilityStatement ?? '',
      contacts: contacts.map((contact) => this.toEntityContact(contact)),
    };
  }

  toDto(entity: PublisherEntity): Omit<PublisherDto, 'contacts' | 'updatedAt'> {
    const { id, name, shortName, url, zitadelId, accessibilityReportUrl, accessibilityStatement } = entity;

    return {
      publisherId: id,
      publisherName: name,
      publisherShortname: emptyToNull(shortName),
      publisherUrl: url,
      zitadelId: emptyToNull(zitadelId),
      accessibilityReportUrl: emptyToNull(accessibilityReportUrl),
      accessibilityStatement: emptyToNull(accessibilityStatement),
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
