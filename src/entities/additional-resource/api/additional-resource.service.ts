import { ResourceType } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { BaseService } from '@/src/shared/interfaces/services';
import type { FileStorage } from '@/src/shared/services';
import { TransactionContext } from '@/src/shared/services/TransactionsContext/TransactionsContext';
import { isTextContainsAnyMarkdownTag } from '@/src/shared/utils';

import type { WorkId } from '../../work/model/work.types';
import { AdditionalResourceDtoMapper } from '../model/additional-resource.mapper';
import {
  CREATE_ADDITIONAL_RESOURCE,
  DELETE_ADDITIONAL_RESOURCE,
  MOVE_ADDITIONAL_RESOURCE,
  UPDATE_ADDITIONAL_RESOURCE,
} from '../model/additional-resource.mutations';
import type {
  AdditionalResourceDto,
  AdditionalResourceEntity,
  AdditionalResourceId,
} from '../model/additional-resource.types';

type AdditionalResourceServiceDependencies = {
  graphqlService: GraphqlService;
  fileStorage: FileStorage;
  mapper?: AdditionalResourceDtoMapper;
};

export class AdditionalResourceService extends BaseService<AdditionalResourceEntity, AdditionalResourceDto> {
  private readonly fileStorage: FileStorage;

  constructor({ graphqlService, fileStorage, mapper = new AdditionalResourceDtoMapper() }: AdditionalResourceServiceDependencies) {
    super(graphqlService, mapper);
    this.fileStorage = fileStorage;
  }

  private getMarkupFormat(text: string) {
    return isTextContainsAnyMarkdownTag(text) ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;
  }

  async createAdditionalResource(
    data: AdditionalResourceEntity,
    relatedWorkId: WorkId,
    file?: File,
  ): Promise<AdditionalResourceEntity> {
    const { workResourceId: _, file: _file, ...dto } = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(`${data.title} ${data.description}`);

    const response = await this.graphqlService.mutation(CREATE_ADDITIONAL_RESOURCE, {
      data: {
        ...dto,
        title: dto.title ?? '',
        resourceType: dto.resourceType as ResourceType,
        workId: relatedWorkId,
        resourceOrdinal: data.orderNumber ?? 1,
      },
      markupFormat,
    });

    const additionalResource = this.dtoMapper.toEntity(response.createAdditionalResource as AdditionalResourceDto);

    if (file) {
      const transactions = new TransactionContext();
      transactions.onRollback(() => this.deleteAdditionalResource(additionalResource.id));

      try {
        const fileUrl = await this.uploadFile(additionalResource.id, file);
        additionalResource.fileUrl = fileUrl;
      } catch (error) {
        await transactions.rollback();
        throw error;
      }
    }

    return additionalResource;
  }

  async updateAdditionalResource(
    data: AdditionalResourceEntity,
    relatedWorkId: WorkId,
  ): Promise<AdditionalResourceEntity> {
    const { workResourceId, file: _file, ...dto } = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(`${data.title} ${data.description}`);

    const response = await this.graphqlService.mutation(UPDATE_ADDITIONAL_RESOURCE, {
      data: {
        ...dto,
        title: dto.title ?? '',
        resourceType: dto.resourceType as ResourceType,
        additionalResourceId: workResourceId,
        workId: relatedWorkId,
        resourceOrdinal: data.orderNumber ?? 1,
      },
      markupFormat,
    });

    const additionalResource = this.dtoMapper.toEntity(response.updateAdditionalResource as AdditionalResourceDto);

    return additionalResource;
  }

  async deleteAdditionalResource(additionalResourceId: string) {
    await this.graphqlService.mutation(DELETE_ADDITIONAL_RESOURCE, {
      additionalResourceId,
    });
  }

  async uploadFile(additionalResourceId: AdditionalResourceId, file: File): Promise<string> {
    const url = await this.fileStorage.uploadAdditionalResourceFile(additionalResourceId, file);

    return url;
  }

  async moveAdditionalResource(
    additionalResourceId: AdditionalResourceId,
    newOrdinal: number,
  ): Promise<AdditionalResourceEntity> {
    const response = await this.graphqlService.mutation(MOVE_ADDITIONAL_RESOURCE, {
      additionalResourceId,
      newOrdinal,
    });

    const additionalResource = this.dtoMapper.toEntity(response.moveAdditionalResource as AdditionalResourceDto);

    return additionalResource;
  }
}
