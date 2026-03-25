import { GraphqlService } from '@/src/shared/api/graphqlService';
import { BaseService } from '@/src/shared/interfaces/services';

import { PublisherDtoMapper } from '../model/publisher.mapper';
import { CREATE_CONTACT, CREATE_PUBLISHER, DELETE_CONTACT, UPDATE_CONTACT } from '../model/publisher.mutations';
import { GET_PUBLISHER, GET_PUBLISHER_ADMIN, GET_PUBLISHERS, UPDATE_PUBLISHER } from '../model/publisher.schema';
import type { ContactEntity, ContactId, PublisherDto, PublisherEntity, PublisherId } from '../model/publisher.types';

export class PublisherService extends BaseService<PublisherEntity, PublisherDto, PublisherDtoMapper> {
  constructor(graphqlService: GraphqlService, mapper = new PublisherDtoMapper()) {
    super(graphqlService, mapper);
  }

  async getPublishers(publisherIds: PublisherId[]): Promise<PublisherEntity[]> {
    const { publishers = [] } = await this.graphqlService.query(GET_PUBLISHERS, {
      publishers: publisherIds,
      offset: 0,
    });

    const data = publishers.map((publisher) => this.dtoMapper.toEntity(publisher as PublisherDto));

    return data;
  }

  async getPublisher(publisherId: PublisherId, isSuperuser = false): Promise<PublisherEntity> {
    const query = isSuperuser ? GET_PUBLISHER_ADMIN : GET_PUBLISHER;
    const { publisher } = await this.graphqlService.query(query, {
      publisherId,
    });

    const data = this.dtoMapper.toEntity(publisher as PublisherDto);

    return data;
  }

  async updatePublisher(data: PublisherEntity, isSuperuser = false): Promise<PublisherEntity> {
    const dto = this.dtoMapper.toDto(data, isSuperuser);

    const { updatePublisher } = await this.graphqlService.mutation(UPDATE_PUBLISHER, {
      data: dto,
    });

    const publisher = this.dtoMapper.toEntity(updatePublisher as PublisherDto);

    return publisher;
  }

  async createContact(data: ContactEntity, publisherId: PublisherId): Promise<ContactEntity> {
    const { contactId: _, ...dto } = this.dtoMapper.toDtoContact(data);

    const { createContact } = await this.graphqlService.mutation(CREATE_CONTACT, {
      data: {
        ...dto,
        publisherId,
      },
    });

    const contact = this.dtoMapper.toEntityContact(createContact);

    return contact;
  }

  async createPublisher(publisherName: string): Promise<string> {
    const { createPublisher } = await this.graphqlService.mutation(CREATE_PUBLISHER, {
      data: {
        publisherName,
      },
    });

    return createPublisher?.publisherId ?? '';
  }

  async updateContact(data: ContactEntity, publisherId: PublisherId): Promise<ContactEntity> {
    const dto = this.dtoMapper.toDtoContact(data);

    const { updateContact } = await this.graphqlService.mutation(UPDATE_CONTACT, {
      data: {
        ...dto,
        publisherId,
      },
    });

    const contact = this.dtoMapper.toEntityContact(updateContact);

    return contact;
  }

  async deleteContact(contactId: ContactId): Promise<void> {
    await this.graphqlService.mutation(DELETE_CONTACT, {
      contactId,
    });
  }
}
