import type { QueryToken } from '@/src/shared';
import { BaseService } from '@/src/shared/interfaces/services';

import { PublisherDtoMapper } from '../model/publisher.mapper';
import { CREATE_CONTACT, DELETE_CONTACT, UPDATE_CONTACT } from '../model/publisher.mutations';
import { GET_PUBLISHER, GET_PUBLISHERS, UPDATE_PUBLISHER } from '../model/publisher.schema';
import type { ContactEntity, ContactId, PublisherDto, PublisherEntity, PublisherId } from '../model/publisher.types';

export class PublisherService extends BaseService<PublisherEntity, PublisherDto, PublisherDtoMapper> {
  constructor(mapper = new PublisherDtoMapper()) {
    super(mapper);
  }

  async getPublishers(publisherIds: PublisherId[]): Promise<PublisherEntity[]> {
    const { publishers = [] } = await this.graphqlService.query(GET_PUBLISHERS, {
      publishers: publisherIds,
      offset: 0,
    });

    const data = publishers.map((publisher) => this.dtoMapper.toEntity(publisher as PublisherDto));

    return data;
  }

  async getPublisher(publisherId: PublisherId): Promise<PublisherEntity> {
    const { publisher } = await this.graphqlService.query(GET_PUBLISHER, {
      publisherId,
    });

    const data = this.dtoMapper.toEntity(publisher as PublisherDto);

    return data;
  }

  async updatePublisher(token: QueryToken, data: PublisherEntity): Promise<PublisherEntity> {
    const dto = this.dtoMapper.toDto(data);

    const { updatePublisher } = await this.graphqlService.mutation(token, UPDATE_PUBLISHER, {
      data: dto,
    });

    const publisher = this.dtoMapper.toEntity(updatePublisher as PublisherDto);

    return publisher;
  }

  async createContact(token: QueryToken, data: ContactEntity, publisherId: PublisherId): Promise<ContactEntity> {
    const { contactId: _, ...dto } = this.dtoMapper.toDtoContact(data);

    const { createContact } = await this.graphqlService.mutation(token, CREATE_CONTACT, {
      data: {
        ...dto,
        publisherId,
      },
    });

    const contact = this.dtoMapper.toEntityContact(createContact);

    return contact;
  }

  async updateContact(token: QueryToken, data: ContactEntity, publisherId: PublisherId): Promise<ContactEntity> {
    const dto = this.dtoMapper.toDtoContact(data);

    const { updateContact } = await this.graphqlService.mutation(token, UPDATE_CONTACT, {
      data: {
        ...dto,
        publisherId,
      },
    });

    const contact = this.dtoMapper.toEntityContact(updateContact);

    return contact;
  }

  async deleteContact(token: QueryToken, contactId: ContactId): Promise<void> {
    await this.graphqlService.mutation(token, DELETE_CONTACT, {
      contactId,
    });
  }
}
