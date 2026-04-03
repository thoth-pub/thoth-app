import type { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

import type { ContactDto, ContactEntity, PublisherBaseDto, PublisherDto, PublisherEntity } from './publisher.types';

export class PublisherDtoMapper implements BaseMapper<PublisherEntity, PublisherDto> {
  toEntity(dto: PublisherBaseDto | PublisherDto): PublisherEntity {
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

    const zitadelId = 'zitadelId' in dto ? dto.zitadelId : null;

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

  toDto(entity: PublisherEntity, isSuperuser = false): Omit<PublisherBaseDto, 'contacts' | 'updatedAt'> & { zitadelId?: string | null } {
    const { id, name, shortName, url, zitadelId, accessibilityReportUrl, accessibilityStatement } = entity;

    return {
      publisherId: id,
      publisherName: name,
      publisherShortname: emptyToNull(shortName),
      publisherUrl: emptyToNull(url),
      ...(isSuperuser ? { zitadelId: emptyToNull(zitadelId) } : {}),
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
