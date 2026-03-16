import { MarkupFormat, ResourceType } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { BaseService } from '@/src/shared/interfaces/services';

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

// TODO: files upload and markup format
export class AdditionalResourceService extends BaseService<AdditionalResourceEntity, AdditionalResourceDto> {
  constructor(graphqlService: GraphqlService, mapper = new AdditionalResourceDtoMapper()) {
    super(graphqlService, mapper);
  }

  async createAdditionalResource(
    data: AdditionalResourceEntity,
    relatedWorkId: WorkId,
    markupFormat: MarkupFormat = MarkupFormat.PlainText,
  ): Promise<AdditionalResourceEntity> {
    const { workResourceId: _, ...dto } = this.dtoMapper.toDto(data);

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

    return additionalResource;
  }

  async updateAdditionalResource(
    data: AdditionalResourceEntity,
    relatedWorkId: WorkId,
    markupFormat: MarkupFormat = MarkupFormat.PlainText,
  ): Promise<AdditionalResourceEntity> {
    const { workResourceId, ...dto } = this.dtoMapper.toDto(data);

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
