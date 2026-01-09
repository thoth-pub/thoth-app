import type { BaseMapper } from '@/src/shared/interfaces';

import type { ContactDto, ContactEntity, PublisherDto, PublisherEntity } from './publisher.types';

export class PublisherDtoMapper implements BaseMapper<PublisherEntity, PublisherDto> {
  toEntity(dto: PublisherDto): PublisherEntity {
    const {
      publisherId,
      publisherName,
      publisherShortname,
      publisherUrl,
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
      updatedAt,
      accessibilityReportUrl: accessibilityReportUrl ?? '',
      accessibilityStatement: accessibilityStatement ?? '',
      contacts: contacts.map((contact) => this.toEntityContact(contact)),
    };
  }

  toDto(entity: PublisherEntity): Omit<PublisherDto, 'contacts' | 'updatedAt'> {
    const { id, name, shortName, url, accessibilityReportUrl, accessibilityStatement } = entity;

    return {
      publisherId: id,
      publisherName: name,
      publisherShortname: shortName && shortName.length > 0 ? shortName : null,
      publisherUrl: url,
      accessibilityReportUrl: accessibilityReportUrl.length > 0 ? accessibilityReportUrl : null,
      accessibilityStatement: accessibilityStatement.length > 0 ? accessibilityStatement : null,
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
